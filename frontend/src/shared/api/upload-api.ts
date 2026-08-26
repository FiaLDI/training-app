import { ApiError } from '@/shared/api/client'
import { API_URL } from '@/shared/config/env'

export type UploadResult = {
  url: string
  filename: string
  size: number
  mimeType: string
  originalName: string
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

export async function uploadFile(file: File): Promise<UploadResult> {
  const token = getAccessToken()
  const body = new FormData()
  body.append('file', file)

  const response = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const data = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(data.message)) message = data.message.join(', ')
      else if (data.message) message = data.message
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message || `Ошибка ${response.status}`)
  }

  return response.json() as Promise<UploadResult>
}
