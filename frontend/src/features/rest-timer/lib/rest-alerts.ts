import { usePreferencesStore } from '@/entities/preferences/model/store'

let scheduledAlertTimeout: ReturnType<typeof setTimeout> | null = null

export function clearScheduledRestAlert() {
  if (scheduledAlertTimeout != null) {
    clearTimeout(scheduledAlertTimeout)
    scheduledAlertTimeout = null
  }
}

export function scheduleRestAlert(endsAt: number, onFire?: () => void) {
  clearScheduledRestAlert()

  const delay = Math.max(0, endsAt - Date.now())
  scheduledAlertTimeout = setTimeout(() => {
    scheduledAlertTimeout = null
    onFire?.()
  }, delay)
}

export async function triggerRestAlerts() {
  const { restTimerSound, restTimerVibration, restTimerNotifications } =
    usePreferencesStore.getState()

  if (restTimerSound) {
    playRestEndSound()
  }

  if (restTimerVibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200])
  }

  if (restTimerNotifications && typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      new Notification('IronLog', {
        body: 'Отдых окончен — можно делать следующий подход',
        tag: 'ironlog-rest-timer',
        silent: !restTimerSound,
      })
    }
  }
}

function playRestEndSound() {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.value = 0.25

    const tones = [880, 880, 1100]
    let offset = 0
    for (const frequency of tones) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = frequency
      osc.connect(gain)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.12)
      offset += 0.18
    }

    void ctx.close()
  } catch {
    // Audio may be blocked until user gesture — ignore silently.
  }
}

export async function requestRestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}
