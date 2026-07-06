import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getContextLimitForModel } from './contextLimit';

describe('getContextLimitForModel', () => {
    const emptyDict: Record<string, number> = {};

    // Tier 1: user configuration (modelContextLimits)  highest priority

    it('returns configured value when model is in modelContextLimits', () => {
        const dict = { 'claude-opus-4-8': 500_000 };
        assert.equal(getContextLimitForModel('claude-opus-4-8', 200_000, dict), 500_000);
    });

    it('user config overrides Sonnet 5 auto-detection', () => {
        const dict = { 'claude-sonnet-5': 300_000 };
        assert.equal(getContextLimitForModel('claude-sonnet-5', 200_000, dict), 300_000);
    });

    it('user config overrides fallback even for hard-capped models like Haiku 4.5', () => {
        const dict = { 'claude-haiku-4-5': 1_000_000 };
        assert.equal(getContextLimitForModel('claude-haiku-4-5', 200_000, dict), 1_000_000);
    });

    it('exact model ID match only  no partial or prefix matching', () => {
        const dict = { 'claude-sonnet': 500_000 };
        // "claude-sonnet-5" does not exactly match "claude-sonnet", so tier 1
        // misses and tier 2 auto-detects it as 1M.
        assert.equal(getContextLimitForModel('claude-sonnet-5', 200_000, dict), 1_000_000);
    });

    it('user config entry for a different model does not affect other models', () => {
        const dict = { 'claude-opus-4-8': 500_000 };
        assert.equal(getContextLimitForModel('claude-haiku-4-5', 200_000, dict), 200_000);
    });

    // Tier 2: auto-detection  Sonnet 5 -> 1,000,000

    it('returns 1M for claude-sonnet-5 with no user config', () => {
        assert.equal(getContextLimitForModel('claude-sonnet-5', 200_000, emptyDict), 1_000_000);
    });

    it('returns 1M for claude-sonnet-5 regardless of case', () => {
        assert.equal(getContextLimitForModel('CLAUDE-SONNET-5', 200_000, emptyDict), 1_000_000);
    });

    it('returns 1M for mixed-case Claude-Sonnet-5', () => {
        assert.equal(getContextLimitForModel('Claude-Sonnet-5', 200_000, emptyDict), 1_000_000);
    });

    it('returns 1M for claude-sonnet-5 with date suffix', () => {
        assert.equal(getContextLimitForModel('claude-sonnet-5-20251001', 200_000, emptyDict), 1_000_000);
    });

    it('claude-sonnet-5 substring match does not collide with claude-sonnet-4-5', () => {
        assert.equal(getContextLimitForModel('claude-sonnet-4-5', 200_000, emptyDict), 200_000);
    });

    it('claude-sonnet-5 substring match does not collide with claude-sonnet-4-6', () => {
        assert.equal(getContextLimitForModel('claude-sonnet-4-6', 200_000, emptyDict), 200_000);
    });

    // Tier 3: global fallback  userLimit

    it('returns userLimit when model is not in dict and is not Sonnet 5', () => {
        assert.equal(getContextLimitForModel('claude-opus-4-8', 200_000, emptyDict), 200_000);
    });

    it('returns custom userLimit for unknown model', () => {
        assert.equal(getContextLimitForModel('claude-opus-4-8', 500_000, emptyDict), 500_000);
    });

    it('returns userLimit for claude-haiku-4-5', () => {
        assert.equal(getContextLimitForModel('claude-haiku-4-5', 200_000, emptyDict), 200_000);
    });

    it('returns userLimit for empty model string', () => {
        assert.equal(getContextLimitForModel('', 200_000, emptyDict), 200_000);
    });

    it('returns userLimit for whitespace-only model string', () => {
        assert.equal(getContextLimitForModel('   ', 200_000, emptyDict), 200_000);
    });

    it('returns userLimit for future/unknown model IDs', () => {
        assert.equal(getContextLimitForModel('claude-future-model-99', 200_000, emptyDict), 200_000);
    });

    // Edge cases

    it('user config for empty string model overrides fallback', () => {
        const dict = { '': 999_000 };
        assert.equal(getContextLimitForModel('', 200_000, dict), 999_000);
    });

    it('removing a model from dict falls through to auto-detection', () => {
        // Sonnet 5 without user config -> auto-detected as 1M.
        assert.equal(getContextLimitForModel('claude-sonnet-5', 200_000, emptyDict), 1_000_000);
    });

    it('non-Sonnet-5 model removed from dict falls through to fallback', () => {
        assert.equal(getContextLimitForModel('claude-haiku-4-5', 200_000, emptyDict), 200_000);
    });

    it('old sonnet+1m heuristic no longer applies  claude-sonnet-4-5-1m falls back', () => {
        // The old heuristic (sonnet + 1m) is removed. Non-universal models with
        // "1m" in the name no longer auto-detect as 1M.
        assert.equal(getContextLimitForModel('claude-sonnet-4-5-1m', 200_000, emptyDict), 200_000);
    });

    it('default contextLimit of 200000 is used when no config overrides', () => {
        assert.equal(getContextLimitForModel('claude-haiku-4-5', 200_000, emptyDict), 200_000);
    });
});
