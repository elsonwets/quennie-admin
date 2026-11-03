import type { SessionUser } from '~/server/auth'

// Browser-side memo of who is signed in, so client navigations don't ask the server
// on every click. The server still checks the session on every data call.
let known: SessionUser | null | undefined

export const isBrowser = typeof window !== 'undefined'
export const rememberedUser = () => (isBrowser ? known : undefined)
export const rememberUser = (user: SessionUser | null) => {
  if (isBrowser) known = user
}
export const forgetUser = () => {
  known = undefined
}

export const LOGIN_PATH = '/entrar' as const
export const isSessionError = (error: unknown) => error instanceof Error && error.message.startsWith('Sessão expirada')
