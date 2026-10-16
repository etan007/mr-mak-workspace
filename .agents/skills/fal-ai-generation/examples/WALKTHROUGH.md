# 一个小型入门任务

对代理说：“用 fal.ai 做一个黄铜天文台机器人概念图。先检查实时模型 schema。
把结果连同提示词和请求 ID 保存到本地。我看过之后再决定是否编辑。”

代理从当前的模型发现结果中选择模型，或使用你指定的模型。随附的输入是
Nano Banana Pro 示例，不代表固定的模型偏好。在本技能目录下本地演练：

```text
python scripts/fal_job.py submit --endpoint fal-ai/nano-banana-pro --input examples/concept.json --out output/robot --dry-run
```

预期：输出 `dry_run: true`、端点和输入字段名。不发网络请求，也不生成图像。
这只检查辅助脚本，不检查你的账号访问权限。

真正需要生成时，去掉 `--dry-run`。回执为 `output/robot/job.json`。
后续跟进时不要重新提交：

```text
python scripts/fal_job.py status --job output/robot/job.json
python scripts/fal_job.py result --job output/robot/job.json
```

获取结果时会先确认队列状态为已完成，再把媒体下载到同一任务目录。
接受之前先检查对象。要编辑选定图像，先上传该本地文件，用保存的上传 URL
替换 `edit.json` 中的占位符，检查编辑端点，并使用新的任务目录。

预期视觉标准：一个完整的机器人，望远镜头部，三只脚，蓝色机身，轮廓清晰可读。
编辑时只改变涂装。本包不含示例渲染图；这些标准是演练说明，不代表为交接
实际运行过生成。
