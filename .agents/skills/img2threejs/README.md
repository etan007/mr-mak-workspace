<div align="center">

<img src="assets/logo.svg" width="112" height="104" alt="img2threejs logo" />

# img2threejs

**把参考图中的物体重建为纯代码、程序化的 Three.js 模型。**

经过质量门禁、可直接用于动画，并刻意节省 token——用代码重建，而不是摄影测量、网格提取或下载美术资源包。

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](CHANGELOG.md)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Runtime](https://img.shields.io/badge/runtime-Three.js-000000.svg)](https://threejs.org)
[![Tooling](https://img.shields.io/badge/tooling-Python%203.10%2B%20stdlib-3776ab.svg)](forge)
[![Sponsor](https://img.shields.io/badge/Sponsor-Ko--fi-FF5E5B.svg?logo=kofi&logoColor=white)](https://ko-fi.com/iamnick)
[![Scripts](https://img.shields.io/badge/scripts-forge%20%2F%20scripts-3776ab.svg)](scripts)
[![Sponsored by Atlas Cloud](https://img.shields.io/badge/Sponsored%20by-Atlas%20Cloud-000000.svg?labelColor=1a1a1a&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4NDUuOTUgNzkyIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNzEyLjA1LDU5NC4zTDQyMi45OCwxNS40NiwxMzMuOSw1OTQuM2wtOTEuMDEsMTgyLjI1YzU3LjE4LTM0LjU1LDExOS40OS02MS40LDE4NS40NC03OS40NSw2Mi4wMi0xNi45NywxMjcuMjQtMjYuMjEsMTk0LjY1LTI2LjIxLDM0LjY5LDAsNjguNzksMi40OSwxMDIuMTksNy4xOGwtNjUuNzItMTQxLjc2Yy0xOC42MS0zLjIzLTEwMS4yOC0zLjIzLTE2MS44Myw5Ljg0bDEyNS4zNi0yNzMuMTYsMTk0LjY1LDQyNC4xMmMuMzUuMS42OS4yMSwxLjAzLjMsNjUuNTcsMTguMDQsMTI3LjUzLDQ0Ljc4LDE4NC40MSw3OS4xNGwtOTEuMDEtMTgyLjI1WiIvPjwvc3ZnPg%3D%3D)](https://www.atlascloud.ai/console/coding-plan)
[![Sponsored by Tripo](https://img.shields.io/badge/Sponsored%20by-Tripo-000000.svg?labelColor=1a1a1a&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBmaWxsPSIjZmFjZTAwIiBkPSJNMTIuNjYxIDQuNzUyYS4wNC4wNCAwIDAwLS4wMTMtLjA1NS4wMzguMDM4IDAgMDAtLjAyLS4wMDVINi40OTZhLjE5LjE5IDAgMDEtLjE2NS0uMDkyTDQuMjQ1IDEuMDUyYS4wMzQuMDM0IDAgMDEuMDE0LS4wNDdBLjAzOC4wMzggMCAwMTQuMjc1IDFjNS40OTIgMCAxMC43MzMgMCAxNS43MjEuMDAyIDIuMDg5IDAgMy42OTkgMS41NCA0LjAwMyAzLjU5OC4wMDguMDYyLS4wMTkuMDkyLS4wOC4wOTJoLTYuNjdhLjIwNC4yMDQgMCAwMC0uMTc0LjFjLTEuNDE0IDIuNDEtMi44MiA0LjgwMy00LjIxOCA3LjE3OC0uMjguNDcyLS45Mi42Mi0xLjM3My4zNDItLjE5LS4xMTYtLjM1Ny0uMzA0LS41MDItLjU2MWEzNy45MTcgMzcuOTE3IDAgMDAtLjg4Mi0xLjQ4OWMtLjIyMi0uMzU2LS4yMzQtLjcwNy0uMDM1LTEuMDUyYTY2MS43NyA2NjEuNzcgMCAwMTIuNTk3LTQuNDZ2LjAwMnoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTAuNzcyIDE2Ljk4NmMuNTcuOTcyIDEuOTM1LjkxNiAyLjQ4OS0uMDI4TDE5IDcuMTY0YS4xMjcuMTI3IDAgMDEuMTE2LS4wNjdoNC4yM2MuMDE3IDAgLjAzLjAxNC4wMjguMDMgMCAuMDA1LS4wMDEuMDEtLjAwMy4wMTMtMi42MDUgNC40MzItNS4yMzIgOC45MDYtNy44OCAxMy40Mi0xLjI4MyAyLjE5MS00LjI3OCAyLjUxNy02LjE3OS45NDctLjMwOC0uMjU0LS42NjUtLjcyNy0xLjA2OS0xLjQxNy0yLjUyNS00LjMyNC01LjA5OC04LjcxLTcuNzItMTMuMTYyLTEuMDYzLTEuODAzLS40MjQtMy45NDcgMS4xOS01LjIuMDUzLS4wNDEuMDk1LS4wMzMuMTI5LjAyMyAyLjkwNSA0Ljk1IDUuODgyIDEwLjAyOSA4LjkzIDE1LjIzNnoiLz48L3N2Zz4%3D)](https://www.tripo3d.ai/)
[![Sponsored by Hyper3D](https://img.shields.io/badge/Sponsored%20by-Hyper3D-000000.svg?labelColor=1a1a1a&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAADlElEQVRYCeWWbWiOURjH9wzDZoYs5i3aF%2FEBiTYZRQ35qGxS%2B2AoFNoHRcl7vlETGcWX1aLkLbKsJTNiXmpKpExt5v2lGWNte%2Fz%2Bd%2Ff9dO6z57mfe08p5arfc851netc57rP23PS0v53iYSZgGg0Ogy%2F5VACU%2BAnnIlEIjWUf1cYvAgaIZ7sxxjqI1LKkuCb4Ue8kV1bB%2BXElIIn60TgLdDnDhRULEsWa8DtjKZp7woa1W37TTljwAMEdSBgFjS5AyQrzuOQ7jKCcnBQ7FBtBCmHZPIdh0oYpaCUObATnoCS3wPzwwzo28F0GkKnezDX7fyJ8gF8hT54Bc3wmCP4mtIn9C%2FCcBbyoQv2QSW%2BqicXAhRAL7yFU3AI6uEoTE8ewZmNqfg%2BB8kL0FFdEqavpnI9qPNe0HRKdkOGHQBbBIbbdunYi6EbfsER%2BAC6yBILDgqoo3cavBOwPXEPZyDNWNxjiP0iSA6CTks7zAyKp8xLwBv8ZKCz24j%2FMVhj%2B2JbCRItoy4syW0YavvGdBovywvRHpgcawio4LcBWmG06YaeB7pFlUAneFJm%2BqWbCvWXrn6FndtqtSVSJ9GgPTLecviG3gDZYH71VjLRn5sjdgKNrv2CWwYWBNItOBZqYZ7l3IN%2BHyaAeUHNQS8AR8wGGe6AvlznP64w6FIaRrosoNTAs6AOTNGXt8Em00hdH10It8CXWRrT%2FpEBTmA3p0x%2BppSj2JtOF403e56vlmA25HoGo1TijtgzIONxiK2R4%2BX%2F6fWrjnaO3xbLnoduJ%2Bq55HgVew%2FIHoUMZiLTc7JKe3Y09TuYPV3VpixE8Z0Ms9Grx2aAAZWMprcCpsEzbFUErqJuyk0Ubbz3oMFr8NETzZagS6fddtYltBbiyeF%2BziEMBCqNF8y1lfpCYNQ1fDegw0batPNDCb6ZkAstYMsjDP6lwaA1b7Y9DV033S5YB1mJsqAtGyrAeSVRFkIj6CbUdVwH%2BWb%2F2HuAhus0rDAbrXotus61LhKt%2FTX4DBLNjv7tVkE9bGNfaDNrabW3dBx74Klnp%2B4XHBeD%2FrWCpJpGvRNMP%2FPh%2BoC20EvlzwCNzmVg%2FnGg9pOHWA7AJdDSeHKVyoCf6LEl8LIhiN5yekoVQ7x7Qq468w2gP68meAc3mN5uygFJvwS83iSyiPpqUELjYAwooU7QgG%2BgGjTwF8qUJGECZjSS0bWqy2cQdEBbKl9Lv39P%2FgAQ2ul5m76dAQAAAABJRU5ErkJggg%3D%3D)](https://hyper3d.ai/)

<table align="center">
  <tr>
    <td align="center"></td>
    <td align="center"><sub><b>每日</b></sub></td>
    <td align="center"><sub><b>每周</b></sub></td>
  </tr>
  <tr>
    <td align="right"><sub><b>Python</b></sub></td>
    <td><a href="https://trendshift.io/repositories/83608?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-83608" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/83608/daily?language=Python" alt="hoainho%2Fimg2threejs | Trendshift" width="250" height="55"/></a></td>
    <td><a href="https://trendshift.io/repositories/83608?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-83608" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/83608/weekly?language=Python" alt="img2threejs%2Fimg2threejs | Trendshift" width="250" height="55"/></a></td>
  </tr>
  <tr>
    <td align="right"><sub><b>所有语言</b></sub></td>
    <td><a href="https://trendshift.io/repositories/83608?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-83608" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/83608/daily" alt="img2threejs%2Fimg2threejs | Trendshift" width="250" height="55"/></a></td>
    <td><a href="https://trendshift.io/repositories/83608?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-83608" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/83608/weekly" alt="img2threejs%2Fimg2threejs | Trendshift" width="250" height="55"/></a></td>
  </tr>
</table>

</div>

*参考图在代码中被重建为可直接用于动画的 Three.js 模型，在浏览器中实时运行。*

### [→ 打开在线演示画廊](https://img2threejs.io/)

画廊中的每个模型都是生成的代码，在你的浏览器中运行。没有网格文件，无需下载。

---

## 在线演示

完全由基元、程序化着色器和生成的几何构建的重建。打开任意模型即可环绕查看、检查其参考图并阅读生成的源码。

| 演示 | 对象 | 构建版本 | 查看 | 源码 |
| --- | --- | --- | --- | --- |
| Dual-Sword Warrior — TypeScript procedural surfaces ⚠︎ | character | `v1.5.1` | [在线](https://img2threejs.io/#/demo/girl-character) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/girl-character/createGirlCharacterModel.ts) |
| Low-Poly Humanoid — Rigged Character ⚠︎ | character | `v1.5.0` | [在线](https://img2threejs.io/#/demo/low-poly-humanoid) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/low-poly-humanoid/createLowPolyHumanoidModel.ts) |
| ★ Talon Knife \| Doppler Ruby (Factory New) | object | `v1.4.4` | [在线](https://img2threejs.io/#/demo/talon-doppler-ruby) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/talon-doppler-ruby/createTalonDopplerRubyModel.ts) |
| AWP \| Medusa (Minimal Wear) · V2 rebuild | object | `V2` | [在线](https://img2threejs.io/#/demo/awp-medusa-v2) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/awp-medusa-v2/createAwpMedusaModelV2.ts) |
| Pikachu 10K Star Celebration ⚠︎ | character | `v1.5-beta` | [在线](https://img2threejs.io/#/demo/electric-mouse-mascot) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/electric-mouse-mascot/createElectricMouseMascotModel.ts) |
| Glock-18 \| Ghost Protocol (Well-Worn) | object | `v1.4.1` | [在线](https://img2threejs.io/#/demo/glock-ghost-protocol) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/glock-ghost-protocol/createGlockGhostProtocolModel.ts) |
| Classic Knife \| Fade (Minimal Wear) | object | `v1.3` | [在线](https://img2threejs.io/#/demo/classic-fade) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/classic-fade/createClassicFadeModel.ts) |
| BMX Endurance Bike | object | `v1.3` | [在线](https://img2threejs.io/#/demo/bmx-endurance) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/bmx-endurance/createBmxEnduranceBikeModel.ts) |
| M9 Bayonet \| Doppler Phase 2 | object | `v1.3` | [在线](https://img2threejs.io/#/demo/m9-doppler) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/m9-doppler/createM9DopplerModel.ts) |
| Sony WF-1000XM3 Earbuds + Case | object | `v1.2` | [在线](https://img2threejs.io/#/demo/sony-wf1000xm3) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/sony-wf1000xm3/createSonyWf1000xm3Model.ts) |
| ISSACA 12 Gauge Shotgun | object | `v1.2` | [在线](https://img2threejs.io/#/demo/issaca-shotgun) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/issaca-shotgun/createIssacaShotgunModel.ts) |
| Gerber Paracord Knife | object | `v1.2` | [在线](https://img2threejs.io/#/demo/gerber-knife) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/gerber-knife/createGerberKnifeModel.ts) |
| Doraemon House (isometric diorama) | object | `v1.2` | [在线](https://img2threejs.io/#/demo/doraemon-house) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/doraemon-house/createDoraemonHouseModel.ts) |
| War-Hauler "SECTOR 07" | object | `v1.2` | [在线](https://img2threejs.io/#/demo/warhauler) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/warhauler/createWarHaulerModel.ts) |
| Crowned Loot Chest ⚠︎ | object | `v1.2` | [在线](https://img2threejs.io/#/demo/crown-chest) | [代码](https://github.com/img2threejs/img2threejs-showcase/blob/main/src/demos/crown-chest/createCrownChestModel.ts) |

⚠︎ 表示该演示在注册表中的 `status` 仍为 `placeholder` 而非 `final`——它能渲染，但并非完成品。
**构建版本**一列是每个演示自己的注册表条目在 `generatedWith` 中记录的版本，不是根据日期推断的；
`awp-medusa-v2` 记录的是 `V2`，指该演示的重建 pass，而不是发布版本号。各行按添加该演示的提交从新到旧排列。

画廊源码位于 [img2threejs/img2threejs-showcase](https://github.com/img2threejs/img2threejs-showcase)。如果这个项目对你有用，给本仓库点个 star 能帮助更多人发现它。

---

## 它做什么

你给它一张物体的参考图。它生成一个用 TypeScript 编写的 `THREE.Group` factory，用基元、程序化着色器和生成的几何重建该物体——并带有运行时层级（枢轴点、挂点、碰撞体），因此结果可以直接用于动画，而不是一团死物。

它可在 Claude Code、Codex 或 OpenCode 下运行。它与代理无关：文档中凡提到"代理视觉"或"代理浏览器工具"，都使用宿主提供的任何能力——原生图像读取、浏览器 MCP、项目预览，或用户提供的截图。

### 对象类型与细节精度

- **物体与角色。** 每个对象被分类为 `object`、`character` 或 `hybrid`。物体走硬表面流水线；角色走一条感知解剖结构的路线（头身比例、面部关键点、姿态），详见 `grimoire/character/reconstruction.md`。
- **细节优先的分析。** 在代码生成之前，流水线会列举一份 `detailInventory`，记录决定身份的小细节（光泽、倒角/圆角、螺丝/铆钉、雕刻或涂绘的线条、轮廓、污渍与磨损）。每个细节都必须映射到真实的组件或材质条目，严格质量门禁会阻止生成，直到清单完整。分类体系：`grimoire/intake/detail_inventory.md`。
- **对特定人物或角色的最大相似度。** 一条需主动开启的投影优先路径会把参数化模板拟合到图像关键点，对照片去光照，让渲染与相机匹配，再把参考图投影到网格上。单张图片无法保证 100% 相似，因此流水线会按区域报告置信度，并在必要时请求更多视角。详情：`grimoire/character/likeness_maximization.md`。
- **多视角轮廓雕刻。** 需主动开启的 `geometryDescriptor.visualHull` 会把至少两个确定性的正交二值轮廓求交，得到有界、已焊接的体素网格。它把未见区域记录为低置信度，而不是编造隐藏细节。schema 与运行时检查：`grimoire/scripts.md`。
- **CS2 武器评审门禁。** 刀具和 Glock-18 路线使用按家族区分的组件契约。评审会记录精确度档位、家族身份、涂装区域与投影覆盖、分区域置信度、近似说明以及带版本号的评审场景元数据；组件覆盖门禁和去贴图 blockout 门禁可防止以逼真的纹理冒充真实结构。随 CS2 领域插件发布；见其 `docs/cs2/review-gates.md`。
- **可恢复的本地工作流。** `forge/state.py` 为通用 profile 和每个已注册领域（仓内的 `character`，以及已安装的领域插件，如 CS2 和来自 plugin-character 的 `animated-character`）记录有序、有证据支撑的 intake/pass 检查清单。`forge/next.py --state` 从该清单恢复，而现有的 spec、渲染和评审门禁仍是权威。
- **材质参考流水线。** 每个可见的材质区域都可以被裁切、分析、对照带版本号的 Three.js 材质注册表解析、拟合进 `ObjectSculptSpec`、从受控相机视角渲染，并且只有通过分区域对比门禁后才会被接受。见 [`docs/materials/README.md`](docs/materials/README.md)。
- **Python 辅助的浏览器渲染。** Python 可以编排相机批次、哈希、manifest 和确定性诊断，但目标浏览器 Three.js 路线仍是渲染的权威。见 [`grimoire/build/python_threejs_render_bridge.md`](grimoire/build/python_threejs_render_bridge.md)。

---

## 工作原理

分阶段雕刻流水线把参考图转为 spec，然后一次生成并视觉评审一个构建 pass——`blockout → structural → form → material → surface → lighting → interaction → optimization`——不断自我修正，直到每个决定身份的特征都越过其阈值。

**→ 完整流水线图、门禁、自我修正逻辑以及 token 效率设计：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
分阶段雕刻流水线把参考图转为 spec，然后一次生成并视觉评审一个构建 pass——`blockout → structural → form → material → surface → lighting → interaction → optimization`——不断自我修正，直到每个决定身份的特征都越过其阈值。确定性的 Python 脚本负责校验与门禁；模型 token 只花在视觉判断和代码上。

**→ 完整流水线图、门禁、自我修正逻辑、脚本参考以及 token 效率设计：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

---

## 快速开始

1. **安装**——把本文件夹放入你的技能目录：

   ```bash
   git clone https://github.com/img2threejs/img2threejs.git ~/.claude/skills/img2threejs
   ```

   如果你使用多个宿主，只保留一份 checkout，并让每个入口以符号链接指向它，这样它们就不会
   逐渐分叉：

   ```text
   ~/.claude/skills/img2threejs -> <your checkout>
   ~/.codex/skills/img2threejs  -> <your checkout>
   ```

2. **添加领域插件（可选）**——领域知识（目前是 CS2 皮肤）位于已安装的插件中，而不在本 checkout
   里。先安装一次 [img2 harness](https://github.com/img2threejs/img2)，再向其中添加插件：

   ```bash
   npx github:img2threejs/img2 install   # ~/.img2, the plugin registry, and an `img2` launcher
   img2 add img2threejs/plugin-cs2       # clone @ newest tag, pin SHA, link host skills
   img2 doctor                           # fail-loud static audit of every installed plugin
   ```

   已安装的领域插件会贡献自己的检查清单步骤、证据收集、spec augmentation（质量下限只升不降
   地合并）以及一个阻断性评审门禁——并通过 `forge/state.py init --profile <id>` 注册其 profile。
   未安装任何插件时，可用的是 `generic` 和 `character`；插件缺失的 profile（`cs2`、
   `animated-character`）会响亮地失败并列出已安装的内容，绝不静默降级。`img2 remove <id>` 可干净地
   撤销。

   **官方插件：**

   | 插件 | 新增内容 | 安装 |
   |---|---|---|
   | [plugin-cs2](https://github.com/img2threejs/plugin-cs2) | `cs2` profile——CS2 武器皮肤重建：家族适配器、表面处理规则、领域评审门禁 | `img2 add img2threejs/plugin-cs2` |
   | [plugin-character](https://github.com/img2threejs/plugin-character) | `animated-character` profile——包含 `character` 的全部内容，外加 Stage R 绑定/动画门禁 | `img2 add img2threejs/plugin-character` |
   | [plugin-img2glb](https://github.com/img2threejs/plugin-img2glb) | 通过托管的 TRELLIS space 提供 `image → glb` 输出目标 | `img2 add img2threejs/plugin-img2glb` |
   | [plugin-hello-cube](https://github.com/img2threejs/plugin-hello-cube) | 最小参考插件——复制它来编写你自己的插件 | `img2 add img2threejs/plugin-hello-cube` |

   编写自己的插件：见 harness 仓库的
   [docs/WRITING_A_PLUGIN.md](https://github.com/img2threejs/img2/blob/main/docs/WRITING_A_PLUGIN.md)。

3. **调用**——在 Claude Code 中，附上或指向一张物体图片并运行：

   ```
   /img2threejs 把这个物体重建为 Three.js 模型，保持比例、角度和颜色。
   ```

   这就够了：技能会自行对对象分类、运行细节清单，并为每个 pass 把关。

4. **跟随流水线**——技能会验证图像，写出评估与 spec，逐 pass 生成 factory，并在每一步给你看并排对比，直到渲染匹配为止。

   对于跨多个会话的重建，先创建本地状态索引：

   ```bash
   python3 forge/state.py init --reference <image> --profile character --spec object-sculpt-spec.json
   python3 forge/next.py --state .img2threejs/state.json
   ```

### 更强力地驱动它（Driving it harder）

一行命令会把判断交给技能。当你已经知道对你的对象而言"正确"意味着什么时，就说出来——下面每一行都对应流水线中一个真实的门禁或产物，因此它改变的是被强制执行的内容，而不只是多加几个形容词：

```
/img2threejs 把这张图片中的对象重建为程序化 Three.js 模型。

保真度     比例和轮廓严格对齐参考图。先列举决定身份的细节——倒角与圆角、面板接缝、
           紧固件、雕刻或涂绘的线条、光泽与哑光区域、磨损——无法落到真实组件上的细节
           直接舍弃，不要伪造。
材质       从参考图像素推导表面处理类别和渐变色标，不要凭记忆。标出任何经过色调映射后
           无法保留的颜色。
运行时     为所有应该能动的部分暴露枢轴点和挂点，并提供一个 userData.tick 用于循环待机动画。
门禁       运行 --strict-quality，并行对比评审通过之前不推进 pass。对图像无法显示的任何部分
           报告分区域置信度。
```

视对象而定的有用补充：

- **特定人物或角色**——`最大化相似度：把参数化模板拟合到关键点，对参考图去光照并匹配相机，然后投影。告诉我哪些区域是推断的。`
- **动物或生物**——`这是一个生物，不是人形——使用四足身体结构和身体单位比例系统。`
- **饱和的阳极氧化或糖果色表面处理**——`涂层是 candy-coat，不是 gem-metal。保持色相；不要让环境光把它吃掉。`
- **成本上限**——`保持低推理强度，跳过展示合成器；我只需要评估渲染。`

脚本在技能根目录运行，只需要 Python 3.10+——无需安装任何东西。

```bash
python3 forge/stage1_intake/probe_image.py <image>
python3 forge/stage2_spec/new_pre_spec_assessment.py "Name" --image <image> --out assessment.json
python3 forge/stage2_spec/new_sculpt_spec.py "Name" --image <image> --assessment assessment.json --out spec.json
python3 forge/stage2_spec/validate_sculpt_spec.py spec.json --strict-quality
python3 forge/stage3_build/generate_threejs_factory.py spec.json --out src/createObjectModel.ts
```

factory 生成器会重复执行严格质量门禁，并且是失败即关闭的：失败时它返回 `BLOCKED`，附带 spec
产物、失败指标、原因和下一步动作，且不会写出 factory。`--allow-nonstrict` 仅用于显式的旧版测试
夹具，绝不用于生产输出。

### GLB 参考路线的可直接复制提示词

用 **GLB 参考**而不是照片来重建角色，是一条有自己门禁的不同路线——GLB 是测量仪器，永远不会随
产物发布。三份提示词覆盖这条路线，各自在独立的复制块中：

| 提示词 | 何时使用 | 何时不要使用 |
|---|---|---|
| [Build](docs/GLB_CHARACTER_PROMPT.md) | 你有 GLB，且还没有构建任何表面 | 没有 GLB，或构建已经完成只是看起来不对 |
| [Polish](docs/GLB_CHARACTER_POLISH_PROMPT.md) | 构建已完成，但结果看起来不像 GLB | 表面从未构建过——那需要重跑构建，而不是打磨 |
| [Animation](docs/GLB_CHARACTER_ANIMATION_PROMPT.md) | 人物静止站立时看起来正确，并已通过构建门禁 | 表面未经门禁，或 `joint_loops.py` 失败——那是表面问题，任何权重调整都解决不了 |

它们把 GLB 真正携带的每个参数——尺寸、比例、各带宽度与质心、基础色、粗糙度和金属度——强制设为
测量值，并附上证明其落实的检查。有三件事**不是** 1:1 的，每份提示词都会说明：绑定和动画通常
不在资产中（`skinCount: 0`、`animationCount: 0`），纹理图像和法线贴图按本技能的纯代码约定刻意不
复制，而比节点单元格尺寸更细的东西根本无法携带。

**这些是参考资料，不是保证。** 它们写得较为通用，其中的测量数值来自一个角色，用来展示该测量
什么——而不是可以照抄的数值。运行与你的情况相符的那一份，而不是按顺序把三份全跑一遍；每份都
注明了在错误时机使用的代价。

逐个脚本的参考、完整脚本表以及预期产物，见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

---

## 为什么省 token

大多数图像转 3D 的代理循环之所以烧 token，是因为让模型做机械性工作——每个 pass 都重读整个模型、给像素打分、手工校验 JSON、重跑已经做过的步骤。img2threejs 把这些全部推给确定性脚本，只在真正需要判断的地方花费模型 token。

- **脚本负责强制执行，模型负责判断。** Python 脚本处理校验、门禁、spec 编写、PBR 提取、对比图打包和流水线状态。它们从不对视觉效果打分。模型的 token 只用于一件事：看一张并排对比图，判定通过或失败。
- **零依赖，零安装折腾。** 每个脚本都是纯 Python 3.10+ 标准库。没有 pip、没有 PIL、没有 numpy、没有 Playwright。PNG 读写用 `struct` 和 `zlib` 完成。没有要安装的东西，就没有要在上下文中调试的东西。
- **按 pass 把关的生成。** 代码生成器只输出当前已解锁的构建 pass。模型不会在每次迭代时重新生成或重读整个模型——每一步都小而有界。
- **快速失败，在代码生成之前。** 严格质量门禁会在生成任何一行 Three.js 之前阻止浅薄的 spec，因此你永远不会把 token 花在渲染一个从一开始就描述不足的模型上。
- **每次评审一张图。** 每个 pass 恰好由一张打包好的对比图（参考图与渲染图并排）来评判，而不是一堆零散的截图。
- **输出文本，而非二进制。** 结果是可 diff 的 TypeScript 加一份 JSON spec——小巧、可评审、可版本控制，而不是几兆字节的网格文件。

最终效果：你依然能从一张图片得到忠实的 3D 模型，但昂贵的模型上下文被留给视觉判断和代码，而不是簿记工作。完整的分阶段、分循环 token 明细见 [docs/TOKEN_COST.md](docs/TOKEN_COST.md)。

---

## 脚本

| 脚本 | 作用 |
| --- | --- |
| `stage1_intake/probe_image.py` | 图像元数据与明显的技术问题（不是视觉检查）。 |
| `stage2_spec/new_pre_spec_assessment.py` | 对物体分类、复杂度评分、输出质量契约。 |
| `stage2_spec/new_sculpt_spec.py` | 根据评估编写 ObjectSculptSpec。 |
| `stage2_spec/validate_sculpt_spec.py` | 校验 spec；`--strict-quality` 在代码生成前阻止浅薄的 spec。 |
| `stage1_intake/extract_pbr_evidence.py` | 按裁切图从参考图推导 PBR 证据（推断，不是逆向渲染）。 |
| `stage1_intake/material_region_analysis.py` | 裁切材质区域，运行纹理/PBR 证据提取，并解析注册表 profile。 |
| `stage2_spec/apply_material_analysis.py` | 把区域分配、先验、贴图和来源记录接入 ObjectSculptSpec。 |
| `stage3_build/orchestrate_passes.py` | 锁定的 pass 状态：status、check、sync。 |
| `stage3_build/generate_threejs_factory.py` | 为当前已解锁的 pass 输出 Three.js `Group` factory。 |
| `stage4_review/material_views.py` | 输出多角度、放大、显微、环境以及截图读回契约。 |
| `stage4_review/material_comparator.py` | 比较可见材质裁切图，并对各通道的不匹配分类。 |
| `stage4_review/material_feedback.py` | 通过现有停止策略应用有界、限定在材质范围内的修正。 |
| `stage4_review/material_gate.py` | 在注册表、裁切、渲染、兼容性和对比证据都通过之前阻断材质 pass。 |
| `stage4_review/make_comparison_sheet.py` | 打包一张参考图对渲染图的对比图供评审。 |
| `stage4_review/append_review.py` | 记录每个 pass 的评审：分数、决策、证据。 |
| `_shared/feature_acceptance_policy.py` | 强制执行逐特征分数阈值的内部辅助模块。 |
| `stage1_intake/build_detail_inventory.py` | 把参考图切分为区域，并搭建细节清单骨架。 |
| `stage1_intake/extract_landmarks.py` | 叠加关键点网格，并为角色搭建解剖数据块骨架。 |
| `stage1_intake/solve_camera_pose.py` | 输出参考相机数据块，使渲染可以与相机匹配。 |
| `stage1_intake/delight_albedo.py` | 在纹理投影前从照片近似出中性 albedo。 |
| `stage3_build/bake_projected_texture.py` | 为照片纹理投影输出投影/UV 烘焙描述符。 |

| `stage5_rig/rig_spec.py` | 从组件树推导并校验骨架，使骨骼不会偏离几何。 |
| `stage5_rig/geodesic_skinning.py` | 按穿过实体测得的距离计算顶点权重；让刚性角色远离平滑蒙皮。 |
| `stage5_rig/validate_rig_payload.py` | 在绑定 `THREE.Skeleton` 之前的阻断性载荷完整性门禁。 |
| `stage1_intake/extract_hair_evidence.py` | 头发/皮肤分割、分带覆盖、发际线、高光带、发根到发梢的差值。 |
| `stage4_review/scalp_exposure.py` | **硬**门禁：在任何渲染之前在几何上找出秃斑。 |
| `stage4_review/hair_gate.py` | 软门禁：对照参考图检查头发覆盖、发际线和高光偏移。 |
| `stage4_review/interior_difference.py` | 轮廓内部的外观差异，按高度分带。每个视觉 pass 都必须运行。 |
| `_shared/chirality.py` | 把左/右作为可导入的约定，附带两类手性缺陷各自需要的两个门禁。 |
| `_shared/pipeline_routing.py` | 失败即关闭的武器/角色路由；低置信度解析为 `request-input`。 |

这只是精选部分——`forge/` 中大约有九十个模块。包含所有参数的可执行参考是 [`grimoire/scripts.md`](grimoire/scripts.md)，逐项门禁契约是 [`grimoire/review/gates_reference.md`](grimoire/review/gates_reference.md)。`grimoire/` 的其余部分存放各门禁所应用的评分细则（校验、pre-spec 评估、程序化模式、材质与光照真实感、附着正确性、可用于动作的模型、自我修正）。

### 可选的参考保真度工具

仅依赖标准库的核心可以使用一个隔离的证据层，而无需引入运行时依赖：SAM2 组件遮罩、Depth
Anything V2 相对深度先验、MediaPipe 面部/姿态关键点、Chrome DevTools 诊断、Three.js 场景检查、
Playwright 跨浏览器回退，以及感知版本的 Context7 检索。这些工具从不批准 pass，也从不静默提供
几何。安装、路由、来源规则和确切命令：
[`docs/integrations/reference_fidelity_tooling.md`](docs/integrations/reference_fidelity_tooling.md)。

### 可选的 GLB 基线角色流水线

[`integrations/glb_character_pipeline`](integrations/glb_character_pipeline) 从**一个用作测量仪器的
多部件 GLB 加上其漫反射图**重建角色，并输出演示实际发布的程序化 TypeScript——运行时不会获取任何
`.glb` 或 `.bin`。它自带 `pyproject.toml`/`uv.lock`，使仅依赖标准库的 `forge` 核心保持零依赖，并
通过 `IMG2THREEJS_SHOWCASE_ROOT` 在配套 showcase checkout 上运行。

它**只**在构建有可测量的 GLB 时适用——否则完全跳过，改用核心的图像驱动流水线。它能精确复现
`girl-character` 已发布的 `crossSections.ts`（748 个环、86,240 个环点）。方法与各阶段原理：
[`PIPELINE.md`](integrations/glb_character_pipeline/PIPELINE.md)。

---

## 你会得到什么

- 一份 `ObjectSculptSpec` JSON：完整的组件树、材质、重复系统、挂点，以及每个 pass 的评审历史记录。
- 一个 TypeScript `createObjectNameModel(spec, options)` factory，返回 `THREE.Group`，其 `root.userData.sculptRuntime` 暴露节点、挂点、碰撞体和破坏分组。
- 对于角色构建，`root.userData.rig`：骨骼、一个共享的 `Skeleton`、骨骼顺序与索引映射，以及一个根据每个蒙皮网格是否真正完成绑定计算出的 `bound` 标志。
- 一张渲染图以及记录每个 pass 保真度的对比图。
逐个脚本的参考以及输出产物的完整列表，见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

---

## 路线图

**已发布：**

- **v1.0**——物体流水线：分阶段雕刻、渲染对参考图的评审循环、可用于动作的层级。
- **v1.1**——细节优先的分析：必需的细节清单、严格质量门禁。
- **v1.2**——人形角色生成器：解剖路线、比例锁定与特征放置 pass。
- **v1.3**——质量与效率：Divine Eye 确定性评审框架、输入完整性与几何真实性门禁、基于参考的纹理与渐变分析、CIEDE2000 色彩计算。
- **v1.4——The Weapon Update**——CS2 图像匹配重建：感知来源的 intake、投影优先的表面处理、按家族区分的武器适配器，以及结构评审门禁。
- **v1.4.1**——CS2 加固：显式组件覆盖、专用的 Glock-18 装配契约、去贴图 blockout 证据，以及更严格的几何完整性检查。
- **生物生成器**——4 种身体结构（四足 / 鸟类 / 有翼龙 / 蛇形）、`animalAnatomy` spec、脊柱放样几何、ΔE00 色彩门禁。
- **v1.5——The Character Update**——从组件树推导并绑定到 `SkinnedMesh` 几何的骨架、测地蒙皮、作为五阶段子系统并带有头皮暴露硬门禁的头发、手性门禁、内部差异评审、`tapered-sweep` 基元、带阻断性验收门禁的材质流水线，以及可恢复的工作流状态。未包含：`hairProfile` 编译器、IK、姿态扫描门禁、服装。
- **v2.0——The Plugin Update**——领域注册表、拉取式 spec augmentation（质量下限只升不降）、带来源记录的
  输出目标插槽、按插件的阻断性门禁，以及 img2 harness（`img2 install/add/doctor`）。CS2 被提取到
  `plugin-cs2`，`animated-character` 由 `plugin-character` 提供；基础层不指名任何领域。原本排在
  Procedural World 版本中的"插件生态与 API"，作为独立的大版本率先发布。

**下一步——每个版本一个主题：**
- **v2.1——The Character Split**：仓内的 `character` 领域并入 `plugin-character`，使基础层不再指名任何领域，v2.0 的插件拆分就此收尾。
- **v2.2——The Environment Update**：建筑、房间、街道、植被、感知地形以及多物体重建。
- **v2.3——The Game Pipeline Update**：Unity 和 Unreal 导出器、Blender 桥接、LOD 与碰撞网格生成。
- **v2.4——The Animation Update**：自动绑定、自动蒙皮权重、Mixamo 兼容、面部绑定。
- **v2.5——The AI Studio Update**：Web UI、批处理、可视化提示词构建器、云渲染。
- **v3.0——The Procedural World Update**：多视角重建、程序化城市生成、语义化世界理解。

演进路线：资产（v1.4–v1.5）→ 插件生态（v2.0–v2.1）→ 世界（v2.2–v2.3）→ 生产（v2.4–v2.5）→ 一个能从参考图生成可玩世界的 AI 游戏资产平台（v3.0）。

**→ 完整路线图**——各版本细节、四阶段长期展望以及跟踪中的能力缺口：**[ROADMAP.md](ROADMAP.md)**。技术规格：[docs/UPGRADE_PLAN.md](docs/UPGRADE_PLAN.md)。

---

## 如实说明局限

单张图片无法揭示被遮挡的面，也无法保证几何精确。当输出是近似、风格化或低多边形时，技能会直白说明，并通过镜像可见面来推断未见面，而不是假装有把握。它擅长硬表面物体；角色是风格化重建，而非照片级相似。"无法从这张图片达到所要求的保真度"是一个有效且预期之中的结果。

---

## Star 历史

如果 img2threejs 对你有用，点个 star 能帮助更多人发现它。

<a href="https://www.star-history.com/#hoainho/img2threejs&Timeline">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=hoainho/img2threejs&type=timeline&theme=dark&legend=top-left&sealed_token=HhzHOwb32twyQntl75HMLNf5E7hkH9aNTaSpn20ZThsyQC2Rt7fA_Wthz0osSgItW_WUiwA3MUa5-7GXquQCVL1uHLePUOUN9uVoiArBCm-l21DXJ51yVQ" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=hoainho/img2threejs&type=timeline&legend=top-left&sealed_token=HhzHOwb32twyQntl75HMLNf5E7hkH9aNTaSpn20ZThsyQC2Rt7fA_Wthz0osSgItW_WUiwA3MUa5-7GXquQCVL1uHLePUOUN9uVoiArBCm-l21DXJ51yVQ" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=hoainho/img2threejs&type=timeline&legend=top-left&sealed_token=HhzHOwb32twyQntl75HMLNf5E7hkH9aNTaSpn20ZThsyQC2Rt7fA_Wthz0osSgItW_WUiwA3MUa5-7GXquQCVL1uHLePUOUN9uVoiArBCm-l21DXJ51yVQ" width="600" />
  </picture>
</a>

---

## 支持本项目

img2threejs 免费且开源。如果它为你节省了时间或被用进了你的项目，请考虑支持后续开发：

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/O8A625YLSR)

也支持 VietQR / MoMo / PayPal——见[捐赠页面](https://img2threejs.io/donate.html)。

---

## 赞助商

用代码重建首先是推理负载，其次才是图形负载：每次重跑门禁、每个渲染对参考图的 pass、每次材质
拟合都要花费 token。以下三家为这个循环买单。

<table>
  <tr>
    <td align="center" width="200">
      <a href="https://www.atlascloud.ai/console/coding-plan" target="_blank" rel="noopener noreferrer">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="assets/sponsors/atlas-cloud-logomark-white.svg" />
          <source media="(prefers-color-scheme: light)" srcset="assets/sponsors/atlas-cloud-logomark-black.svg" />
          <img alt="Atlas Cloud" src="assets/sponsors/atlas-cloud-logomark-black.svg" width="72" height="67" />
        </picture>
      </a>
      <br /><sub><b>Atlas Cloud</b></sub>
      <br /><sub>全模态 AI 推理</sub>
    </td>
    <td align="center" width="200">
      <a href="https://www.tripo3d.ai/" target="_blank" rel="noopener noreferrer">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="assets/sponsors/tripo-logomark-white.svg" />
          <source media="(prefers-color-scheme: light)" srcset="assets/sponsors/tripo-logomark-black.svg" />
          <img alt="Tripo" src="assets/sponsors/tripo-logomark-black.svg" width="68" height="68" />
        </picture>
      </a>
      <br /><sub><b>Tripo</b></sub>
      <br /><sub>图像与文本转 3D</sub>
    </td>
    <td align="center" width="200">
      <a href="https://hyper3d.ai/" target="_blank" rel="noopener noreferrer">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="assets/sponsors/hyper3d-logomark-white.png" />
          <source media="(prefers-color-scheme: light)" srcset="assets/sponsors/hyper3d-logomark-black.png" />
          <img alt="Hyper3D" src="assets/sponsors/hyper3d-logomark-black.png" width="68" height="68" />
        </picture>
      </a>
      <br /><sub><b>Hyper3D</b></sub>
      <br /><sub>Rodin 生成式 3D</sub>
    </td>
  </tr>
</table>

### Atlas Cloud

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/sponsors/atlas-cloud-logomark-white.svg" />
  <source media="(prefers-color-scheme: light)" srcset="assets/sponsors/atlas-cloud-logomark-black.svg" />
  <img alt="" src="assets/sponsors/atlas-cloud-logomark-black.svg" width="38" height="36" align="right" />
</picture>

**[Atlas Cloud](https://www.atlascloud.ai/console/coding-plan)** 是一个全模态 AI 推理平台：一个 AI
API 即可访问视频生成、图像生成和 LLM，统一接入覆盖各个模态的 300 多个精选模型，而不必为每个厂商
单独集成。

正是这个单一端点让本项目的循环负担得起——这条流水线按设计就很耗 token，因为在代码生成之前对
spec 把关意味着分析要运行不止一次。Atlas Cloud 的 coding plan 是使用该 API 的实惠途径。

**→ [打开 Atlas Cloud coding plan](https://www.atlascloud.ai/console/coding-plan)**

### Tripo

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/sponsors/tripo-logomark-white.svg" />
  <source media="(prefers-color-scheme: light)" srcset="assets/sponsors/tripo-logomark-black.svg" />
  <img alt="" src="assets/sponsors/tripo-logomark-black.svg" width="38" height="38" align="right" />
</picture>

**[Tripo](https://www.tripo3d.ai/)** 把提示词或参考图转为生产级 3D 资产：面向渲染和打印、最高
2M 多边形的 High Detail 网格，面向实时引擎、500 到 50K 三角形的美术级四边形 **Smart Mesh**，AI
自动绑定，最高 8K 的 PBR 贴图，以及部件级分割。可导出 GLB、FBX、OBJ、USD、STL 和 3MF，并提供
Blender、Unity、Unreal、Godot、Cocos 和 ComfyUI 的官方插件。

它与 img2threejs 搭配作为量尺。程序化重建的成败取决于轮廓、比例和关节位置，而同一对象的四边形
网格加自动绑定能为这些门禁提供第二种读数——这是单张参考照片自己无法确定的。

**→ [打开 Tripo Studio](https://www.tripo3d.ai/)**

### Hyper3D

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/sponsors/hyper3d-logomark-white.png" />
  <source media="(prefers-color-scheme: light)" srcset="assets/sponsors/hyper3d-logomark-black.png" />
  <img alt="" src="assets/sponsors/hyper3d-logomark-black.png" width="38" height="38" align="right" />
</picture>

**[Hyper3D](https://hyper3d.ai/)** 打造了 **Rodin**，它能在几秒内根据提示词或图像生成 3D 资产，
参考保真度高，且各视角的细节连贯。生成是可引导的，而不是掷骰子：包围盒、体素和点云 ControlNet
引导，局部编辑可在不影响其余部分的情况下细化某一区域，智能低多边形优化，以及用于带绑定的生产级
面部的 ChatAvatar。可导出 STL、FBX、OBJ、GLB、glTF 和 USDZ。

它回答了单张照片永远无法回答的问题——背面长什么样。生成该对象、环绕查看，被遮挡的面就成了材质与
表面门禁可以真正对照运行的参考，而不再是流水线不得不默默做出的假设。

**→ [打开 Hyper3D Rodin](https://hyper3d.ai/)**

---

赞助支付的是算力，而不是曝光：赞助商的产品在这里按其自身的表述介绍，本仓库中没有任何门禁、默认值
或基准测试偏向任何一家。想让你的 logo 出现在这一行？请提交 issue 或发邮件至 <hoainho.work@gmail.com>。

---

## 参与贡献

欢迎贡献——尤其是程序化材质配方、新门禁、宿主覆盖和演示。参见 [CONTRIBUTING.md](CONTRIBUTING.md) 以及[路线图](ROADMAP.md)了解项目方向。

## 许可证

Apache License 2.0。见 [LICENSE](LICENSE)。
