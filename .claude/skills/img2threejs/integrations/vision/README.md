# 可选的本地视觉适配器

该环境提供 SAM2 遮罩、Depth Anything V2 相对深度先验，以及 MediaPipe 面部/姿势关键点，而不给只用标准库的
`forge` 核心增加依赖。

安装并预取：

```bash
uv sync --project integrations/vision --python 3.11
python3 forge/stage1_intake/run_vision_adapter.py prefetch
python3 forge/stage1_intake/run_vision_adapter.py health
```

使用：

```bash
python3 forge/stage1_intake/run_vision_adapter.py \
  segment reference.png --point 512 320 --out evidence/subject-mask.png

python3 forge/stage1_intake/run_vision_adapter.py \
  depth reference.png --out evidence/relative-depth.png

python3 forge/stage1_intake/run_vision_adapter.py \
  landmarks face reference.png --out evidence/face-landmarks.json

python3 forge/stage1_intake/run_vision_adapter.py \
  landmarks pose reference.png --out evidence/pose-landmarks.json
```

每条命令都会输出来源记录和证据边界。SAM2 遮罩仍需代理确认选中的是预期组件。深度是相对的、而非度量的，
不能作为隐藏几何的依据。MediaPipe 关键点在进入 sculpt spec 之前需要经过解剖学评审。

环境和模型仅限本地：

- 环境：`integrations/vision/.venv/`
- Hugging Face 缓存：`runtime/vision/huggingface/`
- MediaPipe 任务模型和 manifest：`runtime/vision/models/`

流水线路由和 MCP 用法见 `docs/integrations/reference_fidelity_tooling.md`。
