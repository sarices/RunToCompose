# RunToCompose

[English](./README.md) | [中文说明](./README.zh-CN.md)

RunToCompose is a pure front-end tool that converts common `docker run` commands into `docker-compose` / `compose.yaml` with live preview in the browser.

## Overview

Paste a `docker run` command, and get clean Compose YAML immediately.

## Features

- Real-time `docker run` → Compose conversion
- Supports multi-line input, shell backslash continuations, quotes, common flags, and `key=value` arguments
- Drag and drop `.sh` / `.txt` command files
- One-click download of `compose.yaml`
- Built-in Docker command examples
- Light / Dark / System theme switching
- Bilingual UI in English and Chinese
- Liquid Glass style UI
- Verified with unit tests, build checks, lint, and real Playwright CLI interaction tests

## Supported examples

- Ports, environment variables, container names, restart policy, volumes, commands, and basic service metadata
- Network aliases, healthcheck, logging driver/options, ulimits, and sysctls

## Quick example

Input:

```bash
docker run -d --name Freebuff2API \
  -p 8080:8080 \
  -e AUTH_TOKENS="***" \
  ghcr.io/quorinex/freebuff2api:latest
```

Output:

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

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Vitest
- Testing Library

## Local development

```bash
npm install
npm run dev
```

Default dev URL:

```text
http://127.0.0.1:4173/
```

## Available scripts

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run lint
```

## QA status

This project has been checked with:

- `npm test`
- `npm run build`
- `npm run lint`
- Playwright CLI real browser checks for:
  - theme switching
  - language switching
  - example switching
  - `compose.yaml` download

## Why pure front-end?

- No backend required, easy to deploy anywhere as a static site.
- Parsing and preview happen directly in the browser.

## Roadmap

- Persist theme and language preferences
- Support more `docker run` flags
- Add formal Playwright regression scripts

## Documentation

- English: `README.md`
- 中文：[`README.zh-CN.md`](./README.zh-CN.md)

## License

MIT
