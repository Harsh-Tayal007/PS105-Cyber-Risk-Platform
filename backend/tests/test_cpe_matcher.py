"""
Unit Tests for CPE Applicability Matching Engine (PS105 Phase 3).
"""

import sys
from pathlib import Path
import pytest

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.models.domain import Asset, Vulnerability, VulnerabilityCPE
from app.engines.cpe_matcher import (
    CPEMatcher,
    MatchOutcome,
    parse_cpe_vendor_product,
)


def test_parse_cpe_vendor_product():
    vendor, product = parse_cpe_vendor_product("cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*")
    assert vendor == "apache"
    assert product == "http_server"

    vendor_22, product_22 = parse_cpe_vendor_product("cpe:/a:nginx:nginx:1.18.0")
    assert vendor_22 == "nginx"
    assert product_22 == "nginx"


def test_match_asset_cpe_success():
    asset = Asset(
        name="Web Server 01",
        asset_type="Server",
        cpe_vendor="apache",
        cpe_product="http_server",
        installed_version="2.4.49",
    )
    cpe_rule = VulnerabilityCPE(
        cpe_criteria="cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*",
        version_start_including="2.4.49",
        version_end_excluding="2.4.51",
        vulnerable=True,
    )

    result = CPEMatcher.match_asset_cpe(asset, cpe_rule)
    assert result.outcome == MatchOutcome.MATCH
    assert result.confidence == "VERIFIED"
    assert "2.4.49" in result.evidence_summary


def test_match_asset_cpe_vendor_mismatch():
    asset = Asset(
        name="Web Server 01",
        asset_type="Server",
        cpe_vendor="nginx",
        cpe_product="http_server",
        installed_version="2.4.49",
    )
    cpe_rule = VulnerabilityCPE(
        cpe_criteria="cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*",
        version_start_including="2.4.49",
        version_end_excluding="2.4.51",
        vulnerable=True,
    )

    result = CPEMatcher.match_asset_cpe(asset, cpe_rule)
    assert result.outcome == MatchOutcome.NO_MATCH
    assert "Vendor mismatch" in result.evidence_summary


def test_match_asset_cpe_version_out_of_range():
    asset = Asset(
        name="Web Server 01",
        asset_type="Server",
        cpe_vendor="apache",
        cpe_product="http_server",
        installed_version="2.4.52",  # Patched version outside [2.4.49, 2.4.51)
    )
    cpe_rule = VulnerabilityCPE(
        cpe_criteria="cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*",
        version_start_including="2.4.49",
        version_end_excluding="2.4.51",
        vulnerable=True,
    )

    result = CPEMatcher.match_asset_cpe(asset, cpe_rule)
    assert result.outcome == MatchOutcome.NO_MATCH
    assert "outside vulnerable range" in result.evidence_summary


def test_match_asset_cpe_missing_installed_version_insufficient_data():
    """
    CRITICAL REQUIREMENT: Assets without installed_version MUST NOT be declared vulnerable.
    Must return INSUFFICIENT_DATA.
    """
    asset = Asset(
        name="Web Server 01",
        asset_type="Server",
        cpe_vendor="apache",
        cpe_product="http_server",
        installed_version=None,  # Missing version!
    )
    cpe_rule = VulnerabilityCPE(
        cpe_criteria="cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*",
        version_start_including="2.4.49",
        version_end_excluding="2.4.51",
        vulnerable=True,
    )

    result = CPEMatcher.match_asset_cpe(asset, cpe_rule)
    assert result.outcome == MatchOutcome.INSUFFICIENT_DATA
    assert "no installed_version specified" in result.evidence_summary


def test_evaluate_asset_against_vulnerability():
    asset = Asset(
        name="Web Server 01",
        asset_type="Server",
        cpe_vendor="apache",
        cpe_product="http_server",
        installed_version="2.4.49",
    )

    vuln = Vulnerability(
        cve_id="CVE-2021-41773",
        cvss_score=7.5,
        cisa_kev_listed=True,
        cpe_criteria=[
            VulnerabilityCPE(
                cpe_criteria="cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*",
                version_start_including="2.4.49",
                version_end_excluding="2.4.51",
                vulnerable=True,
            )
        ],
    )

    outcome, match_res = CPEMatcher.evaluate_asset_against_vulnerability(asset, vuln)
    assert outcome == MatchOutcome.MATCH
    assert match_res is not None
    assert match_res.matched_cpe == "cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*"
