package db

import (
	"os"
	"testing"

	"planshark-core/pkg/models"
)

func TestDB(t *testing.T) {
	// Setup test database
	dbPath := "test.db"
	db, err := New(dbPath)
	if err != nil {
		t.Fatalf("Failed to create test db: %v", err)
	}
	defer os.Remove(dbPath)

	// Test Gateways
	g := &models.Gateway{
		Name:       "Test Gateway",
		Provider:   "openai",
		Endpoint:   "http://localhost",
		APIKey:     "testkey",
		Model:      "test-model",
		RateLimit:  2,
		TimeoutSec: 30,
		IsActive:   true,
	}

	if err := db.CreateGateway(g); err != nil {
		t.Fatalf("Failed to create gateway: %v", err)
	}

	// Test Agents
	a := &models.Agent{
		Name:        "Test Agent",
		GatewayID:   &g.ID,
		Model:       "test-model",
		ContainerID: "test-container",
		Status:      "running",
	}

	if err := db.CreateAgent(a); err != nil {
		t.Fatalf("Failed to create agent: %v", err)
	}

	retrievedAgent, err := db.GetAgent(a.ID)
	if err != nil {
		t.Fatalf("Failed to get agent: %v", err)
	}
	if retrievedAgent.Name != "Test Agent" {
		t.Errorf("Expected agent name 'Test Agent', got %s", retrievedAgent.Name)
	}

	// Test Configs
	cfg := &models.AgentConfig{
		AgentID:   a.ID,
		Heartbeat: "heartbeat",
		AgentMD:   "agent",
		ToolMD:    "tool",
	}

	if err := db.CreateAgentConfig(cfg); err != nil {
		t.Fatalf("Failed to create agent config: %v", err)
	}

	// Test Stats
	stats, err := db.GetStats()
	if err != nil {
		t.Fatalf("Failed to get stats: %v", err)
	}
	if stats.TotalAgents != 1 {
		t.Errorf("Expected 1 total agent, got %d", stats.TotalAgents)
	}

	// Test Tasks
	task := &models.Task{
		AgentID:  a.ID,
		TaskType: "chat",
		Input:    "hello",
	}

	if err := db.CreateTask(task); err != nil {
		t.Fatalf("Failed to create task: %v", err)
	}

	claimed, err := db.ClaimTasks(a.ID, 1)
	if err != nil || len(claimed) != 1 {
		t.Fatalf("Failed to claim tasks: %v", err)
	}
}
