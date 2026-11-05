import { Link, createFileRoute } from '@tanstack/react-router'
import type React from 'react'
import { ArrowRight, ArrowUpRight, BellRing, CalendarDays, Camera, Globe, Inbox, MapPin, Megaphone, MessageCircle, Package } from 'lucide-react'
import { CURRENCY, addDays, amountShort, daysBetween, invoiceTotal, longDate, money, shortDate, todayIso, weekday } from '~/lib/format'
import { invoiceTone, leadStatusTone, postStatusTone } from '~/lib/tones'
import { ago, needsFollowUp } from '~/lib/leads'
import { fillTemplate, recipientFromLead, templatesOf, useSendMessage } from '~/lib/outreach'
import { PROJECT_PHASES, type Lead, type Project } from '~/lib/types'
import { useWorkspace } from '~/lib/workspace'
import { Avatar, Badge, Card, PaletteStrip, Progress, cx } from '~/components/ui'
import { EventCard } from '~/components/EventCard'
import { phaseDot } from '~/components/Sidebar'

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Início · Quennie' }] }),
  component: HomePage,
})

const greeting = () => {
  const h = new Date().getHours()
  return h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite'
}

// One orchestrated entrance for the top of the page; everything below the fold renders still.
const rise = (i: number) => ({ className: 'rise', style: { '--i': i } as React.CSSProperties })

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function HomePage() {
  const { projects, clients, invoices, appointments, products, inspirations, leads, posts } = useWorkspace()
  const today = todayIso()
  const monthAgo = addDays(today, -30)

  const active = projects.filter((p) => p.phase !== 'Concluído')
  const featured = [...active].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).find((p) => p.phase !== 'Conceito') ?? active[0]
  const issuedMonth = invoices.filter((i) => i.status !== 'Rascunho' && i.issueDate > monthAgo && i.issueDate <= today)
  const billedMonth = issuedMonth.reduce((s, i) => s + invoiceTotal(i), 0)
  const receivable = invoices.filter((i) => i.status === 'Enviada' || i.status === 'Em atraso').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const late = receivable.filter((i) => i.status === 'Em atraso')
  const upcoming = appointments.filter((a) => a.date >= today && a.date <= addDays(today, 7)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const todayCount = upcoming.filter((a) => a.date === today).length
  const deliveriesThisWeek = active.filter((p) => p.dueDate >= today && p.dueDate <= addDays(today, 7)).length
  const ordered = products.flatMap((p) => p.usage.filter((u) => u.status === 'Encomendado').map((u) => ({ product: p, usage: u })))
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name
  const activeBudget = active.reduce((s, p) => s + p.budget, 0)
  const activeSpent = active.reduce((s, p) => s + p.spent, 0)
  const freshLeads = leads.filter((l) => l.status === 'Novo')
  // New requests first, then the open ones whose follow-up date has come.
  const inbox = leads
    .filter((l) => l.status === 'Novo' || needsFollowUp(l, today))
    .sort((a, b) => Number(b.status === 'Novo') - Number(a.status === 'Novo') || b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 5)
  const followUps = leads.filter((l) => l.status !== 'Novo' && needsFollowUp(l, today)).length
  const weekPosts = posts
    .filter((p) => p.status === 'Agendado' && p.scheduledFor && p.scheduledFor >= today && p.scheduledFor <= addDays(today, 7))
    .sort((a, b) => (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? ''))
  const recentInspirations = [...inspirations].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, 6)

  // The day in one sentence: only what needs attention, nothing when all is calm.
  const brief = [
    freshLeads.length > 0 && plural(freshLeads.length, 'pedido novo por responder', 'pedidos novos por responder'),
    followUps > 0 && plural(followUps, 'pedido a relançar', 'pedidos a relançar'),
    todayCount > 0 && plural(todayCount, 'encontro hoje', 'encontros hoje'),
    deliveriesThisWeek > 0 && plural(deliveriesThisWeek, 'entrega esta semana', 'entregas esta semana'),
    late.length > 0 && plural(late.length, 'fatura em atraso', 'faturas em atraso'),
  ].filter(Boolean) as string[]

  const figures = [
    { label: 'Faturado em 30 dias', value: billedMonth, note: plural(issuedMonth.length, 'fatura emitida', 'faturas emitidas'), to: '/faturas' as const },
    { label: 'A receber', value: receivable.reduce((s, i) => s + invoiceTotal(i), 0), note: plural(receivable.length, 'fatura pendente', 'faturas pendentes'), to: '/faturas' as const },
    { label: 'Em atraso', value: late.reduce((s, i) => s + invoiceTotal(i), 0), note: late.length ? `Mais antiga venceu a ${shortDate(late[0].dueDate)}` : 'Tudo em dia', alert: late.length > 0, to: '/faturas' as const },
    { label: 'Orçamentos em curso', value: activeBudget, note: `${activeBudget ? Math.round((activeSpent / activeBudget) * 100) : 0}% já executado`, to: '/projetos' as const },
  ]

  const days = [...new Set(upcoming.map((a) => a.date))].slice(0, 3)

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <header {...rise(0)} className="rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.82rem] text-taupe first-letter:uppercase" suppressHydrationWarning>
            {weekday(today, 'long')}, {longDate(today)}
          </p>
          <h1 className="display mt-2 text-[2.7rem] sm:text-[3.6rem]" suppressHydrationWarning>
            {greeting()}, Quennie
          </h1>
          <p className="mt-3 max-w-xl text-[0.92rem] leading-relaxed text-nogueira/75">
            {brief.length ? `Tem ${brief.join(', ').replace(/, ([^,]*)$/, ' e $1')}.` : 'Nada urgente hoje. Bom momento para rever inspirações.'}
          </p>
        </div>
        <Link
          to="/inspiracoes"
          search={{ novo: true }}
          className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-nogueira pr-5 pl-4 text-[0.86rem] text-marfim shadow-[0_10px_24px_-12px_rgb(42_30_23/0.7)] transition hover:bg-[#3b2b21] active:scale-[0.98] sm:self-auto"
        >
          <Camera className="size-4" strokeWidth={1.7} />
          Guardar inspiração
        </Link>
      </header>

      {featured && (
        <section {...rise(1)} aria-label="Projeto em foco">
          <FeaturedProject project={featured} clientName={clientName(featured.clientId)} />
        </section>
      )}

      <section {...rise(2)} aria-label="Finanças">
        <Card className="grid grid-cols-2 overflow-hidden xl:grid-cols-4">
          {figures.map((f, i) => (
            <Link
              key={f.label}
              to={f.to}
              className={cx(
                'group relative flex flex-col px-4 py-5 transition-colors hover:bg-linho/30 sm:px-6 sm:py-6',
                i % 2 === 1 && 'border-l border-linha/80',
                i >= 2 && 'border-t border-linha/80 xl:border-t-0',
                i === 2 && 'xl:border-l',
              )}
            >
              <span className="flex items-start justify-between gap-2 text-[0.76rem] text-taupe">
                {f.label}
                <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
              </span>
              <span className={cx('mt-3 flex items-baseline gap-1.5', f.alert && 'text-[#9b3424]')}>
                <span className="display tabular text-[2rem] sm:text-[2.6rem]">{amountShort(f.value)}</span>
                <span className="text-[0.72rem] text-taupe">{CURRENCY}</span>
              </span>
              <span className={cx('mt-1 text-[0.74rem]', f.alert ? 'text-[#9b3424]' : 'text-taupe')}>{f.note}</span>
            </Link>
          ))}
        </Card>
      </section>

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-labelledby="leads-title">
          <SectionTitle id="leads-title" title="Pedidos a responder" to="/pedidos" link="Todos os pedidos" />
          <Card className="divide-y divide-linha/70 px-4 sm:px-5">
            {inbox.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-8 text-[0.86rem] text-taupe">
                <Inbox className="size-4" /> Todos os pedidos respondidos.
              </p>
            ) : (
              inbox.map((lead) => <LeadRow key={lead.id} lead={lead} />)
            )}
          </Card>
        </section>

        <section aria-labelledby="posts-title">
          <SectionTitle id="posts-title" title="Redes esta semana" to="/marketing" link="Marketing" />
          <Card className="p-4 sm:p-5">
            {weekPosts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-5 text-center">
                <Megaphone className="size-5 text-taupe" strokeWidth={1.6} />
                <p className="max-w-xs text-[0.86rem] text-taupe">Nada agendado. Uma foto de obra ou um antes e depois mantém o Instagram vivo.</p>
                <Link to="/marketing" search={{ tab: 'redes' }} className="text-[0.82rem] text-cognac-deep underline decoration-linha underline-offset-4">
                  Preparar uma publicação
                </Link>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
                {weekPosts.slice(0, 4).map((post) => (
                  <li key={post.id}>
                    <Link to="/marketing" search={{ tab: 'redes' }} className="group block">
                      <span className="relative block aspect-square overflow-hidden rounded-xl bg-linho">
                        {post.images[0] && <img src={post.images[0]} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
                        <Badge tone={postStatusTone[post.status]} className="absolute top-2 left-2 bg-white/90">
                          {post.scheduledFor === today ? 'Hoje' : weekday(post.scheduledFor ?? today)}
                        </Badge>
                      </span>
                      <span className="mt-1.5 block truncate text-[0.8rem]">{post.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <section aria-labelledby="pipeline-title">
        <SectionTitle id="pipeline-title" title="Estúdio por fase" to="/projetos" link="Todos os projetos" />
        <PhaseBoard projects={projects} clientName={clientName} />
      </section>

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-labelledby="agenda-title">
          <SectionTitle id="agenda-title" title="Próximos dias" to="/agenda" link="Agenda" />
          <Card className="p-4 sm:p-5">
            {days.length === 0 ? (
              <p className="py-8 text-center text-[0.86rem] text-taupe">Sem encontros nos próximos 7 dias.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {days.map((d) => (
                  <div key={d} className="grid grid-cols-1 gap-3 sm:grid-cols-[4.5rem_1fr]">
                    <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
                      <span className={cx('text-[0.72rem] capitalize', d === today ? 'text-cognac' : 'text-taupe')}>{d === today ? 'Hoje' : weekday(d)}</span>
                      <span className="display text-[1.9rem] leading-none">{Number(d.slice(8))}</span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {upcoming
                        .filter((a) => a.date === d)
                        .map((a) => (
                          <li key={a.id}>
                            <Link to="/agenda" className="block">
                              <EventCard appointment={a} clientName={clientName(a.clientId)} />
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section aria-labelledby="moodboard-title">
          <SectionTitle id="moodboard-title" title="Inspirações recentes" to="/inspiracoes" link="Abrir moodboard" />
          {recentInspirations.length === 0 ? (
            <Card className="py-10 text-center text-[0.86rem] text-taupe">Ainda não guardou nenhuma inspiração.</Card>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:gap-3">
              {recentInspirations.map((item, i) => (
                <li key={item.id} className={cx(i === 0 && 'col-span-2 row-span-2')}>
                  <Link to="/inspiracoes" search={{ id: item.id }} className="group relative block h-full overflow-hidden rounded-[1.1rem] bg-linho">
                    <img src={item.image} alt={item.title} loading="lazy" className={cx('size-full object-cover transition-transform duration-700 ease-[var(--ease-drape)] group-hover:scale-[1.04]', i === 0 ? 'aspect-square' : 'aspect-square')} />
                    {i === 0 && (
                      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-nogueira/80 via-nogueira/30 to-transparent p-3.5 pt-12 text-marfim sm:p-4">
                        <span className="text-[0.9rem] leading-snug">{item.title}</span>
                        <PaletteStrip colors={item.palette} className="w-24 ring-white/20" />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <section aria-labelledby="invoices-title">
          <SectionTitle id="invoices-title" title="Faturas a acompanhar" to="/faturas" link="Faturação" />
          <Card className="divide-y divide-linha/70 px-4 sm:px-5">
            {receivable.length === 0 && <p className="py-8 text-center text-[0.86rem] text-taupe">Nada por receber.</p>}
            {receivable.map((inv) => {
              const d = daysBetween(today, inv.dueDate)
              return (
                <Link key={inv.id} to="/faturas" search={{ id: inv.id }} className="flex items-center gap-3 py-3.5">
                  <Avatar name={clientName(inv.clientId) ?? '?'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem]">{clientName(inv.clientId)}</p>
                    <p className="text-[0.74rem] text-taupe">
                      {inv.number}, {d < 0 ? `venceu há ${-d} dias` : d === 0 ? 'vence hoje' : `vence em ${d} dias`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular text-[0.86rem] whitespace-nowrap">{money(invoiceTotal(inv))}</span>
                    <Badge tone={invoiceTone[inv.status]}>{inv.status}</Badge>
                  </div>
                </Link>
              )
            })}
          </Card>
        </section>

        <section aria-labelledby="orders-title">
          <SectionTitle id="orders-title" title="Encomendas em curso" to="/biblioteca" link="Biblioteca" />
          <Card className="divide-y divide-linha/70 px-4 sm:px-5">
            {ordered.length === 0 && (
              <p className="flex items-center justify-center gap-2 py-8 text-[0.86rem] text-taupe">
                <Package className="size-4" /> Sem encomendas pendentes.
              </p>
            )}
            {ordered.map(({ product, usage }, i) => (
              <Link key={`${product.id}-${i}`} to="/biblioteca" search={{ id: product.id }} className="flex items-center gap-3 py-3">
                <img src={product.image} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.88rem]">{product.name}</p>
                  <p className="truncate text-[0.74rem] text-taupe">
                    {projects.find((p) => p.id === usage.projectId)?.name}, {usage.room}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-[0.84rem]">
                    {usage.quantity} {product.unit}
                  </p>
                  <p className="text-[0.72rem] text-taupe">{product.leadTime}</p>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </div>
  )
}

/** The project closest to delivery: photo, where it stands in the six phases, and what comes next. */
function FeaturedProject({ project, clientName }: { project: Project; clientName?: string }) {
  const { appointments } = useWorkspace()
  const today = todayIso()
  const phaseIndex = PROJECT_PHASES.indexOf(project.phase)
  const daysLeft = daysBetween(today, project.dueDate)
  const spentPct = project.budget ? Math.round((project.spent / project.budget) * 100) : 0
  const next = appointments.filter((a) => a.projectId === project.id && a.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]

  return (
    <Card className="grid grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Link to="/projetos" search={{ id: project.id }} className="group relative block aspect-[16/10] overflow-hidden bg-linho md:aspect-[16/8] xl:aspect-auto xl:min-h-[24rem]">
        <img src={project.cover} alt={project.name} className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-drape)] group-hover:scale-[1.03]" />
        <span className="absolute top-4 left-4 rounded-full bg-marfim/90 px-3 py-1 text-[0.74rem] backdrop-blur">
          {daysLeft > 0 ? `Entrega em ${daysLeft} dias` : daysLeft === 0 ? 'Entrega hoje' : `${-daysLeft} dias em atraso`}
        </span>
      </Link>

      <div className="flex flex-col p-5 sm:p-7 xl:p-8">
        <p className="text-[0.78rem] text-taupe">Próxima entrega</p>
        <h2 className="display mt-1.5 text-[2.2rem] leading-[1.02] sm:text-[2.7rem]">{project.name}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-[0.82rem] text-taupe">
          <MapPin className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            {clientName}, {project.location}
          </span>
        </p>

        {/* Six phases as a measuring rule: done, current, still ahead. */}
        <ol className="mt-6 grid grid-cols-6 gap-1" aria-label={`Fase atual: ${project.phase}`}>
          {PROJECT_PHASES.map((ph, i) => (
            <li key={ph} className="flex min-w-0 flex-col gap-2">
              <span className={cx('h-[3px] rounded-full', i < phaseIndex ? 'bg-palma' : i === phaseIndex ? 'bg-cognac' : 'bg-linho-deep')} />
              <span className={cx('truncate text-[0.64rem]', i === phaseIndex ? 'text-nogueira' : 'text-taupe/80', i !== phaseIndex && 'hidden sm:block')}>{ph}</span>
            </li>
          ))}
        </ol>

        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-linha pt-5">
          <div>
            <dt className="text-[0.72rem] text-taupe">Progresso</dt>
            <dd className="display tabular mt-1 text-[1.55rem] min-[380px]:text-[1.9rem]">{project.progress}%</dd>
          </div>
          <div>
            <dt className="text-[0.72rem] text-taupe">Orçamento usado</dt>
            <dd className={cx('display tabular mt-1 text-[1.55rem] min-[380px]:text-[1.9rem]', spentPct > 100 && 'text-[#9b3424]')}>{spentPct}%</dd>
          </div>
          <div>
            <dt className="text-[0.72rem] text-taupe">Orçamento</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-1">
              <span className="display tabular text-[1.55rem] min-[380px]:text-[1.9rem]">{amountShort(project.budget)}</span>
              <span className="text-[0.66rem] text-taupe">{CURRENCY}</span>
            </dd>
          </div>
        </dl>
        <div className="mt-3">
          <Progress value={project.progress} />
        </div>

        <div className="mt-auto pt-6">
          {next ? (
            <Link to="/agenda" className="flex items-center gap-3 rounded-2xl bg-[#f4ead9]/70 px-4 py-3 transition hover:bg-[#f4ead9]">
              <CalendarDays className="size-4 shrink-0 text-cognac" strokeWidth={1.6} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.86rem]">{next.title}</span>
                <span className="block text-[0.74rem] text-taupe first-letter:uppercase">
                  {next.date === today ? 'Hoje' : weekday(next.date, 'long')}, {shortDate(next.date)} às {next.start}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-taupe" />
            </Link>
          ) : (
            <Link to="/projetos" search={{ id: project.id }} className="group inline-flex items-center gap-1.5 text-[0.84rem] text-nogueira/80 hover:text-nogueira">
              Abrir projeto <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}

/** Active projects laid out across the studio's phases, so bottlenecks are visible at a glance. */
function PhaseBoard({ projects, clientName }: { projects: Project[]; clientName: (id?: string) => string | undefined }) {
  const phases = PROJECT_PHASES.filter((p) => p !== 'Concluído')
  const done = projects.filter((p) => p.phase === 'Concluído').length

  return (
    <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ol className="grid min-w-[56rem] grid-cols-5 gap-3 xl:min-w-0">
        {phases.map((phase) => {
          const items = projects.filter((p) => p.phase === phase)
          return (
            <li key={phase} className="flex flex-col rounded-[1.25rem] bg-linho/45 p-2 ring-1 ring-linha/60">
              <div className="flex items-center gap-2 px-2 pt-1 pb-2.5">
                <span className={cx('size-1.5 rounded-full', phaseDot[phase] ?? 'bg-taupe')} />
                <span className="text-[0.8rem]">{phase}</span>
                <span className="tabular ml-auto text-[0.72rem] text-taupe">{items.length}</span>
              </div>
              <ul className="flex flex-1 flex-col gap-2">
                {items.length === 0 && <li className="grid flex-1 place-items-center rounded-xl border border-dashed border-linha py-6 text-[0.74rem] text-taupe">Sem projetos</li>}
                {items.map((p) => (
                  <li key={p.id}>
                    <Link to="/projetos" search={{ id: p.id }} className="group block rounded-xl bg-white p-2 shadow-[0_1px_2px_rgb(42_30_23/0.05)] ring-1 ring-linha/70 transition hover:ring-taupe/40">
                      <span className="block aspect-[16/9] overflow-hidden rounded-lg bg-linho">
                        <img src={p.cover} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-[var(--ease-drape)] group-hover:scale-[1.04]" />
                      </span>
                      <span className="mt-2 block truncate px-0.5 text-[0.84rem]">{p.name}</span>
                      <span className="block truncate px-0.5 text-[0.7rem] text-taupe">{clientName(p.clientId)}</span>
                      <span className="mt-2 flex items-center gap-2 px-0.5">
                        <span className="flex-1">
                          <Progress value={p.progress} />
                        </span>
                        <span className="tabular text-[0.7rem] text-taupe">{p.progress}%</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ol>
      {done > 0 && (
        <p className="mt-3 text-right text-[0.76rem] text-taupe">
          <Link to="/projetos" className="hover:text-nogueira">
            {plural(done, 'projeto concluído', 'projetos concluídos')}
          </Link>
        </p>
      )}
    </div>
  )
}

/** A request waiting for an answer, with the suggested reply one tap away. */
function LeadRow({ lead }: { lead: Lead }) {
  const workspace = useWorkspace()
  const send = useSendMessage()
  const template = templatesOf(workspace).find((t) => t.purpose === (lead.status === 'Novo' ? 'Resposta a pedido' : 'Relance'))
  const recipient = recipientFromLead(lead, workspace.projects)
  return (
    <div className="flex items-center gap-3 py-3">
      <Link to="/pedidos" search={{ id: lead.id }} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={lead.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[0.88rem]">
            <span className="truncate">{lead.name}</span>
            {lead.source === 'Site' && <Globe className="size-3 shrink-0 text-taupe" />}
          </span>
          {lead.status === 'Novo' ? (
            <span className="block truncate text-[0.74rem] text-taupe">
              {lead.services.join(', ') || lead.space || 'Pedido'} · {ago(lead.receivedAt)}
            </span>
          ) : (
            <span className="flex items-center gap-1 truncate text-[0.74rem] text-[#9b3424]">
              <BellRing className="size-3 shrink-0" /> Relançar · {lead.status.toLowerCase()}
            </span>
          )}
        </span>
        <Badge tone={leadStatusTone[lead.status]} className="hidden sm:inline-flex">
          {lead.status}
        </Badge>
      </Link>
      {lead.phone && template && (
        <button
          onClick={() => send(recipient, 'WhatsApp', fillTemplate(template.body, recipient), { templateId: template.id })}
          aria-label={`Responder a ${lead.name} no WhatsApp`}
          title="Responder no WhatsApp"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-palma text-marfim transition hover:brightness-95"
        >
          <MessageCircle className="size-4" />
        </button>
      )}
    </div>
  )
}

function SectionTitle({ id, title, to, link }: { id: string; title: string; to: '/agenda' | '/projetos' | '/faturas' | '/biblioteca' | '/inspiracoes' | '/pedidos' | '/marketing'; link: string }) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-4 px-1">
      <h2 id={id} className="display text-[1.65rem] sm:text-[1.8rem]">
        {title}
      </h2>
      <Link to={to} className="group flex shrink-0 items-center gap-1 text-[0.8rem] text-taupe hover:text-nogueira">
        {link}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
