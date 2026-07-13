import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseUsage } from './usage';

// A response shaped like the real GET /api/oauth/usage body, trimmed to the
// fields the parser reads.
function realBody() {
    return {
        five_hour: { utilization: 30.0, resets_at: '2026-07-12T18:50:00.02+00:00' },
        seven_day: { utilization: 16.0, resets_at: '2026-07-14T00:00:00.02+00:00' },
        seven_day_opus: null,
        limits: [
            { kind: 'session', group: 'session', percent: 30, resets_at: '2026-07-12T18:50:00.02+00:00', scope: null, is_active: true },
            { kind: 'weekly_all', group: 'weekly', percent: 16, resets_at: '2026-07-14T00:00:00.02+00:00', scope: null, is_active: false },
            { kind: 'weekly_scoped', group: 'weekly', percent: 0, resets_at: null, scope: { model: { id: null, display_name: 'Fable' } }, is_active: false },
        ],
        member_dashboard_available: false,
    };
}

describe('parseUsage — limits array (real response)', () => {
    it('returns null for empty / non-object / no-limits bodies', () => {
        assert.equal(parseUsage(null), null);
        assert.equal(parseUsage({}), null);
        assert.equal(parseUsage({ member_dashboard_available: false }), null);
    });

    it('maps the three limits to labeled meters in order', () => {
        const data = parseUsage(realBody());
        assert.ok(data);
        assert.deepEqual(
            data!.meters.map((m) => m.label),
            ['Session (5h)', 'Weekly (all models)', 'Weekly Fable'],
        );
        assert.deepEqual(data!.meters.map((m) => m.percentage), [30, 16, 0]);
    });

    it('identifies the session meter for the status bar', () => {
        const data = parseUsage(realBody());
        assert.equal(data!.session!.label, 'Session (5h)');
        assert.equal(data!.session!.percentage, 30);
        assert.equal(data!.session!.isActive, true);
    });

    it('parses ISO reset timestamps and tolerates null', () => {
        const data = parseUsage(realBody());
        assert.ok(data!.meters[0].resetsAt instanceof Date);
        assert.equal(data!.meters[2].resetsAt, null);
    });

    it('derives scoped weekly labels from the model display name', () => {
        const body = {
            limits: [
                { kind: 'session', percent: 5, is_active: true },
                { kind: 'weekly_scoped', percent: 2, scope: { model: { display_name: 'Opus' } } },
            ],
        };
        const data = parseUsage(body);
        assert.equal(data!.meters[1].label, 'Weekly Opus');
        // Scoped meters get distinct keys so multiple models don't collide.
        assert.equal(data!.meters[1].key, 'weekly_scoped:Opus');
    });

    it('humanizes an unknown limit kind', () => {
        const data = parseUsage({ limits: [{ kind: 'monthly_special', percent: 3 }] });
        assert.equal(data!.meters[0].label, 'Monthly Special');
    });

    it('skips limits without a usable percent', () => {
        const data = parseUsage({
            limits: [
                { kind: 'session', percent: 30, is_active: true },
                { kind: 'weekly_all' },
            ],
        });
        assert.deepEqual(data!.meters.map((m) => m.label), ['Session (5h)']);
    });

    it('clamps and rounds percentages', () => {
        const data = parseUsage({ limits: [{ kind: 'session', percent: 28.6 }, { kind: 'weekly_all', percent: 140 }] });
        assert.equal(data!.meters[0].percentage, 29);
        assert.equal(data!.meters[1].percentage, 100);
    });
});

describe('parseUsage — fallback (no limits array)', () => {
    it('reads flat top-level windows when limits is absent', () => {
        const data = parseUsage({
            five_hour: { utilization: 7, resets_at: 1_800_000_000 },
            seven_day: { utilization: 14 },
            member_dashboard_available: false,
        });
        assert.equal(data!.session!.label, 'Session (5h)');
        assert.equal(data!.session!.percentage, 7);
        assert.deepEqual(data!.meters.map((m) => m.key), ['five_hour', 'seven_day']);
    });

    it('accepts a rate_limits wrapper and Unix-epoch resets', () => {
        const epoch = 1_800_000_000;
        const data = parseUsage({ rate_limits: { five_hour: { utilization: 10, resets_at: epoch } } });
        assert.equal(data!.session!.resetsAt!.getTime(), epoch * 1000);
    });

    it('ignores non-window keys and null meters', () => {
        const data = parseUsage({
            five_hour: { utilization: 7 },
            seven_day_opus: null,
            extra_usage: { utilization: 13.9 },
            spend: { used: {} },
        });
        assert.deepEqual(data!.meters.map((m) => m.key), ['five_hour']);
    });

    it('falls back to used_percentage', () => {
        const data = parseUsage({ five_hour: { used_percentage: 42 } });
        assert.equal(data!.session!.percentage, 42);
    });
});
