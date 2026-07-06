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

    it('user override wins over the 1M default', () => {
        const dict = { 'claude-opus-4-8': 300_000 };
        assert.equal(getContextLimitForModel('claude-opus-4-8', 200_000, dict), 300_000);
    });

    it('user override can raise a 200K model (e.g. Haiku) to 1M', () => {
        const dict = { 'claude-haiku-4-5': 1_000_000 };
        assert.equal(getContextLimitForModel('claude-haiku-4-5', 200_000, dict), 1_000_000);
    });

    it('override is exact Model ID match only', () => {
        const dict = { 'claude-opus': 500_000 };
        // "claude-opus-4-8" does not exactly match "claude-opus", so it falls
        // through to the 1M default.
        assert.equal(getContextLimitForModel('claude-opus-4-8', 200_000, dict), 1_000_000);
    });

    // Tier 2: known 200K exceptions (Haiku + legacy)

    it('Haiku 4.5 resolves to 200K', () => {
        assert.equal(getContextLimitForModel('claude-haiku-4-5-20251001', 200_000, emptyDict), 200_000);
    });

    it('any Haiku resolves to 200K (future-proof pattern)', () => {
        assert.equal(getContextLimitForModel('claude-haiku-5', 200_000, emptyDict), 200_000);
    });

    it('Sonnet 4.5 resolves to 200K', () => {
        assert.equal(getContextLimitForModel('claude-sonnet-4-5', 200_000, emptyDict), 200_000);
    });

    it('Sonnet 4.5 dated ID resolves to 200K', () => {
        assert.equal(getContextLimitForModel('claude-sonnet-4-5-20250929', 200_000, emptyDict), 200_000);
    });

    it('Opus 4.5 resolves to 200K', () => {
        assert.equal(getContextLimitForModel('claude-opus-4-5', 200_000, emptyDict), 200_000);
    });

    it('Opus 4.1 resolves to 200K', () => {
        assert.equal(getContextLimitForModel('claude-opus-4-1-20250805', 200_000, emptyDict), 200_000);
    });

    it('Opus 4.0 dated ID resolves to 200K', () => {
        assert.equal(getContextLimitForModel('claude-opus-4-20250514', 200_000, emptyDict), 200_000);
    });

    it('Claude 3.x family resolves to 200K', () => {
        assert.equal(getContextLimitForModel('claude-3-5-sonnet-20241022', 200_000, emptyDict), 200_000);
    });

    // Tier 3: default 1M for current frontier models

    it('Opus 4.8 resolves to 1M by default', () => {
        assert.equal(getContextLimitForModel('claude-opus-4-8', 200_000, emptyDict), 1_000_000);
    });

    it('Opus 4.6 resolves to 1M', () => {
        assert.equal(getContextLimitForModel('claude-opus-4-6', 200_000, emptyDict), 1_000_000);
    });

    it('Sonnet 4.6 resolves to 1M', () => {
        assert.equal(getContextLimitForModel('claude-sonnet-4-6', 200_000, emptyDict), 1_000_000);
    });

    it('Sonnet 5 resolves to 1M', () => {
        assert.equal(getContextLimitForModel('claude-sonnet-5', 200_000, emptyDict), 1_000_000);
    });

    it('Fable 5 resolves to 1M', () => {
        assert.equal(getContextLimitForModel('claude-fable-5', 200_000, emptyDict), 1_000_000);
    });

    it('unknown future Claude model defaults to 1M (no code change needed)', () => {
        assert.equal(getContextLimitForModel('claude-opus-9-99', 200_000, emptyDict), 1_000_000);
    });

    it('resolves regardless of case', () => {
        assert.equal(getContextLimitForModel('CLAUDE-OPUS-4-8', 200_000, emptyDict), 1_000_000);
        assert.equal(getContextLimitForModel('Claude-Haiku-4-5', 200_000, emptyDict), 200_000);
    });

    // Tier 4: unknown / non-Claude IDs fall back to userLimit

    it('empty model string uses the fallback', () => {
        assert.equal(getContextLimitForModel('', 200_000, emptyDict), 200_000);
    });

    it('whitespace-only model string uses the fallback', () => {
        assert.equal(getContextLimitForModel('   ', 200_000, emptyDict), 200_000);
    });

    it('synthetic model marker uses the fallback', () => {
        assert.equal(getContextLimitForModel('<synthetic>', 200_000, emptyDict), 200_000);
    });

    it('non-Claude model uses the fallback', () => {
        assert.equal(getContextLimitForModel('gpt-5', 200_000, emptyDict), 200_000);
    });

    it('custom fallback is honored for unknown models', () => {
        assert.equal(getContextLimitForModel('<synthetic>', 500_000, emptyDict), 500_000);
    });

    it('override for empty string beats the fallback', () => {
        const dict = { '': 999_000 };
        assert.equal(getContextLimitForModel('', 200_000, dict), 999_000);
    });
});
