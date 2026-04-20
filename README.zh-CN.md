# RunToCompose

[English](./README.md) | [中文说明](./README.zh-CN.md)

RunToCompose 是一个纯前端工具，用来把常见的 `docker run` 命令实时转换成 `docker-compose` / `compose.yaml`，并直接在浏览器里预览结果。

## 项目说明

把 `docker run` 命令贴进来，立刻吐出可用的 Compose YAML。

## 功能特性

- 实时 `docker run` → Compose 转换
- 支持多行输入、反斜杠续行、引号、常见 flags 和 `key=value` 参数
- 支持拖拽导入 `.sh` / `.txt` 命令文件
- 支持一键下载 `compose.yaml`
- 内置 Docker 命令示例库
- 支持浅色 / 深色 / 跟随系统主题切换
- 支持中英文双语界面
- 采用 Liquid Glass 风格界面
- 已通过单元测试、构建检查、Lint 和 Playwright CLI 真实交互测试

## 已覆盖的典型能力

- 端口、环境变量、容器名、重启策略、卷挂载、命令参数、基础服务元信息
- network aliases、healthcheck、日志驱动与选项、ulimits、sysctls

## 快速示例

输入：

```bash
docker run -d --name Freebuff2API \
  -p 8080:8080 \
  -e AUTH_TOKENS="***" \
  ghcr.io/quorinex/freebuff2api:latest
```

输出：

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

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Vitest
- Testing Library

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://127.0.0.1:4173/
```

## 可用脚本

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run lint
```

## 验证状态

这个项目已经做过这些验证：

- `npm test`
- `npm run build`
- `npm run lint`
- Playwright CLI 真实浏览器检查，覆盖：
  - 主题切换
  - 语言切换
  - 示例切换
  - `compose.yaml` 下载

## 为什么坚持纯前端？

- 不依赖后端，天然适合静态部署，扔哪都能跑。
- 解析和预览都在浏览器里完成，反馈快。

## 后续方向

- 持久化主题和语言偏好
- 继续扩展更多 `docker run` 参数映射
- 补齐正式的 Playwright 回归测试脚本

## 文档入口

- English: [`README.md`](./README.md)
- 中文：[`README.zh-CN.md`](./README.zh-CN.md)

## License / 许可证

MIT
