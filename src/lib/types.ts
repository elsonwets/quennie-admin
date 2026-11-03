export type ClientType = 'Particular' | 'Empresa' | 'Hotelaria' | 'Restauração'
export type ClientStatus = 'Ativo' | 'Potencial' | 'Arquivado'

export interface Client {
  id: string
  name: string
  company?: string
  email: string
  phone: string
  city: string
  country: string
  type: ClientType
  status: ClientStatus
  since: string
  notes?: string
}

export const PROJECT_PHASES = ['Conceito', 'Projeto 3D', 'Encomendas', 'Obra', 'Entrega', 'Concluído'] as const
export type ProjectPhase = (typeof PROJECT_PHASES)[number]

export interface Project {
  id: string
  name: string
  clientId: string
  location: string
  phase: ProjectPhase
  progress: number
  budget: number
  spent: number
  startDate: string
  dueDate: string
  cover: string
  rooms: string[]
  description?: string

  // Brief, filled from the new-project form. All optional so older records stay valid.
  type?: ProjectType
  services?: ProjectService[]
  leadSource?: LeadSource
  priority?: ProjectPriority
  address?: string
  propertyType?: PropertyType
  condition?: PropertyCondition
  area?: number
  floors?: number
  occupants?: string
  constraints?: string
  styles?: string[]
  palette?: string[]
  materialsLove?: string
  materialsAvoid?: string
  keepItems?: string
  budgetFlex?: BudgetFlex
  feeModel?: FeeModel
  /** Percent of the works, flat amount, or amount per m², depending on feeModel. */
  feeValue?: number
  /** Share of the fee invoiced at signature, 0 to 1. */
  depositRate?: number
  /** Why the delivery date cannot move (opening, wedding, move-in). Empty when it can. */
  hardDeadline?: string
  contacts?: ProjectContact[]
  kickoff?: KickoffStep[]
}

export const PROJECT_TYPES = ['Residencial', 'Escritório', 'Hotelaria', 'Restauração', 'Comércio'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PROJECT_SERVICES = ['Consultoria', 'Projeto 3D', 'Mobiliário à medida', 'Acompanhamento de obra', 'Chave na mão', 'Styling e decoração'] as const
export type ProjectService = (typeof PROJECT_SERVICES)[number]

export const LEAD_SOURCES = ['Instagram', 'TikTok', 'Recomendação', 'Cliente antigo', 'Site', 'Outro'] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const PROJECT_PRIORITIES = ['Normal', 'Alta', 'Urgente'] as const
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number]

export const PROPERTY_TYPES = ['Apartamento', 'Moradia', 'Escritório', 'Loja', 'Hotel', 'Restaurante', 'Outro'] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const PROPERTY_CONDITIONS = ['Obra nova', 'Renovação', 'Ocupado, só decoração'] as const
export type PropertyCondition = (typeof PROPERTY_CONDITIONS)[number]

export const DESIGN_STYLES = ['Contemporâneo', 'Minimalista', 'Afro-contemporâneo', 'Japandi', 'Clássico chique', 'Tropical', 'Industrial', 'Boémio', 'Mediterrânico'] as const

export const COMMON_ROOMS = ['Sala de estar', 'Sala de jantar', 'Cozinha', 'Suite principal', 'Quarto', 'Quarto de criança', 'Casa de banho', 'Escritório', 'Hall de entrada', 'Lavandaria', 'Varanda', 'Exterior'] as const

export const BUDGET_FLEX = ['Fechado', 'Margem de 10%', 'Flexível'] as const
export type BudgetFlex = (typeof BUDGET_FLEX)[number]

export const FEE_MODELS = ['Percentagem da obra', 'Valor fixo', 'Por m²'] as const
export type FeeModel = (typeof FEE_MODELS)[number]

/** What has to happen before design work starts, in the order it usually happens. */
export const KICKOFF_STEPS = ['Briefing com o cliente', 'Visita e medições', 'Fotos do existente', 'Plantas recebidas', 'Proposta enviada', 'Contrato assinado', 'Adiantamento recebido'] as const
export type KickoffStep = (typeof KICKOFF_STEPS)[number]

export const CONTACT_ROLES = ['Decisor', 'Contacto em obra', 'Empreiteiro', 'Arquiteto', 'Administração do condomínio', 'Outro'] as const

export interface ProjectContact {
  role: string
  name: string
  phone?: string
}

export const PRODUCT_CATEGORIES = ['Mobiliário', 'Iluminação', 'Têxteis', 'Materiais', 'Decoração', 'Exterior'] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export type UsageStatus = 'Proposto' | 'Encomendado' | 'Entregue'

export interface ProductUsage {
  projectId: string
  room: string
  quantity: number
  status: UsageStatus
}

export interface Product {
  id: string
  name: string
  maker: string
  category: ProductCategory
  price: number
  unit: string
  finish: string
  dimensions: string
  material: string
  leadTime: string
  image: string
  usage: ProductUsage[]
  supplierUrl?: string
}

export type InvoiceStatus = 'Rascunho' | 'Enviada' | 'Paga' | 'Em atraso'

export interface InvoiceLine {
  description: string
  quantity: number
  unitPrice: number
}

export interface Invoice {
  id: string
  number: string
  clientId: string
  projectId?: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  vatRate: number
  lines: InvoiceLine[]
  notes?: string
}

export const APPOINTMENT_TYPES = ['Reunião', 'Visita técnica', 'Medições', 'Montagem', 'Entrega', 'Fornecedor'] as const
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number]

export interface Appointment {
  id: string
  title: string
  type: AppointmentType
  date: string
  start: string
  end: string
  clientId?: string
  projectId?: string
  location: string
  notes?: string
}

export const INSPIRATION_SOURCES = ['Instagram', 'Pinterest', 'Fornecedor', 'Viagem', 'Obra', 'Própria'] as const
export type InspirationSource = (typeof INSPIRATION_SOURCES)[number]

/** A saved reference: a photo, the board it belongs to and the colours it carries. */
export interface Inspiration {
  id: string
  title: string
  image: string
  board: string
  source: InspirationSource
  tags: string[]
  palette: string[]
  projectId?: string
  link?: string
  note?: string
  favorite?: boolean
  savedAt: string
}

export interface Workspace {
  clients: Client[]
  projects: Project[]
  products: Product[]
  invoices: Invoice[]
  appointments: Appointment[]
  inspirations: Inspiration[]
}

export type Collection = keyof Workspace
