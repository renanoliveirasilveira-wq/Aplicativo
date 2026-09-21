import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'

import { authClient, signIn, signUp } from '@/lib/auth-client'
import { getCurrentSession } from '@/lib/session'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (session) {
      throw redirect({ to: '/' })
    }
  },
  head: () => ({
    meta: [{ title: 'Entrar — Manual de Contextualização Bíblica' }],
  }),
  component: Login,
})

function Login() {
  const router = useRouter()
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [avisoRecuperacao, setAvisoRecuperacao] = useState('')

  async function onEsqueciSenha() {
    setErro('')
    setAvisoRecuperacao('')
    if (!email) {
      setErro('Digite seu e-mail acima antes de pedir o link de redefinição.')
      return
    }
    setCarregando(true)
    await authClient.requestPasswordReset({ email, redirectTo: '/definir-senha' })
    setCarregando(false)
    setAvisoRecuperacao(
      'Se esse e-mail tiver uma conta, enviamos um link para você definir uma nova senha.',
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const resultado =
      modo === 'entrar'
        ? await signIn.email({ email, password: senha })
        : await signUp.email({ email, password: senha, name: nome })

    setCarregando(false)

    if (resultado.error) {
      setErro(resultado.error.message ?? 'Não foi possível continuar.')
      return
    }

    router.navigate({ to: '/' })
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card-ornament w-full max-w-sm animate-fade-rise p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="text-gradient-flame text-2xl">✦</span>
          <h1 className="font-display mt-2 text-2xl font-semibold text-foreground">
            Manual de Contextualização Bíblica
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modo === 'entrar'
              ? 'Entre com sua conta para continuar.'
              : 'Crie sua conta para começar.'}
          </p>
        </div>

        <div className="mb-5 flex rounded-lg bg-secondary p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setModo('entrar')}
            className={`flex-1 rounded-md py-1.5 transition ${modo === 'entrar' ? 'bg-gradient-flame text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setModo('criar')}
            className={`flex-1 rounded-md py-1.5 transition ${modo === 'criar' ? 'bg-gradient-flame text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {modo === 'criar' && (
            <div>
              <label htmlFor="nome" className="label-caps">
                Nome
              </label>
              <input
                id="nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label-caps">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="senha" className="label-caps">
              Senha
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

          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {avisoRecuperacao && (
            <p className="text-sm text-muted-foreground">{avisoRecuperacao}</p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 w-full rounded-md bg-gradient-flame px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {carregando
              ? 'Aguarde…'
              : modo === 'entrar'
                ? 'Entrar'
                : 'Criar conta'}
          </button>

          {modo === 'entrar' && (
            <button
              type="button"
              onClick={onEsqueciSenha}
              disabled={carregando}
              className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            >
              Esqueci minha senha
            </button>
          )}
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          O acesso normalmente é liberado automaticamente após a compra do
          curso. Esta tela de criação de conta é temporária, para testes.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Ao continuar, você poderá revisar e aceitar nossos{' '}
          <a href="/termos" target="_blank" rel="noreferrer">
            Termos de Uso
          </a>{' '}
          e{' '}
          <a href="/privacidade" target="_blank" rel="noreferrer">
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </main>
  )
}
