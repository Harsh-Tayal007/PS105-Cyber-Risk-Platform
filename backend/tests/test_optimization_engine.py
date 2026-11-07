"""
Unit & Integration Tests for Security Investment Optimization Engine (PS105 Phase 7).
"""

import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database.connection import Base
from app.models.domain import Risk, SecurityControl, RiskControl, Scenario
from app.database.seed import run_seed
from app.engines.risk_engine import RiskQuantificationEngine, RiskQuantificationResult
from app.engines.optimization_engine import (
    ControlOptimizationInput,
    OptimizationProblemConfig,
    OptimizationResult,
    OptimizationEngine,
    calculate_exact_portfolio_multiplicative_metrics,
)


@pytest.fixture
def db_session():
    """In-memory SQLite database session fixture."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def mini_dataset():
    """Miniature hand-calculable test dataset."""
    # 2 Risks with Loss Before: R1 = 100,000, R2 = 200,000 (Total Loss Before = 300,000)
    risk_results = [
        RiskQuantificationResult(
            risk_id=1, asset_id=1, asset_business_value=1e6, exposure_factor=0.5,
            sle=5e5, threat_base_probability=0.2, exploitability_multiplier=1.0, aro=0.2,
            ale=100000.0, likelihood=3, impact=3, qualitative_score=9, loss_before=100000.0,
            loss_after=100000.0, risk_reduction=0.0,
        ),
        RiskQuantificationResult(
            risk_id=2, asset_id=2, asset_business_value=2e6, exposure_factor=0.5,
            sle=1e6, threat_base_probability=0.2, exploitability_multiplier=1.0, aro=0.2,
            ale=200000.0, likelihood=3, impact=4, qualitative_score=12, loss_before=200000.0,
            loss_after=200000.0, risk_reduction=0.0,
        ),
    ]

    # 3 Controls:
    # C1: Cost = 5,000, E_R1 = 0.50, E_R2 = 0.00 -> Additive W_1 = 50,000
    # C2: Cost = 10,000, E_R1 = 0.00, E_R2 = 0.80 -> Additive W_2 = 160,000
    # C3: Cost = 15,000, E_R1 = 0.60, E_R2 = 0.60 -> Additive W_3 = 180,000
    controls = [
        ControlOptimizationInput(control_id=1, name="Control 1", total_cost=5000.0, effectiveness_by_risk={1: 0.50}),
        ControlOptimizationInput(control_id=2, name="Control 2", total_cost=10000.0, effectiveness_by_risk={2: 0.80}),
        ControlOptimizationInput(control_id=3, name="Control 3", total_cost=15000.0, effectiveness_by_risk={1: 0.60, 2: 0.60}),
    ]

    return risk_results, controls


# 1. Zero Budget Test
def test_zero_budget(mini_dataset):
    risk_results, controls = mini_dataset
    config = OptimizationProblemConfig(available_budget=0.0)

    selected, obj, feasible, status = OptimizationEngine.solve_additive_milp(risk_results, controls, config)
    assert feasible is True
    assert selected == []
    assert obj == 0.0


# 2. Budget Smaller Than Every Control Test
def test_budget_smaller_than_every_control(mini_dataset):
    risk_results, controls = mini_dataset
    config = OptimizationProblemConfig(available_budget=2000.0)  # Min cost is 5000.0

    selected, obj, feasible, status = OptimizationEngine.solve_additive_milp(risk_results, controls, config)
    assert feasible is True
    assert selected == []
    assert obj == 0.0


# 3. Budget Sufficient For All Controls Test
def test_budget_sufficient_for_all_controls(mini_dataset):
    risk_results, controls = mini_dataset
    config = OptimizationProblemConfig(available_budget=50000.0)  # Total cost is 30,000.0

    selected, obj, feasible, status = OptimizationEngine.solve_additive_milp(risk_results, controls, config)
    assert feasible is True
    assert set(selected) == {1, 2, 3}


# 4. Mandatory Controls Constraint Test
def test_mandatory_controls_constraint(mini_dataset):
    risk_results, controls = mini_dataset
    # Budget 15,000.0 (Can fit C1+C2 or C3). Mandatory control: C1 (5000.0).
    config = OptimizationProblemConfig(available_budget=15000.0, mandatory_control_ids={1})

    selected, obj, feasible, status = OptimizationEngine.solve_additive_milp(risk_results, controls, config)
    assert feasible is True
    assert 1 in selected
    assert sum(c.total_cost for c in controls if c.control_id in selected) <= 15000.0


# 5. Dependency Constraints Test
def test_dependency_constraints(mini_dataset):
    risk_results, controls = mini_dataset
    # C2 requires C1 (Dependency: 2 requires 1 => x_2 <= x_1).
    # Budget 10,000.0. Without dependency, solver would pick C2 (cost 10k, W=160k).
    # With dependency, picking C2 requires C1 (total cost 15k > budget), so solver must pick C1 alone or empty.
    config = OptimizationProblemConfig(available_budget=10000.0, dependencies=[(2, 1)])

    selected, obj, feasible, status = OptimizationEngine.solve_additive_milp(risk_results, controls, config)
    assert feasible is True
    # Verify x_2 <= x_1 constraint
    if 2 in selected:
        assert 1 in selected


# 6. Exact Multiplicative Residual Loss Metric Calculation Test
def test_exact_multiplicative_residual_calculation(mini_dataset):
    risk_results, controls = mini_dataset
    # Select C1 and C2
    tot_cost, loss_after, risk_red = calculate_exact_portfolio_multiplicative_metrics(risk_results, controls, [1, 2])

    assert tot_cost == 15000.0
    # LossAfter R1 = 100,000 * (1 - 0.50) = 50,000
    # LossAfter R2 = 200,000 * (1 - 0.80) = 40,000
    # Total Loss After = 90,000. Total Risk Reduction = 300,000 - 90,000 = 210,000
    assert loss_after == 90000.0
    assert risk_red == 210000.0


# 7. Exhaustive 2^N Enumeration Count Test
def test_exhaustive_enumeration_count(mini_dataset):
    risk_results, controls = mini_dataset
    config = OptimizationProblemConfig(available_budget=15000.0)

    best_ids, best_inv, best_l_after, best_red, num_enum = OptimizationEngine.run_exhaustive_enumeration(
        risk_results, controls, config
    )

    # 3 controls => 2^3 = 8 portfolios
    assert num_enum == 8
    assert best_inv <= 15000.0


# 8. Exact 8-Control 2^8 = 256 Enumeration Test on Seeded Dataset
def test_phase_4_5_seeded_optimization_and_256_enumeration(db_session):
    run_seed(db_session)
    scenario = db_session.query(Scenario).first()
    assert scenario.available_budget == 2500000.0  # ₹25 Lakh

    result = OptimizationEngine.optimize_from_db(db_session, scenario.scenario_id)

    assert isinstance(result, OptimizationResult)
    assert result.feasible is True
    assert result.number_of_enumerated_portfolios == 256
    assert result.total_investment <= 2500000.0
    assert result.remaining_budget == 2500000.0 - result.total_investment

    # Verify MILP-selected portfolio controls
    assert set(result.selected_control_names) == {"MFA", "SIEM", "Firewall Upgrade", "Pen Testing"}
    assert result.total_investment == 2275000.0

    # Verify Multiplicative Post-Evaluation of MILP selection (scaled by 0.1)
    assert pytest.approx(result.exact_expected_loss_after, abs=1.0) == 3692055.0
    assert pytest.approx(result.exact_risk_reduction, abs=1.0) == 16599195.0

    # Verify Exhaustive Global Optimum (scaled by 0.1)
    assert set(result.exhaustive_optimal_control_names) == {
        "MFA", "Security Training", "Firewall Upgrade", "Pen Testing", "Network Segmentation"
    }
    assert result.exhaustive_optimal_investment == 2325000.0
    assert pytest.approx(result.exhaustive_optimal_loss_after, abs=1.0) == 2543815.0
    assert pytest.approx(result.exhaustive_optimal_risk_reduction, abs=1.0) == 17747435.0

    # Explicitly verify comparison report: Additive MILP differs from true multiplicative optimum
    assert result.milp_matches_exhaustive_optimum is False


# 9. Deterministic Solver Execution Test
def test_deterministic_solver_execution(db_session):
    run_seed(db_session)
    scenario = db_session.query(Scenario).first()

    res1 = OptimizationEngine.optimize_from_db(db_session, scenario.scenario_id)
    res2 = OptimizationEngine.optimize_from_db(db_session, scenario.scenario_id)

    assert res1.to_dict() == res2.to_dict()


# 10. Infeasibility Handling Test
def test_infeasibility_handling(mini_dataset):
    risk_results, controls = mini_dataset
    # Budget 4,000.0 (lower than C1 cost 5000.0), but C1 is mandatory => Infeasible
    config = OptimizationProblemConfig(available_budget=4000.0, mandatory_control_ids={1})

    selected, obj, feasible, status = OptimizationEngine.solve_additive_milp(risk_results, controls, config)
    assert feasible is False


# 11. Identical Effect Controls Test (Item 15)
def test_two_controls_identical_effect_match_exhaustive(mini_dataset):
    """
    When two controls have identical cost and effectiveness, either selection achieves
    the identical exact residual loss. The comparison must verify matching loss within tolerance.
    """
    risk_results, _ = mini_dataset
    # Control 1 and Control 2 have identical cost (10,000) and effectiveness (0.50 on R1)
    c1 = ControlOptimizationInput(control_id=1, name="Control Alpha", total_cost=10000.0, effectiveness_by_risk={1: 0.50})
    c2 = ControlOptimizationInput(control_id=2, name="Control Beta", total_cost=10000.0, effectiveness_by_risk={1: 0.50})

    # Budget allows only one control
    config = OptimizationProblemConfig(available_budget=10000.0, run_exhaustive_validation=True)
    res = OptimizationEngine.optimize_portfolio(risk_results, [c1, c2], [], config)

    assert res.feasible is True
    assert len(res.selected_control_ids) == 1
    assert abs(res.exact_expected_loss_after - res.exhaustive_optimal_loss_after) <= 1e-6 * res.expected_loss_before
    assert res.milp_matches_exhaustive_optimum is True
