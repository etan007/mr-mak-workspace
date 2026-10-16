# 规范化 spec 记录词汇表

本目录存放经过评审并提交的 JSONL 记录，用于本地规格搜索。每个非空行恰好是一个 UTF-8 JSON 对象。
某个集合可以暂时没有记录文件，但只要记录文件存在，其中每一行都必须满足本约定。

## 未来的导入接口

Todo 3 必须从 `forge._shared.spec_search` 暴露 `load_jsonl_records(path: Path)`。它返回经过校验的记录；
遇到格式错误的 JSON、非对象的 JSON 值、缺少必填字段或类型错误的值时，抛出
`SpecRecordValidationError`。错误信息指明输入路径和从 1 开始的行号。无效行绝不会被跳过或静默修复。

## 标准行

```json
{
  "record_id": "cs2.karambit.safety-ring",
  "collection": "cs2",
  "domain": "weapon-anatomy",
  "kind": "component",
  "entity": "karambit safety ring",
  "title": "Karambit safety ring / Vòng ngón Karambit",
  "aliases": ["safety ring", "finger ring", "vòng ngón"],
  "content": "A retention ring at the Karambit's pommel.",
  "constraints": ["Preserve the opening as a distinct component."],
  "measurements": [
    {"name": "opening diameter", "value": "source-dependent", "unit": "mm"}
  ],
  "source_refs": [
    {
      "path": "docs/cs2/3D_Technical_Mapping.json",
      "key_path": "karambit.components.safety_ring"
    },
    {"path": "docs/cs2-anatomy/karambit.md", "heading": "Safety ring"}
  ],
  "evidence_refs": [
    {"kind": "source", "ref": "docs/cs2/3D_Technical_Mapping.json"}
  ],
  "observation_status": "observed",
  "confidence": 0.9,
  "assumptions": []
}
```

`record_id` 是稳定的、小写、以点分隔的标识符。它绝不从显示标题派生，措辞变化时也必须保持不变。
`collection` 指定所属的搜索集合；`domain`、`kind` 和 `entity` 对记录分类，但不强加全局分类体系。
`title`、`aliases` 和 `content` 是可搜索文本。`aliases` 按编写时原样保留英文和越南语术语；
规范化和查询扩展在后续环节进行。

## 必填字段与稳定类型

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `record_id` | 非空字符串 | 在集合内稳定且唯一的标识符。 |
| `collection` | 非空字符串 | 拥有该记录的集合键。 |
| `domain` | 非空字符串 | 领域分组，例如 `weapon-anatomy` 或 `pbr`。 |
| `kind` | 非空字符串 | 记录类别，例如 `component`、`material` 或 `constraint`。 |
| `entity` | 非空字符串 | 标准实体或概念名称。 |
| `title` | 非空字符串 | 人类可读的可搜索标题。 |
| `aliases` | 字符串数组 | 零个或多个编写时给出的同义词，已知时包括双语别名。 |
| `content` | 字符串 | 有来源依据的简明描述；只有当结构化字段承载了可搜索细节时才可为空。 |
| `constraints` | 字符串数组 | 要求、禁止项或注意事项。 |
| `measurements` | 对象数组 | 每个对象有非空字符串 `name` 和 `value`；可选的 `unit` 和 `context` 为字符串。数值保留来源原文，不得臆造数字。 |
| `source_refs` | 非空对象数组 | 提炼陈述的来源。每个对象有非空字符串 `path`，可以有非空字符串 `heading` 和/或 `key_path`。 |
| `evidence_refs` | 对象数组 | 支撑性来源。每个对象有非空字符串 `kind` 和 `ref`；可选的 `note` 为字符串。 |
| `observation_status` | 字符串 | `observed`、`inferred` 或 `unverified` 之一。 |
| `confidence` | 数字 | 闭区间 `0.0` 到 `1.0`；表示对提炼陈述的置信度，而非搜索相关度。 |
| `assumptions` | 字符串数组 | 限定该记录的明确假设。 |

记录必须保留原始来源位置。Markdown 章节用 `heading`，JSON 位置用 `key_path`；当来源格式同时提供
两种位置形式时，一个来源引用可以同时包含两者。路径相对于仓库根目录，使用正斜杠。`evidence_refs`
可以指向源文件、外部标识符或评审产物，但不能替代 `source_refs`。

`observed` 表示有被引用的来源或参考产物直接支撑。`inferred` 表示经过推理的解读，并保留其假设。
`unverified` 表示有用的术语或仍需确认的候选论断。不要编码没有依据的确定性：应降低 `confidence`、
选择合适的状态，并记录限定性假设。
