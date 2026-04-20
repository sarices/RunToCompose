import { describe, expect, it } from 'vitest'
import { convertDockerRunToCompose } from './converter'

describe('convertDockerRunToCompose', () => {
  it('把常见 docker run 参数转成 compose 配置', () => {
    const input = [
      'docker run -d --name my-nginx',
      '-p 8080:80 -p 8443:443',
      '-e NODE_ENV=production -e TZ=Asia/Shanghai',
      '-v ./data:/var/www/html -v nginx_logs:/var/log/nginx',
      '--restart unless-stopped',
      '--network app-net',
      '--hostname web-01',
      '--label com.example.role=web',
      '--add-host host.docker.internal:host-gateway',
      '--cpus 1.5 --memory 512m',
      'nginx:1.27-alpine nginx -g "daemon off;"',
    ].join(' ')

    const result = convertDockerRunToCompose(input)

    expect(result.serviceName).toBe('my-nginx')
    expect(result.warnings).toEqual([])
    expect(result.compose.services['my-nginx']).toMatchObject({
      image: 'nginx:1.27-alpine',
      container_name: 'my-nginx',
      restart: 'unless-stopped',
      hostname: 'web-01',
      ports: ['8080:80', '8443:443'],
      volumes: ['./data:/var/www/html', 'nginx_logs:/var/log/nginx'],
      labels: {
        'com.example.role': 'web',
      },
      extra_hosts: ['host.docker.internal:host-gateway'],
      deploy: {
        resources: {
          limits: {
            cpus: '1.5',
            memory: '512m',
          },
        },
      },
      command: ['nginx', '-g', 'daemon off;'],
    })
    expect(result.compose.services['my-nginx'].networks).toEqual(['app-net'])
    expect(result.compose.networks).toEqual({
      'app-net': {},
    })
    expect(result.compose.services['my-nginx'].environment).toEqual({
      NODE_ENV: 'production',
      TZ: 'Asia/Shanghai',
    })
    expect(result.yaml).toContain('my-nginx:')
    expect(result.yaml).toContain('image: nginx:1.27-alpine')
    expect(result.yaml).toContain('command:')
  })

  it('能处理 --env-file、--pull、--rm 这类 compose 不完全等价的参数', () => {
    const input = 'docker run --rm --pull always --env-file .env.redis redis:7 redis-server --appendonly yes'

    const result = convertDockerRunToCompose(input)

    expect(result.serviceName).toBe('redis')
    expect(result.compose.services.redis).toMatchObject({
      image: 'redis:7',
      env_file: ['.env.redis'],
      pull_policy: 'always',
      command: ['redis-server', '--appendonly', 'yes'],
    })
    expect(result.warnings).toEqual(['--rm 是一次性容器语义，docker-compose 无法完全等价复刻'])
  })

  it('支持 network aliases、healthcheck、logging、ulimits 和 sysctls', () => {
    const input = [
      'docker run --name api',
      '--network app-net --network-alias api --network-alias backend',
      '--health-cmd "curl -f http://localhost:8080/health || exit 1"',
      '--health-interval 30s --health-timeout 5s --health-retries 3 --health-start-period 10s',
      '--log-driver json-file --log-opt max-size=10m --log-opt max-file=3',
      '--ulimit nofile=65535:65535 --ulimit nproc=65535',
      '--sysctl net.core.somaxconn=1024 --sysctl net.ipv4.ip_local_port_range=1024 65000',
      'ghcr.io/demo/api:latest',
    ].join(' ')

    const result = convertDockerRunToCompose(input)
    const service = result.compose.services.api

    expect(service.networks).toEqual({
      'app-net': {
        aliases: ['api', 'backend'],
      },
    })
    expect(result.compose.networks).toEqual({
      'app-net': {},
    })
    expect(service.healthcheck).toEqual({
      test: ['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1'],
      interval: '30s',
      timeout: '5s',
      retries: 3,
      start_period: '10s',
    })
    expect(service.logging).toEqual({
      driver: 'json-file',
      options: {
        'max-size': '10m',
        'max-file': '3',
      },
    })
    expect(service.ulimits).toEqual({
      nofile: {
        soft: 65535,
        hard: 65535,
      },
      nproc: 65535,
    })
    expect(service.sysctls).toEqual({
      'net.core.somaxconn': '1024',
      'net.ipv4.ip_local_port_range': '1024 65000',
    })
    expect(result.warnings).toEqual([])
  })

  it('没有 docker run 前缀也能解析，并对不支持参数给出警告', () => {
    const input = '--name worker --ipc host --cap-add NET_ADMIN busybox sh -c "echo hello"'

    const result = convertDockerRunToCompose(input)

    expect(result.serviceName).toBe('worker')
    expect(result.compose.services.worker).toMatchObject({
      image: 'busybox',
      container_name: 'worker',
      ipc: 'host',
      cap_add: ['NET_ADMIN'],
      command: ['sh', '-c', 'echo hello'],
    })
    expect(result.warnings).toEqual([])
  })

  it('支持 shell 风格的反斜杠换行续接', () => {
    const input = `docker run -d --name Freebuff2API \
  -p 8080:8080 \
  -e AUTH_TOKENS="token1,token2" \
  ghcr.io/quorinex/freebuff2api:latest`

    const result = convertDockerRunToCompose(input)

    expect(result.serviceName).toBe('freebuff2api')
    expect(result.warnings).toEqual([])
    expect(result.compose.services.freebuff2api).toMatchObject({
      image: 'ghcr.io/quorinex/freebuff2api:latest',
      container_name: 'Freebuff2API',
      ports: ['8080:8080'],
      environment: {
        AUTH_TOKENS: 'token1,token2',
      },
    })
  })

  it('支持反斜杠续行加命令参数和多个环境变量', () => {
    const input = `docker run --name app \
  -e FOO=bar \
  -e BAR=baz \
  -p 3000:3000 \
  node:20-alpine \
  sh -c "node server.js --port 3000"`

    const result = convertDockerRunToCompose(input)

    expect(result.serviceName).toBe('app')
    expect(result.warnings).toEqual([])
    expect(result.compose.services.app).toMatchObject({
      image: 'node:20-alpine',
      container_name: 'app',
      ports: ['3000:3000'],
      environment: {
        FOO: 'bar',
        BAR: 'baz',
      },
      command: ['sh', '-c', 'node server.js --port 3000'],
    })
  })
})
