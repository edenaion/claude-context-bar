import { describe, it, expect } from 'vitest';
import { getContextLimitForModel } from './contextLimit';

describe('getContextLimitForModel', () => {
    const emptyDict: Record<string, number> = {};

    // ── Acceptance criteria: sonnet + 1m → 1M ──────────────────────

    it('returns 1M when model contains "sonnet" and "1m"', () => {
        expect(getContextLimitForModel('claude-sonnet-4-5-1m', 200_000, emptyDict)).toBe(1_000_000);
    });

    it('returns 1M for "sonnet"+"1m" regardless of case', () => {
        expect(getContextLimitForModel('CLAUDE-SONNET-5-1M', 200_000, emptyDict)).toBe(1_000_000);
    });

    it('returns 1M for mixed-case "SoNnEt"+"1M"', () => {
        expect(getContextLimitForModel('claude-SoNnEt-4-5-1M', 200_000, emptyDict)).toBe(1_000_000);
    });

    it('returns 1M when "1m" appears before "sonnet" in the model string', () => {
        expect(getContextLimitForModel('claude-1m-sonnet-5', 200_000, emptyDict)).toBe(1_000_000);
    });

    // ── Acceptance criteria: model without "sonnet"+"1m" → fallback ─

    it('returns userLimit when model does not contain "sonnet"', () => {
        expect(getContextLimitForModel('claude-opus-4-8', 200_000, emptyDict)).toBe(200_000);
    });

    it('returns userLimit when model contains "sonnet" but not "1m"', () => {
        expect(getContextLimitForModel('claude-sonnet-4-5', 200_000, emptyDict)).toBe(200_000);
    });

    it('returns userLimit when model contains "1m" but not "sonnet"', () => {
        expect(getContextLimitForModel('claude-opus-4-8-1m', 200_000, emptyDict)).toBe(200_000);
    });

    it('returns userLimit when model is "claude-haiku-4-5"', () => {
        expect(getContextLimitForModel('claude-haiku-4-5', 200_000, emptyDict)).toBe(200_000);
    });

    it('returns a custom userLimit (not just the default 200K)', () => {
        expect(getContextLimitForModel('claude-opus-4-8', 500_000, emptyDict)).toBe(500_000);
    });

    // ── Acceptance criteria: empty model string → fallback ──────────

    it('returns userLimit when model is an empty string', () => {
        expect(getContextLimitForModel('', 200_000, emptyDict)).toBe(200_000);
    });

    // ── Edge cases ──────────────────────────────────────────────────

    it('returns userLimit when model is a whitespace-only string', () => {
        expect(getContextLimitForModel('   ', 200_000, emptyDict)).toBe(200_000);
    });

    it('handles model string containing a real sonnet model name with 1M context', () => {
        // Real-world model IDs from Claude API
        expect(getContextLimitForModel('claude-sonnet-5-20251001-1m', 200_000, emptyDict)).toBe(1_000_000);
    });
});
