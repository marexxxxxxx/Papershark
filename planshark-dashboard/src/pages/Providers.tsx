import { useState } from 'react'
import { useStore } from '@/stores/store'
import { Gateway, gatewayApi, ConnectionTestResult, DiscoveredModel } from '@/lib/api'

export default function Providers() {
  const { gateways, createGateway, updateGateway, deleteGateway } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [testing, setTesting] = useState(false)

  // Chat Test State
  const [testChatOpen, setTestChatOpen] = useState<string | null>(null)
  const [testModels, setTestModels] = useState<DiscoveredModel[]>([])
  const [selectedTestModel, setSelectedTestModel] = useState<string>('')
  const [testMessages, setTestMessages] = useState<{role: string, content: string}[]>([])
  const [testInput, setTestInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    provider: 'ollama' as Gateway['provider'],
    endpoint: '',
    model: '',
    rate_limit: 1,
    timeout_sec: 60,
    api_key: ''
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createGateway(formData)
      setShowCreate(false)
      setFormData({
        name: '', provider: 'ollama', endpoint: '', model: '', rate_limit: 1, timeout_sec: 60, api_key: ''
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGateway) return
    setLoading(true)
    try {
      await updateGateway(editingGateway.id, formData)
      setEditingGateway(null)
      setFormData({
        name: '', provider: 'ollama', endpoint: '', model: '', rate_limit: 1, timeout_sec: 60, api_key: ''
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this provider?')) {
      await deleteGateway(id)
    }
  }

  const handleEdit = (gw: Gateway) => {
    setEditingGateway(gw)
    setFormData({
      name: gw.name,
      provider: gw.provider,
      endpoint: gw.endpoint,
      model: gw.model,
      rate_limit: gw.rate_limit,
      timeout_sec: gw.timeout_sec,
      api_key: '' // Don't populate for security
    })
    setTestResult(null)
  }

  const cancelForm = () => {
    setShowCreate(false)
    setEditingGateway(null)
    setTestResult(null)
    setFormData({
      name: '', provider: 'ollama', endpoint: '', model: '', rate_limit: 1, timeout_sec: 60, api_key: ''
    })
  }

  const handleTestConnection = async (id: string) => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await gatewayApi.testConnection(id)
      setTestResult(res)
    } catch (e: any) {
      setTestResult({ success: false, message: e.message })
    }
    setTesting(false)
  }

  const [discoveringModels, setDiscoveringModels] = useState(false)

  const handleDiscoverModels = async (id: string) => {
    if (!id) return;
    setDiscoveringModels(true)
    try {
      const res = await gatewayApi.listModels(id)
      if (res && res.data && res.data.length > 0) {
          // just alert for now, or populate the input
          alert(`Discovered ${res.data.length} models. E.g.: ${res.data[0].id}`);
      } else {
          alert('No models discovered or provider does not support discovery.');
      }
    } catch (e) {
      console.error("Failed to load models")
      alert('Failed to discover models.')
    }
    setDiscoveringModels(false)
  }

  const openTestChat = async (gw: Gateway) => {
    setTestChatOpen(gw.id)
    setTestMessages([])
    setTestInput('')
    try {
      const res = await gatewayApi.listModels(gw.id)
      setTestModels(res.data)
      if (res.data.length > 0) {
        setSelectedTestModel(res.data[0].id)
      }
    } catch (e) {
      console.error("Failed to load models for test chat")
    }
  }

  const handleTestChat = async (id: string) => {
    if (!testInput.trim() || !selectedTestModel) return

    const userMsg = testInput
    setTestInput('')
    setTestMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const res = await gatewayApi.chat(id, {
        message: userMsg,
        model: selectedTestModel
      })
      setTestMessages(prev => [...prev, { role: 'assistant', content: res.content }])
    } catch (e: any) {
      setTestMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
    }
    setChatLoading(false)
  }

  // Group gateways by provider type to display in cards
  const providersGrouped = (gateways ?? []).reduce((acc, gw) => {
    if (!acc[gw.provider]) acc[gw.provider] = []
    acc[gw.provider].push(gw)
    return acc
  }, {} as Record<string, Gateway[]>)

  return (
    <div className="p-margin-page flex flex-col gap-lg min-h-full">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-xl">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-background mb-xs">Provider Configuration</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Manage AI model providers, API keys, and active routing selections.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary-container text-on-primary-container hover:bg-primary transition-colors duration-150 font-body-sm text-body-sm font-medium px-md py-sm rounded flex items-center gap-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add New Provider
        </button>
      </div>

      {/* Forms Area */}
      {(showCreate || editingGateway) && (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden mb-lg">
          <div className="p-md border-b border-outline-variant bg-surface-container-high">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {editingGateway ? 'Edit Provider' : 'Create New Provider'}
            </h3>
          </div>
          <div className="p-md">
            <form onSubmit={editingGateway ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary"
                    placeholder="e.g. OpenAI Prod"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Provider Type</label>
                  <select
                    value={formData.provider}
                    onChange={e => setFormData({ ...formData, provider: e.target.value as Gateway['provider'] })}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="ollama">Ollama (Local)</option>
                    <option value="ollama_cloud">Ollama (Cloud API)</option>
                    <option value="llamacpp">Llama.cpp</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="cohere">Cohere</option>
                    <option value="mistral">Mistral AI</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="mammut">Mammut</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">API Endpoint</label>
                <input
                  type="text"
                  required
                  value={formData.endpoint}
                  onChange={e => setFormData({ ...formData, endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary font-code-mono"
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase">Default Model</label>
                    {editingGateway && (
                        <button
                            type="button"
                            onClick={() => handleDiscoverModels(editingGateway.id)}
                            disabled={discoveringModels}
                            className="font-label-caps text-[10px] text-primary hover:text-primary-fixed"
                        >
                            {discoveringModels ? 'Discovering...' : 'Discover Models'}
                        </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary"
                    placeholder="gpt-4"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Rate Limit (Concurrent)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.rate_limit}
                    onChange={e => setFormData({ ...formData, rate_limit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Timeout (seconds)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={formData.timeout_sec}
                    onChange={e => setFormData({ ...formData, timeout_sec: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">
                    API Key {!['ollama', 'llamacpp'].includes(formData.provider) && <span className="text-error">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={e => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary"
                    placeholder={['ollama', 'llamacpp'].includes(formData.provider) ? 'Optional' : 'Required'}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps hover:bg-primary-fixed disabled:opacity-50 transition-colors"
                >
                  {loading ? (editingGateway ? 'Saving...' : 'Creating...') : (editingGateway ? 'Save Changes' : 'Create Provider')}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 border border-outline-variant text-on-surface rounded font-label-caps text-label-caps hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                {editingGateway && (
                  <button
                    type="button"
                    onClick={() => handleTestConnection(editingGateway.id)}
                    disabled={testing}
                    className="ml-auto px-4 py-2 border border-outline-variant text-primary rounded font-label-caps text-label-caps hover:bg-primary/10 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">{testing ? 'sync' : 'network_check'}</span>
                    Test Connection
                  </button>
                )}
              </div>

              {testResult && (
                <div className={`mt-4 p-3 rounded flex gap-3 items-center ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-error/10 border border-error/30'}`}>
                  <span className={`material-symbols-outlined ${testResult.success ? 'text-emerald-400' : 'text-error'}`}>
                    {testResult.success ? 'check_circle' : 'error'}
                  </span>
                  <div>
                    <div className={`font-body-sm text-body-sm ${testResult.success ? 'text-emerald-400' : 'text-error'}`}>
                      {testResult.message}
                    </div>
                    {testResult.success && testResult.models !== undefined && (
                      <div className="font-code-mono text-code-mono text-emerald-400/70 text-[11px] mt-1">
                        Discovered {testResult.models} models available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Provider Cards Grid */}
      <div className="flex flex-col gap-lg">
        {Object.entries(providersGrouped).length === 0 && !showCreate && !editingGateway && (
          <div className="text-center py-12 border border-outline-variant rounded-xl bg-surface-container">
            <span className="material-symbols-outlined text-[48px] text-outline mb-4">settings_input_component</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">No providers configured</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Add your first AI model provider to start routing agent requests.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps hover:bg-primary-fixed transition-colors"
            >
              Add Provider
            </button>
          </div>
        )}

        {Object.entries(providersGrouped).map(([providerType, gws]) => (
          <div key={providerType} className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded bg-surface flex items-center justify-center border border-outline-variant">
                  <span className="material-symbols-outlined text-[24px] text-on-surface capitalize">
                    {providerType === 'openai' ? 'psychology' : providerType === 'anthropic' ? 'smart_toy' : 'hub'}
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface capitalize">{providerType.replace('_', ' ')}</h2>
                  <div className="flex items-center gap-sm mt-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="font-label-caps text-label-caps text-emerald-400">API Connected</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant">
                    <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant">Configuration Name</th>
                    <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant">Default Model</th>
                    <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant">Endpoint</th>
                    <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant">Usage (Slots)</th>
                    <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant">
                  {gws.map(gw => {
                    const used = gw.used_slots ?? 0;
                    return (
                      <tr key={gw.id} className="hover:bg-surface-variant/30 transition-colors">
                        <td className="py-md px-md font-medium text-on-surface">{gw.name}</td>
                        <td className="py-md px-md font-code-mono text-code-mono text-outline">{gw.model}</td>
                        <td className="py-md px-md font-code-mono text-code-mono text-[11px] text-on-surface-variant max-w-[200px] truncate">{gw.endpoint}</td>
                        <td className="py-md px-md">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${(used / gw.rate_limit) * 100}%` }}></div>
                            </div>
                            <span className="text-[11px] text-on-surface-variant">{used}/{gw.rate_limit}</span>
                          </div>
                        </td>
                        <td className="py-md px-md text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openTestChat(gw)}
                              className="p-1 text-on-surface-variant hover:text-primary transition-colors" title="Test Chat"
                            >
                              <span className="material-symbols-outlined text-[18px]">forum</span>
                            </button>
                            <button
                              onClick={() => handleEdit(gw)}
                              className="p-1 text-on-surface-variant hover:text-primary transition-colors" title="Settings"
                            >
                              <span className="material-symbols-outlined text-[18px]">settings</span>
                            </button>
                            <button
                              onClick={() => handleDelete(gw.id)}
                              className="p-1 text-on-surface-variant hover:text-error transition-colors" title="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Test Chat Modal */}
      {testChatOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border border-outline-variant rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-high rounded-t-lg">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">forum</span>
                Test Chat
              </h3>
              <button onClick={() => setTestChatOpen(null)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex gap-4 items-center">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Model:</label>
              <select
                value={selectedTestModel}
                onChange={e => setSelectedTestModel(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-surface border border-outline-variant rounded text-on-surface font-code-mono text-code-mono focus:outline-none focus:border-primary"
              >
                {testModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.size && `(${m.size})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background min-h-[300px]">
              {testMessages.length === 0 && (
                <div className="h-full flex items-center justify-center text-on-surface-variant font-body-sm text-body-sm">
                  Send a message to test this provider...
                </div>
              )}
              {testMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="font-label-caps text-label-caps text-outline px-1">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                  <div className={`px-4 py-2 rounded-lg max-w-[85%] font-body-sm text-body-sm ${
                    msg.role === 'user'
                      ? 'bg-primary-container text-on-primary-container rounded-tr-sm'
                      : 'bg-surface-variant text-on-surface rounded-tl-sm border border-outline-variant'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface-container-low rounded-b-lg">
              <div className="relative flex items-center bg-surface border border-outline-variant rounded focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <input
                  type="text"
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleTestChat(testChatOpen)}
                  placeholder="Type a message..."
                  disabled={chatLoading || !selectedTestModel}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-sm text-body-sm py-3 px-4"
                />
                <button
                  onClick={() => handleTestChat(testChatOpen)}
                  disabled={chatLoading || !testInput.trim() || !selectedTestModel}
                  className="mx-2 text-primary hover:text-primary-fixed disabled:opacity-50 flex items-center justify-center p-1 bg-primary-container rounded"
                >
                  <span className="material-symbols-outlined text-[20px]">{chatLoading ? 'sync' : 'send'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
