import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Check, Download, Pencil, Plus, ReceiptText, Send, Trash2, X } from 'lucide-react'
import { CURRENCY, DEFAULT_VAT, addDays, amountShort, daysBetween, invoiceSubtotal, invoiceTotal, longDate, money, moneyExact, shortDate, todayIso } from '~/lib/format'
import { validateIdSearch } from '~/lib/search'
import { invoiceTone } from '~/lib/tones'
import type { Invoice, InvoiceStatus } from '~/lib/types'
import { useMutations, useWorkspace } from '~/lib/workspace'
import { Badge, Button, Card, ConfirmDelete, DetailPanel, EmptyState, Field, IconButton, Modal, PageHeader, Tabs, cx } from '~/components/ui'

export const Route = createFileRoute('/faturas')({
  validateSearch: validateIdSearch,
  head: () => ({ meta: [{ title: 'Faturas · Quennie' }] }),
  component: InvoicesPage,
})

const STATUSES: InvoiceStatus[] = ['Rascunho', 'Enviada', 'Paga', 'Em atraso']

function InvoicesPage() {
  const { invoices, clients, projects } = useWorkspace()
  const { save, remove } = useMutations()
  const { id } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all')
  const [editing, setEditing] = useState<Invoice | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Invoice | null>(null)

  const sorted = [...invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  const visible = sorted.filter((i) => status === 'all' || i.status === status)
  const selected = invoices.find((i) => i.id === id) ?? visible[0]
  const select = (invoiceId?: string) => navigate({ search: invoiceId ? { id: invoiceId } : {}, replace: true, resetScroll: false })

  const sum = (list: Invoice[]) => list.reduce((s, i) => s + invoiceTotal(i), 0)
  const paid = sum(invoices.filter((i) => i.status === 'Paga'))
  const pending = sum(invoices.filter((i) => i.status === 'Enviada'))
  const late = invoices.filter((i) => i.status === 'Em atraso')
  const drafts = invoices.filter((i) => i.status === 'Rascunho')

  const nextNumber = () => {
    const max = Math.max(0, ...invoices.map((i) => Number(i.number.split('/')[1]) || 0))
    return `FT ${new Date().getFullYear()}/${String(max + 1).padStart(3, '0')}`
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Faturas"
        subtitle={`${invoices.length} documentos emitidos, ${late.length} em atraso`}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Nova fatura
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Recebido" value={paid} note={`${invoices.filter((i) => i.status === 'Paga').length} faturas pagas`} />
        <Kpi label="A receber" value={pending} note="Dentro do prazo" />
        <Kpi label="Em atraso" value={sum(late)} note={late.length ? `${late.length} fatura${late.length > 1 ? 's' : ''} por cobrar` : 'Tudo em dia'} alert={late.length > 0} />
        <Kpi label="Rascunhos" value={sum(drafts)} note={`${drafts.length} por enviar`} />
      </div>

      <Tabs
        value={status}
        onChange={setStatus}
        items={[{ value: 'all' as const, label: 'Todas', count: invoices.length }, ...STATUSES.map((s) => ({ value: s, label: s, count: invoices.filter((i) => i.status === s).length }))]}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {visible.length === 0 ? (
          <EmptyState icon={<ReceiptText className="size-5" />} title="Nenhuma fatura" text="Não há faturas com este estado." />
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-linha/80">
            <div className="hidden grid-cols-[7rem_minmax(0,1.6fr)_1fr_1fr_6.5rem] gap-4 border-b border-linha px-5 py-3 text-[0.72rem] text-taupe 2xl:grid">
              <span>Número</span>
              <span>Cliente</span>
              <span>Vencimento</span>
              <span className="text-right">Total</span>
              <span className="text-right">Estado</span>
            </div>
            <ul className="divide-y divide-linha/70">
              {visible.map((invoice, index) => {
                const client = clients.find((c) => c.id === invoice.clientId)
                const project = projects.find((p) => p.id === invoice.projectId)
                const days = daysBetween(todayIso(), invoice.dueDate)
                return (
                  <motion.li key={invoice.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: index * 0.03 } }}>
                    <button
                      onClick={() => select(invoice.id)}
                      aria-pressed={selected?.id === invoice.id}
                      className={cx(
                        'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left transition-colors sm:px-5 2xl:grid-cols-[7rem_minmax(0,1.6fr)_1fr_1fr_6.5rem]',
                        selected?.id === invoice.id ? 'bg-linho/45' : 'hover:bg-linho/25',
                      )}
                    >
                      <span className="tabular hidden text-[0.84rem] 2xl:block">{invoice.number}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9rem]">{client?.name}</span>
                        <span className="block truncate text-[0.74rem] text-taupe">
                          <span className="2xl:hidden">{invoice.number} · </span>
                          {project?.name ?? 'Sem projeto'}
                        </span>
                      </span>
                      <span className="hidden text-[0.84rem] 2xl:block">
                        {shortDate(invoice.dueDate)}
                        {invoice.status !== 'Paga' && invoice.status !== 'Rascunho' && (
                          <span className={cx('block text-[0.72rem]', days < 0 ? 'text-[#9b3424]' : 'text-taupe')}>{days < 0 ? `há ${-days} dias` : days === 0 ? 'hoje' : `em ${days} dias`}</span>
                        )}
                      </span>
                      <span className="flex flex-col items-end gap-1 2xl:contents">
                        <span className="tabular text-right text-[0.9rem]">{money(invoiceTotal(invoice))}</span>
                        <span className="text-right">
                          <Badge tone={invoiceTone[invoice.status]} dot>
                            {invoice.status}
                          </Badge>
                        </span>
                      </span>
                    </button>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        )}

        <DetailPanel open={Boolean(id)} onClose={() => select(undefined)}>
          {selected && (
            <InvoiceDetail
              invoice={selected}
              onEdit={() => setEditing(selected)}
              onDelete={() => setDeleting(selected)}
              onStatus={(s) => save('invoices', { ...selected, status: s }, s === 'Paga' ? 'Fatura marcada como paga' : 'Fatura enviada ao cliente')}
            />
          )}
        </DetailPanel>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nova fatura' : `Editar ${editing?.number ?? ''}`} wide>
        {editing && (
          <InvoiceForm
            key={editing === 'new' ? 'new' : editing.id}
            invoice={editing === 'new' ? null : editing}
            number={nextNumber()}
            onCancel={() => setEditing(null)}
            onSave={async (data) => {
              const saved = await save('invoices', data, data.id ? 'Fatura atualizada' : 'Fatura criada como rascunho')
              setEditing(null)
              select(saved.id)
            }}
          />
        )}
      </Modal>
      <ConfirmDelete
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        what={deleting ? `A fatura ${deleting.number}` : 'A fatura'}
        onConfirm={() => {
          if (!deleting) return
          remove('invoices', deleting.id, 'Fatura eliminada')
          select(undefined)
        }}
      />
    </div>
  )
}

function Kpi({ label, value, note, alert }: { label: string; value: number; note: string; alert?: boolean }) {
  return (
    <Card className="px-4 py-4 sm:px-5">
      <p className="text-[0.76rem] text-taupe">{label}</p>
      <p className={cx('mt-2 flex items-baseline gap-1.5', alert && 'text-[#9b3424]')} title={money(value)}>
        <span className="display tabular text-[1.8rem] sm:text-[2.2rem]">{amountShort(value)}</span>
        <span className="text-[0.7rem] text-taupe">{CURRENCY}</span>
      </p>
      <p className="mt-1 text-[0.74rem] text-taupe">{note}</p>
    </Card>
  )
}

function InvoiceDetail({ invoice, onEdit, onDelete, onStatus }: { invoice: Invoice; onEdit: () => void; onDelete: () => void; onStatus: (s: InvoiceStatus) => void }) {
  const { clients, projects } = useWorkspace()
  const client = clients.find((c) => c.id === invoice.clientId)
  const project = projects.find((p) => p.id === invoice.projectId)
  const subtotal = invoiceSubtotal(invoice)

  return (
    <motion.div key={invoice.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between px-1.5 pt-1 pr-10 xl:pr-1.5">
        <Badge tone={invoiceTone[invoice.status]} dot>
          {invoice.status}
        </Badge>
        <div className="flex gap-0.5">
          <IconButton label="Descarregar PDF" onClick={() => window.print()}>
            <Download className="size-3.5" />
          </IconButton>
          <IconButton label="Editar fatura" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </IconButton>
          <IconButton label="Eliminar fatura" onClick={onDelete} className="hover:text-[#a23b2a]">
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      </div>

      {/* Paper preview of the document the client receives. */}
      <article className="mt-3 rounded-[1.1rem] bg-marfim px-5 py-6 ring-1 ring-linha">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[1.6rem] leading-none">Quennie</p>
            <p className="mt-1 text-[0.58rem] tracking-[0.2em] text-taupe uppercase">Home Concept &amp; Interior Design</p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Fatura</p>
            <p className="tabular mt-1 text-[0.86rem]">{invoice.number}</p>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-4 text-[0.76rem]">
          <div>
            <p className="eyebrow">Cliente</p>
            <p className="mt-1.5 text-[0.84rem]">{client?.company ?? client?.name}</p>
            {client?.company && <p className="text-taupe">{client.name}</p>}
            <p className="text-taupe">
              {client?.city}, {client?.country}
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Datas</p>
            <p className="mt-1.5">Emissão {longDate(invoice.issueDate)}</p>
            <p className="text-taupe">Vence {longDate(invoice.dueDate)}</p>
          </div>
        </div>

        {project && <p className="mt-4 text-[0.76rem] text-taupe">Projeto: {project.name}</p>}

        <table className="mt-4 w-full text-[0.78rem]">
          <thead>
            <tr className="border-b border-linha text-left text-[0.68rem] text-taupe">
              <th className="pb-2 font-normal">Descrição</th>
              <th className="pb-2 text-right font-normal">Qtd.</th>
              <th className="pb-2 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, i) => (
              <tr key={i} className="border-b border-linha/60 align-top">
                <td className="py-2 pr-2">
                  {line.description}
                  <span className="tabular block text-[0.7rem] text-taupe">{moneyExact(line.unitPrice)} / unid.</span>
                </td>
                <td className="tabular py-2 text-right">{line.quantity}</td>
                <td className="tabular py-2 text-right">{moneyExact(line.quantity * line.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-3 ml-auto w-full max-w-[13rem] space-y-1 text-[0.78rem]">
          <div className="flex justify-between">
            <dt className="text-taupe">Subtotal</dt>
            <dd className="tabular">{moneyExact(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-taupe">IVA {Math.round(invoice.vatRate * 100)}%</dt>
            <dd className="tabular">{moneyExact(subtotal * invoice.vatRate)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-nogueira/15 pt-2">
            <dt>Total</dt>
            <dd className="display tabular text-[1.35rem]">{moneyExact(invoiceTotal(invoice))}</dd>
          </div>
        </dl>
      </article>

      <div className="mt-4 grid grid-cols-2 gap-2 px-0.5 pb-1">
        {invoice.status === 'Rascunho' ? (
          <>
            <Button variant="secondary" onClick={onEdit}>
              Editar
            </Button>
            <Button onClick={() => onStatus('Enviada')}>
              <Send className="size-3.5" /> Enviar
            </Button>
          </>
        ) : invoice.status === 'Paga' ? (
          <Button variant="secondary" className="col-span-2" disabled>
            <Check className="size-4" /> Paga
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => onStatus('Enviada')}>
              Reenviar
            </Button>
            <Button onClick={() => onStatus('Paga')}>
              <Check className="size-4" /> Marcar paga
            </Button>
          </>
        )}
      </div>
    </motion.div>
  )
}

function InvoiceForm({ invoice, number, onCancel, onSave }: { invoice: Invoice | null; number: string; onCancel: () => void; onSave: (i: Omit<Invoice, 'id'> & { id?: string }) => Promise<void> }) {
  const { clients, projects } = useWorkspace()
  const [form, setForm] = useState<Omit<Invoice, 'id'> & { id?: string }>(
    invoice ?? {
      number,
      clientId: clients[0]?.id ?? '',
      projectId: projects.find((p) => p.clientId === clients[0]?.id)?.id,
      issueDate: todayIso(),
      dueDate: addDays(todayIso(), 30),
      status: 'Rascunho',
      vatRate: DEFAULT_VAT,
      lines: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  )
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setLine = (index: number, patch: Partial<Invoice['lines'][number]>) => set('lines', form.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  const clientProjects = projects.filter((p) => p.clientId === form.clientId)
  const subtotal = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        await onSave({ ...form, lines: form.lines.filter((l) => l.description.trim()) })
        setBusy(false)
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Cliente">
        <select
          className="field"
          value={form.clientId}
          onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value, projectId: projects.find((p) => p.clientId === e.target.value)?.id }))}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Projeto">
        <select className="field" value={form.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || undefined)}>
          <option value="">Sem projeto</option>
          {clientProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Emissão">
        <input type="date" className="field" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
      </Field>
      <Field label="Vencimento">
        <input type="date" className="field" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
      </Field>

      <div className="sm:col-span-2">
        <p className="text-[0.78rem] text-nogueira/70">Linhas</p>
        <ul className="mt-1.5 flex flex-col gap-2">
          {form.lines.map((line, i) => (
            <li key={i} className="grid grid-cols-[1fr_3.5rem_5.5rem_2.25rem] gap-2 sm:grid-cols-[1fr_4.5rem_6.5rem_2.25rem]">
              <input aria-label="Descrição" className="field" placeholder="Descrição" value={line.description} onChange={(e) => setLine(i, { description: e.target.value })} />
              <input aria-label="Quantidade" type="number" min={0} className="field tabular px-2" value={line.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} />
              <input aria-label="Preço unitário" type="number" min={0} step={1} className="field tabular px-2" value={line.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} />
              <IconButton label="Remover linha" onClick={() => set('lines', form.lines.filter((_, j) => j !== i))} disabled={form.lines.length === 1} className="mt-0.5">
                <X className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => set('lines', [...form.lines, { description: '', quantity: 1, unitPrice: 0 }])}>
          <Plus className="size-3.5" /> Adicionar linha
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-linho/60 px-4 py-3 text-[0.86rem] sm:col-span-2">
        <span className="text-taupe">Total com IVA {Math.round(form.vatRate * 100)}%</span>
        <span className="display tabular text-[1.5rem]">{moneyExact(subtotal * (1 + form.vatRate))}</span>
      </div>

      <div className="flex justify-end gap-2 border-t border-linha pt-4 sm:col-span-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'A guardar…' : invoice ? 'Guardar fatura' : 'Criar rascunho'}
        </Button>
      </div>
    </form>
  )
}
