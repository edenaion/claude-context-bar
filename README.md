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

🔍 **Smart Context Detection** — Three-tier context limit resolution automatically detects your model's context window

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
| `claudeContextBar.contextLimit` | `200000` | Global fallback context limit (used when no per-model override or auto-detection matches) |
| `claudeContextBar.modelContextLimits` | `{}` | Per-model context limits: Model ID → token limit (e.g., `{"claude-opus-4-8": 1000000}`). Exact match, highest priority |
| `claudeContextBar.warningThreshold` | `50` | Percentage for yellow warning |
| `claudeContextBar.dangerThreshold` | `75` | Percentage for red danger |
| `claudeContextBar.refreshInterval` | `30` | Refresh interval in seconds |
| `claudeContextBar.idleTimeout` | `180` | Seconds of inactivity before hiding a session (3 minutes) |
| `claudeContextBar.compactMode` | `false` | Shorten project names to save status bar space |
| `claudeContextBar.shortNames` | `{}` | Custom short names for projects (e.g., `{"my-project": "MP"}`) |

## How It Works

The extension reads Claude Code's session files from `~/.claude/projects/` and calculates token usage from the JSONL logs. It resolves the context limit using a three-tier priority chain:

1. **User configuration** — `modelContextLimits` setting (exact Model ID match). Highest priority — overrides everything below.
2. **Auto-detection** — Model ID contains `claude-sonnet-5` → 1,000,000 tokens. Sonnet 5 is the only model currently confirmed to have universal 1M access across all subscription tiers.
3. **Global fallback** — `contextLimit` setting (default 200,000 tokens). Used for all models not matched by tiers above.

This means you can set a custom limit for any model, and it will always be respected — no model is force-capped.

Sessions inactive for more than 3 minutes (configurable via `idleTimeout`) are automatically hidden. The extension also detects when sessions have been superseded by newer ones (e.g., after running `/clear` and opening a new tab), hiding ghost sessions immediately.

## License

MIT © 2025 [Ed Zisk](https://github.com/ezoosk)
