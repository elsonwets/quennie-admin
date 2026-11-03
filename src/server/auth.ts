import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'

export interface SessionUser {
  id: string
  email: string
}

// Supabase signs in with an email. The studio logs in with a short username,
// mapped to an address on the studio's domain: "melissa" → melissa@quennie.app.
const LOGIN_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'quennie.app'
const toEmail = (username: string) => {
  const value = username.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${LOGIN_DOMAIN}`
}

const isStaff = (appMetadata: unknown) => (appMetadata as { role?: unknown } | undefined)?.role === 'staff'

/**
 * The signed-in user, or null. Uses getClaims(), which verifies the token's
 * signature: never trust getSession() on the server, the cookie can be forged.
 */
export const readUser = createServerOnlyFn(async (): Promise<SessionUser | null> => {
  const { data, error } = await getSupabaseServerClient().auth.getClaims()
  if (error || !data?.claims?.sub) return null
  // Only studio staff get in. app_metadata is set by an admin, never by the user.
  if (!isStaff(data.claims.app_metadata)) return null
  return { id: data.claims.sub, email: String(data.claims.email ?? '') }
})

/** Guard for every server function that reads or writes studio data. */
export const requireUser = createServerOnlyFn(async (): Promise<SessionUser> => {
  const user = await readUser()
  if (!user) throw new Error('Sessão expirada. Entre de novo.')
  return user
})

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(() => readUser())

export const signIn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const { username, password } = (input ?? {}) as { username?: unknown; password?: unknown }
    if (typeof username !== 'string' || !username.trim()) throw new Error('Indique o utilizador')
    if (typeof password !== 'string' || !password) throw new Error('Indique a palavra-passe')
    return { username, password }
  })
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const supabase = getSupabaseServerClient()
    const { data: session, error } = await supabase.auth.signInWithPassword({ email: toEmail(data.username), password: data.password })
    if (!error) {
      if (isStaff(session.user?.app_metadata)) return { ok: true }
      // A valid account that was never given studio access: don't leave a session behind.
      await supabase.auth.signOut()
      return { ok: false, error: 'Esta conta não tem acesso ao estúdio. Peça acesso à administração.' }
    }
    if (error.code === 'invalid_credentials') return { ok: false, error: 'Utilizador ou palavra-passe incorretos.' }
    if (error.code === 'email_not_confirmed') return { ok: false, error: 'Esta conta ainda não foi confirmada no Supabase.' }
    if (error.status === 429) return { ok: false, error: 'Demasiadas tentativas. Espere um minuto e tente outra vez.' }
    return { ok: false, error: 'Não foi possível entrar. Verifique a ligação e tente outra vez.' }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  await getSupabaseServerClient().auth.signOut()
  return { ok: true }
})
