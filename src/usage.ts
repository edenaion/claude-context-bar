/**
 * Claude subscription usage ("/usage") — the 5-hour session and weekly rate
 * limits shown by Claude Code's `/usage` command.
 *
 * Unlike context usage (computed from local JSONL files), this data lives only
 * behind an authenticated Anthropic endpoint. We replicate exactly what Claude
 * Code itself does on the user's machine:
 *
 *   1. Read the OAuth access token from the OS credential store
 *      (macOS Keychain item "Claude Code-credentials", or ~/.claude/.credentials.json).
 *   2. GET https://api.anthropic.com/api/oauth/usage with that Bearer token.
 *   3. Read `rate_limits.<window>` meters ({ utilization, resets_at }).
 *
 * The token is only ever used as a request header and is never logged.
 *
 * CAVEAT: /api/oauth/usage is undocumented — its structure was reverse-engineered
 * from the Claude Code binary and verified against live responses, so it may
 * change without notice. Parsing is intentionally defensive (two schema paths,
 * tolerant field reading) and degrades to null rather than throwing.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as crypto from 'crypto';
import { execFile } from 'child_process';

export interface UsageMeter {
    key: string;
    label: string;
    percentage: number;
    resetsAt: Date | null;
    /** Whether this is the limit currently binding the account. */
    isActive: boolean;
}

export interface UsageData {
    /** The 5-hour session meter, shown in the status bar. Null if absent. */
    session: UsageMeter | null;
    /** Every meter present, for the tooltip (session first, then weekly ones). */
    meters: UsageMeter[];
}

/**
 * Labels for the `limits[].kind` values that aren't derived from a model scope.
 * `session` and `weekly_all` are handled explicitly; scoped windows (Opus,
 * Sonnet, Fable) use their server-supplied model display name.
 */
const LIMIT_KIND_LABELS: Record<string, string> = {
    session: 'Session (5h)',
    weekly_all: 'Weekly (all models)',
    weekly_opus: 'Weekly (Opus)',
    weekly_sonnet: 'Weekly (Sonnet)',
};

/**
 * Labels for the flat top-level meter keys, used only on the fallback path when
 * the response has no `limits` array.
 */
const METER_LABELS: Record<string, string> = {
    five_hour: 'Session (5h)',
    seven_day: 'Weekly (all models)',
    seven_day_opus: 'Weekly (Opus)',
    seven_day_sonnet: 'Weekly (Sonnet)',
    seven_day_oauth_apps: 'Weekly (apps)',
};

function humanizeKey(key: string): string {
    return key
        .split(/[_\s]+/)
        .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');
}

/**
 * The macOS Keychain service name Claude Code stores its credentials under.
 * Mirrors Claude Code's own derivation: "Claude Code-credentials", with an
 * 8-char config-dir hash suffix appended when a non-default CLAUDE_CONFIG_DIR
 * (or CLAUDE_SECURESTORAGE_CONFIG_DIR) is in use.
 */
function keychainServiceName(): string {
    const secureDir = process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;
    const configDir = process.env.CLAUDE_CONFIG_DIR;

    const isDefault = secureDir !== undefined ? !secureDir : !configDir;
    if (isDefault) {
        return 'Claude Code-credentials';
    }

    const dir = (secureDir !== undefined ? secureDir : configDir || '').normalize('NFC');
    const hash = crypto.createHash('sha256').update(dir).digest('hex').substring(0, 8);
    return `Claude Code-credentials-${hash}`;
}

function keychainAccount(): string {
    try {
        return process.env.USER || os.userInfo().username;
    } catch {
        return 'claude-code-user';
    }
}

function extractAccessToken(raw: string): string | null {
    try {
        const parsed = JSON.parse(raw);
        const token = parsed?.claudeAiOauth?.accessToken;
        return typeof token === 'string' && token.length > 0 ? token : null;
    } catch {
        return null;
    }
}

function readTokenFromCredentialsFile(): string | null {
    const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const file = path.join(configDir, '.credentials.json');
    try {
        if (!fs.existsSync(file)) {
            return null;
        }
        return extractAccessToken(fs.readFileSync(file, 'utf-8'));
    } catch {
        return null;
    }
}

function readTokenFromKeychain(): Promise<string | null> {
    return new Promise((resolve) => {
        execFile(
            'security',
            ['find-generic-password', '-a', keychainAccount(), '-w', '-s', keychainServiceName()],
            { timeout: 5000 },
            (err, stdout) => {
                if (err || !stdout) {
                    resolve(null);
                    return;
                }
                resolve(extractAccessToken(stdout.trim()));
            },
        );
    });
}

/**
 * Read the Claude Code OAuth access token from the OS credential store.
 * Returns null if unavailable (not logged in, API-key auth, etc.).
 */
export async function readOAuthToken(): Promise<string | null> {
    if (process.platform === 'darwin') {
        const fromKeychain = await readTokenFromKeychain();
        if (fromKeychain) {
            return fromKeychain;
        }
    }
    // Linux/Windows store a plaintext file; also a fallback on macOS.
    return readTokenFromCredentialsFile();
}

