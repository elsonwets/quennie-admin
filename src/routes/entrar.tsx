import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Eye, EyeOff, LoaderCircle, Lock, User } from 'lucide-react'
import { signIn } from '~/server/auth'
import { forgetUser } from '~/lib/session'
import { Wordmark } from '~/components/Sidebar'

export const Route = createFileRoute('/entrar')({
  // Only same-site paths: an outside URL here would turn the login page into an open redirect.
  validateSearch: (search: Record<string, unknown>): { voltar?: string } =>
    typeof search.voltar === 'string' && search.voltar.startsWith('/') && !search.voltar.startsWith('//') ? { voltar: search.voltar } : {},
  head: () => ({ meta: [{ title: 'Entrar · Quennie' }] }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { voltar } = Route.useSearch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await signIn({ data: { username, password } })
      if (!result.ok) {
        setError(result.error)
        setBusy(false)
        return
      }
      forgetUser()
      await router.navigate({ to: voltar ?? '/', replace: true })
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh bg-marfim lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Her own work sets the tone before anything is typed. */}
      <aside className="relative h-[34dvh] min-h-56 overflow-hidden bg-nogueira lg:h-auto">
        <img src="/media/hero-interior.jpg" alt="" className="rise absolute inset-0 size-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-nogueira/85 via-nogueira/20 to-nogueira/10" />
        <div className="absolute inset-x-0 top-0 hidden p-10 text-marfim lg:block">
          <Wordmark />
        </div>
        <div className="absolute inset-x-0 bottom-0 hidden max-w-lg p-10 text-marfim lg:block">
          <p className="display text-[2.6rem] leading-[1.05]">O estúdio, onde quer que esteja.</p>
          <p className="mt-3 text-[0.9rem] text-marfim/75">Projetos, inspirações, agenda e faturas da Quennie Interior Design.</p>
        </div>
      </aside>

      <main className="relative -mt-8 flex flex-col rounded-t-[2rem] bg-marfim px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 lg:mt-0 lg:justify-center lg:rounded-none lg:px-16">
        <div className="rise mx-auto w-full max-w-sm" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="mb-8 flex justify-center lg:hidden">
            <Wordmark centered />
          </div>

          <h1 className="display text-[2.6rem]">Entrar</h1>
          <p className="mt-2 text-[0.9rem] text-taupe">Acesso reservado à equipa do estúdio.</p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.78rem] text-nogueira/70">Utilizador</span>
              <span className="relative">
                <User className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.6} />
                <input
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="field h-12 rounded-2xl pl-10 text-[0.95rem]"
                  placeholder="melissa"
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.78rem] text-nogueira/70">Palavra-passe</span>
              <span className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.6} />
                <input
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field h-12 rounded-2xl pr-12 pl-10 text-[0.95rem]"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
                  className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-taupe hover:bg-linho hover:text-nogueira"
                >
                  {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-[#f8e3dd] px-3.5 py-2.5 text-[0.84rem] text-[#9b3424]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !username.trim() || !password}
              className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-nogueira text-[0.92rem] text-marfim shadow-[0_10px_24px_-12px_rgb(42_30_23/0.7)] transition hover:bg-[#3b2b21] active:scale-[0.99] disabled:opacity-50"
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />}
              {busy ? 'A entrar…' : 'Entrar'}
            </button>
          </form>

          <p className="mt-10 text-center text-[0.76rem] text-taupe">Sem acesso? Peça uma conta à administração do estúdio.</p>
        </div>
      </main>
    </div>
  )
}
