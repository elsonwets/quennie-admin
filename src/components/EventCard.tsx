import { MapPin } from 'lucide-react'
import type { Appointment, AppointmentType } from '~/lib/types'
import { cx } from './ui'

export const typeStyle: Record<AppointmentType, { bar: string; bg: string; text: string }> = {
  Reunião: { bar: 'bg-cognac', bg: 'bg-[#f6ece3]', text: 'text-cognac-deep' },
  'Visita técnica': { bar: 'bg-palma', bg: 'bg-[#eaede3]', text: 'text-palma-deep' },
  Medições: { bar: 'bg-[#c49a52]', bg: 'bg-[#f6eedd]', text: 'text-[#7a5717]' },
  Montagem: { bar: 'bg-nogueira', bg: 'bg-[#ece6df]', text: 'text-nogueira' },
  Entrega: { bar: 'bg-[#6f8a6a]', bg: 'bg-[#e6ede4]', text: 'text-[#3f5a3b]' },
  Fornecedor: { bar: 'bg-taupe', bg: 'bg-[#f0ebe5]', text: 'text-nogueira/80' },
}

export function EventCard({ appointment: a, clientName, onClick, compact }: { appointment: Appointment; clientName?: string; onClick?: () => void; compact?: boolean }) {
  const style = typeStyle[a.type]
  return (
    <button onClick={onClick} className={cx('relative w-full overflow-hidden rounded-xl text-left transition hover:brightness-[0.98]', style.bg, compact ? 'py-2 pr-2 pl-3' : 'py-3 pr-3 pl-4')}>
      <span className={cx('absolute inset-y-2 left-1 w-[3px] rounded-full', style.bar)} />
      <span className={cx('tabular block text-[0.7rem]', style.text)}>
        {a.start} – {a.end}
      </span>
      <span className={cx('mt-0.5 block leading-snug', compact ? 'line-clamp-2 text-[0.78rem]' : 'text-[0.9rem]')}>{a.title}</span>
      {!compact && (
        <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.74rem] text-taupe">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" /> {a.location}
          </span>
          {clientName && <span>{clientName}</span>}
        </span>
      )}
      {compact && clientName && <span className="mt-0.5 block truncate text-[0.68rem] text-taupe">{clientName}</span>}
    </button>
  )
}
