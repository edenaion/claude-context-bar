# Claude Context Bar

**Real-time context window monitor for Claude Code sessions in VS Code**

## Features

🧠 **Live Context Tracking** — See your Claude Code context usage percentage right in the status bar

⚡ **Per-Tab Monitoring** — Each Claude Code tab gets its own context indicator

🎯 **Fuzzy Emoji Matching** — Icons automatically match your project type based on name keywords:
- 🎵 Music/audio projects
- 🎮 Games
- 🌐 Web/frontend
- 📱 Mobile apps
- 🤖 AI/ML projects
- 🔧 Tools/extensions
- And many more...

🎨 **Auto Color Mode** — Each project automatically gets a unique pastel color for easy identification

🔍 **Smart Context Detection** — Automatically sizes the context window per model (1M for current models, 200K for Haiku and legacy), with per-model overrides

⚠️ **Color-Coded Warnings**:
- Normal: Under 50% usage
- Warning (yellow background): 50-75% usage
- Danger (red background): Over 75% usage

📊 **Detailed Tooltips** — Hover to see:
- First message (matches Claude Code tab name)
- Model name
- Cache Read / Cache Creation tokens
- Total context used vs limit
- Last updated time

🔄 **Auto-Refresh** — Updates automatically when sessions change or every 30 seconds

🧹 **Smart Session Detection** — Automatically hides "ghost" sessions when you close tabs or run `/clear`

👆 **Click to Hide** — Click any context bar item to temporarily hide it; reappears on new activity

📐 **Compact Mode** — Shorten project names to save space (my-cool-project → MCP, typescript → Tscript)

## Requirements

- VS Code 1.74.0 or later
- [Claude Code](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) extension installed and active

**Install:**
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ezoosk.claude-context-bar)
- [Open VSX Registry](https://open-vsx.org/extension/ezoosk/claude-context-bar) (for Antigravity, VSCodium, etc.)

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `claudeContextBar.showEmoji` | `true` | Show emoji icons based on project name keywords |
| `claudeContextBar.autoColor` | `true` | Automatically assign unique pastel colors to each project |
| `claudeContextBar.baseColor` | `White` | Base color when Auto Color is off (subtle variations per project) |
| `claudeContextBar.contextLimit` | `200000` | Fallback for unknown or non-Claude model IDs (Claude models are auto-detected) |
| `claudeContextBar.modelContextLimits` | `{}` | Per-model overrides: Model ID → token limit (e.g., `{"claude-haiku-4-5": 500000}`). Exact match, highest priority |
| `claudeContextBar.warningThreshold` | `50` | Percentage for yellow warning |
| `claudeContextBar.dangerThreshold` | `75` | Percentage for red danger |
| `claudeContextBar.refreshInterval` | `30` | Refresh interval in seconds |
| `claudeContextBar.idleTimeout` | `180` | Seconds of inactivity before hiding a session (3 minutes). Set `0` to never hide idle sessions |
| `claudeContextBar.compactMode` | `false` | Shorten project names to save status bar space |
| `claudeContextBar.shortNames` | `{}` | Custom short names for projects (e.g., `{"my-project": "MP"}`) |

## How It Works

The extension reads Claude Code's session files from `~/.claude/projects/` and calculates token usage from the JSONL logs. It resolves the context limit per model using this priority chain:

1. **User override** — the `modelContextLimits` setting (exact Model ID match). Highest priority, overrides everything below.
2. **200K models** — Haiku and legacy generations (Claude 3.x, Sonnet 4.5 and earlier, Opus 4.5 and earlier) resolve to 200,000 tokens.
3. **1M default** — every other current Claude model resolves to 1,000,000 tokens (Opus 4.6+, Sonnet 4.6+, Sonnet 5, Fable 5, and anything newer).
4. **Fallback** — unknown or non-Claude Model IDs use the `contextLimit` setting (default 200,000).

Claude session files record only the Model ID, with no context-window field, so the limit is inferred from the ID. The default is 1M because current frontier models all ship with a 1M window, which means new models resolve correctly with no update needed. Haiku and legacy models are the 200K exceptions. If any model is ever mis-sized (for example, your plan caps a model lower than its API window), pin an exact value in `modelContextLimits` and it always wins.

Sessions inactive for more than 3 minutes (configurable via `idleTimeout`, `0` disables hiding) are automatically hidden, and reappear as soon as a resumed session writes new activity. The window regaining focus also triggers an immediate rescan. The extension also detects when sessions have been superseded by newer ones (e.g., after running `/clear` and opening a new tab), hiding ghost sessions immediately.

## License

MIT © 2025-2026 [Ed Zisk](https://github.com/edenaion)
