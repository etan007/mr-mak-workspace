# 资产交付凭证

这个可选的离线工具为工作区卡片记录本地输入和输出文件。现有卡片不需要清单也能
正常使用。清单只证明所选文件仍具有记录的大小和 SHA-256 哈希。视觉认可和引擎就绪
需要单独审查。

## 构建与校验

在仓库根目录使用 Node.js 22 或更新版本。编辑 [examples/plan.json](examples/plan.json)，列出你所选根目录下的文件。每个文件包含相对的正斜杠路径 `path`、简短的 `role`，以及 `kind`（`input` 或 `output`）。至少需要一个 output。`card_id` 标识工作区卡片，`step` 是为本次交付选的简短里程碑名称。

```sh
node scripts/asset-delivery/manifest.mjs build --plan scripts/asset-delivery/examples/plan.json --root . --out delivery.json
node scripts/asset-delivery/manifest.mjs verify --manifest delivery.json --root .
```

第一条命令创建 `delivery.json`；它拒绝覆盖已有文件。省略 `--out` 则把清单输出到 stdout。校验只读取清单和所选文件，报告缺失或改动的文件，失败时以非零状态退出。仓库中的 [示例清单](examples/manifest.json) 可以用第二条命令校验，只需把 `delivery.json` 替换为它的路径。运行 `npm run test:assets` 执行 CLI 测试。

[JSON Schema](schema-v1.json) 描述清单格式。CLI 还会检查相对路径、重复项、是否为常规文件，以及符号链接或 Windows junction 是否解析到所选根目录之外。构建或校验清单时保持文件不变；CLI 不会锁定文件系统以防并发修改。

请与你信任的清单比对：该格式没有签名，不验证文件作者或提供方身份。文本夹具通过 `.gitattributes` 使用 LF 换行，确保在 Windows 和 Linux 上 Git 检出后保持示例清单中记录的字节。

`provider`、`model` 和 `receipt_id` 为可选字段。只使用非机密的回执 ID。不要在这些字段中包含凭据、带签名的 URL、提供方原始响应或私密内容。CLI 会拒绝未知字段、这些元数据字段中的 URL 以及几种常见的令牌前缀，但分享清单前你仍须自行检查。即使不包含文件本身，路径和哈希也可能泄露项目信息。
