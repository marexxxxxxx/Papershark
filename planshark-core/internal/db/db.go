package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/google/uuid"

	"planshark-core/pkg/models"
)

type DB struct {
	conn *sql.DB
}

func New(dbPath string) (*DB, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	conn, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open db: %w", err)
	}

	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate: %w", err)
	}

	return db, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS gateways (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		provider TEXT NOT NULL,
		endpoint TEXT NOT NULL,
		api_key TEXT,
		model TEXT NOT NULL,
		rate_limit INTEGER DEFAULT 2,
		timeout_sec INTEGER DEFAULT 60,
		is_active INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS agents (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		gateway_id TEXT REFERENCES gateways(id),
		model TEXT NOT NULL,
		container_id TEXT,
		status TEXT DEFAULT 'stopped',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS agent_configs (
		agent_id TEXT PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
		heartbeat_md TEXT DEFAULT '',
		agent_md TEXT NOT NULL,
		tool_md TEXT DEFAULT ''
	);

	CREATE TABLE IF NOT EXISTS requests (
		id TEXT PRIMARY KEY,
		agent_id TEXT REFERENCES agents(id),
		gateway_id TEXT REFERENCES gateways(id),
		model TEXT NOT NULL,
		input_tokens INTEGER DEFAULT 0,
		output_tokens INTEGER DEFAULT 0,
		latency_ms INTEGER DEFAULT 0,
		status TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_requests_agent_id ON requests(agent_id);
	CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
	`

	_, err := db.conn.Exec(schema)
	return err
}

func (db *DB) CreateGateway(g *models.Gateway) error {
	g.ID = uuid.New()
	g.CreatedAt = time.Now()
	_, err := db.conn.Exec(`
		INSERT INTO gateways (id, name, provider, endpoint, api_key, model, rate_limit, timeout_sec, is_active, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, g.ID.String(), g.Name, g.Provider, g.Endpoint, g.APIKey, g.Model, g.RateLimit, g.TimeoutSec, g.IsActive, g.CreatedAt)
	return err
}

func (db *DB) GetGateway(id uuid.UUID) (*models.Gateway, error) {
	g := &models.Gateway{}
	err := db.conn.QueryRow(`
		SELECT id, name, provider, endpoint, api_key, model, rate_limit, timeout_sec, is_active, created_at
		FROM gateways WHERE id = ?
	`, id.String()).Scan(&g.ID, &g.Name, &g.Provider, &g.Endpoint, &g.APIKey, &g.Model, &g.RateLimit, &g.TimeoutSec, &g.IsActive, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return g, nil
}

func (db *DB) GetGatewayByName(name string) (*models.Gateway, error) {
	g := &models.Gateway{}
	err := db.conn.QueryRow(`
		SELECT id, name, provider, endpoint, api_key, model, rate_limit, timeout_sec, is_active, created_at
		FROM gateways WHERE name = ?
	`, name).Scan(&g.ID, &g.Name, &g.Provider, &g.Endpoint, &g.APIKey, &g.Model, &g.RateLimit, &g.TimeoutSec, &g.IsActive, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return g, nil
}

func (db *DB) ListGateways() ([]models.Gateway, error) {
	rows, err := db.conn.Query(`
		SELECT id, name, provider, endpoint, api_key, model, rate_limit, timeout_sec, is_active, created_at
		FROM gateways ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var gateways []models.Gateway
	for rows.Next() {
		var g models.Gateway
		if err := rows.Scan(&g.ID, &g.Name, &g.Provider, &g.Endpoint, &g.APIKey, &g.Model, &g.RateLimit, &g.TimeoutSec, &g.IsActive, &g.CreatedAt); err != nil {
			return nil, err
		}
		gateways = append(gateways, g)
	}
	return gateways, nil
}

func (db *DB) UpdateGateway(g *models.Gateway) error {
	_, err := db.conn.Exec(`
		UPDATE gateways SET name = ?, provider = ?, endpoint = ?, api_key = ?, model = ?, rate_limit = ?, timeout_sec = ?, is_active = ?
		WHERE id = ?
	`, g.Name, g.Provider, g.Endpoint, g.APIKey, g.Model, g.RateLimit, g.TimeoutSec, g.IsActive, g.ID.String())
	return err
}

func (db *DB) DeleteGateway(id uuid.UUID) error {
	_, err := db.conn.Exec("DELETE FROM gateways WHERE id = ?", id.String())
	return err
}

func (db *DB) CreateAgent(a *models.Agent) error {
	a.ID = uuid.New()
	a.CreatedAt = time.Now()
	a.UpdatedAt = time.Now()
	var gatewayID *string
	if a.GatewayID != nil {
		gid := a.GatewayID.String()
		gatewayID = &gid
	}
	_, err := db.conn.Exec(`
		INSERT INTO agents (id, name, gateway_id, model, container_id, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, a.ID.String(), a.Name, gatewayID, a.Model, a.ContainerID, a.Status, a.CreatedAt, a.UpdatedAt)
	return err
}

func (db *DB) GetAgent(id uuid.UUID) (*models.Agent, error) {
	a := &models.Agent{}
	var gatewayID, containerID sql.NullString
	err := db.conn.QueryRow(`
		SELECT id, name, gateway_id, model, container_id, status, created_at, updated_at
		FROM agents WHERE id = ?
	`, id.String()).Scan(&a.ID, &a.Name, &gatewayID, &a.Model, &containerID, &a.Status, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if gatewayID.Valid {
		gid, _ := uuid.Parse(gatewayID.String)
		a.GatewayID = &gid
	}
	a.ContainerID = containerID.String
	return a, nil
}

func (db *DB) GetAgentWithGateway(id uuid.UUID) (*models.Agent, error) {
	a, err := db.GetAgent(id)
	if err != nil {
		return nil, err
	}
	if a.GatewayID != nil {
		g, err := db.GetGateway(*a.GatewayID)
		if err == nil {
			a.Gateway = g
		}
	}
	return a, nil
}

func (db *DB) ListAgents() ([]models.Agent, error) {
	rows, err := db.conn.Query(`
		SELECT id, name, gateway_id, model, container_id, status, created_at, updated_at
		FROM agents ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var agents []models.Agent
	for rows.Next() {
		var a models.Agent
		var gatewayID, containerID sql.NullString
		if err := rows.Scan(&a.ID, &a.Name, &gatewayID, &a.Model, &containerID, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		if gatewayID.Valid {
			gid, _ := uuid.Parse(gatewayID.String)
			a.GatewayID = &gid
		}
		a.ContainerID = containerID.String
		agents = append(agents, a)
	}
	return agents, nil
}

func (db *DB) UpdateAgent(a *models.Agent) error {
	a.UpdatedAt = time.Now()
	var gatewayID *string
	if a.GatewayID != nil {
		gid := a.GatewayID.String()
		gatewayID = &gid
	}
	_, err := db.conn.Exec(`
		UPDATE agents SET name = ?, gateway_id = ?, model = ?, container_id = ?, status = ?, updated_at = ?
		WHERE id = ?
	`, a.Name, gatewayID, a.Model, a.ContainerID, a.Status, a.UpdatedAt, a.ID.String())
	return err
}

func (db *DB) UpdateAgentStatus(id uuid.UUID, status models.AgentStatus) error {
	_, err := db.conn.Exec("UPDATE agents SET status = ?, updated_at = ? WHERE id = ?", status, time.Now(), id.String())
	return err
}

func (db *DB) UpdateAgentContainer(id uuid.UUID, containerID string) error {
	_, err := db.conn.Exec("UPDATE agents SET container_id = ?, updated_at = ? WHERE id = ?", containerID, time.Now(), id.String())
	return err
}

func (db *DB) DeleteAgent(id uuid.UUID) error {
	_, err := db.conn.Exec("DELETE FROM agents WHERE id = ?", id.String())
	return err
}

func (db *DB) CreateAgentConfig(c *models.AgentConfig) error {
	_, err := db.conn.Exec(`
		INSERT INTO agent_configs (agent_id, heartbeat_md, agent_md, tool_md)
		VALUES (?, ?, ?, ?)
	`, c.AgentID.String(), c.Heartbeat, c.AgentMD, c.ToolMD)
	return err
}

func (db *DB) GetAgentConfig(id uuid.UUID) (*models.AgentConfig, error) {
	c := &models.AgentConfig{}
	err := db.conn.QueryRow(`
		SELECT agent_id, heartbeat_md, agent_md, tool_md FROM agent_configs WHERE agent_id = ?
	`, id.String()).Scan(&c.AgentID, &c.Heartbeat, &c.AgentMD, &c.ToolMD)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (db *DB) UpdateAgentConfig(c *models.AgentConfig) error {
	_, err := db.conn.Exec(`
		UPDATE agent_configs SET heartbeat_md = ?, agent_md = ?, tool_md = ? WHERE agent_id = ?
	`, c.Heartbeat, c.AgentMD, c.ToolMD, c.AgentID.String())
	return err
}

func (db *DB) CreateRequestLog(r *models.RequestLog) error {
	r.ID = uuid.New()
	r.CreatedAt = time.Now()
	_, err := db.conn.Exec(`
		INSERT INTO requests (id, agent_id, gateway_id, model, input_tokens, output_tokens, latency_ms, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, r.ID.String(), r.AgentID.String(), r.GatewayID.String(), r.Model, r.InputTokens, r.OutputTokens, r.LatencyMs, r.Status, r.CreatedAt)
	return err
}

func (db *DB) GetStats() (*models.Stats, error) {
	s := &models.Stats{}

	db.conn.QueryRow("SELECT COUNT(*) FROM agents").Scan(&s.TotalAgents)
	db.conn.QueryRow("SELECT COUNT(*) FROM agents WHERE status = 'running'").Scan(&s.RunningAgents)
	db.conn.QueryRow("SELECT COUNT(*) FROM agents WHERE status = 'stopped'").Scan(&s.StoppedAgents)
	db.conn.QueryRow("SELECT COUNT(*) FROM agents WHERE status = 'error'").Scan(&s.ErrorAgents)
	db.conn.QueryRow("SELECT COUNT(*) FROM gateways").Scan(&s.TotalGateways)
	db.conn.QueryRow("SELECT COUNT(*) FROM gateways WHERE is_active = 1").Scan(&s.ActiveGateways)
	db.conn.QueryRow("SELECT COUNT(*) FROM requests").Scan(&s.TotalRequests)
	db.conn.QueryRow("SELECT COALESCE(SUM(input_tokens), 0) FROM requests").Scan(&s.TotalInputTokens)
	db.conn.QueryRow("SELECT COALESCE(SUM(output_tokens), 0) FROM requests").Scan(&s.TotalOutputTokens)

	return s, nil
}
