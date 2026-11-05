import { useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { ChevronRight, Mail, MessageCircle, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react'
import { invoiceTotal, longDate, money, moneyShort, shortDate, todayIso } from '~/lib/format'
import { validateIdSearch } from '~/lib/search'
import type { Client, ClientStatus, ClientType } from '~/lib/types'
import { useMutations, useWorkspace } from '~/lib/workspace'
import { Avatar, Badge, Button, ConfirmDelete, DetailPanel, EmptyState, Field, IconButton, Modal, PageHeader, Tabs, cx } from '~/components/ui'
import { clientStatusTone as statusTone, phaseTone } from '~/lib/tones'
import { normalizePhone, recipientFromClient } from '~/lib/outreach'
import { ContactHistory, QuickMessage } from '~/components/QuickMessage'

export const Route = createFileRoute('/clientes')({
  validateSearch: validateIdSearch,
  head: () => ({ meta: [{ title: 'Clientes · Quennie' }] }),
  component: ClientsPage,
})

const CLIENT_TYPES: ClientType[] = ['Particular', 'Empresa', 'Hotelaria', 'Restauração']

function ClientsPage() {
  const { clients, projects, invoices } = useWorkspace()
  const { save, remove } = useMutations()
  const { id } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [status, setStatus] = useState<'all' | ClientStatus>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Client | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)

  const billedBy = useMemo(() => {
    const map = new Map<string, number>()
    for (const inv of invoices) if (inv.status !== 'Rascunho') map.set(inv.clientId, (map.get(inv.clientId) ?? 0) + invoiceTotal(inv))
    return map
  }, [invoices])

  const visible = clients.filter((c) => {
    if (status !== 'all' && c.status !== status) return false
    const q = query.trim().toLowerCase()
    return !q || [c.name, c.company, c.city, c.email].some((v) => v?.toLowerCase().includes(q))
  })
  const selected = clients.find((c) => c.id === id) ?? visible[0]
  const select = (clientId?: string) => navigate({ search: clientId ? { id: clientId } : {}, replace: true, resetScroll: false })
  const countries = new Set(clients.map((c) => c.country)).size

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Clientes"
        subtitle={`${clients.filter((c) => c.status === 'Ativo').length} clientes ativos em ${countries} países`}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Novo cliente
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={status}
          onChange={setStatus}
          items={[
            { value: 'all', label: 'Todos', count: clients.length },
            { value: 'Ativo', label: 'Ativos', count: clients.filter((c) => c.status === 'Ativo').length },
            { value: 'Potencial', label: 'Potenciais', count: clients.filter((c) => c.status === 'Potencial').length },
            { value: 'Arquivado', label: 'Arquivados', count: clients.filter((c) => c.status === 'Arquivado').length },
          ]}
        />
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-taupe" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, empresa, cidade" aria-label="Filtrar clientes" className="field h-10 rounded-full pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {visible.length === 0 ? (
          <EmptyState icon={<Users className="size-5" />} title="Nenhum cliente" text="Ajuste o filtro ou adicione um novo cliente." />
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-linha/80">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_0.7fr_1fr_1.25rem] gap-4 border-b border-linha px-5 py-3 text-[0.72rem] text-taupe 2xl:grid">
              <span>Cliente</span>
              <span>Tipo</span>
              <span>Cidade</span>
              <span className="text-right">Projetos</span>
              <span className="text-right">Faturado</span>
              <span />
            </div>
            <ul className="divide-y divide-linha/70">
              {visible.map((client, index) => {
                const count = projects.filter((p) => p.clientId === client.id).length
                const active = selected?.id === client.id
                return (
                  <motion.li key={client.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: index * 0.03 } }}>
                    <button
                      onClick={() => select(client.id)}
                      aria-pressed={active}
                      className={cx(
                        'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 text-left transition-colors sm:px-5 2xl:grid-cols-[minmax(0,2.2fr)_1fr_1fr_0.7fr_1fr_1.25rem]',
                        active ? 'bg-linho/45' : 'hover:bg-linho/25',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar name={client.name} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[0.9rem]">{client.name}</span>
                            {client.status !== 'Ativo' && <Badge tone={statusTone[client.status]}>{client.status}</Badge>}
                          </span>
                          <span className="block truncate text-[0.76rem] text-taupe">{client.company ?? client.email}</span>
                        </span>
                      </span>
                      <span className="hidden text-[0.84rem] text-nogueira/80 2xl:block">{client.type}</span>
                      <span className="hidden truncate text-[0.84rem] text-nogueira/80 2xl:block">{client.city}</span>
                      <span className="tabular hidden text-right text-[0.84rem] 2xl:block">{count}</span>
                      <span className="tabular text-right text-[0.84rem]">
                        {money(billedBy.get(client.id) ?? 0)}
                        <span className="block text-[0.72rem] text-taupe 2xl:hidden">{client.city}</span>
                      </span>
                      <ChevronRight className="hidden size-4 text-taupe 2xl:block" />
                    </button>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        )}

        <DetailPanel open={Boolean(id)} onClose={() => select(undefined)}>
          {selected && <ClientDetail client={selected} billed={billedBy.get(selected.id) ?? 0} onEdit={() => setEditing(selected)} onDelete={() => setDeleting(selected)} />}
        </DetailPanel>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo cliente' : 'Editar cliente'} wide>
        {editing && (
          <ClientForm
            key={editing === 'new' ? 'new' : editing.id}
            client={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (data) => {
              const saved = await save('clients', data, data.id ? 'Cliente atualizado' : 'Cliente adicionado')
              setEditing(null)
              select(saved.id)
            }}
          />
        )}
      </Modal>
      <ConfirmDelete
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        what={deleting?.name ?? 'O cliente'}
        onConfirm={() => {
          if (!deleting) return
          remove('clients', deleting.id, 'Cliente eliminado')
          select(undefined)
        }}
      />
    </div>
  )
}

function ClientDetail({ client, billed, onEdit, onDelete }: { client: Client; billed: number; onEdit: () => void; onDelete: () => void }) {
  const { projects, invoices, appointments } = useWorkspace()
  const clientProjects = projects.filter((p) => p.clientId === client.id)
  const outstanding = invoices.filter((i) => i.clientId === client.id && (i.status === 'Enviada' || i.status === 'Em atraso')).reduce((s, i) => s + invoiceTotal(i), 0)
  const next = appointments.filter((a) => a.clientId === client.id && a.date >= todayIso()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
  const whatsapp = `https://wa.me/${normalizePhone(client.phone)}`

  return (
    <motion.div key={client.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-1.5 pt-2">
      <div className="flex items-start justify-between">
        <Avatar name={client.name} size="lg" />
        <div className="flex gap-0.5 pr-8 xl:pr-0">
          <IconButton label="Editar cliente" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </IconButton>
          <IconButton label="Eliminar cliente" onClick={onDelete} className="hover:text-[#a23b2a]">
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      </div>
      <h2 className="display mt-4 text-[1.85rem] leading-tight">{client.name}</h2>
      <p className="mt-1 text-[0.82rem] text-taupe">{[client.company, `${client.city}, ${client.country}`].filter(Boolean).join(' · ')}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={statusTone[client.status]} dot>
          {client.status}
        </Badge>
        <Badge>{client.type}</Badge>
        <Badge>Cliente desde {longDate(client.since).split(' de ').slice(1).join(' ')}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { href: whatsapp, label: 'WhatsApp', icon: MessageCircle },
          { href: `tel:${client.phone.replace(/\s/g, '')}`, label: 'Ligar', icon: Phone },
          { href: `mailto:${client.email}`, label: 'Email', icon: Mail },
        ].map(({ href, label, icon: Icon }) => (
          <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-linho/50 py-3 text-[0.74rem] text-nogueira/80 transition hover:bg-linho">
            <Icon className="size-4 text-cognac" strokeWidth={1.6} />
            {label}
          </a>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl ring-1 ring-linha px-3.5 py-3">
          <p className="text-[0.72rem] text-taupe">Faturado</p>
          <p className="display tabular mt-1 text-[1.4rem]" title={money(billed)}>{moneyShort(billed)}</p>
        </div>
        <div className="rounded-2xl ring-1 ring-linha px-3.5 py-3">
          <p className="text-[0.72rem] text-taupe">Por receber</p>
          <p className={cx('display tabular mt-1 text-[1.4rem]', outstanding > 0 && 'text-cognac')}>{moneyShort(outstanding)}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-1 text-[0.84rem]">
        <div className="flex justify-between gap-3">
          <dt className="text-taupe">Email</dt>
          <dd className="truncate">{client.email}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-taupe">Telefone</dt>
          <dd className="tabular">{client.phone}</dd>
        </div>
        {next && (
          <div className="flex justify-between gap-3">
            <dt className="text-taupe">Próximo encontro</dt>
            <dd>
              {shortDate(next.date)}, {next.start}
            </dd>
          </div>
        )}
      </dl>

      {client.notes && <p className="mt-4 rounded-2xl bg-[#f4ead9]/60 px-4 py-3 text-[0.84rem] leading-relaxed text-nogueira/85">{client.notes}</p>}

      <div className="mt-4">
        <QuickMessage recipient={recipientFromClient(client, projects)} purpose={client.status === 'Potencial' ? 'Relance' : 'Novidades'} />
      </div>
      <ContactHistory kind="client" id={client.id} className="mt-4" />

      <div className="mt-4 border-t border-linha pt-4 pb-1">
        <p className="text-[0.8rem] text-taupe">Projetos</p>
        {clientProjects.length === 0 ? (
          <p className="mt-2 text-[0.84rem] text-nogueira/70">Ainda sem projetos.</p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {clientProjects.map((p) => (
              <li key={p.id}>
                <Link to="/projetos" search={{ id: p.id }} className="flex items-center gap-3">
                  <img src={p.cover} alt="" className="size-11 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.86rem]">{p.name}</span>
                    <span className="block text-[0.72rem] text-taupe tabular">{money(p.budget)}</span>
                  </span>
                  <Badge tone={phaseTone[p.phase]}>{p.phase}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

function ClientForm({ client, onCancel, onSave }: { client: Client | null; onCancel: () => void; onSave: (c: Omit<Client, 'id'> & { id?: string }) => Promise<void> }) {
  const [form, setForm] = useState<Omit<Client, 'id'> & { id?: string }>(
    client ?? { name: '', email: '', phone: '+245 ', city: 'Bissau', country: 'Guiné-Bissau', type: 'Particular', status: 'Potencial', since: todayIso() },
  )
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        await onSave(form)
        setBusy(false)
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Nome completo">
        <input required className="field" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Empresa (opcional)">
        <input className="field" value={form.company ?? ''} onChange={(e) => set('company', e.target.value || undefined)} />
      </Field>
      <Field label="Email">
        <input type="email" required className="field" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </Field>
      <Field label="Telefone / WhatsApp">
        <input required className="field tabular" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <Field label="Cidade">
        <input className="field" value={form.city} onChange={(e) => set('city', e.target.value)} />
      </Field>
      <Field label="País">
        <select className="field" value={form.country} onChange={(e) => set('country', e.target.value)}>
          {['Guiné-Bissau', 'Portugal', 'Senegal', 'Cabo Verde', 'Outro'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Tipo">
        <select className="field" value={form.type} onChange={(e) => set('type', e.target.value as ClientType)}>
          {CLIENT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Estado">
        <select className="field" value={form.status} onChange={(e) => set('status', e.target.value as ClientStatus)}>
          {(['Ativo', 'Potencial', 'Arquivado'] as const).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Notas" className="sm:col-span-2">
        <textarea rows={3} className="field resize-none" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Preferências, estilo, disponibilidade…" />
      </Field>
      <div className="flex justify-end gap-2 border-t border-linha pt-4 sm:col-span-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'A guardar…' : 'Guardar cliente'}
        </Button>
      </div>
    </form>
  )
}
