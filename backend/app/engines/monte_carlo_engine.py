"""
Monte Carlo Stochastic Loss Simulation Engine for PS105 (Phase 6).

Implements uncertainty modeling for cyber-loss outcomes:
- Frequency Model: Stochastic event occurrence count N ~ Poisson(lambda),
  where lambda = ARO (Annualized Rate of Occurrence) from Phase 5.
- Severity Model: Single-loss severity X ~ LogNormal(mu, sigma) or PERT(a, m, b),
  where LogNormal mu is parameterized such that E[X] = SLE (Single Loss Expectancy).
- Total Annual Loss = Sum_{k=1..N} X_k.
- Mitigation Modeling: Evaluates baseline risk vs. residual risk after applying Phase 5
  multiplicative control effectiveness multipliers.
- Statistical Outputs: P10, P50 (Median), P90, P95 percentiles, mean loss, min/max loss,
  probability of any loss, and loss exceedance probability curves (P(Loss > x)).

Reproducibility: Supported via explicit NumPy random Generator seeds.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Tuple, Dict, Any, Union
import numpy as np

from app.engines.risk_engine import RiskQuantificationResult, RiskQuantificationEngine


@dataclass
class RiskSimulationInput:
    """
    Input parameter structure for stochastic simulation of a single risk.
    """
    risk_id: Optional[int]
    expected_frequency: float  # Poisson lambda (>= 0), derived from Phase 5 ARO
    expected_severity: float   # Single loss expectancy mean (>= 0), derived from Phase 5 SLE
    severity_distribution: str = "lognormal"  # "lognormal" or "pert"
    severity_stddev_scale: float = 0.5        # LogNormal sigma (> 0)
    pert_params: Optional[Tuple[float, float, float]] = None  # (min, mode, max) for PERT

    def __post_init__(self):
        if self.expected_frequency < 0.0:
            raise ValueError(f"Expected frequency (lambda) must be non-negative, got {self.expected_frequency}")
        if self.expected_severity < 0.0:
            raise ValueError(f"Expected severity must be non-negative, got {self.expected_severity}")
        if self.severity_distribution.lower() not in {"lognormal", "pert"}:
            raise ValueError(f"Unsupported severity distribution '{self.severity_distribution}'. Must be 'lognormal' or 'pert'.")
        if self.severity_stddev_scale <= 0.0:
            raise ValueError(f"Severity stddev scale (sigma) must be positive, got {self.severity_stddev_scale}")

        if self.severity_distribution.lower() == "pert":
            if self.pert_params is None:
                # Default PERT parameters if not explicitly provided: [0.5 * severity, severity, 2.0 * severity]
                min_v = 0.5 * self.expected_severity
                mode_v = self.expected_severity
                max_v = 2.0 * self.expected_severity
                self.pert_params = (min_v, mode_v, max_v)
            else:
                a, m, b = self.pert_params
                if not (0.0 <= a <= m <= b):
                    raise ValueError(f"PERT parameters must satisfy 0 <= min <= mode <= max, got ({a}, {m}, {b})")


@dataclass
class MonteCarloConfig:
    """
    Configuration options for a Monte Carlo simulation execution.
    """
    number_of_simulations: int = 10000
    random_seed: Optional[int] = 42

    def __post_init__(self):
        if not isinstance(self.number_of_simulations, int) or self.number_of_simulations <= 0:
            raise ValueError(f"Number of simulations must be a positive integer, got {self.number_of_simulations}")


@dataclass
class MonteCarloResult:
    """
    Structured summary payload containing percentiles and loss exceedance curve data.
    """
    number_of_simulations: int
    random_seed: Optional[int]
    total_expected_loss: float
    mean_loss: float
    min_loss: float
    max_loss: float
    p10: float
    p50: float
    p90: float
    p95: float
    probability_of_any_loss: float
    loss_exceedance_curve: List[Dict[str, float]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Converts result payload to a dictionary."""
        return {
            "number_of_simulations": self.number_of_simulations,
            "random_seed": self.random_seed,
            "total_expected_loss": self.total_expected_loss,
            "mean_loss": self.mean_loss,
            "min_loss": self.min_loss,
            "max_loss": self.max_loss,
            "p10": self.p10,
            "p50": self.p50,
            "p90": self.p90,
            "p95": self.p95,
            "probability_of_any_loss": self.probability_of_any_loss,
            "loss_exceedance_curve": self.loss_exceedance_curve,
        }


