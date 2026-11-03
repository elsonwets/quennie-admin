/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  /** Publishable key: safe in the browser, protected by RLS and server checks. */
  readonly VITE_SUPABASE_KEY: string
  /** Domain appended to short usernames at login. Defaults to quennie.app. */
  readonly VITE_AUTH_EMAIL_DOMAIN?: string
}
