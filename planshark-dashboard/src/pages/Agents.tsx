import { useState } from 'react'
import { useStore } from '@/stores/store'
import { Link } from 'react-router-dom'
import { Plus, Play, Square, Trash2, Bot } from 'lucide-react'

export default function Agents() {
  const { agents, gateways, createAgent, startAgent, stopAgent, deleteAgent } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    gateway_id: '',
    model: '',
    agent_md: '# My Agent\n\nYou are a helpful AI assistant.',
  })
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createAgent(formData)
      setShowCreate(false)
      setFormData({
        name: '',
        gateway_id: '',
        model: '',
        agent_md: '# My Agent\n\nYou are a helpful AI assistant.',
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleStart = async (id: string) => {
    await startAgent(id)
  }

  const handleStop = async (id: string) => {
    await stopAgent(id)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this agent?')) {
      await deleteAgent(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Agents</h2>
          <p className="text-muted-foreground">Manage your AI agents</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {showCreate && (
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Create New Agent</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="my-agent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gateway</label>
                <select
                  required
                  value={formData.gateway_id}
                  onChange={e => setFormData({ ...formData, gateway_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">Select gateway</option>
                  {(gateways ?? []).map(gw => (
                    <option key={gw.id} value={gw.id}>{gw.name} ({gw.model})</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model (optional, overrides gateway default)</label>
              <input
                type="text"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                placeholder="llama3:70b"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Agent Instructions (Markdown)</label>
              <textarea
                value={formData.agent_md}
                onChange={e => setFormData({ ...formData, agent_md: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background font-mono text-sm"
                rows={6}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(agents ?? []).map(agent => (
          <div key={agent.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <Link to={`/agents/${agent.id}`} className="font-semibold hover:underline">
                  {agent.name}
                </Link>
              </div>
              <StatusBadge status={agent.status} />
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              <div>Model: {agent.model || agent.gateway?.model}</div>
              <div>Gateway: {agent.gateway?.name || 'None'}</div>
            </div>
            <div className="flex gap-2">
              {agent.status === 'running' ? (
                <button
                  onClick={() => handleStop(agent.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => handleStart(agent.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20"
                >
                  <Play className="w-4 h-4" />
                  Start
                </button>
              )}
              <button
                onClick={() => handleDelete(agent.id)}
                className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(agents ?? []).length === 0 && !showCreate && (
        <div className="text-center py-12 border rounded-lg">
          <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No agents yet</h3>
          <p className="text-muted-foreground mb-4">Create your first agent to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Create Agent
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    running: 'bg-green-500',
    stopped: 'bg-gray-400',
    error: 'bg-red-500',
  }
  const labels = {
    running: 'Running',
    stopped: 'Stopped',
    error: 'Error',
  }
  return (
    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-white ${colors[status as keyof typeof colors] || 'bg-gray-400'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}
