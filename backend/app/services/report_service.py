"""
Executive PDF Report Generation Service for PS105.

Boardroom-ready consulting-grade executive cyber risk report compiling:
- 0. Cover Page
- 1. Table of Contents (with clickable internal bookmarks & page numbers)
- 2. Executive Summary (6 KPI tiles + narrative + decision box)
- 3. Enterprise Asset Inventory
- 4. Vulnerability Findings & Provenance (CISA KEV / NVD correlation)
- 5. Quantitative Risk Register (SLE × ARO) (5×5 Heatmap & ALE Ranking Bar Chart)
- 6. Monte Carlo Stochastic Loss Simulations (Percentiles & Loss Exceedance Curve)
- 7. Security Investment Optimization & ROSI (Budget utilization bar & MILP audit)
- 8. Scenario Comparison & Efficient Frontier (Trade-off curve)
- 9. Methodology & Mathematical Formulas
- 10. Data Sources, Assumptions & Limitations
- 11. Cyber Risk Glossary
- 12. Executive Sign-Off & Governance Attestation
"""

import io
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Optional, Set, List, Dict, Any, Tuple
from xml.sax.saxutils import escape

from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    Flowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.graphics.shapes import Drawing, Rect, String, Line

from app.models.domain import (
    Organization,
    Asset,
    AssetVulnerabilityFinding,
    Risk,
    SecurityControl,
    RiskControl,
    Scenario,
)
from app.engines.risk_engine import RiskQuantificationEngine
from app.engines.monte_carlo_engine import MonteCarloEngine, MonteCarloConfig, RiskSimulationInput
from app.engines.optimization_engine import (
    OptimizationEngine,
    OptimizationProblemConfig,
    calculate_exact_portfolio_multiplicative_metrics,
    ControlOptimizationInput,
)

logger = logging.getLogger(__name__)

# Valid selectable section keys for API
VALID_REPORT_SECTIONS = {
    "summary",
    "assets",
    "findings",
    "risks",
    "simulation",
    "optimization",
    "scenarios",
    "methodology",
    "limitations",   # now its own key (item 6)
    "glossary",
}

# ----------------------------------------------------------------------------
# Palette Definition
# ----------------------------------------------------------------------------
C_BRAND = colors.HexColor("#1E4D3F")       # Forest green
C_BRAND_SOFT = colors.HexColor("#E3EDE8")  # Soft green highlight
C_PAPER = colors.HexColor("#F5F2EA")      # Callout background
C_SURFACE = colors.HexColor("#FFFFFF")    # Surface white
C_SURFACE_2 = colors.HexColor("#FAF8F3")  # Table alternating row
C_INK = colors.HexColor("#17211C")        # Primary dark ink
C_MUTED = colors.HexColor("#5C6760")      # Muted gray ink
C_LINE = colors.HexColor("#E4DFD2")       # Subtle border line
C_DANGER = colors.HexColor("#A8352A")     # Critical/Danger red
C_DANGER_SOFT = colors.HexColor("#EBC1BB")  # Critical band tint (distinct)
C_WARN = colors.HexColor("#B7791F")       # Warning amber
C_WARN_SOFT = colors.HexColor("#F6ECD6")
C_OK = colors.HexColor("#2F7D4F")         # OK green
C_OK_SOFT = colors.HexColor("#E2F1E8")

# Risk band tints — deliberately distinct for the heatmap and badges
C_BAND_CRITICAL = colors.HexColor("#EBC1BB")  # CRITICAL  score >= 20
C_BAND_HIGH     = colors.HexColor("#F3D3B8")  # HIGH      score 12-19
C_BAND_MEDIUM   = colors.HexColor("#F6ECD6")  # MEDIUM    score  6-11
C_BAND_LOW      = colors.HexColor("#E2F1E8")  # LOW       score  1-5


def _risk_band(score: int):
    """Single source of truth for risk band thresholds and tint colours."""
    if score >= 20:
        return "CRITICAL", C_BAND_CRITICAL
    if score >= 12:
        return "HIGH", C_BAND_HIGH
    if score >= 6:
        return "MEDIUM", C_BAND_MEDIUM
    return "LOW", C_BAND_LOW


# ----------------------------------------------------------------------------
# Typography & Fonts
# ----------------------------------------------------------------------------
_FONT_DIRS = [
    Path(__file__).resolve().parent.parent / "assets" / "fonts",
    Path("C:/Windows/Fonts"),
    Path("/usr/share/fonts/truetype/dejavu"),
    Path("/usr/share/fonts/dejavu"),
    Path("/usr/share/fonts/truetype/noto"),
    Path("/Library/Fonts"),
    Path("/System/Library/Fonts/Supplemental"),
]

_SERIF_CANDIDATES = [
    ("Newsreader-Regular.ttf", "Newsreader-Bold.ttf"),
    ("SourceSerif4-Regular.ttf", "SourceSerif4-Bold.ttf"),
    ("georgia.ttf", "georgiab.ttf"),
    ("times.ttf", "timesbd.ttf"),
]

_SANS_CANDIDATES = [
    ("IBMPlexSans-Regular.ttf", "IBMPlexSans-Bold.ttf"),
    ("DMSans-Regular.ttf", "DMSans-Bold.ttf"),
    ("segoeui.ttf", "segoeuib.ttf"),
    ("DejaVuSans.ttf", "DejaVuSans-Bold.ttf"),
    ("arial.ttf", "arialbd.ttf"),
]


@dataclass(frozen=True)
class ReportFonts:
    serif: str
    serif_bold: str
    sans: str
    sans_bold: str
    unicode_ok: bool

    @property
    def rupee(self) -> str:
        return "₹" if self.unicode_ok else "Rs. "


def _find_font_pair(candidates: list) -> tuple[Optional[Path], Optional[Path]]:
    for reg_name, bold_name in candidates:
        reg_found, bold_found = None, None
        for d in _FONT_DIRS:
            if not d.is_dir():
                continue
            rf = d / reg_name
            bf = d / bold_name
            if not reg_found and rf.is_file():
                reg_found = rf
            if not bold_found and bf.is_file():
                bold_found = bf
        if reg_found and bold_found:
            return reg_found, bold_found
    return None, None


@lru_cache(maxsize=1)
def get_report_fonts() -> ReportFonts:
    """Register ReportSerif and ReportSans, testing glyph support for U+20B9."""
    registered_serif = False
    registered_sans = False

    # Serif
    s_reg, s_bold = _find_font_pair(_SERIF_CANDIDATES)
    if s_reg and s_bold:
        try:
            pdfmetrics.registerFont(TTFont("ReportSerif", str(s_reg)))
            pdfmetrics.registerFont(TTFont("ReportSerif-Bold", str(s_bold)))
            registered_serif = True
        except Exception as e:
            logger.debug(f"Failed to register ReportSerif: {e}")

    # Sans
    sa_reg, sa_bold = _find_font_pair(_SANS_CANDIDATES)
    if sa_reg and sa_bold:
        try:
            pdfmetrics.registerFont(TTFont("ReportSans", str(sa_reg)))
            pdfmetrics.registerFont(TTFont("ReportSans-Bold", str(sa_bold)))
            registered_sans = True
        except Exception as e:
            logger.debug(f"Failed to register ReportSans: {e}")

    serif_name = "ReportSerif" if registered_serif else "Times-Roman"
    serif_bold_name = "ReportSerif-Bold" if registered_serif else "Times-Bold"
    sans_name = "ReportSans" if registered_sans else "Helvetica"
    sans_bold_name = "ReportSans-Bold" if registered_sans else "Helvetica-Bold"

    # Check for Rupee glyph U+20B9 in sans
    unicode_ok = False
    if registered_sans:
        try:
            f = pdfmetrics.getFont("ReportSans")
            if hasattr(f, "face") and hasattr(f.face, "charToGlyph"):
                unicode_ok = 0x20B9 in f.face.charToGlyph
        except Exception:
            unicode_ok = False

    logger.debug(
        f"Chosen fonts: Serif='{serif_name}', Sans='{sans_name}', Unicode_₹={unicode_ok}"
    )

    return ReportFonts(
        serif=serif_name,
        serif_bold=serif_bold_name,
        sans=sans_name,
        sans_bold=sans_bold_name,
        unicode_ok=unicode_ok,
    )


# ----------------------------------------------------------------------------
# Formatting Helpers
# ----------------------------------------------------------------------------
def _esc(text) -> str:
    """Escape user-supplied text for XML Paragraph rendering."""
    return escape(str(text)) if text is not None else ""


def _fit_text(text: str, font: str, size: float, max_width: float) -> str:
    """Truncate with an ellipsis so the text always fits max_width."""
    if stringWidth(text, font, size) <= max_width:
        return text
    while text and stringWidth(text + "...", font, size) > max_width:
        text = text[:-1]
    return text.rstrip() + "..."


def _fmt_curr(amount: Optional[float], fonts: ReportFonts, min_lakh: bool = False) -> str:
    if amount is None or amount == 0:
        return f"{fonts.rupee}0"
    sign = "-" if amount < 0 else ""
    abs_amt = abs(amount)
    if abs_amt >= 10_000_000:
        return f"{sign}{fonts.rupee}{abs_amt / 10_000_000:.2f} Cr"
    if abs_amt >= 100_000 or (min_lakh and abs_amt >= 1_000):
        return f"{sign}{fonts.rupee}{abs_amt / 100_000:.2f} L"
    return f"{sign}{fonts.rupee}{abs_amt:,.0f}"


