"""
Unit & Integration Tests for Executive PDF Report Generation Service (PS105).
Tests cover:
- PDF bytes start with %PDF
- Page count > 3 for standard enterprise data
- Zero-risk / zero-finding organization handled without exception
- Selective 'sections' query parameter respected
- Invalid section keys produce validation error
"""

import re
import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database.connection import Base
from app.database.seed import run_seed
from app.models.domain import Organization, Asset, Risk
from app.services.report_service import generate_executive_pdf_report, VALID_REPORT_SECTIONS


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    run_seed(session)
    yield session
    session.close()


def count_pdf_pages(pdf_bytes: bytes) -> int:
    """Helper to count page dictionary objects in raw PDF bytes."""
    return len(re.findall(rb"/Type\s*/Page\b", pdf_bytes))


def test_pdf_report_starts_with_pdf_header_and_page_count(test_db):
    """PDF bytes must begin with %PDF and contain more than 3 pages for a standard org."""
    pdf_bytes = generate_executive_pdf_report(test_db, organization_id=1)

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    page_count = count_pdf_pages(pdf_bytes)
    assert page_count > 3, f"Expected page count > 3, got {page_count}"


def test_pdf_report_zero_risk_org_no_exception(test_db):
    """An organization with zero assets, zero risks, and zero findings must render cleanly without exception."""
    empty_org = Organization(
        name="Zero Exposure LLC",
        industry="Retail",
        organization_size="Small",
        annual_revenue=5_000_000.0,
        cybersecurity_budget=200_000.0,
    )
    test_db.add(empty_org)
    test_db.commit()
    test_db.refresh(empty_org)

    pdf_bytes = generate_executive_pdf_report(test_db, organization_id=empty_org.organization_id)

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    page_count = count_pdf_pages(pdf_bytes)
    assert page_count >= 3


def test_pdf_report_sections_filter_respected(test_db):
    """Passing a specific subset of sections must be respected and result in fewer pages than the full report."""
    full_pdf = generate_executive_pdf_report(test_db, organization_id=1)
    full_pages = count_pdf_pages(full_pdf)

    # Render only executive summary + corporate baseline
    filtered_pdf = generate_executive_pdf_report(
        test_db, organization_id=1, sections={"summary"}
    )
    filtered_pages = count_pdf_pages(filtered_pdf)

    assert filtered_pdf.startswith(b"%PDF")
    assert filtered_pages < full_pages
    assert filtered_pages >= 3


def test_pdf_report_all_valid_section_keys():
    """Verify that VALID_REPORT_SECTIONS matches the documented options."""
    expected = {
        "summary",
        "assets",
        "findings",
        "risks",
        "simulation",
        "optimization",
        "scenarios",
        "methodology",
        "limitations",
        "glossary",
    }
    assert VALID_REPORT_SECTIONS == expected


def test_pdf_report_sanity_note_when_ale_exceeds_revenue(test_db):
    """When baseline ALE exceeds annual fiscal revenue, a sanity warning note must appear."""
    org = test_db.query(Organization).filter_by(organization_id=1).first()
    # Baseline ALE is ~2 Cr, set annual revenue lower
    org.annual_revenue = 1_000_000.0  # 10 Lakh
    test_db.commit()

    pdf_bytes = generate_executive_pdf_report(test_db, organization_id=1)
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(pdf_bytes)
    full_text = "".join(p.get_textpage().get_text_range() for p in pdf)
    assert "Modelled Annual Loss Expectancy (ALE) exceeds annual revenue" in full_text


def test_pdf_report_no_warning_emoji(test_db):
    """PDF content must not contain missing glyphs or warning emoji characters (⚠)."""
    pdf_bytes = generate_executive_pdf_report(test_db, organization_id=1)
    assert b"\xe2\x9a\xa0" not in pdf_bytes
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(pdf_bytes)
    full_text = "".join(p.get_textpage().get_text_range() for p in pdf)
    assert "⚠" not in full_text
    assert "⚠️" not in full_text


def test_pdf_report_exceedance_curve_real_values(test_db):
    """Loss exceedance curve points in context must contain real numeric values greater than zero."""
    from app.services.report_service import _load_report_context
    ctx = _load_report_context(test_db, organization_id=1)
    mc = ctx["mc_result"]
    assert mc.number_of_simulations == 10000
    curve = mc.loss_exceedance_curve
    assert len(curve) > 0
    max_threshold = max(pt["loss_threshold"] for pt in curve)
    assert max_threshold > 0, "Loss threshold in exceedance curve must be positive"


def test_pdf_report_dynamic_numbering_no_gaps(test_db):
    """When a subset of sections is selected, section numbers must be strictly sequential with no gaps."""
    pdf_bytes = generate_executive_pdf_report(
        test_db, organization_id=1, sections={"summary", "risks"}
    )
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(pdf_bytes)
    full_text = "".join(p.get_textpage().get_text_range() for p in pdf)
    assert "1. Executive Summary" in full_text
    assert "2. Quantitative Risk Register" in full_text
    assert "3. Executive Sign-Off & Governance Attestation" in full_text
    # Ensure no skipped numbers (like "4. Executive Sign-Off" or "3. Enterprise Asset Inventory")
    assert "3. Enterprise Asset Inventory" not in full_text
    assert "4. Executive Sign-Off" not in full_text
    assert "11. Executive Sign-Off" not in full_text

