import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, ExternalLink, Heart, ImagePlus, Images, Link2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { longDate, todayIso } from '~/lib/format'
import { extractPalette, fileToDataUrl, isLight } from '~/lib/image'
import { INSPIRATION_SOURCES, type Inspiration, type InspirationSource } from '~/lib/types'
import { useMutations, useToast, useWorkspace } from '~/lib/workspace'
import { Button, ConfirmDelete, EmptyState, Field, IconButton, Modal, PageHeader, PaletteStrip, cx } from '~/components/ui'

export const Route = createFileRoute('/inspiracoes')({
  // `novo` opens the capture form straight away (home shortcut, PWA shortcut).
  validateSearch: (search: Record<string, unknown>): { id?: string; board?: string; novo?: boolean } => ({
    ...(typeof search.id === 'string' ? { id: search.id } : {}),
    ...(typeof search.board === 'string' ? { board: search.board } : {}),
    ...(search.novo === true || search.novo === 'true' || search.novo === 1 ? { novo: true } : {}),
  }),
  head: () => ({ meta: [{ title: 'Inspirações · Quennie' }] }),
  component: InspirationsPage,
})

type Draft = Omit<Inspiration, 'id'> & { id?: string }

function InspirationsPage() {
  const { inspirations, projects } = useWorkspace()
  const { save, remove } = useMutations()
  const { id, board, novo } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [editing, setEditing] = useState<Inspiration | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Inspiration | null>(null)

  useEffect(() => {
    if (!novo) return
    setEditing('new')
    navigate({ search: { board }, replace: true, resetScroll: false })
  }, [novo, board, navigate])

  const sorted = useMemo(() => [...inspirations].sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [inspirations])
  const boards = useMemo(() => {
    const map = new Map<string, Inspiration[]>()
    for (const item of sorted) map.set(item.board, [...(map.get(item.board) ?? []), item])
    return [...map.entries()].map(([name, items]) => ({ name, items }))
  }, [sorted])

  const q = query.trim().toLowerCase()
  const visible = sorted.filter(
    (i) =>
      (!board || i.board === board) &&
      (!favorites || i.favorite) &&
      (!q || [i.title, i.board, i.source, ...i.tags, projects.find((p) => p.id === i.projectId)?.name ?? ''].some((t) => t.toLowerCase().includes(q))),
  )
  const viewing = inspirations.find((i) => i.id === id)

  const setSearch = (next: { id?: string; board?: string }) => navigate({ search: next, replace: true, resetScroll: false })
  const open = (inspirationId?: string) => setSearch({ board, id: inspirationId })
  const pickBoard = (name?: string) => setSearch({ board: name })
  const toggleFavorite = (item: Inspiration) =>
    save('inspirations', { ...item, favorite: !item.favorite }, item.favorite ? 'Retirada das favoritas' : 'Guardada nas favoritas')

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Inspirações"
        subtitle={`${inspirations.length} referências em ${boards.length} coleções`}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Adicionar inspiração
          </Button>
        }
      />

      {/* Boards double as the main filter: each shows what it holds before it is opened. */}
      <section aria-label="Coleções" className="scrollbar-none -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-1 sm:mx-0 sm:scroll-px-0 sm:px-0">
        <BoardCard name="Todas" count={inspirations.length} images={sorted.slice(0, 4).map((i) => i.image)} active={!board} onClick={() => pickBoard(undefined)} />
        {boards.map((b) => (
          <BoardCard key={b.name} name={b.name} count={b.items.length} images={b.items.slice(0, 4).map((i) => i.image)} active={board === b.name} onClick={() => pickBoard(board === b.name ? undefined : b.name)} />
        ))}
      </section>

      <div className="flex items-center gap-2 sm:gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-taupe" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar por material, cor, divisão…" className="field rounded-full pl-10" aria-label="Procurar inspirações" />
        </label>
        <button
          type="button"
          onClick={() => setFavorites((f) => !f)}
          aria-pressed={favorites}
          className={cx(
            'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[0.84rem] ring-1 transition sm:px-4',
            favorites ? 'bg-nogueira text-marfim ring-nogueira' : 'bg-white text-nogueira/80 ring-linha hover:ring-taupe/40',
          )}
        >
          <Heart className={cx('size-4', favorites && 'fill-current')} strokeWidth={1.6} />
          <span className="sr-only sm:not-sr-only">Favoritas</span>
        </button>
        {visible.length !== inspirations.length && <p className="tabular ml-auto hidden text-[0.8rem] text-taupe sm:block">{`${visible.length} de ${inspirations.length}`}</p>}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Images className="size-5" />}
          title="Nada por aqui"
          text={inspirations.length ? 'Nenhuma referência corresponde a estes filtros.' : 'Guarde a primeira referência: uma foto de obra, de viagem ou de um fornecedor.'}
          action={<Button onClick={() => setEditing('new')}>Adicionar inspiração</Button>}
        />
      ) : (
        <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4 xl:columns-4 2xl:columns-5">
          {visible.map((item) => (
            <li key={item.id} className="mb-3 break-inside-avoid sm:mb-4">
              <InspirationTile item={item} projectName={projects.find((p) => p.id === item.projectId)?.name} onOpen={() => open(item.id)} onFavorite={() => toggleFavorite(item)} />
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(viewing)} onClose={() => open(undefined)} title={viewing?.title ?? ''} description={viewing ? `${viewing.board}, guardada a ${longDate(viewing.savedAt)}` : undefined} wide>
        {viewing && (
          <InspirationView
            item={viewing}
            onFavorite={() => toggleFavorite(viewing)}
            onEdit={() => setEditing(viewing)}
            onDelete={() => setDeleting(viewing)}
          />
        )}
      </Modal>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nova inspiração' : 'Editar inspiração'} wide>
        {editing && (
          <InspirationForm
            key={editing === 'new' ? 'new' : editing.id}
            item={editing === 'new' ? null : editing}
            defaultBoard={board ?? boards[0]?.name ?? 'Geral'}
            boards={boards.map((b) => b.name)}
            onCancel={() => setEditing(null)}
            onSave={async (draft) => {
              const saved = await save('inspirations', draft, draft.id ? 'Inspiração atualizada' : 'Inspiração guardada')
              setEditing(null)
              setSearch({ board: board && board !== saved.board ? undefined : board, id: saved.id })
            }}
          />
        )}
      </Modal>

      <ConfirmDelete
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        what={deleting ? `«${deleting.title}»` : 'A inspiração'}
        onConfirm={() => {
          if (!deleting) return
          remove('inspirations', deleting.id, 'Inspiração eliminada')
          open(undefined)
        }}
      />
    </div>
  )
}

function BoardCard({ name, count, images, active, onClick }: { name: string; count: number; images: string[]; active: boolean; onClick: () => void }) {
  const cells = [...images, ...Array(Math.max(0, 4 - images.length)).fill(null)].slice(0, 4) as Array<string | null>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'group w-[9.5rem] shrink-0 snap-start rounded-[1.15rem] p-1.5 text-left transition sm:w-[11rem]',
        active ? 'bg-white shadow-card ring-1 ring-nogueira/70' : 'ring-1 ring-transparent hover:bg-white/70',
      )}
    >
      <span className={cx('grid aspect-[4/3] gap-0.5 overflow-hidden rounded-[0.85rem] bg-linho', images.length >= 3 && 'grid-cols-[1.4fr_1fr] grid-rows-2')}>
        {(images.length >= 3 ? cells.slice(0, 3) : cells.slice(0, 1)).map((src, i) => (
          <span key={i} className={cx('overflow-hidden bg-linho-deep/60', i === 0 && images.length >= 3 && 'row-span-2')}>
            {src && <img src={src} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-[var(--ease-drape)] group-hover:scale-[1.05]" />}
          </span>
        ))}
      </span>
      <span className="mt-2 flex items-baseline justify-between gap-2 px-1 pb-0.5">
        <span className="truncate text-[0.84rem]">{name}</span>
        <span className="tabular text-[0.72rem] text-taupe">{count}</span>
      </span>
    </button>
  )
}

