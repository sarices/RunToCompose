import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { convertDockerRunToCompose } from './lib/converter'

type ThemeMode = 'system' | 'dark' | 'light'
type ResolvedTheme = 'dark' | 'light'
type Language = 'zh' | 'en'

type CommandExample = {
  id: string
  name: Record<Language, string>
  blurb: Record<Language, string>
  command: string
}

type Dictionary = {
  badge: string
  heroTitle: string
  heroDescription: string
  themeLabel: string
  languageLabel: string
  system: string
  light: string
  dark: string
  inputTitle: string
  inputHint: string
  fillExample: string
  clear: string
  importFile: string
  dropzoneLabel: string
  dropzoneText: string
  invalidFile: string
  placeholder: string
  examplesTitle: string
  examplesHint: string
  currentExample: string
  outputTitle: string
  outputHint: string
  download: string
  copyYaml: string
  copied: string
  summaryTitle: string
  summaryHint: string
  copyJson: string
  warningsTitle: string
  emptySummary: string
  successMessage: string
  convertFailed: string
  summaryLabels: {
    service: string
    image: string
    ports: string
    network: string
    volumes: string
    logging: string
  }
}

const dictionaries: Record<Language, Dictionary> = {
  zh: {
    badge: 'docker run → docker-compose',
    heroTitle: '一条命令，吐出 compose',
    heroDescription: 'Liquid Glass 风格纯前端工具。把常见 docker run 命令解析成 docker-compose / compose.yaml，支持实时预览、主题切换、示例库和多语言。',
    themeLabel: '外观',
    languageLabel: '语言',
    system: '跟随系统',
    light: '浅色',
    dark: '深色',
    inputTitle: '输入 docker run 命令',
    inputHint: '支持多行、反斜杠续行、引号、常见 flags 和 key=value 参数',
    fillExample: '填充示例',
    clear: '清空',
    importFile: '导入文件',
    dropzoneLabel: '拖拽导入命令文件',
    dropzoneText: '拖 .sh / .txt 进来，命令我帮你塞进输入框。',
    invalidFile: '只收 .sh / .txt，别拿奇怪玩意儿糊我 😂',
    placeholder: '把 docker run 命令丢进来……',
    examplesTitle: 'Docker 命令示例库',
    examplesHint: '先点一个现成套路，再自己改，效率高得很。',
    currentExample: '当前',
    outputTitle: '转换结果',
    outputHint: '实时生成 compose.yaml 内容',
    download: '下载 compose.yaml',
    copyYaml: '复制 YAML',
    copied: '已复制',
    summaryTitle: '解析摘要',
    summaryHint: '给你看关键字段，免得盯 YAML 看到眼花 😂',
    copyJson: '复制 JSON',
    warningsTitle: '提醒',
    emptySummary: '等你输入命令。',
    successMessage: '当前命令里的已识别参数都顺利转过去了。挺乖 😊',
    convertFailed: '转换失败',
    summaryLabels: {
      service: '服务名',
      image: '镜像',
      ports: '端口映射',
      network: '网络',
      volumes: '数据卷',
      logging: '日志驱动',
    },
  },
  en: {
    badge: 'docker run → docker-compose',
    heroTitle: 'One command in, compose out',
    heroDescription: 'A Liquid Glass front-end tool that turns common docker run commands into docker-compose / compose.yaml with live preview, theme switching, example presets, and multilingual UI.',
    themeLabel: 'Appearance',
    languageLabel: 'Language',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    inputTitle: 'Paste your docker run command',
    inputHint: 'Supports multiline input, backslash continuations, quotes, common flags, and key=value arguments',
    fillExample: 'Use example',
    clear: 'Clear',
    importFile: 'Import file',
    dropzoneLabel: 'Import command file by drag and drop',
    dropzoneText: 'Drop a .sh or .txt file here and I will stuff the command into the editor.',
    invalidFile: 'Only .sh / .txt files are accepted. No weird stuff 😂',
    placeholder: 'Drop your docker run command here…',
    examplesTitle: 'Docker command examples',
    examplesHint: 'Start from a preset, then tweak it. Faster and less annoying.',
    currentExample: 'Current',
    outputTitle: 'Compose output',
    outputHint: 'Live compose.yaml preview',
    download: 'Download compose.yaml',
    copyYaml: 'Copy YAML',
    copied: 'Copied',
    summaryTitle: 'Summary',
    summaryHint: 'Key fields only, so you do not need to squint at YAML for too long 😂',
    copyJson: 'Copy JSON',
    warningsTitle: 'Warnings',
    emptySummary: 'Waiting for your command.',
    successMessage: 'All recognized flags were converted cleanly. Nice. 😊',
    convertFailed: 'Conversion failed',
    summaryLabels: {
      service: 'Service',
      image: 'Image',
      ports: 'Ports',
      network: 'Network',
      volumes: 'Volumes',
      logging: 'Log driver',
    },
  },
}

