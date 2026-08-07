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
          ? 'Account created. Permanent code is in the backend console — use only the code to sign in.'
          : 'Account already exists. Permanent code re-logged to the backend console.',
      )
      setStep('login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
      setError(err instanceof Error ? err.message : 'Invalid code')
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
          Local mode without an account, or cloud sync with a permanent code.
        </p>

        {step === 'choose' && (
          <div className="mt-8 flex flex-col gap-3">
            <Button type="button" onClick={goLocal}>
              Continue locally
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStep('login')}>
              Sign in with code
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('register')}>
              Register with email
            </Button>
          </div>
        )}

        {step === 'register' && (
          <form className="mt-8 space-y-4" onSubmit={onRegister}>
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--muted)]">Email</span>
              <Input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <p className="text-xs text-[var(--muted)]">
              A permanent login code will be generated once and logged to the backend console.
              Sign in with that code only.
            </p>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Registering…' : 'Register'}
              </Button>
            </div>
          </form>
        )}

        {step === 'login' && (
          <form className="mt-8 space-y-4" onSubmit={onLogin}>
            {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--muted)]">Code</span>
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
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
