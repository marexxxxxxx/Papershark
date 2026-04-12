import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
})

export interface Gateway {
  id: string
  name: string
  provider: 'ollama' | 'llamacpp' | 'openai' | 'anthropic' | 'gemini' | 'cohere' | 'mistral' | 'azure' | 'ollama_cloud' | 'mammut'
  endpoint: string
  api_key?: string
  model: string
  rate_limit: number
  timeout_sec: number
  is_active: boolean
  created_at: string
  available_slots?: number
  used_slots?: number
}

export interface Agent {
  id: string
  name: string
  gateway_id?: string
  gateway?: Gateway
  model: string
  container_id?: string
  status: 'running' | 'stopped' | 'error'
  created_at: string
  updated_at: string
}

export interface AgentConfig {
  agent_id: string
  heartbeat_md: string
  agent_md: string
  tool_md: string
}

export interface Stats {
  total_agents: number
  running_agents: number
  stopped_agents: number
  error_agents: number
  total_gateways: number
  active_gateways: number
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
}

export interface CreateAgentRequest {
  name: string
  gateway_id: string
  model: string
  agent_md?: string
  tool_md?: string
}

export interface UpdateAgentRequest {
  name?: string
  gateway_id?: string
  model?: string
}

export interface CreateGatewayRequest {
  name: string
  provider: 'ollama' | 'llamacpp' | 'openai' | 'anthropic' | 'gemini' | 'cohere' | 'mistral' | 'azure' | 'ollama_cloud' | 'mammut'
  endpoint: string
  api_key?: string
  model?: string
  rate_limit: number
  timeout_sec: number
}

export interface ChatRequest {
  agent_id: string
  message: string
  model?: string
}

export interface ChatResponse {
  content: string
  done: boolean
  total_tokens: number
  input_tokens: number
  output_tokens: number
}

export const agentApi = {
  list: () => api.get<Agent[]>('/agents').then(r => r.data),
  get: (id: string) => api.get<Agent>(`/agents/${id}`).then(r => r.data),
  create: (data: CreateAgentRequest) => api.post<Agent>('/agents', data).then(r => r.data),
  update: (id: string, data: Partial<UpdateAgentRequest>) => api.put<Agent>(`/agents/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  start: (id: string) => api.post<Agent>(`/agents/${id}/start`).then(r => r.data),
  stop: (id: string) => api.post<Agent>(`/agents/${id}/stop`).then(r => r.data),
  getConfig: (id: string) => api.get<AgentConfig>(`/agents/${id}/config`).then(r => r.data),
  updateConfig: (id: string, data: Partial<AgentConfig>) => api.put<AgentConfig>(`/agents/${id}/config`, data).then(r => r.data),
  getLogs: (id: string) => api.get<{ logs: string }>(`/agents/${id}/logs`).then(r => r.data),
}

export interface DiscoveredModel {
  id: string
  name: string
  size?: string
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  models?: number
  provider?: string
}

export interface GatewayChatRequest {
  message: string
  model: string
}

export interface GatewayChatResponse {
  content: string
  done: boolean
  total_tokens: number
  input_tokens: number
  output_tokens: number
}

export const gatewayApi = {
  list: () => api.get<Gateway[]>('/gateways').then(r => r.data),
  get: (id: string) => api.get<Gateway>(`/gateways/${id}`).then(r => r.data),
  create: (data: CreateGatewayRequest) => api.post<Gateway>('/gateways', data).then(r => r.data),
  update: (id: string, data: CreateGatewayRequest) => api.put<Gateway>(`/gateways/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/gateways/${id}`),
  listModels: (id: string) => api.get<{ object: string; data: DiscoveredModel[] }>(`/gateways/${id}/models`).then(r => r.data),
  testConnection: (id: string) => api.post<ConnectionTestResult>(`/gateways/${id}/test`).then(r => r.data),
  chat: (id: string, data: GatewayChatRequest) => api.post<GatewayChatResponse>(`/gateways/${id}/chat`, data).then(r => r.data),
}

export const chatApi = {
  send: (data: ChatRequest) => api.post<ChatResponse>('/chat', data).then(r => r.data),
}

export const statsApi = {
  get: () => api.get<Stats>('/stats').then(r => r.data),
}
