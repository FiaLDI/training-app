'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

import {
  DEFAULT_REST_SECONDS,
  usePreferencesStore,
} from '@/entities/preferences/model/store'
import { requestRestNotificationPermission } from '@/features/rest-timer/lib/rest-alerts'
import { cn } from '@/shared/lib/cn'

const REST_PRESETS = [60, 90, 120, 180]

export function RestTimerSettings() {
  const defaultRestSeconds = usePreferencesStore((s) => s.defaultRestSeconds)
  const autoStartRestTimer = usePreferencesStore((s) => s.autoStartRestTimer)
  const restTimerSkipWarmup = usePreferencesStore((s) => s.restTimerSkipWarmup)
  const restTimerSound = usePreferencesStore((s) => s.restTimerSound)
  const restTimerVibration = usePreferencesStore((s) => s.restTimerVibration)
  const restTimerNotifications = usePreferencesStore((s) => s.restTimerNotifications)
  const setDefaultRestSeconds = usePreferencesStore((s) => s.setDefaultRestSeconds)
  const setAutoStartRestTimer = usePreferencesStore((s) => s.setAutoStartRestTimer)
  const setRestTimerSkipWarmup = usePreferencesStore((s) => s.setRestTimerSkipWarmup)
  const setRestTimerSound = usePreferencesStore((s) => s.setRestTimerSound)
  const setRestTimerVibration = usePreferencesStore((s) => s.setRestTimerVibration)
  const setRestTimerNotifications = usePreferencesStore((s) => s.setRestTimerNotifications)

  const [draftRest, setDraftRest] = useState(String(defaultRestSeconds))
  const [notificationHint, setNotificationHint] = useState<string | null>(null)

  useEffect(() => {
    setDraftRest(String(defaultRestSeconds))
  }, [defaultRestSeconds])

  function commitRest(raw: string) {
    const parsed = Number(raw.trim().replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed < 15 || parsed > 600) {
      setDraftRest(String(defaultRestSeconds))
      return
    }
    setDefaultRestSeconds(parsed)
  }

  async function onNotificationsToggle(checked: boolean) {
    if (!checked) {
      setRestTimerNotifications(false)
      setNotificationHint(null)
      return
    }

    const permission = await requestRestNotificationPermission()
    if (permission === 'granted') {
      setRestTimerNotifications(true)
      setNotificationHint(null)
      return
    }

    setRestTimerNotifications(false)
    if (permission === 'unsupported') {
      setNotificationHint('Браузер не поддерживает уведомления.')
    } else {
      setNotificationHint('Разрешите уведомления в настройках браузера.')
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <Timer className="size-4 text-[var(--accent)]" />
        Таймер отдыха
      </div>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Автозапуск после записи подхода, звук, вибрация и уведомления по окончании отдыха.
      </p>

      <div className="space-y-5">
        <ToggleRow
          label="Автозапуск после подхода"
          description="Таймер стартует сразу после сохранения рабочего подхода."
          checked={autoStartRestTimer}
          onChange={setAutoStartRestTimer}
        />

        <ToggleRow
          label="Пропускать разминочные подходы"
          description="Не запускать таймер после подходов с меткой «Разминка»."
          checked={restTimerSkipWarmup}
          onChange={setRestTimerSkipWarmup}
        />

        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">Отдых по умолчанию (сек)</p>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Используется, если у упражнения не задан своё время отдыха.
          </p>
          <div className="flex flex-wrap gap-2">
            {REST_PRESETS.map((preset) => {
              const active = defaultRestSeconds === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDefaultRestSeconds(preset)}
                  className={cn(
                    'min-h-11 rounded-xl px-3.5 text-sm tabular-nums transition',
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]',
                  )}
                >
                  {preset}с
                </button>
              )
            })}
            <input
              type="text"
              inputMode="numeric"
              aria-label="Отдых по умолчанию, своё значение"
              value={draftRest}
              onChange={(event) => setDraftRest(event.target.value)}
              onBlur={() => commitRest(draftRest)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitRest(draftRest)
                }
              }}
              placeholder={String(DEFAULT_REST_SECONDS)}
              className="min-h-11 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-center text-sm tabular-nums text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-5">
          <p className="mb-3 text-sm font-medium text-[var(--foreground)]">Сигналы по окончании</p>
          <div className="space-y-4">
            <ToggleRow
              label="Звук"
              checked={restTimerSound}
              onChange={setRestTimerSound}
            />
            <ToggleRow
              label="Вибрация"
              description="Работает на телефонах с поддержкой Vibration API."
              checked={restTimerVibration}
              onChange={setRestTimerVibration}
            />
            <ToggleRow
              label="Push-уведомления"
              description="Полезно, если экран заблокирован или приложение в фоне."
              checked={restTimerNotifications}
              onChange={(checked) => void onNotificationsToggle(checked)}
            />
            {notificationHint ? (
              <p className="text-xs text-amber-300">{notificationHint}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 size-4 rounded border-[var(--border)] accent-[var(--accent)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-[var(--foreground)]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-[var(--muted)]">{description}</span>
        ) : null}
      </span>
    </label>
  )
}
