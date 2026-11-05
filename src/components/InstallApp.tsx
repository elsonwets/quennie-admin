import { useState } from 'react'
import { Download, Share, SquarePlus } from 'lucide-react'
import { useInstallApp } from '~/lib/install'
import { Button, Modal, cx } from './ui'

/** "Instalar app": the browser's own install dialog, or the iPhone steps. Hidden once installed. */
export function InstallApp({ className, onDone }: { className?: string; onDone?: () => void }) {
  const { mode, install } = useInstallApp()
  const [steps, setSteps] = useState(false)
  if (mode === 'hidden') return null

  return (
    <>
      <button
        onClick={async () => {
          if (mode === 'ios') return setSteps(true)
          await install()
          onDone?.()
        }}
        className={cx('flex items-center gap-3 rounded-2xl bg-nogueira px-3.5 py-3 text-left text-marfim active:scale-[0.99]', className)}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marfim/12">
          <Download className="size-[1.1rem]" strokeWidth={1.6} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[0.88rem]">Instalar a app</span>
          <span className="block truncate text-[0.7rem] text-marfim/65">Abre no ecrã principal, como uma app</span>
        </span>
      </button>

      <Modal open={steps} onClose={() => setSteps(false)} title="Instalar no iPhone" description="Três toques no Safari.">
        <ol className="flex flex-col gap-4 text-[0.9rem]">
          <li className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linho text-cognac-deep">
              <Share className="size-4" />
            </span>
            <span>
              Toque em <b className="font-medium">Partilhar</b>, na barra do Safari.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linho text-cognac-deep">
              <SquarePlus className="size-4" />
            </span>
            <span>
              Escolha <b className="font-medium">Adicionar ao ecrã principal</b>.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linho font-display text-lg text-cognac-deep">Q</span>
            <span>
              Confirme com <b className="font-medium">Adicionar</b>. A app Quennie aparece no ecrã principal.
            </span>
          </li>
        </ol>
        <p className="mt-5 text-[0.78rem] text-taupe">No Chrome do iPhone, abra primeiro esta página no Safari.</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setSteps(false)}>Percebido</Button>
        </div>
      </Modal>
    </>
  )
}
