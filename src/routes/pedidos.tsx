import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { ArrowRight, BellRing, Globe, Inbox, Pencil, Phone, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { addDays, shortDate, todayIso } from '~/lib/format'
import { ago, isOpenLead, needsFollowUp } from '~/lib/leads'
import { validateIdSearch } from '~/lib/search'
import { recipientFromLead } from '~/lib/outreach'
import { LEAD_SOURCES, LEAD_STATUSES, PROJECT_SERVICES, type Lead, type LeadStatus, type ProjectService, type ProjectType } from '~/lib/types'
import { useMutations, useWorkspace } from '~/lib/workspace'
import { leadStatusTone } from '~/lib/tones'
import { Avatar, Badge, Button, ConfirmDelete, DetailPanel, EmptyState, Field, IconButton, Modal, PageHeader, Spec, Tabs, cx } from '~/components/ui'
import { ContactHistory, QuickMessage } from '~/components/QuickMessage'
import { ProjectForm, type ProjectPrefill } from '~/components/ProjectForm'

export const Route = createFileRoute('/pedidos')({
  validateSearch: validateIdSearch,
  head: () => ({ meta: [{ title: 'Pedidos · Quennie' }] }),
  component: LeadsPage,
})

// Site wording → studio wording, for a project started from a request.
const SPACE_TYPE: Record<string, ProjectType> = { Casa: 'Residencial', Escritório: 'Escritório', Hotel: 'Hotelaria', Restaurante: 'Restauração', Loja: 'Comércio' }
const SERVICE_MAP: Record<string, ProjectService> = {
  'Design de interiores': 'Projeto 3D',
  'Mobiliário à medida': 'Mobiliário à medida',
  'Cortinados & estores': 'Styling e decoração',
  Remodelações: 'Acompanhamento de obra',
}

function LeadsPage() {
  const { leads } = useWorkspace()
  const { save, remove } = useMutations()
  const { id } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [status, setStatus] = useState<'open' | 'all' | LeadStatus>('open')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Lead | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Lead | null>(null)
  const [converting, setConverting] = useState<{ lead: Lead; prefill: ProjectPrefill } | null>(null)

  const sorted = [...leads].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  const visible = sorted.filter((l) => {
    if (status === 'open' ? !isOpenLead(l) : status !== 'all' && l.status !== status) return false
    const q = query.trim().toLowerCase()
    return !q || [l.name, l.phone, l.email, l.city, l.country, l.message, ...l.services].some((v) => v?.toLowerCase().includes(q))
  })
  const selected = leads.find((l) => l.id === id) ?? visible[0]
  const select = (leadId?: string) => navigate({ search: leadId ? { id: leadId } : {}, replace: true, resetScroll: false })
  const fresh = leads.filter((l) => l.status === 'Novo').length
  const followUps = leads.filter((l) => needsFollowUp(l)).length
  const won = leads.filter((l) => l.status === 'Ganho').length
  const closed = won + leads.filter((l) => l.status === 'Perdido').length

  const convert = async (lead: Lead) => {
    const client = await save(
      'clients',
      {
        name: lead.name,
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        city: lead.city ?? (lead.country === 'Senegal' ? 'Dakar' : 'Bissau'),
        country: lead.country && lead.country !== 'Outro país' ? lead.country : 'Guiné-Bissau',
        type: lead.space === 'Hotel' ? 'Hotelaria' : lead.space === 'Restaurante' ? 'Restauração' : lead.space === 'Escritório' ? 'Empresa' : 'Particular',
        status: 'Potencial',
        since: todayIso(),
        notes: [lead.message, lead.preferences].filter(Boolean).join('\n') || undefined,
      },
      'Cliente criado a partir do pedido',
    )
    await save('leads', { ...lead, clientId: client.id }, null)
    const services = [...new Set(lead.services.map((s) => SERVICE_MAP[s] ?? (PROJECT_SERVICES as readonly string[]).find((p) => p === s)).filter(Boolean))] as ProjectService[]
    setConverting({
      lead: { ...lead, clientId: client.id },
      prefill: {
        name: `${lead.space && lead.space !== 'Outro espaço' ? lead.space : 'Projeto'} ${lead.name.trim().split(/\s+/).slice(-1)[0]}`,
        clientId: client.id,
        location: lead.city ?? lead.country ?? '',
        type: SPACE_TYPE[lead.space ?? ''] ?? 'Residencial',
        services: services.length ? services : ['Projeto 3D'],
        leadSource: lead.source,
        description: lead.message,
        kickoff: ['Briefing com o cliente'],
      },
    })
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Pedidos"
        subtitle={`${fresh} por responder, ${followUps} a relançar${closed ? `, ${Math.round((won / closed) * 100)}% de pedidos ganhos` : ''}`}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Novo pedido
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={status}
          onChange={setStatus}
          items={[
            { value: 'open', label: 'Em aberto', count: leads.filter(isOpenLead).length },
            ...LEAD_STATUSES.map((s) => ({ value: s, label: s, count: leads.filter((l) => l.status === s).length })),
            { value: 'all', label: 'Todos', count: leads.length },
          ]}
        />
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-taupe" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, telefone, serviço" aria-label="Filtrar pedidos" className="field h-10 rounded-full pl-10" />
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="Nenhum pedido"
            text={leads.length ? 'Nada neste filtro.' : 'Os pedidos de orçamento feitos no site aparecem aqui automaticamente. Também pode registar pedidos recebidos no Instagram ou por telefone.'}
            action={<Button onClick={() => setEditing('new')}>Registar pedido</Button>}
          />
        ) : (
          <ul className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-linha/80 divide-y divide-linha/70">
            {visible.map((lead, index) => {
              const late = needsFollowUp(lead)
              return (
                <motion.li key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: index * 0.03 } }}>
                  <button
                    onClick={() => select(lead.id)}
                    aria-pressed={selected?.id === lead.id}
                    className={cx('flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5', selected?.id === lead.id ? 'bg-linho/45' : 'hover:bg-linho/25')}
                  >
                    <span className="relative">
                      <Avatar name={lead.name} />
                      {lead.status === 'Novo' && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-cognac ring-2 ring-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cx('truncate text-[0.9rem]', lead.status === 'Novo' && 'font-medium')}>{lead.name}</span>
                        {lead.source === 'Site' && <Globe className="size-3.5 shrink-0 text-taupe" aria-label="Pedido do site" />}
                      </span>
                      <span className="block truncate text-[0.76rem] text-taupe">{[lead.services.join(', '), lead.space, lead.city ?? lead.country].filter(Boolean).join(' · ') || lead.message}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={leadStatusTone[lead.status]}>{lead.status}</Badge>
                      <span className={cx('flex items-center gap-1 text-[0.7rem]', late ? 'text-[#9b3424]' : 'text-taupe')}>
                        {late && <BellRing className="size-3" />}
                        {late ? 'Relançar' : ago(lead.receivedAt)}
                      </span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ul>
        )}

        <DetailPanel open={Boolean(id)} onClose={() => select(undefined)}>
          {selected && <LeadDetail key={selected.id} lead={selected} onEdit={() => setEditing(selected)} onDelete={() => setDeleting(selected)} onConvert={() => convert(selected)} />}
        </DetailPanel>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo pedido' : 'Editar pedido'} description={editing === 'new' ? 'Um pedido recebido por mensagem, telefone ou nas redes sociais.' : undefined} wide>
        {editing && (
          <LeadForm
            key={editing === 'new' ? 'new' : editing.id}
            lead={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (data) => {
              const saved = await save('leads', data, data.id ? 'Pedido atualizado' : 'Pedido registado')
              setEditing(null)
              select(saved.id)
            }}
          />
        )}
      </Modal>

      <ProjectForm
        project={converting ? 'new' : null}
        prefill={converting?.prefill}
        onClose={() => setConverting(null)}
        onSaved={async (projectId) => {
          if (converting) await save('leads', { ...converting.lead, projectId, status: 'Ganho' }, 'Pedido convertido em projeto')
          setConverting(null)
          navigate({ to: '/projetos', search: { id: projectId } })
        }}
      />

      <ConfirmDelete
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        what={deleting ? `O pedido de ${deleting.name}` : 'O pedido'}
        onConfirm={() => {
          if (!deleting) return
          remove('leads', deleting.id, 'Pedido eliminado')
          select(undefined)
        }}
      />
    </div>
  )
}

