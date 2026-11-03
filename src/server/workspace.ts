import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import type { Collection, Workspace } from '~/lib/types'
import { requireUser } from './auth'
import { getSupabaseServerClient } from './supabase'

// Data lives in Supabase (see supabase/setup.sql): one table per collection, the record
// as JSON in `data`. Every call runs with the signed-in user's session, so the database's
// row-level security decides what can be read or written, on top of requireUser().

const COLLECTIONS: Collection[] = ['clients', 'projects', 'products', 'invoices', 'appointments', 'inspirations']
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

export const getWorkspace = createServerFn({ method: 'GET' }).handler(async (): Promise<Workspace> => {
  await requireUser()
  const db = getSupabaseServerClient()
  const results = await Promise.all(COLLECTIONS.map((c) => db.from(c).select('id, data').order('created_at', { ascending: false })))
  const workspace = {} as Record<Collection, unknown[]>
  results.forEach(({ data, error }, i) => {
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
    const paths = PHOTO_FIELDS.map((f) => storedPath((removed as Row | null)?.data?.[f])).filter((p): p is string => Boolean(p))
    if (paths.length) await db.storage.from(BUCKET).remove(paths)
    return { ok: true }
  })
