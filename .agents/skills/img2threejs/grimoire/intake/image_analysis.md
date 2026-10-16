# 图像分析规程

**首先**使用本参考，在 `probe_image.py` 和预 spec 评估之前。之所以需要它，是因为代理往往只
扫一眼整张图就直接写代码，跳过了后续每道门禁都依赖的严谨观察。这是一份**通用的、与物体类型
无关**的规程——适用于任何对象（道具、工具、武器、载具部件、植物、机械、角色）。领域专项
（已编目的皮肤、角色）是在本 pass *之后*叠加的特化，而不是它的替代。

## The Rule

以固定的自下而上顺序，使用受控的 3D 词汇描述**实际存在**的东西——而不是它*意味着*什么或
*给人什么感觉*。整个规程由三条纪律支撑：

1. **先观察，后推断。** 把可观察的事实（"沿刀背有一条低粗糙度带"）与据此做出的推断
   （"可能是抛光倒角"）分开陈述。每条推断都要标明是推断。
2. **用受控词汇，不用形容词。** 使用下文及 `grimoire/glossary/3d_vocabulary.md` 中的术语。
   绝不使用"好看 / 流线 / 凶悍 / 高质量"之类的词。
3. **用 3D 物体空间，而非 2D 图像空间。** 按前/后/侧/近端描述部件，而不是照片的左/右。单张
   照片是一次投影——要说明透视遮住了什么。

按顺序执行各层；每层都对应一个真实的评估字段（映射见文末）。本规程的输出**就是**
`new_pre_spec_assessment.py` 和 `build_detail_inventory.py` 的原始素材。

## Layer 1 — Identification & classification

（第 1 层——识别与分类）

- **观察：** 物体*是*什么、所属类别以及你的置信度。在对价值/用途做任何断言之前，先完成一份
  实物清单。
- **词汇：** 作品类型（具体名词——*小雕像、karambit、套筒扳手、角杯*）、宽泛分类（*带刃工具、
  家具、机械部件*）、`primaryDomain`（`object` | `character` | `hybrid`）、置信度 0–1。
- **避免：** 用物体的*标题/名称*充当描述；在清单完成前断言含义；超出可见证据的推断。

## Layer 2 — Overall form & silhouette

（第 2 层——整体形态与轮廓）

- **观察：** 用一小组基本体描述包围体积和占地轮廓；对称性。
- **词汇：** 基本体（*长方体、圆柱、球体、圆锥、挤出轮廓、放样曲线*）；对称性（*双侧对称、
  径向对称、不对称*）；形体语言（*几何化* vs *有机*）；相对某个具名参考尺寸的长宽比/比例。
- **避免：** 情绪化的形状词；没有参照的"大/小"；把本是混合形体的有机形态硬塞进单一基本体。

## Layer 3 — Macro → meso → micro decomposition

（第 3 层——宏观 → 中观 → 微观分解）

- **观察：** 把整体拆成主要组件，再拆成子部件，再拆成表面级特征组——形成用于组件化建模的
  `parent-child` 层级。
- **词汇：** 宏观（独立的主要部件——*刀身、握把、护手*）、中观（子组件——*铆钉排、指凹、
  柄头*）、微观（特征组——*紧固件簇、雕刻带*）。
- **避免：** 把物体当作一整块网格；对简单结构过度嵌套；跳级（从宏观直接跳到微观，没有中观）。

## Layer 4 — Spatial relationships (scene-graph)

（第 4 层——空间关系（场景图））

- **观察：** 各部件在 3D 中如何相互连接、彼此如何放置。
- **词汇：** 视觉三元组 `<subject, predicate, object>`（`<guard, separates, blade+grip>`）；空间
  谓词 *attached-to、above、below、inside、behind、flush-with、embedded-in*；每个连接注明接触
  类型（*butt、overlap、socket、embed*）。
- **避免：** 2D 图像空间的位置描述（画面左/右）；只描述相邻而不说明部件实际如何连接（悬空部件
  之后会导致连接门禁失败）。

## Layer 5 — Materials & surface (PBR)

