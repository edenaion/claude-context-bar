# Claude 模型上下文窗口研究文档

**用途**：为 VSCode 扩展的模型兼容性设计提供参考
**整理日期**：2026年7月5日
**说明**：本文档内容来自 Anthropic 官方文档（platform.claude.com、support.claude.com）及 Claude Code 官方 GitHub 仓库的公开 issue，信息随版本迭代可能变化，建议定期复核。

---

## 1. 当前模型清单与上下文窗口（API 层面）

| 模型 | API 模型 ID | 上下文窗口 | 最大输出 | 知识截止 |
|---|---|---|---|---|
| Claude Fable 5 | `claude-fable-5` | 1M tokens | 128K tokens | 2026年1月 |
| Claude Mythos 5 | `claude-mythos-5` | 1M tokens | 128K tokens | 2026年1月 |
| Claude Opus 4.8 | `claude-opus-4-8` | 1M tokens | 128K tokens | 2026年1月 |
| Claude Opus 4.7 | `claude-opus-4-7` | 1M tokens | — | — |
| Claude Opus 4.6 | `claude-opus-4-6` | 1M tokens | — | — |
| Claude Sonnet 5 | `claude-sonnet-5` | 1M tokens | 128K tokens | 2026年1月 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M tokens | — | — |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | 200K tokens | 64K tokens | 2025年2月 |

**关键点**：在 API（Claude API / AWS / GCP / Microsoft Foundry）层面，Opus 4.6 及以上版本、Sonnet 4.6 及以上版本均默认提供 1M 上下文，**不需要 beta header，按标准定价计费，没有长上下文溢价**。

已退役、不应再兼容的旧版本：
- `claude-opus-4-20250514` / `claude-sonnet-4-20250514`（及无日期别名 `claude-opus-4-0`、`claude-sonnet-4-0`）：已于 **2026年6月15日**下线，调用直接报错，无自动降级。

---

## 2. API 与订阅版（claude.ai / Claude Code）的额度差异

这是本次调研中最容易踩坑的地方：**模型本身支持的上下文窗口，和用户实际能用到的上下文窗口，是两件不同的事**，后者还取决于产品界面和订阅档位。

### 2.1 claude.ai 网页/App 聊天界面

| 模型 | 所有付费计划下的上下文 |
|---|---|
| Claude Sonnet 5 | 1M tokens |
| Claude Opus 4.8 / 4.7 / 4.6，Claude Sonnet 4.6 | 500K tokens |
| 其他模型（如 Sonnet 4.5） | 200K tokens |

### 2.2 Claude Code

| 模型 | Pro 订阅 | Max / Team / Enterprise 订阅 |
|---|---|---|
| Sonnet 5 | 1M（自动，无需额外操作） | 1M（自动） |
| Opus 4.6 / 4.7 / 4.8 | 需手动开启 **usage credits**，否则封顶 200K | 自动 1M，无需额外操作 |
| Sonnet 4.6 | 需手动开启 usage credits，否则封顶 200K | **同样需要手动开启 usage credits**（按量付费的 Enterprise 除外） |
| Sonnet 4.5 / Haiku 4.5 | 上限 200K，与 credits 无关 | 上限 200K，与 credits 无关 |

**需要特别注意的不一致点**：Max 订阅下，Opus 系列是自动给 1M 的，但 **Sonnet 4.6 在 Max 订阅下仍需要手动开 usage credits** 才能到 1M——这一点与 Opus 的规则不同，容易被误判。Sonnet 5 则完全不受此规则影响，所有档位自动 1M。

---

## 3. 已知的显示层 Bug（非真实额度问题）

在 Claude Code 的 `/context` 命令上，存在多起官方确认的 **UI 显示 bug**，与上面第 2 节的真实额度规则要区分开：

- **GitHub issue #23432 / #34143 / #49931**：在 Max/Team/Enterprise 订阅下，Opus 4.6 / 4.7 本应自动获得 1M 上下文，但 `/context` 命令的分母显示卡在 **200K**，即使模型标注行明确写着"(1M context)"。官方说明指出，这个 200K 数字实际上是"开始产生溢价计费的阈值"，并非真实的上下文上限——这是个已知的 cosmetic bug，底层 API 请求容量本身应该没问题（但社区反馈中提到这一点仍需独立验证）。

**区分方法**：
- 如果你是 **Max/Team/Enterprise** 订阅，看到 200K，大概率是上述显示 bug。
- 如果你是 **Pro** 订阅且没开 usage credits，看到 200K 是**真实额度**，不是 bug（本文档第 2.2 节已确认过这一具体场景）。

---

## 4. 对 VSCode 扩展设计的建议

### 4.1 不要硬编码"模型 → 上下文大小"的静态映射表
模型规格本身变化较快（如 Opus 4.6→4.7→4.8→Fable 5，几个月内迭代数次），建议通过 **Models API**（`GET /v1/models`，返回 `max_input_tokens`、`max_tokens`、`capabilities`）在运行时动态获取模型层面的上限，作为兜底默认值。

### 4.2 模型层面的上限 ≠ 用户实际可用的上限
如第 2 节所述，同一模型在不同订阅档位、是否开启 usage credits 的情况下，实际可用上下文可能相差 5 倍（200K vs 1M）。这个信息目前**没有 API 可以程序化查询**（它是账户配置层面的信息，不是模型属性），所以无法自动检测。

### 4.3 推荐方案：用户自维护的"模型-上下文大小"字典 + 保守默认值
- 在扩展设置里提供一个可编辑的字典，让用户根据自己的订阅档位/credits 开启情况手动填写实际可用上下文。
- **默认值建议保守**：全部按 200K 兜底（这是所有订阅档位的最低保证值），而不是乐观假设 1M。低估的代价只是扩展保守一点，高估的代价是扩展在真实超限时没有预警。
- 这个数字应作为**参考值/软提醒**（例如展示进度条、提前预警），而不是用于**硬性截断或阻断**逻辑的判断依据——因为它本质上是用户凭记忆填写的、未经程序验证的值，订阅档位、credits 状态、官方规则本身都可能随时变化。
- 真正需要精确控制上下文占用的场景（例如决定是否触发历史压缩），应使用 tokenizer 或 count_tokens API 实时统计实际 token 数，而不是依赖这个静态配置值。

---

## 5. 信息来源

- Anthropic 官方文档：platform.claude.com/docs（Models overview、Context windows、Model deprecations）
- Anthropic 官方 Claude Code 文档：code.claude.com/docs（Model configuration）
- Anthropic 官方 Help Center：support.claude.com（How large is the context window on paid Claude plans）
- Claude Code 官方 GitHub 仓库公开 issue（anthropics/claude-code #23432、#34143、#49931）

*本文档基于 2026年7月5日 检索到的信息整理，Anthropic 的模型规格、定价、额度规则更新频率较高，建议在正式发布前重新核实关键数字。*
