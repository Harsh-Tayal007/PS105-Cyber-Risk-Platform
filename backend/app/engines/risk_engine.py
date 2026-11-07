"""
Deterministic Risk Quantification Engine for PS105 (Phase 5).

Provides dynamic, deterministic risk quantification calculations:
- Single Loss Expectancy (SLE) = Asset Business Value * Exposure Factor
- Vulnerability Exploitability Multiplier = 1.0 + (Exploitability Score / 10.0) [vulnerability risks]
                                          = 1.0 [direct asset risks]
- Annualized Rate of Occurrence (ARO) = Threat Base Probability * Vulnerability Exploitability Multiplier
- Annualized Loss Expectancy (ALE / Loss Before) = SLE * ARO
- 5x5 Qualitative Risk Score = Likelihood (1-5) * Impact (1-5)
- Multi-Control Residual Loss After Mitigation = Loss Before * Product(1 - E_ij * x_i)

This engine evaluates metrics dynamically from domain models without duplicating or
persisting derived financial numbers into database records.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Set, Iterable, Dict, Any

from app.models.domain import Risk, Asset, Vulnerability, Threat, RiskControl, SecurityControl


def calculate_sle(business_value: float, exposure_factor: float) -> float:
    """
    Calculates Single Loss Expectancy (SLE).
    SLE = Asset Business Value * Exposure Factor
    """
    if business_value < 0:
        raise ValueError(f"Business value must be non-negative, got {business_value}")
    if not (0.0 <= exposure_factor <= 1.0):
        raise ValueError(f"Exposure factor must be in range [0.0, 1.0], got {exposure_factor}")
    return float(business_value * exposure_factor)


def convert_exploitability_score_to_multiplier(exploitability_score: Optional[float]) -> float:
    """
    Converts a CVSS exploitability score (0.0 to 10.0) into a deterministic ARO multiplier.
    
    Conversion Logic:
    - If exploitability_score is None (e.g. direct asset risk or missing CVSS score): returns 1.0.
    - For vulnerability-based risks with valid score (0.0 to 10.0):
      multiplier = 1.0 + (exploitability_score / 10.0)
      (e.g., score 3.9 yields 1.39 multiplier; score 0.0 yields 1.0; score 10.0 yields 2.0).
    """
    if exploitability_score is None:
        return 1.0
    if not (0.0 <= exploitability_score <= 10.0):
        raise ValueError(f"Exploitability score must be in range [0.0, 10.0], got {exploitability_score}")
    return float(1.0 + (exploitability_score / 10.0))


def calculate_aro(base_probability: float, exploitability_multiplier: float = 1.0) -> float:
    """
    Calculates Annualized Rate of Occurrence (ARO).
    ARO = Threat Base Probability * Vulnerability Exploitability Multiplier
    """
    if not (0.0 <= base_probability <= 1.0):
        raise ValueError(f"Base probability must be in range [0.0, 1.0], got {base_probability}")
    if exploitability_multiplier < 0.0:
        raise ValueError(f"Exploitability multiplier must be non-negative, got {exploitability_multiplier}")
    return float(base_probability * exploitability_multiplier)


def calculate_ale(sle: float, aro: float) -> float:
    """
    Calculates Annualized Loss Expectancy (ALE).
    ALE = SLE * ARO
    """
    if sle < 0.0:
        raise ValueError(f"SLE must be non-negative, got {sle}")
    if aro < 0.0:
        raise ValueError(f"ARO must be non-negative, got {aro}")
    return float(sle * aro)


def calculate_qualitative_score(likelihood: int, impact: int) -> int:
    """
    Calculates 5x5 Qualitative Risk Score.
    Score = Likelihood (1-5) * Impact (1-5), producing range 1 to 25.
    """
    if not isinstance(likelihood, int) or not (1 <= likelihood <= 5):
        raise ValueError(f"Likelihood must be an integer in range [1, 5], got {likelihood}")
    if not isinstance(impact, int) or not (1 <= impact <= 5):
        raise ValueError(f"Impact must be an integer in range [1, 5], got {impact}")
    return int(likelihood * impact)


def calculate_multi_control_residual_factor(effectiveness_values: Iterable[float]) -> float:
    """
    Calculates the exact compounding multiplicative residual loss factor for a set of selected control effectiveness values.
    
    Formula: Product(1 - E_i) for each selected control i.
    Unselected controls contribute factor 1.0.
    """
    factor = 1.0
    for eff in effectiveness_values:
        if eff is None:
            continue
        if not (0.0 <= eff <= 1.0):
            raise ValueError(f"Control effectiveness must be in range [0.0, 1.0], got {eff}")
        factor *= (1.0 - float(eff))
    return float(factor)


def calculate_risk_loss_after(loss_before: float, residual_factor: float) -> float:
    """
    Calculates residual LossAfter given initial LossBefore and multi-control residual factor.
    LossAfter = LossBefore * residual_factor
    """
    if loss_before < 0.0:
        raise ValueError(f"Loss before must be non-negative, got {loss_before}")
    if not (0.0 <= residual_factor <= 1.0):
        raise ValueError(f"Residual factor must be in range [0.0, 1.0], got {residual_factor}")
    return float(loss_before * residual_factor)


@dataclass
class RiskQuantificationResult:
    """
    Structured result payload for single risk quantification.
    """
    risk_id: Optional[int]
    asset_id: Optional[int]
    asset_business_value: float
    exposure_factor: float
    sle: float
    threat_base_probability: float
    exploitability_multiplier: float
    aro: float
    ale: float
    likelihood: int
    impact: int
    qualitative_score: int
    loss_before: float
    loss_after: float
    risk_reduction: float
    selected_control_ids: List[int] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Converts result to a dictionary representation."""
        return {
            "risk_id": self.risk_id,
            "asset_id": self.asset_id,
            "asset_business_value": self.asset_business_value,
            "exposure_factor": self.exposure_factor,
            "sle": self.sle,
            "threat_base_probability": self.threat_base_probability,
            "exploitability_multiplier": self.exploitability_multiplier,
            "aro": self.aro,
            "ale": self.ale,
            "likelihood": self.likelihood,
            "impact": self.impact,
            "qualitative_score": self.qualitative_score,
            "loss_before": self.loss_before,
            "loss_after": self.loss_after,
            "risk_reduction": self.risk_reduction,
            "selected_control_ids": self.selected_control_ids,
        }


