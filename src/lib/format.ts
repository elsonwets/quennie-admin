import type { Invoice, Project } from './types'

// Franc CFA (XOF): no subunit, spaced thousands, "FCFA" after the amount as on Bissau and Dakar invoices.
const grouped = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const NBSP = '\u00a0'

export const CURRENCY = 'FCFA'

/** 1 870 000 FCFA */
export const money = (value: number) => `${grouped.format(Math.round(value))}${NBSP}${CURRENCY}`
/** FCFA has no cents: kept as an alias for invoice lines. */
export const moneyExact = money
/** Amount without the currency, for large display figures with a separate unit. */
export const amount = (value: number) => grouped.format(Math.round(value))

/** 31,5 M or 870 k (no currency), for tight spaces such as tiles and chips. */
export const amountShort = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${oneDecimal.format(value / 1_000_000_000)}${NBSP}Md`
  if (abs >= 1_000_000) return `${oneDecimal.format(value / 1_000_000)}${NBSP}M`
  if (abs >= 10_000) return `${grouped.format(value / 1000)}${NBSP}k`
  return amount(value)
}

export const moneyShort = (value: number) => `${amountShort(value)}${NBSP}${CURRENCY}`

/** Default VAT on new invoices (IVA, Guiné-Bissau). Editable per invoice. */
export const DEFAULT_VAT = 0.19

const parse = (iso: string) => new Date(`${iso}T12:00:00`)

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const shortDate = (iso: string) => {
  const d = parse(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export const longDate = (iso: string) =>
  parse(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

export const weekday = (iso: string, style: 'short' | 'long' = 'short') =>
  parse(iso).toLocaleDateString('pt-PT', { weekday: style }).replace('.', '')

export const todayIso = () => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export const addDays = (iso: string, days: number) => {
  const d = parse(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const daysBetween = (from: string, to: string) =>
  Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000)

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export const invoiceSubtotal = (invoice: Invoice) =>
  invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)

export const invoiceTotal = (invoice: Invoice) => invoiceSubtotal(invoice) * (1 + invoice.vatRate)

/** Studio fee for a project, from its fee model. Undefined until a model and value are set. */
export const projectFee = (p: Pick<Project, 'feeModel' | 'feeValue' | 'budget' | 'area'>) => {
  if (!p.feeModel || !p.feeValue) return undefined
  if (p.feeModel === 'Percentagem da obra') return (p.budget * p.feeValue) / 100
  if (p.feeModel === 'Por m²') return p.area ? p.area * p.feeValue : undefined
  return p.feeValue
}
