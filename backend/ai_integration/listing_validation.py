"""
Deterministic Etsy listing draft checks (2026 rules alignment).
Used to supplement Agent 2 (critic) with auditable, reproducible findings.
"""

from __future__ import annotations

import re
from typing import Any

# Minimal English + German — extend as needed
_TITLE_STOPWORDS = frozenset(
    {
        # EN (overlap audit)
        "the",
        "a",
        "an",
        "and",
        "or",
        "of",
        "for",
        "with",
        "in",
        "from",
        "your",
        "this",
        "that",
        # DE
        "von",
        "und",
        "oder",
        "der",
        "die",
        "das",
        "ein",
        "eine",
        "dem",
        "den",
        "des",
        "im",
        "am",
        "zur",
        "zum",
        "bei",
        "mit",
        "auf",
        "als",
        "nach",
    },
)

# Subjective / banned-in-title vocabulary (EN + DE) — align with SYSTEM_PROMPT
_SUBJECTIVE_TITLE_WORDS = frozenset(
    {
        "beautiful",
        "unique",
        "perfect",
        "best",
        "amazing",
        "stunning",
        "gorgeous",
        "lovely",
        "wunderschön",
        "wunderschoen",
        "perfekt",
        "einzigartig",
        "toll",
        "fantastisch",
        "einmalig",
        "schön",
        "schoen",
        "traumhaft",
    },
)

_WORD_RE = re.compile(r"[a-zA-ZäöüÄÖÜß]{3,}")


def _title_significant_words(titles: list[str]) -> set[str]:
    words: set[str] = set()
    for t in titles:
        if not isinstance(t, str):
            continue
        for m in _WORD_RE.finditer(t.lower()):
            w = m.group(0)
            if w not in _TITLE_STOPWORDS:
                words.add(w)
    return words


def _find_title_tag_word_overlaps(titles: list[str], tags: list[str]) -> list[str]:
    if not titles or not tags:
        return []
    tw = _title_significant_words(titles)
    conflicts: list[str] = []
    for tag in tags:
        if not isinstance(tag, str) or not tag.strip():
            continue
        tl = tag.lower()
        for w in tw:
            if re.search(r"(?<![a-zäöüß])" + re.escape(w) + r"(?![a-zäöüß])", tl, re.I):
                conflicts.append(f'Titel-Wort "{w}" taucht in Tag "{tag}" auf (Zero-Redundanz).')
    return conflicts


def _find_subjective_in_titles(titles: list[str]) -> list[str]:
    found: list[str] = []
    for t in titles:
        if not isinstance(t, str):
            continue
        tl = t.lower()
        for sw in _SUBJECTIVE_TITLE_WORDS:
            if re.search(
                r"(?<![a-zäöüß])" + re.escape(sw.lower()) + r"(?![a-zäöüß])",
                tl,
                re.I,
            ):
                found.append(f'Subjektiv/banned im Titel: "{sw}" in «{t[:80]}…»')
                break
    return found


def _tags_over_20_chars(tags: list[str]) -> list[str]:
    out: list[str] = []
    for tag in tags:
        if not isinstance(tag, str):
            continue
        if len(tag) > 20:
            out.append(f'"{tag}" ({len(tag)} Zeichen > 20)')
    return out


def audit_scout_draft(scout_data: dict[str, Any]) -> dict[str, Any]:
    """
    Run deterministic checks on a scout draft (titles, tags).

    Returns keys merged into critic ``data``:
    - title_tag_word_conflicts
    - subjective_words_in_title
    - tags_over_20_chars
    - deterministic_blocking (True if any hard finding)
    """
    titles_raw = scout_data.get("titles")
    tags_raw = scout_data.get("tags")
    titles: list[str] = []
    if isinstance(titles_raw, list):
        for x in titles_raw:
            s = str(x).strip()
            if s:
                titles.append(s)

    tags: list[str] = []
    if isinstance(tags_raw, list):
        tags = [str(x).strip() for x in tags_raw if str(x).strip()]

    overlaps = _find_title_tag_word_overlaps(titles, tags)
    subjective = _find_subjective_in_titles(titles)
    long_tags = _tags_over_20_chars(tags)

    blocking = bool(overlaps or subjective or long_tags)

    return {
        "title_tag_word_conflicts": overlaps,
        "subjective_words_in_title": subjective,
        "tags_over_20_chars": long_tags,
        "deterministic_blocking": blocking,
    }
