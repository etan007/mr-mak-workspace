# 物体雕刻规格（Sculpt Spec）的 3D 图形术语

编写或审查 `ObjectSculptSpec` 时参考本文。目标是用 Three.js / 技术美术工作流能直接执行的术语，描述代理应构建的内容。

## Geometry And Topology

- `silhouette`：从给定相机角度看到的物体外轮廓。
- `primitive family`：基本体类别，包括 box、sphere、ellipsoid、cylinder、cone、capsule、torus、lathe、extrusion、tube、plane card、instanced cluster。
- `topology intent`：拓扑意图，包括硬表面粗模、可细分曲面、低多边形道具、有机形变网格、alpha 片簇。
- `bevel radius`：圆角边过渡的尺寸，以物体相对单位计。
- `bevel segments`：边缘倒圆的细分段数。
- `chamfer`：平直斜切边，通常比圆角倒角更省。
- `taper`：沿某轴逐渐改变缩放（锥化）。
- `bend`：沿某轴或样条的弯曲形变。
- `twist`：沿某轴的旋转形变（扭转）。
- `boolean cut`：减法形状，如孔、缺口、槽、凹陷或雕出的开口。
- `edge loop`：重复的顶点环 / 路径，用于支撑形状或形变。
- `local deformation`：局部凹痕、鼓胀、捏紧、扭曲、下垂或屈曲。
- `displacement`：几何层面的高度位移，可影响轮廓。
- `normal strategy`：法线策略，包括顶点法线、加权法线、平直着色、生成的切线空间法线。
- `UV strategy`：UV 策略，包括程序生成坐标、柱面投影、类三平面映射、可打图集的展开区域。

## Material And PBR

- `albedo` / `baseColor`：与光照无关的漫反射颜色。
- `roughness`：微表面散射；粗糙度高为哑光，低为光亮。
- `metalness`：材质在 PBR 中是否表现为导电金属。
- `normal map`：切线空间法线细节，改变光照响应但不改变轮廓。
- `bump map`：由高度推导的法线细节，通常为程序生成，比置换更省。
- `displacement map`：几何置换；仅当浮雕需要影响轮廓或近景形状时使用。
- `ambient occlusion`：褶皱、接触区和凹腔处的变暗。
- `cavity dirt`：凹陷区域局部的深色 / 积尘。
- `edge wear`：凸出边缘上露出的较亮 / 抛光 / 损伤材质。
- `clearcoat`：覆盖在基础材质上的第二层光亮涂层。
- `transmission`：光线穿过透明 / 半透明材质。
- `alpha`：不透明度或镂空透明。
- `anisotropy`：方向性的高光拉伸，适用于拉丝金属或纤维。
- `procedural noise scale`：程序生成变化的空间频率。
- `local mask`：针对特定区域控制颜色、粗糙度、污渍、磨损或凹凸的遮罩。

## 表面局部特征

- `raised ridge`：从表面凸起的几何或法线细节。
- `recessed groove`：刻入表面的凹线或阴影线。
- `seam line`：拼接部件或材质面板之间的分界线。
- `scratch cluster`：一组细长有方向的划痕，影响 albedo / roughness / normal。
- `chip`：崩缺的缺块，常露出底层。
- `dent`：向内的局部形变（凹痕）。
- `stain`：局部 albedo / roughness 颜色变化，几何变化不明显。
- `contact wear`：物体与地面、手、关节或其他部件接触处的磨损。
- `decal region`：类图像 / 文字 / logo 区域；除非要求精确还原，否则用着色平面或生成纹理近似。

## 光照与渲染

- `key light`：主光源。
- `fill light`：用于提亮阴影的较柔和补光。
- `rim light`：勾勒轮廓的背光 / 侧光（轮廓光）。
- `environment reflection`：类天空盒 / HDRI 的反射源。
- `contact shadow`：贴近表面、让物体落地的阴影。
- `shadow softness`：阴影边缘的模糊 / 扩散程度。
- `color temperature`：光的冷暖色调（色温）。
- `exposure`：场景亮度缩放（曝光）。
- `tone mapping`：影响对比度和高光的输出变换（色调映射）。

## Animation, Physics, And Destruction

- `pivot`：局部旋转原点。
- `hinge`：受约束的旋转关节（铰链）。
- `socket`：子部件的挂接点。
- `collider`：简化的物理形状（碰撞体）。
- `rigid body`：参与模拟的物理刚体。
- `fracture seam`：预设的断裂线。
- `detachable fragment`：破坏时可脱离的碎块。
- `impulse direction`：用于触发运动或破碎的力向量（冲量方向）。

## 书写规则

差：`the surface is ugly and too smooth`（表面难看、太光滑）。

更好：`increase microRoughness to 0.45, add tangent-space fine-noise normal with strength 0.2 and scale 32, add low-frequency albedo mottling at amplitude 0.12, and add cavity dirt local masks in recessed grooves`（microRoughness 提到 0.45；加强度 0.2、尺度 32 的切线空间细噪声法线；加幅度 0.12 的低频 albedo 斑驳；在凹槽中加 cavity dirt 局部遮罩）。

差：`make the edges realistic`（让边缘更真实）。

更好：`add 0.025 relative bevel radius with 3 segments on exposed hard-surface edges, add edge-wear local overrides on bevel crests, and keep internal seams sharper with 1-segment chamfers`（在外露硬表面边缘加相对半径 0.025、3 段的倒角；在倒角棱线上加 edge-wear 局部覆盖；内部接缝用 1 段 chamfer 保持更锐利）。