function LeadDetail({ lead, onEdit, onDelete, onConvert }: { lead: Lead; onEdit: () => void; onDelete: () => void; onConvert: () => void }) {
  const { projects, clients } = useWorkspace()
  const { save } = useMutations()
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [busy, setBusy] = useState(false)
  const project = projects.find((p) => p.id === lead.projectId)
  const client = clients.find((c) => c.id === lead.clientId)
  const recipient = recipientFromLead(lead, projects)
  const today = todayIso()
  const setStatus = (status: LeadStatus) => save('leads', { ...lead, status }, `Pedido: ${status.toLowerCase()}`)
  const followUp = (date?: string) => save('leads', { ...lead, nextFollowUp: date }, date ? `Relance marcado para ${shortDate(date)}` : 'Relance removido')

  return (
    <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-1.5 pt-2">
      <div className="flex items-start justify-between">
        <Avatar name={lead.name} size="lg" />
        <div className="flex gap-0.5 pr-8 xl:pr-0">
          <IconButton label="Editar pedido" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </IconButton>
          <IconButton label="Eliminar pedido" onClick={onDelete} className="hover:text-[#a23b2a]">
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      </div>
      <h2 className="display mt-4 text-[1.85rem] leading-tight">{lead.name}</h2>
      <p className="mt-1 text-[0.82rem] text-taupe">
        {lead.source === 'Site' ? 'Pedido feito no site' : `Via ${lead.source}`} · {shortDate(lead.receivedAt.slice(0, 10))} ({ago(lead.receivedAt)})
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Estado do pedido">
        {LEAD_STATUSES.map((s) => (
          <button key={s} onClick={() => s !== lead.status && setStatus(s)} aria-pressed={s === lead.status} className={cx('rounded-full px-2.5 py-1 text-[0.72rem] transition', s === lead.status ? 'bg-nogueira text-marfim' : 'bg-linho/60 text-nogueira/70 hover:bg-linho')}>
            {s}
          </button>
        ))}
      </div>

      {lead.services.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {lead.services.map((s) => (
            <span key={s} className="rounded-md bg-[#f4ead9] px-2 py-0.5 text-[0.74rem] text-cognac-deep">
              {s}
            </span>
          ))}
        </div>
      )}

      <dl className="mt-3">
        {lead.space && <Spec label="Espaço">{lead.space}</Spec>}
        {(lead.city || lead.country) && <Spec label="Local">{[lead.city, lead.country].filter(Boolean).join(', ')}</Spec>}
        {lead.timing && <Spec label="Prazo">{lead.timing}</Spec>}
        {lead.phone && (
          <Spec label="Telefone">
            <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="tabular inline-flex items-center gap-1 underline decoration-linha underline-offset-4">
              <Phone className="size-3" /> {lead.phone}
            </a>
          </Spec>
        )}
        {lead.email && <Spec label="Email">{lead.email}</Spec>}
      </dl>

      {lead.message && <p className="mt-3 rounded-2xl bg-[#f4ead9]/60 px-4 py-3 text-[0.84rem] leading-relaxed whitespace-pre-line text-nogueira/85">{lead.message}</p>}
      {lead.preferences && <p className="mt-2 text-[0.78rem] text-taupe">Preferências: {lead.preferences}</p>}

      <div className="mt-4">
        <QuickMessage recipient={recipient} purpose={lead.status === 'Novo' ? 'Resposta a pedido' : 'Relance'} />
      </div>

      <div className="mt-4 rounded-2xl ring-1 ring-linha px-3.5 py-3">
        <div className="flex items-center justify-between gap-2 text-[0.8rem]">
          <span className="flex items-center gap-1.5">
            <BellRing className="size-3.5 text-cognac" /> Relançar
          </span>
          <input type="date" value={lead.nextFollowUp ?? ''} onChange={(e) => followUp(e.target.value || undefined)} className="rounded-lg bg-linho/50 px-2 py-1 text-[0.78rem] outline-none" aria-label="Data do próximo relance" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: 'Amanhã', days: 1 },
            { label: '3 dias', days: 3 },
            { label: '1 semana', days: 7 },
            { label: '2 semanas', days: 14 },
          ].map((o) => (
            <button key={o.label} onClick={() => followUp(addDays(today, o.days))} className="rounded-full bg-linho/60 px-2.5 py-1 text-[0.72rem] text-nogueira/75 hover:bg-linho">
              {o.label}
            </button>
          ))}
          {lead.nextFollowUp && (
            <button onClick={() => followUp(undefined)} className="rounded-full px-2.5 py-1 text-[0.72rem] text-taupe hover:text-nogueira">
              Limpar
            </button>
          )}
        </div>
      </div>

      <Field label="Notas internas" className="mt-4">
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (lead.notes ?? '') && save('leads', { ...lead, notes: notes || undefined }, 'Notas guardadas')} className="field resize-none text-[0.84rem]" placeholder="Orçamento estimado, visita marcada…" />
      </Field>

      <ContactHistory kind="lead" id={lead.id} className="mt-4" />

      <div className="mt-4 border-t border-linha pt-4 pb-1">
        {project ? (
          <Link to="/projetos" search={{ id: project.id }} className="flex items-center gap-3 rounded-2xl bg-[#e7ecdf]/70 px-3.5 py-3 text-[0.84rem]">
            <Sparkles className="size-4 text-palma-deep" />
            <span className="flex-1">Projeto criado: {project.name}</span>
            <ArrowRight className="size-4 text-taupe" />
          </Link>
        ) : (
          <>
            {client && (
              <Link to="/clientes" search={{ id: client.id }} className="mb-2 block text-[0.78rem] text-taupe underline decoration-linha underline-offset-4">
                Cliente: {client.name}
              </Link>
            )}
            <Button
              className="w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await onConvert()
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Sparkles className="size-4" /> {busy ? 'A preparar…' : 'Converter em cliente e projeto'}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  )
}

