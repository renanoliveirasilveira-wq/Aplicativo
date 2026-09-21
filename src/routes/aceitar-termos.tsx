import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'

import { getCurrentSession } from '@/lib/session'
import { aceitarTermos } from '@/lib/termos.functions'
import { useServerFn } from '@tanstack/react-start'

export const Route = createFileRoute('/aceitar-termos')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    if ((session.user as { termosAceitosEm?: Date | null }).termosAceitosEm) {
      throw redirect({ to: '/' })
    }
  },
  head: () => ({
    meta: [{ title: 'Aceite os Termos — Manual de Contextualização Bíblica' }],
  }),
  component: AceitarTermos,
})

function AceitarTermos() {
  const router = useRouter()
  const aceitarFn = useServerFn(aceitarTermos)
  const [marcado, setMarcado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function continuar() {
    if (!marcado) return
    setCarregando(true)
    await aceitarFn()
    router.navigate({ to: '/' })
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card-ornament w-full max-w-md animate-fade-rise p-6 sm:p-8">
        <div className="mb-5 text-center">
          <span className="text-gradient-flame text-2xl">✦</span>
          <h1 className="font-display mt-2 text-2xl font-semibold text-foreground">
            Antes de continuar
          </h1>
          <p className="font-serif-body mt-2 text-sm leading-relaxed text-muted-foreground">
            Este aplicativo é uma ferramenta de apoio ao curso — seus dados
            são usados só para isso, e protegidos de acordo com a LGPD.
            Leia e aceite os documentos abaixo para continuar.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <a
            href="/termos"
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-input bg-background px-4 py-2.5 font-semibold text-foreground no-underline hover:border-ring"
          >
            Ler os Termos de Uso ↗
          </a>
          <a
            href="/privacidade"
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-input bg-background px-4 py-2.5 font-semibold text-foreground no-underline hover:border-ring"
          >
            Ler a Política de Privacidade ↗
          </a>
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={marcado}
            onChange={(e) => setMarcado(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--flame)]"
          />
          <span>
            Li e aceito os Termos de Uso e a Política de Privacidade, e
            entendo que esta é uma ferramenta de apoio ao curso, sem outra
            finalidade.
          </span>
        </label>

        <button
          type="button"
          onClick={continuar}
          disabled={!marcado || carregando}
          className="mt-5 w-full rounded-md bg-gradient-flame px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {carregando ? 'Aguarde…' : 'Aceitar e continuar'}
        </button>
      </div>
    </main>
  )
}
