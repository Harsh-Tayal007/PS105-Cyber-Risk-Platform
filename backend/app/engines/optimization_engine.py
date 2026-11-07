"""
Security Investment Optimization Engine for PS105 (Phase 7).

Implements cybersecurity budget allocation optimization using:
1. Additive Binary Mixed Integer Linear Programming (MILP) solver via PuLP:
   - Decision Variable: x_i in {0, 1}
   - Objective: Maximize sum_i sum_j (LossBefore_j * E_ij) * x_i
   - Constraints: sum_i (impl_cost_i + maint_cost_i) * x_i <= available_budget
                  x_k <= x_m for control dependencies
                  x_c = 1 for mandatory regulatory controls
2. Exact Compounding Multiplicative Post-Evaluator:
   - Evaluates exact residual loss LossAfter_j(x*) = LossBefore_j * Product(1 - E_ij * x_i*)
3. Exhaustive Global 2^N Validation Engine:
   - Enumerates all 2^N combinations (exactly 256 for 8 candidate controls)
   - Evaluates true global multiplicative optimum under exact compounding loss reduction
   - Compares additive MILP approximation selection against exhaustive multiplicative optimum.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Set, Tuple, Dict, Any, Iterable
import itertools
import pulp

from app.models.domain import Risk, SecurityControl, RiskControl, Scenario, Asset, AssetVulnerabilityFinding
from app.engines.risk_engine import RiskQuantificationResult, RiskQuantificationEngine


@dataclass
class ControlOptimizationInput:
    """
    Candidate security control input data for optimization engines.
    """
    control_id: int
    name: str
    total_cost: float  # implementation_cost + maintenance_cost
    effectiveness_by_risk: Dict[int, float]  # risk_id -> effectiveness E_ij

    def __post_init__(self):
        if self.total_cost < 0.0:
            raise ValueError(f"Control cost must be non-negative, got {self.total_cost}")
        for r_id, eff in self.effectiveness_by_risk.items():
            if not (0.0 <= eff <= 1.0):
                raise ValueError(f"Effectiveness for risk {r_id} must be in range [0.0, 1.0], got {eff}")


@dataclass
class OptimizationProblemConfig:
    """
    Optimization problem parameters and constraints configuration.
    """
    available_budget: float
    mandatory_control_ids: Set[int] = field(default_factory=set)
    dependencies: List[Tuple[int, int]] = field(default_factory=list)  # (dependent_k, prerequisite_m) => x_k <= x_m
    run_exhaustive_validation: bool = True

    def __post_init__(self):
        if self.available_budget < 0.0:
            raise ValueError(f"Available budget must be non-negative, got {self.available_budget}")


@dataclass
class OptimizationResult:
    """
    Structured optimization payload comparing additive MILP results against
    exact multiplicative evaluation and exhaustive global optimum validation.
    """
    selected_control_ids: List[int]
    selected_control_names: List[str]
    total_investment: float
    available_budget: float
    remaining_budget: float
    milp_objective_value: float
    expected_loss_before: float
    exact_expected_loss_after: float
    exact_risk_reduction: float
    feasible: bool
    solver_status: str
    exhaustive_optimal_control_ids: List[int]
    exhaustive_optimal_control_names: List[str]
    exhaustive_optimal_investment: float
    exhaustive_optimal_loss_after: float
    exhaustive_optimal_risk_reduction: float
    milp_matches_exhaustive_optimum: bool
    number_of_enumerated_portfolios: int

    def to_dict(self) -> Dict[str, Any]:
        """Converts result to a structured dictionary representation."""
        return {
            "selected_control_ids": self.selected_control_ids,
            "selected_control_names": self.selected_control_names,
            "total_investment": self.total_investment,
            "available_budget": self.available_budget,
            "remaining_budget": self.remaining_budget,
            "milp_objective_value": self.milp_objective_value,
            "expected_loss_before": self.expected_loss_before,
            "exact_expected_loss_after": self.exact_expected_loss_after,
            "exact_risk_reduction": self.exact_risk_reduction,
            "feasible": self.feasible,
            "solver_status": self.solver_status,
            "exhaustive_optimal_control_ids": self.exhaustive_optimal_control_ids,
            "exhaustive_optimal_control_names": self.exhaustive_optimal_control_names,
            "exhaustive_optimal_investment": self.exhaustive_optimal_investment,
            "exhaustive_optimal_loss_after": self.exhaustive_optimal_loss_after,
            "exhaustive_optimal_risk_reduction": self.exhaustive_optimal_risk_reduction,
            "milp_matches_exhaustive_optimum": self.milp_matches_exhaustive_optimum,
            "number_of_enumerated_portfolios": self.number_of_enumerated_portfolios,
        }


def calculate_exact_portfolio_multiplicative_metrics(
    risk_results: List[RiskQuantificationResult],
    controls: List[ControlOptimizationInput],
    selected_control_ids: Iterable[int],
) -> Tuple[float, float, float]:
    """
    Calculates exact compounding multiplicative loss and risk reduction for a selected control portfolio.
    
    Returns: (total_investment, exact_loss_after, exact_risk_reduction)
    """
    selected_set = set(selected_control_ids)
    ctrl_by_id = {c.control_id: c for c in controls}

    total_investment = sum(ctrl_by_id[c_id].total_cost for c_id in selected_set if c_id in ctrl_by_id)

    total_loss_before = sum(r.loss_before for r in risk_results)
    exact_loss_after = 0.0

    for r in risk_results:
        risk_id = r.risk_id
        factor = 1.0
        for c_id in selected_set:
            if c_id in ctrl_by_id:
                eff = ctrl_by_id[c_id].effectiveness_by_risk.get(risk_id, 0.0)
                factor *= (1.0 - eff)
        exact_loss_after += r.loss_before * factor

    exact_risk_reduction = total_loss_before - exact_loss_after
    return (
        float(round(total_investment, 2)),
        float(round(exact_loss_after, 2)),
        float(round(exact_risk_reduction, 2)),
    )


class OptimizationEngine:
    """
    Security Investment Optimization Engine (Phase 7).
    Combines PuLP Additive MILP Solver, Multiplicative Post-Evaluator, and Exhaustive Global 2^N Validator.
    """

    @classmethod
    def solve_additive_milp(
        cls,
        risk_results: List[RiskQuantificationResult],
        controls: List[ControlOptimizationInput],
        config: OptimizationProblemConfig,
    ) -> Tuple[List[int], float, bool, str]:
        """
        Solves the additive MILP optimization problem using PuLP.
        
        Returns: (selected_control_ids, milp_objective_value, feasible, solver_status)
        """
        if not controls:
            return ([], 0.0, True, "Optimal")

        # 1. Create PuLP Maximization Problem
        prob = pulp.LpProblem("PS105_Cyber_Risk_Optimization", pulp.LpMaximize)

        # 2. Decision Variables: x_i in {0, 1}
        x_vars = {}
        for c in controls:
            if hasattr(prob, "add_variable"):
                x_vars[c.control_id] = prob.add_variable(f"x_{c.control_id}", lowBound=0, upBound=1, cat=pulp.LpBinary)
            else:
                x_vars[c.control_id] = pulp.LpVariable(f"x_{c.control_id}", cat=pulp.LpBinary)

        # 3. Objective: Maximize sum_i sum_j (LossBefore_j * E_ij) * x_i
        loss_before_map = {r.risk_id: r.loss_before for r in risk_results if r.risk_id is not None}
        
        obj_terms = []
        for c in controls:
            w_i = sum(
                loss_before_map.get(r_id, 0.0) * eff
                for r_id, eff in c.effectiveness_by_risk.items()
            )
            obj_terms.append(w_i * x_vars[c.control_id])

        prob += pulp.lpSum(obj_terms), "Total_Additive_Risk_Reduction"

        # 4. Budget Constraint: sum_i total_cost_i * x_i <= available_budget
        prob += (
            pulp.lpSum(c.total_cost * x_vars[c.control_id] for c in controls) <= config.available_budget,
            "Budget_Constraint",
        )

        # 5. Mandatory Control Constraints: x_c = 1
        for m_id in config.mandatory_control_ids:
            if m_id in x_vars:
                prob += (x_vars[m_id] == 1, f"Mandatory_Control_{m_id}")
            else:
                # Mandatory control requested does not exist -> Infeasible
                return ([], 0.0, False, "Infeasible_Missing_Mandatory_Control")

        # 6. Dependency Constraints: x_k <= x_m => x_k - x_m <= 0
        for k_id, m_id in config.dependencies:
            if k_id in x_vars and m_id in x_vars:
                prob += (x_vars[k_id] - x_vars[m_id] <= 0, f"Dependency_{k_id}_requires_{m_id}")

        # 7. Solve Problem
        solver = pulp.PULP_CBC_CMD(msg=False)
        prob.solve(solver)

        status_str = pulp.LpStatus[prob.status]

        if prob.status == pulp.LpStatusOptimal:
            selected = [
                c.control_id for c in controls
                if x_vars[c.control_id].varValue is not None and x_vars[c.control_id].varValue >= 0.99
            ]
            obj_val = float(pulp.value(prob.objective) or 0.0)
            
            # Double-check feasibility of selected portfolio (especially budget)
            tot_cost = sum(c.total_cost for c in controls if c.control_id in selected)
            if tot_cost > config.available_budget + 1e-6:
                return ([], 0.0, False, "Infeasible")

            return (selected, obj_val, True, status_str)
        else:
            return ([], 0.0, False, status_str)

    @classmethod
    def run_exhaustive_enumeration(
        cls,
        risk_results: List[RiskQuantificationResult],
        controls: List[ControlOptimizationInput],
        config: OptimizationProblemConfig,
    ) -> Tuple[List[int], float, float, float, int]:
        """
        Evaluates all 2^N combinations explicitly to find the true global optimum
        under exact compounding multiplicative loss reduction.
        
        Returns: (best_control_ids, best_investment, best_loss_after, best_risk_reduction, number_of_portfolios)
        """
        N = len(controls)
        num_portfolios = 2 ** N

        if N == 0:
            total_lb = sum(r.loss_before for r in risk_results)
            return ([], 0.0, float(round(total_lb, 2)), 0.0, 1)

        ctrl_ids = [c.control_id for c in controls]
        ctrl_by_id = {c.control_id: c for c in controls}
        total_lb = sum(r.loss_before for r in risk_results)

        best_selected: List[int] = []
        best_investment = 0.0
        best_loss_after = total_lb
        best_risk_reduction = -1.0

        for comb in itertools.product([0, 1], repeat=N):
            sel_ids = [ctrl_ids[i] for i in range(N) if comb[i] == 1]
            sel_set = set(sel_ids)

            # 1. Budget Feasibility
            cost = sum(ctrl_by_id[c_id].total_cost for c_id in sel_ids)
            if cost > config.available_budget + 1e-6:
                continue

            # 2. Mandatory Controls Feasibility
            if not config.mandatory_control_ids.issubset(sel_set):
                continue

            # 3. Dependency Feasibility: x_k <= x_m
            valid_deps = True
            for k_id, m_id in config.dependencies:
                if k_id in sel_set and m_id not in sel_set:
                    valid_deps = False
                    break
            if not valid_deps:
                continue

            # Calculate exact multiplicative loss after
            l_after = 0.0
            for r in risk_results:
                risk_id = r.risk_id
                factor = 1.0
                for c_id in sel_ids:
                    eff = ctrl_by_id[c_id].effectiveness_by_risk.get(risk_id, 0.0)
                    factor *= (1.0 - eff)
                l_after += r.loss_before * factor

            risk_red = total_lb - l_after

            # Check if superior portfolio found
            if risk_red > best_risk_reduction + 1e-6:
                best_risk_reduction = risk_red
                best_loss_after = l_after
                best_investment = cost
                best_selected = sel_ids
            elif abs(risk_red - best_risk_reduction) <= 1e-6:
                # Tie breaker: choose lower investment
                if cost < best_investment:
                    best_risk_reduction = risk_red
                    best_loss_after = l_after
                    best_investment = cost
                    best_selected = sel_ids

        if best_risk_reduction < 0.0:
            # No feasible portfolio found
            return ([], 0.0, float(round(total_lb, 2)), 0.0, num_portfolios)

        return (
            sorted(best_selected),
            float(round(best_investment, 2)),
            float(round(best_loss_after, 2)),
            float(round(best_risk_reduction, 2)),
            num_portfolios,
        )

    @classmethod
    def optimize_portfolio(
        cls,
        risk_results: List[RiskQuantificationResult],
        controls: List[SecurityControl],
        risk_controls: List[RiskControl],
        config: OptimizationProblemConfig,
    ) -> OptimizationResult:
        """
        Main entry point for portfolio optimization.
        Runs additive MILP solver, performs exact multiplicative post-evaluation,
        and executes exhaustive 2^N global validation.
        """
        # Build ControlOptimizationInput list
        rc_map: Dict[int, Dict[int, float]] = {}
        for rc in risk_controls:
            if rc.control_id not in rc_map:
                rc_map[rc.control_id] = {}
            rc_map[rc.control_id][rc.risk_id] = rc.effectiveness_against_risk

        ctrl_inputs = [
            c if isinstance(c, ControlOptimizationInput) else
            ControlOptimizationInput(
                control_id=c.control_id,
                name=c.name,
                total_cost=float(c.implementation_cost + (c.maintenance_cost or 0.0)),
                effectiveness_by_risk=rc_map.get(c.control_id, {}),
            )
            for c in controls
        ]

        ctrl_name_by_id = {c.control_id: c.name for c in controls}
        expected_loss_before = float(round(sum(r.loss_before for r in risk_results), 2))

        # 1. Solve Additive MILP via PuLP
        milp_selected_ids, milp_obj, feasible, solver_status = cls.solve_additive_milp(
            risk_results, ctrl_inputs, config
        )
        milp_selected_ids = sorted(milp_selected_ids)
        milp_selected_names = [ctrl_name_by_id[c_id] for c_id in milp_selected_ids if c_id in ctrl_name_by_id]

        # 2. Exact Multiplicative Post-Evaluation of MILP-Selected Portfolio
        if feasible and milp_selected_ids:
            tot_inv, exact_loss_after, exact_risk_red = calculate_exact_portfolio_multiplicative_metrics(
                risk_results, ctrl_inputs, milp_selected_ids
            )
        else:
            tot_inv = 0.0
            exact_loss_after = expected_loss_before
            exact_risk_red = 0.0

        remaining_budget = float(round(config.available_budget - tot_inv, 2))

        # 3. Exhaustive Global 2^N Validation
        if config.run_exhaustive_validation:
            exh_ids, exh_inv, exh_loss_after, exh_risk_red, num_enum = cls.run_exhaustive_enumeration(
                risk_results, ctrl_inputs, config
            )
        else:
            exh_ids, exh_inv, exh_loss_after, exh_risk_red, num_enum = (
                milp_selected_ids,
                tot_inv,
                exact_loss_after,
                exact_risk_red,
                2 ** len(controls),
            )

        exh_ids = sorted(exh_ids)
        exh_names = [ctrl_name_by_id[c_id] for c_id in exh_ids if c_id in ctrl_name_by_id]
        tol = 1e-6 * expected_loss_before if expected_loss_before > 0 else 1e-6
        matches = abs(exact_loss_after - exh_loss_after) <= tol

        return OptimizationResult(
            selected_control_ids=milp_selected_ids,
            selected_control_names=milp_selected_names,
            total_investment=tot_inv,
            available_budget=float(round(config.available_budget, 2)),
            remaining_budget=remaining_budget,
            milp_objective_value=float(round(milp_obj, 2)),
            expected_loss_before=expected_loss_before,
            exact_expected_loss_after=exact_loss_after,
            exact_risk_reduction=exact_risk_red,
            feasible=feasible,
            solver_status=solver_status,
            exhaustive_optimal_control_ids=exh_ids,
            exhaustive_optimal_control_names=exh_names,
            exhaustive_optimal_investment=exh_inv,
            exhaustive_optimal_loss_after=exh_loss_after,
            exhaustive_optimal_risk_reduction=exh_risk_red,
            milp_matches_exhaustive_optimum=matches,
            number_of_enumerated_portfolios=num_enum,
        )

    @classmethod
    def optimize_from_db(
        cls,
        db: Any,
        scenario_id: int,
        mandatory_control_ids: Optional[Set[int]] = None,
        dependencies: Optional[List[Tuple[int, int]]] = None,
    ) -> OptimizationResult:
        """
        Helper method to run optimization directly from database scenario state.
        """
        scenario = db.query(Scenario).filter(Scenario.scenario_id == scenario_id).first()
        if not scenario:
            raise ValueError(f"Scenario ID {scenario_id} not found")

        org_id = scenario.organization_id
        asset_ids = [a.asset_id for a in db.query(Asset).filter_by(organization_id=org_id).all()]
        finding_ids = [
            f.finding_id for f in db.query(AssetVulnerabilityFinding)
            .filter(AssetVulnerabilityFinding.asset_id.in_(asset_ids)).all()
        ] if asset_ids else []
        risks = db.query(Risk).filter(
            (Risk.asset_id.in_(asset_ids)) | (Risk.finding_id.in_(finding_ids))
        ).all() if (asset_ids or finding_ids) else []
        p5_results = RiskQuantificationEngine.quantify_all_risks(risks)

        controls = db.query(SecurityControl).all()
        risk_ids = [r.risk_id for r in risks]
        risk_controls = (
            db.query(RiskControl).filter(RiskControl.risk_id.in_(risk_ids)).all()
            if risk_ids else []
        )

        config = OptimizationProblemConfig(
            available_budget=scenario.available_budget,
            mandatory_control_ids=mandatory_control_ids or set(),
            dependencies=dependencies or [],
            run_exhaustive_validation=True,
        )

        return cls.optimize_portfolio(p5_results, controls, risk_controls, config)
