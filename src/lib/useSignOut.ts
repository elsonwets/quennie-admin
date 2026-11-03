import { useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { signOut } from '~/server/auth'
import { LOGIN_PATH, forgetUser } from './session'

/** Ends the Supabase session and wipes what this device kept: router data and offline page copies. */
export function useSignOut() {
  const router = useRouter()
  return useCallback(async () => {
    await signOut()
    forgetUser()
    if ('caches' in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key)))
    router.clearCache()
    await router.navigate({ to: LOGIN_PATH, replace: true })
  }, [router])
}
