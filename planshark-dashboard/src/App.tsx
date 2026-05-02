import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '@/stores/store'
import Dashboard from '@/pages/Dashboard'
import Agents from '@/pages/Agents'
import AgentDetail from '@/pages/AgentDetail'
import Providers from '@/pages/Providers'

function NavItem({ to, icon, label }: { to: string; icon: string; label: string }) {
  const location = useLocation()
  const isActive = location.pathname === to

  if (isActive) {
    return (
      <Link to={to} className="bg-blue-500/10 text-blue-400 border-r-2 border-blue-500 py-3 px-6 flex items-center gap-3 cursor-pointer">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <Link to={to} className="text-slate-400 py-3 px-6 hover:bg-slate-800 hover:text-slate-100 transition-all duration-100 flex items-center gap-3 cursor-pointer">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      {label}
    </Link>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-screen w-[260px] bg-[#1E293B] border-r border-[#334155] flex flex-col py-6 z-50">
        <div className="px-6 mb-8 flex flex-col gap-2">
          <div className="h-8 w-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-lg mb-2">
            N
          </div>
          <h1 className="text-white font-black uppercase text-xs tracking-widest">Planshark</h1>
          <span className="text-slate-400 font-sans text-[11px]">v2.4.0-stable</span>
        </div>

        <div className="flex-1 flex flex-col gap-1 font-sans text-[13px] font-medium tracking-wide w-full">
          <NavItem to="/" icon="dashboard" label="Dashboard" />
          <NavItem to="/providers" icon="settings_input_component" label="Providers" />
          <NavItem to="/agents" icon="smart_toy" label="Agents" />
          <NavItem to="/agents/editor" icon="edit_note" label="Agent Editor" />
        </div>

        <div className="mt-auto flex flex-col gap-1 font-sans text-[13px] font-medium tracking-wide w-full border-t border-[#334155] pt-4">
          <div className="text-slate-400 py-3 px-6 hover:bg-slate-800 hover:text-slate-100 transition-all duration-100 flex items-center gap-3 cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">description</span>
            Documentation
          </div>
          <div className="text-slate-400 py-3 px-6 hover:bg-slate-800 hover:text-slate-100 transition-all duration-100 flex items-center gap-3 cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
            Support
          </div>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <main className="flex-1 ml-[260px] flex flex-col h-screen">
        {/* TopNavBar */}
        <header className="sticky top-0 z-40 bg-[#0F172A] border-b border-[#334155] flex justify-between items-center px-6 h-16 w-full shrink-0">
          <div className="text-xl font-bold tracking-tighter text-white">Planshark</div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search resources..."
                className="bg-[#1E293B] border border-[#334155] rounded-DEFAULT pl-9 pr-4 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-[240px]"
              />
            </div>

            <div className="h-6 w-px bg-[#334155] mx-2"></div>

            <button className="text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors duration-150 cursor-pointer active:opacity-80 p-2 rounded-DEFAULT flex items-center justify-center">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors duration-150 cursor-pointer active:opacity-80 p-2 rounded-DEFAULT flex items-center justify-center">
              <span className="material-symbols-outlined">settings</span>
            </button>

            <div className="ml-2 h-8 w-8 rounded-full bg-slate-700 border border-[#334155] overflow-hidden cursor-pointer flex items-center justify-center text-white text-xs font-bold">
              ADM
            </div>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-background">
          {children}
        </div>
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
          <Route path="/agents/editor" element={<AgentDetail />} />
          <Route path="/providers" element={<Providers />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
