import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/definir-senha')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search['token'] === 'string' ? search['token'] : undefined,
    error: typeof search['error'] === 'string' ? search['error'] : undefined,
  }),
  head: () => ({
    meta: [{ title: 'Definir senha — Manual de Contextualização Bíblica' }],
  }),
  component: DefinirSenha,
})

function DefinirSenha() {
  const router = useRouter()
  const { token, error: erroToken } = Route.useSearch()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }
    if (!token) {
      setErro('Link inválido ou incompleto. Peça um novo link.')
      return
    }

    setCarregando(true)
    const resultado = await authClient.resetPassword({ newPassword: senha, token })
    setCarregando(false)

    if (resultado.error) {
      setErro(resultado.error.message ?? 'Não foi possível definir a senha.')
      return
    }

    router.navigate({ to: '/login' })
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card-ornament w-full max-w-sm animate-fade-rise p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="text-gradient-flame text-2xl">✦</span>
          <h1 className="font-display mt-2 text-2xl font-semibold text-foreground">
            Defina sua senha
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma senha para acessar sua conta.
          </p>
        </div>

        {(erroToken || !token) && (
          <p className="mb-4 text-center text-sm text-destructive">
            Esse link não é mais válido. Peça um novo link em "Esqueci minha senha" na tela de
            login.
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="senha" className="label-caps">
              Nova senha
            </label>
            <input
              id="senha"
              type="password"
              required
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="confirmacao" className="label-caps">
              Confirme a senha
            </label>
            <input
              id="confirmacao"
              type="password"
              required
              minLength={8}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <button
            type="submit"
            disabled={carregando || !token}
            className="mt-2 w-full rounded-md bg-gradient-flame px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {carregando ? 'Aguarde…' : 'Definir senha'}
          </button>
        </form>
      </div>
    </main>
  )
}
