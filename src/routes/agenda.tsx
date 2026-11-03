import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trash2 } from 'lucide-react'
import { addDays, longDate, todayIso, weekday } from '~/lib/format'
import { APPOINTMENT_TYPES, type Appointment, type AppointmentType } from '~/lib/types'
import { useMutations, useWorkspace } from '~/lib/workspace'
import { Button, ConfirmDelete, Field, IconButton, Modal, PageHeader, cx } from '~/components/ui'
import { EventCard, typeStyle } from '~/components/EventCard'

export const Route = createFileRoute('/agenda')({
  head: () => ({ meta: [{ title: 'Agenda · Quennie' }] }),
  component: AgendaPage,
})

const startOfWeek = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`)
  const offset = (d.getDay() + 6) % 7
  return addDays(iso, -offset)
}

function AgendaPage() {
  const { appointments, clients } = useWorkspace()
  const { save, remove } = useMutations()
  const today = todayIso()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [selectedDay, setSelectedDay] = useState(today)
  const [editing, setEditing] = useState<Appointment | { date: string } | null>(null)
  const [deleting, setDeleting] = useState<Appointment | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const byDay = (date: string) => appointments.filter((a) => a.date === date).sort((a, b) => a.start.localeCompare(b.start))
  const weekCount = appointments.filter((a) => a.date >= days[0] && a.date <= days[6]).length
  const month = new Date(`${days[3]}T12:00:00`).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  const moveWeek = (delta: number) => {
    const next = addDays(weekStart, delta * 7)
    setWeekStart(next)
    setSelectedDay(next)
  }
  const goToday = () => {
    setWeekStart(startOfWeek(today))
    setSelectedDay(today)
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Agenda"
        subtitle={`${weekCount} encontros esta semana · ${byDay(today).length} hoje`}
        actions={
          <Button onClick={() => setEditing({ date: selectedDay })}>
            <Plus className="size-4" />
            Novo encontro
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton label="Semana anterior" onClick={() => moveWeek(-1)} className="ring-1 ring-linha">
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton label="Semana seguinte" onClick={() => moveWeek(1)} className="ring-1 ring-linha">
            <ChevronRight className="size-4" />
          </IconButton>
          <p className="display ml-3 text-[1.5rem] first-letter:uppercase">{month}</p>
        </div>
        <div className="flex items-center gap-3">
          <ul className="hidden flex-wrap gap-x-3 gap-y-1 lg:flex">
            {APPOINTMENT_TYPES.map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-[0.74rem] text-taupe">
                <span className={cx('size-2 rounded-full', typeStyle[t].bar)} />
                {t}
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={goToday}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Phone: day strip + list of the selected day. */}
      <div className="md:hidden">
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
          {days.map((d) => {
            const active = d === selectedDay
            const count = byDay(d).length
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={cx('flex w-14 shrink-0 flex-col items-center rounded-2xl py-2.5 transition', active ? 'bg-nogueira text-marfim' : 'bg-white ring-1 ring-linha')}
              >
                <span className={cx('text-[0.68rem] capitalize', active ? 'text-marfim/70' : 'text-taupe')}>{weekday(d)}</span>
                <span className="display mt-0.5 text-[1.45rem]">{Number(d.slice(8))}</span>
                <span className={cx('mt-1 size-1 rounded-full', count ? (active ? 'bg-marfim' : 'bg-cognac') : 'bg-transparent')} />
              </button>
            )
          })}
        </div>
        <p className="mt-5 text-[0.82rem] text-taupe first-letter:uppercase">
          {weekday(selectedDay, 'long')}, {longDate(selectedDay)}
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {byDay(selectedDay).length === 0 && <li className="rounded-2xl border border-dashed border-linha px-4 py-8 text-center text-[0.84rem] text-taupe">Dia livre.</li>}
          {byDay(selectedDay).map((a) => (
            <li key={a.id}>
              <EventCard appointment={a} clientName={clients.find((c) => c.id === a.clientId)?.name} onClick={() => setEditing(a)} />
            </li>
          ))}
        </ul>
      </div>

      {/* Tablet and up: the whole week. */}
      <div className="hidden overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-linha/80 md:grid md:grid-cols-7">
        {days.map((d, i) => {
          const isToday = d === today
          const items = byDay(d)
          return (
            <div key={d} className={cx('flex min-h-[26rem] flex-col', i > 0 && 'border-l border-linha/70', isToday && 'bg-[#fbf6ee]')}>
              <div className="flex items-baseline justify-between border-b border-linha/70 px-3 pt-3 pb-2.5">
                <span className={cx('text-[0.72rem] capitalize', isToday ? 'text-cognac' : 'text-taupe')}>{weekday(d)}</span>
                <span className={cx('display text-[1.5rem]', isToday && 'grid size-8 place-items-center rounded-full bg-nogueira text-[1.1rem] text-marfim')}>{Number(d.slice(8))}</span>
              </div>
              <ul className="flex flex-1 flex-col gap-2 p-2">
                {items.map((a, index) => (
                  <motion.li key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}>
                    <EventCard compact appointment={a} clientName={clients.find((c) => c.id === a.clientId)?.name} onClick={() => setEditing(a)} />
                  </motion.li>
                ))}
                <li className="mt-auto">
                  <button
                    onClick={() => setEditing({ date: d })}
                    aria-label={`Novo encontro a ${longDate(d)}`}
                    className="flex h-8 w-full items-center justify-center rounded-xl text-taupe/0 transition hover:bg-linho/50 hover:text-taupe focus-visible:text-taupe"
                  >
                    <Plus className="size-4" />
                  </button>
                </li>
              </ul>
            </div>
          )
        })}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing && 'id' in editing ? 'Editar encontro' : 'Novo encontro'}
        description={editing ? longDate(editing.date) : undefined}
      >
        {editing && (
          <AppointmentForm
            key={'id' in editing ? editing.id : editing.date}
            appointment={'id' in editing ? editing : null}
            date={editing.date}
            onCancel={() => setEditing(null)}
            onDelete={'id' in editing ? () => setDeleting(editing) : undefined}
            onSave={async (data) => {
              await save('appointments', data, data.id ? 'Encontro atualizado' : 'Encontro agendado')
              setEditing(null)
            }}
          />
        )}
      </Modal>
      <ConfirmDelete
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        what={deleting?.title ?? 'O encontro'}
        onConfirm={() => {
          if (!deleting) return
          remove('appointments', deleting.id, 'Encontro cancelado')
          setEditing(null)
        }}
      />
    </div>
  )
}

function AppointmentForm({
  appointment,
  date,
  onCancel,
  onSave,
  onDelete,
}: {
  appointment: Appointment | null
  date: string
  onCancel: () => void
  onSave: (a: Omit<Appointment, 'id'> & { id?: string }) => Promise<void>
  onDelete?: () => void
}) {
  const { clients, projects } = useWorkspace()
  const [form, setForm] = useState<Omit<Appointment, 'id'> & { id?: string }>(appointment ?? { title: '', type: 'Reunião', date, start: '10:00', end: '11:00', location: 'Estúdio Quennie' })
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
      className="grid gap-4"
    >
      <Field label="Título">
        <input required className="field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Escolha de tecidos" />
      </Field>
      <div>
        <span className="text-[0.78rem] text-nogueira/70">Tipo</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {APPOINTMENT_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => set('type', t)}
              className={cx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.78rem] ring-1 transition', form.type === t ? 'bg-nogueira text-marfim ring-nogueira' : 'bg-white ring-linha hover:ring-taupe/50')}
            >
              <span className={cx('size-1.5 rounded-full', typeStyle[t].bar)} />
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_6.5rem_6.5rem]">
        <Field label="Data" className="col-span-2 sm:col-span-1">
          <input type="date" required className="field" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Início">
          <span className="relative">
            <Clock className="pointer-events-none absolute top-1/2 left-2.5 hidden size-3.5 -translate-y-1/2 text-taupe sm:block" />
            <input type="time" className="field tabular px-2 sm:pl-7" value={form.start} onChange={(e) => set('start', e.target.value)} />
          </span>
        </Field>
        <Field label="Fim">
          <input type="time" className="field tabular px-2" value={form.end} onChange={(e) => set('end', e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cliente">
          <select className="field" value={form.clientId ?? ''} onChange={(e) => set('clientId', e.target.value || undefined)}>
            <option value="">Nenhum</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Projeto">
          <select className="field" value={form.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || undefined)}>
            <option value="">Nenhum</option>
            {projects
              .filter((p) => !form.clientId || p.clientId === form.clientId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <Field label="Local">
        <input className="field" value={form.location} onChange={(e) => set('location', e.target.value)} />
      </Field>
      <Field label="Notas">
        <textarea rows={2} className="field resize-none" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>
      <div className="flex items-center gap-2 border-t border-linha pt-4">
        {onDelete && (
          <Button variant="ghost" onClick={onDelete} className="-ml-2 text-[#a23b2a] hover:bg-[#fbf0ed] hover:text-[#a23b2a]">
            <Trash2 className="size-3.5" /> Cancelar encontro
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onCancel}>
          Fechar
        </Button>
        <Button type="submit" disabled={busy}>
          <CalendarDays className="size-3.5" />
          {busy ? 'A guardar…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
