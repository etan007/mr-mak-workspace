# 预 Spec 评估与质量契约

在编写 `ObjectSculptSpec` 之前使用本参考。目的是防止出现技术上有效、但过于模糊、无法重现参考物体的浅层 spec。

不要使用固定的领域配置。依据观察到的特征、复杂度和目标保真度来评估物体。

## 软性物体分类

从多个维度描述物体：

- 形体语言：有机、硬表面、机械、建筑、类植物、类角色、无定形、雕塑化、类布料、类透明
- 结构类型：单一主体、复合物体、分支层级、重复模块、分层外壳、关节组件、可形变表面
- 运动潜力：静态道具、整体变换、关节化、可弯曲、可拆卸、可破坏、特效发射体
- 材质族：木材、树皮、叶片、金属、石材、陶瓷、塑料、橡胶、布料、类玻璃、类液体、类皮肤、混合

这些是描述维度，不是领域模板。只使用图像所支持的内容。

## 复杂度评分

每个维度打 0 到 3 分：

- 轮廓复杂度：从简单外轮廓到高度断续/有机的轮廓
- 组件数量：从单件到大量可见子部件
- 层级深度：从扁平物体到深层父子结构
- 重复密度：从无到成千上万的重复痕迹/叶片/鳞片/铆钉
- 材质层数：从单一材质到大量分层的局部材质响应
- 局部细节密度：从光面到密集的划痕、凸起、苔藓、接缝、崩口、气孔或纹理
- 遮挡风险：从完全可见到大量隐藏/需推断的部件
- 动作就绪需求：从静态到大量 pivot/socket/碰撞体/破坏接缝

将总体判断映射为：

- `simple`：部件少、细节少、一到两种材质
- `moderate`：若干部件、可见局部细节、浅层级
- `complex`：大量部件、重复系统、多种材质、多级层级
- `ultra-complex`：密集的有机/机械/建筑结构，保真度依赖深层级和重复微结构

### 领域插件可以提高这些下限

身份体现在表面上的领域——涂装皮肤、印刷图案、表面处理——比同一结构等级的通用物体承载更多
决定身份的细节。此类插件会在其 spec 增补中发布更高的下限，合并时**只升不降**：可以提高
`complexity.tier`、`targetMinDetails` 和 `minimumSpecDepth`，但绝不能降低其中任何一项。无论插件
提出什么值，`targetMinDetails` 都不会低于 **9** 这一下限。

## 质量契约

生成代码之前，明确界定什么样的模型才算足够好：

- 该物体的完成定义
- 宏观、中观、微观特征的最少数量
- 必需的重复系统及其分布规则
- 必需的材质层和局部覆盖层
- 视觉对比所需的截图视角
- 应阻止 `continue` 的失败模式

好的特征组是针对该图像的：

- 弱：`make leaves look good`
- 强：`leaf clusters must form irregular overlapping canopy masses, with varied card size/orientation/color and gaps exposing secondary branches`

- 弱：`add bark texture`
- 强：`trunk and primary branches need vertical ridges, cavity-darkened cracks, moss/lichen patches near roots and inner forks, roughness variation, and nonuniform displacement/bump`

## 严格质量门禁

代码生成前运行 `../../forge/stage2_spec/validate_sculpt_spec.py spec.json --strict-quality`。脚本路径相对于技能目录。

若严格校验失败：

- 若低估了复杂度，细化 `preSpecAssessment`
- 若完成定义过于笼统，细化 `qualityContract`
- 补充缺失的组件、材质层、重复系统、证据引用或局部特征
- 只有用户明确接受更简单的近似时，才降低质量标准

当 spec 能描述许多不同物体、而非所提供的参考物体时，门禁应阻止代码生成。