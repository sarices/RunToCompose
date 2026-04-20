# RunToCompose

Docker 命令转 Compose

RunToCompose is a pure front-end tool that converts common `docker run` commands into `docker-compose` / `compose.yaml` with live preview.

RunToCompose 是一个纯前端工具，用来把常见的 `docker run` 命令实时转换成 `docker-compose` / `compose.yaml`。

## Demo / 项目定位

- EN: Paste a `docker run` command, get a clean Compose YAML immediately.
- 中文：把 `docker run` 命令贴进来，立刻吐出可用的 Compose YAML。

## Features / 功能特性

- EN: Real-time `docker run` → Compose conversion
- 中文：实时 `docker run` → Compose 转换

- EN: Supports multi-line input, shell backslash continuations, quotes, common flags, and `key=value` arguments
- 中文：支持多行输入、反斜杠续行、引号、常见 flags 和 `key=value` 参数

- EN: Drag and drop `.sh` / `.txt` command files
- 中文：支持拖拽导入 `.sh` / `.txt` 命令文件

- EN: One-click download of `compose.yaml`
- 中文：支持一键下载 `compose.yaml`

- EN: Built-in Docker command examples
- 中文：内置 Docker 命令示例库

- EN: Light / Dark / System theme switching
- 中文：支持浅色 / 深色 / 跟随系统主题切换

- EN: Bilingual UI in English and Chinese
- 中文：支持中英文双语界面

- EN: Liquid Glass style UI
- 中文：采用 Liquid Glass 风格界面

- EN: Verified with unit tests, build checks, lint, and real Playwright CLI interaction tests
- 中文：已通过单元测试、构建检查、Lint 和 Playwright CLI 真实交互测试

## Supported examples / 已覆盖的典型能力

- EN: Ports, environment variables, container names, restart policy, volumes, commands, and basic service metadata
- 中文：端口、环境变量、容器名、重启策略、卷挂载、命令参数、基础服务元信息

- EN: Network aliases, healthcheck, logging driver/options, ulimits, and sysctls
- 中文：network aliases、healthcheck、日志驱动与选项、ulimits、sysctls

## Quick example / 快速示例

Input / 输入：

```bash
docker run -d --name Freebuff2API \
  -p 8080:8080 \
  -e AUTH_TOKENS="token1,token2" \
  ghcr.io/quorinex/freebuff2api:latest
```

Output / 输出：

```yaml
name: freebuff2api-stack
services:
  freebuff2api:
    image: ghcr.io/quorinex/freebuff2api:latest
    container_name: Freebuff2API
    ports:
      - '8080:8080'
    environment:
      AUTH_TOKENS: token1,token2
```

## Tech stack / 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Vitest
- Testing Library

## Local development / 本地开发

```bash
npm install
npm run dev
```

Default dev URL / 默认开发地址：

```text
http://127.0.0.1:4173/
```

## Available scripts / 可用脚本

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run lint
```

## QA status / 验证状态

This project has been checked with:

这个项目已经做过这些验证：

- `npm test`
- `npm run build`
- `npm run lint`
- Playwright CLI real browser checks for:
  - theme switching / 主题切换
  - language switching / 语言切换
  - example switching / 示例切换
  - `compose.yaml` download / `compose.yaml` 下载

## Why pure front-end? / 为什么坚持纯前端？

- EN: No backend required, easy to deploy anywhere as a static site.
- 中文：不依赖后端，天然适合静态部署，扔哪都能跑。

- EN: Parsing and preview happen directly in the browser.
- 中文：解析和预览都在浏览器里完成，反馈快。

## Roadmap / 后续方向

- EN: Persist theme and language preferences
- 中文：持久化主题和语言偏好

- EN: Support more `docker run` flags
- 中文：继续扩展更多 `docker run` 参数映射

- EN: Add formal Playwright regression scripts
- 中文：补齐正式的 Playwright 回归测试脚本

## License / 许可证

MIT
