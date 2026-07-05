import { describe, it, expect } from 'vitest';
import { getContextLimitForModel } from './contextLimit';

describe('getContextLimitForModel', () => {
    const emptyDict: Record<string, number> = {};

    // ═══════════════════════════════════════════════════════════════════
    // Tier 1: User configuration (modelContextLimits) — highest priority
    // ═══════════════════════════════════════════════════════════════════

    it('returns configured value when model is in modelContextLimits', () => {
        const dict = { 'claude-opus-4-8': 500_000 };
        expect(getContextLimitForModel('claude-opus-4-8', 200_000, dict)).toBe(500_000);
    });

    it('user config overrides Sonnet 5 auto-detection', () => {
        const dict = { 'claude-sonnet-5': 300_000 };
        expect(getContextLimitForModel('claude-sonnet-5', 200_000, dict)).toBe(300_000);
    });

    it('user config overrides fallback even for hard-capped models like Haiku 4.5', () => {
        const dict = { 'claude-haiku-4-5': 1_000_000 };
        expect(getContextLimitForModel('claude-haiku-4-5', 200_000, dict)).toBe(1_000_000);
    });

    it('exact model ID match only — no partial or prefix matching', () => {
        const dict = { 'claude-sonnet': 500_000 };
        // "claude-sonnet-5" does not exactly match "claude-sonnet"
        expect(getContextLimitForModel('claude-sonnet-5', 200_000, dict)).toBe(1_000_000);
    });

    it('user config entry for a different model does not affect other models', () => {
        const dict = { 'claude-opus-4-8': 500_000 };
        expect(getContextLimitForModel('claude-haiku-4-5', 200_000, dict)).toBe(200_000);
    });

    // ═══════════════════════════════════════════════════════════════════
    // Tier 2: Auto-detection — Sonnet 5 → 1,000,000
    // ═══════════════════════════════════════════════════════════════════

    it('returns 1M for claude-sonnet-5 with no user config', () => {
        expect(getContextLimitForModel('claude-sonnet-5', 200_000, emptyDict)).toBe(1_000_000);
    });

    it('returns 1M for claude-sonnet-5 regardless of case', () => {
        expect(getContextLimitForModel('CLAUDE-SONNET-5', 200_000, emptyDict)).toBe(1_000_000);
    });

    it('returns 1M for mixed-case Claude-Sonnet-5', () => {
        expect(getContextLimitForModel('Claude-Sonnet-5', 200_000, emptyDict)).toBe(1_000_000);
    });

    it('returns 1M for claude-sonnet-5 with date suffix', () => {
        expect(getContextLimitForModel('claude-sonnet-5-20251001', 200_000, emptyDict)).toBe(1_000_000);
    });

    it('claude-sonnet-5 substring match does not collide with claude-sonnet-4-5', () => {
        // "claude-sonnet-4-5" does NOT contain "claude-sonnet-5" as substring
        expect(getContextLimitForModel('claude-sonnet-4-5', 200_000, emptyDict)).toBe(200_000);
    });

    it('claude-sonnet-5 substring match does not collide with claude-sonnet-4-6', () => {
        expect(getContextLimitForModel('claude-sonnet-4-6', 200_000, emptyDict)).toBe(200_000);
    });

    // ═══════════════════════════════════════════════════════════════════
    // Tier 3: Global fallback — userLimit
    // ═══════════════════════════════════════════════════════════════════

    it('returns userLimit when model is not in dict and is not Sonnet 5', () => {
        expect(getContextLimitForModel('claude-opus-4-8', 200_000, emptyDict)).toBe(200_000);
    });

    it('returns custom userLimit for unknown model', () => {
        expect(getContextLimitForModel('claude-opus-4-8', 500_000, emptyDict)).toBe(500_000);
    });

    it('returns userLimit for claude-haiku-4-5', () => {
        expect(getContextLimitForModel('claude-haiku-4-5', 200_000, emptyDict)).toBe(200_000);
    });

    it('returns userLimit for empty model string', () => {
        expect(getContextLimitForModel('', 200_000, emptyDict)).toBe(200_000);
    });

    it('returns userLimit for whitespace-only model string', () => {
        expect(getContextLimitForModel('   ', 200_000, emptyDict)).toBe(200_000);
    });

    it('returns userLimit for future/unknown model IDs', () => {
        expect(getContextLimitForModel('claude-future-model-99', 200_000, emptyDict)).toBe(200_000);
    });

    // ═══════════════════════════════════════════════════════════════════
    // Edge cases
    // ═══════════════════════════════════════════════════════════════════

    it('user config for empty string model overrides fallback', () => {
        const dict = { '': 999_000 };
        expect(getContextLimitForModel('', 200_000, dict)).toBe(999_000);
    });

    it('removing a model from dict falls through to auto-detection', () => {
        // Simulates: model was in dict, user removed it → falls through to tier 2/3
        // Sonnet 5 without user config → auto-detected as 1M
        expect(getContextLimitForModel('claude-sonnet-5', 200_000, emptyDict)).toBe(1_000_000);
    });

    it('non-Sonnet-5 model removed from dict falls through to fallback', () => {
        // Simulates: haiku was in dict, user removed it → falls through to tier 3
        expect(getContextLimitForModel('claude-haiku-4-5', 200_000, emptyDict)).toBe(200_000);
    });

    it('old sonnet+1m heuristic no longer applies — claude-sonnet-4-5-1m falls back', () => {
        // The old heuristic (sonnet + 1m) is removed. Non-Sonnet-5 models with "1m"
        // in the name no longer auto-detect as 1M.
        expect(getContextLimitForModel('claude-sonnet-4-5-1m', 200_000, emptyDict)).toBe(200_000);
    });

    it('default contextLimit of 200000 is used when no config overrides', () => {
        expect(getContextLimitForModel('claude-haiku-4-5', 200_000, emptyDict)).toBe(200_000);
    });
});
