import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CalendarDays, Check, FolderOpen, Lock, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { daysBetween, money, projectFee, shortDate, todayIso } from '~/lib/format'
import { validateIdSearch } from '~/lib/search'
import { KICKOFF_STEPS, PROJECT_PHASES, type Project, type ProjectPhase } from '~/lib/types'
import { useMutations, useWorkspace } from '~/lib/workspace'
import { Badge, Button, ConfirmDelete, DetailPanel, EmptyState, IconButton, PageHeader, PaletteStrip, Progress, Spec, Tabs, cx } from '~/components/ui'
import { ProjectForm } from '~/components/ProjectForm'
import { phaseTone } from '~/lib/tones'

export const Route = createFileRoute('/projetos')({
  validateSearch: validateIdSearch,
  head: () => ({ meta: [{ title: 'Projetos · Quennie' }] }),
  component: ProjectsPage,
})

function ProjectsPage() {
  const { projects, clients } = useWorkspace()
  const { save, remove } = useMutations()
  const { id } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [phase, setPhase] = useState<'active' | 'all' | ProjectPhase>('active')
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  const visible = projects.filter((p) => (phase === 'all' ? true : phase === 'active' ? p.phase !== 'Concluído' : p.phase === phase))
  const selected = projects.find((p) => p.id === id) ?? visible[0]
  const select = (projectId?: string) => navigate({ search: projectId ? { id: projectId } : {}, replace: true, resetScroll: false })
  const activeCount = projects.filter((p) => p.phase !== 'Concluído').length
  const pipeline = projects.filter((p) => p.phase !== 'Concluído').reduce((sum, p) => sum + p.budget, 0)

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Projetos"
        subtitle={`${activeCount} projetos em curso, ${money(pipeline)} em orçamentos ativos`}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Novo projeto
          </Button>
        }
      />

      <Tabs
        value={phase}
        onChange={setPhase}
        items={[
          { value: 'active', label: 'Em curso', count: activeCount },
          ...PROJECT_PHASES.map((ph) => ({ value: ph, label: ph, count: projects.filter((p) => p.phase === ph).length })),
          { value: 'all', label: 'Todos', count: projects.length },
        ]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {visible.length === 0 ? (
          <EmptyState icon={<FolderOpen className="size-5" />} title="Nenhum projeto" text="Não há projetos nesta fase." action={<Button onClick={() => setEditing('new')}>Novo projeto</Button>} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {visible.map((project, index) => {
                const client = clients.find((c) => c.id === project.clientId)
                const active = selected?.id === project.id
                const daysLeft = daysBetween(todayIso(), project.dueDate)
                return (
                  <motion.li key={project.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.04 } }} exit={{ opacity: 0 }}>
                    <button
                      onClick={() => select(project.id)}
                      aria-pressed={active}
                      className={cx('group block w-full rounded-[1.4rem] p-1.5 text-left transition-all', active ? 'bg-white shadow-card ring-1 ring-linha' : 'hover:bg-white/70')}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.1rem] bg-linho">
                        <img src={project.cover} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-[var(--ease-drape)] group-hover:scale-[1.04]" />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-nogueira/45 to-transparent" />
                        <Badge tone={phaseTone[project.phase]} className="absolute top-3 left-3 bg-white/90 backdrop-blur">
                          {project.phase}
                        </Badge>
                        <span className="tabular absolute right-3 bottom-3 text-[0.78rem] text-white/95">{project.progress}%</span>
                      </div>
                      <div className="px-2 pt-3.5 pb-2">
                        <p className="display text-[1.35rem]">{project.name}</p>
                        <p className="mt-1 truncate text-[0.78rem] text-taupe">
                          {client?.name} · {project.location}
                        </p>
                        <div className="mt-3">
                          <Progress value={project.progress} />
                        </div>
                        <div className="mt-2.5 flex justify-between text-[0.76rem] text-taupe">
                          <span className="tabular">{money(project.budget)}</span>
                          <span>{project.phase === 'Concluído' ? `Entregue ${shortDate(project.dueDate)}` : daysLeft >= 0 ? `${daysLeft} dias até à entrega` : `${-daysLeft} dias em atraso`}</span>
                        </div>
                      </div>
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}

        <DetailPanel open={Boolean(id)} onClose={() => select(undefined)}>
          {selected && (
            <ProjectDetail
              project={selected}
              onEdit={() => setEditing(selected)}
              onDelete={() => setDeleting(selected)}
              onAdvance={() => {
                const next = PROJECT_PHASES[PROJECT_PHASES.indexOf(selected.phase) + 1]
                if (next) save('projects', { ...selected, phase: next, progress: next === 'Concluído' ? 100 : selected.progress }, `Projeto avançou para ${next}`)
              }}
            />
          )}
        </DetailPanel>
      </div>

      <ProjectForm
        project={editing}
        onClose={() => setEditing(null)}
        onSaved={(projectId) => {
          setEditing(null)
          select(projectId)
        }}
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        what={deleting?.name ?? 'O projeto'}
        onConfirm={() => {
          if (!deleting) return
          remove('projects', deleting.id, 'Projeto eliminado')
          select(undefined)
        }}
      />
    </div>
  )
}

function ProjectDetail({ project, onEdit, onDelete, onAdvance }: { project: Project; onEdit: () => void; onDelete: () => void; onAdvance: () => void }) {
  const { clients, products, appointments, invoices, inspirations } = useWorkspace()
  const moodboard = inspirations.filter((i) => i.projectId === project.id)
  const client = clients.find((c) => c.id === project.clientId)
  const phaseIndex = PROJECT_PHASES.indexOf(project.phase)
  const items = products.flatMap((p) => p.usage.filter((u) => u.projectId === project.id).map((u) => ({ product: p, usage: u })))
  const next = appointments.filter((a) => a.projectId === project.id && a.date >= todayIso()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
  const billed = invoices.filter((i) => i.projectId === project.id && i.status !== 'Rascunho').reduce((s, i) => s + i.lines.reduce((t, l) => t + l.quantity * l.unitPrice, 0), 0)
  const spentPct = project.budget ? Math.round((project.spent / project.budget) * 100) : 0
  const fee = projectFee(project)
  const kickoffDone = KICKOFF_STEPS.filter((k) => project.kickoff?.includes(k))
  const kickoffNext = KICKOFF_STEPS.find((k) => !project.kickoff?.includes(k))
  const property = [project.propertyType, project.area ? `${project.area} m²` : undefined, project.condition].filter(Boolean).join(', ')
  const tags = [project.type, ...(project.services ?? [])].filter(Boolean) as string[]

  return (
    <motion.div key={project.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.1rem] bg-linho">
        <img src={project.cover} alt={project.name} className="size-full object-cover" />
      </div>
      <div className="px-1.5 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="display text-[1.75rem] leading-tight">{project.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-[0.8rem] text-taupe">
              <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{project.location}</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5 pt-1 pr-8 xl:pr-0">
            <IconButton label="Editar projeto" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </IconButton>
            <IconButton label="Eliminar projeto" onClick={onDelete} className="hover:text-[#a23b2a]">
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <span key={t} className={cx('rounded-md px-2 py-0.5 text-[0.72rem]', i === 0 ? 'bg-nogueira text-marfim' : 'bg-[#f4ead9] text-cognac-deep')}>
                {t}
              </span>
            ))}
            {project.priority && project.priority !== 'Normal' && <Badge tone={project.priority === 'Urgente' ? 'red' : 'amber'}>Prioridade {project.priority.toLowerCase()}</Badge>}
          </div>
        )}

        {project.description && <p className="mt-3 text-[0.84rem] leading-relaxed text-nogueira/80">{project.description}</p>}

        {project.hardDeadline !== undefined && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#f8e3dd]/60 px-3 py-2 text-[0.8rem] text-[#9b3424]">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <span>Entrega fixa a {shortDate(project.dueDate)}{project.hardDeadline ? `: ${project.hardDeadline}` : ''}</span>
          </p>
        )}

        <ol className="mt-5 grid grid-cols-6 gap-1" aria-label="Fases do projeto">
          {PROJECT_PHASES.map((ph, i) => (
            <li key={ph} title={ph} className="flex flex-col gap-1.5">
              <span className={cx('h-1 rounded-full', i < phaseIndex ? 'bg-palma' : i === phaseIndex ? 'bg-cognac' : 'bg-linho')} />
              <span className={cx('truncate text-[0.62rem]', i === phaseIndex ? 'text-nogueira' : 'text-taupe/80')}>{ph}</span>
            </li>
          ))}
        </ol>

        <dl className="mt-4 border-t border-linha pt-3">
          <Spec label="Cliente">
            {client ? (
              <Link to="/clientes" search={{ id: client.id }} className="underline decoration-linha underline-offset-4 hover:decoration-cognac">
                {client.name}
              </Link>
            ) : (
              '—'
            )}
          </Spec>
          <Spec label="Orçamento">
            <span className="tabular">{money(project.budget)}</span>
          </Spec>
          <Spec label="Executado">
            <span className="tabular">
              {money(project.spent)} <span className="text-taupe">({spentPct}%)</span>
            </span>
          </Spec>
          <Spec label="Faturado">
            <span className="tabular">{money(billed)}</span>
          </Spec>
          {fee !== undefined && (
            <Spec label="Honorários">
              <span className="tabular">{money(fee)}</span>
            </Spec>
          )}
          <Spec label="Calendário">
            {shortDate(project.startDate)} → {shortDate(project.dueDate)}
          </Spec>
          {property && <Spec label="Imóvel">{property}</Spec>}
          {project.styles && project.styles.length > 0 && <Spec label="Estilo">{project.styles.join(', ')}</Spec>}
          {project.occupants && <Spec label="Ocupantes">{project.occupants}</Spec>}
        </dl>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {project.rooms.map((r) => (
            <span key={r} className="rounded-md bg-linho/70 px-2 py-0.5 text-[0.72rem] text-nogueira/75">
              {r}
            </span>
          ))}
        </div>

        {project.palette && project.palette.length > 0 && <PaletteStrip colors={project.palette} className="mt-2 h-3" />}

        {project.kickoff !== undefined && (
          <div className="mt-4 rounded-2xl bg-linho/45 px-3.5 py-3">
            <div className="flex items-baseline justify-between text-[0.8rem]">
              <span>Arranque</span>
              <span className="tabular text-taupe">
                {kickoffDone.length} de {KICKOFF_STEPS.length}
              </span>
            </div>
            <div className="mt-2">
              <Progress value={(kickoffDone.length / KICKOFF_STEPS.length) * 100} />
            </div>
            <p className="mt-2 text-[0.74rem] text-taupe">{kickoffNext ? `Próximo passo: ${kickoffNext.toLowerCase()}` : 'Tudo pronto para começar.'}</p>
          </div>
        )}

        {project.contacts && project.contacts.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1 border-t border-linha pt-3">
            {project.contacts.map((c, i) => (
              <li key={i} className="flex items-center gap-3 py-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.84rem]">{c.name}</span>
                  <span className="block text-[0.72rem] text-taupe">{c.role}</span>
                </span>
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.76rem] text-cognac-deep ring-1 ring-linha hover:bg-linho/50">
                    <Phone className="size-3.5" /> Ligar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}


        {next && (
          <Link to="/agenda" className="mt-4 flex items-center gap-3 rounded-2xl bg-[#f4ead9]/70 px-3.5 py-3 transition hover:bg-[#f4ead9]">
            <CalendarDays className="size-4 text-cognac" strokeWidth={1.6} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.84rem]">{next.title}</span>
              <span className="block text-[0.72rem] text-taupe">
                {shortDate(next.date)}, {next.start}
              </span>
            </span>
            <ArrowRight className="size-4 text-taupe" />
          </Link>
        )}

        <div className="mt-4 border-t border-linha pt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[0.8rem] text-taupe">Moodboard</p>
            <Link to="/inspiracoes" search={{ novo: true }} className="text-[0.76rem] text-taupe hover:text-nogueira">
              Adicionar
            </Link>
          </div>
          {moodboard.length === 0 ? (
            <p className="mt-2 text-[0.84rem] text-nogueira/70">Ainda sem inspirações ligadas a este projeto.</p>
          ) : (
            <ul className="mt-2.5 grid grid-cols-4 gap-1.5">
              {moodboard.slice(0, 4).map((item, i) => (
                <li key={item.id}>
                  <Link to="/inspiracoes" search={{ id: item.id }} title={item.title} className="relative block aspect-square overflow-hidden rounded-lg bg-linho">
                    <img src={item.image} alt={item.title} loading="lazy" className="size-full object-cover" />
                    {i === 3 && moodboard.length > 4 && <span className="absolute inset-0 grid place-items-center bg-nogueira/55 text-[0.8rem] text-marfim">+{moodboard.length - 4}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-linha pt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[0.8rem] text-taupe">Seleção de produtos</p>
            <p className="tabular text-[0.8rem]">{money(items.reduce((s, x) => s + x.usage.quantity * x.product.price, 0))}</p>
          </div>
          {items.length === 0 ? (
            <p className="mt-2 text-[0.84rem] text-nogueira/70">Sem produtos selecionados.</p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {items.slice(0, 4).map(({ product, usage }, i) => (
                <li key={`${product.id}-${i}`}>
                  <Link to="/biblioteca" search={{ id: product.id }} className="flex items-center gap-3">
                    <img src={product.image} alt="" className="size-10 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.84rem]">{product.name}</span>
                      <span className="block text-[0.72rem] text-taupe">
                        {usage.room} · {usage.status}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 pb-1">
          <Button variant="secondary" onClick={onEdit}>
            Editar
          </Button>
          <Button onClick={onAdvance} disabled={project.phase === 'Concluído'}>
            {project.phase === 'Concluído' ? (
              <>
                <Check className="size-4" /> Concluído
              </>
            ) : (
              <>Avançar fase</>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
