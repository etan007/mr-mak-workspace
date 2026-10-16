# Issue 分诊

分诊工作流每天 09:17 UTC 启动，每隔一个 UTC 纪元日运行一次其辅助脚本，因此跨月时节奏保持连续。
它是尽力而为，不是精确的 48 小时服务等级。维护者可以用 **Run workflow** 的 dry-run 模式查看所有
零标签候选项，审阅结果后再使用 backfill。定时运行只处理在 `.github/workflows/issue-triage.yml`
中 `TRIAGE_ROLLOUT_AFTER` 之后创建的 issue。

## 标签

| 维度 | 标签 | 负责方 |
| --- | --- | --- |
| 队列 | `triage: needs-review`、`triage: discussed` | 机器人只添加 `needs-review`；维护者在讨论后转换状态。 |
| 优先级 | `priority: high`、`priority: medium`、`priority: low` | 维护者，在发表决策评论之后。 |
| 贡献 | `contribution: proposed`、`contribution: available`、`contribution: claimed` | 表单添加 `proposed`；维护者控制目标 issue 的可认领状态和认领。 |

`bug`、`enhancement`、`documentation` 等现有标签保持独立。机器人从不移除标签、关闭 issue、
锁定 issue、指派人员，也不添加终态标签。

定时候选集是零标签、非 PR 的开放 issue。唯一例外是恢复只带 `triage: needs-review` 的 issue：
即之前的机器人运行添加了该标签，但在创建通知前失败。机器人通知标记只接受来自
`github-actions[bot]` 的。

## 维护者决策记录

在更改优先级、贡献者状态或关闭 issue 之前，先评论说明决策、理由、下一步行动；若 issue 变为低优先级，
还要写明重新审视的触发条件。低优先级 issue 保持开放。

实现 PR 使用 `Refs #<number>`。合并后，维护者在 issue 中记录已合并的 PR、验证情况和关闭理由，
然后在合适时手动关闭。
