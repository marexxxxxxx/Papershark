import { create } from 'zustand'
import { agentApi, gatewayApi, statsApi, chatApi, Agent, Gateway, Stats, AgentConfig } from '@/lib/api'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AppState {
  agents: Agent[]
  gateways: Gateway[]
  stats: Stats | null
  selectedAgent: Agent | null
  selectedAgentConfig: AgentConfig | null
  loading: boolean
  error: string | null
  chatMessages: Record<string, ChatMessage[]>
  
  fetchAgents: () => Promise<void>
  fetchGateways: () => Promise<void>
  fetchStats: () => Promise<void>
  selectAgent: (id: string) => Promise<void>
  createAgent: (data: { name: string; gateway_id: string; model: string; agent_md?: string }) => Promise<Agent>
  deleteAgent: (id: string) => Promise<void>
  startAgent: (id: string) => Promise<void>
  stopAgent: (id: string) => Promise<void>
  updateAgentConfig: (id: string, config: Partial<AgentConfig>) => Promise<void>
  createGateway: (data: { name: string; provider: string; endpoint: string; api_key?: string; model: string; rate_limit: number; timeout_sec?: number }) => Promise<Gateway>
  deleteGateway: (id: string) => Promise<void>
  sendChatMessage: (agentId: string, message: string) => Promise<string>
  clearChat: (agentId: string) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  agents: [],
  gateways: [],
  stats: null,
  selectedAgent: null,
  selectedAgentConfig: null,
  loading: false,
  error: null,
  chatMessages: {},

  fetchAgents: async () => {
    set({ loading: true, error: null })
    try {
      const agents = await agentApi.list()
      set({ agents, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchGateways: async () => {
    try {
      const gateways = await gatewayApi.list()
      set({ gateways })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  fetchStats: async () => {
    try {
      const stats = await statsApi.get()
      set({ stats })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  selectAgent: async (id: string) => {
    try {
      const agent = await agentApi.get(id)
      const config = await agentApi.getConfig(id)
      set({ selectedAgent: agent, selectedAgentConfig: config })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  createAgent: async (data) => {
    if (!data.gateway_id) {
      throw new Error("Please select a gateway first")
    }
    await get().fetchGateways()
    const agent = await agentApi.create(data)
    await get().fetchAgents()
    await get().fetchStats()
    return agent
  },

  deleteAgent: async (id: string) => {
    await agentApi.delete(id)
    await get().fetchAgents()
    await get().fetchStats()
  },

  startAgent: async (id: string) => {
    await agentApi.start(id)
    await get().fetchAgents()
    await get().fetchStats()
  },

  stopAgent: async (id: string) => {
    await agentApi.stop(id)
    await get().fetchAgents()
    await get().fetchStats()
  },

  updateAgentConfig: async (id: string, config: Partial<AgentConfig>) => {
    await agentApi.updateConfig(id, config)
    const newConfig = await agentApi.getConfig(id)
    set({ selectedAgentConfig: newConfig })
  },

  createGateway: async (data) => {
    const gateway = await gatewayApi.create(data as any)
    await get().fetchGateways()
    await get().fetchStats()
    return gateway
  },

  deleteGateway: async (id: string) => {
    await gatewayApi.delete(id)
    await get().fetchGateways()
    await get().fetchStats()
  },

  sendChatMessage: async (agentId: string, message: string) => {
    const current = get().chatMessages[agentId] || []
    set({
      chatMessages: {
        ...get().chatMessages,
        [agentId]: [...current, { role: 'user', content: message }]
      }
    })
    
    try {
      const response = await chatApi.send({ agent_id: agentId, message })
      set({
        chatMessages: {
          ...get().chatMessages,
          [agentId]: [...(get().chatMessages[agentId] || []), { role: 'assistant', content: response.content }]
        }
      })
      return response.content
    } catch (e: any) {
      set({
        chatMessages: {
          ...get().chatMessages,
          [agentId]: [...(get().chatMessages[agentId] || []), { role: 'assistant', content: `Error: ${e.message}` }]
        }
      })
      throw e
    }
  },

  clearChat: async (agentId: string) => {
    const current = get().chatMessages
    delete current[agentId]
    set({ chatMessages: { ...current } })
  },
}))
