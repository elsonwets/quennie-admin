import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Images, Megaphone, Star, Trash2, X } from 'lucide-react'
import { fileToDataUrl } from '~/lib/image'
import { shortDate, todayIso } from '~/lib/format'
import { PHOTO_STAGES, type PhotoStage, type Project, type ProjectPhoto } from '~/lib/types'
import { useMutations, useToast, useWorkspace } from '~/lib/workspace'
import { removeMedia, uploadMedia } from '~/server/workspace'
import { IconButton, cx } from './ui'

const stageHint: Record<PhotoStage, string> = {
  Antes: 'O espaço como estava',
  Obra: 'Avanço dos trabalhos',
  '3D': 'Imagens do projeto 3D',
  Depois: 'O resultado final',
}

/** Photos of a project by stage: shot on site from the phone or picked from the gallery. */
export function ProjectGallery({ project }: { project: Project }) {
  const { save } = useMutations()
  const { posts } = useWorkspace()
  const toast = useToast()
  const photos = project.photos ?? []
  const [filter, setFilter] = useState<'all' | PhotoStage>('all')
  const [stage, setStage] = useState<PhotoStage>(project.phase === 'Concluído' || project.phase === 'Entrega' ? 'Depois' : project.phase === 'Obra' ? 'Obra' : project.phase === 'Projeto 3D' ? '3D' : 'Antes')
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const visible = filter === 'all' ? photos : photos.filter((p) => p.stage === filter)
  const before = photos.find((p) => p.stage === 'Antes')
  const after = photos.find((p) => p.stage === 'Depois')

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files].filter((f) => f.type.startsWith('image/'))
    setUploading({ done: 0, total: list.length })
    const added: ProjectPhoto[] = []
    try {
      for (const file of list) {
        const { url } = await uploadMedia({ data: { dataUrl: await fileToDataUrl(file, 1800) } })
        added.push({ id: crypto.randomUUID().slice(0, 8), url, stage, takenAt: todayIso() })
        setUploading({ done: added.length, total: list.length })
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível carregar a fotografia')
    }
    if (added.length) {
      await save('projects', { ...project, photos: [...photos, ...added] }, added.length === 1 ? 'Fotografia adicionada' : `${added.length} fotografias adicionadas`)
      setFilter(stage)
    }
    setUploading(null)
  }

  const update = (photo: ProjectPhoto, patch: Partial<ProjectPhoto>, message: string | null = null) =>
    save('projects', { ...project, photos: photos.map((p) => (p.id === photo.id ? { ...p, ...patch } : p)) }, message)

  const removePhoto = async (photo: ProjectPhoto) => {
    const rest = photos.filter((p) => p.id !== photo.id)
    setViewing(null)
    await save('projects', { ...project, photos: rest, cover: project.cover === photo.url ? (rest[rest.length - 1]?.url ?? project.cover) : project.cover }, 'Fotografia eliminada')
    // The file stays while something else still shows it: the cover, or a social post.
    const stillUsed = (project.cover === photo.url && !rest.length) || posts.some((p) => p.images.includes(photo.url))
    if (!stillUsed) await removeMedia({ data: { url: photo.url } })
  }

  return (
    <div className="mt-4 border-t border-linha pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.8rem] text-taupe">
          Fotografias <span className="tabular">{photos.length || ''}</span>
        </p>
        <select aria-label="Etapa das novas fotografias" value={stage} onChange={(e) => setStage(e.target.value as PhotoStage)} className="rounded-full bg-linho/60 px-2.5 py-1 text-[0.74rem] text-nogueira outline-none">
          {PHOTO_STAGES.map((s) => (
            <option key={s} value={s}>
              Adicionar em: {s}
            </option>
          ))}
        </select>
      </div>

      {photos.length > 0 && (
        <div className="scrollbar-none mt-2.5 flex gap-1 overflow-x-auto">
          {(['all', ...PHOTO_STAGES] as const).map((s) => {
            const count = s === 'all' ? photos.length : photos.filter((p) => p.stage === s).length
            if (s !== 'all' && !count) return null
            return (
              <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s} className={cx('shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] transition', filter === s ? 'bg-nogueira text-marfim' : 'bg-linho/60 text-nogueira/75 hover:bg-linho')}>
                {s === 'all' ? 'Todas' : s} <span className="tabular opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {before && after && (filter === 'all' || filter === 'Depois') && <BeforeAfter before={before.url} after={after.url} />}

      <ul className="mt-2.5 grid grid-cols-3 gap-1.5">
        {visible.map((photo) => (
          <li key={photo.id}>
            <button onClick={() => setViewing(photos.indexOf(photo))} className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-linho">
              <img src={photo.url} alt={photo.caption ?? photo.stage} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute bottom-1 left-1 rounded-full bg-nogueira/60 px-1.5 text-[0.6rem] text-marfim backdrop-blur">{photo.stage}</span>
              {project.cover === photo.url && <Star className="absolute top-1 right-1 size-3.5 fill-marfim text-marfim drop-shadow" />}
            </button>
          </li>
        ))}
        <li>
          <button
            onClick={() => pickRef.current?.click()}
            disabled={Boolean(uploading)}
            className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-linha text-[0.7rem] text-taupe transition hover:border-cognac hover:text-cognac-deep disabled:opacity-60"
          >
            <ImagePlus className="size-4" strokeWidth={1.6} />
            {uploading ? `${uploading.done}/${uploading.total}` : 'Galeria'}
          </button>
        </li>
        <li className="sm:hidden">
          <button onClick={() => cameraRef.current?.click()} disabled={Boolean(uploading)} className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-linha text-[0.7rem] text-taupe disabled:opacity-60">
            <Camera className="size-4" strokeWidth={1.6} />
            Câmara
          </button>
        </li>
      </ul>
      {photos.length === 0 && !uploading && <p className="mt-2 text-[0.76rem] text-taupe">{stageHint[stage]}: adicione as primeiras fotografias do projeto.</p>}
      {uploading && <p className="mt-2 text-[0.76rem] text-taupe">A carregar {uploading.done} de {uploading.total}…</p>}

      <input ref={pickRef} type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />

      <Viewer
        project={project}
        photos={photos}
        index={viewing}
        onIndex={setViewing}
        onCover={(p) => save('projects', { ...project, cover: p.url }, 'Capa do projeto atualizada')}
        onUpdate={update}
        onDelete={removePhoto}
      />
    </div>
  )
}

/** Drag the handle to compare the space before and after. */
function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [split, setSplit] = useState(50)
  return (
    <div className="relative mt-2.5 aspect-[4/3] overflow-hidden rounded-xl bg-linho select-none">
      <img src={after} alt="Depois" className="absolute inset-0 size-full object-cover" />
      <img src={before} alt="Antes" className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
      <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-marfim shadow" style={{ left: `${split}%` }} />
      <span className="absolute top-2 left-2 rounded-full bg-nogueira/60 px-2 py-0.5 text-[0.66rem] text-marfim backdrop-blur">Antes</span>
      <span className="absolute top-2 right-2 rounded-full bg-nogueira/60 px-2 py-0.5 text-[0.66rem] text-marfim backdrop-blur">Depois</span>
      <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Comparar antes e depois" className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
    </div>
  )
}

function Viewer({
  project,
  photos,
  index,
  onIndex,
  onCover,
  onUpdate,
  onDelete,
}: {
  project: Project
  photos: ProjectPhoto[]
  index: number | null
  onIndex: (i: number | null) => void
  onCover: (p: ProjectPhoto) => void
  onUpdate: (p: ProjectPhoto, patch: Partial<ProjectPhoto>) => void
  onDelete: (p: ProjectPhoto) => void
}) {
  const photo = index === null ? undefined : photos[index]
  const [caption, setCaption] = useState('')
  const touch = useRef<number | null>(null)
  const step = useCallback((d: number) => index !== null && photos.length > 1 && onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex])

  useEffect(() => setCaption(photo?.caption ?? ''), [photo?.id, photo?.caption])
  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Escape') onIndex(null)
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onIndex, step])

  return (
    <AnimatePresence>
      {photo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Fotografia do projeto" className="fixed inset-0 z-[70] flex flex-col bg-[#1d1510]/95 text-marfim backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
            <p className="min-w-0 truncate text-[0.82rem] text-marfim/75">
              {project.name} · {photo.stage} · {shortDate(photo.takenAt)} <span className="tabular">({(index ?? 0) + 1}/{photos.length})</span>
            </p>
            <IconButton label="Fechar" onClick={() => onIndex(null)} className="text-marfim/80 hover:bg-white/10 hover:text-marfim">
              <X className="size-5" />
            </IconButton>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2"
            onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touch.current === null) return
              const dx = e.changedTouches[0].clientX - touch.current
              if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
              touch.current = null
            }}
          >
            <motion.img key={photo.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} src={photo.url} alt={photo.caption ?? photo.stage} className="max-h-full max-w-full rounded-lg object-contain" />
            {photos.length > 1 && (
              <>
                <button onClick={() => step(-1)} aria-label="Anterior" className="absolute left-3 hidden size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => step(1)} aria-label="Seguinte" className="absolute right-3 hidden size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid">
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-2">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onBlur={() => caption !== (photo.caption ?? '') && onUpdate(photo, { caption: caption || undefined })}
                placeholder="Legenda (ex.: sala, vista da janela)"
                className="h-10 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[0.86rem] text-marfim outline-none placeholder:text-marfim/40 focus:bg-white/15"
              />
              <select value={photo.stage} onChange={(e) => onUpdate(photo, { stage: e.target.value as PhotoStage })} aria-label="Etapa" className="h-10 rounded-full bg-white/10 px-3 text-[0.82rem] text-marfim outline-none [&>option]:text-nogueira">
                {PHOTO_STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <ViewerAction onClick={() => onCover(photo)} disabled={project.cover === photo.url} icon={<Star className="size-4" />}>
                {project.cover === photo.url ? 'É a capa' : 'Usar como capa'}
              </ViewerAction>
              <Link to="/marketing" search={{ tab: 'redes', projeto: project.id, foto: photo.url }} className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[0.8rem] hover:bg-white/20">
                <Megaphone className="size-4" /> Criar publicação
              </Link>
              <a href={photo.url} download target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[0.8rem] hover:bg-white/20">
                <Images className="size-4" /> Abrir original
              </a>
              <ViewerAction onClick={() => onDelete(photo)} icon={<Trash2 className="size-4" />} className="ml-auto text-[#f3b9ab] hover:bg-[#a23b2a]/30">
                Eliminar
              </ViewerAction>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ViewerAction({ onClick, icon, children, disabled, className }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} className={cx('inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[0.8rem] transition hover:bg-white/20 disabled:opacity-50', className)}>
      {icon}
      {children}
    </button>
  )
}
