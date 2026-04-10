import { create } from 'zustand'
import { agentApi, gatewayApi, statsApi, Agent, Gateway, Stats, AgentConfig } from '@/lib/api'

interface AppState {
  agents: Agent[]
  gateways: Gateway[]
  stats: Stats | null
  selectedAgent: Agent | null
  selectedAgentConfig: AgentConfig | null
  loading: boolean
  error: string | null
  
  fetchAgents: () => Promise<void>
  fetchGateways: () => Promise<void>
  fetchStats: () => Promise<void>
  selectAgent: (id: string) => Promise<void>
  createAgent: (data: { name: string; gateway_id: string; model: string; agent_md?: string }) => Promise<Agent>
  deleteAgent: (id: string) => Promise<void>
  startAgent: (id: string) => Promise<void>
  stopAgent: (id: string) => Promise<void>
  updateAgentConfig: (id: string, config: Partial<AgentConfig>) => Promise<void>
  createGateway: (data: { name: string; provider: string; endpoint: string; model: string; rate_limit: number; timeout_sec?: number }) => Promise<Gateway>
  deleteGateway: (id: string) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  agents: [],
  gateways: [],
  stats: null,
  selectedAgent: null,
  selectedAgentConfig: null,
  loading: false,
  error: null,

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
}))
