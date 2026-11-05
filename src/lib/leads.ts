import { daysBetween, todayIso } from './format'
import type { Lead, LeadStatus } from './types'

const OPEN: LeadStatus[] = ['Novo', 'Contactado', 'Orçamento enviado']

export const isOpenLead = (l: Lead) => OPEN.includes(l.status)

/** Open requests whose follow-up date has come, or new ones left unanswered for two days. */
export const needsFollowUp = (l: Lead, today = todayIso()) =>
  isOpenLead(l) && ((l.nextFollowUp !== undefined && l.nextFollowUp <= today) || (l.status === 'Novo' && daysBetween(l.receivedAt.slice(0, 10), today) >= 2))

/** "há 3 dias", "ontem", "hoje" */
export const ago = (iso: string) => {
  const d = daysBetween(iso.slice(0, 10), todayIso())
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}
