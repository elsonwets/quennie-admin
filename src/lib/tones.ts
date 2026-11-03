import type { Tone } from '~/components/ui'
import type { ClientStatus, InvoiceStatus, ProjectPhase, UsageStatus } from './types'

export const phaseTone: Record<ProjectPhase, Tone> = {
  Conceito: 'amber',
  'Projeto 3D': 'cognac',
  Encomendas: 'cognac',
  Obra: 'green',
  Entrega: 'green',
  Concluído: 'neutral',
}

export const usageTone: Record<UsageStatus, Tone> = { Proposto: 'amber', Encomendado: 'cognac', Entregue: 'green' }

export const clientStatusTone: Record<ClientStatus, Tone> = { Ativo: 'green', Potencial: 'amber', Arquivado: 'neutral' }

export const invoiceTone: Record<InvoiceStatus, Tone> = { Rascunho: 'neutral', Enviada: 'amber', Paga: 'green', 'Em atraso': 'red' }
