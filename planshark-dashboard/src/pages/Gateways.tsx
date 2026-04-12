import { useState } from 'react'
import { useStore } from '@/stores/store'
import { Plus, Trash2, Globe, Pencil, Loader2, RefreshCw, Wifi, MessageSquare, Send } from 'lucide-react'
import { Gateway, DiscoveredModel, ConnectionTestResult, gatewayApi } from '@/lib/api'

export default function Gateways() {
  const { gateways, createGateway, updateGateway, deleteGateway } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    provider: 'ollama' as 'ollama' | 'llamacpp' | 'openai' | 'anthropic' | 'gemini' | 'cohere' | 'mistral' | 'azure' | 'ollama_cloud' | 'mammut',
    endpoint: '',
    api_key: '',
    model: '',
    rate_limit: 2,
    timeout_sec: 60,
  })
  const [loading, setLoading] = useState(false)
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [testChatOpen, setTestChatOpen] = useState<string | null>(null)
  const [testMessages, setTestMessages] = useState<{ role: string; content: string }[]>([])
  const [testInput, setTestInput] = useState('')
  const [selectedTestModel, setSelectedTestModel] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [testModels, setTestModels] = useState<DiscoveredModel[]>([])

  const handleTestConnection = async (gatewayId: string) => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await gatewayApi.testConnection(gatewayId)
      setTestResult(result)
    } catch (e: any) {
      setTestResult({ success: false, message: e.response?.data || 'Test failed' })
    }
    setTesting(false)
  }

  const handleDiscoverModels = async (gatewayId: string) => {
    setDiscovering(true)
    try {
      const response = await gatewayApi.listModels(gatewayId)
      setDiscoveredModels(response.data || [])
    } catch {
      setDiscoveredModels([])
    }
    setDiscovering(false)
  }

  const openTestChat = async (gw: Gateway) => {
    setTestChatOpen(gw.id)
    setTestMessages([])
    setTestInput('')
    setSelectedTestModel('')
    setTestModels([])
    try {
      const response = await gatewayApi.listModels(gw.id)
      setTestModels(response.data || [])
      if (response.data && response.data.length > 0) {
        setSelectedTestModel(response.data[0].id)
      }
    } catch {}
  }

  const handleTestChat = async (gatewayId: string) => {
    if (!testInput.trim() || !selectedTestModel) return
    setChatLoading(true)
    const userMsg = testInput
    setTestInput('')
    setTestMessages(prev => [...prev, { role: 'user', content: userMsg }])
    try {
      const result = await gatewayApi.chat(gatewayId, { message: userMsg, model: selectedTestModel })
      setTestMessages(prev => [...prev, { role: 'assistant', content: result.content }])
    } catch (e: any) {
      setTestMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.response?.data || e.message}` }])
    }
    setChatLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createGateway(formData)
      setShowCreate(false)
      setFormData({
        name: '',
        provider: 'ollama',
        endpoint: '',
        api_key: '',
        model: '',
        rate_limit: 2,
        timeout_sec: 60,
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this gateway?')) {
      await deleteGateway(id)
    }
  }

  const handleEdit = (gateway: Gateway) => {
    setEditingGateway(gateway)
    setFormData({
      name: gateway.name,
      provider: gateway.provider as any,
      endpoint: gateway.endpoint,
      api_key: gateway.api_key || '',
      model: gateway.model,
      rate_limit: gateway.rate_limit,
      timeout_sec: gateway.timeout_sec,
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGateway) return
    setLoading(true)
    try {
      await updateGateway(editingGateway.id, formData)
      setEditingGateway(null)
      setFormData({
        name: '',
        provider: 'ollama',
        endpoint: '',
        api_key: '',
        model: '',
        rate_limit: 2,
        timeout_sec: 60,
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const cancelForm = () => {
    setShowCreate(false)
    setEditingGateway(null)
    setFormData({
      name: '',
      provider: 'ollama',
      endpoint: '',
      api_key: '',
      model: '',
      rate_limit: 2,
      timeout_sec: 60,
    })
  }

  const getProviderBadge = (provider: string) => {
    const colors: Record<string, string> = {
      ollama: 'bg-purple-500',
      ollama_cloud: 'bg-purple-600',
      llamacpp: 'bg-orange-500',
      openai: 'bg-green-500',
      anthropic: 'bg-yellow-600',
      gemini: 'bg-blue-500',
      cohere: 'bg-teal-500',
      mistral: 'bg-indigo-500',
      azure: 'bg-cyan-500',
      mammut: 'bg-red-500',
    }
    return colors[provider] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Gateways</h2>
          <p className="text-muted-foreground">Manage API providers and rate limits</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Add Gateway
        </button>
      </div>

      {(showCreate || editingGateway) && (
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">{editingGateway ? 'Edit Gateway' : 'Add New Gateway'}</h3>
          <form onSubmit={editingGateway ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="Local Ollama"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Provider</label>
                <select
                  value={formData.provider}
                  onChange={e => setFormData({ ...formData, provider: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="ollama_cloud">Ollama Cloud</option>
                  <option value="llamacpp">llama.cpp</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="cohere">Cohere</option>
                  <option value="mistral">Mistral</option>
                  <option value="azure">Azure OpenAI</option>
                  <option value="mammut">Mammut.ai</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Endpoint URL</label>
              <input
                type="url"
                required
                value={formData.endpoint}
                onChange={e => setFormData({ ...formData, endpoint: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                placeholder={formData.provider === 'ollama' ? 'http://localhost:11434' : formData.provider === 'ollama_cloud' ? 'https://cloud.ollama.ai' : formData.provider === 'anthropic' ? 'https://api.anthropic.com' : formData.provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : formData.provider === 'mammut' ? 'https://api.mammut.ai/v1' : 'https://api.openai.com/v1'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Default Model (optional)</label>
                {discoveredModels.length > 0 ? (
                  <select
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="">Select later when creating agent</option>
                    {discoveredModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.size && `(${m.size})`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.model}
                      onChange={e => setFormData({ ...formData, model: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg bg-background"
                      placeholder="Leave empty to select later"
                    />
                    {editingGateway && (
                      <button
                        type="button"
                        onClick={() => handleDiscoverModels(editingGateway.id)}
                        disabled={discovering}
                        className="px-3 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
                        title="Discover available models"
                      >
                        {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate Limit (concurrent)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.rate_limit}
                  onChange={e => setFormData({ ...formData, rate_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
              <input
                type="number"
                min={10}
                max={300}
                value={formData.timeout_sec}
                onChange={e => setFormData({ ...formData, timeout_sec: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                API Key {!['ollama', 'llamacpp'].includes(formData.provider) && <span className="text-destructive">*</span>}
              </label>
              <input
                type="password"
                value={formData.api_key}
                onChange={e => setFormData({ ...formData, api_key: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                placeholder={['ollama', 'llamacpp'].includes(formData.provider) ? 'Optional (leave empty for local)' : 'Required'}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (editingGateway ? 'Saving...' : 'Creating...') : (editingGateway ? 'Save' : 'Create')}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              {editingGateway && (
                <button
                  type="button"
                  onClick={() => handleTestConnection(editingGateway.id)}
                  disabled={testing}
                  className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                  Test
                </button>
              )}
            </div>

            {testResult && (
              <div className={`mt-3 p-3 rounded-lg ${testResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <Wifi className="w-4 h-4 text-red-500" />
                  )}
                  <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                    {testResult.message}
                  </span>
                </div>
                {testResult.success && testResult.models !== undefined && (
                  <div className="text-sm text-green-400/70 mt-1">
                    {testResult.models} models available
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(gateways ?? []).map(gw => (
          <div key={gw.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <span className="font-semibold">{gw.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs text-white ${getProviderBadge(gw.provider)}`}>
                  {gw.provider}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(gw)}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(gw.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Endpoint</span>
                <code className="bg-muted px-2 py-0.5 rounded">{gw.endpoint}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span>{gw.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate Limit</span>
                <span>{gw.rate_limit} concurrent</span>
              </div>
            </div>
            <div className="mt-4">
              {(() => {
                const used = (gw as any).used_slots ?? 0
                return (
                  <>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Slots Used</span>
                      <span>{used}/{gw.rate_limit}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(used / gw.rate_limit) * 100}%` }}
                      />
                    </div>
                  </>
                )
              })()}
            </div>
            <button
              onClick={() => openTestChat(gw)}
              className="mt-3 w-full px-3 py-2 border rounded-lg hover:bg-muted flex items-center justify-center gap-2 text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Test Chat
            </button>
          </div>
        ))}
      </div>

      {(gateways ?? []).length === 0 && !showCreate && !editingGateway && (
        <div className="text-center py-12 border rounded-lg">
          <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No gateways configured</h3>
          <p className="text-muted-foreground mb-4">Add your first API gateway to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Add Gateway
          </button>
        </div>
      )}

      {testChatOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Test Chat
              </h3>
              <button
                onClick={() => setTestChatOpen(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4 border-b">
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                value={selectedTestModel}
                onChange={e => setSelectedTestModel(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                {testModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.size && `(${m.size})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {testMessages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Send a message to test the gateway
                </div>
              )}
              {testMessages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground ml-8' : 'bg-muted mr-8'
                }`}>
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleTestChat(testChatOpen)}
                  placeholder="Type a message..."
                  disabled={chatLoading || !selectedTestModel}
                  className="flex-1 px-3 py-2 border rounded-lg bg-background"
                />
                <button
                  onClick={() => handleTestChat(testChatOpen)}
                  disabled={chatLoading || !testInput.trim() || !selectedTestModel}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
