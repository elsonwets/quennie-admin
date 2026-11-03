import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { CalendarDays, FolderOpen, Home, Lamp, LogOut, Palette, ReceiptText, Users } from 'lucide-react'
import { useWorkspace } from '~/lib/workspace'
import { useSignOut } from '~/lib/useSignOut'
import { Avatar, cx } from './ui'

const nav = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/projetos', label: 'Projetos', icon: FolderOpen },
  { to: '/inspiracoes', label: 'Inspirações', icon: Palette },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/biblioteca', label: 'Biblioteca', icon: Lamp },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/faturas', label: 'Faturas', icon: ReceiptText },
] as const

export const phaseDot: Record<string, string> = {
  Conceito: 'bg-[#c7b089]',
  'Projeto 3D': 'bg-cognac',
  Encomendas: 'bg-[#b98f78]',
  Obra: 'bg-palma',
  Entrega: 'bg-[#6f8a6a]',
}

export function Wordmark({ centered }: { centered?: boolean }) {
  return (
    // Same typographic wordmark as the public site header.
    <span className={cx('flex flex-col leading-none', centered && 'items-center text-center')}>
      <span className="font-display text-[2rem] leading-[0.9] font-light tracking-tight">Quennie</span>
      <span className="mt-1 text-[0.58rem] leading-[1.5] font-normal tracking-[0.13em]">Home Concept &amp; Interior Design</span>
    </span>
  )
}

/** Logo and profile stay put; only the navigation between them scrolls on short screens. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { projects, clients } = useWorkspace()
  const signOut = useSignOut()
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Wheel over the rail scrolls only its middle section, never the page behind it.
  useEffect(() => {
    const root = rootRef.current
    const list = scrollRef.current
    if (!root || !list) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      list.scrollTop += e.deltaY
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [])
  const active = projects.filter((p) => p.phase !== 'Concluído' && p.phase !== 'Conceito').slice(0, 4)

  return (
    <div ref={rootRef} className="flex h-full flex-col">
      <div className="flex shrink-0 justify-center px-4 pt-7 pb-6">
        <Link to="/" onClick={onNavigate} aria-label="Início">
          <Wordmark centered />
        </Link>
      </div>

      <div ref={scrollRef} className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        <nav aria-label="Principal">
          <p className="mb-2 px-3 text-[0.72rem] text-taupe">Estúdio</p>
          <ul className="flex flex-col gap-0.5">
            {nav.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onNavigate}
                  activeOptions={{ exact: to === '/', includeSearch: false }}
                  className="group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[0.88rem] text-nogueira/75 transition-colors hover:text-nogueira"
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          transition={{ type: 'spring', bounce: 0.12, duration: 0.5 }}
                          className="absolute inset-0 rounded-xl bg-white shadow-[0_1px_3px_rgb(42_30_23/0.08)]"
                        />
                      )}
                      <Icon className={cx('relative size-[1.1rem]', isActive ? 'text-nogueira' : 'text-taupe group-hover:text-nogueira')} strokeWidth={1.6} />
                      <span className={cx('relative', isActive && 'text-nogueira')}>{label}</span>
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="mt-8 pb-4">
          <div className="mb-2 flex items-center justify-between px-3 text-[0.72rem] text-taupe">
            <span>Projetos ativos</span>
            <span className="tabular">{active.length}</span>
          </div>
          <ul className="flex flex-col">
            {active.map((p) => (
              <li key={p.id}>
                <Link to="/projetos" search={{ id: p.id }} onClick={onNavigate} className="flex gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/70">
                  <span className={cx('mt-1.5 size-1.5 shrink-0 rounded-full', phaseDot[p.phase] ?? 'bg-taupe')} />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.84rem]">{p.name}</span>
                    <span className="block text-[0.72rem] text-taupe">
                      {p.phase} · {clients.find((c) => c.id === p.clientId)?.city}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mx-4 flex shrink-0 items-center gap-3 border-t border-linha py-4">
        <Avatar name="Quennie Melissa" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.86rem]">Quennie Melissa</p>
          <p className="truncate text-[0.72rem] text-taupe">Quennie Interior Design</p>
        </div>
        <button
          onClick={signOut}
          aria-label="Terminar sessão"
          title="Terminar sessão"
          className="grid size-8 place-items-center rounded-full text-taupe hover:bg-white hover:text-[#a23b2a]"
        >
          <LogOut className="size-4" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <>
      {/* Keeps the content clear of the fixed rail. */}
      <div aria-hidden="true" className="hidden w-[17rem] shrink-0 lg:block" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] border-r border-linha/70 bg-[#f6f2ec] lg:block">
        <SidebarContent />
      </aside>
    </>
  )
}