function InspirationTile({ item, projectName, onOpen, onFavorite }: { item: Inspiration; projectName?: string; onOpen: () => void; onFavorite: () => void }) {
  return (
    <figure className="group relative">
      <button type="button" onClick={onOpen} className="block w-full overflow-hidden rounded-[1.1rem] bg-linho text-left" aria-label={`Abrir ${item.title}`}>
        <img src={item.image} alt="" loading="lazy" className="block w-full transition-transform duration-700 ease-[var(--ease-drape)] group-hover:scale-[1.03]" />
      </button>
      <button
        type="button"
        onClick={onFavorite}
        aria-pressed={Boolean(item.favorite)}
        aria-label={item.favorite ? 'Retirar das favoritas' : 'Guardar nas favoritas'}
        className={cx(
          'absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full backdrop-blur-md transition',
          item.favorite ? 'bg-marfim/90 text-cognac' : 'bg-nogueira/25 text-white opacity-100 hover:bg-nogueira/40 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100',
        )}
      >
        <Heart className={cx('size-4', item.favorite && 'fill-current')} strokeWidth={1.7} />
      </button>
      <figcaption className="px-1 pt-2.5">
        <p className="text-[0.84rem] leading-snug">{item.title}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <PaletteStrip colors={item.palette} className="w-16 shrink-0" />
          <span className="min-w-0 truncate text-[0.72rem] text-taupe">{projectName ?? item.source}</span>
        </div>
      </figcaption>
    </figure>
  )
}

