import { createServerClient } from '@supabase/ssr'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getCookies, setCookie, setResponseHeader } from '@tanstack/react-start/server'

/**
 * Supabase client bound to the current request's cookies. Create one per request:
 * the library sends its no-cache headers only with the first cookie write of a client.
 */
export const getSupabaseServerClient = createServerOnlyFn(() => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_KEY
  if (!url || !key) throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_KEY em falta no .env')

  return createServerClient(url, key, {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies, headers) => {
        for (const { name, value, options } of cookies) setCookie(name, value, options)
        // Responses that carry a session must never be cached and served to someone else.
        for (const [header, value] of Object.entries(headers)) setResponseHeader(header, value)
      },
    },
  })
})
