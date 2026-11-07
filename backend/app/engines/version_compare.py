"""
Version Comparison Utility Module for PS105 Vulnerability Matching Engine.

Provides deterministic semantic version parsing and boundary comparison without
relying on naive floating-point conversions (ensuring e.g. 1.10 > 1.9).
"""

import re
from typing import Optional, Tuple, Union


def parse_version(v_str: Optional[str]) -> Optional[Tuple[Union[int, str], ...]]:
    """
    Parses a version string into a comparable tuple of integers and string tokens.
    
    Examples:
        "1.10.2"   -> (1, 10, 2)
        "1.9"      -> (1, 9)
        "v2.4.49"  -> (2, 4, 49)
        "2.0.1a"   -> (2, 0, 1, "a")
        None / ""  -> None
    """
    if not v_str or not isinstance(v_str, str):
        return None
    
    cleaned = v_str.strip().lstrip("vV")
    if not cleaned or cleaned == "*":
        return None

    # Split into numeric and alphabetic components
    parts = re.findall(r"\d+|\D+", cleaned)
    tokens = []
    for part in parts:
        part_clean = part.strip(".-_")
        if not part_clean:
            continue
        if part_clean.isdigit():
            tokens.append(int(part_clean))
        else:
            tokens.append(part_clean.lower())

    return tuple(tokens) if tokens else None


def compare_versions(v1: str, v2: str) -> Optional[int]:
    """
    Compares two version strings.
    
    Returns:
        1  if v1 > v2
        -1 if v1 < v2
        0  if v1 == v2
        None if either version string is invalid or unparseable.
    """
    parsed1 = parse_version(v1)
    parsed2 = parse_version(v2)

    if parsed1 is None or parsed2 is None:
        return None

    # Pad shorter tuple with 0 if types match, to allow e.g. (1, 9, 0) == (1, 9)
    len1, len2 = len(parsed1), len(parsed2)
    max_len = max(len1, len2)

    # Normalize tuples for comparison
    t1 = list(parsed1) + [0] * (max_len - len1)
    t2 = list(parsed2) + [0] * (max_len - len2)

    for el1, el2 in zip(t1, t2):
        if type(el1) is type(el2):
            if el1 < el2:
                return -1
            elif el1 > el2:
                return 1
        else:
            # If types differ (int vs str), convert both to string comparison
            str1, str2 = str(el1), str(el2)
            if str1 < str2:
                return -1
            elif str1 > str2:
                return 1

    return 0


def is_version_in_range(
    installed_version: Optional[str],
    version_start_including: Optional[str] = None,
    version_end_excluding: Optional[str] = None,
) -> Optional[bool]:
    """
    Checks if an installed version falls within [version_start_including, version_end_excluding).
    
    Returns:
        True  if installed_version is within range
        False if installed_version is outside range
        None  if installed_version or range specifications are insufficient/unparseable
    """
    parsed_installed = parse_version(installed_version)
    if parsed_installed is None:
        # Missing or unparseable installed_version -> INSUFFICIENT DATA
        return None

    # Check lower bound: version_start_including (inclusive)
    if version_start_including and version_start_including != "*":
        cmp_start = compare_versions(installed_version, version_start_including)
        if cmp_start is None:
            return None
        if cmp_start < 0:
            # installed_version < version_start_including -> NO MATCH
            return False

    # Check upper bound: version_end_excluding (exclusive)
    if version_end_excluding and version_end_excluding != "*":
        cmp_end = compare_versions(installed_version, version_end_excluding)
        if cmp_end is None:
            return None
        if cmp_end >= 0:
            # installed_version >= version_end_excluding -> NO MATCH
            return False

    return True
