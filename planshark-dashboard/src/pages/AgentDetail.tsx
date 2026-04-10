import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '@/stores/store'
import { ArrowLeft, Play, Square, RefreshCw, Save, Send, Trash2 } from 'lucide-react'
import { agentApi } from '@/lib/api'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const { selectedAgent, selectedAgentConfig, selectAgent, updateAgentConfig, startAgent, stopAgent, chatMessages, sendChatMessage, clearChat } = useStore()
  const [activeTab, setActiveTab] = useState<'agent' | 'tool' | 'heartbeat' | 'chat' | 'logs'>('agent')
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [editedConfig, setEditedConfig] = useState({
    agent_md: '',
    tool_md: '',
    heartbeat_md: '',
  })

  useEffect(() => {
    if (id) {
      selectAgent(id)
    }
  }, [id])

  useEffect(() => {
    if (selectedAgentConfig) {
      setEditedConfig({
        agent_md: selectedAgentConfig.agent_md,
        tool_md: selectedAgentConfig.tool_md,
        heartbeat_md: selectedAgentConfig.heartbeat_md,
      })
    }
  }, [selectedAgentConfig])

  useEffect(() => {
    if (id && activeTab === 'logs') {
      loadLogs()
    }
  }, [id, activeTab])

  const loadLogs = async () => {
    if (!id) return
    try {
      const data = await agentApi.getLogs(id)
      setLogs(data.logs)
    } catch (e) {
      setLogs('Failed to load logs')
    }
  }

  const handleSave = async () => {
    if (!id) return
    setLoading(true)
    try {
      await updateAgentConfig(id, editedConfig)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleStart = async () => {
    if (!id) return
    await startAgent(id)
  }

  const handleStop = async () => {
    if (!id) return
    await stopAgent(id)
  }

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !chatInput.trim()) return
    setChatLoading(true)
    setChatInput('')
    try {
      await sendChatMessage(id, chatInput)
    } catch (e) {
      console.error(e)
    }
    setChatLoading(false)
  }

  const handleClearChat = async () => {
    if (!id) return
    await clearChat(id)
  }

  if (!selectedAgent) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/agents" className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{selectedAgent.name}</h2>
          <p className="text-muted-foreground">
            {selectedAgent.model || selectedAgent.gateway?.model} • {selectedAgent.gateway?.name || 'No gateway'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedAgent.status === 'running' ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:opacity-90"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
        </div>
      </div>

      <div className="border rounded-lg">
        <div className="flex border-b">
          {(['agent', 'tool', 'heartbeat', 'chat', 'logs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 capitalize ${activeTab === tab ? 'bg-muted font-medium' : ''}`}
            >
              {tab === 'agent' ? 'agent.md' : tab === 'tool' ? 'tool.md' : tab === 'heartbeat' ? 'heartbeat.md' : tab === 'chat' ? 'Chat' : 'Logs'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'chat' ? (
            <div className="space-y-4">
              <div className="border rounded-lg bg-muted p-4 h-96 overflow-y-auto space-y-4">
                {(chatMessages[id!] || []).length === 0 ? (
                  <p className="text-muted-foreground text-center">No messages yet. Start a conversation!</p>
                ) : (
                  (chatMessages[id!] || []).map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground text-muted'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={chatLoading}
                  className="flex-1 px-3 py-2 border rounded-lg bg-background"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : activeTab === 'logs' ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Container Logs</h3>
                <button onClick={loadLogs} className="p-2 hover:bg-muted rounded-lg">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <pre className="bg-black text-green-400 p-4 rounded-lg overflow-auto h-96 text-sm font-mono">
                {logs || 'No logs available'}
              </pre>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {activeTab === 'agent' ? 'Agent Instructions (agent.md)' : 
                   activeTab === 'tool' ? 'Available Tools (tool.md)' : 
                   'Heartbeat Status (heartbeat.md)'}
                </label>
                <textarea
                  value={editedConfig[activeTab === 'agent' ? 'agent_md' : activeTab === 'tool' ? 'tool_md' : 'heartbeat_md']}
                  onChange={e => setEditedConfig({
                    ...editedConfig,
                    [activeTab === 'agent' ? 'agent_md' : activeTab === 'tool' ? 'tool_md' : 'heartbeat_md']: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded-lg bg-background font-mono text-sm"
                  rows={20}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
