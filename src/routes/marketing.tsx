import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { CalendarDays, Check, Copy, Download, ImagePlus, Mail, Megaphone, MessageCircle, Pencil, Plus, Send, Share2, Sparkles, Trash2, Users, Wand2 } from 'lucide-react'
import { addDays, daysBetween, shortDate, todayIso, weekday } from '~/lib/format'
import { fileToDataUrl } from '~/lib/image'
import {
  DEFAULT_HASHTAGS,
  TEMPLATE_VARIABLES,
  fillTemplate,
  isSuggested,
  lastContact,
  normalizePhone,
  recipientFromClient,
  recipientFromLead,
  templatesOf,
  useSendMessage,
  type Recipient,
} from '~/lib/outreach'
import {
  LEAD_STATUSES,
  MESSAGE_CHANNELS,
  POST_STATUSES,
  SOCIAL_PLATFORMS,
  TEMPLATE_PURPOSES,
  type ClientStatus,
  type LeadStatus,
  type MessageTemplate,
  type Project,
  type SocialPlatform,
  type SocialPost,
} from '~/lib/types'
import { postStatusTone } from '~/lib/tones'
import { useMutations, useToast, useWorkspace } from '~/lib/workspace'
import { uploadMedia } from '~/server/workspace'
import { Badge, Button, Card, ConfirmDelete, EmptyState, Field, IconButton, Modal, PageHeader, Progress, Tabs, cx } from '~/components/ui'

type Tab = 'campanhas' | 'mensagens' | 'redes'
type Search = { tab?: Tab; projeto?: string; foto?: string }

export const Route = createFileRoute('/marketing')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === 'mensagens' || s.tab === 'redes' || s.tab === 'campanhas' ? s.tab : undefined,
    projeto: typeof s.projeto === 'string' ? s.projeto : undefined,
    foto: typeof s.foto === 'string' ? s.foto : undefined,
  }),
  head: () => ({ meta: [{ title: 'Marketing · Quennie' }] }),
  component: MarketingPage,
})

function MarketingPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { outreach, posts } = useWorkspace()
  const tab = search.tab ?? 'campanhas'
  const monthAgo = addDays(todayIso(), -30)
  const sentMonth = outreach.filter((o) => o.sentAt.slice(0, 10) >= monthAgo).length
  const upcoming = posts.filter((p) => p.status === 'Agendado').length

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Marketing" subtitle={`${sentMonth} mensagens enviadas nos últimos 30 dias, ${upcoming} publicações agendadas`} />
      <Tabs
        value={tab}
        onChange={(t) => navigate({ search: { tab: t }, replace: true })}
        items={[
          { value: 'campanhas', label: 'Campanhas' },
          { value: 'mensagens', label: 'Modelos de mensagem' },
          { value: 'redes', label: 'Redes sociais', count: posts.length || undefined },
        ]}
      />
      {tab === 'campanhas' && <Campaigns />}
      {tab === 'mensagens' && <Templates />}
      {tab === 'redes' && <SocialStudio projectId={search.projeto} photo={search.foto} onConsumed={() => navigate({ search: { tab: 'redes' }, replace: true })} />}
    </div>
  )
}

// Campaigns ---------------------------------------------------------------------

type Audience = 'clients' | 'leads'

