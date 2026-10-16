# Build——从参考图到带门禁的程序化模型

重建路线。`GLB_ANIMATED_CHARACTER_PROMPT.md` 把它的 Stage 1–3 委托给本文件。

**让本提示词不再阻塞的关键一点：** forge 脚本只*搭脚手架*，不做*评估*。新生成的 spec 带有
`primaryType: "unassessed"`、八项为 `0` 的复杂度评分、空的 `detailInventory`，且 `anatomy.applies` 未设置
——因此 `--strict-quality` 会以约 89 个原因判其失败。这些不是要报告的缺陷，而是**由你来填写的字段**。
先填写，再校验。

替换所有 `<PLACEHOLDER>`，作为一条提示词粘贴。

````text
使用 img2threejs，把这张参考图中的主体重建为程序化 Three.js 模型。

## 输入
- Reference:      <ABSOLUTE_PATH_TO_IMAGE>
- Subject name:   <SubjectName>
- Demo id:        <subject-id>
- Profile:        <character | animated-character (requires plugin-character installed) | object>
- Real longest dimension: <e.g. 1.70 m>   # 用于检查尺度是否合理；绝不用于缩放

## Step 0——这个主体到底能不能构建？

把人物从背景中分割出来，并以数字报告：
  · 臀部带（人物高度的 48-54%）、膝部（68-74%）、脚踝（92-99%）处的宽/高
  · 轮廓面积 / 高度²
  · 轮廓在臀部以下是否变宽，以及变宽多少

角色模板有 61 个解剖部件、零件服装——v1.5 不提供服装。如果轮廓中有相当比例是脱离身体的布料
（喇叭裙、垂袖、披风、拖尾布片），就在这里停下并告诉我：占多大比例，会丢失什么。
以主体名义交付一个只有身体形状的人物，正是这一步要防止的失败。对这类主体，GLB 路线才是诚实的选择
——说明这一点然后停下。

## Step 1——Intake

    python3 forge/state.py init --state .img2threejs/state.json \
      --reference <image> --profile <profile> --spec object-sculpt-spec.json
    python3 forge/stage1_intake/probe_image.py <image>
    python3 forge/stage1_intake/extract_landmarks.py <image> \
      --out anatomy.json --overlay overlay.png
    python3 forge/stage1_intake/build_detail_inventory.py <image> \
      --mode component-zones --out detail-inventory.json

关于 overlay 有两点，都经过测量，在信任它之前都值得了解：
  · 它按图像高度划分，而不是人物包围盒，因此每条参考线都偏移了头顶上方的留白量。
    请对照人物顶部重新读取参考线。
  · `styleHeads` 默认是 6.0。测量头部相对人物的比例并设置真实值；对一个风格化的 8 头身人物，
    默认值会把 "nose base" 参考线放到眼睛上。

## Step 2——评估。这是你的工作，不是脚本的。

打开评估文件，根据观察参考图来填写。这些字段没有真实值之前，下游任何环节都不可能成功：

    preSpecAssessment.objectClass.primaryType      不是 "unassessed"
    preSpecAssessment.objectClass.primaryDomain    object | character | hybrid
    objectClass.formLanguage / structureKind / motionPotential / materialFamilies   非空
    complexity.scores       全部八项，依据你所见，而非默认值
    complexity.estimatedCounts                     真实计数
    detailInventory                                >= targetMinDetails 条
    anatomy.applies = true，并填写 styleHeads、proportions、pose、faceLandmarks

先列举定义身份的细节——倒角与圆角、面板接缝、紧固件、雕刻或绘制的线条、亮面与哑光区域、磨损。
无法落到真实部件上的细节，直接舍弃，不要伪造。

## Step 3——先写 spec，再过门禁

    python3 forge/stage2_spec/new_sculpt_spec.py "<SubjectName>" --image <image> \
      --assessment assessment.json --out object-sculpt-spec.json
    python3 forge/stage2_spec/validate_sculpt_spec.py object-sculpt-spec.json --strict-quality

预期第一次运行会失败。阅读每个原因并逐一回应——缺少 `colorMaterialRecipe` 意味着要从参考图像素中
推导该部件的颜色，而不是门禁有错。反复迭代直到退出码为 0。

只有到那时才运行：

    python3 forge/stage3_build/generate_threejs_factory.py object-sculpt-spec.json \
      --out src/create<SubjectName>Model.ts

生成器会再次执行门禁，且失败即关闭：失败时以退出码 2 退出，输出
`{"status":"BLOCKED", ...}`，并且不写任何文件。看到这个就说明 spec 还没准备好——回到 Step 2。
绝不传 `--allow-nonstrict`。

## Step 4——渲染与评审，一次一轮

渲染，打包一张参考-渲染对比图，并做出判断。某一轮的评审通过之前不要推进到下一轮。
对单一视角无法显示的任何部分，记录逐区域置信度。

## 何时停止，何时不停止

STOP，并询问我：
  · Step 0 显示主体主要是布料
  · 某个门禁因你无法从参考图解决的原因而失败
  · `next.py` 以退出码 3 退出 / `status=stopped`

DO NOT stop：
  · 脚手架字段为空——填上，这就是你的工作
  · strict-quality 第一次运行失败——阅读原因并逐一回应
  · 某个细节无法落位——舍弃它、记下来、继续

## 报告

部件数 · strict-quality 退出码与原因数 · 已通过的轮次 · 已清点细节数 vs 目标 ·
逐区域置信度 · 再用一行指出仍不匹配之处。若实际是 "improved"，绝不说 "done"。
````
