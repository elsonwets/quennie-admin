import { useEffect, type ReactNode } from 'react'
import { HeadContent, Link, Outlet, Scripts, createRootRoute, redirect, useRouterState } from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { Sidebar } from '~/components/Sidebar'
import { Dock, MobileBar } from '~/components/MobileNav'
import { ToastProvider } from '~/lib/workspace'
import { getWorkspace } from '~/server/workspace'
import { getCurrentUser } from '~/server/auth'
import { LOGIN_PATH, forgetUser, isSessionError, rememberUser, rememberedUser } from '~/lib/session'
import type { Workspace } from '~/lib/types'

const EMPTY: Workspace = { clients: [], projects: [], products: [], invoices: [], appointments: [], inspirations: [], leads: [], templates: [], outreach: [], posts: [] }

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Quennie · Backoffice' },
      { name: 'robots', content: 'noindex' },
      { name: 'theme-color', content: '#faf7f2' },
      { name: 'application-name', content: 'Quennie' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Quennie' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'format-detection', content: 'telephone=no' },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  // Every page except the login screen needs a signed-in user.
  beforeLoad: async ({ location }) => {
    const user = rememberedUser() ?? (await getCurrentUser())
    rememberUser(user)
    const onLogin = location.pathname === LOGIN_PATH
    if (!user && !onLogin) throw redirect({ to: LOGIN_PATH, search: location.pathname === '/' ? {} : { voltar: location.href } })
    if (user && onLogin) throw redirect({ to: '/' })
    return { user }
  },
  loader: ({ context }) => (context.user ? getWorkspace() : EMPTY),
  errorComponent: RootError,
  component: RootComponent,
})

function RootComponent() {
  // Only in production: a dev-mode service worker would serve stale modules over HMR.
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')
  }, [])

  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (pathname === LOGIN_PATH) {
    return (
      <RootDocument>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </RootDocument>
    )
  }

  return (
    <RootDocument>
      <ToastProvider>
        <div className="flex min-h-dvh bg-marfim">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <MobileBar />
            <main className="mx-auto max-w-[1680px] px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8 lg:px-10 lg:pt-10 lg:pb-16">
              <Outlet />
            </main>
          </div>
        </div>
        <Dock />
      </ToastProvider>
    </RootDocument>
  )
}

/** A session that expired mid-use surfaces here: send her back to the login screen. */
function RootError({ error, reset }: { error: unknown; reset: () => void }) {
  const expired = isSessionError(error)
  return (
    <RootDocument>
      <div className="grid min-h-dvh place-items-center bg-marfim px-6 text-center">
        <div className="max-w-sm">
          <p className="display text-[2.2rem]">{expired ? 'Sessão terminada' : 'Algo correu mal'}</p>
          <p className="mt-2 text-[0.9rem] text-taupe">{expired ? 'Por segurança, entre de novo para continuar.' : error instanceof Error ? error.message : 'Erro desconhecido.'}</p>
          {expired ? (
            <Link to={LOGIN_PATH} onClick={forgetUser} className="mt-6 inline-flex h-11 items-center rounded-full bg-nogueira px-6 text-[0.88rem] text-marfim">
              Entrar
            </Link>
          ) : (
            <button onClick={reset} className="mt-6 inline-flex h-11 items-center rounded-full bg-nogueira px-6 text-[0.88rem] text-marfim">
              Tentar outra vez
            </button>
          )}
        </div>
      </div>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