def sanitize_report_text(text: str, fonts: ReportFonts) -> str:
    """
    Checks non-ASCII characters in report text against the registered font's glyph table.
    Substitutes an ASCII fallback with a logger.warning if missing or problematic.
    """
    if not text:
        return ""
    char_map = {
        "∈": "in",
        "∏": "PROD",
        "∑": "SUM",
        "Σ": "SUM",
        "λ": "lambda",
        "σ": "sigma",
        "μ": "mu",
        "π": "pi",
        "√": "sqrt",
        "−": "-",
        "×": "x",
        "≤": "<=",
        "≥": ">=",
        "≠": "!=",
        "⚠️": "",
        "⚠": "",
        "•": "*",
        "→": "->",
        "…": "...",
    }
    sans_font = None
    try:
        f = pdfmetrics.getFont(fonts.sans)
        if hasattr(f, "face") and hasattr(f.face, "charToGlyph"):
            sans_font = f
    except Exception:
        pass

    out_chars = []
    for ch in text:
        code = ord(ch)
        if code < 128:
            out_chars.append(ch)
        elif ch == "₹" and fonts.unicode_ok:
            out_chars.append(ch)
        elif ch in ("∈", "⚠️", "⚠"):
            fb = char_map.get(ch, "")
            logger.warning("Character %r (U+%04X) replaced with %r for report rendering", ch, code, fb)
            out_chars.append(fb)
        elif sans_font and code in sans_font.face.charToGlyph:
            out_chars.append(ch)
        else:
            fb = char_map.get(ch, "")
            if not fb:
                fb = "?" if code > 127 else ch
            logger.warning("Character %r (U+%04X) missing in font %s; replaced with %r", ch, code, fonts.sans, fb)
            out_chars.append(fb)
    return "".join(out_chars)


# ----------------------------------------------------------------------------
# Flowables & Canvas
# ----------------------------------------------------------------------------
class Bookmark(Flowable):
    """Zero-height flowable that creates a named PDF outline bookmark and anchor."""
    def __init__(self, key: str, title: str, level: int = 0):
        super().__init__()
        self.key = key
        self.title = title
        self.level = level

    def wrap(self, availWidth, availHeight):
        return 0, 0

    def draw(self):
        self.canv.bookmarkPage(self.key)
        self.canv.addOutlineEntry(self.title, self.key, level=self.level, closed=False)


class HeadingWithTOC(Paragraph):
    """Paragraph heading that registers itself for TableOfContents via notify."""
    def __init__(self, text: str, style: ParagraphStyle, key: str, level: int = 0):
        super().__init__(text, style)
        self.toc_entry = (level, text, key)


def make_numbered_canvas(org_name: str, generated_at: str, fonts: ReportFonts):
    class NumberedCanvas(rl_canvas.Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_pages = []

        def showPage(self):
            self._saved_pages.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            total = len(self._saved_pages)
            for state in self._saved_pages:
                self.__dict__.update(state)
                # Only draw running furniture on pages > 1 (skip Cover)
                if self._pageNumber > 1:
                    self._draw_furniture(total)
                super().showPage()
            super().save()

        def _draw_furniture(self, total_pages: int):
            left, right = 54, 558  # 54pt margins on 612pt width
            self.saveState()
            self.setStrokeColor(C_LINE)
            self.setLineWidth(0.5)
            self.line(left, 746, right, 746)
            self.line(left, 42, right, 42)

            # Running Header
            header_title = "PS105 CYBER RISK & INVESTMENT OPTIMIZATION"
            self.setFont(fonts.sans_bold, 7)
            self.setFillColor(C_MUTED)
            self.drawString(left, 752, header_title)
            title_w = stringWidth(header_title, fonts.sans_bold, 7)

            conf = " | STRICTLY CONFIDENTIAL"
            avail = (right - left) - title_w - 20
            name = _fit_text(
                org_name, fonts.sans, 7, max(avail - stringWidth(conf, fonts.sans, 7), 40)
            )
            self.setFont(fonts.sans, 7)
            self.drawRightString(right, 752, f"{name}{conf}")

            # Running Footer
            self.setFillColor(C_MUTED)
            self.drawString(left, 30, f"Generated: {generated_at} UTC | Decision Support System")
            self.drawRightString(right, 30, f"Page {self._pageNumber} of {total_pages}")
            self.restoreState()

    return NumberedCanvas


# ----------------------------------------------------------------------------
# Styles Factory
# ----------------------------------------------------------------------------
def _build_styles(f: ReportFonts) -> dict:
    def ps(name, font, size, leading, color, **kw):
        return ParagraphStyle(
            name, fontName=font, fontSize=size, leading=leading, textColor=color, **kw
        )

    return {
        # Headings
        "title": ps("Title", f.serif_bold, 20, 24, C_INK, spaceAfter=8),
        "subtitle": ps("Subtitle", f.sans, 10, 14, C_MUTED, spaceAfter=14),
        "h1": ps("H1", f.serif_bold, 14, 18, C_INK, spaceBefore=14, spaceAfter=6, keepWithNext=1),
        "h2": ps("H2", f.serif_bold, 11, 14, C_BRAND, spaceBefore=10, spaceAfter=4, keepWithNext=1),
        "h3": ps("H3", f.sans_bold, 9, 12, C_INK, spaceBefore=6, spaceAfter=3, keepWithNext=1),

        # Body
        "body": ps("Body", f.sans, 8.5, 12, C_INK),
        "body_muted": ps("BodyMuted", f.sans, 8, 11, C_MUTED),
        "body_mono": ps("BodyMono", f.sans, 7.5, 10, C_INK),

        # Callouts & Notices
        "callout": ps("Callout", f.sans, 8.5, 12, C_BRAND),
        "warning_callout": ps("WarnCallout", f.sans_bold, 8.5, 12, C_DANGER),
        "decision": ps("Decision", f.serif_bold, 9.5, 13, C_BRAND),

        # Tables
        "th": ps("TH", f.sans_bold, 7.5, 9.5, C_INK, alignment=0),
        "th_r": ps("THR", f.sans_bold, 7.5, 9.5, C_INK, alignment=2),
        "th_c": ps("THC", f.sans_bold, 7.5, 9.5, C_INK, alignment=1),
        "td": ps("TD", f.sans, 7.5, 10, C_INK),
        "td_b": ps("TDB", f.sans_bold, 7.5, 10, C_INK),
        "td_r": ps("TDR", f.sans, 7.5, 10, C_INK, alignment=2),
        "td_c": ps("TDC", f.sans, 7.5, 10, C_INK, alignment=1),
        "td_mono": ps("TDMono", f.sans, 7, 9, C_INK),
        "td_cpe": ps("TDCPE", f.sans, 7, 9, C_INK, wordWrap="CJK"),

        # KPI tiles
        "kpi_val": ps("KPIVal", f.serif_bold, 10.5, 13, C_INK, alignment=1),
        "kpi_lbl": ps("KPILbl", f.sans, 7, 9, C_MUTED, alignment=1),

        # Badges
        "badge_crit": ps("BCrit", f.sans_bold, 7, 8.5, C_DANGER, alignment=1),
        "badge_high": ps("BHigh", f.sans_bold, 7, 8.5, colors.HexColor("#C2410C"), alignment=1),
        "badge_med": ps("BMed", f.sans_bold, 7, 8.5, C_WARN, alignment=1),
        "badge_low": ps("BLow", f.sans_bold, 7, 8.5, C_OK, alignment=1),
    }


def _callout_box(text: str, styles: dict, width: float = 504.0) -> Table:
    """One-sentence plain-English 'What this section tells you' paper-colored callout."""
    p = Paragraph(f"<b>What this section tells you:</b> {text}", styles["callout"])
    t = Table([[p]], colWidths=[width])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), C_PAPER),
            ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    return t


def _sanity_warning_box(text: str, styles: dict, width: float = 504.0) -> Table:
    """Plain sanity check note box — no emoji (item 2/3)."""
    p = Paragraph(f"<b>Sanity Note:</b> {text}", styles["warning_callout"])
    t = Table([[p]], colWidths=[width])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), C_DANGER_SOFT),
            ("BOX", (0, 0), (-1, -1), 1, C_DANGER),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    return t


# ----------------------------------------------------------------------------
# Visual Charts (ReportLab Graphics)
# ----------------------------------------------------------------------------
def _draw_heatmap_5x5(risks_data: list, fonts: ReportFonts) -> Drawing:
    """
    Draw a 5×5 Likelihood × Impact Risk Heatmap.
    Vertical axis (rows): Likelihood L1 (bottom) to L5 (top).
    Horizontal axis (cols): Impact I1 (left) to I5 (right).
    R-13 (L4, I3) sits in row L4 / column I3.
    Cell colors use _risk_band() — same thresholds as the register.
    """
    legend_h = 20
    total_h = 185 + legend_h
    d = Drawing(504, total_h)
    origin_x, origin_y = 70, legend_h + 32
    cell_w, cell_h = 74, 24

    d.add(Rect(0, 0, 504, total_h, fillColor=C_SURFACE_2, strokeColor=C_LINE, strokeWidth=0.5, rx=4, ry=4))
    d.add(String(14, total_h - 17, "5×5 Likelihood × Impact Heatmap", fontName=fonts.serif_bold, fontSize=10, fillColor=C_BRAND))

    cell_risks: Dict[Tuple[int, int], List[str]] = {}
    for r in risks_data:
        k = (r["impact"], r["likelihood"])
        cell_risks.setdefault(k, []).append(f"R-{r['risk_id']}")

    for imp in range(1, 6):
        for lik in range(1, 6):
            score = imp * lik
            _, col = _risk_band(score)

            x = origin_x + (imp - 1) * cell_w
            y = origin_y + (lik - 1) * cell_h
            d.add(Rect(x, y, cell_w, cell_h, fillColor=col, strokeColor=C_LINE, strokeWidth=0.5))

            labels = cell_risks.get((imp, lik), [])
            if labels:
                txt = ", ".join(labels)
                txt = _fit_text(txt, fonts.sans_bold, 6.5, cell_w - 6)
                d.add(String(x + 4, y + 8, txt, fontName=fonts.sans_bold, fontSize=6.5, fillColor=C_INK))
            else:
                d.add(String(x + cell_w / 2 - 3, y + 8, str(score), fontName=fonts.sans, fontSize=7, fillColor=C_MUTED))

    # Axis labels and headers
    d.add(String(origin_x + 105, origin_y - 20, "Impact Severity (I1 Negligible → I5 Catastrophic) →", fontName=fonts.sans_bold, fontSize=7.5, fillColor=C_INK))
    d.add(String(10, origin_y + 55, "Likelihood ↑", fontName=fonts.sans_bold, fontSize=7.5, fillColor=C_INK))

    for i in range(1, 6):
        d.add(String(origin_x + (i - 1) * cell_w + 30, origin_y - 10, f"I{i}", fontName=fonts.sans_bold, fontSize=7, fillColor=C_MUTED))
        d.add(String(origin_x - 18, origin_y + (i - 1) * cell_h + 8, f"L{i}", fontName=fonts.sans_bold, fontSize=7, fillColor=C_MUTED))

    # Heatmap legend row
    band_defs = [
        ("LOW", C_BAND_LOW),
        ("MEDIUM", C_BAND_MEDIUM),
        ("HIGH", C_BAND_HIGH),
        ("CRITICAL", C_BAND_CRITICAL),
    ]
    leg_x = 70
    for label, bcolor in band_defs:
        d.add(Rect(leg_x, 6, 18, 10, fillColor=bcolor, strokeColor=C_LINE, strokeWidth=0.5))
        d.add(String(leg_x + 20, 7, label, fontName=fonts.sans, fontSize=6.5, fillColor=C_INK))
        leg_x += 72

    return d


