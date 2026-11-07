"""
Unit Tests for Semantic Version Comparison Engine (PS105 Phase 3).
"""

import sys
from pathlib import Path
import pytest

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engines.version_compare import parse_version, compare_versions, is_version_in_range


def test_parse_version_standard():
    assert parse_version("1.10.2") == (1, 10, 2)
    assert parse_version("v2.4.49") == (2, 4, 49)
    assert parse_version("1.9") == (1, 9)
    assert parse_version("2.0.1a") == (2, 0, 1, "a")


def test_parse_version_invalid_or_empty():
    assert parse_version(None) is None
    assert parse_version("") is None
    assert parse_version("   ") is None
    assert parse_version("*") is None


def test_compare_versions_semantic_vs_float():
    """
    CRITICAL REQUIREMENT: 1.10 > 1.9 (unlike naive floating-point comparison where 1.10 becomes 1.1 < 1.9).
    """
    assert compare_versions("1.10.0", "1.9.5") == 1
    assert compare_versions("1.9.5", "1.10.0") == -1
    assert compare_versions("1.9.0", "1.9") == 0


def test_compare_versions_boundary_cases():
    assert compare_versions("2.4.49", "2.4.51") == -1
    assert compare_versions("2.4.51", "2.4.49") == 1
    assert compare_versions("2.4.49", "2.4.49") == 0


def test_is_version_in_range_inclusive_lower_exclusive_upper():
    # Lower bound inclusive, upper bound exclusive: [2.4.49, 2.4.51)
    # 2.4.49 -> True
    assert is_version_in_range("2.4.49", "2.4.49", "2.4.51") is True
    # 2.4.50 -> True
    assert is_version_in_range("2.4.50", "2.4.49", "2.4.51") is True
    # 2.4.51 -> False (exclusive upper bound)
    assert is_version_in_range("2.4.51", "2.4.49", "2.4.51") is False
    # 2.4.48 -> False (below inclusive lower bound)
    assert is_version_in_range("2.4.48", "2.4.49", "2.4.51") is False


def test_is_version_in_range_open_bounds():
    # Only upper bound: < 3.0.0
    assert is_version_in_range("2.9.9", None, "3.0.0") is True
    assert is_version_in_range("3.0.0", None, "3.0.0") is False

    # Only lower bound: >= 1.5.0
    assert is_version_in_range("1.5.0", "1.5.0", None) is True
    assert is_version_in_range("1.4.9", "1.5.0", None) is False


def test_is_version_in_range_missing_version():
    """
    CRITICAL REQUIREMENT: Missing installed version returns None (INSUFFICIENT_DATA).
    """
    assert is_version_in_range(None, "1.0.0", "2.0.0") is None
    assert is_version_in_range("", "1.0.0", "2.0.0") is None
