# Claude Model Context Window Research Document (English)

**Purpose**: Reference for model compatibility design for the VSCode extension  
**Compiled on**: 2026-07-05  
**Note**: This document is based on Anthropic official documentation (platform.claude.com, support.claude.com) and public issues in the Claude Code GitHub repository. Information may change as versions evolve; it is recommended to re-check key numbers before release. [...]

---

## 1. Current model list and context windows (API level)

| Model | API Model ID | Context Window | Max Output | Knowledge Cutoff |
|---|---:|---:|---:|---:|
| Claude Fable 5 | `claude-fable-5` | 1M tokens | 128K tokens | Jan 2026 |
| Claude Mythos 5 | `claude-mythos-5` | 1M tokens | 128K tokens | Jan 2026 |
| Claude Opus 4.8 | `claude-opus-4-8` | 1M tokens | 128K tokens | Jan 2026 |
| Claude Opus 4.7 | `claude-opus-4-7` | 1M tokens | — | — |
| Claude Opus 4.6 | `claude-opus-4-6` | 1M tokens | — | — |
| Claude Sonnet 5 | `claude-sonnet-5` | 1M tokens | 128K tokens | Jan 2026 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M tokens | — | — |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | 200K tokens | 64K tokens | Feb 2025 |

Key point: At the API level (Claude API / AWS / GCP / Microsoft Foundry), Opus 4.6 and later, and Sonnet 4.6 and later, default to 1M context — no beta header required; use the standard [...].

Deprecated / should no longer be supported:
- `claude-opus-4-20250514` / `claude-sonnet-4-20250514` (and undated aliases `claude-opus-4-0`, `claude-sonnet-4-0`): retired on **2026-06-15**; calls now return errors with no automatic fallback.

---

## 2. Differences between API and subscription product limits (claude.ai / Claude Code)

This is the most common pitfall in this research: the model's supported context window and the context window a user can actually use are different things. The latter depends on product UI and subscription plan [...].

### 2.1 claude.ai web/app chat interface

| Model | Context available under paid plans |
|---|---|
| Claude Sonnet 5 | 1M tokens |
| Claude Opus 4.8 / 4.7 / 4.6, Claude Sonnet 4.6 | 500K tokens |
| Other models (e.g., Sonnet 4.5) | 200K tokens |

### 2.2 Claude Code

| Model | Pro subscription | Max / Team / Enterprise subscription |
|---|---:|---:|
| Sonnet 5 | 1M (automatic, no extra action) | 1M (automatic) |
| Opus 4.6 / 4.7 / 4.8 | Requires manually enabling usage credits; otherwise capped at 200K | Automatic 1M, no extra action |
| Sonnet 4.6 | Requires manually enabling usage credits; otherwise capped at 200K | Also requires manual enabling of usage credits (except pay-as-you-go Enterprise) |
| Sonnet 4.5 / Haiku 4.5 | Cap 200K regardless of credits | Cap 200K regardless of credits |

Important inconsistency: Under Max subscription, Opus series automatically receive 1M, but Sonnet 4.6 on Max still requires manually enabling usage credits to reach 1M — this differs from Opus behavior and should be noted [...].

---

## 3. Known display-layer bugs (not actual quota issues)

There are multiple official-confirmed UI bugs in Claude Code's `/context` command that must be distinguished from the actual quota rules in section 2:

- GitHub issues #23432 / #34143 / #49931: Under Max/Team/Enterprise subscriptions Opus 4.6 / 4.7 should automatically get 1M context, but the `/context` command denominator may be stuck at **200K**, even when the model actually has a larger quota [...].

How to distinguish:
- If you are on **Max/Team/Enterprise** and you see 200K, it is likely the display bug noted above.
- If you are on **Pro** and have not enabled usage credits, seeing 200K is the real limit (see section 2.2).

---

## 4. Recommendations for the VSCode extension design

### 4.1 Do not hardcode a static "model → context size" mapping
Model specs change rapidly (Opus 4.6 → 4.7 → 4.8 → Fable 5; several updates in months). Prefer using the Models API (`GET /v1/models`) which returns `max_input_tokens`, `max_tokens`, `capabilities` [...].

### 4.2 Model-level limit ≠ user-available limit
As described in section 2, the same model can have very different usable context based on subscription and usage credits (e.g., 200K vs 1M). There is currently no API that reliably reports a user's actual usable quota [...].

### 4.3 Recommended approach: user-maintained "model → context size" dictionary + conservative defaults
- Provide an editable dictionary in the extension settings so users can input their actual usable context based on their subscription / credits.
- Default conservatively: assume 200K for all models (this is the minimum guaranteed across subscription tiers), not the optimistic 1M. Underestimating only makes the extension conservative; overestimating risks the extension taking incorrect actions [...].
- Treat this number as a reference / soft hint (for example, shown in a progress bar or used to warn early), not for hard truncation or blocking — it is fundamentally a user-provided estimate.
- For scenarios that require precise control (e.g., deciding whether to trigger history compression), use a tokenizer or a real-time count_tokens API to measure tokens instead of relying on the static setting [...].

---

## 5. Sources

- Anthropic official documentation: platform.claude.com/docs (Models overview, Context windows, Model deprecations)  
- Anthropic Claude Code documentation: code.claude.com/docs (Model configuration)  
- Anthropic Help Center: support.claude.com (How large is the context window on paid Claude plans)  
- Claude Code public GitHub issues (anthropics/claude-code #23432, #34143, #49931)

*This document was compiled from information retrieved on 2026-07-05. Anthropic's model specs and billing/quota rules change frequently — re-verify critical numbers before a formal release.*