（第 5 层——材质与表面（PBR））

- **观察：** 每个部件的材料以及它对光的响应。每个不同的表面对应一条材质断言，并关联到某个组件。
- **词汇：** *albedo/base color*（去除光照后的表面颜色）、*metalness*（0 电介质 / 1 裸金属）、
  *roughness*（0 抛光 → 1 哑光）、*specular F0*（电介质约 4%）、*normal/relief*（*点蚀、纹理、
  气孔、拉丝*）、*translucency*（*不透明 / 半透明 / 透明*）。
- **避免：** 把烘焙进去的高光/阴影当成 albedo；把亮面塑料叫作"金属"；把一个通道混用为另一个
  通道（见 `grimoire/feedback/shading_realism.md`）。

## Layer 6 — Color & finish

（第 6 层——颜色与表面处理）

- **观察：** 每个区域的色相、明度、饱和度；表面处理。
- **词汇：** *色相 / 明度 / 饱和度*；表面处理 *matte、satin、gloss、metallic、anodized*；渐变
  写成带位置的有序色标，而不是"渐变为"。
- **避免：** 用主观/品牌色名（"宝蓝"）代替标准描述（"鲜艳的蓝色，中明度"）；在存在渐变或多色
  处理时只用一种平涂色。

## Layer 7 — Identity-defining features

（第 7 层——决定身份的特征）

- **观察：** 让*这一件*物品可被认出的痕迹，而不是让它只是同类中普通一员的特征。
- **词汇：** 铭文/标记（签名、日期、logo、序列号）、磨损模式（*划痕、凹痕、氧化/包浆、污渍、
  边缘磨损*）、重复出现的图案。
- **避免：** 忽略细小但关键的标识（制造商标记、改变拓扑的独特刻痕）。每个身份特征都应成为一条
  `detailInventory` 条目；若它可能出错，还应成为一个 `featureReviewTarget`。

## Layer 8 — Uncertainty & single-image limits

（第 8 层——不确定性与单图局限）

- **观察：** 单一视角没有展示的内容；模糊或有歧义的内容。
- **词汇：** *occluded*（被另一部件挡住）、*hidden*（背面 / 内部，不在本视角中）、*uncertain*
  （模糊/有歧义）、*needs another view*、*undetermined*。
- **避免：** 在未标注为推测的情况下臆造被遮挡/隐藏的细节；忽视透视畸变。这里的每个未知项都应
  成为一条 `preSpecAssessment.unknownsToResolveBeforeImplementation` 条目，并可作为
  `request-input` 的依据。

## 输出 → 各层的落点

| 层 | 输入到 |
|---|---|
| 1 识别 | `objectClass.primaryType` / `primaryDomain`、复杂度分类 |
| 2 形态与轮廓 | 复杂度等级、几何策略、`referenceCamera` 取景 |
| 3 宏观/中观/微观 | `componentTree` 层级 + `minimumSpecDepth` |
| 4 空间关系 | `attachment`（parentSocket、contactType、embed/overlap） |
| 5 材质与表面 | `materials` PBR 通道 + `material.localOverrides` |
| 6 颜色与表面处理 | `colorMaterialRecipe`、渐变色标、`finishStyle` |
| 7 身份特征 | `detailInventory` 细节 + `featureReviewTargets` |
| 8 不确定性 | `unknownsToResolveBeforeImplementation`、`request-input` 决策 |

## 领域特化（在本 pass 之后应用）

这一通用 pass 对每个对象都要执行。当第 1 层识别出某个特化领域时，在其上叠加该领域的额外规则，
**不得**跳过任何通用层：

- **已编目的皮肤或表面处理** → 由提供服务的插件自带的表面处理规则手册（表面风格、磨损、seed、
  与视角相关的环境漆面）及其纹理获取指南。两者都随该插件发布；若未安装任何插件，则从参考图
  推断表面处理。
- **角色 / 混合体** → `grimoire/character/reconstruction.md`（头身单位、关键点、比例锁定）。

通用规程决定*有什么*；领域文档决定*该类别按惯例如何参数化*。
