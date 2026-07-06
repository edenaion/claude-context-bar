/**
 * Pure function: determine the context window limit for a given model.
 *
 * Priority chain (highest first):
 * 1. User configuration  exact Model ID match in `modelContextLimits`
 * 2. Known 200K exceptions  Haiku and legacy models (the denylist below)
 * 3. Default  1,000,000 for any other current Claude model
 * 4. Unknown / non-Claude IDs  `userLimit` (the global `contextLimit` setting)
 *
 * Why the default is 1M, not 200K: Claude session JSONL records only the Model
 * ID. It has no context-window field, so the limit has to be inferred from the
 * ID. Every current frontier model ships with a 1M window by default (Opus 4.6
 * and up, Sonnet 4.6 and up, Sonnet 5, Fable 5, Mythos 5). The only 200K models
 * are the small Haiku tier and retired legacy generations. Defaulting to 1M and
 * listing the 200K exceptions means new models resolve correctly with no code
 * change, since new models keep shipping at 1M. If a model is ever mis-sized,
 * the user override in tier 1 always wins.
 *
 * @param model                Model ID string (e.g. "claude-opus-4-8")
 * @param userLimit            Fallback for unknown / non-Claude IDs (VS Code `contextLimit`)
 * @param modelContextLimits   Per-model overrides from user configuration
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

    const id = model.toLowerCase().trim();

    // Tier 4 (guard): unknown or non-Claude IDs (e.g. "", "<synthetic>") use
    // the configured fallback rather than the 1M default.
    if (!id.startsWith('claude')) {
        return userLimit;
    }

    // Tier 2: known 200K models (Haiku + legacy). Lowercase substring match.
    if (CONTEXT_200K_MODELS.some((m) => id.includes(m))) {
        return CONTEXT_200K;
    }

    // Tier 3: default. Current Claude frontier models ship at 1M.
    return CONTEXT_1M;
}

const CONTEXT_1M = 1_000_000;
const CONTEXT_200K = 200_000;

/**
 * Model IDs whose context window is 200K, the exceptions to the 1M default.
 * Matched as lowercase substrings of the Model ID.
 *
 * This list grows rarely: the `haiku` entry already covers the whole Haiku
 * tier (current and future), and the legacy entries are frozen (old models do
 * not change). New frontier models are 1M and need no entry here.
 */
const CONTEXT_200K_MODELS: readonly string[] = [
    'haiku',                 // all Haiku models (200K)
    'claude-3',              // Claude 3.x family
    'claude-opus-4-0',       // Opus 4.0
    'claude-opus-4-1',       // Opus 4.1
    'claude-opus-4-5',       // Opus 4.5
    'claude-opus-4-2025',    // Opus 4.0 (dated ID)
    'claude-sonnet-4-0',     // Sonnet 4.0
    'claude-sonnet-4-5',     // Sonnet 4.5
    'claude-sonnet-4-2025',  // Sonnet 4.0 (dated ID)
];
