import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('calls fetch with the bare path when NEXT_PUBLIC_BASE_PATH is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)

    const { apiFetch } = await import('@/lib/api')
    await apiFetch('/api/items')

    expect(fetchMock).toHaveBeenCalledWith('/api/items', undefined)
  })

  it('prefixes the path when NEXT_PUBLIC_BASE_PATH is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/gogoffcc-pmm')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)

    const { apiFetch } = await import('@/lib/api')
    await apiFetch('/api/items', { method: 'POST' })

    expect(fetchMock).toHaveBeenCalledWith('/gogoffcc-pmm/api/items', { method: 'POST' })
  })

  it('passes through init options unchanged', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/gogoffcc-pmm')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)

    const { apiFetch } = await import('@/lib/api')
    const init = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' }
    await apiFetch('/api/items/5', init)

    expect(fetchMock).toHaveBeenCalledWith('/gogoffcc-pmm/api/items/5', init)
  })
})