class RiskQuantificationEngine:
    """
    Domain-aware Risk Quantification Engine.
    Evaluates financial and qualitative risk metrics from ORM entities dynamically.
    """

    @classmethod
    def quantify_risk(
        cls,
        risk: Risk,
        selected_control_ids: Optional[Iterable[int]] = None,
    ) -> RiskQuantificationResult:
        """
        Quantifies financial and qualitative risk metrics for a single Risk object.
        Supports both vulnerability-based risks (finding -> asset) and direct asset risks.
        """
        if risk is None:
            raise ValueError("Risk object cannot be None")

        # 1. Resolve Asset and Business Value
        asset = risk.resolved_asset
        if asset is None:
            raise ValueError(f"Risk ID {risk.risk_id} has no associated asset")

        asset_bv = asset.business_value if asset.business_value is not None else 0.0
        ef = risk.exposure_factor

        # 2. SLE Calculation
        sle = calculate_sle(asset_bv, ef)

        # 3. Resolve Threat and Base Probability
        threat = risk.threat
        if threat is None:
            raise ValueError(f"Risk ID {risk.risk_id} has no associated Threat entity")

        base_prob = threat.base_probability

        # 4. Resolve Vulnerability & Exploitability Multiplier
        exploitability_score = None
        if risk.finding and risk.finding.vulnerability:
            exploitability_score = risk.finding.vulnerability.exploitability_score

        multiplier = convert_exploitability_score_to_multiplier(exploitability_score)

        # 5. ARO Calculation
        aro = calculate_aro(base_prob, multiplier)

        # 6. ALE (Loss Before) Calculation
        ale = calculate_ale(sle, aro)
        loss_before = ale

        # 7. Qualitative Scoring
        q_score = calculate_qualitative_score(risk.likelihood, risk.impact)

        # 8. Multi-Control Mitigation
        selected_set = set(selected_control_ids) if selected_control_ids is not None else set()

        selected_effectiveness = []
        if risk.controls:
            for rc in risk.controls:
                if rc.control_id in selected_set:
                    selected_effectiveness.append(rc.effectiveness_against_risk)

        residual_factor = calculate_multi_control_residual_factor(selected_effectiveness)
        loss_after = calculate_risk_loss_after(loss_before, residual_factor)
        risk_reduction = loss_before - loss_after

        return RiskQuantificationResult(
            risk_id=risk.risk_id,
            asset_id=asset.asset_id,
            asset_business_value=asset_bv,
            exposure_factor=ef,
            sle=sle,
            threat_base_probability=base_prob,
            exploitability_multiplier=multiplier,
            aro=aro,
            ale=ale,
            likelihood=risk.likelihood,
            impact=risk.impact,
            qualitative_score=q_score,
            loss_before=loss_before,
            loss_after=loss_after,
            risk_reduction=risk_reduction,
            selected_control_ids=sorted(list(selected_set)),
        )

    @classmethod
    def quantify_all_risks(
        cls,
        risks: List[Risk],
        selected_control_ids: Optional[Iterable[int]] = None,
    ) -> List[RiskQuantificationResult]:
        """
        Quantifies risk metrics across a list of Risk objects.
        """
        return [cls.quantify_risk(r, selected_control_ids) for r in risks]
