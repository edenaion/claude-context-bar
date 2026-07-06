/**
 * Pure function: determine the context window limit for a given model.
 *
 * Three-tier priority chain (highest first):
 * 1. User configuration  exact Model ID match in `modelContextLimits`
 * 2. Auto-detection      model ID matches a known universal-1M model
 * 3. Global fallback     `userLimit` (the VS Code `contextLimit` setting)
 *
 * Why so conservative on tier 2: Claude session JSONL records only the model
 * ID string. It carries no context-window field, and a model's *effective*
 * limit depends on subscription tier and usage-credits state, neither of which
 * is detectable from the file. So we auto-promote a model to 1M only when it is
 * confirmed to have 1M universally, across every tier, with no extra steps.
 * Everything else stays at the fallback until the user sets an explicit
 * override. The override always wins, so a user on any 1M model (or a pinned
 * extension version) can always correct the value themselves.
 *
 * @param model                Model ID string (e.g. "claude-sonnet-5-20251001")
 * @param userLimit            Fallback context limit from VS Code settings
 * @param modelContextLimits   Per-model context limits from user configuration
 * @returns                    Context window size in tokens
 */
export function getContextLimitForModel(
    model: string,
    userLimit: number,
    modelContextLimits: Record<string, number>,
): number {
    // Tier 1: user override, exact Model ID match, highest priority.
    if (model in modelContextLimits) {
        return modelContextLimits[model];
    }

    // Tier 2: auto-detect known universal-1M models (lowercase substring match).
    const id = model.toLowerCase();
    if (UNIVERSAL_1M_MODELS.some((m) => id.includes(m))) {
        return 1_000_000;
    }

    // Tier 3: global fallback.
    return userLimit;
}

/**
 * Model IDs that get 1,000,000-token context universally  across every
 * subscription tier and credits state, with no extra steps required.
 *
 * Conservative by design. A model is added here only once confirmed to be
 * universal-1M. Models whose 1M depends on tier or usage credits (Opus 4.6+,
 * Sonnet 4.6+) are intentionally absent; users on those set an explicit
 * override in the `modelContextLimits` setting instead. Adding a model is one
 * line here, but prefer the user override for anything not truly universal.
 */
const UNIVERSAL_1M_MODELS: readonly string[] = [
    'claude-sonnet-5',
];
