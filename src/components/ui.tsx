import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { initials } from '~/lib/format'

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')
export { cx }

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-nogueira text-marfim hover:bg-[#3b2b21] shadow-[0_6px_16px_-8px_rgb(42_30_23/0.6)]',
  secondary: 'bg-white text-nogueira ring-1 ring-linha hover:ring-taupe/40',
  ghost: 'text-nogueira/80 hover:bg-linho/70 hover:text-nogueira',
  accent: 'bg-[#f4ead9] text-cognac-deep hover:bg-[#efe1c9]',
  danger: 'bg-white text-[#a23b2a] ring-1 ring-[#efd3cc] hover:bg-[#fbf0ed]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-normal whitespace-nowrap transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        size === 'md' ? 'h-10 px-5 text-[0.86rem]' : 'h-8 px-3.5 text-[0.8rem]',
        buttonStyles[variant],
        className,
      )}
    />
  )
}

export function IconButton({ label, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cx('grid size-9 shrink-0 place-items-center rounded-full text-taupe transition hover:bg-linho hover:text-nogueira', className)}
    />
  )
}

const tones = {
  neutral: 'bg-linho/80 text-nogueira/75',
  green: 'bg-[#e7ecdf] text-palma-deep',
  amber: 'bg-[#f6ead3] text-[#8a5a14]',
  red: 'bg-[#f8e3dd] text-[#9b3424]',
  cognac: 'bg-[#f3e4d8] text-cognac-deep',
  dark: 'bg-nogueira text-marfim',
} as const

export type Tone = keyof typeof tones

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.72rem] whitespace-nowrap', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
}

const avatarHues = ['#c9a98a', '#9fa58f', '#b98f78', '#a8988a', '#c7b089', '#8f9c8c', '#b5a08f']

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const hue = avatarHues[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % avatarHues.length]
  return (
    <span
      aria-hidden="true"
      style={{ background: `linear-gradient(140deg, ${hue}, color-mix(in oklab, ${hue} 70%, #2a1e17))` }}
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-display text-white',
        size === 'sm' && 'size-7 text-[0.8rem]',
        size === 'md' && 'size-10 text-base',
        size === 'lg' && 'size-16 text-2xl',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-[2.4rem] sm:text-[2.9rem]">{title}</h1>
        {subtitle && <p className="mt-2 text-[0.88rem] text-taupe">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (value: T) => void
  items: Array<{ value: T; label: string; count?: number }>
}) {
  const id = useId()
  return (
    <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" className="inline-flex gap-1 rounded-full bg-linho/70 p-1">
        {items.map((item) => {
          const active = item.value === value
          return (
            <button
              key={item.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cx(
                'relative flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.82rem] whitespace-nowrap transition-colors',
                active ? 'text-nogueira' : 'text-nogueira/60 hover:text-nogueira',
              )}
            >
              {active && (
                <motion.span
                  layoutId={`tab-${id}`}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                  className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgb(42_30_23/0.1)]"
                />
              )}
              <span className="relative">{item.label}</span>
              {item.count !== undefined && <span className="tabular relative text-[0.72rem] text-taupe">{item.count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Progress({ value, tone = 'palma' }: { value: number; tone?: 'palma' | 'cognac' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-linho">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.9, ease: [0.65, 0, 0.18, 1] }}
        className={cx('h-full rounded-full', tone === 'palma' ? 'bg-palma' : 'bg-cognac')}
      />
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-3xl bg-white ring-1 ring-linha/80 shadow-card', className)}>{children}</div>
}

export function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-[0.84rem]">
      <dt className="text-taupe">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-linha px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-linho text-taupe">{icon}</span>
      <p className="display mt-4 text-2xl">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-taupe">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * Detail column: sticky beside the list on wide screens, a bottom sheet below xl.
 * `open` only matters below xl, where the sheet is opened by an explicit selection.
 */
export function DetailPanel({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cx(
          'fixed inset-0 z-40 bg-nogueira/30 backdrop-blur-[2px] transition-opacity duration-300 xl:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cx(
          'fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-500 ease-[var(--ease-drape)]',
          'sm:inset-x-auto sm:top-3 sm:right-3 sm:bottom-3 sm:max-h-none sm:w-[400px] sm:rounded-[1.75rem]',
          'xl:sticky xl:top-6 xl:right-auto xl:bottom-auto xl:z-auto xl:w-auto xl:translate-x-0 xl:translate-y-0 xl:self-start xl:overflow-visible xl:p-3.5 xl:shadow-card xl:ring-1 xl:ring-linha/80',
          open ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-x-[110%] sm:translate-y-0',
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-linha sm:hidden" />
        <IconButton label="Fechar" onClick={onClose} className="absolute top-4 right-4 z-10 bg-white/85 backdrop-blur xl:hidden">
          <X className="size-4" />
        </IconButton>
        {children}
      </aside>
    </>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-nogueira/35 backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.45, ease: [0.65, 0, 0.18, 1] }}
            className={cx(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-marfim shadow-2xl sm:rounded-[1.75rem]',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-xl',
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-linha px-6 pt-6 pb-4">
              <div>
                <h2 className="display text-[1.9rem]">{title}</h2>
                {description && <p className="mt-1 text-sm text-taupe">{description}</p>}
              </div>
              <IconButton label="Fechar" onClick={onClose}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="overflow-x-hidden overflow-y-auto px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-linha bg-white/60 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-[0.78rem] text-nogueira/70">{label}</span>
      {children}
      {hint && <span className="text-[0.72rem] text-taupe">{hint}</span>}
    </label>
  )
}

export function ConfirmDelete({ open, onClose, onConfirm, what }: { open: boolean; onClose: () => void; onConfirm: () => void; what: string }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar?"
      description={`${what} será removido. Esta ação não pode ser anulada.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            Eliminar
          </Button>
        </>
      }
    >
      <p className="text-sm text-nogueira/80">Os dados de demonstração voltam ao estado inicial quando o servidor é reiniciado.</p>
    </Modal>
  )
}

/** A colour palette as one continuous bar of swatches. */
export function PaletteStrip({ colors, className }: { colors: string[]; className?: string }) {
  if (!colors.length) return null
  return (
    <span className={cx('flex h-2.5 overflow-hidden rounded-full ring-1 ring-nogueira/5', className)} aria-label={`Paleta: ${colors.join(', ')}`}>
      {colors.map((c) => (
        <span key={c} className="flex-1" style={{ background: c }} />
      ))}
    </span>
  )
}
