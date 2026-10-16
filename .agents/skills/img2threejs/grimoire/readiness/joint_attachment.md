# 挂接与关节正确性

当物体有挂接在父级上的子部件时使用本参考：树枝、肢体、把手、腿、角、翅膀、线缆、管子、插槽、面板、铰接部件或装饰性附件。

## 问题

脱离或悬空的子部件，通常是因为把子组件当成只有 `position`、`rotation` 和 `scale` 的自由网格。对挂接部件而言，这还不够。重建必须知道子部件从哪里开始、到哪里结束、连接到父级的哪个 socket，以及与父级重叠或嵌入多少。

## Attachment Contract

（挂接契约）

每个子附件、连接件、肢体、树枝、管子、把手、腿、角、翅膀、线缆或铰接部件都应定义：

- `parent`：父组件 id。
- `attachment.parentId`：相同语义的父级 id。
- `attachment.parentSocket`：父级上的具名 socket 或接触区域。
- `attachment.localStart`：子部件根部点，使用父级局部坐标。
- `attachment.localEnd`：子部件尖端/末端点，使用父级局部坐标。
- 当子部件呈管状/肢体状/枝状时，提供 `attachment.baseRadius` 和 `attachment.endRadius`。
- `attachment.embedDepth` 或 `attachment.overlap`：子部件穿入或融入父级的程度。
- `attachment.contactType`：`embedded`、`socket`、`overlap`、`hinge`、`surface-contact` 或 `glued`。
- `attachment.gapTolerance`：可接受的最大可见间隙。
- `attachment.evidenceRefs`：支持此挂接的图像区域。

若无法从图像推断挂接点，将其记录为 `request-input`，或降低保真度目标。不要悄悄把部件放在半空中。

## 生成器规则

对基于端点的部件，把 pivot 组放在 `localStart`，从 `localStart` 到 `localEnd` 生成可见网格，并让网格沿该方向朝向。不要把网格居中放在任意的变换位置。

## 截图评审

在 `structural-pass` 和 `form-refinement` 阶段检查：

1. 子部件根部是否明显接触、重叠或嵌入父级？
2. 在枝根、把手、肢体、腿、管子或连接件处，是否有悬空关节或空气间隙？
3. 子部件 pivot 是否位于语义关节处，而不是网格中心？
4. 形变/弯曲是否从关节/根部开始？
5. 旋转、缩放和动画之后，父级 socket 与子部件根部是否仍然对齐？

若可见悬空关节：挂接数据缺失时选择 `refine-spec`；spec 已有正确挂接数据但生成的网格没有使用时，选择 `refine-code`。