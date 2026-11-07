"""
Unit & Integration Tests for Monte Carlo Stochastic Loss Simulation Engine (PS105 Phase 6).
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
from app.models.domain import Risk
from app.database.seed import run_seed
from app.engines.risk_engine import RiskQuantificationEngine
from app.engines.monte_carlo_engine import (
    RiskSimulationInput,
    MonteCarloConfig,
    MonteCarloResult,
    MonteCarloEngine,
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


# 1. Basic Poisson + Severity Simulation Test
def test_basic_poisson_severity_simulation():
    r_input = RiskSimulationInput(
        risk_id=1,
        expected_frequency=0.5,
        expected_severity=100000.0,
        severity_distribution="lognormal",
    )
    config = MonteCarloConfig(number_of_simulations=1000, random_seed=123)
    res = MonteCarloEngine.run_simulation([r_input], config)

    assert isinstance(res, MonteCarloResult)
    assert res.number_of_simulations == 1000
    assert res.random_seed == 123
    assert res.mean_loss > 0.0
    assert res.min_loss >= 0.0


# 2. Exact Reproducibility Test
def test_exact_reproducibility():
    r_input = RiskSimulationInput(
        risk_id=1,
        expected_frequency=0.4,
        expected_severity=500000.0,
    )
    config = MonteCarloConfig(number_of_simulations=2000, random_seed=999)

    res1 = MonteCarloEngine.run_simulation([r_input], config)
    res2 = MonteCarloEngine.run_simulation([r_input], config)

    # Identical inputs + seed must produce 100% identical outputs
    assert res1.to_dict() == res2.to_dict()
    assert res1.mean_loss == res2.mean_loss
    assert res1.p50 == res2.p50
    assert res1.p95 == res2.p95


# 3. Different Seed Behavior Test
def test_different_seed_behavior():
    r_input = RiskSimulationInput(
        risk_id=1,
        expected_frequency=0.4,
        expected_severity=500000.0,
    )
    c1 = MonteCarloConfig(number_of_simulations=1000, random_seed=111)
    c2 = MonteCarloConfig(number_of_simulations=1000, random_seed=222)

    res1 = MonteCarloEngine.run_simulation([r_input], c1)
    res2 = MonteCarloEngine.run_simulation([r_input], c2)

    # Valid results, but different seeds produce different sample runs
    assert res1.mean_loss != res2.mean_loss


# 4. Correct Number of Simulations Test
def test_correct_number_of_simulations():
    r_input = RiskSimulationInput(risk_id=1, expected_frequency=0.2, expected_severity=10000.0)
    c100 = MonteCarloConfig(number_of_simulations=500, random_seed=42)
    res = MonteCarloEngine.run_simulation([r_input], c100)

    assert res.number_of_simulations == 500


# 5. Non-Negative Losses Test
def test_non_negative_losses():
    r_input = RiskSimulationInput(risk_id=1, expected_frequency=1.5, expected_severity=200000.0)
    config = MonteCarloConfig(number_of_simulations=1000, random_seed=42)
    res = MonteCarloEngine.run_simulation([r_input], config)

    assert res.min_loss >= 0.0
    assert res.p10 >= 0.0
    assert res.p50 >= 0.0
    assert res.p90 >= 0.0
    assert res.p95 >= 0.0


# 6. Percentile Ordering Test
def test_percentile_ordering():
    r_input = RiskSimulationInput(risk_id=1, expected_frequency=0.8, expected_severity=150000.0)
    config = MonteCarloConfig(number_of_simulations=5000, random_seed=42)
    res = MonteCarloEngine.run_simulation([r_input], config)

    assert res.min_loss <= res.p10 <= res.p50 <= res.p90 <= res.p95 <= res.max_loss


# 7. Lambda = 0 Behavior Test
def test_lambda_zero_behavior():
    r_input = RiskSimulationInput(risk_id=1, expected_frequency=0.0, expected_severity=100000.0)
    config = MonteCarloConfig(number_of_simulations=1000, random_seed=42)
    res = MonteCarloEngine.run_simulation([r_input], config)

    assert res.mean_loss == 0.0
    assert res.min_loss == 0.0
    assert res.max_loss == 0.0
    assert res.p10 == 0.0
    assert res.p50 == 0.0
    assert res.p90 == 0.0
    assert res.p95 == 0.0
    assert res.probability_of_any_loss == 0.0


# 8. Invalid Lambda Rejection Test
def test_invalid_lambda_rejection():
    with pytest.raises(ValueError):
        RiskSimulationInput(risk_id=1, expected_frequency=-0.5, expected_severity=1000.0)


# 9. Invalid Severity Parameters Rejection Test
def test_invalid_severity_parameters_rejection():
    with pytest.raises(ValueError):
        RiskSimulationInput(risk_id=1, expected_frequency=0.5, expected_severity=-10.0)

    with pytest.raises(ValueError):
        RiskSimulationInput(risk_id=1, expected_frequency=0.5, expected_severity=10.0, severity_stddev_scale=-0.1)

    with pytest.raises(ValueError):
        RiskSimulationInput(
            risk_id=1,
            expected_frequency=0.5,
            expected_severity=100.0,
            severity_distribution="pert",
            pert_params=(500.0, 100.0, 50.0),  # Invalid: min > max
        )


# 10. LogNormal Distribution Behavior Test
def test_lognormal_distribution_behavior():
    r_input = RiskSimulationInput(
        risk_id=1,
        expected_frequency=1.0,
        expected_severity=100000.0,
        severity_distribution="lognormal",
    )
    config = MonteCarloConfig(number_of_simulations=10000, random_seed=42)
    res = MonteCarloEngine.run_simulation([r_input], config)

    # For 10,000 runs, mean simulated annual loss converges close to deterministic expected loss (1.0 * 100,000)
    assert pytest.approx(res.mean_loss, rel=0.15) == 100000.0


# 11. PERT Distribution Behavior Test
def test_pert_distribution_behavior():
    r_input = RiskSimulationInput(
        risk_id=1,
        expected_frequency=0.5,
        expected_severity=100000.0,
        severity_distribution="pert",
        pert_params=(10000.0, 100000.0, 300000.0),
    )
    config = MonteCarloConfig(number_of_simulations=5000, random_seed=42)
    res = MonteCarloEngine.run_simulation([r_input], config)

    assert res.mean_loss > 0.0
    assert res.max_loss > res.min_loss


# 12. Loss Exceedance Curve Generation Test
def test_loss_exceedance_curve():
    r_input = RiskSimulationInput(risk_id=1, expected_frequency=0.6, expected_severity=200000.0)
    config = MonteCarloConfig(number_of_simulations=1000, random_seed=42)
    res = MonteCarloEngine.run_simulation([r_input], config)

    curve = res.loss_exceedance_curve
    assert len(curve) == 25
    assert curve[0]["loss_threshold"] == 0.0
    # Probability of exceeding 0 threshold equals probability_of_any_loss
    assert curve[0]["exceedance_probability"] == res.probability_of_any_loss

    # Exceedance probabilities must be non-increasing with threshold
    probs = [pt["exceedance_probability"] for pt in curve]
    for i in range(len(probs) - 1):
        assert probs[i] >= probs[i + 1]


# 13. Seeded Phase 4/5 Portfolio Simulation Test
def test_phase_4_5_seeded_portfolio_simulation(db_session):
    run_seed(db_session)
    risks = db_session.query(Risk).all()

    p5_results = RiskQuantificationEngine.quantify_all_risks(risks)
    mc_inputs = [MonteCarloEngine.create_risk_input_from_phase5(r) for r in p5_results]

    config = MonteCarloConfig(number_of_simulations=5000, random_seed=42)
    mc_result = MonteCarloEngine.run_simulation(mc_inputs, config)

    assert mc_result.number_of_simulations == 5000
    assert mc_result.total_expected_loss == 20291250.0  # Phase 5 benchmark total ALE (scaled assets)
    assert mc_result.mean_loss > 0.0
    assert mc_result.p50 > 0.0
    assert mc_result.p95 >= mc_result.p90 >= mc_result.p50


# 14. Baseline vs Residual-Risk Simulation Comparison Test
def test_baseline_vs_residual_risk_simulation(db_session):
    run_seed(db_session)
    risks = db_session.query(Risk).all()

    # Controls 1, 2 selected
    p5_results = RiskQuantificationEngine.quantify_all_risks(risks, selected_control_ids=[1, 2])

    baseline_inputs = [
        MonteCarloEngine.create_risk_input_from_phase5(r, use_residual=False)
        for r in p5_results
    ]
    residual_inputs = [
        MonteCarloEngine.create_risk_input_from_phase5(r, use_residual=True)
        for r in p5_results
    ]

    config = MonteCarloConfig(number_of_simulations=5000, random_seed=42)
    res_base = MonteCarloEngine.run_simulation(baseline_inputs, config)
    res_residual = MonteCarloEngine.run_simulation(residual_inputs, config)

    # Residual risk expected loss and percentiles MUST be significantly lower than baseline
    assert res_residual.mean_loss < res_base.mean_loss
    assert res_residual.p95 < res_base.p95


# 15. Large 10,000 Simulations Run Test
def test_large_simulation_performance():
    r1 = RiskSimulationInput(risk_id=1, expected_frequency=0.5, expected_severity=100000.0)
    r2 = RiskSimulationInput(risk_id=2, expected_frequency=0.3, expected_severity=500000.0)

    config = MonteCarloConfig(number_of_simulations=10000, random_seed=100)
    res = MonteCarloEngine.run_simulation([r1, r2], config)

    assert res.number_of_simulations == 10000
    assert res.mean_loss > 0.0


# 16. Statistical Sanity: Frequency Increase Increases Loss
def test_statistical_sanity_frequency_increase():
    low_freq = RiskSimulationInput(risk_id=1, expected_frequency=0.1, expected_severity=100000.0)
    high_freq = RiskSimulationInput(risk_id=1, expected_frequency=1.0, expected_severity=100000.0)

    c = MonteCarloConfig(number_of_simulations=5000, random_seed=42)
    res_low = MonteCarloEngine.run_simulation([low_freq], c)
    res_high = MonteCarloEngine.run_simulation([high_freq], c)

    assert res_high.mean_loss > res_low.mean_loss
    assert res_high.p95 > res_low.p95


# 17. Statistical Sanity: Severity Increase Increases Loss
def test_statistical_sanity_severity_increase():
    low_sev = RiskSimulationInput(risk_id=1, expected_frequency=0.5, expected_severity=50000.0)
    high_sev = RiskSimulationInput(risk_id=1, expected_frequency=0.5, expected_severity=500000.0)

    c = MonteCarloConfig(number_of_simulations=5000, random_seed=42)
    res_low = MonteCarloEngine.run_simulation([low_sev], c)
    res_high = MonteCarloEngine.run_simulation([high_sev], c)

    assert res_high.mean_loss > res_low.mean_loss
    assert res_high.p95 > res_low.p95