def _draw_ale_barchart(risks_data: list, fonts: ReportFonts) -> Drawing:
    """Horizontal bar chart showing Annual Loss Expectancy (ALE) per risk without truncated labels."""
    top_risks = sorted(risks_data, key=lambda r: r["ale"], reverse=True)[:5]
    if not top_risks:
        return Drawing(504, 20)

    chart_h = 24 + len(top_risks) * 26
    d = Drawing(504, chart_h)
    d.add(Rect(0, 0, 504, chart_h, fillColor=C_SURFACE_2, strokeColor=C_LINE, strokeWidth=0.5, rx=4, ry=4))
    d.add(String(14, chart_h - 16, "Annual Loss Expectancy (ALE) by Risk Scenario", fontName=fonts.serif_bold, fontSize=9.5, fillColor=C_BRAND))

    max_ale = max(r["ale"] for r in top_risks) or 1.0
    bar_x = 150
    max_bar_w = 260

    y = 12
    for r in reversed(top_risks):
        bar_w = max(4.0, (r["ale"] / max_ale) * max_bar_w)
        threat_str = r["threat_name"]
        lbl = _fit_text(threat_str, fonts.sans, 7, 130)
        d.add(String(14, y + 4, lbl, fontName=fonts.sans, fontSize=7, fillColor=C_INK))
        d.add(Rect(bar_x, y, bar_w, 12, fillColor=C_BRAND, strokeColor=None, rx=2, ry=2))
        amt_str = _fmt_curr(r["ale"], fonts)
        d.add(String(bar_x + bar_w + 6, y + 3, amt_str, fontName=fonts.sans_bold, fontSize=7, fillColor=C_DANGER))
        y += 24

    return d


def _draw_budget_bar(budget: float, allocated: float, fonts: ReportFonts) -> Drawing:
    """Budget utilization visual bar."""
    d = Drawing(504, 38)
    w = 420
    d.add(Rect(0, 8, w, 16, fillColor=C_PAPER, strokeColor=C_LINE, strokeWidth=0.5, rx=4, ry=4))
    util = min(1.0, (allocated / budget)) if budget > 0 else 0.0
    bar_w = max(0.0, util * w)
    if bar_w > 0:
        d.add(Rect(0, 8, bar_w, 16, fillColor=C_BRAND, strokeColor=None, rx=4, ry=4))

    pct = (allocated / budget * 100.0) if budget > 0 else 0.0
    d.add(String(w + 10, 12, f"{pct:.1f}%", fontName=fonts.sans_bold, fontSize=8.5, fillColor=C_INK))
    return d


def _draw_exceedance_curve(curve_points: list, p95_loss: float, fonts: ReportFonts) -> Drawing:
    """Loss Exceedance Curve (P(Loss > x)) with numeric tick labels on both axes."""
    d = Drawing(504, 160)
    origin_x, origin_y = 54, 32
    plot_w, plot_h = 420, 95

    d.add(Rect(0, 0, 504, 160, fillColor=C_SURFACE_2, strokeColor=C_LINE, strokeWidth=0.5, rx=4, ry=4))
    d.add(String(14, 144, "Loss Exceedance Probability Curve (1 - CDF)", fontName=fonts.serif_bold, fontSize=9.5, fillColor=C_BRAND))

    if not curve_points:
        d.add(String(origin_x + 50, origin_y + 40, "No simulation data points available.", fontName=fonts.sans, fontSize=8, fillColor=C_MUTED))
        return d

    max_loss = max(pt.get("loss_threshold", 0.0) for pt in curve_points) or 1.0

    # Probability Y-axis grid & numeric ticks
    for prob in [0.25, 0.50, 0.75, 1.0]:
        gy = origin_y + prob * plot_h
        d.add(Line(origin_x, gy, origin_x + plot_w, gy, strokeColor=C_LINE, strokeWidth=0.5))
        d.add(String(origin_x - 24, gy - 3, f"{int(prob*100)}%", fontName=fonts.sans, fontSize=6.5, fillColor=C_MUTED))

    # Loss X-axis numeric ticks
    for frac in [0.0, 0.25, 0.50, 0.75, 1.0]:
        tick_x = origin_x + frac * plot_w
        d.add(Line(tick_x, origin_y, tick_x, origin_y - 4, strokeColor=C_LINE, strokeWidth=0.5))
        tick_amt = _fmt_curr(frac * max_loss, fonts)
        d.add(String(tick_x - 12, origin_y - 12, tick_amt, fontName=fonts.sans, fontSize=6, fillColor=C_MUTED))

    # Curve points
    prev_x, prev_y = None, None
    for pt in curve_points:
        loss = pt.get("loss_threshold", 0.0)
        prob = pt.get("exceedance_probability", 0.0)
        cx = origin_x + min(plot_w, (loss / max_loss) * plot_w)
        cy = origin_y + min(plot_h, max(0.0, prob * plot_h))
        if prev_x is not None:
            d.add(Line(prev_x, prev_y, cx, cy, strokeColor=C_BRAND, strokeWidth=1.5))
        prev_x, prev_y = cx, cy

    # P95 VaR vertical line & numeric label
    if p95_loss > 0 and max_loss > 0:
        p95_x = origin_x + min(plot_w, (p95_loss / max_loss) * plot_w)
        d.add(Line(p95_x, origin_y, p95_x, origin_y + plot_h, strokeColor=C_DANGER, strokeWidth=1, strokeDashArray=[2, 2]))
        p95_lbl = f"P95 VaR: {_fmt_curr(p95_loss, fonts)}"
        d.add(String(p95_x - 24, origin_y + plot_h - 10, p95_lbl, fontName=fonts.sans_bold, fontSize=6.5, fillColor=C_DANGER))

    d.add(String(origin_x + plot_w / 2 - 40, origin_y - 22, "Simulated Annual Loss →", fontName=fonts.sans, fontSize=7, fillColor=C_MUTED))
    return d


def _draw_frontier_curve(frontier_data: list, fonts: ReportFonts) -> Drawing:
    """Draw spend vs residual loss efficient frontier chart with numeric ticks and S1/S2/S3 scenario labels + legend."""
    legend_rows = min(len(frontier_data), 6)
    legend_h = legend_rows * 12 + 8
    total_h = 160 + legend_h
    d = Drawing(504, total_h)
    origin_x, origin_y = 60, legend_h + 32
    plot_w, plot_h = 410, 95

    d.add(Rect(0, 0, 504, total_h, fillColor=C_SURFACE_2, strokeColor=C_LINE, strokeWidth=0.5, rx=4, ry=4))
    d.add(String(14, total_h - 16, "Security Investment Efficient Frontier (Spend vs Residual Loss)", fontName=fonts.serif_bold, fontSize=9.5, fillColor=C_BRAND))

    if len(frontier_data) < 2:
        d.add(String(origin_x + 30, origin_y + 40, "Single scenario configured; comparison curve requires >= 2 scenarios.", fontName=fonts.sans, fontSize=8, fillColor=C_MUTED))
        return d

    max_spend = max(pt["spend"] for pt in frontier_data) or 1.0
    max_loss = max(pt["residual"] for pt in frontier_data) or 1.0

    d.add(Line(origin_x, origin_y, origin_x + plot_w, origin_y, strokeColor=C_LINE, strokeWidth=0.5))
    d.add(Line(origin_x, origin_y, origin_x, origin_y + plot_h, strokeColor=C_LINE, strokeWidth=0.5))

    # X-axis ticks (Spend)
    for frac in [0.0, 0.50, 1.0]:
        tx = origin_x + frac * plot_w
        d.add(Line(tx, origin_y, tx, origin_y - 3, strokeColor=C_LINE, strokeWidth=0.5))
        d.add(String(tx - 12, origin_y - 12, _fmt_curr(frac * max_spend, fonts), fontName=fonts.sans, fontSize=6, fillColor=C_MUTED))

    # Y-axis ticks (Residual Loss)
    for frac in [0.50, 1.0]:
        ty = origin_y + frac * plot_h
        d.add(Line(origin_x, ty, origin_x - 3, ty, strokeColor=C_LINE, strokeWidth=0.5))
        d.add(String(origin_x - 34, ty - 3, _fmt_curr(frac * max_loss, fonts), fontName=fonts.sans, fontSize=6, fillColor=C_MUTED))

    sorted_pts = sorted(frontier_data, key=lambda p: p["spend"])
    prev_x, prev_y = None, None
    for idx, p in enumerate(sorted_pts):
        cx = origin_x + (p["spend"] / max_spend) * plot_w
        cy = origin_y + (p["residual"] / max_loss) * plot_h
        d.add(Rect(cx - 3, cy - 3, 6, 6, fillColor=C_BRAND, strokeColor=None))

        # Short scenario code label (S1, S2, S3...)
        sc_code = f"S{idx + 1}"
        offset_y = 6 if idx % 2 == 0 else -10
        d.add(String(cx + 4, cy + offset_y, sc_code, fontName=fonts.sans_bold, fontSize=6.5, fillColor=C_INK))

        if prev_x is not None:
            d.add(Line(prev_x, prev_y, cx, cy, strokeColor=C_BRAND, strokeWidth=1.5))
        prev_x, prev_y = cx, cy

    d.add(String(origin_x + plot_w / 2 - 30, origin_y - 22, "Security Spend →", fontName=fonts.sans, fontSize=7, fillColor=C_MUTED))
    d.add(String(10, origin_y + 45, "Loss →", fontName=fonts.sans, fontSize=7, fillColor=C_MUTED))

    # Legend block below chart
    legend_y = legend_h - 4
    for idx, p in enumerate(sorted_pts):
        sc_code = f"S{idx + 1}"
        sc_name = p["name"][:55] + ("…" if len(p["name"]) > 55 else "")
        d.add(String(14, legend_y, f"{sc_code}: {sc_name}", fontName=fonts.sans, fontSize=6.5, fillColor=C_MUTED))
        legend_y -= 12

    return d
    return d


