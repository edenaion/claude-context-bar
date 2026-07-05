# CONTEXT

Domain glossary for the Claude Context Bar project. Terms only — no implementation details.

---

## Terms

### Context Window

The maximum total tokens a model can process in a single conversation. In this project, "context window" and "context limit" are used interchangeably in discussion, but see **Context Limit** for the precise meaning within the extension.

### API-Level Context Window

The context window size a model technically supports at the API layer, as returned by `GET /v1/models` (`max_input_tokens`). For example, Opus 4.6+, Sonnet 4.6+, Fable 5, and Mythos 5 all have API-level context windows of 1M tokens. **This is a model property — it does not equal what the user can actually use.**

### Effective Context Window

The context window a user can **actually use** in a specific product interface (claude.ai, Claude Code), under a specific subscription tier (Pro / Max / Team / Enterprise), with a specific usage-credits state. The same model can have effective context windows that differ by a factor of 5 (200K vs 1M) depending on these conditions. **There is no API to query this value programmatically.**

### Context Limit

The number the extension uses as the denominator when calculating the usage percentage. It is **not** the precise context window — it is a **reference value** derived from user configuration, auto-detection, and conservative defaults. Used for progress-bar display and threshold warnings; must not be used as a hard cutoff.

### Subscription Tier

The plan under which a user accesses Claude Code: Pro, Max, Team, or Enterprise. Different tiers grant different effective context windows for the same model. The extension cannot detect the user's subscription tier.

### Usage Credits

A setting under Max / Team / Enterprise that, when enabled, raises the effective context window for certain models (Opus 4.6+, Sonnet 4.6) from 200K to 1M. The extension cannot detect whether credits are enabled.

### Hard-Capped Model

A model whose effective context window is fixed at 200K regardless of subscription tier or credits state. Currently: Haiku 4.5, Sonnet 4.5.

### Universal 1M Model

A model that automatically gets 1M effective context across **all** subscription tiers with **no** extra steps required. Currently the only confirmed case is **Sonnet 5**.

### Model ID

The API model identifier that Claude Code records in JSONL session files, e.g. `claude-sonnet-5`, `claude-opus-4-8`. The extension identifies the model by inspecting this string.

### Context Usage Percentage

`totalTokens / contextLimit × 100`. `totalTokens` is the real-time sum from the JSONL file: `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`.

---

## Design Principles

1. **Undetectable means don't assume**: The extension must not make optimistic guesses about information it cannot programmatically obtain (subscription tier, credits state).
2. **Conservative default**: Default to 200K for percentage calculations. The cost of underestimating (a more conservative progress bar) is far lower than the cost of overestimating (no warning before hitting the real limit).
3. **User configuration is the highest priority**: The user knows their actual quota best; explicit configuration must always win.
4. **Percentage is a soft signal, not a hard cutoff**: The context limit value is only for progress-bar display and threshold warnings. It must not drive blocking or truncation logic.
