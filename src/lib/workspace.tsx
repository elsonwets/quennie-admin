import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { deleteRecord, saveRecord } from '~/server/workspace'
import type { Collection, Workspace } from './types'

const rootApi = getRouteApi('__root__')

export function useWorkspace(): Workspace {
  return rootApi.useLoaderData()
}

type Item<C extends Collection> = Workspace[C][number]

const ToastContext = createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const show = useCallback((message: string) => {
    const id = Date.now()
    setToast({ id, message })
    setTimeout(() => setToast((current) => (current?.id === id ? null : current)), 2600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4 lg:bottom-6">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: [0.65, 0, 0.18, 1] }}
              className="flex items-center gap-2.5 rounded-full bg-nogueira py-2.5 pr-5 pl-3 text-sm text-marfim shadow-lg"
            >
              <span className="grid size-6 place-items-center rounded-full bg-palma">
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

export function useMutations() {
  const router = useRouter()
  const toast = useToast()

  const save = useCallback(
    // `message: null` saves quietly, for follow-up writes that belong to one user action.
    async <C extends Collection>(collection: C, record: Omit<Item<C>, 'id'> & { id?: string }, message: string | null = 'Alterações guardadas') => {
      const saved = (await saveRecord({ data: { collection, record } })) as Item<C>
      await router.invalidate()
      if (message) toast(message)
      return saved
    },
    [router, toast],
  )

  const remove = useCallback(
    async (collection: Collection, id: string, message = 'Registo eliminado') => {
      await deleteRecord({ data: { collection, id } })
      await router.invalidate()
      toast(message)
    },
    [router, toast],
  )

  return { save, remove }
}