const SPACES = ['Casa', 'Escritório', 'Hotel', 'Restaurante', 'Loja', 'Outro espaço']
const COUNTRIES = ['Guiné-Bissau', 'Senegal', 'Portugal', 'Cabo Verde', 'Outro país']
const SITE_SERVICES = ['Design de interiores', 'Mobiliário à medida', 'Cortinados & estores', 'Remodelações']

function LeadForm({ lead, onCancel, onSave }: { lead: Lead | null; onCancel: () => void; onSave: (l: Omit<Lead, 'id'> & { id?: string }) => Promise<void> }) {
  const [form, setForm] = useState<Omit<Lead, 'id'> & { id?: string }>(
    lead ?? { name: '', phone: '+245 ', services: [], source: 'Instagram', status: 'Novo', receivedAt: new Date().toISOString(), country: 'Guiné-Bissau', city: 'Bissau' },
  )
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        await onSave({ ...form, name: form.name.trim(), phone: form.phone?.trim() || undefined, email: form.email?.trim() || undefined })
        setBusy(false)
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Nome">
        <input required className="field" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Origem">
        <select className="field" value={form.source} onChange={(e) => set('source', e.target.value as Lead['source'])}>
          {LEAD_SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Telefone / WhatsApp">
        <input type="tel" className="field tabular" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <Field label="Email (opcional)">
        <input type="email" className="field" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
      </Field>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-[0.78rem] text-nogueira/70">Serviços pedidos</span>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...SITE_SERVICES, ...form.services])].map((s) => {
            const on = form.services.includes(s)
            return (
              <button type="button" key={s} aria-pressed={on} onClick={() => set('services', on ? form.services.filter((x) => x !== s) : [...form.services, s])} className={cx('rounded-full px-3 py-1.5 text-[0.8rem] transition', on ? 'bg-nogueira text-marfim' : 'bg-white ring-1 ring-linha hover:ring-taupe/40')}>
                {s}
              </button>
            )
          })}
        </div>
      </div>
      <Field label="Espaço">
        <select className="field" value={form.space ?? ''} onChange={(e) => set('space', e.target.value || undefined)}>
          <option value="">Não indicado</option>
          {SPACES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Estado">
        <select className="field" value={form.status} onChange={(e) => set('status', e.target.value as LeadStatus)}>
          {LEAD_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Cidade">
        <input className="field" value={form.city ?? ''} onChange={(e) => set('city', e.target.value || undefined)} />
      </Field>
      <Field label="País">
        <select className="field" value={form.country ?? ''} onChange={(e) => set('country', e.target.value || undefined)}>
          {COUNTRIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Mensagem do cliente" className="sm:col-span-2">
        <textarea rows={3} className="field resize-none" value={form.message ?? ''} onChange={(e) => set('message', e.target.value || undefined)} placeholder="O que pediu, em poucas palavras" />
      </Field>
      <div className="flex justify-end gap-2 border-t border-linha pt-4 sm:col-span-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'A guardar…' : 'Guardar pedido'}
        </Button>
      </div>
    </form>
  )
}
