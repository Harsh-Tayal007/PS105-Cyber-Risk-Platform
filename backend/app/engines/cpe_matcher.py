"""
CPE Applicability Matching Engine for PS105.

Evaluates organizational assets against vulnerability CPE criteria to determine
accurate applicability outcomes: MATCH, NO_MATCH, or INSUFFICIENT_DATA.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional, Tuple, List
import re

from app.models.domain import Asset, VulnerabilityCPE, Vulnerability
from app.engines.version_compare import is_version_in_range


class MatchOutcome(str, Enum):
    MATCH = "MATCH"
    NO_MATCH = "NO_MATCH"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


@dataclass
class CPEMatchResult:
    outcome: MatchOutcome
    matched_cpe: str
    matched_version: Optional[str]
    evidence_summary: str
    confidence: str = "VERIFIED"


def parse_cpe_vendor_product(cpe_str: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts vendor and product from a CPE 2.3 or 2.2 string.
    
    CPE 2.3 format: cpe:2.3:a:<vendor>:<product>:<version>:...
    CPE 2.2 format: cpe:/a:<vendor>:<product>:...
    """
    if not cpe_str or not isinstance(cpe_str, str):
        return None, None

    cleaned = cpe_str.strip()

    # Check CPE 2.3 format: cpe:2.3:a:vendor:product:version...
    if cleaned.startswith("cpe:2.3:"):
        parts = cleaned.split(":")
        if len(parts) >= 5:
            vendor = parts[3].lower() if parts[3] and parts[3] != "*" else None
            product = parts[4].lower() if parts[4] and parts[4] != "*" else None
            return vendor, product

    # Check CPE 2.2 format: cpe:/a:vendor:product:version...
    if cleaned.startswith("cpe:/"):
        body = cleaned[5:]  # strip 'cpe:/'
        parts = body.split(":")
        # parts[0] is part ('a', 'h', 'o'), parts[1] is vendor, parts[2] is product
        if len(parts) >= 3:
            vendor = parts[1].lower() if parts[1] and parts[1] != "*" else None
            product = parts[2].lower() if parts[2] and parts[2] != "*" else None
            return vendor, product

    return None, None


class CPEMatcher:
    """
    Core CPE Applicability Engine.
    """

    @staticmethod
    def match_asset_cpe(asset: Asset, cpe_rule: VulnerabilityCPE) -> CPEMatchResult:
        """
        Evaluates a single Asset against a VulnerabilityCPE rule.
        """
        rule_cpe = cpe_rule.cpe_criteria or ""

        # 1. Check Asset Vendor & Product completeness
        asset_vendor = (asset.cpe_vendor or "").strip().lower()
        asset_product = (asset.cpe_product or "").strip().lower()

        if not asset_vendor or not asset_product:
            return CPEMatchResult(
                outcome=MatchOutcome.INSUFFICIENT_DATA,
                matched_cpe=rule_cpe,
                matched_version=asset.installed_version,
                evidence_summary=(
                    f"Asset '{asset.name}' (ID: {asset.asset_id}) lacks required CPE vendor "
                    f"or product metadata (vendor='{asset.cpe_vendor}', product='{asset.cpe_product}')."
                ),
            )

        # 2. Extract vendor & product from rule CPE criteria
        cpe_vendor, cpe_product = parse_cpe_vendor_product(rule_cpe)
        if cpe_vendor is None or cpe_product is None:
            # Fallback: simple substring check or assume match if vendor/product match rule attributes
            pass

        # 3. Compare Vendor and Product
        if cpe_vendor and asset_vendor != cpe_vendor:
            return CPEMatchResult(
                outcome=MatchOutcome.NO_MATCH,
                matched_cpe=rule_cpe,
                matched_version=asset.installed_version,
                evidence_summary=f"Vendor mismatch: asset '{asset_vendor}' vs CPE rule '{cpe_vendor}'.",
            )

        if cpe_product and asset_product != cpe_product:
            return CPEMatchResult(
                outcome=MatchOutcome.NO_MATCH,
                matched_cpe=rule_cpe,
                matched_version=asset.installed_version,
                evidence_summary=f"Product mismatch: asset '{asset_product}' vs CPE rule '{cpe_product}'.",
            )

        # 4. Check if rule indicates NOT vulnerable
        if not cpe_rule.vulnerable:
            return CPEMatchResult(
                outcome=MatchOutcome.NO_MATCH,
                matched_cpe=rule_cpe,
                matched_version=asset.installed_version,
                evidence_summary=f"CPE rule explicitly specifies non-vulnerable status for criteria '{rule_cpe}'.",
            )

        # 5. Check Version Bounds
        installed_version = asset.installed_version
        if not installed_version or not installed_version.strip():
            return CPEMatchResult(
                outcome=MatchOutcome.INSUFFICIENT_DATA,
                matched_cpe=rule_cpe,
                matched_version=None,
                evidence_summary=(
                    f"Asset '{asset.name}' matches vendor '{asset_vendor}' and product '{asset_product}' "
                    f"for CPE rule '{rule_cpe}', but has no installed_version specified."
                ),
            )

        range_check = is_version_in_range(
            installed_version=installed_version,
            version_start_including=cpe_rule.version_start_including,
            version_end_excluding=cpe_rule.version_end_excluding,
        )

        if range_check is None:
            return CPEMatchResult(
                outcome=MatchOutcome.INSUFFICIENT_DATA,
                matched_cpe=rule_cpe,
                matched_version=installed_version,
                evidence_summary=(
                    f"Unparseable version format for asset version '{installed_version}' "
                    f"or CPE range [{cpe_rule.version_start_including}, {cpe_rule.version_end_excluding})."
                ),
            )

        if range_check is False:
            return CPEMatchResult(
                outcome=MatchOutcome.NO_MATCH,
                matched_cpe=rule_cpe,
                matched_version=installed_version,
                evidence_summary=(
                    f"Asset version '{installed_version}' is outside vulnerable range "
                    f"[{cpe_rule.version_start_including or '*'}, {cpe_rule.version_end_excluding or '*'})."
                ),
            )

        # All checks passed -> MATCH
        start_str = cpe_rule.version_start_including or "0"
        end_str = cpe_rule.version_end_excluding or "inf"
        return CPEMatchResult(
            outcome=MatchOutcome.MATCH,
            matched_cpe=rule_cpe,
            matched_version=installed_version,
            evidence_summary=(
                f"Asset '{asset.name}' product '{asset_vendor}:{asset_product}' version '{installed_version}' "
                f"matches CPE criteria '{rule_cpe}' within range [{start_str}, {end_str})."
            ),
            confidence="VERIFIED",
        )

    @classmethod
    def evaluate_asset_against_vulnerability(
        cls, asset: Asset, vulnerability: Vulnerability
    ) -> Tuple[MatchOutcome, Optional[CPEMatchResult]]:
        """
        Evaluates an Asset against all CPE criteria of a given Vulnerability.
        Returns (best_outcome, best_match_result).
        """
        if not vulnerability.cpe_criteria:
            return MatchOutcome.NO_MATCH, None

        insufficient_data_result: Optional[CPEMatchResult] = None

        for cpe_rule in vulnerability.cpe_criteria:
            res = cls.match_asset_cpe(asset, cpe_rule)
            if res.outcome == MatchOutcome.MATCH:
                return MatchOutcome.MATCH, res
            elif res.outcome == MatchOutcome.INSUFFICIENT_DATA and insufficient_data_result is None:
                insufficient_data_result = res

        if insufficient_data_result:
            return MatchOutcome.INSUFFICIENT_DATA, insufficient_data_result

        return MatchOutcome.NO_MATCH, None
