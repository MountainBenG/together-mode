"""Schema + sanity validation for findings before they reach scoring.

Two failure surfaces this guards:

  1. Detective *logic* bugs — e.g. a bad denominator producing reach > 1.
     The dataclass can't catch this because 1.7 is still a valid float.
     This is the Age-Fit class of bug we already hit once.

  2. LLM reconciliation output — the lead model (claude-fable-5) can drop a
     field, emit an unknown theme/stage/cohort, or invent an out-of-range
     number despite the prompt. Rebuilding those via _dict_to_finding can
     raise ValueError/KeyError, which today is NOT caught and crashes the run.

Policy: validate per-finding, LOG and DROP anything malformed, never crash the
run. Dropped findings are collected so they can surface in the JSON report
instead of vanishing silently.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from models import Cohort, Finding, Stage, Theme


@dataclass
class Rejection:
    """A finding that failed validation, kept for the run manifest."""
    source: str                       # e.g. "detective:age_fit" or "reconcile"
    reason: str                       # human-readable "; "-joined problems
    raw: dict = field(default_factory=dict)


def _problems(f: Finding) -> list[str]:
    """Return a list of reasons this finding is invalid; empty == clean."""
    probs: list[str] = []

    # --- enums: a loosely-coerced dict can slip a raw string through here ---
    if not isinstance(f.theme, Theme):
        probs.append(f"theme not a Theme: {f.theme!r}")
    if not isinstance(f.stage, Stage):
        probs.append(f"stage not a Stage: {f.stage!r}")
    if not isinstance(f.cohort, Cohort):
        probs.append(f"cohort not a Cohort: {f.cohort!r}")

    # --- rates are genuine fractions by construction; the denominator-bug
    #     tripwire is exactly this range check ---
    for name in ("reach", "no_pick_rate"):
        v = getattr(f, name, None)
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            probs.append(f"{name} not numeric: {v!r}")
        elif not (0.0 <= float(v) <= 1.0):
            probs.append(f"{name} out of [0,1]: {v}")

    # --- evidence: non-empty list of session-id strings ---
    if not isinstance(f.evidence, list) or not f.evidence:
        probs.append("evidence empty or not a list")
    elif not all(isinstance(s, str) and s for s in f.evidence):
        probs.append("evidence contains empty/non-string ids")

    # --- text the report and reconciler depend on ---
    for name in ("description", "suggested_fix"):
        v = getattr(f, name, None)
        if not isinstance(v, str) or not v.strip():
            probs.append(f"{name} empty")

    if not isinstance(f.measured, bool):
        probs.append(f"measured not bool: {f.measured!r}")

    return probs


def _safe_dict(f: Finding) -> dict:
    """Best-effort snapshot of a rejected finding for the manifest."""
    try:
        return {
            "theme": getattr(f.theme, "value", f.theme),
            "stage": getattr(f.stage, "value", f.stage),
            "reach": getattr(f, "reach", None),
            "no_pick_rate": getattr(f, "no_pick_rate", None),
            "description": (getattr(f, "description", "") or "")[:120],
        }
    except Exception:
        return {"repr": repr(f)[:200]}


def validate(
    findings: list[Finding],
    *,
    source: str,
    rejected: list[Rejection] | None = None,
) -> list[Finding]:
    """Return only the findings that pass; log + collect the rest.

    `source` labels where these findings came from so the log and manifest
    point at the right detective (or the reconcile step).
    """
    clean: list[Finding] = []
    for f in findings:
        probs = _problems(f)
        if probs:
            reason = "; ".join(probs)
            print(f"[validate] DROP ({source}): {reason}")
            if rejected is not None:
                rejected.append(Rejection(source, reason, _safe_dict(f)))
            continue
        clean.append(f)
    return clean
