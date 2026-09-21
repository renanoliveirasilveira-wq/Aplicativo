import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import {
  BookOpenText,
  History,
  LogOut,
  Menu,
  MessageCirclePlus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'

import { signOut } from '@/lib/auth-client'
import { listarConversas } from '@/lib/chat.functions'

type SidebarUser = {
  name: string
  email: string
  role?: string | null
}

const links = [
  { to: '/', label: 'Contextualizar', icon: Sparkles },
] as const

function iniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

function ConversasRecentes() {
  const fn = useServerFn(listarConversas)
  const { data } = useQuery({
    queryKey: ['conversas'],
    queryFn: () => fn(),
  })

  const recentes = (data ?? []).slice(0, 4)
  if (recentes.length === 0) return null

  return (
    <div className="ml-3 space-y-0.5 border-l border-[var(--line)] pl-3">
      {recentes.map((item) => (
        <Link
          key={item.id}
          to="/historico/$id"
          params={{ id: item.id }}
          className="block truncate rounded-md px-2 py-1.5 text-xs text-muted-foreground no-underline transition hover:bg-[var(--chip-bg)] hover:text-foreground"
          activeProps={{ className: 'block truncate rounded-md px-2 py-1.5 text-xs text-foreground bg-[var(--chip-bg)] no-underline' }}
        >
          {item.titulo}
        </Link>
      ))}
    </div>
  )
}

function SidebarContent({ user }: { user: SidebarUser }) {
  const router = useRouter()

  async function sair() {
    await signOut()
    router.navigate({ to: '/login' })
  }

  return (
    <>
      <div className="flex items-center gap-2 px-5 pb-6 pt-6">
        <span className="text-gradient-flame text-xl">✦</span>
        <span className="font-display text-sm font-semibold leading-tight text-foreground">
          Manual de
          <br />
          Contextualização Bíblica
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="sidebar-link"
            activeProps={{ className: 'sidebar-link is-active' }}
            activeOptions={{ exact: true }}
          >
            <Icon size={18} strokeWidth={2.25} />
            {label}
          </Link>
        ))}

        <Link
          to="/"
          search={{ sessao: String(Date.now()) }}
          className="sidebar-link"
        >
          <MessageCirclePlus size={18} strokeWidth={2.25} />
          Nova conversa
        </Link>

        <Link
          to="/historico"
          className="sidebar-link"
          activeProps={{ className: 'sidebar-link is-active' }}
          activeOptions={{ exact: true }}
        >
          <History size={18} strokeWidth={2.25} />
          Histórico
        </Link>

        <ConversasRecentes />

        <Link
          to="/sobre"
          className="sidebar-link"
          activeProps={{ className: 'sidebar-link is-active' }}
        >
          <BookOpenText size={18} strokeWidth={2.25} />
          Sobre o Método
        </Link>

        {user.role === 'admin' && (
          <Link
            to="/admin"
            className="sidebar-link"
            activeProps={{ className: 'sidebar-link is-active' }}
          >
            <ShieldCheck size={18} strokeWidth={2.25} />
            Painel Admin
          </Link>
        )}
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <Link
          to="/perfil"
          className="sidebar-link"
          activeProps={{ className: 'sidebar-link is-active' }}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-flame text-xs font-bold text-primary-foreground">
            {iniciais(user.name || user.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {user.name || 'Minha conta'}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={sair}
          className="sidebar-link mt-1 w-full cursor-pointer text-left"
        >
          <LogOut size={18} strokeWidth={2.25} />
          Sair
        </button>
      </div>
    </>
  )
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const [aberta, setAberta] = useState(false)

  return (
    <>
      <header className="app-sidebar-mobile-bar flex items-center justify-between border-b border-[var(--line)] bg-[var(--header-bg)] px-4 py-3 md:hidden">
        <span className="font-display text-sm font-semibold text-foreground">
          Manual de Contextualização Bíblica
        </span>
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-foreground"
        >
          <Menu size={22} />
        </button>
      </header>

      <aside className="app-sidebar hidden md:flex md:flex-col">
        <SidebarContent user={user} />
      </aside>

      {aberta && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setAberta(false)}
          />
          <aside className="app-sidebar relative flex h-full flex-col">
            <button
              type="button"
              onClick={() => setAberta(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground"
            >
              <X size={20} />
            </button>
            <SidebarContent user={user} />
          </aside>
        </div>
      )}
    </>
  )
}
