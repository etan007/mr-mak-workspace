# 撰写工作区卡片

1. 阅读当前注册表，复用相关的项目或任务卡片。
2. 只为新的独立任务创建带日期的文件夹。源文件和输出媒体放在该任务或其项目文件夹内。
3. 结果默认用简体中文撰写。使用稳定的标签页名称和相对路径。当某个主项目是用户的
   工作中心时，保持其置顶。
4. 加入共享的报告 CSS 和脚本；使用 `data-mak-report="document"`。Markdown 不需要
   HTML 外壳，会在排版后的文档视图中打开。
5. 每张图片都可点击并可下载。视频需要原生控件。来源链接放在相关论断附近，历史上的
   模型运行标注为历史。
6. 有实质改动后更新注册表的 `updated` 日期。保留原始 `created` 日期。不要把个人
   工作标记为 `sample: true`。
7. 在宽、窄两种宽度下打开每个改动过的标签页，测试链接和媒体，然后报告结果。构建出
   安装程序不等于已安装更新。

新的 HTML 报告可以这样开头：

```html
<!doctype html>
<html lang="zh-CN" data-mak-report="document">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Project report</title>
  <link rel="stylesheet" href="../_shared/report.css">
  <link rel="stylesheet" href="../_shared/examples.css">
  <script defer src="../_shared/report.js"></script>
</head>
<body><main class="container"><h1>Project report</h1></main></body>
</html>
```

上面的相对路径假定文件夹直接位于 `workspace/` 下。嵌套的报告需相应调整。所有示例
页面都遵循同一套共享样式。
