"""
Central API v1 Router Specification for PS105 (Phase 8).
Aggregates all application route handlers under /api/v1 prefix.
"""

from fastapi import APIRouter

from app.api.routes import (
    auth,
    organizations,
    assets,
    vulnerabilities,
    risks,
    controls,
    simulations,
    optimization,
    reports,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(assets.router, prefix="/assets", tags=["Assets"])
api_router.include_router(vulnerabilities.router, prefix="/vulnerabilities", tags=["Vulnerability Intelligence & Findings"])
api_router.include_router(risks.router, prefix="/risks", tags=["Risk Quantification"])
api_router.include_router(controls.router, prefix="/controls", tags=["Security Controls"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["Monte Carlo Simulations"])
api_router.include_router(optimization.router, prefix="/optimization", tags=["Security Investment Optimization"])
api_router.include_router(reports.router, prefix="/reports", tags=["Executive Reports"])