function InspirationView({ item, onFavorite, onEdit, onDelete }: { item: Inspiration; onFavorite: () => void; onEdit: () => void; onDelete: () => void }) {
  const { projects } = useWorkspace()
  const toast = useToast()
  const project = projects.find((p) => p.id === item.projectId)

  const copy = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color)
      toast(`Cor ${color} copiada`)
    } catch {
      toast(color)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-[1.1rem] bg-linho">
        <img src={item.image} alt={item.title} className="mx-auto max-h-[62dvh] w-full object-contain" />
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <p className="text-[0.78rem] text-taupe">Paleta</p>
          <ul className="mt-2 grid grid-cols-5 gap-1.5">
            {item.palette.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => copy(c)}
                  title={`Copiar ${c}`}
                  className="flex aspect-[3/4] w-full items-end rounded-xl p-1.5 ring-1 ring-nogueira/5 transition hover:-translate-y-0.5"
                  style={{ background: c }}
                >
                  <span className={cx('tabular text-[0.6rem] tracking-wide', isLight(c) ? 'text-nogueira/70' : 'text-white/80')}>{c.slice(1).toUpperCase()}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {item.note && <p className="text-[0.88rem] leading-relaxed text-nogueira/85">{item.note}</p>}

        <dl className="grid grid-cols-[6.5rem_1fr] gap-y-2 border-t border-linha pt-4 text-[0.84rem]">
          <dt className="text-taupe">Origem</dt>
          <dd>{item.source}</dd>
          <dt className="text-taupe">Projeto</dt>
          <dd>
            {project ? (
              <Link to="/projetos" search={{ id: project.id }} className="underline decoration-linha underline-offset-4 hover:decoration-cognac">
                {project.name}
              </Link>
            ) : (
              <span className="text-taupe">Livre, sem projeto</span>
            )}
          </dd>
          {item.tags.length > 0 && (
            <>
              <dt className="text-taupe">Etiquetas</dt>
              <dd className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span key={t} className="rounded-md bg-linho/70 px-2 py-0.5 text-[0.74rem] text-nogueira/80">
                    {t}
                  </span>
                ))}
              </dd>
            </>
          )}
        </dl>

        {item.link && (
          <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 self-start text-[0.84rem] text-cognac-deep underline decoration-cognac/30 underline-offset-4 hover:decoration-cognac">
            <ExternalLink className="size-3.5" /> Abrir a fonte
          </a>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-linha pt-4">
          <Button variant={item.favorite ? 'accent' : 'secondary'} onClick={onFavorite}>
            <Heart className={cx('size-4', item.favorite && 'fill-current')} strokeWidth={1.7} />
            {item.favorite ? 'Favorita' : 'Marcar favorita'}
          </Button>
          <Button variant="secondary" onClick={onEdit}>
            <Pencil className="size-3.5" /> Editar
          </Button>
          <IconButton label="Eliminar inspiração" onClick={onDelete} className="ml-auto hover:text-[#a23b2a]">
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

const studioMedia = [
  '/media/hero-interior.jpg',
  '/media/7673540222692379911-05.webp',
  '/media/7673556834803846407-06.webp',
  '/media/7659460783184547092-01.webp',
  '/media/7673552471175875858-03.webp',
  '/media/7673540222692379911-01.webp',
]

function InspirationForm({
  item,
  boards,
  defaultBoard,
  onCancel,
  onSave,
}: {
  item: Inspiration | null
  boards: string[]
  defaultBoard: string
  onCancel: () => void
  onSave: (draft: Draft) => Promise<void>
}) {
  const { projects } = useWorkspace()
  const [form, setForm] = useState<Draft>(
    item ?? { title: '', image: '', board: defaultBoard, source: 'Própria', tags: [], palette: [], savedAt: todayIso() },
  )
  const [tags, setTags] = useState(form.tags.join(', '))
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }))

  const applyImage = async (src: string) => {
    set('image', src)
    setError(null)
    setReading(true)
    try {
      set('palette', await extractPalette(src))
    } catch {
      // Hosts without CORS headers can still be shown, only their colours cannot be read.
      set('palette', [])
      setError('A imagem foi guardada, mas este site não deixa ler as cores. Pode adicioná-las à mão.')
    } finally {
      setReading(false)
    }
  }

  const onFile = async (file?: File) => {
    if (!file) return
    setReading(true)
    try {
      await applyImage(await fileToDataUrl(file))
    } catch {
      setReading(false)
      setError('Não foi possível ler esta fotografia. Tente outra imagem.')
    }
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!form.image) {
          setError('Escolha uma fotografia antes de guardar.')
          return
        }
        setBusy(true)
        await onSave({ ...form, title: form.title.trim() || 'Sem título', board: form.board.trim() || 'Geral', tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
        setBusy(false)
      }}
      className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-3">
        <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[1.1rem] bg-linho ring-1 ring-linha">
          <AnimatePresence mode="wait">
            {form.image ? (
              <motion.img key={form.image.slice(0, 80)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} src={form.image} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 px-6 text-center text-taupe">
                <ImagePlus className="size-7" strokeWidth={1.4} />
                <span className="text-[0.84rem]">Tire uma foto na obra ou escolha uma imagem</span>
              </motion.div>
            )}
          </AnimatePresence>
          {form.image && (
            <IconButton label="Remover imagem" onClick={() => setForm((f) => ({ ...f, image: '', palette: [] }))} className="absolute top-2.5 right-2.5 bg-marfim/85 backdrop-blur">
              <X className="size-4" />
            </IconButton>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => cameraRef.current?.click()}>
            <Camera className="size-4" /> Tirar foto
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" /> Galeria
          </Button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

        <div>
          <p className="text-[0.74rem] text-taupe">Ou do arquivo do estúdio</p>
          <div className="scrollbar-none mt-1.5 flex gap-1.5 overflow-x-auto">
            {studioMedia.map((src) => (
              <button type="button" key={src} onClick={() => applyImage(src)} className={cx('h-12 w-10 shrink-0 overflow-hidden rounded-lg ring-2 transition', form.image === src ? 'ring-cognac' : 'ring-transparent opacity-75 hover:opacity-100')}>
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Field label="Título">
          <input className="field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Hall em ripado de carvalho" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Coleção" hint="Escreva um nome novo para criar outra">
            <input className="field" list="inspiration-boards" value={form.board} onChange={(e) => set('board', e.target.value)} />
            <datalist id="inspiration-boards">
              {boards.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Field>
          <Field label="Origem">
            <select className="field" value={form.source} onChange={(e) => set('source', e.target.value as InspirationSource)}>
              {INSPIRATION_SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Projeto">
          <select className="field" value={form.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || undefined)}>
            <option value="">Livre, sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[0.78rem] text-nogueira/70">Paleta</span>
            {form.image && (
              <button type="button" onClick={() => applyImage(form.image)} className="flex items-center gap-1 text-[0.74rem] text-taupe hover:text-nogueira">
                <RefreshCw className={cx('size-3', reading && 'animate-spin')} /> Ler cores da imagem
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {form.palette.map((c, i) => (
              <label key={i} className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-nogueira/10" style={{ background: c }} title={c}>
                <input type="color" value={c} onChange={(e) => set('palette', form.palette.map((x, j) => (j === i ? e.target.value : x)))} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Cor ${i + 1}`} />
              </label>
            ))}
            {form.palette.length < 6 && (
              <label className="relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-dashed border-linha text-taupe hover:border-taupe" title="Adicionar cor">
                <Plus className="size-4" />
                <input type="color" value="#c9a98a" onChange={(e) => set('palette', [...form.palette, e.target.value])} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Adicionar cor" />
              </label>
            )}
            {reading && <span className="text-[0.74rem] text-taupe">A ler as cores…</span>}
          </div>
        </div>

        <Field label="Etiquetas" hint="Separadas por vírgulas">
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="madeira, luz indireta, travertino" />
        </Field>
        <Field label="Link da fonte">
          <span className="relative block">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-taupe" />
            <input type="url" className="field pl-9" value={form.link ?? ''} onChange={(e) => set('link', e.target.value || undefined)} placeholder="https://" />
          </span>
        </Field>
        <Field label="Nota">
          <textarea rows={3} className="field resize-none" value={form.note ?? ''} onChange={(e) => set('note', e.target.value || undefined)} placeholder="Porque guardou esta referência, onde a quer usar" />
        </Field>

        {error && <p className="rounded-xl bg-[#f8e3dd] px-3 py-2 text-[0.8rem] text-[#9b3424]">{error}</p>}

        <div className="mt-auto flex justify-end gap-2 border-t border-linha pt-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy || reading}>
            {busy ? 'A guardar…' : item ? 'Guardar alterações' : 'Guardar inspiração'}
          </Button>
        </div>
      </div>
    </form>
  )
}
