"""
Monte Carlo Simulation API Router for PS105 (Phase 8).
Orchestrates Phase 6 MonteCarloEngine without duplicating stochastic sampling logic.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.domain import User, Risk, Asset
from app.schemas.schemas import SimulationRunRequest
from app.engines.risk_engine import RiskQuantificationEngine
from app.engines.monte_carlo_engine import MonteCarloEngine, MonteCarloConfig
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/run", summary="Run Monte Carlo Stochastic Simulation")
def run_monte_carlo_simulation(
    req: SimulationRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Executes Monte Carlo stochastic loss simulation across the organization's risk portfolio.
    Invokes Phase 6 MonteCarloEngine dynamically.
    """
    if req.number_of_simulations <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="number_of_simulations must be greater than 0",
        )

    risks = (
        db.query(Risk)
        .join(Asset, Risk.asset_id == Asset.asset_id, isouter=True)
        .all()
    )

    org_risks = [r for r in risks if r.resolved_asset and r.resolved_asset.organization_id == current_user.organization_id]

    p5_results = RiskQuantificationEngine.quantify_all_risks(org_risks, selected_control_ids=req.selected_control_ids)

    mc_inputs = [
        MonteCarloEngine.create_risk_input_from_phase5(
            r,
            use_residual=req.use_residual,
            severity_distribution=req.severity_distribution,
        )
        for r in p5_results
    ]

    mc_config = MonteCarloConfig(
        number_of_simulations=req.number_of_simulations,
        random_seed=req.random_seed,
    )

    mc_result = MonteCarloEngine.run_simulation(mc_inputs, mc_config)
    res = mc_result.to_dict()
    res["simulations_count"] = res["number_of_simulations"]
    res["seed"] = res["random_seed"]
    res["exceedance_curve"] = [
        {
            "loss": p["loss_threshold"],
            "probability": p["exceedance_probability"],
            "loss_threshold": p["loss_threshold"],
            "exceedance_probability": p["exceedance_probability"],
        }
        for p in res.get("loss_exceedance_curve", [])
    ]
    return res
