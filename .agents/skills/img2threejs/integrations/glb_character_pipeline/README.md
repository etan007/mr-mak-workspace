# GLB 角色流水线（需主动启用）

**GLB 参考是可选的。如果角色构建没有 GLB，就完全跳过本集成**——不要报错，不要部分应用，也不要用任何
东西替代。改为通过 img2threejs 核心的图像驱动流水线（`forge/`）构建；这里没有任何代码路径能在没有真实
GLB 点云可测量的情况下运行。只有在确认该角色确实存在 GLB 参考之后，才去使用下文的任何内容（见
`PIPELINE.md` 的"适用性门禁"一节）。

本集成把一个**多部件 GLB 基线**重建为纯代码 TypeScript/three.js——一个完全程序化、运行时不获取任何
`.glb`/`.bin` 的角色——对于仅靠横截面放样无法达到的有机细节（眼睑、褶皱、肚脐），使用 SDF 点云泼溅和
Surface Nets 等值面提取。它之所以作为需主动启用的集成、而不是核心 `forge/` 的一部分存在，是因为泼溅/
烘焙步骤需要 `numpy` 和 `Pillow`，Node 端的截取和往返验证需要 `playwright`/`esbuild`——而只用标准库的
`forge` 核心刻意不携带这些依赖。`CONTRIBUTING.md` 明确允许这样做："如果你需要投影或生成式辅助路径，
请将其作为显式、带标志、需主动开启的模式来提议。"

这是一个**配套 showcase** 工具：这里的每个脚本都针对一个独立的 `img2threejs-showcase` checkout 运行
（demo 自己的 `src/demos/<character>/`、`public/mesh/` 和 `work/` 目录都在那里），绝不针对本仓库自身的
目录树。运行下文任何内容之前，先把 `IMG2THREEJS_SHOWCASE_ROOT` 指向该 checkout——`forge/tests` 也正是
用同一个环境变量找到配套 showcase 来执行其 TypeScript 类型检查门禁。

**GLB 是测量仪器，绝不是交付的资产——但"纯代码"在这里涵盖两种确实不同的东西，不应把它们当作同一个
声明。** 两个阶段都把测得的数据作为提交的 `.ts` 代码嵌入（无论哪种都不在运行时获取）；区别在于这些数据
实际占测得表面的**多少**，以及运行时代码如何使用它：
- **Stage 1（横截面放样）** 对每个节点测量一组**稀疏**的环采样（girl-character：748 个环，共 86,240 个
  点，源网格有 210 万顶点），以及少量调参数字（每节点辐条数、Catmull-Rom 控制行为、目标边长）。运行时，
  放样函数通过在这些实测环*之间*插值来**合成**新几何——第 i 个环和第 i+1 个环之间的壁面在测量数据中
  根本不存在；它们是生成出来的。
- **Stage 2/3（SDF 泼溅 + Surface Nets + 紧凑编码）** **稠密**地测量——每个符号变化的体素格子，数百万
  顶点——并把它重新编码（varint 增量 + 连通性位，约 8 字节/顶点）为 base64，放进一个提交的 `.ts` 模块。
  运行时没有插值或合成：解码还原的就是测得的表面本身，基本不变。它之所以存在，只是因为横截面放样本质上
  是 2.5D 的，无法表达向自身折回的细节（眼睑、鼻孔、肚脐）——见 `PIPELINE.md` 中 Stage 1 的结尾说明和
  Stage 2 的开头。

在新角色上运行本集成之前，从头到尾读一遍 `PIPELINE.md`——它是完整的、逐阶段的方法论（接收、横截面
放样、Surface Nets、紧凑编码、验证、Stage 6 中关于眼窝的教训），提炼自实际构建 `girl-character` 的过程。
本 README 只涵盖安装和日常命令。

## 安装

```bash
uv sync --project integrations/glb_character_pipeline --python 3.11
cd integrations/glb_character_pipeline/node && npm install && npx playwright install chromium
```

## 使用

```bash
export IMG2THREEJS_SHOWCASE_ROOT=/path/to/img2threejs-showcase
export IMG2THREEJS_GLB_PIPELINE_PYTHON="uv run --project integrations/glb_character_pipeline python3"

# 逐字节复现 girl-character 自身已交付的构建
integrations/glb_character_pipeline/build-character.sh \
  --config integrations/glb_character_pipeline/configs/girl-character.env

# 启动一个新角色：复制 configs/example.env，填写每一项，然后以同样方式运行
integrations/glb_character_pipeline/build-character.sh --config path/to/your-character.env
```

`--skip-splat` 复用磁盘上已有的任何 `.bin` 中间文件（跳过 Stage 2）；`--skip-build` 在 Stage 9 的
`tsc`/`vite build` 和截图之前停止，适合只在 Stage 3 上迭代时使用。初次阅读时值得避开的反模式见
`PIPELINE.md` 的附录 A，完整的 阶段 → 脚本 → 输出文件 对照表见附录 B。

## 包含内容

- `python/slice_node.py`、`python/measure_density_convergence.py`、`python/build_cross_sections.py`——
  Stage 1：横截面放样，纯代码底线。`measure_density_convergence.py` 只打印表格——最终每节点辐条数由人/
  代理判断决定，它不会替你定下来（见 `PIPELINE.md` Stage 1）。每次构建可选：不设置
  `CHARACTER_SECTION_REGIONS_JSON` / `CHARACTER_SPOKES_JSON` / `CHARACTER_CROSS_SECTIONS` 即可跳过，并
  原样保留已有文件。
- `python/bake_atlas_uvs.py`——一个显式受门控（`CHARACTER_ALLOW_BASELINE_UV=1`）的应急出口，把基线 GLB
  自身的纹理 UV 迁移到横截面上。这偏离了 img2threejs 常规的"不使用基线资产"规则（那是为 girl-character
  授权的一次性例外）——在为新角色设置该环境变量之前，先完整阅读它自己的 docstring。
- `python/build_head_surface.py`、`python/export_sdf_surfaces.py`——Stage 2：SDF 泼溅 + Surface Nets，
  逐节点进行，按角色的节点列表批量处理。
- `node/verify_cells.mjs`——Stage 3 预检查：仅凭格子邻接重建每个三角形，并与源数据做差异比对；在写下
  编码器的任何字节之前必须显示 0 次冲突。
- `node/encode_surfaces.mjs`、`node/emit_surface_module.mjs`——Stage 3：紧凑的 varint + 连通性编码，以
  base64 嵌入一个提交的 `.ts` 模块（运行时不获取）。
- `node/verify_roundtrip.mjs`——Stage 3 验证：把每个生成的等级与它所替代的二进制做往返比对。
- `node/capture-character.mjs`、`node/compare_views.mjs`——Stage 9：在移走二进制中间文件的情况下做无头
  浏览器渲染（证明没有获取任何东西），并与之前的截图做像素差异比对。
- `build-character.sh`——串联以上所有步骤的通用编排器；每个路径和节点列表都来自 `--config` 指定的 `.env`
  文件（`configs/example.env`、`configs/girl-character.env`），绝不硬编码在脚本中。

## 环境

- Python：`integrations/glb_character_pipeline/.venv/`（通过 `uv sync`）。
- Node：`integrations/glb_character_pipeline/node/node_modules/`（通过 `npm install`）。

本集成如何与其他诊断/参考工具配合，见 `docs/integrations/reference_fidelity_tooling.md`；本集成的截取
步骤所依赖的 GLB 中介截取桥接契约，见 `grimoire/build/python_threejs_render_bridge.md`。
