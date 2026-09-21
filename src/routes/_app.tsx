import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import Sidebar from '@/components/Sidebar'
import { getCurrentSession } from '@/lib/session'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    if (!(session.user as { termosAceitosEm?: Date | null }).termosAceitosEm) {
      throw redirect({ to: '/aceitar-termos' })
    }
    return { user: session.user }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useRouteContext()
  const role = (user as unknown as { role?: string | null }).role

  return (
    <div className="app-shell">
      <Sidebar user={{ name: user.name, email: user.email, role }} />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}
