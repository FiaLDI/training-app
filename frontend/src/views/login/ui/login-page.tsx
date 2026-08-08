'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Step = 'choose' | 'register' | 'login'

export function LoginPage() {
  const router = useRouter()
  const continueLocal = useSessionStore((s) => s.continueLocal)
  const register = useSessionStore((s) => s.register)
  const login = useSessionStore((s) => s.login)

  const [step, setStep] = useState<Step>('choose')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function goLocal() {
    continueLocal()
    router.replace('/')
  }

  async function onRegister(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const result = await register(email)
      setMessage(
        result.created
          ? 'Аккаунт создан. Постоянный код — в консоли бэкенда; входите только по коду.'
          : 'Аккаунт уже существует. Постоянный код снова выведен в консоль бэкенда.',
      )
      setStep('login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться')
    } finally {
      setLoading(false)
    }
  }

  async function onLogin(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(code)
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный код')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(163,230,53,0.14),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.1),transparent_40%)]"
      />

      <div className="relative w-full max-w-md">
        <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Iron<span className="text-[var(--accent)]">Log</span>
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Локальный режим без аккаунта или облачная синхронизация с постоянным кодом.
        </p>

        {step === 'choose' && (
          <div className="mt-8 flex flex-col gap-3">
            <Button type="button" onClick={goLocal}>
              Продолжить локально
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStep('login')}>
              Войти по коду
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('register')}>
              Зарегистрироваться по email
            </Button>
          </div>
        )}

        {step === 'register' && (
          <form className="mt-8 space-y-4" onSubmit={onRegister}>
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--muted)]">Эл. почта</span>
              <Input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <p className="text-xs text-[var(--muted)]">
              Постоянный код входа будет создан один раз и выведен в консоль бэкенда.
              Входите только по этому коду.
            </p>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep('choose')}>
                Назад
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Регистрация…' : 'Зарегистрироваться'}
              </Button>
            </div>
          </form>
        )}

        {step === 'login' && (
          <form className="mt-8 space-y-4" onSubmit={onLogin}>
            {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--muted)]">Код</span>
              <Input
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="введите код"
                autoComplete="current-password"
              />
            </label>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep('choose')}>
                Назад
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Вход…' : 'Войти'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
