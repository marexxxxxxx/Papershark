import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '@/stores/store'
import Dashboard from '@/pages/Dashboard'
import Agents from '@/pages/Agents'
import AgentDetail from '@/pages/AgentDetail'
import Gateways from '@/pages/Gateways'
import { LayoutDashboard, Users, Globe } from 'lucide-react'

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  const { stats } = useStore()

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-card p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">🦈</span>
            Planshark
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Agent Management</p>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/agents" icon={Users} label="Agents" />
          <NavItem to="/gateways" icon={Globe} label="Gateways" />
        </nav>

        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-muted rounded">
              <div className="text-2xl font-bold">{stats?.running_agents ?? 0}</div>
              <div className="text-muted-foreground">Running</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="text-2xl font-bold">{stats?.total_agents ?? 0}</div>
              <div className="text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  const { fetchAgents, fetchGateways, fetchStats } = useStore()

  useEffect(() => {
    fetchAgents()
    fetchGateways()
    fetchStats()

    const interval = setInterval(() => {
      fetchAgents()
      fetchStats()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/gateways" element={<Gateways />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
