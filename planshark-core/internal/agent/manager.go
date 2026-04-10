package agent

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"

	"planshark-core/internal/db"
	"planshark-core/internal/docker"
	"planshark-core/pkg/models"
)

type Manager struct {
	db     *db.DB
	docker *docker.Client
}

func NewManager(database *db.DB, dockerClient *docker.Client) *Manager {
	return &Manager{
		db:     database,
		docker: dockerClient,
	}
}

func (m *Manager) Create(ctx context.Context, req *models.CreateAgentRequest) (*models.Agent, error) {
	agent := &models.Agent{
		Name:      req.Name,
		Model:     req.Model,
		Status:    models.StatusStopped,
		GatewayID: &req.GatewayID,
	}

	if err := m.db.CreateAgent(agent); err != nil {
		return nil, fmt.Errorf("failed to create agent in db: %w", err)
	}

	agentDir, err := m.docker.EnsureAgentDir(agent.ID)
	if err != nil {
		m.db.DeleteAgent(agent.ID)
		return nil, fmt.Errorf("failed to create agent directory: %w", err)
	}

	defaultAgentMD := req.AgentMD
	if defaultAgentMD == "" {
		defaultAgentMD = "# " + agent.Name + "\n\nYou are a helpful AI agent."
	}

	defaultToolMD := req.ToolMD
	if defaultToolMD == "" {
		defaultToolMD = "# Available Tools\n\nYou have access to the following tools:\n\n- bash: Execute shell commands\n- read/write files: File operations"
	}

	config := &models.AgentConfig{
		AgentID:   agent.ID,
		Heartbeat: fmt.Sprintf("# Heartbeat\n\nStatus: initialized\nLast Update: %s", time.Now().Format(time.RFC3339)),
		AgentMD:   defaultAgentMD,
		ToolMD:    defaultToolMD,
	}

	if err := m.db.CreateAgentConfig(config); err != nil {
		m.db.DeleteAgent(agent.ID)
		return nil, fmt.Errorf("failed to create agent config: %w", err)
	}

	agent.GatewayID = &req.GatewayID

	if err := m.writeConfigFiles(agentDir, config); err != nil {
		m.db.DeleteAgent(agent.ID)
		return nil, fmt.Errorf("failed to write config files: %w", err)
	}

	return agent, nil
}

func (m *Manager) Get(id uuid.UUID) (*models.Agent, error) {
	return m.db.GetAgentWithGateway(id)
}

func (m *Manager) List() ([]models.Agent, error) {
	return m.db.ListAgents()
}

func (m *Manager) Start(ctx context.Context, id uuid.UUID) error {
	agent, err := m.db.GetAgentWithGateway(id)
	if err != nil {
		return fmt.Errorf("agent not found: %w", err)
	}

	if agent.Status == models.StatusRunning {
		return fmt.Errorf("agent already running")
	}

	gatewayEndpoint := ""
	if agent.Gateway != nil {
		gatewayEndpoint = agent.Gateway.Endpoint
	}

	if agent.ContainerID == "" {
		containerID, err := m.docker.CreateAgentContainer(ctx, agent.ID, agent.Name, gatewayEndpoint)
		if err != nil {
			return fmt.Errorf("failed to create container: %w", err)
		}
		agent.ContainerID = containerID
		if err := m.db.UpdateAgentContainer(id, containerID); err != nil {
			m.docker.RemoveContainer(ctx, containerID, true)
			return fmt.Errorf("failed to update container id: %w", err)
		}
	}

	if err := m.docker.StartContainer(ctx, agent.ContainerID); err != nil {
		m.db.UpdateAgentStatus(id, models.StatusError)
		return fmt.Errorf("failed to start container: %w", err)
	}

	m.db.UpdateAgentStatus(id, models.StatusRunning)
	m.updateHeartbeat(id, "running")

	return nil
}

