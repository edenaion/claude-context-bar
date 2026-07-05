/**
 * Pure function: determine the context window limit for a given model.
 *
 * Three-tier priority chain (highest first):
 * 1. User configuration — exact Model ID match in `modelContextLimits`
 * 2. Auto-detection — model ID contains "claude-sonnet-5" → 1,000,000
 * 3. Global fallback — `userLimit` (the VS Code `contextLimit` setting)
 *
 * All inputs are explicit parameters — no implicit configuration reads.
 *
 * @param model                Model name string (e.g. "claude-sonnet-5-20251001")
 * @param userLimit            Fallback context limit from VS Code settings
 * @param modelContextLimits   Per-model context limits from user configuration
 * @returns                    Context window size in tokens
 */
export function getContextLimitForModel(
    model: string,
    userLimit: number,
    modelContextLimits: Record<string, number>,
): number {
    // Tier 1: User configuration — exact Model ID match, highest priority
    if (model in modelContextLimits) {
        return modelContextLimits[model];
    }

    // Tier 2: Auto-detection — Sonnet 5 is universally 1M across all tiers
    if (model.toLowerCase().includes('claude-sonnet-5')) {
        return 1_000_000;
    }

    // Tier 3: Global fallback
    return userLimit;
}