class MonteCarloEngine:
    """
    Stochastic Loss Simulation Engine (Phase 6).
    Evaluates loss uncertainty across single risks or full organizational risk portfolios.
    """

    @staticmethod
    def sample_poisson_frequency(
        rng: np.random.Generator, lambda_param: float, size: int
    ) -> np.ndarray:
        """
        Samples event occurrence counts N ~ Poisson(lambda).
        """
        if lambda_param == 0.0:
            return np.zeros(size, dtype=int)
        return rng.poisson(lam=lambda_param, size=size)

    @staticmethod
    def sample_lognormal_severity(
        rng: np.random.Generator, mean_severity: float, sigma: float, num_samples: int
    ) -> np.ndarray:
        """
        Samples single-loss severities X ~ LogNormal(mu, sigma),
        where mu = ln(mean_severity) - sigma^2 / 2 so that E[X] = mean_severity.
        """
        if mean_severity == 0.0 or num_samples == 0:
            return np.zeros(num_samples, dtype=float)

        mu = np.log(mean_severity) - (sigma ** 2) / 2.0
        return rng.lognormal(mean=mu, sigma=sigma, size=num_samples)

    @staticmethod
    def sample_pert_severity(
        rng: np.random.Generator,
        min_val: float,
        mode_val: float,
        max_val: float,
        num_samples: int,
    ) -> np.ndarray:
        """
        Samples single-loss severities X ~ Modified PERT(min, mode, max).
        Using Beta distribution mapping with shape parameter gamma = 4.0.
        """
        if num_samples == 0 or max_val == 0.0:
            return np.zeros(num_samples, dtype=float)

        if min_val == max_val:
            return np.full(num_samples, min_val, dtype=float)

        range_val = max_val - min_val
        alpha = 1.0 + 4.0 * ((mode_val - min_val) / range_val)
        beta_param = 1.0 + 4.0 * ((max_val - mode_val) / range_val)

        beta_samples = rng.beta(a=alpha, b=beta_param, size=num_samples)
        return min_val + range_val * beta_samples

    @classmethod
    def simulate_single_risk(
        cls,
        risk_input: RiskSimulationInput,
        config: MonteCarloConfig,
        rng: Optional[np.random.Generator] = None,
    ) -> np.ndarray:
        """
        Simulates annual loss vector for a single risk across config.number_of_simulations runs.
        Returns NumPy array of shape (number_of_simulations,).
        """
        if rng is None:
            rng = np.random.default_rng(config.random_seed)

        n_sims = config.number_of_simulations
        freq_counts = cls.sample_poisson_frequency(
            rng, risk_input.expected_frequency, n_sims
        )

        total_events = int(np.sum(freq_counts))
        if total_events == 0 or risk_input.expected_severity == 0.0:
            return np.zeros(n_sims, dtype=float)

        dist_type = risk_input.severity_distribution.lower()
        if dist_type == "lognormal":
            severities = cls.sample_lognormal_severity(
                rng,
                risk_input.expected_severity,
                risk_input.severity_stddev_scale,
                total_events,
            )
        elif dist_type == "pert":
            a, m, b = risk_input.pert_params  # type: ignore
            severities = cls.sample_pert_severity(rng, a, m, b, total_events)
        else:
            raise ValueError(f"Unsupported distribution '{dist_type}'")

        # Vectorized aggregation of severities into simulation runs
        run_indices = np.repeat(np.arange(n_sims), freq_counts)
        annual_losses = np.bincount(
            run_indices, weights=severities, minlength=n_sims
        ).astype(float)

        return annual_losses

    @classmethod
    def create_risk_input_from_phase5(
        cls,
        p5_result: RiskQuantificationResult,
        use_residual: bool = False,
        severity_distribution: str = "lognormal",
        severity_stddev_scale: float = 0.5,
        pert_params: Optional[Tuple[float, float, float]] = None,
    ) -> RiskSimulationInput:
        """
        Constructs a RiskSimulationInput object cleanly from a Phase 5 RiskQuantificationResult.
        
        Frequency (lambda) = p5_result.aro
        Severity mean = p5_result.sle (for baseline) or p5_result.sle * (loss_after / loss_before) (for residual).
        """
        freq = p5_result.aro
        if not use_residual:
            sev = p5_result.sle
        else:
            if p5_result.loss_before > 0:
                residual_factor = p5_result.loss_after / p5_result.loss_before
                sev = p5_result.sle * residual_factor
            else:
                sev = 0.0

        return RiskSimulationInput(
            risk_id=p5_result.risk_id,
            expected_frequency=freq,
            expected_severity=sev,
            severity_distribution=severity_distribution,
            severity_stddev_scale=severity_stddev_scale,
            pert_params=pert_params,
        )

    @classmethod
    def run_simulation(
        cls,
        risk_inputs: List[RiskSimulationInput],
        config: Optional[MonteCarloConfig] = None,
    ) -> MonteCarloResult:
        """
        Executes Monte Carlo stochastic simulation across a list of risk inputs.
        Calculates aggregate portfolio annual loss percentiles and loss exceedance probability curve.
        """
        if config is None:
            config = MonteCarloConfig()

        if not risk_inputs:
            return MonteCarloResult(
                number_of_simulations=config.number_of_simulations,
                random_seed=config.random_seed,
                total_expected_loss=0.0,
                mean_loss=0.0,
                min_loss=0.0,
                max_loss=0.0,
                p10=0.0,
                p50=0.0,
                p90=0.0,
                p95=0.0,
                probability_of_any_loss=0.0,
                loss_exceedance_curve=[{"loss_threshold": 0.0, "exceedance_probability": 0.0}],
            )

        rng = np.random.default_rng(config.random_seed)
        portfolio_losses = np.zeros(config.number_of_simulations, dtype=float)

        total_deterministic_expected_loss = 0.0
        for r_input in risk_inputs:
            total_deterministic_expected_loss += r_input.expected_frequency * r_input.expected_severity
            risk_losses = cls.simulate_single_risk(r_input, config, rng=rng)
            portfolio_losses += risk_losses

        mean_loss = float(np.mean(portfolio_losses))
        min_loss = float(np.min(portfolio_losses))
        max_loss = float(np.max(portfolio_losses))

        p10 = float(np.percentile(portfolio_losses, 10))
        p50 = float(np.percentile(portfolio_losses, 50))
        p90 = float(np.percentile(portfolio_losses, 90))
        p95 = float(np.percentile(portfolio_losses, 95))

        prob_any_loss = float(np.mean(portfolio_losses > 0.0))

        # Generate Loss Exceedance Curve data points (25 threshold points from 0 to max_loss)
        exceedance_curve = []
        if max_loss > 0.0:
            thresholds = np.linspace(0.0, max_loss, num=25)
            for t in thresholds:
                prob_exceed = float(np.mean(portfolio_losses > t))
                exceedance_curve.append({
                    "loss_threshold": float(round(t, 2)),
                    "exceedance_probability": float(round(prob_exceed, 4)),
                })
        else:
            exceedance_curve.append({"loss_threshold": 0.0, "exceedance_probability": 0.0})

        return MonteCarloResult(
            number_of_simulations=config.number_of_simulations,
            random_seed=config.random_seed,
            total_expected_loss=float(round(total_deterministic_expected_loss, 2)),
            mean_loss=float(round(mean_loss, 2)),
            min_loss=float(round(min_loss, 2)),
            max_loss=float(round(max_loss, 2)),
            p10=float(round(p10, 2)),
            p50=float(round(p50, 2)),
            p90=float(round(p90, 2)),
            p95=float(round(p95, 2)),
            probability_of_any_loss=float(round(prob_any_loss, 4)),
            loss_exceedance_curve=exceedance_curve,
        )