# ----------------------------------------------------------------------------
# Core Report Context Loader
# ----------------------------------------------------------------------------
def _load_report_context(db: Session, organization_id: int) -> dict:
    """Load and compute all analytical and optimization datasets for an organization."""
    org = db.query(Organization).filter_by(organization_id=organization_id).first()
    if not org:
        raise ValueError(f"Organization {organization_id} not found.")

    # Assets
    assets = db.query(Asset).filter_by(organization_id=organization_id).all()
    asset_ids = [a.asset_id for a in assets]

    # Findings
    findings_raw = (
        db.query(AssetVulnerabilityFinding)
        .filter(AssetVulnerabilityFinding.asset_id.in_(asset_ids))
        .all()
    ) if asset_ids else []
    finding_ids = [f.finding_id for f in findings_raw]

    findings = []
    for f in findings_raw:
        v = f.vulnerability
        findings.append({
            "finding_id": f.finding_id,
            "cve_id": v.cve_id if v else "N/A",
            "cvss_score": v.cvss_score if v else 0.0,
            "cisa_kev": bool(v.cisa_kev_listed) if v else False,
            "asset_name": f.asset.name if f.asset else "N/A",
            "matched_cpe": f.matched_cpe or "N/A",
            "installed_version": f.matched_version or "N/A",
            "confidence": f.confidence or "VERIFIED",
            "source_name": "NVD + CISA KEV" if (v and v.cisa_kev_listed) else (f.source_name or "NVD"),
            "retrieved_at": f.retrieved_at.strftime("%Y-%m-%d") if f.retrieved_at else "N/A",
        })

    # Risks (both direct asset links and finding links)
    risks_query = (
        db.query(Risk)
        .filter((Risk.asset_id.in_(asset_ids)) | (Risk.finding_id.in_(finding_ids)))
        .all()
    ) if (asset_ids or finding_ids) else []

    risk_engine = RiskQuantificationEngine()
    q_results = [risk_engine.quantify_risk(r) for r in risks_query]

    risks_data = []
    for r, q in zip(risks_query, q_results):
        target_asset = r.resolved_asset
        threat = r.threat
        score = q.qualitative_score
        rating, _ = _risk_band(score)

        risks_data.append({
            "risk_id": r.risk_id,
            "asset_name": target_asset.name if target_asset else "Unknown Asset",
            "threat_name": threat.name if threat else "Cyber Threat",
            "threat_category": threat.category if threat else "General",
            "likelihood": r.likelihood,
            "impact": r.impact,
            "sle": q.sle,
            "aro": q.aro,
            "ale": q.ale,
            "rating": rating,
        })

    baseline_ale = sum(q.ale for q in q_results)

    # Optimization
    all_controls = db.query(SecurityControl).all()
    budget = float(org.cybersecurity_budget) if org.cybersecurity_budget is not None else 0.0

    r_ids = [r.risk_id for r in risks_query]
    risk_controls = db.query(RiskControl).filter(RiskControl.risk_id.in_(r_ids)).all() if r_ids else []

    opt_engine = OptimizationEngine()
    opt_config = OptimizationProblemConfig(available_budget=budget)
    opt_result = opt_engine.optimize_portfolio(q_results, all_controls, risk_controls, opt_config)

    # Monte Carlo simulation
    mc_engine = MonteCarloEngine()
    mc_inputs = [
        RiskSimulationInput(
            risk_id=q.risk_id,
            expected_frequency=q.aro,
            expected_severity=q.sle,
        )
        for q in q_results
    ]
    mc_config = MonteCarloConfig(number_of_simulations=10000, random_seed=42)
    mc_result = mc_engine.run_simulation(mc_inputs, mc_config)

    # Scenarios for efficient frontier
    scenarios_db = db.query(Scenario).filter_by(organization_id=organization_id).all()
    scenario_comparisons = []
    for s in scenarios_db:
        s_config = OptimizationProblemConfig(available_budget=s.available_budget)
        s_res = opt_engine.optimize_portfolio(q_results, all_controls, risk_controls, s_config)
        s_spend = s_res.total_investment
        s_red = (s_res.exact_risk_reduction / baseline_ale * 100.0) if baseline_ale > 0 else 0.0
        s_residual = max(0.0, baseline_ale - s_res.exact_risk_reduction)
        scenario_comparisons.append({
            "name": s.name,
            "budget": s.available_budget,
            "spend": s_spend,
            "reduction_pct": s_red,
            "residual": s_residual,
        })

    return {
        "org": org,
        "assets": assets,
        "findings": findings,
        "risks": risks_data,
        "baseline_ale": baseline_ale,
        "budget": budget,
        "opt_result": opt_result,
        "all_controls": all_controls,
        "mc_result": mc_result,
        "scenarios": scenario_comparisons,
        "q_results": q_results,
        "risk_controls": risk_controls,
    }


