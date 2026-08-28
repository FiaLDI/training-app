export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-2xl font-semibold">Нет сети</p>
      <p className="max-w-sm text-sm text-[var(--muted)]">
        Страница не загружена из кеша. Откройте раздел, который вы уже посещали, или
        подключитесь к интернету. Локальные данные тренировок доступны без сети.
      </p>
    </div>
  )
}
