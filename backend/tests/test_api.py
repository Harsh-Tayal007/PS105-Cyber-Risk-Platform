"""
Integration & End-to-End API Router Tests for PS105 REST API (Phase 8).
Uses FastAPI TestClient to test authentication, organization multi-tenant isolation,
CRUD endpoints, risk engines, Monte Carlo simulations, optimization, and PDF generation.

Performance note: fixtures are module-scoped (via conftest.py seeded_db_session) so
the seed (bcrypt hashing + risk engine) only runs once per test session, not per test.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.models.domain import User, Organization, Asset


@pytest.fixture(scope="module")
def client_and_session(seeded_db_session):
    """Module-scoped TestClient backed by the shared seeded in-memory SQLite database.

    The seed (bcrypt password hashing + risk engine + optimization) runs exactly
    once for the entire test_api.py module, keeping the suite fast.
    """
    session, _app = seeded_db_session
    client = TestClient(_app)
    yield client, session


@pytest.fixture(scope="module")
def auth_headers(client_and_session):
    """Module-scoped fixture providing Bearer authorization headers for CISO user."""
    client, session = client_and_session
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "ciso@abcfinancial.com", "password": "password123"},
    )
    assert login_resp.status_code == 200, f"Demo login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# 1 & 2. Auth Registration & Password Not Returned
def test_auth_registration(client_and_session):
    client, session = client_and_session
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "name": "New Analyst",
            "email": "newanalyst@company.com",
            "password": "SecurePassword123!",
            "organization_name": "New Cyber Corp",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newanalyst@company.com"
    assert "password" not in data
    assert "password_hash" not in data


# 3. Login Success
def test_login_success(client_and_session):
    client, session = client_and_session
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Login User",
            "email": "loginuser@company.com",
            "password": "MySecretPassword123!",
        },
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "loginuser@company.com", "password": "MySecretPassword123!"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"


def test_authoritative_demo_login_success_and_invalid_rejection(client_and_session):
    client, session = client_and_session
    # Authoritative demo credentials test -> HTTP 200 with access token
    resp_success = client.post(
        "/api/v1/auth/login",
        json={"email": "ciso@abcfinancial.com", "password": "password123"},
    )
    assert resp_success.status_code == 200
    assert "access_token" in resp_success.json()
    assert resp_success.json()["token_type"] == "bearer"

    # Invalid password test -> HTTP 401
    resp_invalid_pwd = client.post(
        "/api/v1/auth/login",
        json={"email": "ciso@abcfinancial.com", "password": "wrongpassword"},
    )
    assert resp_invalid_pwd.status_code == 401

    # Invalid email test -> HTTP 401
    resp_invalid_email = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@abcfinancial.com", "password": "password123"},
    )
    assert resp_invalid_email.status_code == 401


# 4. Login Failure (Wrong Password)
def test_login_failure(client_and_session):
    client, session = client_and_session
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@company.com", "password": "WrongPassword!"},
    )
    assert resp.status_code == 401


# 5. Protected Endpoint Rejects Unauthenticated Request
def test_protected_endpoint_rejects_unauthenticated(client_and_session):
    client, session = client_and_session
    resp = client.get("/api/v1/organizations/me")
    assert resp.status_code == 401


# 5b. Protected Endpoint Rejects Expired Token
def test_protected_endpoint_rejects_expired_token(client_and_session):
    from datetime import timedelta
    from app.services.auth_service import create_access_token
    client, session = client_and_session
    expired_token = create_access_token(
        data={"sub": "admin@abcfinancial.com"},
        expires_delta=timedelta(seconds=-100)
    )
    resp = client.get("/api/v1/organizations/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401


# 5c. Protected Endpoint Rejects Invalid Signature / Malformed Token
def test_protected_endpoint_rejects_malformed_token(client_and_session):
    client, session = client_and_session
    resp = client.get("/api/v1/organizations/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert resp.status_code == 401



# 6. Organization /me GET
def test_get_organization_me(client_and_session, auth_headers):
    client, session = client_and_session
    resp = client.get("/api/v1/organizations/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "name" in data
    assert data["annual_revenue"] > 0


# 7. Organization Update PUT
def test_update_organization_me(client_and_session, auth_headers):
    client, session = client_and_session
    resp = client.put(
        "/api/v1/organizations/me",
        json={"cybersecurity_budget": 3000000.0, "industry": "Banking & Financial Services"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["cybersecurity_budget"] == 3000000.0
    assert data["industry"] == "Banking & Financial Services"


# 8 & 10. Asset Creation & Listing
def test_asset_creation_and_listing(client_and_session, auth_headers):
    client, session = client_and_session
    # Create asset
    create_resp = client.post(
        "/api/v1/assets",
        json={
            "name": "Trading Server Alpha",
            "asset_type": "Server",
            "business_value": 5000000.0,
            "cpe_vendor": "apache",
            "cpe_product": "http_server",
            "installed_version": "2.4.49",
            "criticality": "HIGH",
            "exposure_level": 0.85,
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    asset_data = create_resp.json()
    assert asset_data["name"] == "Trading Server Alpha"

    # List assets
    list_resp = client.get("/api/v1/assets", headers=auth_headers)
    assert list_resp.status_code == 200
    asset_names = {a["name"] for a in list_resp.json()}
    assert "Trading Server Alpha" in asset_names


# 9 & 19. Asset Organization Isolation & Multi-Tenant Authorization
def test_asset_organization_isolation(client_and_session):
    client, session = client_and_session

    # User 1 from Org 1
    client.post(
        "/api/v1/auth/register",
        json={"name": "User 1", "email": "user1@org1.com", "password": "Password123!", "organization_name": "Org 1"},
    )
    t1 = client.post("/api/v1/auth/login", json={"email": "user1@org1.com", "password": "Password123!"}).json()["access_token"]
    h1 = {"Authorization": f"Bearer {t1}"}

    # User 2 from Org 2
    client.post(
        "/api/v1/auth/register",
        json={"name": "User 2", "email": "user2@org2.com", "password": "Password123!", "organization_name": "Org 2"},
    )
    t2 = client.post("/api/v1/auth/login", json={"email": "user2@org2.com", "password": "Password123!"}).json()["access_token"]
    h2 = {"Authorization": f"Bearer {t2}"}

    # User 1 creates asset in Org 1
    c_resp = client.post("/api/v1/assets", json={"name": "Org1 Secret Server", "asset_type": "Database", "business_value": 1e6}, headers=h1)
    a1_id = c_resp.json()["asset_id"]

    # User 2 lists assets -> MUST NOT see Org 1 asset
    list_resp = client.get("/api/v1/assets", headers=h2)
    user2_assets = list_resp.json()
    assert not any(a["name"] == "Org1 Secret Server" for a in user2_assets)

    # User 2 attempts to delete User 1's asset -> MUST be rejected (404/403)
    del_resp = client.delete(f"/api/v1/assets/{a1_id}", headers=h2)
    assert del_resp.status_code == 404


# 11. Asset Deletion
def test_asset_deletion(client_and_session, auth_headers):
    client, session = client_and_session
    c_resp = client.post(
        "/api/v1/assets",
        json={"name": "Temp Server", "asset_type": "Server", "business_value": 1000.0},
        headers=auth_headers,
    )
    asset_id = c_resp.json()["asset_id"]

    del_resp = client.delete(f"/api/v1/assets/{asset_id}", headers=auth_headers)
    assert del_resp.status_code == 204


# 12. Vulnerability Intelligence Endpoint
def test_vulnerability_intelligence_endpoint(client_and_session, auth_headers):
    client, session = client_and_session
    resp = client.get("/api/v1/vulnerabilities/intelligence", headers=auth_headers)
    assert resp.status_code == 200
    cve_ids = {v["cve_id"] for v in resp.json()}
    assert "CVE-2021-41773" in cve_ids


# 13. Verified Findings Endpoint
def test_verified_findings_endpoint(client_and_session, auth_headers):
    client, session = client_and_session
    resp = client.get("/api/v1/vulnerabilities/findings", headers=auth_headers)
    assert resp.status_code == 200
    findings = resp.json()
    assert len(findings) >= 1
    assert "confidence" in findings[0]
    assert findings[0]["confidence"] == "VERIFIED"


# 14 & 15. Risk Assessment & Calculation Endpoints
def test_risk_assessment_and_calculate_endpoints(client_and_session, auth_headers):
    client, session = client_and_session
    # GET assessment
    resp_assess = client.get("/api/v1/risks/assessment", headers=auth_headers)
    assert resp_assess.status_code == 200
    risks_data = resp_assess.json()
    assert len(risks_data) == 5

    # POST calculate with controls
    resp_calc = client.post(
        "/api/v1/risks/calculate",
        json={"selected_control_ids": [1, 2]},
        headers=auth_headers,
    )
    assert resp_calc.status_code == 200
    calc_data = resp_calc.json()
    assert len(calc_data) == 5
    assert "loss_before" in calc_data[0]
    assert "loss_after" in calc_data[0]


# 16. Monte Carlo Endpoint
def test_monte_carlo_endpoint(client_and_session, auth_headers):
    client, session = client_and_session
    resp = client.post(
        "/api/v1/simulations/run",
        json={"number_of_simulations": 1000, "random_seed": 42},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    mc_data = resp.json()
    assert mc_data["number_of_simulations"] == 1000
    assert "p50" in mc_data
    assert "loss_exceedance_curve" in mc_data


# 17 & 18. Optimization & Scenario Endpoints
def test_optimization_and_scenario_endpoints(client_and_session, auth_headers):
    client, session = client_and_session
    # Create scenario
    scen_resp = client.post(
        "/api/v1/optimization/scenarios",
        json={"name": "FY2026 Test Scenario", "available_budget": 2500000.0},
        headers=auth_headers,
    )
    assert scen_resp.status_code == 201
    scen_id = scen_resp.json()["scenario_id"]

    # Run optimization
    opt_resp = client.post(
        "/api/v1/optimization/run",
        json={"scenario_id": scen_id},
        headers=auth_headers,
    )
    assert opt_resp.status_code == 200
    opt_data = opt_resp.json()
    assert opt_data["feasible"] is True
    assert opt_data["number_of_enumerated_portfolios"] == 256
    assert "exact_risk_reduction" in opt_data


# 20. Invalid Input Handling (400 / 422)
def test_invalid_input_handling(client_and_session, auth_headers):
    client, session = client_and_session
    # Negative budget
    resp = client.post(
        "/api/v1/optimization/run",
        json={"available_budget": -100.0},
        headers=auth_headers,
    )
    assert resp.status_code in {400, 422}


# 21. 404 Behavior
def test_not_found_behavior(client_and_session, auth_headers):
    client, session = client_and_session
    resp = client.delete("/api/v1/assets/99999", headers=auth_headers)
    assert resp.status_code == 404


# 22. Executive PDF Report Endpoint
def test_executive_pdf_report_endpoint(client_and_session, auth_headers):
    client, session = client_and_session
    resp = client.get("/api/v1/reports/executive-pdf", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")


# 23. Health & Root Endpoints Still Work
def test_health_and_root_endpoints(client_and_session):
    client, session = client_and_session
    r_root = client.get("/")
    assert r_root.status_code == 200
    assert r_root.json()["status"] == "operational"

    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"


# 24. Demo Auth Endpoint (One-Click Demo Entry)
def test_demo_auth_endpoint(client_and_session):
    client, session = client_and_session
    resp = client.post("/api/v1/auth/demo")
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


# 25. Asset PUT Update Endpoint
def test_asset_update_put_endpoint(client_and_session, auth_headers):
    client, session = client_and_session
    # Get existing asset
    assets_resp = client.get("/api/v1/assets", headers=auth_headers)
    asset = assets_resp.json()[0]
    asset_id = asset["asset_id"]

    # Update asset
    update_resp = client.put(
        f"/api/v1/assets/{asset_id}",
        json={"name": "Updated Gateway", "business_value": 750000.0, "criticality": "HIGH"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["name"] == "Updated Gateway"
    assert updated["business_value"] == 750000.0
    assert updated["criticality"] == "HIGH"


# 26. Threats Catalog and Risk Creation
def test_threats_list_and_risk_create(client_and_session, auth_headers):
    client, session = client_and_session
    # List threats
    t_resp = client.get("/api/v1/risks/threats", headers=auth_headers)
    assert t_resp.status_code == 200
    threats = t_resp.json()
    assert len(threats) >= 1
    threat_id = threats[0]["threat_id"]

    # Get asset to attach
    assets_resp = client.get("/api/v1/assets", headers=auth_headers)
    asset_id = assets_resp.json()[0]["asset_id"]

    # Create risk
    risk_resp = client.post(
        "/api/v1/risks",
        json={"asset_id": asset_id, "threat_id": threat_id, "likelihood": 4, "impact": 4},
        headers=auth_headers,
    )
    assert risk_resp.status_code == 201
    assert risk_resp.json()["asset_id"] == asset_id
    assert risk_resp.json()["threat_id"] == threat_id


# 27. Organization is_demo Flag and Custom Org Registration
def test_organization_demo_flag_and_custom_registration(client_and_session, auth_headers):
    client, session = client_and_session
    # Demo org should have is_demo = True
    me_resp = client.get("/api/v1/organizations/me", headers=auth_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["is_demo"] is True

    # Register brand new organization with custom details
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Jane Doe",
            "email": "jane@acmecorp.com",
            "password": "Password123!",
            "organization_name": "Acme Aerospace Corp",
            "industry": "Aerospace & Defense",
            "organization_size": "Large Enterprise",
            "annual_revenue": 50000000.0,
            "cybersecurity_budget": 2500000.0,
        },
    )
    assert reg_resp.status_code == 201
    jane_token = client.post(
        "/api/v1/auth/login",
        json={"email": "jane@acmecorp.com", "password": "Password123!"},
    ).json()["access_token"]
    jane_headers = {"Authorization": f"Bearer {jane_token}"}

    jane_org = client.get("/api/v1/organizations/me", headers=jane_headers).json()
    assert jane_org["name"] == "Acme Aerospace Corp"
    assert jane_org["industry"] == "Aerospace & Defense"
    assert jane_org["annual_revenue"] == 50000000.0
    assert jane_org["cybersecurity_budget"] == 2500000.0
    assert jane_org["is_demo"] is False

    # Jane's assets should be empty initially
    jane_assets = client.get("/api/v1/assets", headers=jane_headers).json()
    assert len(jane_assets) == 0

    # Jane's executive PDF should still generate cleanly with empty portfolio
    pdf_resp = client.get("/api/v1/reports/executive-pdf", headers=jane_headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF")

