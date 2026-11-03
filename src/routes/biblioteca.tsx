import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Lamp, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { money } from '~/lib/format'
import { validateIdSearch } from '~/lib/search'
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '~/lib/types'
import { useMutations, useWorkspace } from '~/lib/workspace'
import { Badge, Button, ConfirmDelete, DetailPanel, EmptyState, Field, IconButton, Modal, PageHeader, Spec, Tabs, cx } from '~/components/ui'
import { usageTone } from '~/lib/tones'

export const Route = createFileRoute('/biblioteca')({
  validateSearch: validateIdSearch,
  head: () => ({ meta: [{ title: 'Biblioteca · Quennie' }] }),
  component: LibraryPage,
})

type Sort = 'recent' | 'price-asc' | 'price-desc' | 'name'
const sortLabels: Record<Sort, string> = {
  recent: 'Usados recentemente',
  'price-asc': 'Preço, crescente',
  'price-desc': 'Preço, decrescente',
  name: 'Nome',
}

function LibraryPage() {
  const { products, projects } = useWorkspace()
  const { save, remove } = useMutations()
  const { id } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const [category, setCategory] = useState<'all' | ProductCategory>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [similarTo, setSimilarTo] = useState<Product | null>(null)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [assigning, setAssigning] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const activeIds = new Set(projects.filter((p) => p.phase !== 'Concluído').map((p) => p.id))
  const inUse = products.filter((p) => p.usage.some((u) => activeIds.has(u.projectId))).length

  const visible = useMemo(() => {
    let list = products.filter((p) => category === 'all' || p.category === category)
    if (similarTo) list = list.filter((p) => p.category === similarTo.category && p.id !== similarTo.id)
    const sorted = [...list]
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    if (sort === 'recent') sorted.sort((a, b) => b.usage.length - a.usage.length)
    return sorted
  }, [products, category, sort, similarTo])

  const selected = products.find((p) => p.id === id) ?? visible[0]
  const select = (productId?: string) => navigate({ search: productId ? { id: productId } : {}, replace: true, resetScroll: false })

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Biblioteca de produtos"
        subtitle={`${products.length} produtos e materiais, ${inUse} em uso em projetos ativos`}
        actions={
          <>
            <Button variant="accent" onClick={() => selected && setSimilarTo(similarTo ? null : selected)} disabled={!selected}>
              <Sparkles className="size-4" strokeWidth={1.6} />
              {similarTo ? 'Ver todos' : 'Encontrar semelhantes'}
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" />
              Adicionar produto
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={category}
          onChange={(value) => {
            setCategory(value)
            setSimilarTo(null)
          }}
          items={[
            { value: 'all', label: 'Todos', count: products.length },
            ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c, count: products.filter((p) => p.category === c).length })).filter((t) => t.count > 0),
          ]}
        />
        <label className="relative flex items-center gap-1 self-end text-[0.82rem] text-nogueira/80 sm:self-auto">
          <span className="sr-only">Ordenar</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="cursor-pointer appearance-none bg-transparent pr-5 text-right focus:outline-none"
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0 size-3.5" />
        </label>
      </div>

      {similarTo && (
        <p className="-mt-3 text-[0.84rem] text-taupe">
          Semelhantes a <span className="text-nogueira">{similarTo.name}</span>, na categoria {similarTo.category.toLowerCase()}.
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        {visible.length === 0 ? (
          <EmptyState icon={<Lamp className="size-5" />} title="Sem produtos" text="Ainda não há produtos nesta categoria." action={<Button onClick={() => setEditing('new')}>Adicionar produto</Button>} />
        ) : (
          <motion.ul layout className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4 md:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence initial={false}>
              {visible.map((product, index) => (
                <motion.li
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index * 0.03, 0.3), duration: 0.45 } }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <ProductCard product={product} active={selected?.id === product.id} onSelect={() => select(product.id)} projectName={projects.find((p) => p.id === product.usage[0]?.projectId)?.name} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        <DetailPanel open={Boolean(id)} onClose={() => select(undefined)}>
          {selected && (
            <ProductDetail
              product={selected}
              onEdit={() => setEditing(selected)}
              onAssign={() => setAssigning(selected)}
              onDelete={() => setDeleting(selected)}
            />
          )}
        </DetailPanel>
      </div>

      <ProductForm
        product={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          const saved = await save('products', data, data.id ? 'Produto atualizado' : 'Produto adicionado à biblioteca')
          setEditing(null)
          select(saved.id)
        }}
      />
      <AssignDialog
        product={assigning}
        onClose={() => setAssigning(null)}
        onAssign={async (usage) => {
          if (!assigning) return
          await save('products', { ...assigning, usage: [...assigning.usage, usage] }, 'Adicionado ao projeto')
          setAssigning(null)
        }}
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        what={deleting?.name ?? 'O produto'}
        onConfirm={() => {
          if (!deleting) return
          remove('products', deleting.id, 'Produto eliminado')
          select(undefined)
        }}
      />
    </div>
  )
}

function ProductCard({ product, active, onSelect, projectName }: { product: Product; active: boolean; onSelect: () => void; projectName?: string }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={cx(
        'group block w-full rounded-[1.25rem] p-1.5 text-left transition-all duration-300',
        active ? 'bg-white shadow-card ring-1 ring-linha' : 'hover:bg-white/70',
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-linho">
        <img src={product.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-[var(--ease-drape)] group-hover:scale-[1.04]" />
      </div>
      <div className="px-1.5 pt-3 pb-1.5">
        <p className="truncate text-[0.9rem]">{product.name}</p>
        <p className="mt-0.5 truncate text-[0.76rem] text-taupe">
          {product.maker}, {product.category.toLowerCase()}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <span className="tabular text-[0.82rem]">
            {money(product.price)} <span className="text-taupe">/ {product.unit}</span>
          </span>
          {projectName && <span className="max-w-full truncate rounded-md bg-linho/80 px-2 py-0.5 text-[0.7rem] text-nogueira/75">{projectName.split(',')[0]}</span>}
        </div>
      </div>
    </button>
  )
}

function ProductDetail({ product, onEdit, onAssign, onDelete }: { product: Product; onEdit: () => void; onAssign: () => void; onDelete: () => void }) {
  const { projects } = useWorkspace()
  return (
    <motion.div key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="aspect-[4/3] overflow-hidden rounded-[1.1rem] bg-linho">
        <img src={product.image} alt={product.name} className="size-full object-cover" />
      </div>
      <div className="px-1.5 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="display text-[1.65rem] leading-tight">{product.name}</h2>
            <p className="mt-1 text-[0.8rem] text-taupe">
              {product.maker}, {product.category.toLowerCase()}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5 pt-1 pr-8 xl:pr-0">
            <IconButton label="Editar produto" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </IconButton>
            <IconButton label="Eliminar produto" onClick={onDelete} className="hover:text-[#a23b2a]">
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        </div>

        <dl className="mt-4">
          <Spec label="Preço">
            <span className="tabular">
              {money(product.price)} s/ IVA / {product.unit}
            </span>
          </Spec>
          <Spec label="Acabamento">{product.finish}</Spec>
          <Spec label="Dimensões">{product.dimensions}</Spec>
          <Spec label="Material">{product.material}</Spec>
          <Spec label="Prazo">{product.leadTime}</Spec>
        </dl>

        <div className="mt-4 border-t border-linha pt-4">
          <p className="text-[0.8rem] text-taupe">Usado em</p>
          {product.usage.length === 0 ? (
            <p className="mt-2 text-[0.84rem] text-nogueira/70">Ainda não foi usado em nenhum projeto.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-3">
              {product.usage.map((u, i) => {
                const project = projects.find((p) => p.id === u.projectId)
                return (
                  <li key={`${u.projectId}-${i}`} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.86rem]">{project?.name ?? 'Projeto removido'}</p>
                      <p className="text-[0.74rem] text-taupe">
                        {u.room}, {u.quantity} {product.unit}, {money(u.quantity * product.price)}
                      </p>
                    </div>
                    <Badge tone={usageTone[u.status]} dot>
                      {u.status}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 pb-1">
          <Button variant="secondary" onClick={onEdit}>
            Editar ficha
          </Button>
          <Button onClick={onAssign}>Adicionar ao projeto</Button>
        </div>
      </div>
    </motion.div>
  )
}

const emptyProduct: Omit<Product, 'id'> = {
  name: '',
  maker: 'Atelier Quennie',
  category: 'Mobiliário',
  price: 0,
  unit: 'peça',
  finish: '',
  dimensions: '',
  material: '',
  leadTime: '3 semanas',
  image: '/media/7673540222692379911-04.webp',
  usage: [],
}

const imageChoices = [
  '/media/7673540222692379911-04.webp',
  '/media/7673556834803846407-02.webp',
  '/media/7673556834803846407-05.webp',
  '/media/7659460783184547092-05.webp',
  '/media/7652338046658039061-frame.webp',
  '/media/7673540222692379911-05.webp',
]

function ProductForm({ product, onClose, onSave }: { product: Product | 'new' | null; onClose: () => void; onSave: (p: Omit<Product, 'id'> & { id?: string }) => Promise<void> }) {
  const initial = product === 'new' || !product ? emptyProduct : product
  return (
    <Modal open={Boolean(product)} onClose={onClose} title={product === 'new' ? 'Novo produto' : 'Editar produto'} description="Fichas técnicas reutilizáveis em todos os projetos." wide>
      {product && <ProductFormBody key={product === 'new' ? 'new' : product.id} initial={initial} onCancel={onClose} onSave={onSave} />}
    </Modal>
  )
}

function ProductFormBody({ initial, onCancel, onSave }: { initial: Omit<Product, 'id'> & { id?: string }; onCancel: () => void; onSave: (p: Omit<Product, 'id'> & { id?: string }) => Promise<void> }) {
  const [form, setForm] = useState(initial)
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
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <span className="text-[0.78rem] text-nogueira/70">Imagem</span>
        <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
          {[...new Set([form.image, ...imageChoices])].map((src) => (
            <button
              type="button"
              key={src}
              onClick={() => set('image', src)}
              className={cx('size-16 shrink-0 overflow-hidden rounded-xl ring-2 transition', form.image === src ? 'ring-cognac' : 'ring-transparent opacity-70 hover:opacity-100')}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <Field label="Nome" className="sm:col-span-2">
        <input required className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Cabeceira estofada em bouclé" />
      </Field>
      <Field label="Fornecedor / atelier">
        <input required className="field" value={form.maker} onChange={(e) => set('maker', e.target.value)} />
      </Field>
      <Field label="Categoria">
        <select className="field" value={form.category} onChange={(e) => set('category', e.target.value as ProductCategory)}>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Preço (FCFA, sem IVA)">
        <input required type="number" min={0} step="1" className="field tabular" value={form.price} onChange={(e) => set('price', Number(e.target.value))} />
      </Field>
      <Field label="Unidade">
        <select className="field" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
          {['peça', 'unid.', 'm²', 'm', 'conjunto'].map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </Field>
      <Field label="Acabamento">
        <input className="field" value={form.finish} onChange={(e) => set('finish', e.target.value)} />
      </Field>
      <Field label="Material">
        <input className="field" value={form.material} onChange={(e) => set('material', e.target.value)} />
      </Field>
      <Field label="Dimensões">
        <input className="field" value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} placeholder="L × P × A" />
      </Field>
      <Field label="Prazo de entrega">
        <input className="field" value={form.leadTime} onChange={(e) => set('leadTime', e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-linha pt-4 sm:col-span-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'A guardar…' : 'Guardar produto'}
        </Button>
      </div>
    </form>
  )
}

function AssignDialog({ product, onClose, onAssign }: { product: Product | null; onClose: () => void; onAssign: (u: Product['usage'][number]) => Promise<void> }) {
  const { projects } = useWorkspace()
  const open = projects.filter((p) => p.phase !== 'Concluído')
  const [projectId, setProjectId] = useState('')
  const [room, setRoom] = useState('')
  const [quantity, setQuantity] = useState(1)
  const project = open.find((p) => p.id === (projectId || open[0]?.id))

  return (
    <Modal open={Boolean(product)} onClose={onClose} title="Adicionar ao projeto" description={product?.name}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!project) return
          await onAssign({ projectId: project.id, room: room || project.rooms[0] || 'Geral', quantity, status: 'Proposto' })
          setRoom('')
          setQuantity(1)
        }}
        className="grid gap-4"
      >
        <Field label="Projeto">
          <select className="field" value={project?.id} onChange={(e) => setProjectId(e.target.value)}>
            {open.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Divisão">
            <select className="field" value={room || project?.rooms[0]} onChange={(e) => setRoom(e.target.value)}>
              {project?.rooms.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label={`Quantidade (${product?.unit})`}>
            <input type="number" min={1} className="field tabular" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </Field>
        </div>
        {product && (
          <p className="rounded-2xl bg-linho/60 px-4 py-3 text-[0.84rem]">
            Estimativa: <span className="tabular">{money(product.price * quantity)}</span> sem IVA, prazo {product.leadTime}.
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-linha pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Adicionar como proposta</Button>
        </div>
      </form>
    </Modal>
  )
}
