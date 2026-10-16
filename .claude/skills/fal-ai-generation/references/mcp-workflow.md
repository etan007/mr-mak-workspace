# MCP 工作流

以下是 2026 年 9 月 15 日已连接的 fal.ai 服务器暴露的工具名。宿主可能会在前面
加上连接器名称前缀。应发现可用工具，而不是依赖特定的宿主前缀。

| 阶段 | 工具 | 必要输入 |
| --- | --- | --- |
| 未选定模型时选择模型 | `recommend_model` | `task` |
| 查找指定模型或操作 | `search_models` | 该连接支持的查询/分类 |
| 检查输入和输出 | `get_model_schema` | `endpoint_id` |
| 估算批次费用 | `get_pricing` | 端点及其当前 schema 接受的参数 |
| 准备公开参考 | `upload_file` | `url`，或支持的小型内联上传 |
| 提交并短暂等待 | `run_model` | `endpoint_id`、`input` |
| 提交但不等待 | `submit_job` | `endpoint_id`、`input` |
| 检查同一请求 | `check_job` | `endpoint_id`、`request_id`，有则带上返回的 `status_url` |
| 获取已完成的结果 | `get_job_result` | `endpoint_id`、`request_id`，有则带上返回的 `response_url` |

## 其他已验证的路径

2026 年 9 月 15 日的只读 schema 检查还确认了：

- `fal-ai/patina/material`：文本驱动的材质生成。必填字段是 `prompt`；schema 包含
  `maps`、`image_size`、`tiling_mode` 和 `output_format`。它不同于处理图像的
  `fal-ai/patina`。
- `tripo3d/h3.1/image-to-3d`：`image_url` 必填。几何/贴图质量、PBR、朝向和面数
  上限是独立的控制项。其结果可包含模型网格、备选模型 URL 和渲染图。

这些路径说明了为什么输入必须遵循实际操作。模型可用性、价格和参数限制应在任务
运行时检查。

## 示例：一次忠实的图像编辑

用户已明确选择 Nano Banana Pro 并提供了图像。用 `get_model_schema` 检查
`fal-ai/nano-banana-pro/edit`，上传该图像，然后使用如下输入。把示例 URL 替换为
实际上传得到的 URL。

```json
{
  "endpoint_id": "fal-ai/nano-banana-pro/edit",
  "input": {
    "prompt": "Keep the same object, proportions, camera, background and lighting. Change only the blue painted panels to muted green. Preserve unpainted metal and all small details.",
    "image_urls": ["https://example.invalid/replace-with-your-upload.png"],
    "aspect_ratio": "auto",
    "resolution": "2K",
    "num_images": 1,
    "output_format": "png"
  }
}
```

上述输入字段已对照实时 schema 检查过，下次使用时请重新检查。它们是该端点的示例，
不是通用的图像 API 契约。不要提交占位 URL。新概念应选择对应的文生图端点；编辑时
不要意外遗漏参考图。

## 本地参考上传

对托管服务器而言，`file_path` 不是代理的本地文件系统。使用：

```text
python scripts/fal_job.py --env /path/to/project/.env upload --file /path/to/reference.png --out /path/to/output/reference-upload.json
```

它调用官方 SDK 的本地文件上传器。从保存的 JSON 中读取返回的 `url`。大段 base64
会浪费对话空间；不要把文件字节放进对话。如果模型接受且宿主能获取，已有的公开
参考 URL 可以直接使用。localhost URL 不是公开 URL。

## 恢复

立即保存 `request_id`、端点和规范队列 URL。以合理间隔轮询，并持续向用户更新进度。
`IN_QUEUE`、`IN_PROGRESS` 以及工具返回的 `processing` 都表示继续跟进现有请求。
状态为 `COMPLETED` 时，先检查结果中是否有错误，再宣布成功。检查所有预期输出；
URL 或完成标记不等于视觉质检。

下载失败可用同一结果重试。不要为修复本地下载而重新生成资产。如果原始提交结果
未知，先检查账号历史，再发起另一个计费请求。取消是单独的用户操作；未经要求不要
取消缓慢的请求。

## 账号与输出边界

fal 的托管 MCP 使用 Bearer 授权 header。REST 模型 API 使用
`Authorization: Key ...`；Python SDK 读取 `FAL_KEY`。不要混用这些 header 格式。
MCP 访问不共享对话应用的订阅：生成消耗的是接收方的 fal 账号。

来源：[官方 MCP 设置](https://fal.ai/docs/documentation/setting-up/mcp)、
[队列 API](https://fal.ai/docs/documentation/model-apis/inference/queue)、
[Python SDK](https://github.com/fal-ai/fal/tree/main/projects/fal_client)。
