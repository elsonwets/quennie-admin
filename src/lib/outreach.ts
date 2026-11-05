import { useCallback } from 'react'
import type { Client, Lead, MessageTemplate, Outreach, Project, Workspace } from './types'
import { useMutations, useWorkspace } from './workspace'

// One-click prospection: messages leave through the studio's own WhatsApp and mail app
// (wa.me / mailto links), so there is no API account, no cost per message, and replies
// land where Quennie already reads them. Each send is logged as an Outreach record.

/** Default country when a number is written without one: Guiné-Bissau. */
const DEFAULT_PREFIX = '245'
const KNOWN_PREFIXES = ['245', '221', '351', '238', '33', '1', '44', '34']

/** Digits only, international form, as wa.me expects: "955 412 300" → "245955412300". */
export function normalizePhone(phone?: string) {
  if (!phone) return ''
  const trimmed = phone.trim()
  let digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('00')) digits = digits.slice(2)
  if (!digits) return ''
  if (trimmed.startsWith('+') || trimmed.startsWith('00')) return digits
  if (digits.length > 9 && KNOWN_PREFIXES.some((p) => digits.startsWith(p))) return digits
  return DEFAULT_PREFIX + digits.replace(/^0+/, '')
}

export const waLink = (phone: string | undefined, text: string) => {
  const number = normalizePhone(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : ''
}

export const mailtoLink = (email: string | undefined, subject: string, body: string) =>
  email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : ''

export interface Recipient {
  kind: 'lead' | 'client'
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  project?: string
  services?: string
}

export const recipientFromLead = (lead: Lead, projects: Project[] = []): Recipient => ({
  kind: 'lead',
  id: lead.id,
  name: lead.name,
  phone: lead.phone,
  email: lead.email,
  city: lead.city ?? lead.country,
  project: projects.find((p) => p.id === lead.projectId)?.name ?? lead.space?.toLowerCase(),
  services: lead.services.join(', ').toLowerCase(),
})

export const recipientFromClient = (client: Client, projects: Project[] = []): Recipient => {
  const project = projects.filter((p) => p.clientId === client.id).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
  return {
    kind: 'client',
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    city: client.city,
    project: project?.name,
    services: project?.services?.join(', ').toLowerCase(),
  }
}

export const TEMPLATE_VARIABLES = ['{nome}', '{primeiro_nome}', '{projeto}', '{cidade}', '{servicos}'] as const

/** Replaces the variables; a missing value falls back to a neutral word so the text still reads. */
export function fillTemplate(text: string, r: Partial<Recipient>) {
  const first = r.name?.trim().split(/\s+/)[0] ?? ''
  return text
    .replaceAll('{nome}', r.name?.trim() || 'cliente')
    .replaceAll('{primeiro_nome}', first || 'olá')
    .replaceAll('{projeto}', r.project || 'o seu espaço')
    .replaceAll('{cidade}', r.city || 'Bissau')
    .replaceAll('{servicos}', r.services || 'o seu projeto')
}

/** Suggested messages, used until the studio saves its own. Ids start with "sug-" so they are never written as-is. */
export const SUGGESTED_TEMPLATES: MessageTemplate[] = [
  {
    id: 'sug-resposta',
    name: 'Resposta a um pedido do site',
    purpose: 'Resposta a pedido',
    channel: 'Ambos',
    subject: 'O seu pedido de orçamento · Quennie',
    body: 'Olá {primeiro_nome}, obrigada pelo seu pedido!\n\nSou a Quennie, do estúdio Quennie Home Concept & Interior Design. Recebemos o seu interesse em {servicos} e gostaríamos de conhecer melhor o espaço.\n\nPodemos marcar uma visita ou uma chamada esta semana? Diga-me o dia e a hora que lhe dão mais jeito.\n\nAté breve,\nQuennie',
  },
  {
    id: 'sug-relance',
    name: 'Relance, sem resposta',
    purpose: 'Relance',
    channel: 'WhatsApp',
    body: 'Olá {primeiro_nome}, espero que esteja bem! Volto a contactar sobre {projeto}. Ainda está a pensar avançar? Posso enviar algumas ideias e referências sem compromisso.',
  },
  {
    id: 'sug-orcamento',
    name: 'Seguimento do orçamento',
    purpose: 'Relance',
    channel: 'Ambos',
    subject: 'A sua proposta Quennie',
    body: 'Olá {primeiro_nome}, conseguiu ver a proposta que enviámos para {projeto}? Fico disponível para ajustar o que for preciso ou explicar cada etapa numa chamada rápida.',
  },
  {
    id: 'sug-promo',
    name: 'Campanha cortinados e estores',
    purpose: 'Promoção',
    channel: 'Ambos',
    subject: 'Cortinados à medida · Quennie',
    body: 'Olá {primeiro_nome}! Este mês o atelier Quennie oferece a medição e a instalação de cortinados e estores à medida em {cidade}. Quer que passemos para medir? Responda a esta mensagem e marcamos.',
  },
  {
    id: 'sug-novidades',
    name: 'Novo projeto entregue',
    purpose: 'Novidades',
    channel: 'WhatsApp',
    body: 'Olá {primeiro_nome}! Acabámos de entregar um novo projeto e lembrei-me de si. Veja as fotos no nosso Instagram: instagram.com/quennieinteriordesign. Se quiser transformar o seu espaço, estamos por aqui.',
  },
  {
    id: 'sug-pos-entrega',
    name: 'Depois da entrega',
    purpose: 'Pós-entrega',
    channel: 'Ambos',
    subject: 'Obrigada pela confiança',
    body: 'Olá {primeiro_nome}, foi um prazer trabalhar em {projeto}. Está tudo como sonhou? Se gostou do resultado, uma recomendação a amigos ou uma foto marcada com @quennieinteriordesign ajuda-nos muito. Obrigada!',
  },
]

export const isSuggested = (t: MessageTemplate) => t.id.startsWith('sug-')

/** The studio's templates, or the suggestions while it has none. */
export const templatesOf = (w: Pick<Workspace, 'templates'>) => (w.templates.length ? w.templates : SUGGESTED_TEMPLATES)

/** The last time someone was contacted, from the log. */
export const lastContact = (outreach: Outreach[], kind: Outreach['recipientKind'], id: string) =>
  outreach.filter((o) => o.recipientKind === kind && o.recipientId === id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0]

/**
 * Opens WhatsApp or the mail app with the message, then logs it. The window is opened
 * synchronously (inside the click) so pop-up blockers let it through; the log follows.
 */
export function useSendMessage() {
  const { save } = useMutations()
  const { leads } = useWorkspace()
  return useCallback(
    (r: Recipient, channel: 'WhatsApp' | 'Email', text: string, opts: { subject?: string; templateId?: string; quiet?: boolean } = {}) => {
      const href = channel === 'WhatsApp' ? waLink(r.phone, text) : mailtoLink(r.email, opts.subject ?? 'Quennie Interior Design', text)
      if (!href) return false
      if (channel === 'WhatsApp') window.open(href, '_blank', 'noopener')
      else window.location.href = href
      const templateId = opts.templateId && !opts.templateId.startsWith('sug-') ? opts.templateId : undefined
      void save('outreach', { recipientKind: r.kind, recipientId: r.id, channel, templateId, text, sentAt: new Date().toISOString() }, opts.quiet ? null : `Mensagem registada (${channel})`)
      // A first reply moves a new request forward on its own.
      const lead = r.kind === 'lead' ? leads.find((l) => l.id === r.id) : undefined
      if (lead?.status === 'Novo') void save('leads', { ...lead, status: 'Contactado' }, null)
      return true
    },
    [save, leads],
  )
}

export const DEFAULT_HASHTAGS = ['#quennie', '#interiordesign', '#designdeinteriores', '#homeconcept', '#bissau', '#guinebissau', '#decoracao', '#interiores']