# ----------------------------------------------------------------------------
# Report Assembly
# ----------------------------------------------------------------------------
def generate_executive_pdf_report(
    db: Session, organization_id: int, sections: Optional[Set[str]] = None
) -> bytes:
    """
    Generates a vectorized executive ReportLab PDF report for an organization.
    Supports selective section inclusion via the `sections` parameter.
    """
    ctx = _load_report_context(db, organization_id)
    org: Organization = ctx["org"]
    fonts = get_report_fonts()
    styles = _build_styles(fonts)

    now_utc = datetime.now(timezone.utc)
    date_str = now_utc.strftime("%B %d, %Y")
    now_str = now_utc.strftime("%Y-%m-%d %H:%M:%S")
    ref_id = f"PS105-{org.organization_id}-{now_utc.strftime('%Y%m%d')}"

    # Determine which sections to render
    sec_filter = sections if sections is not None else VALID_REPORT_SECTIONS

    doc_buf = io.BytesIO()
    doc = SimpleDocTemplate(
        doc_buf,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    story: List[Any] = []
    W = 504.0  # Printable width (612 - 108)

    sec_no_box = [0]

    def _snum(title: str) -> str:
        sec_no_box[0] += 1
        return f"{sec_no_box[0]}. {title}"

    # ------------------------------------------------------------------------
    # SECTION 0: COVER PAGE
    # ------------------------------------------------------------------------
    cover_header = [
        Paragraph("CYBER RISK QUANTIFICATION &amp; CAPITAL OPTIMIZATION", styles["subtitle"]),
        Paragraph("Executive Cyber Risk Report &amp; Investment Plan", styles["title"]),
        Spacer(1, 10),
        HRFlowable(width="100%", thickness=2, color=C_BRAND, spaceAfter=20),
    ]
    story.append(KeepTogether(cover_header))

    meta_table_data = [
        [Paragraph("<b>Target Organization:</b>", styles["td_b"]), Paragraph(_esc(org.name), styles["td"])],
        [Paragraph("<b>Industry Classification:</b>", styles["td_b"]), Paragraph(_esc(org.industry or "General Financial Services"), styles["td"])],
        [Paragraph("<b>Enterprise Size:</b>", styles["td_b"]), Paragraph(_esc(org.organization_size or "Enterprise (> 1,000 FTE)"), styles["td"])],
        [Paragraph("<b>Annual Fiscal Revenue:</b>", styles["td_b"]), Paragraph(_fmt_curr(org.annual_revenue, fonts), styles["td"])],
        [Paragraph("<b>Cybersecurity Budget:</b>", styles["td_b"]), Paragraph(_fmt_curr(org.cybersecurity_budget, fonts), styles["td"])],
        [Paragraph("<b>Report Reference ID:</b>", styles["td_b"]), Paragraph(ref_id, styles["td_mono"])],
        [Paragraph("<b>Date of Evaluation:</b>", styles["td_b"]), Paragraph(f"{date_str} UTC", styles["td"])],
        [Paragraph("<b>Governance Framework:</b>", styles["td_b"]), Paragraph("FAIR-inspired Quantitative Risk (SLE × ARO) &amp; Mathematical Knapsack Optimization", styles["td"])],
    ]
    meta_table = Table(meta_table_data, colWidths=[150, 354])
    meta_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 30))

    if "abc financial services" in org.name.lower():
        demo_callout = Paragraph(
            "<b>Demonstration Dataset Notice:</b> This executive report contains synthetic enterprise telemetry "
            "and simulated vulnerability assessments generated for ABC Financial Services.",
            styles["callout"],
        )
        demo_box = Table([[demo_callout]], colWidths=[W])
        demo_box.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), C_PAPER),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("PADDING", (0, 0), (-1, -1), 8),
            ])
        )
        story.append(demo_box)
        story.append(Spacer(1, 16))

    conf_box = Paragraph(
        "<b>CONFIDENTIALITY NOTICE:</b> The information contained in this document is strictly privileged, "
        "confidential, and intended exclusively for the Board of Directors, Chief Executive Officer, "
        "and designated executive leadership of the evaluated enterprise.",
        styles["body_muted"],
    )
    story.append(conf_box)
    story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 1: TABLE OF CONTENTS (INTERACTIVE MULTIBUILD)
    # ------------------------------------------------------------------------
    story.append(Bookmark("sec_toc", "Table of Contents"))
    story.append(Paragraph("Table of Contents", styles["h1"]))
    story.append(Spacer(1, 8))

    toc = TableOfContents()
    toc.dotsMinLevel = 0
    toc.levelStyles = [
        ParagraphStyle(
            "TOC0",
            fontName=fonts.sans,
            fontSize=8.5,
            leading=16,
            textColor=C_INK,
        ),
    ]
    story.append(toc)
    story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 2: EXECUTIVE SUMMARY
    # ------------------------------------------------------------------------
    if "summary" in sec_filter:
        h_summary = _snum("Executive Summary")
        story.append(Bookmark("sec_summary", h_summary))
        story.append(HeadingWithTOC(h_summary, styles["h1"], "sec_summary"))
        story.append(_callout_box("A board-level synthesis of total annual financial exposure, solver-recommended mitigation, and capital return.", styles, W))
        story.append(Spacer(1, 10))

        # 6 KPI Tiles
        b_ale = ctx["baseline_ale"]
        opt = ctx["opt_result"]
        loss_reduction = opt.exact_risk_reduction
        red_pct = (loss_reduction / b_ale * 100.0) if b_ale > 0 else 0.0
        res_ale = max(0.0, b_ale - loss_reduction)
        spend = opt.total_investment
        budget = ctx["budget"]
        p95 = ctx["mc_result"].p95

        net_rosi = ((loss_reduction - spend) / spend) if spend > 0 else 0.0
        if net_rosi > 10.0:
            rosi_str = f"{net_rosi:.0f}×"
        else:
            rosi_str = f"{net_rosi * 100.0:.1f}%"

        spend_cell = f"{_fmt_curr(spend, fonts)}<br/><font size=\"6\" color=\"#5C6760\">of {_fmt_curr(budget, fonts)} budget</font>"

        kpi_table_data = [
            [
                Paragraph(_fmt_curr(b_ale, fonts), styles["kpi_val"]),
                Paragraph(_fmt_curr(res_ale, fonts), styles["kpi_val"]),
                Paragraph(f"{red_pct:.1f}%", styles["kpi_val"]),
                Paragraph(spend_cell, styles["kpi_val"]),
                Paragraph(rosi_str, styles["kpi_val"]),
                Paragraph(_fmt_curr(p95, fonts), styles["kpi_val"]),
            ],
            [
                Paragraph("Baseline Loss (ALE)", styles["kpi_lbl"]),
                Paragraph("Residual Loss", styles["kpi_lbl"]),
                Paragraph("Risk Reduction", styles["kpi_lbl"]),
                Paragraph("Security Spend", styles["kpi_lbl"]),
                Paragraph("Net return", styles["kpi_lbl"]),
                Paragraph("P95 VaR", styles["kpi_lbl"]),
            ]
        ]
        kpi_table = Table(kpi_table_data, colWidths=[84] * 6)
        kpi_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
                ("TOPPADDING", (0, 1), (-1, 1), 2),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ])
        )
        story.append(kpi_table)
        story.append(Spacer(1, 10))

        # Budget Warning
        if budget == 0.0:
            story.append(_sanity_warning_box("No cybersecurity budget configured (budget = 0). Optimization will be unconstrained or no controls selected.", styles, W))
            story.append(Spacer(1, 6))

        # Sanity Check Notes (plain notes, no emoji)
        total_asset_val = sum(a.business_value for a in ctx["assets"])
        if org.annual_revenue and org.annual_revenue > 0:
            if b_ale > org.annual_revenue:
                story.append(_sanity_warning_box("Modelled Annual Loss Expectancy (ALE) exceeds annual revenue; review asset values and exposure factors.", styles, W))
                story.append(Spacer(1, 6))
            if total_asset_val > org.annual_revenue:
                story.append(_sanity_warning_box("Total evaluated asset inventory value exceeds annual revenue; verify asset replacement vs operational economic valuation.", styles, W))
                story.append(Spacer(1, 6))
            if p95 > 0.25 * org.annual_revenue:
                story.append(_sanity_warning_box("Monte Carlo P95 Value-at-Risk exceeds 25% of annual revenue; indicates severe tail-risk exposure.", styles, W))
                story.append(Spacer(1, 6))

        # Narrative bullets
        top_risk = max(ctx["risks"], key=lambda r: r["ale"], default=None)
        kev_count = sum(1 for f in ctx["findings"] if f["cisa_kev"])
        unallocated = max(0.0, budget - spend)
        solver_match = opt.milp_matches_exhaustive_optimum

        b1 = f"• <b>Primary Enterprise Exposure:</b> The highest quantified risk is <b>{_esc(top_risk['threat_name'])}</b> against <b>{_esc(top_risk['asset_name'])}</b>, driving an annualized loss expectation of <b>{_fmt_curr(top_risk['ale'], fonts)}</b>." if top_risk else "• No active enterprise risks currently exceed the baseline threshold."
        b2 = f"• <b>CISA KEV Exploitability:</b> Correlation with the federal catalog identified <b>{kev_count} verified vulnerabilities</b> with confirmed weaponized exploitation in the wild."
        b3 = f"• <b>Capital Preservation:</b> The solver-recommended portfolio consumes <b>{_fmt_curr(spend, fonts)}</b>, leaving <b>{_fmt_curr(unallocated, fonts)}</b> unallocated."
        b4 = f"• <b>Mathematical Optimization Audit:</b> Mixed-Integer Linear Programming (MILP) {'<b>perfectly matched the global exhaustive optimum</b>' if solver_match else 'achieved an efficient near-optimal state'} across all security control permutations."
        b5 = f"• <b>Tail-Risk Protection:</b> Monte Carlo stochastic modeling indicates an extreme 95th percentile annual loss of <b>{_fmt_curr(p95, fonts)}</b> in worst-case confluence years."

        story.append(Paragraph(b1, styles["body"]))
        story.append(Spacer(1, 4))
        story.append(Paragraph(b2, styles["body"]))
        story.append(Spacer(1, 4))
        story.append(Paragraph(b3, styles["body"]))
        story.append(Spacer(1, 4))
        story.append(Paragraph(b4, styles["body"]))
        story.append(Spacer(1, 4))
        story.append(Paragraph(b5, styles["body"]))
        story.append(Spacer(1, 10))

        # Decision Requested Box
        sel_ctrl_names = ", ".join(opt.selected_control_names) or "None"
        decision_html = (
            f"<b>DECISION REQUESTED:</b> Executive approval of the recommended defensive portfolio "
            f"({_esc(sel_ctrl_names)}) for a total capital allocation of <b>{_fmt_curr(spend, fonts)}</b> "
            f"to reduce enterprise cyber loss exposure by <b>{red_pct:.1f}%</b>."
        )
        decision_box = Table([[Paragraph(decision_html, styles["decision"])]], colWidths=[W])
        decision_box.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), C_BRAND_SOFT),
                ("BOX", (0, 0), (-1, -1), 1, C_BRAND),
                ("PADDING", (0, 0), (-1, -1), 8),
            ])
        )
        story.append(decision_box)
        story.append(Spacer(1, 10))

        # Corporate baseline
        story.append(Paragraph("Corporate Profile &amp; Financial Baseline", styles["h2"]))
        base_data = [
            [Paragraph("Organization Name", styles["td_b"]), Paragraph(_esc(org.name), styles["td"]), Paragraph("Industry", styles["td_b"]), Paragraph(_esc(org.industry or "Financial"), styles["td"])],
            [Paragraph("Annual Revenue", styles["td_b"]), Paragraph(_fmt_curr(org.annual_revenue, fonts), styles["td"]), Paragraph("Security Budget", styles["td_b"]), Paragraph(_fmt_curr(org.cybersecurity_budget, fonts), styles["td"])],
            [Paragraph("Monitored Assets", styles["td_b"]), Paragraph(str(len(ctx["assets"])), styles["td"]), Paragraph("Verified Findings", styles["td_b"]), Paragraph(str(len(ctx["findings"])), styles["td"])],
            [Paragraph("Active Risk Scenarios", styles["td_b"]), Paragraph(str(len(ctx["risks"])), styles["td"]), Paragraph("Baseline ALE", styles["td_b"]), Paragraph(_fmt_curr(b_ale, fonts), styles["td_b"])],
        ]
        base_t = Table(base_data, colWidths=[120, 132, 120, 132])
        base_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(base_t)
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 3: ASSET INVENTORY
    # ------------------------------------------------------------------------
    if "assets" in sec_filter:
        h_assets = _snum("Enterprise Asset Inventory")
        story.append(Bookmark("sec_assets", h_assets))
        story.append(HeadingWithTOC(h_assets, styles["h1"], "sec_assets"))
        story.append(_callout_box("Monitored hardware, software, and data infrastructure mapped to operational criticality.", styles, W))
        story.append(Spacer(1, 10))

        asset_headers = ["Asset Name", "Category / Type", "Business Value", "Criticality", "Software Vendor:Product", "Installed Version"]
        asset_rows = [[Paragraph(f"<b>{h}</b>", styles["th_c" if idx == 3 else "th_r" if idx == 2 else "th"]) for idx, h in enumerate(asset_headers)]]

        for a in ctx["assets"]:
            crit = (a.criticality or "MEDIUM").upper()
            crit_style = styles["badge_crit"] if crit == "CRITICAL" else styles["badge_high"] if crit == "HIGH" else styles["badge_med"] if crit == "MEDIUM" else styles["badge_low"]

            prod_str = f"{a.cpe_vendor or 'generic'}:{a.cpe_product or 'system'}"
            ver_p = Paragraph(_esc(a.installed_version), styles["td_mono"]) if a.installed_version else Paragraph("<font color=\"#B7791F\">Missing*</font>", styles["td_b"])

            asset_rows.append([
                Paragraph(_esc(a.name), styles["td_b"]),
                Paragraph(_esc(a.asset_type or "Infrastructure"), styles["td"]),
                Paragraph(_fmt_curr(a.business_value, fonts), styles["td_r"]),
                Paragraph(crit, crit_style),
                Paragraph(prod_str, styles["td_mono"]),
                ver_p,
            ])

        asset_t = Table(asset_rows, colWidths=[110, 84, 80, 60, 110, 60], repeatRows=1)
        asset_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(asset_t)
        story.append(Spacer(1, 4))
        story.append(Paragraph("<font color=\"#5C6760\">* Footnote: Inventory records are entered manually. Assets missing explicit version records cannot be deterministically matched to NVD/CVE ranges; no active scanning is performed.</font>", styles["body_muted"]))
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 4: VULNERABILITY FINDINGS AND PROVENANCE
    # ------------------------------------------------------------------------
    if "findings" in sec_filter:
        h_findings = _snum("Vulnerability Findings &amp; Provenance")
        story.append(Bookmark("sec_findings", h_findings.replace("&amp;", "&")))
        story.append(HeadingWithTOC(h_findings, styles["h1"], "sec_findings"))
        story.append(_callout_box("Verified CVE exposures with correlated CVSS severity, CISA KEV exploitation tags, and matched CPE criteria.", styles, W))
        story.append(Spacer(1, 10))

        find_headers = ["CVE ID", "CVSS", "CISA KEV", "Target Asset", "Matched CPE", "Version", "Source", "Date"]
        find_rows = [[Paragraph(f"<b>{h}</b>", styles["th_c" if idx in (1, 2) else "th"]) for idx, h in enumerate(find_headers)]]

        for f in ctx["findings"]:
            score = f["cvss_score"]
            sev = "CRITICAL" if score >= 9.0 else "HIGH" if score >= 7.0 else "MEDIUM" if score >= 4.0 else "LOW"
            s_style = styles["badge_crit"] if sev == "CRITICAL" else styles["badge_high"] if sev == "HIGH" else styles["badge_med"]

            kev_p = Paragraph("<font color=\"#A8352A\"><b>YES</b></font>", styles["td_c"]) if f["cisa_kev"] else Paragraph("No", styles["td_c"])

            find_rows.append([
                Paragraph(f["cve_id"], styles["td_b"]),
                Paragraph(f"{score:.1f} ({sev[:4]})", s_style),
                kev_p,
                Paragraph(_esc(f["asset_name"]), styles["td"]),
                Paragraph(_esc(f["matched_cpe"]), styles["td_cpe"]),
                Paragraph(_esc(f["installed_version"]), styles["td_mono"]),
                Paragraph(_esc(f["source_name"]), styles["td"]),
                Paragraph(_esc(f["retrieved_at"]), styles["td"]),
            ])

        find_t = Table(find_rows, colWidths=[80, 52, 44, 82, 103, 44, 45, 54], repeatRows=1)
        find_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(find_t)
        story.append(Spacer(1, 4))
        story.append(Paragraph("<font color=\"#5C6760\">Note: The Matched CPE column indicates the vulnerable software criteria from NVD; the Installed Version column reflects the actual version recorded on the target asset.</font>", styles["body_muted"]))
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 5: QUANTITATIVE RISK REGISTER (SLE × ARO)
    # ------------------------------------------------------------------------
    if "risks" in sec_filter:
        h_risks = _snum("Quantitative Risk Register (SLE × ARO)")
        story.append(Bookmark("sec_risks", h_risks))
        story.append(HeadingWithTOC(h_risks, styles["h1"], "sec_risks"))
        story.append(_callout_box("Deterministic financial loss modeling calculating Single Loss Expectancy (SLE) and Annualized Loss Expectancy (ALE).", styles, W))
        story.append(Spacer(1, 10))

        risk_headers = ["ID", "Target Asset", "Threat Scenario", "L", "I", "SLE", "ARO", "Baseline ALE", "Severity"]
        risk_rows = [[Paragraph(f"<b>{h}</b>", styles["th_r" if idx in (5, 6, 7) else "th_c" if idx in (0, 3, 4, 8) else "th"]) for idx, h in enumerate(risk_headers)]]

        # Sort the risk register by ALE descending
        sorted_risks = sorted(ctx["risks"], key=lambda r: r["ale"], reverse=True)

        for r in sorted_risks:
            sev = r["rating"]
            s_style = styles["badge_crit"] if sev == "CRITICAL" else styles["badge_high"] if sev == "HIGH" else styles["badge_med"] if sev == "MEDIUM" else styles["badge_low"]

            risk_rows.append([
                Paragraph(f"R-{r['risk_id']}", styles["td_mono"]),
                Paragraph(_esc(r["asset_name"]), styles["td_b"]),
                Paragraph(_esc(r["threat_name"]), styles["td"]),
                Paragraph(str(r["likelihood"]), styles["td_c"]),
                Paragraph(str(r["impact"]), styles["td_c"]),
                Paragraph(_fmt_curr(r["sle"], fonts), styles["td_r"]),
                Paragraph(f"{r['aro']:.4f}", styles["td_r"]),
                Paragraph(_fmt_curr(r["ale"], fonts), styles["td_r"]),
                Paragraph(sev, s_style),
            ])

        # Total row
        risk_rows.append([
            Paragraph("<b>TOTAL BASELINE ALE</b>", styles["td_b"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph(f"<b>{_fmt_curr(ctx['baseline_ale'], fonts)}</b>", styles["td_r"]),
            Paragraph("", styles["td"]),
        ])

        risk_t = Table(risk_rows, colWidths=[32, 86, 98, 20, 20, 58, 44, 66, 80], repeatRows=1)
        risk_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("SPAN", (0, -1), (6, -1)),
                ("BACKGROUND", (0, -1), (-1, -1), C_PAPER),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(risk_t)
        story.append(Spacer(1, 10))

        story.append(Paragraph("Risk Heatmap &amp; Relative Magnitude Distribution", styles["h2"]))
        story.append(_draw_heatmap_5x5(ctx["risks"], fonts))
        story.append(Spacer(1, 8))
        story.append(_draw_ale_barchart(ctx["risks"], fonts))
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 6: MONTE CARLO SIMULATION
    # ------------------------------------------------------------------------
    if "simulation" in sec_filter:
        h_sim = _snum("Monte Carlo Stochastic Loss Simulations")
        story.append(Bookmark("sec_simulation", h_sim))
        story.append(HeadingWithTOC(h_sim, styles["h1"], "sec_simulation"))

        mc = ctx["mc_result"]
        sim_count_str = f"{mc.number_of_simulations:,}"
        story.append(_callout_box(f"Uncertainty modeling evaluating Poisson arrival frequencies and LogNormal severity across {sim_count_str} iterations.", styles, W))
        story.append(Spacer(1, 10))

        sim_data = [
            [Paragraph("<b>Simulation Parameter</b>", styles["th"]), Paragraph("<b>Value</b>", styles["th"]), Paragraph("<b>Loss Percentile</b>", styles["th"]), Paragraph("<b>Value-at-Risk (VaR)</b>", styles["th_r"])],
            [Paragraph("Iterations Count", styles["td"]), Paragraph(sim_count_str, styles["td"]), Paragraph("P10 (Optimistic Year)", styles["td"]), Paragraph(_fmt_curr(mc.p10, fonts), styles["td_r"])],
            [Paragraph("Random Seed", styles["td"]), Paragraph(str(mc.random_seed or "None"), styles["td"]), Paragraph("P50 (Median Year)", styles["td"]), Paragraph(_fmt_curr(mc.p50, fonts), styles["td_r"])],
            [Paragraph("Severity Model", styles["td"]), Paragraph("LogNormal (E[X] = SLE, σ = 0.5 assumed)", styles["td"]), Paragraph("P90 (Adverse Year)", styles["td"]), Paragraph(_fmt_curr(mc.p90, fonts), styles["td_r"])],
            [Paragraph("Frequency Model", styles["td"]), Paragraph("Poisson (λ = ARO)", styles["td"]), Paragraph("P95 (Tail Risk / VaR)", styles["td_b"]), Paragraph(_fmt_curr(mc.p95, fonts), styles["td_r"])],
            [Paragraph("Mean Simulated Loss", styles["td_b"]), Paragraph(_fmt_curr(mc.mean_loss, fonts), styles["td_b"]), Paragraph("Maximum Observed Loss", styles["td_b"]), Paragraph(_fmt_curr(mc.max_loss, fonts), styles["td_r"])],
        ]
        sim_t = Table(sim_data, colWidths=[130, 122, 122, 130])
        sim_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(sim_t)
        story.append(Spacer(1, 10))

        story.append(_draw_exceedance_curve(mc.loss_exceedance_curve, mc.p95, fonts))
        story.append(Spacer(1, 6))

        takeaway = (
            f"<b>Stochastic Takeaway:</b> There is a 5% statistical probability that annual cyber losses "
            f"will exceed <b>{_fmt_curr(mc.p95, fonts)}</b> in any single calendar year, "
            f"with an overall probability of any loss event occurring of <b>{mc.probability_of_any_loss*100:.1f}%</b>."
        )
        story.append(Paragraph(takeaway, styles["body"]))
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 7: OPTIMIZATION AND ROSI
    # ------------------------------------------------------------------------
    if "optimization" in sec_filter:
        h_opt = _snum("Security Investment Optimization &amp; ROSI")
        story.append(Bookmark("sec_optimization", h_opt.replace("&amp;", "&")))
        story.append(HeadingWithTOC(h_opt, styles["h1"], "sec_optimization"))
        story.append(_callout_box("Mathematical portfolio optimization solving for maximal loss reduction subject to fiscal budget constraints.", styles, W))
        story.append(Spacer(1, 10))

        opt = ctx["opt_result"]
        spend = opt.total_investment
        budget = ctx["budget"]
        loss_reduction = opt.exact_risk_reduction
        red_pct = (loss_reduction / ctx["baseline_ale"] * 100.0) if ctx["baseline_ale"] > 0 else 0.0
        net_rosi = ((loss_reduction - spend) / spend) if spend > 0 else 0.0
        rosi_str = f"{net_rosi:.0f}×" if net_rosi > 10.0 else f"{net_rosi * 100.0:.1f}%"
        avoided_per_rupee = (loss_reduction / spend) if spend > 0 else 0.0

        story.append(Paragraph("<b>Capital Budget Utilization:</b>", styles["h3"]))
        story.append(_draw_budget_bar(budget, spend, fonts))
        story.append(Spacer(1, 10))

        # Look up control objects for recommended controls
        sel_ctrl_ids = set(opt.selected_control_ids)
        rec_ctrls = [c for c in ctx["all_controls"] if c.control_id in sel_ctrl_ids]

        rc_map: Dict[int, Dict[int, float]] = {}
        for rc in ctx["risk_controls"]:
            eff = getattr(rc, "effectiveness_against_risk", getattr(rc, "effectiveness", 0.0))
            rc_map.setdefault(rc.control_id, {})[rc.risk_id] = float(eff)

        ctrl_inputs = [
            ControlOptimizationInput(
                control_id=c.control_id,
                name=c.name,
                total_cost=float(c.implementation_cost + (c.maintenance_cost or 0.0)),
                effectiveness_by_risk=rc_map.get(c.control_id, {}),
            )
            for c in ctx["all_controls"]
        ]

        marginal_red_by_id: Dict[int, float] = {}
        for c in rec_ctrls:
            subset_ids = [cid for cid in opt.selected_control_ids if cid != c.control_id]
            _, loss_without_c, _ = calculate_exact_portfolio_multiplicative_metrics(
                ctx["q_results"], ctrl_inputs, subset_ids
            )
            marginal_red = max(0.0, loss_without_c - opt.exact_expected_loss_after)
            marginal_red_by_id[c.control_id] = marginal_red

        sum_marginal = sum(marginal_red_by_id.values())

        ctrl_headers = [
            "Control Name",
            "NIST Function",
            "Implementation",
            "Annual Maint.",
            "Total Cost",
            "Risk Reduction",
            "Share of Total",
            "Status",
        ]
        ctrl_rows = [
            [
                Paragraph(f"<b>{h}</b>", styles["th_r" if idx in (2, 3, 4, 5, 6) else "th_c" if idx == 7 else "th"])
                for idx, h in enumerate(ctrl_headers)
            ]
        ]

        for c in rec_ctrls:
            tot = c.implementation_cost + (c.maintenance_cost or 0.0)
            m_red = marginal_red_by_id.get(c.control_id, 0.0)
            share_pct = (m_red / sum_marginal * 100.0) if sum_marginal > 0 else 0.0

            ctrl_rows.append([
                Paragraph(_esc(c.name), styles["td_b"]),
                Paragraph(_esc(c.nist_function or "PROTECT"), styles["td"]),
                Paragraph(_fmt_curr(c.implementation_cost, fonts, min_lakh=True), styles["td_r"]),
                Paragraph(_fmt_curr(c.maintenance_cost or 0.0, fonts, min_lakh=True), styles["td_r"]),
                Paragraph(_fmt_curr(tot, fonts, min_lakh=True), styles["td_r"]),
                Paragraph(_fmt_curr(m_red, fonts), styles["td_r"]),
                Paragraph(f"{share_pct:.1f}%", styles["td_r"]),
                Paragraph("<font color=\"#2F7D4F\"><b>SELECTED</b></font>", styles["td_c"]),
            ])

        total_summary_text = f"<b>Total: {_fmt_curr(spend, fonts)} · {red_pct:.1f}% risk reduction</b>"
        ctrl_rows.append([
            Paragraph(total_summary_text, styles["td_b"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
            Paragraph("", styles["td"]),
        ])

        ctrl_t = Table(ctrl_rows, colWidths=[114, 48, 52, 52, 52, 68, 58, 60], repeatRows=1)
        ctrl_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("SPAN", (0, -1), (-1, -1)),
                ("BACKGROUND", (0, -1), (-1, -1), C_PAPER),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(ctrl_t)
        story.append(Spacer(1, 6))

        # One-line list of candidate controls not selected
        unsel_ctrls = [c for c in ctx["all_controls"] if c.control_id not in sel_ctrl_ids]
        unsel_names = ", ".join(_esc(c.name) for c in unsel_ctrls) if unsel_ctrls else "None"
        unsel_p = f"<b>Candidate Controls Not Selected:</b> {unsel_names} (omitted due to budgetary limits or lower marginal loss reduction)."
        story.append(Paragraph(unsel_p, styles["body_muted"]))
        story.append(Spacer(1, 10))

        solver_match = opt.milp_matches_exhaustive_optimum
        audit_p = (
            f"<b>Mathematical Optimization Audit:</b> PuLP CBC Mixed-Integer Linear Programming solver verified "
            f"against full 2^N exhaustive search space. Global optimum match status: "
            f"<b>{'CONFIRMED IDENTICAL' if solver_match else 'FEASIBLE SUB-OPTIMAL'}</b>. "
            f"<b>Net return:</b> <b>{rosi_str}</b>, corresponding to "
            f"<b>{fonts.rupee}{avoided_per_rupee:.2f} of cyber loss avoided per {fonts.rupee}1.00 of first-year cost "
            f"(implementation + maintenance: {_fmt_curr(spend, fonts)})</b>."
        )
        story.append(Paragraph(audit_p, styles["body"]))
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 8: SCENARIO COMPARISON (Conditional)
    # ------------------------------------------------------------------------
    if "scenarios" in sec_filter and ctx["scenarios"]:
        h_sc = _snum("Scenario Comparison &amp; Efficient Frontier")
        story.append(Bookmark("sec_scenarios", h_sc.replace("&amp;", "&")))
        story.append(HeadingWithTOC(h_sc, styles["h1"], "sec_scenarios"))
        story.append(_callout_box("Evaluation of capital expenditure trade-offs across distinct enterprise budgetary scenarios.", styles, W))
        story.append(Spacer(1, 10))

        sc_headers = ["Scenario Name", "Target Budget", "Optimal Spend", "Risk Reduction", "Residual Loss"]
        sc_rows = [[Paragraph(f"<b>{h}</b>", styles["th_r" if idx in (1, 2, 4) else "th_c" if idx == 3 else "th"]) for idx, h in enumerate(sc_headers)]]

        sorted_scenarios = sorted(ctx["scenarios"], key=lambda s: s["spend"])
        for s in sorted_scenarios:
            sc_rows.append([
                Paragraph(_esc(s["name"]), styles["td_b"]),
                Paragraph(_fmt_curr(s["budget"], fonts), styles["td_r"]),
                Paragraph(_fmt_curr(s["spend"], fonts), styles["td_r"]),
                Paragraph(f"{s['reduction_pct']:.1f}%", styles["td_c"]),
                Paragraph(_fmt_curr(s["residual"], fonts), styles["td_r"]),
            ])

        sc_t = Table(sc_rows, colWidths=[150, 88, 88, 88, 90], repeatRows=1)
        sc_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(sc_t)
        story.append(Spacer(1, 10))

        story.append(_draw_frontier_curve(sorted_scenarios, fonts))
        story.append(Spacer(1, 6))

        # Frontier Takeaway computed from data: marginal points per ₹1 L
        frontier_notes = []
        for i in range(len(sorted_scenarios) - 1):
            s1 = sorted_scenarios[i]
            s2 = sorted_scenarios[i + 1]
            delta_spend_lakhs = (s2["spend"] - s1["spend"]) / 100_000.0
            delta_red = s2["reduction_pct"] - s1["reduction_pct"]
            if delta_spend_lakhs > 0:
                rate = delta_red / delta_spend_lakhs
                frontier_notes.append(
                    f"{_esc(s1['name'])} → {_esc(s2['name'])}: +{delta_red:.1f}% reduction for "
                    f"+{_fmt_curr(s2['spend'] - s1['spend'], fonts)} spend "
                    f"({rate:.2f} percentage points per {fonts.rupee}1.00 L)"
                )

        if frontier_notes:
            notes_str = "; ".join(frontier_notes)
            takeaway_sc = f"<b>Frontier Takeaway:</b> Marginal risk reduction rates: {notes_str}. Beyond baseline funding, capital deployment exhibits diminishing marginal returns."
        else:
            takeaway_sc = "<b>Frontier Takeaway:</b> Capital investments beyond the primary budget allocation exhibit diminishing marginal returns in enterprise risk reduction."

        story.append(Paragraph(takeaway_sc, styles["body"]))
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 9: METHODOLOGY AND FORMULAS
    # ------------------------------------------------------------------------
    if "methodology" in sec_filter:
        h_method = _snum("Methodology &amp; Mathematical Formulas")
        story.append(Bookmark("sec_methodology", h_method.replace("&amp;", "&")))
        story.append(HeadingWithTOC(h_method, styles["h1"], "sec_methodology"))
        story.append(_callout_box("Defensible mathematical standard specifications governing quantitative risk quantification.", styles, W))
        story.append(Spacer(1, 10))

        math_headers = ["Abbr.", "Full Form", "Definitive Formula", "Operational Meaning"]
        math_rows = [[Paragraph(f"<b>{h}</b>", styles["th"]) for h in math_headers]]

        formula_table = [
            ("EF", "Exposure Factor", "EF in [0.0, 1.0]", "Percentage of asset economic value lost during a single breach event."),
            ("SLE", "Single Loss Expectancy", "SLE = Asset Value × EF", "Expected financial loss from a single security threat event."),
            ("ARO", "Annualized Rate of Occurrence", "ARO = Threat Prob × Exploit Multiplier", "Likelihood (1–5) is used for the heatmap only; ARO = threat probability × exploitability multiplier, where multiplier = 1 + CVSS exploitability score / 10."),
            ("ALE", "Annual Loss Expectancy", "ALE = SLE × ARO", "Statistically expected baseline monetary loss per calendar year."),
            ("Score", "Risk Matrix Score", "Score = Likelihood × Impact, in [1, 25]", "5×5 qualitative categorical ranking mapping severity tiers."),
            ("Residual", "Residual Annual Loss", "Residual ALE = Baseline ALE × ∏(1 − E_j × x_j)", "Post-control financial loss accounting for defensive compounding."),
            ("Reduction", "Risk Reduction Ratio", "Reduction = (Baseline − Residual) / Baseline", "Percentage of total annual monetary risk eliminated by controls."),
            ("ROSI", "Return on Security Investment", "ROSI = (Loss Avoided − Total Cost) / Total Cost", "Net capital return ratio generated per rupee of first-year security cost."),
            ("Poisson", "Event Occurrence Model", "P(N = k) = (λ^k × e^(−λ)) / k!", "Stochastic discrete event distribution parameterized by λ = ARO."),
            ("LogNormal", "Loss Severity Model", "f(x) = (1 / (x σ √(2π))) exp(−(ln x − μ)² / 2σ²)", "Continuous right-skewed heavy-tailed single event loss severity (σ = 0.5 assumed)."),
            ("P10/P50/P90", "Loss Percentiles", "P(Loss ≤ P_k) = k / 100", "Simulated annual loss thresholds for optimistic, median, and adverse years."),
            ("P95 VaR", "Value-at-Risk", "P(Annual Loss ≤ P95) = 0.95", "Loss threshold exceeded in only 5% of stochastic simulated years."),
            ("LEC", "Loss Exceedance Curve", "LEC(x) = P(Annual Loss > x) = 1 − F(x)", "Complement cumulative distribution showing exceedance probabilities."),
            ("MILP", "Knapsack Optimization", "Maximize Σ(ΔALE_j × x_j) s.t. Σ(c_j × x_j) ≤ B", "Mixed-integer optimal control selection within budgetary limit."),
            ("Constraints", "Dependencies &amp; Compliance", "x_child ≤ x_parent, x_mand = 1", "Prerequisite operational ordering and mandatory baseline controls (supported in engine)."),
            ("2^N Search", "Exhaustive Global Audit", "|Ω| = 2^N (N = 8 → 256 states)", "Complete combinatorial search state audit verifying MILP global optimality."),
        ]

        for abbr, full, form, desc in formula_table:
            math_rows.append([
                Paragraph(abbr, styles["td_b"]),
                Paragraph(full, styles["td"]),
                Paragraph(form, styles["td_mono"]),
                Paragraph(desc, styles["td"]),
            ])

        math_t = Table(math_rows, colWidths=[54, 110, 160, 180], repeatRows=1)
        math_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        )
        story.append(math_t)
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 10: LIMITATIONS
    # ------------------------------------------------------------------------
    if "limitations" in sec_filter:
        h_limits = _snum("Data Sources, Assumptions &amp; Limitations")
        story.append(Bookmark("sec_limitations", h_limits.replace("&amp;", "&")))
        story.append(HeadingWithTOC(h_limits, styles["h1"], "sec_limitations"))
        story.append(_callout_box("Analytical assumptions and operational constraints governing this quantitative risk assessment.", styles, W))
        story.append(Spacer(1, 8))

        limits = [
            ("Threat &amp; Asset Assumptions", "Threat frequencies and asset values are synthetic demonstration assumptions parameterized for realistic financial modeling. Enterprise asset registers are entered manually; no active network scanning is conducted."),
            ("Intelligence Feeds", "Vulnerability data is a locally cached copy of the NIST National Vulnerability Database (NVD), CISA Known Exploited Vulnerabilities (KEV) Catalog, and MITRE ATT&amp;CK Framework."),
            ("FAIR-Inspired Methodology", "The platform applies FAIR-inspired deterministic financial quantification (SLE × ARO) paired with stochastic Monte Carlo uncertainty modeling."),
            ("Additive vs Multiplicative Evaluation", "The MILP Knapsack solver evaluates control benefits using linear approximations for computational tractability. The global portfolio residual risk is independently audited using exact non-linear multiplicative compounding: ∏(1 − E_j × x_j)."),
            ("Monte Carlo Independence", "Stochastic simulations assume independent Poisson threat arrivals unless explicit compound threat scenarios are configured. Extreme systemic tail-risk correlations may exceed single-enterprise parameters."),
            ("Executive Decision Support", "This quantitative document constitutes strategic decision support for leadership capital allocation and does not guarantee insurance indemnity or absolute immunity from adversarial breach."),
        ]

        for title, desc in limits:
            story.append(Paragraph(f"• <b>{title}:</b> {desc}", styles["body"]))
            story.append(Spacer(1, 4))

        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 11: GLOSSARY
    # ------------------------------------------------------------------------
    if "glossary" in sec_filter:
        h_gloss = _snum("Cyber Risk Glossary")
        story.append(Bookmark("sec_glossary", h_gloss))
        story.append(HeadingWithTOC(h_gloss, styles["h1"], "sec_glossary"))
        story.append(_callout_box("Authoritative lexicon of technical and financial terminology used throughout this report.", styles, W))
        story.append(Spacer(1, 10))

        terms = [
            ("ALE", "Annual Loss Expectancy", "Statistically expected monetary loss per year for an enterprise threat scenario (SLE × ARO)."),
            ("ARO", "Annualized Rate of Occurrence", "The estimated frequency of independent threat event occurrences within a twelve-month period."),
            ("CISA KEV", "Known Exploited Vulnerabilities", "Authoritative catalog maintained by CISA of software flaws actively weaponized in the wild."),
            ("CPE", "Common Platform Enumeration", "Structured naming format used for identifying applications, operating systems, and hardware."),
            ("CVE", "Common Vulnerabilities and Exposures", "Standardized dictionary of publicly known cybersecurity vulnerabilities maintained by MITRE."),
            ("CVSS", "Common Vulnerability Scoring System", "Standardized framework measuring vulnerability technical severity from 0.0 to 10.0."),
            ("CWE", "Common Weakness Enumeration", "Community-developed taxonomy of software and hardware weakness flaw types."),
            ("EF", "Exposure Factor", "Percentage of asset economic value compromised or destroyed during a single threat occurrence."),
            ("FAIR", "Factor Analysis of Information Risk", "Standard quantitative model for understanding and measuring information risk in financial terms."),
            ("LEC", "Loss Exceedance Curve", "Complement cumulative distribution function showing probability of exceeding loss thresholds."),
            ("MILP", "Mixed-Integer Linear Programming", "Mathematical optimization technique with linear objective functions and integer decision variables."),
            ("MITRE ATT&amp;CK", "Adversarial Tactics &amp; Techniques", "Curated knowledge base of cyber adversary behavior across the adversarial attack lifecycle."),
            ("NIST CSF", "NIST Cybersecurity Framework", "Voluntary guidance organizing defensive activities: Identify, Protect, Detect, Respond, Recover."),
            ("NVD", "National Vulnerability Database", "U.S. government repository of standards-based vulnerability management data."),
            ("P50 / P95", "Percentile Metrics", "P50 reflects median annual expected losses; P95 reflects tail losses exceeded in only 5% of simulated years."),
            ("ROSI", "Return on Security Investment", "Quantitative financial ratio measuring financial loss avoided per rupee invested in security controls."),
            ("SLE", "Single Loss Expectancy", "Expected monetary loss from a single security incident (Asset Business Value × Exposure Factor)."),
            ("VaR", "Value-at-Risk", "Financial metric quantifying the maximum expected monetary loss at a given confidence level."),
        ]

        gloss_rows = [[Paragraph(f"<b>{h}</b>", styles["th"]) for h in ["Term", "Full Form", "Definition"]]]
        for t, f_name, d_text in terms:
            gloss_rows.append([
                Paragraph(t, styles["td_b"]),
                Paragraph(f_name, styles["td"]),
                Paragraph(d_text, styles["td"]),
            ])

        gloss_t = Table(gloss_rows, colWidths=[70, 144, 290], repeatRows=1)
        gloss_t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
                ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        )
        story.append(gloss_t)
        story.append(PageBreak())

    # ------------------------------------------------------------------------
    # SECTION 12: EXECUTIVE SIGN-OFF (ALWAYS INCLUDED)
    # ------------------------------------------------------------------------
    h_signoff = _snum("Executive Sign-Off &amp; Governance Attestation")
    story.append(Bookmark("sec_signoff", h_signoff.replace("&amp;", "&")))
    story.append(HeadingWithTOC(h_signoff, styles["h1"], "sec_signoff"))
    story.append(_callout_box("Formal governance acknowledgment and approval register for enterprise executive leadership.", styles, W))
    story.append(Spacer(1, 14))

    sign_data = [
        [Paragraph("<b>Executive Role</b>", styles["th"]), Paragraph("<b>Name &amp; Title</b>", styles["th"]), Paragraph("<b>Signature</b>", styles["th"]), Paragraph("<b>Date</b>", styles["th_c"])],
        [Paragraph("Chief Information Security Officer", styles["td_b"]), Paragraph("", styles["td"]), Paragraph("", styles["td"]), Paragraph("", styles["td_c"])],
        [Paragraph("Chief Financial Officer", styles["td_b"]), Paragraph("", styles["td"]), Paragraph("", styles["td"]), Paragraph("", styles["td_c"])],
        [Paragraph("Chief Executive Officer", styles["td_b"]), Paragraph("", styles["td"]), Paragraph("", styles["td"]), Paragraph("", styles["td_c"])],
    ]
    sign_t = Table(sign_data, colWidths=[140, 144, 140, 80])
    sign_t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), C_SURFACE_2),
            ("BOX", (0, 0), (-1, -1), 0.5, C_LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, C_LINE),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 22),
            ("TOPPADDING", (0, 1), (-1, -1), 10),
        ])
    )
    story.append(sign_t)
    story.append(Spacer(1, 16))

    statement = (
        "<b>Attestation Statement:</b> The undersigned enterprise executives hereby certify that the quantitative "
        "cyber risk assessments, deterministic exposure figures, and capital allocation recommendations presented "
        "herein have been reviewed and formally incorporated into enterprise risk governance."
    )
    story.append(Paragraph(statement, styles["body_muted"]))

    # MultiBuild with afterFlowable hook for TableOfContents
    def after_flowable(flowable):
        if hasattr(flowable, "toc_entry"):
            level, text, key = flowable.toc_entry
            doc.notify("TOCEntry", (level, text, doc.page, key))

    doc.afterFlowable = after_flowable
    canvas_maker = make_numbered_canvas(org.name, now_str, fonts)
    doc.multiBuild(story, canvasmaker=canvas_maker)

    return doc_buf.getvalue()
