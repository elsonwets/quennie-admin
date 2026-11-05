import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, FolderOpen, Home, Inbox, Lamp, LayoutGrid, LogOut, Megaphone, Palette, ReceiptText, Users } from 'lucide-react'
import { useWorkspace } from '~/lib/workspace'
import { useSignOut } from '~/lib/useSignOut'
import { Wordmark } from './Sidebar'
import { InstallApp } from './InstallApp'
import { Avatar, cx } from './ui'

const dock = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/pedidos', label: 'Pedidos', icon: Inbox },
  { to: '/projetos', label: 'Projetos', icon: FolderOpen },
  { to: '/inspiracoes', label: 'Inspirações', icon: Palette },
] as const

const more = [
  { to: '/agenda', label: 'Agenda', text: 'Encontros e visitas', icon: CalendarDays },
  { to: '/marketing', label: 'Marketing', text: 'Campanhas e redes', icon: Megaphone },
  { to: '/clientes', label: 'Clientes', text: 'Contactos e histórico', icon: Users },
  { to: '/biblioteca', label: 'Biblioteca', text: 'Produtos e materiais', icon: Lamp },
  { to: '/faturas', label: 'Faturas', text: 'Faturação e pagamentos', icon: ReceiptText },
] as const

/** Phone header: just the wordmark, clear of the notch when installed as an app. */
export function MobileBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-linha/60 bg-marfim/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center justify-center">
        <Link to="/" aria-label="Início">
          <Wordmark centered />
        </Link>
      </div>
    </header>
  )
}

/** App-style bottom dock for phones and tablets; the sidebar takes over from lg. */
export function Dock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { leads } = useWorkspace()
  const fresh = leads.filter((l) => l.status === 'Novo').length
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = more.some((m) => pathname.startsWith(m.to))

  return (
    <>
      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="flex w-full max-w-md items-stretch justify-between rounded-[1.75rem] bg-nogueira/92 p-1.5 shadow-[0_18px_40px_-14px_rgb(42_30_23/0.6)] ring-1 ring-white/10 backdrop-blur-xl">
          {dock.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <li key={to} className="flex-1">
                <Link to={to} onClick={() => setMoreOpen(false)} aria-current={active ? 'page' : undefined} className="relative flex h-14 flex-col items-center justify-center gap-1 rounded-[1.35rem] active:scale-95">
                  <DockItem active={active && !moreOpen} icon={<Icon className="size-[1.2rem]" strokeWidth={1.6} />} label={label} />
                  {to === '/pedidos' && fresh > 0 && <span className="tabular absolute top-1.5 right-[calc(50%-1.1rem)] grid h-4 min-w-4 place-items-center rounded-full bg-cognac px-1 text-[0.6rem] text-marfim">{fresh}</span>}
                </Link>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className="relative flex h-14 w-full flex-col items-center justify-center gap-1 rounded-[1.35rem] active:scale-95"
            >
              <DockItem active={moreOpen || moreActive} icon={<LayoutGrid className="size-[1.2rem]" strokeWidth={1.6} />} label="Mais" />
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}

function DockItem({ active, icon, label }: { active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <>
      {active && (
        <motion.span
          layoutId="dock-active"
          transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
          className="absolute inset-0 rounded-[1.35rem] bg-marfim/12 ring-1 ring-marfim/10"
        />
      )}
      <span className={cx('relative transition-colors', active ? 'text-marfim' : 'text-marfim/55')}>{icon}</span>
      <span className={cx('relative text-[0.64rem] tracking-wide transition-colors', active ? 'text-marfim' : 'text-marfim/55')}>{label}</span>
    </>
  )
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const signOut = useSignOut()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-20 bg-nogueira/30 backdrop-blur-[3px] lg:hidden"
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.65, 0, 0.18, 1] }}
            // Never taller than what the browser leaves visible above the dock (dvh follows its bars).
            className="fixed inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.5rem)] z-20 mx-auto max-h-[calc(100dvh-max(0.75rem,env(safe-area-inset-bottom))-7rem)] max-w-md overflow-y-auto overscroll-contain rounded-[1.75rem] bg-marfim p-3 shadow-2xl ring-1 ring-linha lg:hidden"
          >
            <div className="grid grid-cols-3 gap-2">
              {more.map(({ to, label, text, icon: Icon }) => (
                <Link key={to} to={to} onClick={onClose} className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-linha/80 active:scale-[0.98]" activeProps={{ className: 'ring-cognac/50' }}>
                  <span className="grid size-9 place-items-center rounded-xl bg-[#f4ead9] text-cognac-deep">
                    <Icon className="size-[1.1rem]" strokeWidth={1.6} />
                  </span>
                  <span className="mt-3 block truncate text-[0.88rem]">{label}</span>
                  <span className="line-clamp-2 block text-[0.68rem] leading-snug text-taupe">{text}</span>
                </Link>
              ))}
            </div>

            <InstallApp className="mt-2 w-full" onDone={onClose} />

            <div className="mt-3 flex items-center gap-3 border-t border-linha px-2 pt-3">
              <Avatar name="Quennie Melissa" size="sm" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[0.84rem]">Quennie Melissa</p>
                <p className="truncate text-[0.7rem] text-taupe">Quennie Interior Design</p>
              </div>
              <button
                onClick={() => {
                  onClose()
                  signOut()
                }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.78rem] text-[#a23b2a] ring-1 ring-[#efd3cc]"
              >
                <LogOut className="size-3.5" /> Sair
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
