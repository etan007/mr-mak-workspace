# 浏览器截图反馈

当程序化 Three.js 重建有可在浏览器中渲染的预览时，使用本参考。

## 截取规则

每个视觉构建 pass 至少应从一个具名评审视角产出一张渲染截图。优先使用代理自带的浏览器/截图工具（Claude Code 浏览器 MCP、代理的应用内浏览器/预览，或项目自带的预览）。不要仅为本技能安装或下载 Playwright/Chromium；只有在用户明确允许、或项目本身已依赖它时，才使用 Playwright 或其他浏览器自动化方式。若应用内浏览器不可用，向用户索取截图路径，或使用目标项目中已有的浏览器工具。

截取后生成一张并排评审图：

```bash
../../forge/stage4_review/make_comparison_sheet.py \
  --reference reference.png \
  --render render.png \
  --out comparison.png \
  --json
```

该脚本只负责对齐和打包证据，不得计算验收分数。必须由代理的视觉能力检查 `comparison.png`。

---

## 评审用的确定性查看器（关键——来自 Bowie Knife 重建）

**问题：** OrbitControls 每帧调用的 `controls.update()` 会覆盖脚本设置的 `setView`，导致物体渲染出来是倾斜的，截图也变得不确定。这会破坏对比的可靠性。

**规则：** 评审截图时，查看器必须是确定性的：
- 截取前禁用交互控制：`window.__interactive = false; controls.enabled = false`
- 只有在用户明确选择交互时才启用控制（例如 `controls.addEventListener('start', () => { window.__interactive = true; })`）
- 在渲染循环中，只有当 `window.__interactive` 为 true 时才调用 `controls.update()`
- 精确模拟参考视口（例如 1600×900×1），使截图与 canvas 完全一致
- 浏览器重启会重置模拟设置——跨会话对比时要注意这一点

**实现模式：**
```javascript
const params = new URLSearchParams(location.search);
let spin = params.get('spin') === '1';
window.__interactive = false;
controls.addEventListener('start', () => { window.__interactive = true; });

function loop() {
  requestAnimationFrame(loop);
  if (spin) { model.rotation.y += 0.01; }
  if (window.__interactive) controls.update();
  renderer.render(scene, cam);
  window.__ready = true;
}
```

## 参考取景匹配（关键——来自 Bowie Knife 重建）

**问题：** 如果渲染取景（缩放/位置）与参考图不一致，Divine Eye 的比例/长宽比硬门禁会因取景伪差而失败，而不是因为真实缺陷失败，从而造成误判拒绝。

**规则：** 让取景与参考图一致，或明确说明取景差异：
- 将模型包围盒对齐到参考图中物体的范围
- 使用 "match" 视角，通过缩放/摆放相机来近似参考图的取景
- 设置相机位置，使物体占参考图宽度的约 98%
- 若取景无法完全一致（长宽比、背景不同），在评审备注中说明
- 当取景有意与参考图不同时，绝不依赖 Divine Eye 门禁

**实现模式：**
```javascript
const views = {
  front:  [0, 0, 14],
  match:  [0, 0, 6.5],    // 取景匹配参考照片中的物体范围（约 98% 宽度）
  // ...
};
function setView(name) {
  const v = views[name] || views.front;
  cam.up.set(0, 1, 0);
  cam.position.set(v[0], v[1], v[2]);
  cam.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  controls.update();
}
```

每个 pass 用同一对完整图像为至多五个关键语义特征评分。特征指一个子系统，例如船体、舱室系统、顶棚系统、肢体组件、面部、控制面板或帆与索具系统；它不是单个网格，也不需要单独裁切。只有在自适应升级有用时，才额外为至多三个不确定的重要特征评分。

初始 spec 中的通用评审目标只是占位符。应将其替换为预 spec 评估阶段发现的、针对该物体的系统；否则，严格质量校验不应让中等或复杂物体通过。

## 分层对比

按以下顺序评审截图证据：

1. 轮廓与比例：外包形状、宽/高/深线索、渐缩、对称性、负空间。
2. 组件结构：父子层级摆放、关节、接触点、重复系统、悬空或脱离的部件。
3. 形体细节：倒角、切角、曲率、弯折、凹痕、接缝、凸起棱线、孔洞、形变尺度。
4. 表面响应：albedo 分区、粗糙度变化、金属度、清漆层（clearcoat）、透射、normal/bump/displacement、环境光遮蔽。
5. 局部特征：划痕、崩口、积尘、苔藓、污渍、色块、边缘磨损、接触磨损。
6. 光照/相机：曝光、阴影柔和度、接触阴影、色温、轮廓光、反射可读性。
7. 性能取舍：缺失的细节是否因三角面、draw call、纹理或 FPS 预算而有意省略。

## 决策矩阵

- 若截图暴露出缺失或错误的组件，选择 `refine-spec`。
- 若 spec 已描述该组件但渲染与之不符，选择 `refine-code`。
- 若截图过暗、过近、过远或视角错误，先针对相机/光照选择 `refine-code`，再评判模型保真度。
- 若源图像未提供足够的几何或材质信息，选择 `request-input`。
- 若截图满足该 pass 的验收标准且没有掩盖后续风险，选择 `continue`。

只有当全局 AI 视觉分数达到 `selfCorrectLoop.visualAcceptance.threshold`（通常为 `0.7`），且每个关键语义特征都达到其自身阈值时，才允许 `continue`。数值或像素差脚本可以帮助诊断对齐，但不能批准 pass。

## AI 视觉评分卡

为每个适用层打 `0` 到 `1` 的分，然后根据该 pass 的目标给出一个总分：

- `silhouetteProportion`：外轮廓、质量分布、负空间、相机归一化后的比例。
- `componentStructure`：层级、摆放、连接、重复系统、悬空或断开的部件。
- `formDetail`：渐缩、弯折、倒角、形变、次级形体、局部几何。
- `materialSurface`：albedo、粗糙度、反射率、normal/displacement、AO、局部磨损、触感频率。
- `lightingCamera`：相机匹配、曝光、主光/补光/轮廓光平衡、阴影/接触响应、背景。

不要把某个失败的关键层藏在高平均分里。若某层对当前 pass 至关重要且仍明显错误，即使算术平均分高于阈值，也要选择 `refine-spec` 或 `refine-code`。

## 特征分级

- `critical`：决定身份、用户优先、视觉显著或高风险的子系统。必须在完整图像对中可见，并单独通过。
- `important`：有价值的次级子系统。只评审可疑项；被评审项的平均分必须达到配置的阈值。
- `detail`：微观细节。记录不匹配说明，推迟到细化阶段处理，除非用户将其提升。

重复部件若构成一个可识别的系统，应作为一个目标。例如，三个舱室应作为 `cabin-system` 评审，而不是三个独立的舱室目标。

## 证据格式

截图证据记录以下字段：

- `referenceScreenshot`：源图像、裁切图或带标注的参考图路径。
- `renderScreenshot`：浏览器渲染截图路径。
- `comparisonImage`：由 AI 视觉评审的并排证据图。
- `cameraView`：具名视角，如 `front`、`three-quarter`、`side`、`top` 或 `close-up-material`。
- `notes`：用 3D 图形术语写的简明不匹配摘要。
- `aiVisionScore`：`0` 到 `1` 的总分。
- `layerScores`：评分卡中各层的分数。
- `aiVisionNotes`：具体的已匹配特征、不匹配项、根因和下一步修正。
- `featureReviews`：特征 ID、分数、在共享图像对中的可见性，以及针对性说明。

绝不要把截图仅当作装饰。它们是自我修正循环的基准真相。
