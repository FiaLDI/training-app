import { ApiError, TimeoutError } from '@/shared/api/client'
import { API_URL } from '@/shared/config/env'
import { useSessionStore } from '@/entities/session/model/store'

export type SeedImportSkipped = {
  id: string
  name: string
  reason: 'id' | 'name'
}

export type SeedImportResult = {
  created: number
  skipped: SeedImportSkipped[]
  imagesAttached: number
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ironlog:session')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null } }
    return parsed.state?.accessToken ?? null
  } catch {
    return null
  }
}

function authHeaders(): HeadersInit {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseError(response: Response): Promise<string> {
  let message = response.statusText
  try {
    const data = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(data.message)) message = data.message.join(', ')
    else if (data.message) message = data.message
  } catch {
    // ignore
  }
  return message || `Ошибка ${response.status}`
}

function handleUnauthorized(response: Response) {
  if (response.status !== 401 || typeof window === 'undefined') return
  if (useSessionStore.getState().mode === 'local') return
  try {
    localStorage.removeItem('ironlog:session')
  } catch {
    // ignore
  }
  useSessionStore.setState({ mode: null, user: null, accessToken: null, hydrated: true })
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

export async function downloadSystemExerciseSeed(): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)
  try {
    const response = await fetch(`${API_URL}/admin/exercise-seed`, {
      credentials: 'include',
      headers: authHeaders(),
      signal: controller.signal,
    })
    if (!response.ok) {
      handleUnauthorized(response)
      throw new ApiError(response.status, await parseError(response))
    }
    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition')
    const match = disposition?.match(/filename="([^"]+)"/)
    const filename = match?.[1] ?? 'ironlog-system-exercises.zip'
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError()
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function importSystemExerciseSeed(file: File): Promise<SeedImportResult> {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${API_URL}/admin/exercise-seed/import`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body,
  })
  if (!response.ok) {
    handleUnauthorized(response)
    throw new ApiError(response.status, await parseError(response))
  }
  return response.json() as Promise<SeedImportResult>
}

export function formatSeedImportResult(result: SeedImportResult): string {
  return `Создано: ${result.created}, пропущено: ${result.skipped.length}, картинок: ${result.imagesAttached}`
}
