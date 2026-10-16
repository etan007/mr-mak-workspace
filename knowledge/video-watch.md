# 检查视频参考

用本地提取工具为片段生成带时间戳的可视化概览。场景采样有助于定位素材；它不是
逐帧的动作测量。

```powershell
python -m venv .venv-video
.\.venv-video\Scripts\python.exe -m pip install -r scripts/video-watch/requirements.txt
.\.venv-video\Scripts\python.exe scripts/video-watch/extract.py "path\to\clip.mp4" 2026-09-15_motion-reference --max-frames 40
```

输出文件夹包含源视频的本地副本、JPEG 帧、带时间戳的 `frames.json` 以及
`report.html`。脚本不会创建注册表条目；请用工作区撰写技能把报告作为一个 step
加到相关卡片中。源视频可能很大，按任务需要决定保留或发布。

输入为 URL 时，若下载器需要，请安装 FFmpeg。下载优先选择中等分辨率的纯视频流。
语音请用单独配置的转写工具从原始音频分析；不要假定下载的视觉参考中有音频。

打开提取出的图片，并在总结中引用时间戳。分析走路循环时，留意触地、交叉、抬起和
恢复姿态。如果场景检测对连续动作返回的帧太少，用 FFmpeg 或编辑器从原片中更密集地
采样。基于它导出动画之前，先通过播放核实实际动作。

不同的源请使用新的输出文件夹。该辅助脚本会有意复用已下载的源，以免重复工作。
