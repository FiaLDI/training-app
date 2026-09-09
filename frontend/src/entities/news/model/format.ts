export function formatNewsDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function isNewsOfflineError(error: unknown) {
  return error instanceof TypeError
}

export function newsLoadErrorMessage(error: unknown, fallback: string) {
  if (isNewsOfflineError(error)) return 'Нет сети, новости недоступны'
  if (error instanceof Error && error.message) return error.message
  return fallback
}
