import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { addDays, daysBetween, money, projectFee, todayIso } from '~/lib/format'
import {
  BUDGET_FLEX,
  COMMON_ROOMS,
  CONTACT_ROLES,
  DESIGN_STYLES,
  FEE_MODELS,
  KICKOFF_STEPS,
  LEAD_SOURCES,
  PROJECT_PHASES,
  PROJECT_PRIORITIES,
  PROJECT_SERVICES,
  PROJECT_TYPES,
  PROPERTY_CONDITIONS,
  PROPERTY_TYPES,
  type Client,
  type Project,
  type ProjectPhase,
} from '~/lib/types'
import { useMutations, useWorkspace } from '~/lib/workspace'
import { Button, Field, IconButton, Modal, cx } from './ui'

type Draft = Omit<Project, 'id'> & { id?: string }
type NewClient = Pick<Client, 'name' | 'phone' | 'city' | 'email'>

export const PROJECT_COVERS = [
  '/media/hero-interior.jpg',
  '/media/7673540222692379911-05.webp',
  '/media/7673556834803846407-06.webp',
  '/media/7659460783184547092-05.webp',
  '/media/7652338046658039061-frame.webp',
  '/media/7673540222692379911-02.webp',
]

// The order of a first client meeting: who and what, the space, the taste, the money, then dates and people.
const STEPS = [
  { key: 'projeto', label: 'Projeto', hint: 'Cliente, tipo e serviços' },
  { key: 'espaco', label: 'Espaço', hint: 'Imóvel, divisões e ocupantes' },
  { key: 'estilo', label: 'Estilo', hint: 'Ambiente, materiais e moodboard' },
  { key: 'orcamento', label: 'Orçamento', hint: 'Budget e honorários' },
  { key: 'prazos', label: 'Prazos e equipa', hint: 'Datas, contactos e arranque' },
] as const

export type ProjectPrefill = Partial<Omit<Project, 'id'>>

export function ProjectForm({ project, onClose, onSaved, prefill }: { project: Project | 'new' | null; onClose: () => void; onSaved: (id: string) => void; prefill?: ProjectPrefill }) {
  return (
    <Modal
      open={Boolean(project)}
      onClose={onClose}
      title={project === 'new' ? 'Novo projeto' : 'Editar projeto'}
      description={project === 'new' ? 'O briefing completo do cliente. Só o nome é obrigatório, o resto pode ser completado depois.' : undefined}
      wide
    >
      {project && <ProjectFormBody key={project === 'new' ? 'new' : project.id} project={project === 'new' ? null : project} prefill={prefill} onCancel={onClose} onSaved={onSaved} />}
    </Modal>
  )
}