/** Pull a 0-100 percentage out of a meter object, tolerating schema variants. */
function readPercentage(meter: any): number | null {
    if (!meter || typeof meter !== 'object') {
        return null;
    }
    // `percent` (limits array) → `utilization` (flat meters) → `used_percentage`.
    let value = meter.percent;
    if (typeof value !== 'number') {
        value = meter.utilization;
    }
    if (typeof value !== 'number') {
        value = meter.used_percentage;
    }
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return null;
    }
    // The endpoint reports these already as 0-100 percentages.
    return Math.max(0, Math.min(100, Math.round(value)));
}

/** Parse a reset time given as an ISO string or Unix epoch seconds. */
function readResetsAt(meter: any): Date | null {
    const value = meter?.resets_at;
    if (typeof value === 'number') {
        return new Date(value * 1000);
    }
    if (typeof value === 'string' && value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}

function labelForLimit(entry: any): string {
    const kind = String(entry?.kind ?? '');
    if (kind === 'session' || kind === 'weekly_all') {
        return LIMIT_KIND_LABELS[kind];
    }
    const scopedName = entry?.scope?.model?.display_name;
    if (typeof scopedName === 'string' && scopedName) {
        return `Weekly ${scopedName}`;
    }
    return LIMIT_KIND_LABELS[kind] || humanizeKey(kind || 'limit');
}

/**
 * Parse the canonical `limits` array (what the /usage UI renders). Each entry
 * is `{ kind, group, percent, severity, resets_at, scope, is_active }`.
 */
function parseFromLimits(limits: any[]): UsageData | null {
    const meters: UsageMeter[] = [];
    let session: UsageMeter | null = null;

    for (const entry of limits) {
        const percentage = readPercentage(entry);
        if (percentage === null) {
            continue;
        }
        const label = labelForLimit(entry);
        // Distinct key per scoped model so multiple weekly buckets don't collide.
        const scopedName = entry?.scope?.model?.display_name;
        const key = scopedName ? `${entry?.kind}:${scopedName}` : String(entry?.kind ?? label);
        const meter: UsageMeter = {
            key,
            label,
            percentage,
            resetsAt: readResetsAt(entry),
            isActive: entry?.is_active === true,
        };
        meters.push(meter);
        if (entry?.kind === 'session' && !session) {
            session = meter;
        }
    }

    return meters.length ? { session, meters } : null;
}

/**
 * Fallback parser for responses without a `limits` array: read the flat
 * top-level windows (`five_hour`, `seven_day`, `seven_day_*`).
 */
function parseFromKeyedMeters(source: Record<string, any>): UsageData | null {
    const meters: UsageMeter[] = [];

    for (const [key, raw] of Object.entries(source)) {
        if (key !== 'five_hour' && !key.startsWith('seven_day')) {
            continue;
        }
        const percentage = readPercentage(raw);
        if (percentage === null) {
            continue;
        }
        meters.push({
            key,
            label: METER_LABELS[key] || humanizeKey(key),
            percentage,
            resetsAt: readResetsAt(raw),
            isActive: false,
        });
    }

    if (!meters.length) {
        return null;
    }

    meters.sort((a, b) => (a.key === 'five_hour' ? -1 : b.key === 'five_hour' ? 1 : 0));
    return { session: meters.find((m) => m.key === 'five_hour') || null, meters };
}

/**
 * Pure parser for the /api/oauth/usage response body. Exposed for testing.
 * Returns null when there are no subscription rate limits (e.g. API-key auth).
 */
export function parseUsage(body: any): UsageData | null {
    if (!body || typeof body !== 'object') {
        return null;
    }
    // Preferred: the self-describing `limits` array (mirrors the /usage UI).
    if (Array.isArray(body.limits) && body.limits.length > 0) {
        return parseFromLimits(body.limits);
    }
    // Fallback: flat top-level windows, or a `rate_limits` wrapper.
    const source = body.rate_limits && typeof body.rate_limits === 'object' ? body.rate_limits : body;
    return parseFromKeyedMeters(source);
}

/**
 * Fetch and parse the usage endpoint. Returns null on any failure.
 * `claudeCodeVersion` is the installed Claude Code version (from the IDE
 * extension) used for the User-Agent; falls back to a version-less UA.
 */
export function fetchUsage(token: string, claudeCodeVersion?: string | null): Promise<UsageData | null> {
    const userAgent = claudeCodeVersion ? `claude-code/${claudeCodeVersion}` : 'claude-code';
    return new Promise((resolve) => {
        const req = https.request(
            {
                hostname: 'api.anthropic.com',
                path: '/api/oauth/usage',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    // Identifying as the Claude Code client is required to hit
                    // less aggressive rate limiting on this endpoint.
                    'User-Agent': userAgent,
                },
                timeout: 5000,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        resolve(null);
                        return;
                    }
                    try {
                        resolve(parseUsage(JSON.parse(data)));
                    } catch {
                        resolve(null);
                    }
                });
            },
        );
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
        req.end();
    });
}

/** Read the token and fetch usage in one step. Returns null on any failure. */
export async function getUsage(claudeCodeVersion?: string | null): Promise<UsageData | null> {
    const token = await readOAuthToken();
    if (!token) {
        return null;
    }
    return fetchUsage(token, claudeCodeVersion);
}
