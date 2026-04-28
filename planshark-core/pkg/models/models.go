package models

import (
	"time"

	"github.com/google/uuid"
)

type ProviderType string

const (
	ProviderOllama      ProviderType = "ollama"
	ProviderLlamaCpp    ProviderType = "llamacpp"
	ProviderOpenAI      ProviderType = "openai"
	ProviderAnthropic   ProviderType = "anthropic"
	ProviderGemini      ProviderType = "gemini"
	ProviderCohere      ProviderType = "cohere"
	ProviderMistral     ProviderType = "mistral"
	ProviderAzure       ProviderType = "azure"
	ProviderOllamaCloud ProviderType = "ollama_cloud"
	ProviderMammut      ProviderType = "mammut"
)

type AgentStatus string

const (
	StatusRunning AgentStatus = "running"
	StatusStopped AgentStatus = "stopped"
	StatusError   AgentStatus = "error"
)

type Gateway struct {
	ID         uuid.UUID    `json:"id"`
	Name       string       `json:"name"`
	Provider   ProviderType `json:"provider"`
	Endpoint   string       `json:"endpoint"`
	APIKey     string       `json:"api_key,omitempty"`
	Model      string       `json:"model"`
	RateLimit  int          `json:"rate_limit"`
	TimeoutSec int          `json:"timeout_sec"`
	IsActive   bool         `json:"is_active"`
	CreatedAt  time.Time    `json:"created_at"`
}

type Agent struct {
	ID          uuid.UUID   `json:"id"`
	Name        string      `json:"name"`
	GatewayID   *uuid.UUID  `json:"gateway_id,omitempty"`
	Gateway     *Gateway    `json:"gateway,omitempty"`
	Model       string      `json:"model"`
	ContainerID string      `json:"container_id,omitempty"`
	Status      AgentStatus `json:"status"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type AgentConfig struct {
	AgentID   uuid.UUID `json:"agent_id"`
	Heartbeat string    `json:"heartbeat_md"`
	AgentMD   string    `json:"agent_md"`
	ToolMD    string    `json:"tool_md"`
}

type RequestLog struct {
	ID           uuid.UUID `json:"id"`
	AgentID      uuid.UUID `json:"agent_id"`
	GatewayID    uuid.UUID `json:"gateway_id"`
	Model        string    `json:"model"`
	InputTokens  int       `json:"input_tokens"`
	OutputTokens int       `json:"output_tokens"`
	LatencyMs    int       `json:"latency_ms"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type ChatRequest struct {
	AgentID uuid.UUID `json:"agent_id"`
	Message string    `json:"message"`
	Model   string    `json:"model,omitempty"`
}

type ChatResponse struct {
	Content      string `json:"content"`
	Done         bool   `json:"done"`
	TotalTokens  int    `json:"total_tokens,omitempty"`
	InputTokens  int    `json:"input_tokens,omitempty"`
	OutputTokens int    `json:"output_tokens,omitempty"`
}

type CreateAgentRequest struct {
	Name      string    `json:"name"`
	GatewayID uuid.UUID `json:"gateway_id"`
	Model     string    `json:"model"`
	AgentMD   string    `json:"agent_md"`
	ToolMD    string    `json:"tool_md,omitempty"`
}

type UpdateAgentRequest struct {
	Name      string     `json:"name,omitempty"`
	GatewayID *uuid.UUID `json:"gateway_id,omitempty"`
	Model     string     `json:"model,omitempty"`
}

type CreateGatewayRequest struct {
	Name       string       `json:"name"`
	Provider   ProviderType `json:"provider"`
	Endpoint   string       `json:"endpoint"`
	APIKey     string       `json:"api_key,omitempty"`
	Model      string       `json:"model"`
	RateLimit  int          `json:"rate_limit"`
	TimeoutSec int          `json:"timeout_sec"`
}

type UpdateAgentConfigRequest struct {
	Heartbeat string `json:"heartbeat_md,omitempty"`
	AgentMD   string `json:"agent_md,omitempty"`
	ToolMD    string `json:"tool_md,omitempty"`
}

type Stats struct {
	TotalAgents       int   `json:"total_agents"`
	RunningAgents     int   `json:"running_agents"`
	StoppedAgents     int   `json:"stopped_agents"`
	ErrorAgents       int   `json:"error_agents"`
	TotalGateways     int   `json:"total_gateways"`
	ActiveGateways    int   `json:"active_gateways"`
	TotalRequests     int64 `json:"total_requests"`
	TotalInputTokens  int64 `json:"total_input_tokens"`
	TotalOutputTokens int64 `json:"total_output_tokens"`
}

type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusRunning   TaskStatus = "running"
	TaskStatusCompleted TaskStatus = "completed"
	TaskStatusFailed    TaskStatus = "failed"
	TaskStatusCancelled TaskStatus = "cancelled"
)

type TaskType string

const (
	TaskTypeChat    TaskType = "chat"
	TaskTypeExecute TaskType = "execute"
	TaskTypeSystem  TaskType = "system"
)

type Task struct {
	ID          uuid.UUID  `json:"id"`
	AgentID     uuid.UUID  `json:"agent_id"`
	TaskType    TaskType   `json:"task_type"`
	Input       string     `json:"input"`
	Output      string     `json:"output,omitempty"`
	Status      TaskStatus `json:"status"`
	Error       string     `json:"error,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	StartedAt   time.Time  `json:"started_at,omitempty"`
	CompletedAt time.Time  `json:"completed_at,omitempty"`
}

type CreateTaskRequest struct {
	TaskType TaskType `json:"task_type"`
	Input    string   `json:"input"`
}

type ToolDefinition struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Parameters  string `json:"parameters"`
}

type AgentSkill struct {
	AgentID   uuid.UUID `json:"agent_id"`
	SkillName string    `json:"skill_name"`
	IsEnabled bool      `json:"is_enabled"`
	CreatedAt time.Time `json:"created_at"`
}

type SetSkillRequest struct {
	IsEnabled bool `json:"is_enabled"`
}