function ProjectFormBody({ project, prefill, onCancel, onSaved }: { project: Project | null; prefill?: ProjectPrefill; onCancel: () => void; onSaved: (id: string) => void }) {
  const { clients, inspirations } = useWorkspace()
  const { save } = useMutations()
  const [step, setStep] = useState(0)
  // Editing opens on a complete record, so every step counts as seen.
  const [visited, setVisited] = useState<number[]>(project ? STEPS.map((_, i) => i) : [0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<Draft>(
    project ?? {
      name: '',
      clientId: clients[0]?.id ?? '',
      location: '',
      phase: 'Conceito',
      progress: 0,
      budget: 15_000_000,
      spent: 0,
      startDate: todayIso(),
      dueDate: addDays(todayIso(), 90),
      cover: PROJECT_COVERS[0],
      rooms: [],
      type: 'Residencial',
      services: ['Projeto 3D'],
      priority: 'Normal',
      budgetFlex: 'Margem de 10%',
      feeModel: 'Percentagem da obra',
      feeValue: 10,
      depositRate: 0.3,
      contacts: [],
      kickoff: [],
      ...prefill,
    },
  )
  const [newClient, setNewClient] = useState<NewClient | null>(clients.length ? null : { name: '', phone: '+245 ', city: 'Bissau', email: '' })
  const [linked, setLinked] = useState<string[]>(project ? inspirations.filter((i) => i.projectId === project.id).map((i) => i.id) : [])
  const [customRoom, setCustomRoom] = useState('')

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }))
  const toggle = <T,>(list: T[] | undefined, value: T) => (list ?? []).includes(value) ? (list ?? []).filter((v) => v !== value) : [...(list ?? []), value]
  type ListKey = 'services' | 'rooms' | 'styles' | 'kickoff'
  // Functional update: quick successive taps on chips must not overwrite each other.
  const toggleIn = <K extends ListKey>(key: K, value: NonNullable<Draft[K]>[number], max?: number) =>
    setForm((f) => {
      const list = (f[key] ?? []) as Array<typeof value>
      if (!list.includes(value) && max !== undefined && list.length >= max) return f
      return { ...f, [key]: toggle(list, value) }
    })

  const go = (next: number) => {
    setStep(next)
    setVisited((v) => (v.includes(next) ? v : [...v, next]))
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Dê um nome ao projeto antes de o guardar.')
      go(0)
      return
    }
    if (newClient && !newClient.name.trim()) {
      setError('Indique o nome do novo cliente, ou escolha um cliente existente.')
      go(0)
      return
    }
    setBusy(true)
    setError(null)
    try {
      let clientId = form.clientId
      if (newClient) {
        const client = await save(
          'clients',
          { ...newClient, name: newClient.name.trim(), country: newClient.phone.startsWith('+221') ? 'Senegal' : 'Guiné-Bissau', type: form.type === 'Residencial' ? 'Particular' : form.type === 'Hotelaria' ? 'Hotelaria' : form.type === 'Restauração' ? 'Restauração' : 'Empresa', status: 'Ativo', since: todayIso() },
          null,
        )
        clientId = client.id
      }
      const saved = await save(
        'projects',
        { ...form, clientId, name: form.name.trim(), rooms: form.rooms.map((r) => r.trim()).filter(Boolean), contacts: (form.contacts ?? []).filter((c) => c.name.trim()) },
        project ? 'Projeto atualizado' : 'Projeto criado',
      )
      // The moodboard link lives on each inspiration; update only the ones that changed.
      for (const item of inspirations) {
        const wanted = linked.includes(item.id)
        if (wanted && item.projectId !== saved.id) await save('inspirations', { ...item, projectId: saved.id }, null)
        if (!wanted && item.projectId === saved.id) await save('inspirations', { ...item, projectId: undefined }, null)
      }
      onSaved(saved.id)
    } catch {
      setError('Não foi possível guardar. Verifique a ligação e tente outra vez.')
    } finally {
      setBusy(false)
    }
  }

  const fee = projectFee(form)
  const last = step === STEPS.length - 1

  return (
    <div className="flex flex-col">
      <div ref={topRef} className="scroll-mt-6" />
      <Stepper step={step} onStep={go} form={form} visited={visited} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25, ease: [0.65, 0, 0.18, 1] }}
          className="grid gap-5 pt-6 pb-4 sm:grid-cols-2"
        >
          {step === 0 && (
            <>
              <Field label="Nome do projeto" className="sm:col-span-2">
                <input autoFocus={!project} className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Apartamento Baldé, Hotel Atlântico piso 3" />
              </Field>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.78rem] text-nogueira/70">Cliente</span>
                  {clients.length > 0 && (
                    <button type="button" onClick={() => setNewClient((c) => (c ? null : { name: '', phone: '+245 ', city: 'Bissau', email: '' }))} className="flex items-center gap-1 text-[0.76rem] text-cognac-deep hover:text-nogueira">
                      {newClient ? <X className="size-3.5" /> : <UserPlus className="size-3.5" />}
                      {newClient ? 'Escolher cliente existente' : 'Novo cliente'}
                    </button>
                  )}
                </div>
                {newClient ? (
                  <div className="grid gap-2 rounded-2xl bg-linho/50 p-3 sm:grid-cols-2">
                    <input aria-label="Nome do cliente" className="field" placeholder="Nome completo" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                    <input aria-label="Telefone" type="tel" className="field" placeholder="+245 …" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                    <input aria-label="Email" type="email" className="field" placeholder="email@exemplo.com" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                    <input aria-label="Cidade" className="field" placeholder="Cidade" value={newClient.city} onChange={(e) => setNewClient({ ...newClient, city: e.target.value })} />
                  </div>
                ) : (
                  <select className="field" value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.company ? `, ${c.company}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <Choice label="Tipo de projeto" className="sm:col-span-2" options={PROJECT_TYPES} value={form.type} onChange={(v) => set('type', v)} />
              <Choice label="Serviços contratados" hint="Define o que entra na proposta e nos honorários" className="sm:col-span-2" options={PROJECT_SERVICES} value={form.services} onChange={(v) => toggleIn('services', v)} />

              <Field label="Como chegou ao estúdio">
                <select className="field" value={form.leadSource ?? ''} onChange={(e) => set('leadSource', (e.target.value || undefined) as Draft['leadSource'])}>
                  <option value="">Não indicado</option>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Choice label="Prioridade" options={PROJECT_PRIORITIES} value={form.priority} onChange={(v) => set('priority', v)} />

              {project && (
                <>
                  <Field label="Fase">
                    <select className="field" value={form.phase} onChange={(e) => set('phase', e.target.value as ProjectPhase)}>
                      {PROJECT_PHASES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`Progresso, ${form.progress}%`}>
                    <input type="range" min={0} max={100} value={form.progress} onChange={(e) => set('progress', Number(e.target.value))} className="mt-3 accent-[#9a5934]" />
                  </Field>
                </>
              )}

              <div className="sm:col-span-2">
                <span className="text-[0.78rem] text-nogueira/70">Capa</span>
                <div className="scrollbar-none mt-1.5 flex gap-2 overflow-x-auto pb-1">
                  {[...new Set([form.cover, ...(form.photos ?? []).map((p) => p.url), ...PROJECT_COVERS, ...inspirations.slice(0, 6).map((i) => i.image)])].map((src) => (
                    <button type="button" key={src} onClick={() => set('cover', src)} aria-pressed={form.cover === src} className={cx('h-14 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition', form.cover === src ? 'ring-cognac' : 'ring-transparent opacity-70 hover:opacity-100')}>
                      <img src={src} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Localização" hint="Cidade e bairro, aparece nas listas">
                <input className="field" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Bissau, Bairro de Ajuda" />
              </Field>
              <Field label="Morada e acesso" hint="Para visitas, entregas e montagens">
                <input className="field" value={form.address ?? ''} onChange={(e) => set('address', e.target.value || undefined)} placeholder="Rua, n.º, ponto de referência" />
              </Field>

              <Choice label="Tipo de imóvel" className="sm:col-span-2" options={PROPERTY_TYPES} value={form.propertyType} onChange={(v) => set('propertyType', v)} />
              <Choice label="Estado do espaço" className="sm:col-span-2" options={PROPERTY_CONDITIONS} value={form.condition} onChange={(v) => set('condition', v)} />

              <Field label="Área a intervir (m²)">
                <input type="number" min={0} inputMode="decimal" className="field tabular" value={form.area ?? ''} onChange={(e) => set('area', e.target.value ? Number(e.target.value) : undefined)} placeholder="Ex.: 180" />
              </Field>
              <Field label="Pisos">
                <input type="number" min={1} inputMode="numeric" className="field tabular" value={form.floors ?? ''} onChange={(e) => set('floors', e.target.value ? Number(e.target.value) : undefined)} placeholder="1" />
              </Field>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[0.78rem] text-nogueira/70">
                  Divisões a tratar <span className="tabular text-taupe">({form.rooms.filter(Boolean).length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...COMMON_ROOMS, ...form.rooms.filter(Boolean)])].map((room) => (
                    <Chip key={room} active={form.rooms.includes(room)} onClick={() => toggleIn('rooms', room)}>
                      {room}
                    </Chip>
                  ))}
                </div>
                <div className="mt-1 flex gap-2">
                  <input
                    className="field"
                    value={customRoom}
                    onChange={(e) => setCustomRoom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customRoom.trim()) {
                        e.preventDefault()
                        set('rooms', [...new Set([...form.rooms, customRoom.trim()])])
                        setCustomRoom('')
                      }
                    }}
                    placeholder="Outra divisão, ex.: 12 quartos, Bar, Closet"
                  />
                  <Button
                    variant="secondary"
                    disabled={!customRoom.trim()}
                    onClick={() => {
                      set('rooms', [...new Set([...form.rooms, customRoom.trim()])])
                      setCustomRoom('')
                    }}
                  >
                    <Plus className="size-4" /> Juntar
                  </Button>
                </div>
              </div>

              <Field label="Quem vive ou usa o espaço" hint="Adultos, crianças, animais, funcionários, clientes por dia" className="sm:col-span-2">
                <input className="field" value={form.occupants ?? ''} onChange={(e) => set('occupants', e.target.value || undefined)} placeholder="Casal, 2 crianças (4 e 9 anos), 1 cão" />
              </Field>
              <Field label="Restrições técnicas" hint="Paredes estruturais, regras do condomínio, horários de obra, humidade, acessibilidade" className="sm:col-span-2">
                <textarea rows={2} className="field resize-none" value={form.constraints ?? ''} onChange={(e) => set('constraints', e.target.value || undefined)} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Choice label="Estilos desejados" hint="Escolha até três" className="sm:col-span-2" options={DESIGN_STYLES} value={form.styles} onChange={(v) => toggleIn('styles', v, 3)} />

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[0.78rem] text-nogueira/70">Paleta do projeto</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(form.palette ?? []).map((c, i) => (
                    <span key={`${c}-${i}`} className="group relative">
                      <label className="relative block size-10 cursor-pointer overflow-hidden rounded-xl ring-1 ring-nogueira/10" style={{ background: c }} title={c}>
                        <input type="color" value={c} onChange={(e) => set('palette', (form.palette ?? []).map((x, j) => (j === i ? e.target.value : x)))} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Cor ${i + 1}`} />
                      </label>
                      <button type="button" onClick={() => set('palette', (form.palette ?? []).filter((_, j) => j !== i))} aria-label={`Remover cor ${c}`} className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-white text-taupe shadow ring-1 ring-linha sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  {(form.palette ?? []).length < 8 && (
                    <label className="relative grid size-10 cursor-pointer place-items-center rounded-xl border border-dashed border-linha text-taupe hover:border-taupe" title="Adicionar cor">
                      <Plus className="size-4" />
                      <input type="color" value="#c9a98a" onChange={(e) => set('palette', [...(form.palette ?? []), e.target.value])} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Adicionar cor" />
                    </label>
                  )}
                  {linked.length > 0 && (
                    <button
                      type="button"
                      onClick={() => set('palette', [...new Set(inspirations.filter((i) => linked.includes(i.id)).flatMap((i) => i.palette.slice(0, 2)))].slice(0, 6))}
                      className="ml-1 text-[0.76rem] text-cognac-deep hover:text-nogueira"
                    >
                      Usar cores do moodboard
                    </button>
                  )}
                </div>
              </div>

              <Field label="Materiais e acabamentos que adora">
                <textarea rows={2} className="field resize-none" value={form.materialsLove ?? ''} onChange={(e) => set('materialsLove', e.target.value || undefined)} placeholder="Madeira natural, travertino, linho, latão escovado" />
              </Field>
              <Field label="O que não quer ver">
                <textarea rows={2} className="field resize-none" value={form.materialsAvoid ?? ''} onChange={(e) => set('materialsAvoid', e.target.value || undefined)} placeholder="Brilhos, cinzento frio, alcatifa" />
              </Field>
              <Field label="Peças a manter ou reaproveitar" className="sm:col-span-2">
                <input className="field" value={form.keepItems ?? ''} onChange={(e) => set('keepItems', e.target.value || undefined)} placeholder="Mesa de jantar da família, quadros, piano" />
              </Field>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="flex items-baseline justify-between text-[0.78rem] text-nogueira/70">
                  Moodboard
                  <span className="text-[0.72rem] text-taupe">{linked.length ? `${linked.length} selecionadas` : 'Toque nas inspirações a ligar'}</span>
                </span>
                {inspirations.length === 0 ? (
                  <p className="text-[0.82rem] text-taupe">Ainda não há inspirações guardadas.</p>
                ) : (
                  <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                    {inspirations.map((item) => {
                      const on = linked.includes(item.id)
                      return (
                        <li key={item.id}>
                          <button type="button" onClick={() => setLinked((l) => toggle(l, item.id))} aria-pressed={on} title={item.title} className={cx('relative block aspect-square w-full overflow-hidden rounded-lg ring-2 transition', on ? 'ring-cognac' : 'ring-transparent opacity-80 hover:opacity-100')}>
                            <img src={item.image} alt={item.title} loading="lazy" className="size-full object-cover" />
                            {on && (
                              <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-cognac text-white">
                                <Check className="size-3" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <Field label="Briefing" hint="O pedido nas palavras do cliente: o que quer sentir ao entrar" className="sm:col-span-2">
                <textarea rows={3} className="field resize-none" value={form.description ?? ''} onChange={(e) => set('description', e.target.value || undefined)} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Orçamento do cliente (FCFA)" hint={form.budget ? money(form.budget) : 'Obra, mobiliário e decoração incluídos'}>
                <input type="number" min={0} step={50_000} inputMode="numeric" className="field tabular" value={form.budget || ''} onChange={(e) => set('budget', Number(e.target.value))} />
              </Field>
              <Choice label="Flexibilidade" options={BUDGET_FLEX} value={form.budgetFlex} onChange={(v) => set('budgetFlex', v)} />

              {project && (
                <Field label="Já executado (FCFA)" hint={money(form.spent)} className="sm:col-span-2">
                  <input type="number" min={0} step={50_000} inputMode="numeric" className="field tabular" value={form.spent || ''} onChange={(e) => set('spent', Number(e.target.value))} />
                </Field>
              )}

              <Choice label="Honorários do estúdio" className="sm:col-span-2" options={FEE_MODELS} value={form.feeModel} onChange={(v) => set('feeModel', v)} />
              <Field label={form.feeModel === 'Percentagem da obra' ? 'Percentagem (%)' : form.feeModel === 'Por m²' ? 'Valor por m² (FCFA)' : 'Valor fixo (FCFA)'} hint={form.feeModel === 'Por m²' && !form.area ? 'Indique a área no passo Espaço' : undefined}>
                <input type="number" min={0} step={form.feeModel === 'Percentagem da obra' ? 0.5 : 5_000} inputMode="decimal" className="field tabular" value={form.feeValue ?? ''} onChange={(e) => set('feeValue', e.target.value ? Number(e.target.value) : undefined)} />
              </Field>
              <Field label={`Adiantamento na assinatura, ${Math.round((form.depositRate ?? 0) * 100)}%`}>
                <input type="range" min={0} max={70} step={5} value={Math.round((form.depositRate ?? 0) * 100)} onChange={(e) => set('depositRate', Number(e.target.value) / 100)} className="mt-3 accent-[#9a5934]" />
              </Field>

              {/* What the numbers mean for the studio, recomputed as she types. */}
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-linha/70 ring-1 ring-linha/70 sm:col-span-2 sm:grid-cols-4">
                <Summary label="Honorários" value={fee !== undefined ? money(fee) : '—'} />
                <Summary label="A faturar na assinatura" value={fee !== undefined ? money(fee * (form.depositRate ?? 0)) : '—'} />
                <Summary label="Orçamento por m²" value={form.area && form.budget ? money(form.budget / form.area) : '—'} />
                <Summary label="Honorários / orçamento" value={fee !== undefined && form.budget ? `${((fee / form.budget) * 100).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%` : '—'} />
              </dl>
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Início">
                <input type="date" className="field" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </Field>
              <Field label="Entrega prevista" hint={form.dueDate >= form.startDate ? `${Math.round(daysBetween(form.startDate, form.dueDate) / 7)} semanas de projeto` : 'A entrega é anterior ao início'}>
                <input type="date" className="field" min={form.startDate} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </Field>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="flex items-center gap-2.5 text-[0.86rem]">
                  <input type="checkbox" checked={form.hardDeadline !== undefined} onChange={(e) => set('hardDeadline', e.target.checked ? '' : undefined)} className="size-4 accent-[#9a5934]" />
                  A data de entrega não pode mudar
                </label>
                {form.hardDeadline !== undefined && <input className="field" value={form.hardDeadline} onChange={(e) => set('hardDeadline', e.target.value)} placeholder="Porquê? Abertura do restaurante, mudança, casamento…" />}
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-[0.78rem] text-nogueira/70">Contactos do projeto</span>
                {(form.contacts ?? []).map((c, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2 rounded-2xl bg-linho/40 p-2 sm:grid-cols-[10rem_minmax(0,1fr)_10rem_2.25rem] sm:bg-transparent sm:p-0">
                    <select aria-label="Função" className="field col-span-2 sm:col-span-1" value={c.role} onChange={(e) => set('contacts', (form.contacts ?? []).map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                      {CONTACT_ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <input aria-label="Nome" className="field" placeholder="Nome" value={c.name} onChange={(e) => set('contacts', (form.contacts ?? []).map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <input aria-label="Telefone" type="tel" className="field row-start-3 sm:row-start-auto" placeholder="Telefone" value={c.phone ?? ''} onChange={(e) => set('contacts', (form.contacts ?? []).map((x, j) => (j === i ? { ...x, phone: e.target.value || undefined } : x)))} />
                    <IconButton label="Remover contacto" onClick={() => set('contacts', (form.contacts ?? []).filter((_, j) => j !== i))} className="mt-0.5 row-start-2 sm:row-start-auto col-start-2 sm:col-start-auto hover:text-[#a23b2a]">
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => set('contacts', [...(form.contacts ?? []), { role: (form.contacts ?? []).length ? 'Empreiteiro' : 'Contacto em obra', name: '' }])}>
                  <Plus className="size-3.5" /> Adicionar contacto
                </Button>
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="flex items-baseline justify-between text-[0.78rem] text-nogueira/70">
                  Arranque do projeto
                  <span className="tabular text-[0.72rem] text-taupe">
                    {(form.kickoff ?? []).length} de {KICKOFF_STEPS.length}
                  </span>
                </span>
                <ol className="grid gap-1.5 sm:grid-cols-2">
                  {KICKOFF_STEPS.map((k, i) => {
                    const done = (form.kickoff ?? []).includes(k)
                    return (
                      <li key={k}>
                        <button type="button" onClick={() => toggleIn('kickoff', k)} aria-pressed={done} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.84rem] ring-1 transition', done ? 'bg-[#e7ecdf] ring-palma/20' : 'bg-white ring-linha hover:ring-taupe/40')}>
                          <span className={cx('grid size-5 shrink-0 place-items-center rounded-full text-[0.66rem]', done ? 'bg-palma text-white' : 'bg-linho text-taupe')}>{done ? <Check className="size-3" strokeWidth={3} /> : i + 1}</span>
                          <span className={cx(done && 'text-palma-deep')}>{k}</span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="mb-3 rounded-xl bg-[#f8e3dd] px-3 py-2 text-[0.82rem] text-[#9b3424]">{error}</p>}

      <div className="sticky bottom-0 -mx-5 flex items-center gap-2 border-t border-linha bg-marfim/95 px-5 pt-4 pb-1 backdrop-blur sm:-mx-6 sm:px-6">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => go(step - 1)}>
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Anterior</span>
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {!last && (
            <Button variant={project ? 'secondary' : 'primary'} onClick={() => go(step + 1)}>
              {STEPS[step + 1].label} <ArrowRight className="size-4" />
            </Button>
          )}
          {(last || project) && (
            <Button onClick={submit} disabled={busy}>
              {busy ? 'A guardar…' : project ? 'Guardar' : 'Criar projeto'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Steps are a real sequence, so they are numbered; each can still be opened directly. */
function Stepper({ step, onStep, form, visited }: { step: number; onStep: (i: number) => void; form: Draft; visited: number[] }) {
  const filled = [
    Boolean(form.name.trim()),
    Boolean(form.location || form.propertyType || form.area || form.rooms.length),
    Boolean(form.styles?.length || form.palette?.length || form.description),
    Boolean(form.budget && form.feeModel && form.feeValue),
    Boolean(form.contacts?.length || form.kickoff?.length),
  ].map((ok, i) => ok && visited.includes(i))
  const listRef = useRef<HTMLOListElement>(null)
  // On phones the step bar scrolls sideways: keep the current step in view.
  useEffect(() => {
    const el = listRef.current?.children[step] as HTMLElement | undefined
    const list = listRef.current
    if (!el || !list) return
    const offset = el.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
    list.scrollTo({ left: offset - list.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
  }, [step])
  return (
    <ol ref={listRef} className="scrollbar-none -mx-5 flex gap-1 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
      {STEPS.map((s, i) => {
        const current = i === step
        return (
          <li key={s.key} className="shrink-0 sm:shrink">
            <button type="button" onClick={() => onStep(i)} aria-current={current ? 'step' : undefined} className="group flex w-full flex-col gap-2 pr-3 text-left sm:pr-0">
              <span className={cx('h-[3px] w-full rounded-full transition-colors', current ? 'bg-cognac' : filled[i] ? 'bg-palma' : 'bg-linho-deep')} />
              <span className="flex items-center gap-2">
                <span className={cx('tabular grid size-5 shrink-0 place-items-center rounded-full text-[0.66rem]', current ? 'bg-nogueira text-marfim' : filled[i] ? 'bg-palma text-white' : 'bg-linho text-taupe')}>
                  {filled[i] && !current ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cx('text-[0.82rem] whitespace-nowrap', current ? 'text-nogueira' : 'text-taupe group-hover:text-nogueira')}>{s.label}</span>
              </span>
              <span className="hidden text-[0.7rem] leading-snug text-taupe lg:block">{s.hint}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.82rem] whitespace-nowrap ring-1 transition active:scale-[0.97]',
        active ? 'bg-nogueira text-marfim ring-nogueira' : 'bg-white text-nogueira/80 ring-linha hover:ring-taupe/50',
      )}
    >
      {active && <Check className="size-3.5" strokeWidth={2.5} />}
      {children}
    </button>
  )
}

function Choice<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  className,
}: {
  label: string
  hint?: string
  options: readonly T[]
  value: T | T[] | undefined
  onChange: (value: T) => void
  className?: string
}) {
  const isOn = (o: T) => (Array.isArray(value) ? value.includes(o) : value === o)
  return (
    <div role="group" aria-label={label} className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-[0.78rem] text-nogueira/70">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Chip key={o} active={isOn(o)} onClick={() => onChange(o)}>
            {o}
          </Chip>
        ))}
      </div>
      {hint && <span className="text-[0.72rem] text-taupe">{hint}</span>}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[0.7rem] text-taupe">{label}</dt>
      <dd className="tabular mt-1 text-[0.92rem]">{value}</dd>
    </div>
  )
}
