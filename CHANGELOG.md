# Changelog

All notable changes to the Claude Context Bar extension will be documented in this file.

## [1.6.0] - 2026-07-24

### Added
- **Subscription usage monitor** — shows your Claude `/usage` Session (5-hour) limit as a separate status bar item (e.g. `✴️ 7%`) to the right of the context items.
  - Usage percentage has its own warning/danger colors, independent of the context colors, via `usageWarningThreshold` (default 50) and `usageDangerThreshold` (default 75).
  - Hover tooltip shows all subscription limits — Session (5h), Weekly (all models), and any scoped weekly limits (e.g. Weekly Fable) — with reset times.
  - Data comes from the authenticated `GET /api/oauth/usage` endpoint, using the OAuth token from the OS credential store (macOS Keychain or `~/.claude/.credentials.json`), exactly as Claude Code does. The token is only used as a request header and is never logged.
  - Refreshes on its own cadence (`usageRefreshInterval`, default 60s), keeps the last known value on transient failures.
  - Toggle with the `showUsage` setting (default on). Automatically hides when not signed in with a subscription (e.g. API-key auth).
  - Note: `/api/oauth/usage` is an undocumented endpoint reverse-engineered from Claude Code; its response shape may change without notice. The parser is defensive (two schema paths, tolerant field reading) and degrades to hiding the item rather than erroring.
- Unit tests for the usage response parser (`parseUsage`), covering the canonical `limits` array and the flat-meter fallback.

## [1.5.1] - 2026-07-22

### Changed
☼ `idleTimeout` no longer capped at 600 seconds: any value up to 9999999 is accepted, and `0` disables the timeout entirely so idle sessions never hide (#7)

### Added
☼ Sessions rescan when the VS Code window regains focus, so a resumed session's bar returns as soon as it has fresh activity instead of waiting for the next poll (#6)

## [1.5.0] - 2026-07-06

### Changed
☼ **Context limit auto-detection rewritten** to default to 1M and list the 200K exceptions, instead of the old `sonnet` + `1m` heuristic that missed nearly every model.

  ☼ **1M by default**: every current Claude model (Opus 4.6+, Sonnet 4.6+, Sonnet 5, Fable 5, and anything newer) resolves to 1,000,000 tokens. New models are detected automatically with no extension update.
  
  ☼ **200K exceptions**: Haiku (all versions) and legacy generations (Claude 3.x, Sonnet 4.5 and earlier, Opus 4.5 and earlier) resolve to 200,000.
  
  ☼ **Fallback**: unknown or non-Claude Model IDs use the `contextLimit` setting (default 200,000).
  
☼ Extracted the resolution into a pure `getContextLimitForModel` function.

### Added
☼ `claudeContextBar.modelContextLimits` setting: per-model overrides (object, default `{}`). Exact Model ID match, highest priority. No model is force-capped.

☼ Unit test suite (25 tests) run with Node's built-in test runner (`npm test`, no extra dependencies).

## [1.4.1] - 2025-12-29

### Fixed
- Added compact mode documentation to README

## [1.4.0] - 2025-12-29

### Added
- **Compact Mode**: Shorten project names to save status bar space
  - Multi-word names become acronyms (my-cool-project → MCP)
  - Single words become abbreviated (typescript → Tscript)
  - Names 5 characters or less stay unchanged
  - Session numbers preserved (MCP-2, MCP-3)
- **Custom Short Names**: Define your own abbreviations via `shortNames` setting
- **Instant Settings Refresh**: All settings now apply immediately without waiting for next refresh cycle

## [1.3.0] - 2025-12-24

### Added
- **Click to Hide**: Click any status bar item to temporarily hide it
  - Hidden sessions automatically reappear when there's new activity
  - Great for dismissing stale sessions you're not actively using
- **Configurable Idle Timeout**: New `idleTimeout` setting (default: 180 seconds / 3 minutes)
  - Sessions inactive longer than this are automatically hidden
  - Reduced from previous hardcoded 5 minutes
  - Range: 10-600 seconds

### Fixed
- **Project Name Display**: Fixed deeply nested paths showing full folder chain
  - Now correctly shows last 3 path segments (e.g., "claude-context-bar" instead of "Tools-extensions-vscode-claude-context-bar")

## [1.2.2] - 2025-12-23

### Fixed
- Documentation updates

## [1.2.1] - 2025-12-23

### Fixed
- **Project Name Display**: Fixed issue where parent folder (e.g., "dev") was incorrectly included in project names
  - Now correctly shows "my-project" instead of "dev-my-project"
- **Tooltip Cleanup**: Removed confusing "New Input" row (always showed ~8 tokens)

## [1.2.0] - 2025-12-22

### Added
- **Smart Session Detection**: Automatically detects and hides "ghost" sessions
  - Sessions are hidden immediately when superseded by a newer session
  - Properly handles `/clear` command scenarios
  - No more lingering status bar items from closed tabs
- **First Message in Tooltip**: Shows the first message of each session to help identify which Claude Code tab it corresponds to

### Fixed
- Ghost sessions no longer appear after running `/clear` and continuing work
- Improved session lifecycle tracking using creation timestamps

## [1.1.3] - 2025-12-22

### Added
- **Fuzzy Emoji Matching**: Icons automatically match project type based on name keywords
  - Music projects (🎵), games (🎮), web (🌐), mobile (📱), AI (🤖), and more
- `showEmoji` setting to toggle emoji display on/off (default: on)

## [1.1.2] - 2025-12-22

### Added
- Now available on [Open VSX Registry](https://open-vsx.org/extension/ezoosk/claude-context-bar) for Antigravity, VSCodium, and other VS Code forks
- Automated dual-publishing to both VS Code Marketplace and Open VSX

## [1.1.0] - 2025-12-22

### Added
- **Auto Color Mode**: Pastel color palette assigns different colors to each project automatically
- **Base Color Selection**: When auto-color is off, choose a base color with subtle variations per project
- **Auto Context Limit Detection**: Automatically detects model (Sonnet 4.5 1M vs others) and adjusts context limit
- Model name now displayed in tooltip

### Changed
- Color palette changed to softer pastel colors for better readability

## [1.0.0] - 2025-12-22

### Added
- Real-time context window usage monitoring for Claude Code sessions
- Status bar indicators for each active Claude Code tab
- Color-coded warnings: yellow at 50%, red at 75%
- Detailed tooltip with token breakdown (cache read, cache creation, new input)
- Configurable context limit, thresholds, and refresh interval
- Auto-refresh on file changes and periodic polling
- Automatic cleanup of stale sessions (5-minute timeout)
- Excludes Claude Memory background processes from display
