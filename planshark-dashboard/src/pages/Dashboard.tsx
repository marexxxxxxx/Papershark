import { useStore } from '@/stores/store'
import { Link } from 'react-router-dom'
import { Activity, Bot, Globe, Zap, Play, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function Dashboard() {
  const { stats, agents, gateways, startAgent, stopAgent, deleteAgent } = useStore()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleStart = async (id: string) => {
    setActionLoading(id)
    await startAgent(id)
    setActionLoading(null)
  }

  const handleStop = async (id: string) => {
    setActionLoading(id)
    await stopAgent(id)
    setActionLoading(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this agent?')) {
      setActionLoading(id)
      await deleteAgent(id)
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your Planshark agents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Agents"
          value={stats?.total_agents ?? 0}
          icon={Bot}
          color="text-blue-600"
        />
        <StatCard
          title="Running"
          value={stats?.running_agents ?? 0}
          icon={Activity}
          color="text-green-600"
        />
        <StatCard
          title="Gateways"
          value={stats?.active_gateways ?? 0}
          icon={Globe}
          color="text-purple-600"
        />
        <StatCard
          title="Total Requests"
          value={stats?.total_requests ?? 0}
          icon={Zap}
          color="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Token Usage</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Input Tokens</span>
              <span className="font-mono">{stats?.total_input_tokens?.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Output Tokens</span>
              <span className="font-mono">{stats?.total_output_tokens?.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex justify-between items-center font-semibold pt-2 border-t">
              <span>Total</span>
              <span className="font-mono">
                {((stats?.total_input_tokens ?? 0) + (stats?.total_output_tokens ?? 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Gateway Slots</h3>
          <div className="space-y-3">
            {(gateways ?? []).map(gw => {
              const used = (gw as any).used_slots ?? 0
              return (
                <div key={gw.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{gw.name} ({gw.provider})</span>
                    <span>{used}/{gw.rate_limit}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(used / gw.rate_limit) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {(gateways ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm">No gateways configured</p>
            )}
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Recent Agents</h3>
          <Link to="/agents" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="space-y-2">
          {(agents ?? []).slice(0, 5).map(agent => (
            <div key={agent.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <StatusBadge status={agent.status} />
                <div>
                  <Link to={`/agents/${agent.id}`} className="font-medium hover:underline">
                    {agent.name}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {agent.model} • {agent.gateway?.name ?? 'No gateway'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {agent.status === 'running' ? (
                  <button
                    onClick={() => handleStop(agent.id)}
                    disabled={actionLoading === agent.id}
                    className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStart(agent.id)}
                    disabled={actionLoading === agent.id}
                    className="p-2 hover:bg-green-100 rounded-lg text-green-600"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(agent.id)}
                  disabled={actionLoading === agent.id}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {(agents ?? []).length === 0 && (
            <p className="text-center text-muted-foreground py-8">No agents yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Icon className={`w-8 h-8 ${color}`} />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    running: 'bg-green-500',
    stopped: 'bg-gray-400',
    error: 'bg-red-500',
  }
  return (
    <span className={`w-3 h-3 rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-400'}`} />
  )
}
