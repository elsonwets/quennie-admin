import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import type { Collection, Workspace } from '~/lib/types'
import { requireUser } from './auth'
import { getSupabaseServerClient } from './supabase'

// Data lives in Supabase (see supabase/setup.sql): one table per collection, the record
// as JSON in `data`. Every call runs with the signed-in user's session, so the database's
// row-level security decides what can be read or written, on top of requireUser().

const COLLECTIONS: Collection[] = ['clients', 'projects', 'products', 'invoices', 'appointments', 'inspirations', 'leads', 'templates', 'outreach', 'posts']
const LATER_COLLECTIONS: Collection[] = ['leads', 'templates', 'outreach', 'posts']
const BUCKET = 'media'
const PHOTO_FIELDS = ['image', 'cover'] as const

type Row = { id: string; data: Record<string, unknown> }
type Db = ReturnType<typeof getSupabaseServerClient>

function assertCollection(value: unknown): Collection {
  if (typeof value !== 'string' || !COLLECTIONS.includes(value as Collection)) {
    throw new Error(`Coleção desconhecida: ${String(value)}`)
  }
  return value as Collection
}

/** Camera shots arrive as data URLs: store them as files and keep only their address. */
const uploadPhoto = createServerOnlyFn(async (db: Db, dataUrl: string) => {
  const match = /^data:(image\/(webp|jpeg|png));base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.')
  const [, contentType, ext, base64] = match
  const path = `uploads/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`
  const { error } = await db.storage.from(BUCKET).upload(path, Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)), { contentType })
  if (error) throw new Error(`Não foi possível guardar a fotografia: ${error.message}`)
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
})

const storedPath = (url: unknown) => {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  return typeof url === 'string' && url.includes(marker) ? url.slice(url.indexOf(marker) + marker.length) : null
}

/** Every uploaded file a record points to: cover/image, project photos. Post images are shared, so they stay. */
const recordPaths = (data: Record<string, unknown> | undefined) => {
  if (!data) return []
  const urls: unknown[] = PHOTO_FIELDS.map((f) => data[f])
  if (Array.isArray(data.photos)) for (const p of data.photos) urls.push((p as { url?: unknown })?.url)
  return [...new Set(urls.map(storedPath).filter((p): p is string => Boolean(p)))]
}

export const getWorkspace = createServerFn({ method: 'GET' }).handler(async (): Promise<Workspace> => {
  await requireUser()
  const db = getSupabaseServerClient()
  const results = await Promise.all(COLLECTIONS.map((c) => db.from(c).select('id, data').order('created_at', { ascending: false })))
  const workspace = {} as Record<Collection, unknown[]>
  results.forEach(({ data, error }, i) => {
    // Tables added after the first install stay empty until setup.sql is run again.
    if (error && LATER_COLLECTIONS.includes(COLLECTIONS[i]) && (error.code === 'PGRST205' || error.code === '42P01')) {
      console.warn(`Tabela ${COLLECTIONS[i]} em falta: volte a correr supabase/setup.sql`)
      workspace[COLLECTIONS[i]] = []
      return
    }
    if (error) throw new Error(`Não foi possível ler ${COLLECTIONS[i]}: ${error.message}`)
    workspace[COLLECTIONS[i]] = (data as Row[]).map((row) => ({ ...row.data, id: row.id }))
  })
  return workspace as unknown as Workspace
})

export const saveRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const { collection, record } = (input ?? {}) as { collection?: unknown; record?: { id?: unknown } }
    if (!record || typeof record !== 'object') throw new Error('Registo inválido')
    return { collection: assertCollection(collection), record: record as { id?: string } & Record<string, unknown> }
  })
  .handler(async ({ data: input }) => {
    await requireUser()
    const db = getSupabaseServerClient()
    const { id: givenId, ...data } = input.record
    const id = givenId || `${input.collection.slice(0, 2)}-${crypto.randomUUID().slice(0, 8)}`

    for (const field of PHOTO_FIELDS) {
      const value = data[field]
      if (typeof value === 'string' && value.startsWith('data:')) data[field] = await uploadPhoto(db, value)
    }

    const { error } = await db.from(input.collection).upsert({ id, data, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw new Error(`Não foi possível guardar: ${error.message}`)
    return { ...data, id }
  })

export const deleteRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const { collection, id } = (input ?? {}) as { collection?: unknown; id?: unknown }
    if (typeof id !== 'string') throw new Error('Identificador inválido')
    return { collection: assertCollection(collection), id }
  })
  .handler(async ({ data: input }) => {
    await requireUser()
    const db = getSupabaseServerClient()
    const { data: removed, error } = await db.from(input.collection).delete().eq('id', input.id).select('data').maybeSingle()
    if (error) throw new Error(`Não foi possível eliminar: ${error.message}`)

    // Photos uploaded from the app go with their record; studio and demo images stay.
    const paths = recordPaths((removed as Row | null)?.data)
    if (paths.length) await db.storage.from(BUCKET).remove(paths)
    return { ok: true }
  })

/** One photo per request, so a gallery of several shots never hits the request size limit. */
export const uploadMedia = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const { dataUrl } = (input ?? {}) as { dataUrl?: unknown }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) throw new Error('Imagem inválida')
    return { dataUrl }
  })
  .handler(async ({ data: input }) => {
    await requireUser()
    return { url: await uploadPhoto(getSupabaseServerClient(), input.dataUrl) }
  })

/** Removes a file uploaded from the app. Studio and demo images (not in the bucket) are left alone. */
export const removeMedia = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const { url } = (input ?? {}) as { url?: unknown }
    if (typeof url !== 'string') throw new Error('Endereço inválido')
    return { url }
  })
  .handler(async ({ data: input }) => {
    await requireUser()
    const path = storedPath(input.url)
    if (path) await getSupabaseServerClient().storage.from(BUCKET).remove([path])
    return { ok: true }
  })
