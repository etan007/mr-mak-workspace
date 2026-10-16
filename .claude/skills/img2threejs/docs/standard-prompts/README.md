# 标准提示词

四份提示词，各对应一项工作。每份都可直接复制粘贴，都能一轮完成，并各自写明退出条件。粘贴前替换所有
`<PLACEHOLDER>`。

| 提示词 | 适用场景 | 路线 |
|---|---|---|
| [`build.md`](build.md) | 有参考图、没有网格 | 由基本体重建，带门禁 |
| [`glb-force-measured.md`](glb-force-measured.md) | 有 GLB，且其测得的每个参数都应强制采用而非近似 | 测量、强制、用一致性门禁证明 |
| [`polish.md`](polish.md) | 构建能渲染但与参考不符 | 有界修正，每次一个缺陷 |
| [`vfx.md`](vfx.md) | 绑定和动画片段都能播放，只缺特效 | 从真实 mixer 上测量事件，再据此排期 |

在 GLB 之上做绑定和动画：[`../GLB_ANIMATED_CHARACTER_PROMPT.md`](../GLB_ANIMATED_CHARACTER_PROMPT.md)。

## 为什么重写

旧提示词阻塞的比构建的多，原因有三，都是机制问题而非文风问题：

1. **它们指向一个不存在的文件。** `GLB_ANIMATED_CHARACTER_PROMPT.md` 把整条几何路线委托给
   `docs/GLB_CHARACTER_PROMPT.md`，而那个文件从未写出。代理到达整次运行中最大的一步时，遇到的是一个
   失效引用。`build.md` 就是那个缺失的文件。

2. **它们在产出门禁输入之前就运行门禁。** 对刚生成脚手架的 spec，`validate_sculpt_spec.py --strict-quality`
   会因约 89 个原因失败，因为脚本只负责搭脚手架——`preSpecAssessment.objectClass.primaryType` 字面值就是
   `"unassessed"`，八项复杂度评分全是 `0`，`detailInventory` 为空。被告知"运行门禁，不要推进"的代理，
   每次都会在第一条命令处停下。**这里的每份提示词现在都先填充脚手架再校验**，并明确说明是哪些字段。

3. **它们把每次停止都当作同等严重。** 缺少输入和测量失败需要不同的应对。下面每份提示词都区分
   *产出输入并继续* 与 *停下并询问*，并列出各属于哪一类。

## 四份提示词共享的规则

> 门禁是一个问题。用证据回答它，或者说明你无法回答——绝不能靠降低标准，也绝不能在尝试产出它所要求的
> 证据之前就停下。
