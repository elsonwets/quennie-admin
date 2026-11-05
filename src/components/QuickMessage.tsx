import { useEffect, useMemo, useState } from 'react'
import { Mail, MessageCircle } from 'lucide-react'
import { fillTemplate, normalizePhone, templatesOf, useSendMessage, type Recipient } from '~/lib/outreach'
import type { TemplatePurpose } from '~/lib/types'
import { useWorkspace } from '~/lib/workspace'
import { shortDate } from '~/lib/format'
import { cx } from './ui'

/** Pick a template, adjust the words, send by WhatsApp or email in one tap. */
export function QuickMessage({ recipient, purpose }: { recipient: Recipient; purpose?: TemplatePurpose }) {
  const workspace = useWorkspace()
  const templates = templatesOf(workspace)
  const send = useSendMessage()
  const initial = useMemo(() => templates.find((t) => t.purpose === purpose) ?? templates[0], [templates, purpose])
  const [templateId, setTemplateId] = useState(initial?.id ?? '')
  const template = templates.find((t) => t.id === templateId)
  const [text, setText] = useState('')

  // A new person or template starts from the template's words again.
  useEffect(() => setTemplateId(initial?.id ?? ''), [recipient.id, initial?.id])
  useEffect(() => setText(template ? fillTemplate(template.body, recipient) : ''), [template?.id, template?.body, recipient.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasPhone = Boolean(normalizePhone(recipient.phone))
  const hasEmail = Boolean(recipient.email)
  const subject = template?.subject ? fillTemplate(template.subject, recipient) : 'Quennie Interior Design'

  return (
    <div className="rounded-2xl bg-linho/45 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.78rem] text-nogueira/75">Mensagem</span>
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} aria-label="Modelo de mensagem" className="min-w-0 max-w-[65%] truncate rounded-full bg-white px-2.5 py-1 text-[0.74rem] outline-none ring-1 ring-linha">
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="field mt-2 resize-y text-[0.82rem] leading-relaxed" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => send(recipient, 'WhatsApp', text, { templateId })}
          disabled={!hasPhone || !text.trim()}
          title={hasPhone ? undefined : 'Sem número de telefone'}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-palma text-[0.84rem] text-marfim transition hover:brightness-95 disabled:opacity-40"
        >
          <MessageCircle className="size-4" /> WhatsApp
        </button>
        <button
          onClick={() => send(recipient, 'Email', text, { subject, templateId })}
          disabled={!hasEmail || !text.trim()}
          title={hasEmail ? undefined : 'Sem email'}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white text-[0.84rem] text-nogueira ring-1 ring-linha transition hover:ring-taupe/40 disabled:opacity-40"
        >
          <Mail className="size-4" /> Email
        </button>
      </div>
    </div>
  )
}

/** Every message logged for one person, newest first. */
export function ContactHistory({ kind, id, className }: { kind: Recipient['kind']; id: string; className?: string }) {
  const { outreach, templates } = useWorkspace()
  const items = outreach.filter((o) => o.recipientKind === kind && o.recipientId === id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  return (
    <div className={cx('border-t border-linha pt-4', className)}>
      <p className="text-[0.8rem] text-taupe">Contactos enviados</p>
      {items.length === 0 ? (
        <p className="mt-2 text-[0.82rem] text-nogueira/70">Ainda nenhuma mensagem registada.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.slice(0, 6).map((o) => (
            <li key={o.id} className="flex gap-2.5 text-[0.8rem]">
              <span className={cx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', o.channel === 'WhatsApp' ? 'bg-[#e7ecdf] text-palma-deep' : 'bg-[#f3e4d8] text-cognac-deep')}>
                {o.channel === 'WhatsApp' ? <MessageCircle className="size-3.5" /> : <Mail className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.72rem] text-taupe">
                  {shortDate(o.sentAt.slice(0, 10))} · {templates.find((t) => t.id === o.templateId)?.name ?? o.channel}
                </span>
                <span className="line-clamp-2 text-nogueira/80">{o.text}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