func (m *Manager) Stop(ctx context.Context, id uuid.UUID) error {
	agent, err := m.db.GetAgent(id)
	if err != nil {
		return fmt.Errorf("agent not found: %w", err)
	}

	if agent.Status != models.StatusRunning {
		return fmt.Errorf("agent not running")
	}

	if err := m.docker.StopContainer(ctx, agent.ContainerID); err != nil {
		m.db.UpdateAgentStatus(id, models.StatusError)
		return fmt.Errorf("failed to stop container: %w", err)
	}

	m.db.UpdateAgentStatus(id, models.StatusStopped)
	m.updateHeartbeat(id, "stopped")

	return nil
}

func (m *Manager) Delete(ctx context.Context, id uuid.UUID) error {
	agent, err := m.db.GetAgent(id)
	if err != nil {
		return fmt.Errorf("agent not found: %w", err)
	}

	if agent.ContainerID != "" {
		if err := m.docker.RemoveContainer(ctx, agent.ContainerID, true); err != nil {
		}
	}

	if err := m.db.DeleteAgent(id); err != nil {
		return fmt.Errorf("failed to delete agent: %w", err)
	}

	agentDir := m.docker.GetAgentDir(id)
	os.RemoveAll(agentDir)

	return nil
}

func (m *Manager) GetConfig(id uuid.UUID) (*models.AgentConfig, error) {
	return m.db.GetAgentConfig(id)
}

func (m *Manager) UpdateConfig(id uuid.UUID, req *models.UpdateAgentConfigRequest) error {
	config, err := m.db.GetAgentConfig(id)
	if err != nil {
		return fmt.Errorf("config not found: %w", err)
	}

	if req.Heartbeat != "" {
		config.Heartbeat = req.Heartbeat
	}
	if req.AgentMD != "" {
		config.AgentMD = req.AgentMD
	}
	if req.ToolMD != "" {
		config.ToolMD = req.ToolMD
	}

	if err := m.db.UpdateAgentConfig(config); err != nil {
		return fmt.Errorf("failed to update config: %w", err)
	}

	agentDir := m.docker.GetAgentDir(id)
	return m.writeConfigFiles(agentDir, config)
}

func (m *Manager) GetLogs(id uuid.UUID, tail int) (string, error) {
	agent, err := m.db.GetAgent(id)
	if err != nil {
		return "", fmt.Errorf("agent not found: %w", err)
	}

	if agent.ContainerID == "" {
		return "", fmt.Errorf("no container for this agent")
	}

	return m.docker.GetContainerLogs(context.Background(), agent.ContainerID, tail)
}

func (m *Manager) ExecCommand(id uuid.UUID, cmd []string) (string, error) {
	agent, err := m.db.GetAgent(id)
	if err != nil {
		return "", fmt.Errorf("agent not found: %w", err)
	}

	if agent.ContainerID == "" {
		return "", fmt.Errorf("no container for this agent")
	}

	return m.docker.ContainerExec(context.Background(), agent.ContainerID, cmd)
}

func (m *Manager) updateHeartbeat(id uuid.UUID, status string) {
	config, err := m.db.GetAgentConfig(id)
	if err != nil {
		return
	}

	config.Heartbeat = fmt.Sprintf("# Heartbeat\n\nStatus: %s\nLast Update: %s", status, time.Now().Format(time.RFC3339))
	m.db.UpdateAgentConfig(config)

	agentDir := m.docker.GetAgentDir(id)
	m.writeConfigFiles(agentDir, config)
}

func (m *Manager) writeConfigFiles(agentDir string, config *models.AgentConfig) error {
	files := map[string]string{
		"heartbeat.md": config.Heartbeat,
		"agent.md":     config.AgentMD,
		"tool.md":      config.ToolMD,
	}

	for filename, content := range files {
		path := filepath.Join(agentDir, filename)
		if err := os.WriteFile(path, []byte(content), 0644); err != nil {
			return err
		}
	}

	return nil
}

func (m *Manager) GetStats() (*models.Stats, error) {
	return m.db.GetStats()
}