function Campaigns() {
  const workspace = useWorkspace()
  const { clients, leads, projects, outreach } = workspace
  const templates = templatesOf(workspace)
  const send = useSendMessage()
  const [audience, setAudience] = useState<Audience>('clients')
  const [clientStatuses, setClientStatuses] = useState<ClientStatus[]>(['Ativo', 'Potencial'])
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>(['Novo', 'Contactado', 'Orçamento enviado'])
  const [city, setCity] = useState('')
  const [quietDays, setQuietDays] = useState(0)
  const [channel, setChannel] = useState<'WhatsApp' | 'Email'>('WhatsApp')
  const [templateId, setTemplateId] = useState(templates.find((t) => t.purpose === 'Promoção')?.id ?? templates[0]?.id ?? '')
  const template = templates.find((t) => t.id === templateId)
  const [body, setBody] = useState(template?.body ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [excluded, setExcluded] = useState<string[]>([])
  const [sent, setSent] = useState<string[]>([])

  useEffect(() => {
    setBody(template?.body ?? '')
    setSubject(template?.subject ?? '')
  }, [template?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cities = [...new Set([...clients.map((c) => c.city), ...leads.map((l) => l.city).filter(Boolean)] as string[])].sort()
  const today = todayIso()
  const pool: Recipient[] = useMemo(
    () =>
      audience === 'clients'
        ? clients.filter((c) => clientStatuses.includes(c.status) && (!city || c.city === city)).map((c) => recipientFromClient(c, projects))
        : leads.filter((l) => leadStatuses.includes(l.status) && (!city || l.city === city)).map((l) => recipientFromLead(l, projects)),
    [audience, clients, leads, projects, clientStatuses, leadStatuses, city],
  )
  const reachable = (r: Recipient) => (channel === 'WhatsApp' ? Boolean(normalizePhone(r.phone)) : Boolean(r.email))
  const recipients = pool.filter((r) => {
    if (!reachable(r)) return false
    if (!quietDays) return true
    const last = lastContact(outreach, r.kind, r.id)
    return !last || daysBetween(last.sentAt.slice(0, 10), today) >= quietDays
  })
  const queue = recipients.filter((r) => !excluded.includes(r.id))
  const done = queue.filter((r) => sent.includes(r.id)).length
  const next = queue.find((r) => !sent.includes(r.id))

  const fire = (r: Recipient) => {
    const ok = send(r, channel, fillTemplate(body, r), { subject: fillTemplate(subject || 'Quennie Interior Design', r), templateId, quiet: true })
    if (ok) setSent((s) => [...s, r.id])
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
      <Card className="flex flex-col gap-5 p-5">
        <div>
          <p className="display text-[1.5rem]">1. Para quem</p>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-linho/70 p-1">
            {(['clients', 'leads'] as const).map((a) => (
              <button key={a} onClick={() => (setAudience(a), setExcluded([]))} className={cx('h-8 rounded-full text-[0.82rem] transition', audience === a ? 'bg-white shadow-sm' : 'text-nogueira/60')}>
                {a === 'clients' ? `Clientes (${clients.length})` : `Pedidos (${leads.length})`}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {audience === 'clients'
              ? (['Ativo', 'Potencial', 'Arquivado'] as const).map((s) => <Chip key={s} on={clientStatuses.includes(s)} onClick={() => setClientStatuses((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]))}>{s}</Chip>)
              : LEAD_STATUSES.map((s) => <Chip key={s} on={leadStatuses.includes(s)} onClick={() => setLeadStatuses((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]))}>{s}</Chip>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Cidade">
              <select className="field" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Todas</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Sem contacto há">
              <select className="field" value={quietDays} onChange={(e) => setQuietDays(Number(e.target.value))}>
                <option value={0}>Indiferente</option>
                <option value={14}>2 semanas</option>
                <option value={30}>1 mês</option>
                <option value={90}>3 meses</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="border-t border-linha pt-5">
          <p className="display text-[1.5rem]">2. A mensagem</p>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-linho/70 p-1">
            {(['WhatsApp', 'Email'] as const).map((c) => (
              <button key={c} onClick={() => setChannel(c)} className={cx('flex h-8 items-center justify-center gap-1.5 rounded-full text-[0.82rem] transition', channel === c ? 'bg-white shadow-sm' : 'text-nogueira/60')}>
                {c === 'WhatsApp' ? <MessageCircle className="size-3.5" /> : <Mail className="size-3.5" />} {c}
              </button>
            ))}
          </div>
          <Field label="Modelo" className="mt-3">
            <select className="field" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          {channel === 'Email' && (
            <Field label="Assunto" className="mt-3">
              <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          )}
          <Field label="Texto" hint="As variáveis são preenchidas para cada pessoa" className="mt-3">
            <textarea rows={7} className="field resize-y text-[0.84rem] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <VariableChips onPick={(v) => setBody((b) => `${b}${v}`)} />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="display text-[1.5rem]">3. Enviar</p>
              <p className="mt-1 text-[0.8rem] text-taupe">
                {queue.length} destinatários{pool.length > recipients.length ? `, ${pool.length - recipients.length} sem ${channel === 'WhatsApp' ? 'telefone' : 'email'} ou contactados recentemente` : ''}
              </p>
            </div>
            <Button onClick={() => next && fire(next)} disabled={!next || !body.trim()}>
              <Send className="size-4" />
              {next ? `Enviar a ${next.name.split(' ')[0]}` : queue.length ? 'Campanha concluída' : 'Ninguém a enviar'}
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1">
              <Progress value={queue.length ? (done / queue.length) * 100 : 0} />
            </div>
            <span className="tabular text-[0.78rem] text-taupe">
              {done} / {queue.length} enviados
            </span>
          </div>
          <p className="mt-3 text-[0.74rem] text-taupe">Cada mensagem abre no {channel === 'WhatsApp' ? 'WhatsApp' : 'programa de email'} já escrita: só tem de tocar em enviar e voltar aqui para a seguinte.</p>
        </Card>

        {recipients.length === 0 ? (
          <EmptyState icon={<Users className="size-5" />} title="Ninguém neste filtro" text="Alargue o público ou escolha outro canal." />
        ) : (
          <ul className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-linha/80 divide-y divide-linha/70">
            {recipients.map((r) => {
              const isSent = sent.includes(r.id)
              const off = excluded.includes(r.id)
              const last = lastContact(outreach, r.kind, r.id)
              return (
                <li key={r.id} className={cx('flex items-start gap-3 px-4 py-3 sm:px-5', off && 'opacity-45')}>
                  <input type="checkbox" checked={!off} onChange={() => setExcluded((l) => (off ? l.filter((x) => x !== r.id) : [...l, r.id]))} aria-label={`Incluir ${r.name}`} className="mt-1.5 accent-[#9a5934]" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[0.88rem]">
                      <span className="truncate">{r.name}</span>
                      {isSent && <Badge tone="green">Enviado</Badge>}
                    </p>
                    <p className="truncate text-[0.74rem] text-taupe">
                      {channel === 'WhatsApp' ? r.phone : r.email} · {last ? `último contacto ${shortDate(last.sentAt.slice(0, 10))}` : 'nunca contactado'}
                    </p>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[0.74rem] text-cognac-deep">Ver mensagem</summary>
                      <p className="mt-1.5 rounded-xl bg-linho/40 px-3 py-2 text-[0.78rem] leading-relaxed whitespace-pre-line text-nogueira/80">{fillTemplate(body, r)}</p>
                    </details>
                  </div>
                  <button
                    onClick={() => fire(r)}
                    disabled={off || !body.trim()}
                    className={cx('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] transition disabled:opacity-40', isSent ? 'bg-linho/60 text-nogueira/70' : channel === 'WhatsApp' ? 'bg-palma text-marfim' : 'bg-nogueira text-marfim')}
                  >
                    {isSent ? <Check className="size-3.5" /> : channel === 'WhatsApp' ? <MessageCircle className="size-3.5" /> : <Mail className="size-3.5" />}
                    {isSent ? 'Reenviar' : 'Enviar'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx('rounded-full px-3 py-1.5 text-[0.78rem] transition', on ? 'bg-nogueira text-marfim' : 'bg-white ring-1 ring-linha hover:ring-taupe/40')}>
      {children}
    </button>
  )
}

function VariableChips({ onPick }: { onPick: (v: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {TEMPLATE_VARIABLES.map((v) => (
        <button key={v} type="button" onClick={() => onPick(v)} className="rounded-md bg-[#f4ead9] px-1.5 py-0.5 font-mono text-[0.68rem] text-cognac-deep hover:bg-[#efe1c9]">
          {v}
        </button>
      ))}
    </div>
  )
}

// Templates ---------------------------------------------------------------------

function Templates() {
  const workspace = useWorkspace()
  const templates = templatesOf(workspace)
  const { save, remove } = useMutations()
  const [editing, setEditing] = useState<MessageTemplate | 'new' | null>(null)
  const [deleting, setDeleting] = useState<MessageTemplate | null>(null)
  const suggested = templates.some(isSuggested)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[0.84rem] text-taupe">
          {suggested ? 'Modelos sugeridos para começar. Edite-os à sua maneira: ficam guardados como seus.' : 'As suas mensagens prontas a enviar. Use as variáveis para personalizar cada envio.'}
        </p>
        <div className="flex gap-2">
          {suggested && (
            <Button
              variant="secondary"
              onClick={async () => {
                for (const t of templates) {
                  const { id: _id, ...rest } = t
                  await save('templates', rest, null)
                }
              }}
            >
              <Check className="size-4" /> Guardar todos
            </Button>
          )}
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Novo modelo
          </Button>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {templates.map((t, i) => (
          <motion.li key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}>
            <Card className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="display truncate text-[1.35rem]">{t.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="cognac">{t.purpose}</Badge>
                    <Badge>{t.channel}</Badge>
                    {isSuggested(t) && <Badge tone="amber">Sugestão</Badge>}
                  </div>
                </div>
                <div className="flex shrink-0">
                  <IconButton label="Editar modelo" onClick={() => setEditing(t)}>
                    <Pencil className="size-3.5" />
                  </IconButton>
                  {!isSuggested(t) && (
                    <IconButton label="Eliminar modelo" onClick={() => setDeleting(t)} className="hover:text-[#a23b2a]">
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  )}
                </div>
              </div>
              {t.subject && <p className="mt-3 text-[0.78rem] text-taupe">Assunto: {t.subject}</p>}
              <p className="mt-2 line-clamp-6 text-[0.84rem] leading-relaxed whitespace-pre-line text-nogueira/80">{t.body}</p>
            </Card>
          </motion.li>
        ))}
      </ul>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo modelo' : 'Editar modelo'} wide>
        {editing && (
          <TemplateForm
            key={editing === 'new' ? 'new' : editing.id}
            template={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (t) => {
              // A suggestion becomes the studio's own template when edited.
              const { id, ...rest } = t
              await save('templates', id && !id.startsWith('sug-') ? t : rest, 'Modelo guardado')
              setEditing(null)
            }}
          />
        )}
      </Modal>
      <ConfirmDelete open={Boolean(deleting)} onClose={() => setDeleting(null)} what={deleting?.name ?? 'O modelo'} onConfirm={() => deleting && remove('templates', deleting.id, 'Modelo eliminado')} />
    </div>
  )
}

function TemplateForm({ template, onCancel, onSave }: { template: MessageTemplate | null; onCancel: () => void; onSave: (t: Omit<MessageTemplate, 'id'> & { id?: string }) => Promise<void> }) {
  const [form, setForm] = useState<Omit<MessageTemplate, 'id'> & { id?: string }>(template ?? { name: '', purpose: 'Promoção', channel: 'WhatsApp', body: 'Olá {primeiro_nome}, ' })
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))
  const preview = fillTemplate(form.body, { name: 'Aminata Djaló', city: 'Bissau', project: 'Moradia Djaló', services: 'projeto 3D e mobiliário à medida' })

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
      <Field label="Nome do modelo" className="sm:col-span-2">
        <input required className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Promoção de cortinados" />
      </Field>
      <Field label="Objetivo">
        <select className="field" value={form.purpose} onChange={(e) => set('purpose', e.target.value as MessageTemplate['purpose'])}>
          {TEMPLATE_PURPOSES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="Canal">
        <select className="field" value={form.channel} onChange={(e) => set('channel', e.target.value as MessageTemplate['channel'])}>
          {MESSAGE_CHANNELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {form.channel !== 'WhatsApp' && (
        <Field label="Assunto do email" className="sm:col-span-2">
          <input className="field" value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value || undefined)} />
        </Field>
      )}
      <div className="sm:col-span-2">
        <Field label="Texto">
          <textarea required rows={7} className="field resize-y leading-relaxed" value={form.body} onChange={(e) => set('body', e.target.value)} />
        </Field>
        <VariableChips onPick={(v) => set('body', `${form.body}${v}`)} />
      </div>
      <div className="rounded-2xl bg-[#e7ecdf]/60 p-4 sm:col-span-2">
        <p className="text-[0.72rem] text-taupe">Pré-visualização</p>
        <p className="mt-1.5 text-[0.84rem] leading-relaxed whitespace-pre-line">{preview}</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-linha pt-4 sm:col-span-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'A guardar…' : 'Guardar modelo'}
        </Button>
      </div>
    </form>
  )
}

// Social studio ----------------------------------------------------------------

type PostDraft = Omit<SocialPost, 'id'> & { id?: string }

const CAPTION_STYLES = ['Projeto entregue', 'Antes e depois', 'Bastidores', 'Detalhe'] as const

function captionFor(style: (typeof CAPTION_STYLES)[number], project: Project | undefined, city: string) {
  const name = project?.name ?? 'Novo projeto'
  const where = project?.location || city
  const styles = project?.styles?.length ? project.styles.join(' e ').toLowerCase() : undefined
  const cta = 'Quer transformar o seu espaço? Peça o seu orçamento pelo link na bio ou envie-nos mensagem no WhatsApp.'
  switch (style) {
    case 'Antes e depois':
      return `Antes ➝ depois ✨\n\n${name}, ${where}. Deslize para ver a transformação.\n\n${project?.description ?? 'Cada detalhe pensado à medida de quem lá vive.'}\n\n${cta}`
    case 'Bastidores':
      return `Bastidores da obra 🛠️\n\n${name} está a ganhar forma em ${where}. Mobiliário produzido na nossa fábrica, montado pela nossa equipa.\n\nAcompanhe as próximas etapas por aqui.`
    case 'Detalhe':
      return `O detalhe faz o espaço.\n\n${project?.materialsLove ? `${project.materialsLove}.` : 'Materiais naturais, linhas simples e luz.'} ${name}, ${where}.\n\n${cta}`
    default:
      return `${name} ✨\n\n${project?.description ?? `Um projeto ${styles ? `${styles} ` : ''}assinado pela Quennie em ${where}.`}\n\n${project?.services?.length ? `${project.services.join(' · ')}\n\n` : ''}${cta}`
  }
}

function SocialStudio({ projectId, photo, onConsumed }: { projectId?: string; photo?: string; onConsumed: () => void }) {
  const { posts, projects, clients } = useWorkspace()
  const { save, remove } = useMutations()
  const [editing, setEditing] = useState<PostDraft | null>(null)
  const [deleting, setDeleting] = useState<SocialPost | null>(null)
  const today = todayIso()

  const blank = (pid?: string, image?: string): PostDraft => {
    const project = projects.find((p) => p.id === pid)
    const city = clients.find((c) => c.id === project?.clientId)?.city ?? 'Bissau'
    return {
      title: project?.name ?? '',
      caption: captionFor(image && project?.photos?.find((p) => p.url === image)?.stage === 'Antes' ? 'Antes e depois' : 'Projeto entregue', project, city),
      hashtags: [...DEFAULT_HASHTAGS],
      images: image ? [image] : project ? [project.cover] : [],
      platforms: ['Instagram', 'Facebook'],
      status: 'Ideia',
      projectId: pid,
    }
  }

  // Arriving from a project photo ("Criar publicação") opens the editor once.
  useEffect(() => {
    if (!projectId && !photo) return
    setEditing(blank(projectId, photo))
    onConsumed()
  }, [projectId, photo]) // eslint-disable-line react-hooks/exhaustive-deps

  const weekEnd = addDays(today, 7)
  const groups = [
    { title: 'Esta semana', items: posts.filter((p) => p.status === 'Agendado' && p.scheduledFor && p.scheduledFor <= weekEnd) },
    { title: 'Mais tarde', items: posts.filter((p) => p.status === 'Agendado' && (!p.scheduledFor || p.scheduledFor > weekEnd)) },
    { title: 'Ideias', items: posts.filter((p) => p.status === 'Ideia') },
    { title: 'Publicadas', items: posts.filter((p) => p.status === 'Publicado') },
  ].map((g) => ({ ...g, items: g.items.sort((a, b) => (a.scheduledFor ?? '9').localeCompare(b.scheduledFor ?? '9')) }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[0.84rem] text-taupe">Prepare as publicações com as fotografias dos projetos: legenda, hashtags e data. No telemóvel, "Partilhar" envia as fotos e a legenda diretamente para o Instagram, Facebook ou WhatsApp.</p>
        <Button onClick={() => setEditing(blank())}>
          <Plus className="size-4" /> Nova publicação
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-5" />} title="Nenhuma publicação" text="Comece por um projeto: abra uma fotografia e toque em 'Criar publicação', ou crie uma aqui." action={<Button onClick={() => setEditing(blank())}>Nova publicação</Button>} />
      ) : (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.title}>
              <h2 className="display mb-3 px-1 text-[1.6rem]">{g.title}</h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {g.items.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} onEdit={() => setEditing(post)} onDelete={() => setDeleting(post)} onPublished={() => save('posts', { ...post, status: 'Publicado', scheduledFor: post.scheduledFor ?? today }, 'Marcada como publicada')} />
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Editar publicação' : 'Nova publicação'} wide>
        {editing && (
          <PostForm
            key={editing.id ?? 'new'}
            draft={editing}
            onCancel={() => setEditing(null)}
            onSave={async (d) => {
              await save('posts', d, d.id ? 'Publicação atualizada' : 'Publicação criada')
              setEditing(null)
            }}
          />
        )}
      </Modal>
      <ConfirmDelete open={Boolean(deleting)} onClose={() => setDeleting(null)} what={deleting?.title || 'A publicação'} onConfirm={() => deleting && remove('posts', deleting.id, 'Publicação eliminada')} />
    </div>
  )
}

const fullCaption = (p: Pick<SocialPost, 'caption' | 'hashtags'>) => `${p.caption.trim()}${p.hashtags.length ? `\n\n${p.hashtags.join(' ')}` : ''}`

async function imageFiles(urls: string[]) {
  return Promise.all(
    urls.map(async (url, i) => {
      const blob = await (await fetch(url)).blob()
      const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
      return new File([blob], `quennie-${i + 1}.${ext}`, { type: blob.type })
    }),
  )
}

function PostCard({ post, onEdit, onDelete, onPublished }: { post: SocialPost; onEdit: () => void; onDelete: () => void; onPublished: () => void }) {
  const { projects } = useWorkspace()
  const toast = useToast()
  const project = projects.find((p) => p.id === post.projectId)
  const text = fullCaption(post)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    toast('Legenda copiada')
  }
  const download = async () => {
    for (const file of await imageFiles(post.images)) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file)
      a.download = file.name
      a.click()
      URL.revokeObjectURL(a.href)
    }
  }
  const share = async () => {
    try {
      const files = await imageFiles(post.images)
      if (navigator.canShare?.({ files })) {
        // Instagram ignores shared text, so the caption also goes to the clipboard.
        await navigator.clipboard.writeText(text).catch(() => {})
        await navigator.share({ files, text, title: post.title })
        toast('Legenda copiada: cole-a na publicação')
        return
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
    await copy()
    await download()
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-square bg-linho">
        {post.images[0] ? <img src={post.images[0]} alt="" loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-taupe">Sem imagem</span>}
        {post.images.length > 1 && <span className="tabular absolute top-3 right-3 rounded-full bg-nogueira/60 px-2 py-0.5 text-[0.7rem] text-marfim backdrop-blur">1/{post.images.length}</span>}
        <Badge tone={postStatusTone[post.status]} className="absolute top-3 left-3 bg-white/90 backdrop-blur">
          {post.status}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[0.92rem]">{post.title || project?.name || 'Publicação'}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[0.72rem] text-taupe">
              <CalendarDays className="size-3" />
              {post.scheduledFor ? `${weekday(post.scheduledFor)}, ${shortDate(post.scheduledFor)}` : 'Sem data'} · {post.platforms.join(', ')}
            </p>
          </div>
          <div className="flex shrink-0">
            <IconButton label="Editar" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </IconButton>
            <IconButton label="Eliminar" onClick={onDelete} className="hover:text-[#a23b2a]">
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        </div>
        <p className="mt-2 line-clamp-3 text-[0.8rem] leading-relaxed whitespace-pre-line text-nogueira/75">{post.caption}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          <Button size="sm" onClick={share}>
            <Share2 className="size-3.5" /> Partilhar
          </Button>
          <Button size="sm" variant="secondary" onClick={copy}>
            <Copy className="size-3.5" /> Legenda
          </Button>
          <Button size="sm" variant="ghost" onClick={download} aria-label="Descarregar fotografias">
            <Download className="size-3.5" />
          </Button>
          {post.status !== 'Publicado' && (
            <Button size="sm" variant="ghost" onClick={onPublished}>
              <Check className="size-3.5" /> Publicada
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function PostForm({ draft, onCancel, onSave }: { draft: PostDraft; onCancel: () => void; onSave: (d: PostDraft) => Promise<void> }) {
  const { projects, inspirations, clients } = useWorkspace()
  const toast = useToast()
  const [form, setForm] = useState<PostDraft>(draft)
  const [tags, setTags] = useState(draft.hashtags.join(' '))
  const [styleIndex, setStyleIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) => setForm((f) => ({ ...f, [key]: value }))
  const project = projects.find((p) => p.id === form.projectId)

  // Project photos first, then every other project's photos and covers, then the moodboard.
  const library = [
    ...(project ? [...(project.photos ?? []).map((p) => p.url), project.cover] : []),
    ...form.images,
    ...projects.flatMap((p) => [...(p.photos ?? []).map((x) => x.url), p.cover]),
    ...inspirations.map((i) => i.image),
  ]
  const choices = [...new Set(library)].slice(0, 36)
  const toggleImage = (url: string) => set('images', form.images.includes(url) ? form.images.filter((u) => u !== url) : form.images.length >= 10 ? form.images : [...form.images, url])

  const generate = () => {
    const style = CAPTION_STYLES[styleIndex % CAPTION_STYLES.length]
    setStyleIndex((i) => i + 1)
    set('caption', captionFor(style, project, clients.find((c) => c.id === project?.clientId)?.city ?? 'Bissau'))
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const f of [...files].slice(0, 10)) urls.push((await uploadMedia({ data: { dataUrl: await fileToDataUrl(f, 1800) } })).url)
      setForm((f) => ({ ...f, images: [...f.images, ...urls].slice(0, 10) }))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível carregar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        const hashtags = tags
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((t) => (t.startsWith('#') ? t : `#${t}`))
        await onSave({ ...form, hashtags, status: form.status === 'Ideia' && form.scheduledFor ? 'Agendado' : form.status })
        setBusy(false)
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Título interno">
        <input className="field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Antes e depois sala Djaló" />
      </Field>
      <Field label="Projeto">
        <select className="field" value={form.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || undefined)}>
          <option value="">Nenhum</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="sm:col-span-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.78rem] text-nogueira/70">
            Fotografias <span className="tabular text-taupe">({form.images.length}/10, pela ordem escolhida)</span>
          </span>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1 text-[0.76rem] text-cognac-deep hover:text-nogueira disabled:opacity-50">
            <ImagePlus className="size-3.5" /> {uploading ? 'A carregar…' : 'Carregar'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
        </div>
        <div className="scrollbar-none mt-1.5 grid max-h-56 grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-8">
          {choices.map((url) => {
            const order = form.images.indexOf(url)
            return (
              <button type="button" key={url} onClick={() => toggleImage(url)} aria-pressed={order >= 0} className={cx('relative aspect-square overflow-hidden rounded-lg ring-2 transition', order >= 0 ? 'ring-cognac' : 'ring-transparent opacity-75 hover:opacity-100')}>
                <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                {order >= 0 && <span className="tabular absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-cognac text-[0.66rem] text-marfim">{order + 1}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="sm:col-span-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.78rem] text-nogueira/70">Legenda</span>
          <button type="button" onClick={generate} className="flex items-center gap-1 text-[0.76rem] text-cognac-deep hover:text-nogueira">
            <Wand2 className="size-3.5" /> Gerar: {CAPTION_STYLES[styleIndex % CAPTION_STYLES.length]}
          </button>
        </div>
        <textarea rows={7} className="field mt-1.5 resize-y leading-relaxed" value={form.caption} onChange={(e) => set('caption', e.target.value)} />
      </div>
      <Field label="Hashtags" className="sm:col-span-2">
        <input className="field text-[0.84rem]" value={tags} onChange={(e) => setTags(e.target.value)} />
      </Field>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-[0.78rem] text-nogueira/70">Onde publicar</span>
        <div className="flex flex-wrap gap-1.5">
          {SOCIAL_PLATFORMS.map((p) => (
            <Chip key={p} on={form.platforms.includes(p)} onClick={() => set('platforms', form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p as SocialPlatform])}>
              {p}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="Data de publicação">
        <input type="date" className="field" value={form.scheduledFor ?? ''} onChange={(e) => set('scheduledFor', e.target.value || undefined)} />
      </Field>
      <Field label="Estado">
        <select className="field" value={form.status} onChange={(e) => set('status', e.target.value as SocialPost['status'])}>
          {POST_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>

      <div className="flex justify-end gap-2 border-t border-linha pt-4 sm:col-span-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy || uploading}>
          <Sparkles className="size-4" />
          {busy ? 'A guardar…' : 'Guardar publicação'}
        </Button>
      </div>
    </form>
  )
}
