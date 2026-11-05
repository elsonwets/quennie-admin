import { useEffect, useState } from 'react'

// "Install the app" without waiting for the browser to suggest it.
// Android and desktop Chrome/Edge fire `beforeinstallprompt` once the app qualifies; we keep
// that event and replay it from our own button. iPhone Safari has no such event: the only
// way is Share → "Adicionar ao ecrã principal", so we show those steps instead.

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: PromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

// Listen as soon as this module loads: the event can fire before React has rendered.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as PromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)

export function useInstallApp() {
  const [, force] = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])

  if (!mounted || isStandalone()) return { mode: 'hidden' as const, install: async () => false }
  if (deferred) {
    return {
      mode: 'prompt' as const,
      install: async () => {
        const e = deferred
        if (!e) return false
        await e.prompt()
        const { outcome } = await e.userChoice
        deferred = null
        notify()
        return outcome === 'accepted'
      },
    }
  }
  return { mode: isIos() ? ('ios' as const) : ('hidden' as const), install: async () => false }
}
