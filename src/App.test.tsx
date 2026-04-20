import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

type MatchMediaController = {
  setMatches: (next: boolean) => void
}

function installMatchMedia(initialMatches = false): MatchMediaController {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  }))

  vi.stubGlobal('matchMedia', matchMedia)

  return {
    setMatches(next: boolean) {
      matches = next
      const event = { matches: next, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
    },
  }
}

describe('App', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-mode')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('支持跟随系统主题、手动切换主题、多语言、示例库、拖拽导入和下载 compose.yaml', async () => {
    const user = userEvent.setup()
    const media = installMatchMedia(true)
    const createObjectURL = vi.fn(() => 'blob:compose')
    const revokeObjectURL = vi.fn()
    const click = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', {
          value: click,
          configurable: true,
        })
      }
      return element
    })

    render(<App />)

    expect(document.documentElement).toHaveAttribute('data-theme-mode', 'system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument()

    media.setMatches(false)
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    })

    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement).toHaveAttribute('data-theme-mode', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'ZH' }))
    expect(screen.getByRole('heading', { name: 'Docker 命令示例库' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '跟随系统' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '浅色' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ZH' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('拖拽导入命令文件')).toHaveTextContent('DROPZONE')

    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('heading', { name: 'Docker command examples' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Redis .*appendonly/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Redis .*appendonly/i }))
    expect(screen.getByRole('textbox')).toHaveValue('docker run --rm --pull always --env-file .env.redis redis:7 redis-server --appendonly yes')

    const file = new File(['docker run --name from-file nginx:latest'], 'command.txt', { type: 'text/plain' })
    const dropzone = screen.getByLabelText('Import command file by drag and drop')
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('docker run --name from-file nginx:latest')
    })

    await user.click(screen.getByRole('button', { name: 'Download compose.yaml' }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:compose')

    appendSpy.mockRestore()
    removeSpy.mockRestore()
    createElementSpy.mockRestore()
  })
})
