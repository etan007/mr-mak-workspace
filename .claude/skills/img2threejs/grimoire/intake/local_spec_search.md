# 本地 Spec 检索

在图像分析之后、编写或细化 spec 之前，只要需求涉及特定领域的结构解剖、PBR、磨损、几何、运行时
或物理规格，本地证据检索就是一个流水线阶段，而不是可选的记忆查询。

预 spec 命令会自动运行 BM25：若已解析出领域，就选用该领域提供的集合，否则选用 `core_3d`，
并把一个 `localSpecSearch` 证据包写入评估结果：

```
python3 forge/stage2_spec/new_pre_spec_assessment.py "Name" --image <img> --out assessment.json
```

用可重复的 `--spec-query "<term>"` 添加观察到的术语；只有当自动选择的集合不够用时，才使用
`--collection <collection>`。`new_sculpt_spec.py --assessment` 会把该证据包带入最终 spec，包括
片段、`source_refs` 和 `evidence_refs`。

如需额外的定向检索，仍可直接使用 CLI：

```
python3 forge/stage1_intake/search_specs.py "<query>" --collection <collection> --limit 3 --snippet-chars 250 --json
```

对于领域语料，同时包含解剖学名称和俗称，例如
`--spec-query "safety ring finger ring"`，或用 `search_specs.py` 直接查询该集合。领域语料随提供它的插件一起发布。
用物体名称、组件名称、材质/表面处理术语、行为术语和已知别名扩展查询；首个结果不完整时，换用
更聚焦的替代查询重试。依据返回的证据构建 spec；存在本地证据时，不要自行编造领域 spec。检索缓存
仅限本地/自动生成；应保留 JSONL 记录和来源出处，而不是用缓存输出替换它们。