const examples: CommandExample[] = [
  {
    id: 'nginx',
    name: {
      zh: 'Nginx · 静态站点',
      en: 'Nginx · static site',
    },
    blurb: {
      zh: '端口、环境变量、volume、restart 一把梭。',
      en: 'Ports, env vars, volumes, and restart in one shot.',
    },
    command: `docker run -d --name my-nginx \
  -p 8080:80 -p 8443:443 \
  -e NODE_ENV=production -e TZ=Asia/Shanghai \
  -v ./data:/var/www/html -v nginx_logs:/var/log/nginx \
  --restart unless-stopped \
  --network app-net \
  --hostname web-01 \
  --label com.example.role=web \
  --add-host host.docker.internal:host-gateway \
  --cpus 1.5 --memory 512m \
  nginx:1.27-alpine nginx -g "daemon off;"`,
  },
  {
    id: 'redis',
    name: {
      zh: 'Redis · appendonly',
      en: 'Redis · appendonly',
    },
    blurb: {
      zh: '顺手演示 env-file、pull 和 command。',
      en: 'Shows env-file, pull policy, and command handling.',
    },
    command: 'docker run --rm --pull always --env-file .env.redis redis:7 redis-server --appendonly yes',
  },
  {
    id: 'api',
    name: {
      zh: 'API · healthcheck + logging',
      en: 'API · healthcheck + logging',
    },
    blurb: {
      zh: 'network aliases、healthcheck、log driver、ulimits、sysctls 都在这。',
      en: 'Network aliases, healthcheck, log driver, ulimits, and sysctls all live here.',
    },
    command: [
      'docker run --name api',
      '--network app-net --network-alias api --network-alias backend',
      '--health-cmd "curl -f http://localhost:8080/health || exit 1"',
      '--health-interval 30s --health-timeout 5s --health-retries 3 --health-start-period 10s',
      '--log-driver json-file --log-opt max-size=10m --log-opt max-file=3',
      '--ulimit nofile=65535:65535 --ulimit nproc=65535',
      '--sysctl "net.ipv4.ip_local_port_range=1024 65000"',
      'ghcr.io/demo/api:latest',
    ].join(' '),
  },
]

const defaultExample = examples[0]

