# 在其他项目中连接 fal.ai

把完整的 `fal-ai-generation` 文件夹复制到该项目的 Claude 或 Codex 技能目录。
两个代理都用时只保留一份规范副本。不需要 Mr. Mak 仓库、原账号或私有项目文件夹。

## 账号与 MCP

在 [fal 控制台](https://fal.ai/dashboard/keys) 创建你自己的 API key。
除非任务需要账号管理，否则使用 inference/API 权限范围。
连接 Streamable HTTP MCP 服务器 `https://mcp.fal.ai/mcp`，并设置
`Authorization` header，值为 `Bearer <your key>`。

使用客户端的环境变量/header 支持，避免把真实密钥提交到仓库。
在 Mr. Mak 中，项目 `.env` 可包含 `MRMAK_MCP_FAL_AUTHORIZATION`，值为完整的
Bearer 值；新的代理会话会收到这个明确限定范围的值。
Claude 的共享 `.mcp.json` 引用 `${MRMAK_MCP_FAL_AUTHORIZATION}`，Codex 的项目配置
使用 `env_http_headers`。独立终端必须在启动代理前加载该变量。并非每个 MCP 客户端
都会自动读取根目录 `.env`。合并到已有配置中，不要替换其中的服务器。

不要把文档连接 `https://docs.fal.ai/mcp` 与生成用 MCP 混淆。客户端支持会变化；
请遵循当前的 [官方连接指南](https://fal.ai/docs/documentation/setting-up/mcp)。
在目标代理会话中确认 `get_model_schema` 等工具可用。仅有配置文件不能证明连接
已生效。列出工具或读取 schema 不需要生成图像。

## 可选的 Python 辅助脚本

使用 Python 3.10+，在本技能目录下安装小型依赖文件：

```text
python -m pip install -r scripts/requirements.txt
python scripts/fal_job.py --help
```

在环境变量或项目中被忽略的 `.env` 里设置 `FAL_KEY`。辅助脚本也识别旧版
`FALAI_KEY` 和 Mr. Mak 限定范围的 MCP Bearer 变量。
用 `--env /path/to/project/.env` 明确指定文件；否则只考虑当前工作目录下的 `.env`。
凭据绝不会被打印。

```text
python scripts/fal_job.py submit --endpoint fal-ai/nano-banana-pro --input examples/concept.json --out output/concept --dry-run
```

dry run 不导入 SDK、不上传文件、不联系 fal，也不创建付费任务。真正的 `submit`
会消耗账号额度。示例中不含密钥。

任务回执、参考上传和生成的媒体保存在接收方自己的任务目录中。再次分享本技能时，
分享干净的源文件夹，而不是包含 `.env` 或私有回执的工作目录。
