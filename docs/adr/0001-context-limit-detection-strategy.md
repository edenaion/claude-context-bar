# ADR 0001: Context Limit Detection Strategy

**Date**: 2026-07-06
**Status**: Accepted

## Context

The extension displays a context-usage percentage on the status bar. To calculate this percentage, it needs a denominator — the context limit. There are two competing realities:

1. **API-level**: Most current Claude models (Opus 4.6+, Sonnet 4.6+, Sonnet 5, Fable 5, Mythos 5) support 1M-token context windows at the API layer.
2. **Effective**: The user's actual usable context depends on their subscription tier and usage-credits state, neither of which is programmatically detectable. The same model can have an effective context of 200K or 1M depending on these factors.

The pre-1.5.0 code used a single heuristic (`model.includes('sonnet') && model.includes('1m')`) that only matched one old model variant and missed all newer 1M-capable models.

We cannot build a perfect detector because the critical inputs (subscription tier, credits state) have no API. We needed a strategy that balances usefulness against the risk of reporting a higher context limit than the user actually has.

## Decision

Resolve the context limit through a three-tier priority chain, highest priority first:

1. **User configuration** (`modelContextLimits`): A per-model dictionary the user sets explicitly. Exact Model ID match. Highest priority.
2. **Auto-detection**: Only Sonnet 5 is automatically promoted to 1M. It is the sole model confirmed to have universal 1M access across all subscription tiers without requiring usage credits.
3. **Global fallback** (`contextLimit`, default `200000`): Used when neither of the above applies.

In pseudocode:

```
resolveContextLimit(model, userDict, globalFallback):
    if userDict[model] is defined → userDict[model]
    if model includes "claude-sonnet-5"     → 1,000,000
    return globalFallback
```

No model is force-capped — user configuration always takes precedence, even for hard-capped models (Haiku 4.5, Sonnet 4.5).

## Alternatives Considered

### A: Aggressive detection — auto-promote all 1M-capable models

Auto-detect Opus 4.6+, Sonnet 4.6+, Fable 5, Mythos 5 as 1M. Rejected because these models' effective context depends on subscription tier and credits state. A Pro user on Opus 4.8 without usage credits would see a 1M progress bar but actually have only 200K — a false sense of safety.

### B: Purely manual — remove all auto-detection

Keep only the global `contextLimit` setting. Rejected because Sonnet 5 is genuinely universal-1M across all tiers, so auto-detection provides value with zero risk of misreporting. Removing it would be leaving useful behavior on the table.

### C: Call the Models API at runtime

Query `GET /v1/models` for `max_input_tokens`. Rejected because:
- Adds a network dependency to a local-file-reading extension.
- The API returns the **API-level** limit, not the user's **effective** limit — so it doesn't actually solve the core problem.
- Would still need the same fallback logic for API failures.

## Consequences

- Users on newer 1M-capable models (Opus 4.6+, Sonnet 4.6+, Fable 5, Mythos 5) will see a 200K progress bar by default unless they configure a higher value in `modelContextLimits`. This is intentional conservatism.
- Sonnet 5 users get correct 1M detection automatically with no configuration needed.
- Users who know their effective context (because they know their subscription tier and credits state) can set precise values per model.
- The `modelContextLimits` setting is a new user-facing configuration surface that must be documented in the README.
