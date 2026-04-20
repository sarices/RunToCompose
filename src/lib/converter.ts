import yaml from 'js-yaml'

export interface ComposeNetworkReference {
  aliases?: string[]
}

export interface ComposeHealthcheck {
  test: string[]
  interval?: string
  timeout?: string
  start_period?: string
  start_interval?: string
  retries?: number
}

export interface ComposeLogging {
  driver?: string
  options?: Record<string, string>
}

export interface ComposeService {
  image: string
  container_name?: string
  command?: string[]
  entrypoint?: string[]
  ports?: string[]
  volumes?: string[]
  environment?: Record<string, string>
  env_file?: string[]
  restart?: string
  network_mode?: string
  networks?: string[] | Record<string, ComposeNetworkReference>
  hostname?: string
  labels?: Record<string, string>
  extra_hosts?: string[]
  cap_add?: string[]
  devices?: string[]
  dns?: string[]
  ipc?: string
  user?: string
  working_dir?: string
  privileged?: boolean
  tty?: boolean
  stdin_open?: boolean
  pull_policy?: string
  healthcheck?: ComposeHealthcheck
  logging?: ComposeLogging
  ulimits?: Record<string, number | { soft: number; hard: number }>
  sysctls?: Record<string, string>
  deploy?: {
    resources: {
      limits: {
        cpus?: string
        memory?: string
      }
    }
  }
}

export interface ComposeDocument {
  name: string
  services: Record<string, ComposeService>
  networks?: Record<string, Record<string, never>>
}

export interface ConversionResult {
  serviceName: string
  yaml: string
  warnings: string[]
  compose: ComposeDocument
}

const VALUE_OPTIONS = new Set([
  '--name',
  '--hostname',
  '--restart',
  '--network',
  '--network-alias',
  '--label',
  '--add-host',
  '--cpus',
  '--memory',
  '--env',
  '-e',
  '--publish',
  '-p',
  '--volume',
  '-v',
  '--env-file',
  '--pull',
  '--entrypoint',
  '--user',
  '--workdir',
  '-w',
  '--dns',
  '--device',
  '--ipc',
  '--cap-add',
  '--health-cmd',
  '--health-interval',
  '--health-timeout',
  '--health-start-period',
  '--health-start-interval',
  '--health-retries',
  '--log-driver',
  '--log-opt',
  '--ulimit',
  '--sysctl',
])

const FLAG_OPTIONS = new Set(['-d', '--detach', '--rm', '--privileged', '-t', '--tty', '-i', '--interactive'])

function normalizeInput(input: string): string {
  return input
    .replace(/\\\r?\n[ \t]*/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim()
}

function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: 'single' | 'double' | null = null

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]

    if (quote === 'single') {
      if (char === "'") {
        quote = null
      } else {
        current += char
      }
      continue
    }

    if (quote === 'double') {
      if (char === '"') {
        quote = null
      } else if (char === '\\' && i + 1 < input.length) {
        i += 1
        current += input[i]
      } else {
        current += char
      }
      continue
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    if (char === "'") {
      quote = 'single'
      continue
    }

    if (char === '"') {
      quote = 'double'
      continue
    }

    if (char === '\\' && i + 1 < input.length) {
      i += 1
      current += input[i]
      continue
    }

    current += char
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

function sanitizeServiceName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'app'
}

function imageToServiceName(image: string): string {
  const last = image.split('/').pop() ?? image
  const raw = last.split(':')[0]
  return sanitizeServiceName(raw)
}

function parseKeyValue(raw: string): [string, string] {
  const index = raw.indexOf('=')
  if (index === -1) {
    return [raw, '']
  }
  return [raw.slice(0, index), raw.slice(index + 1)]
}

function ensureDeploy(service: ComposeService): NonNullable<ComposeService['deploy']> {
  service.deploy ??= { resources: { limits: {} } }
  return service.deploy
}

function ensureHealthcheck(service: ComposeService): NonNullable<ComposeService['healthcheck']> {
  service.healthcheck ??= { test: ['CMD'] }
  return service.healthcheck
}

function ensureLogging(service: ComposeService): NonNullable<ComposeService['logging']> {
  service.logging ??= {}
  return service.logging
}

function isSpecialNetworkMode(value: string): boolean {
  return ['host', 'none', 'bridge'].includes(value) || value.startsWith('container:') || value.startsWith('service:')
}

function parseUlimit(raw: string): number | { soft: number; hard: number } {
  const [, value = ''] = raw.split('=', 2)
  if (value.includes(':')) {
    const [soft, hard] = value.split(':', 2)
    return {
      soft: Number(soft),
      hard: Number(hard),
    }
  }

  return Number(value)
}

