"""
Security Optimization & Scenarios API Router for PS105 (Phase 8).
Orchestrates Phase 7 OptimizationEngine without duplicating solver or enumeration logic.
"""

from typing import Dict, Any, List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.domain import User, Risk, Asset, SecurityControl, RiskControl, Scenario
from app.schemas.schemas import ScenarioCreate, ScenarioResponse, OptimizationRunRequest
from app.engines.risk_engine import RiskQuantificationEngine
from app.engines.optimization_engine import OptimizationEngine, OptimizationProblemConfig
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/scenarios", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED, summary="Create Budget Allocation Scenario")
def create_scenario(
    scenario_in: ScenarioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new executive budget allocation scenario for current user's organization.
    """
    scenario_dict = scenario_in.model_dump()
    scenario_dict["organization_id"] = current_user.organization_id

    scenario = Scenario(**scenario_dict)
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


@router.get("/scenarios", response_model=List[ScenarioResponse], summary="List Budget Allocation Scenarios")
def list_scenarios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns all budget allocation scenarios for the authenticated user's organization.
    """
    scenarios = db.query(Scenario).filter(Scenario.organization_id == current_user.organization_id).all()
    return scenarios


@router.post("/run", summary="Run Security Investment Optimization")
def run_optimization(
    req: OptimizationRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Executes security investment optimization across available candidate controls.
    Runs PuLP additive MILP solver, performs exact compounding multiplicative post-evaluation,
    and executes exhaustive 2^N global validation.
    Invokes existing Phase 7 OptimizationEngine dynamically.
    """
    budget = req.available_budget

    if req.scenario_id:
        scenario = db.query(Scenario).filter(
            Scenario.scenario_id == req.scenario_id,
            Scenario.organization_id == current_user.organization_id,
        ).first()
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario ID {req.scenario_id} not found for your organization.",
            )
        if budget is None:
            budget = scenario.available_budget

    if budget is None:
        # Fall back to organization's cybersecurity budget
        org_budget = current_user.organization.cybersecurity_budget if current_user.organization else 0.0
        budget = org_budget

    if budget < 0.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="available_budget must be non-negative",
        )

    # Fetch risks for current user's organization
    risks = (
        db.query(Risk)
        .join(Asset, Risk.asset_id == Asset.asset_id, isouter=True)
        .all()
    )
    org_risks = [r for r in risks if r.resolved_asset and r.resolved_asset.organization_id == current_user.organization_id]

    p5_results = RiskQuantificationEngine.quantify_all_risks(org_risks)

    controls = db.query(SecurityControl).all()
    risk_controls = db.query(RiskControl).all()

    config = OptimizationProblemConfig(
        available_budget=budget,
        mandatory_control_ids=set(req.mandatory_control_ids) if req.mandatory_control_ids else set(),
        dependencies=req.dependencies or [],
        run_exhaustive_validation=True,
    )

    opt_result = OptimizationEngine.optimize_portfolio(p5_results, controls, risk_controls, config)
    res = opt_result.to_dict()
    res["exact_multiplicative_loss"] = res["exact_expected_loss_after"]
    res["milp_objective_loss"] = max(0.0, res["expected_loss_before"] - res["milp_objective_value"])
    res["exhaustive_optimum_loss"] = res["exhaustive_optimal_loss_after"]
    res["milp_matches_exhaustive"] = res["milp_matches_exhaustive_optimum"]
    res["roi"] = (res["exact_risk_reduction"] / res["total_investment"]) if res["total_investment"] > 0 else 0.0
    return res
