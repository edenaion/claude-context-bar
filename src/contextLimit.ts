/**
 * Pure function: determine the context window limit for a given model.
 *
 * All inputs are explicit parameters — no implicit configuration reads.
 * The `modelContextLimits` dictionary enables follow-up multi-tier
 * resolution (issue #3 / #1) without changing this function's signature.
 *
 * @param model                Model name string (e.g. "claude-sonnet-4-5-1m")
 * @param userLimit            Fallback context limit from VS Code settings
 * @param modelContextLimits   Per-model context limits (reserved for future use)
 * @returns                    Context window size in tokens
 */
export function getContextLimitForModel(
    model: string,
    userLimit: number,
    modelContextLimits: Record<string, number>,
): number {
    // Sonnet 4.5 1M / Sonnet 5 1M — 1 million token context
    if (model.toLowerCase().includes('sonnet') && model.toLowerCase().includes('1m')) {
        return 1_000_000;
    }
    // All other models fall back to the user-configured limit (default 200K)
    return userLimit;
}