export function convertDockerRunToCompose(input: string): ConversionResult {
  const normalizedInput = normalizeInput(input)
  const tokens = tokenize(normalizedInput)
  const normalizedTokens = [...tokens]

  if (normalizedTokens[0] === 'docker' && normalizedTokens[1] === 'run') {
    normalizedTokens.splice(0, 2)
  }

  const service: ComposeService = {
    image: '',
  }
  const warnings: string[] = []
  const networkAliases: string[] = []
  let composeNetworkName = ''

  let serviceName = ''
  let imageIndex = -1

  for (let index = 0; index < normalizedTokens.length; index += 1) {
    const token = normalizedTokens[index]

    if (!token.startsWith('-')) {
      imageIndex = index
      break
    }

    if (token.includes('=')) {
      const equalIndex = token.indexOf('=')
      const flag = token.slice(0, equalIndex)
      const value = token.slice(equalIndex + 1)
      normalizedTokens.splice(index, 1, flag, value)
    }
  }

  for (let index = 0; index < normalizedTokens.length; index += 1) {
    const token = normalizedTokens[index]

    if (!token.startsWith('-')) {
      imageIndex = index
      break
    }

    if (FLAG_OPTIONS.has(token)) {
      switch (token) {
        case '--rm':
          warnings.push('--rm 是一次性容器语义，docker-compose 无法完全等价复刻')
          break
        case '--privileged':
          service.privileged = true
          break
        case '-t':
        case '--tty':
          service.tty = true
          break
        case '-i':
        case '--interactive':
          service.stdin_open = true
          break
        default:
          break
      }
      continue
    }

    if (!VALUE_OPTIONS.has(token)) {
      warnings.push(`暂未显式转换参数: ${token}`)
      continue
    }

    let value = normalizedTokens[index + 1]
    index += 1

    if (token === '--sysctl' && /^.+?=\d+$/.test(value) && /^\d+$/.test(normalizedTokens[index + 1] ?? '')) {
      value = `${value} ${normalizedTokens[index + 1]}`
      index += 1
    }

    switch (token) {
      case '--name':
        serviceName = sanitizeServiceName(value)
        service.container_name = value
        break
      case '--hostname':
        service.hostname = value
        break
      case '--restart':
        service.restart = value
        break
      case '--network':
        if (isSpecialNetworkMode(value)) {
          service.network_mode = value
        } else {
          composeNetworkName = value
          service.networks = [value]
        }
        break
      case '--network-alias':
        networkAliases.push(value)
        break
      case '--label': {
        const [key, labelValue] = parseKeyValue(value)
        service.labels ??= {}
        service.labels[key] = labelValue
        break
      }
      case '--add-host':
        service.extra_hosts ??= []
        service.extra_hosts.push(value)
        break
      case '--cpus':
        ensureDeploy(service).resources.limits.cpus = value
        break
      case '--memory':
        ensureDeploy(service).resources.limits.memory = value
        break
      case '--env':
      case '-e': {
        const [key, envValue] = parseKeyValue(value)
        service.environment ??= {}
        service.environment[key] = envValue
        break
      }
      case '--publish':
      case '-p':
        service.ports ??= []
        service.ports.push(value)
        break
      case '--volume':
      case '-v':
        service.volumes ??= []
        service.volumes.push(value)
        break
      case '--env-file':
        service.env_file ??= []
        service.env_file.push(value)
        break
      case '--pull':
        service.pull_policy = value
        break
      case '--entrypoint':
        service.entrypoint = tokenize(value)
        break
      case '--user':
        service.user = value
        break
      case '--workdir':
      case '-w':
        service.working_dir = value
        break
      case '--dns':
        service.dns ??= []
        service.dns.push(value)
        break
      case '--device':
        service.devices ??= []
        service.devices.push(value)
        break
      case '--ipc':
        service.ipc = value
        break
      case '--cap-add':
        service.cap_add ??= []
        service.cap_add.push(value)
        break
      case '--health-cmd':
        ensureHealthcheck(service).test = value === 'NONE' ? ['NONE'] : ['CMD-SHELL', value]
        break
      case '--health-interval':
        ensureHealthcheck(service).interval = value
        break
      case '--health-timeout':
        ensureHealthcheck(service).timeout = value
        break
      case '--health-start-period':
        ensureHealthcheck(service).start_period = value
        break
      case '--health-start-interval':
        ensureHealthcheck(service).start_interval = value
        break
      case '--health-retries':
        ensureHealthcheck(service).retries = Number(value)
        break
      case '--log-driver':
        ensureLogging(service).driver = value
        break
      case '--log-opt': {
        const [key, optionValue] = parseKeyValue(value)
        const logging = ensureLogging(service)
        logging.options ??= {}
        logging.options[key] = optionValue
        break
      }
      case '--ulimit': {
        const [key] = parseKeyValue(value)
        service.ulimits ??= {}
        service.ulimits[key] = parseUlimit(value)
        break
      }
      case '--sysctl': {
        const [key, sysctlValue] = parseKeyValue(value)
        service.sysctls ??= {}
        service.sysctls[key] = sysctlValue
        break
      }
      default:
        break
    }
  }

  const image = normalizedTokens[imageIndex]
  if (!image) {
    throw new Error('没找到镜像名，请确认输入的是完整 docker run 命令')
  }
  service.image = image

  const commandTokens = normalizedTokens.slice(imageIndex + 1)
  if (commandTokens.length > 0) {
    service.command = commandTokens
  }

  if (composeNetworkName && networkAliases.length > 0) {
    service.networks = {
      [composeNetworkName]: {
        aliases: networkAliases,
      },
    }
  } else if (networkAliases.length > 0) {
    warnings.push(`--network-alias=${networkAliases.join(', ')} 需要先配自定义 network 才能落进 compose`) 
  }

  if (!serviceName) {
    serviceName = imageToServiceName(image)
  }

  const compose: ComposeDocument = {
    name: `${serviceName}-stack`,
    services: {
      [serviceName]: service,
    },
  }

  if (composeNetworkName) {
    compose.networks = {
      [composeNetworkName]: {},
    }
  }

  const yamlText = yaml.dump(compose, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })

  return {
    serviceName,
    yaml: yamlText,
    warnings,
    compose,
  }
}