function detectInitialLanguage(): Language {
  if (typeof navigator === 'undefined') {
    return 'zh'
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function CopyButton({ value, label, copiedLabel, className = '' }: { value: string; label: string; copiedLabel: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`glass-button rounded-full border px-3 py-2 text-sm font-medium transition ${className}`.trim()}
    >
      {copied ? copiedLabel : label}
    </button>
  )
}

async function readCommandFile(file: File): Promise<string> {
  const content = await file.text()
  return content.trim()
}

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme())
  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage())
  const [command, setCommand] = useState(defaultExample.command)
  const [selectedExampleId, setSelectedExampleId] = useState(defaultExample.id)
  const [isDragging, setIsDragging] = useState(false)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateTheme = (event?: MediaQueryListEvent) => {
      setSystemTheme(event?.matches ?? mediaQuery.matches ? 'dark' : 'light')
    }

    updateTheme()
    mediaQuery.addEventListener?.('change', updateTheme)
    mediaQuery.addListener?.(updateTheme)

    return () => {
      mediaQuery.removeEventListener?.('change', updateTheme)
      mediaQuery.removeListener?.(updateTheme)
    }
  }, [])

  const theme = themeMode === 'system' ? systemTheme : themeMode
  const t = dictionaries[language]

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-theme-mode', themeMode)
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [language, theme, themeMode])

  const result = useMemo(() => {
    try {
      return {
        data: convertDockerRunToCompose(command),
        error: '',
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : t.convertFailed,
      }
    }
  }, [command, t.convertFailed])

  const selectedExample = examples.find((item) => item.id === selectedExampleId) ?? defaultExample
  const activeService = result.data ? result.data.compose.services[result.data.serviceName] : null
  const networkSummary = activeService
    ? (activeService.network_mode
        ?? (Array.isArray(activeService.networks)
          ? activeService.networks.join(', ')
          : Object.keys(activeService.networks ?? {}).join(', '))
        ?? '—')
    : '—'

  const themeButtonClass = (mode: ThemeMode) => `glass-toggle theme-text-secondary rounded-full border px-3 py-2 text-sm font-semibold transition ${themeMode === mode ? 'glass-toggle-active theme-text-primary' : ''}`
  const langButtonClass = (value: Language) => `glass-toggle theme-text-secondary rounded-full border px-3 py-2 text-sm font-semibold transition ${language === value ? 'glass-toggle-active theme-text-primary' : ''}`

  function applyExample(example: CommandExample) {
    setSelectedExampleId(example.id)
    setCommand(example.command)
    setImportError('')
  }

  async function importFile(file: File | null | undefined) {
    if (!file) {
      return
    }

    if (!/\.(txt|sh)$/i.test(file.name)) {
      setImportError(t.invalidFile)
      return
    }

    const content = await readCommandFile(file)
    setCommand(content)
    setSelectedExampleId('')
    setImportError('')
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    await importFile(event.dataTransfer.files[0])
  }

  function handleDownload() {
    if (!result.data) {
      return
    }

    const blob = new Blob([result.data.yaml], { type: 'text/yaml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'compose.yaml'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-surface overflow-hidden rounded-[2rem] border border-white/30 shadow-2xl shadow-sky-950/15">
          <div className="glass-hero border-b border-white/20 px-6 py-8 sm:px-8 sm:py-10">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="glass-chip mb-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.25em] uppercase">
                  {t.badge}
                </div>
                <h1 className="theme-text-primary max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{t.heroTitle}</h1>
                <p className="theme-text-secondary mt-3 max-w-3xl text-sm leading-7 sm:text-base">
                  {t.heroDescription}
                </p>
              </div>

              <div className="grid gap-3 sm:min-w-[16rem]">
                <div className="glass-toolbar rounded-[1.5rem] border p-2">
                  <div className="theme-text-faint px-2 pb-2 text-xs font-semibold uppercase tracking-[0.25em]">{t.themeLabel}</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" aria-pressed={themeMode === 'system'} onClick={() => setThemeMode('system')} className={themeButtonClass('system')}>
                      {t.system}
                    </button>
                    <button type="button" aria-pressed={themeMode === 'light'} onClick={() => setThemeMode('light')} className={themeButtonClass('light')}>
                      {t.light}
                    </button>
                    <button type="button" aria-pressed={themeMode === 'dark'} onClick={() => setThemeMode('dark')} className={themeButtonClass('dark')}>
                      {t.dark}
                    </button>
                  </div>
                </div>

                <div className="glass-toolbar rounded-[1.5rem] border p-2">
                  <div className="theme-text-faint px-2 pb-2 text-xs font-semibold uppercase tracking-[0.25em]">{t.languageLabel}</div>
                  <div className="flex gap-2">
                    <button type="button" aria-pressed={language === 'zh'} onClick={() => setLanguage('zh')} className={langButtonClass('zh')}>
                      ZH
                    </button>
                    <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} className={langButtonClass('en')}>
                      EN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="grid gap-6">
              <section className="glass-panel flex min-h-[560px] flex-col rounded-[1.75rem] border border-white/25">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
                  <div>
                    <h2 className="theme-text-primary text-lg font-semibold">{t.inputTitle}</h2>
                    <p className="theme-text-tertiary text-sm">{t.inputHint}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => applyExample(defaultExample)} className="glass-button rounded-full border px-3 py-2 text-sm font-medium transition">
                      {t.fillExample}
                    </button>
                    <button type="button" onClick={() => setCommand('')} className="glass-button rounded-full border px-3 py-2 text-sm font-medium transition">
                      {t.clear}
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="glass-button rounded-full border px-3 py-2 text-sm font-medium transition">
                      {t.importFile}
                    </button>
                  </div>
                </div>

                <label
                  aria-label={t.dropzoneLabel}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`glass-dropzone mx-4 mt-4 rounded-[1.5rem] border border-dashed px-4 py-4 text-sm transition ${isDragging ? 'glass-dropzone-active theme-text-primary' : 'theme-text-secondary'}`}
                >
                  <div className="theme-text-faint text-[11px] font-semibold uppercase tracking-[0.24em]">DROPZONE</div>
                  <div className="mt-2 text-sm font-medium leading-6">{t.dropzoneText}</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sh,.txt,text/plain"
                    className="hidden"
                    onChange={async (event) => {
                      await importFile(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                </label>

                {importError ? <div className="theme-danger mx-4 mt-3 rounded-[1.25rem] border px-4 py-3 text-sm font-medium">{importError}</div> : null}

                <div className="glass-input-shell mx-4 mb-4 mt-4 flex flex-1 rounded-[1.6rem] border p-1.5">
                  <textarea
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    spellCheck={false}
                    className="theme-text-primary min-h-[400px] flex-1 resize-none rounded-[1.2rem] bg-transparent px-4 py-4 font-mono text-sm leading-7 outline-none"
                    placeholder={t.placeholder}
                  />
                </div>
              </section>

              <article className="glass-panel rounded-[1.75rem] border border-white/25 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="theme-text-primary text-lg font-semibold">{t.examplesTitle}</h2>
                    <p className="theme-text-tertiary text-sm">{t.examplesHint}</p>
                  </div>
                  <span className="theme-text-faint text-sm">{t.currentExample}: {selectedExample.name[language]}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {examples.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      onClick={() => applyExample(example)}
                      className={`glass-option rounded-[1.5rem] border p-4 text-left transition ${selectedExampleId === example.id ? 'glass-option-active' : ''}`}
                    >
                      <div className="theme-text-primary font-semibold">{example.name[language]}</div>
                      <div className="theme-text-tertiary mt-2 text-sm">{example.blurb[language]}</div>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-6">
              <article className="glass-panel rounded-[1.75rem] border border-white/25 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="theme-text-primary text-lg font-semibold">{t.outputTitle}</h2>
                    <p className="theme-text-tertiary text-sm">{t.outputHint}</p>
                  </div>
                  <div className="flex gap-2">
                    {result.data ? (
                      <button type="button" onClick={handleDownload} className="glass-button rounded-full border px-3 py-2 text-sm font-medium transition">
                        {t.download}
                      </button>
                    ) : null}
                    {result.data ? <CopyButton value={result.data.yaml} label={t.copyYaml} copiedLabel={t.copied} className="" /> : null}
                  </div>
                </div>
                {result.error ? (
                  <div className="theme-danger rounded-[1.5rem] border px-4 py-3 text-sm font-medium">{result.error}</div>
                ) : (
                  <pre className="glass-code theme-code-text overflow-x-auto rounded-[1.5rem] border p-4 text-sm leading-7">
                    <code>{result.data?.yaml}</code>
                  </pre>
                )}
              </article>

              <article className="glass-panel rounded-[1.75rem] border border-white/25 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="theme-text-primary text-lg font-semibold">{t.summaryTitle}</h2>
                    <p className="theme-text-tertiary text-sm">{t.summaryHint}</p>
                  </div>
                  {result.data ? (
                    <CopyButton value={JSON.stringify(result.data.compose, null, 2)} label={t.copyJson} copiedLabel={t.copied} className="" />
                  ) : null}
                </div>
                {result.data ? (
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="glass-stat rounded-[1.5rem] border p-4">
                      <div className="theme-text-faint">{t.summaryLabels.service}</div>
                      <div className="theme-text-primary mt-2 font-mono text-base">{result.data.serviceName}</div>
                    </div>
                    <div className="glass-stat rounded-[1.5rem] border p-4">
                      <div className="theme-text-faint">{t.summaryLabels.image}</div>
                      <div className="theme-text-primary mt-2 break-all font-mono text-base">{result.data.compose.services[result.data.serviceName].image}</div>
                    </div>
                    <div className="glass-stat rounded-[1.5rem] border p-4">
                      <div className="theme-text-faint">{t.summaryLabels.ports}</div>
                      <div className="theme-text-primary mt-2 font-mono text-base">{result.data.compose.services[result.data.serviceName].ports?.join(', ') ?? '—'}</div>
                    </div>
                    <div className="glass-stat rounded-[1.5rem] border p-4">
                      <div className="theme-text-faint">{t.summaryLabels.network}</div>
                      <div className="theme-text-primary mt-2 font-mono text-base">{networkSummary}</div>
                    </div>
                    <div className="glass-stat rounded-[1.5rem] border p-4">
                      <div className="theme-text-faint">{t.summaryLabels.volumes}</div>
                      <div className="theme-text-primary mt-2 font-mono text-base">{result.data.compose.services[result.data.serviceName].volumes?.join(', ') ?? '—'}</div>
                    </div>
                    <div className="glass-stat rounded-[1.5rem] border p-4">
                      <div className="theme-text-faint">{t.summaryLabels.logging}</div>
                      <div className="theme-text-primary mt-2 font-mono text-base">{result.data.compose.services[result.data.serviceName].logging?.driver ?? '—'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-stat theme-text-tertiary rounded-[1.5rem] border px-4 py-3 text-sm">{t.emptySummary}</div>
                )}
              </article>

              <article className="glass-panel rounded-[1.75rem] border border-white/25 p-5">
                <h2 className="theme-text-primary text-lg font-semibold">{t.warningsTitle}</h2>
                {result.data?.warnings.length ? (
                  <ul className="theme-warning mt-4 grid gap-3 rounded-[1.5rem] border p-3 text-sm">
                    {result.data.warnings.map((warning) => (
                      <li key={warning} className="theme-warning rounded-[1.5rem] border px-4 py-3">
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="theme-success mt-4 rounded-[1.5rem] border px-4 py-3 text-sm font-medium">
                    {t.successMessage}
                  </div>
                )}
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
