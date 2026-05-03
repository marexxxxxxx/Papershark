package docker

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

type Client struct {
	baseDir string
}

func NewClient(baseDir string) (*Client, error) {
	socketPath := "/var/run/docker.sock"
	if _, err := os.Stat(socketPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("docker socket not found: %w", err)
	}

	if !filepath.IsAbs(baseDir) {
		absPath, err := filepath.Abs(baseDir)
		if err != nil {
			return nil, fmt.Errorf("failed to get absolute path: %w", err)
		}
		baseDir = absPath
	}

	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create base dir: %w", err)
	}

	return &Client{baseDir: baseDir}, nil
}

func (c *Client) Close() error {
	return nil
}

func (c *Client) GetAgentDir(agentID uuid.UUID) string {
	return filepath.Join(c.baseDir, "agents", agentID.String())
}

func (c *Client) EnsureAgentDir(agentID uuid.UUID) (string, error) {
	dir := c.GetAgentDir(agentID)
	if err := os.MkdirAll(filepath.Join(dir, "logs"), 0755); err != nil {
		return "", err
	}
	return dir, nil
}

func (c *Client) doRequest(method, path string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	var bodyData []byte
	if body != nil {
		bodyData, _ = json.Marshal(body)
		reqBody = bytes.NewReader(bodyData)
	}

	conn, err := net.Dial("unix", "/var/run/docker.sock")
	if err != nil {
		return nil, fmt.Errorf("failed to connect to docker socket: %w", err)
	}
	defer conn.Close()

	req, err := http.NewRequest(method, "http://localhost"+path, reqBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Host", "localhost")
	if len(bodyData) > 0 {
		req.Header.Set("Content-Length", fmt.Sprintf("%d", len(bodyData)))
	}

	err = req.Write(conn)
	if err != nil {
		return nil, err
	}

	resp, err := http.ReadResponse(bufio.NewReader(conn), req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		var errResp map[string]interface{}
		if err := json.Unmarshal(data, &errResp); err == nil {
			if msg, ok := errResp["message"].(string); ok {
				return data, fmt.Errorf("docker API error: %s", msg)
			}
		}
		return data, fmt.Errorf("docker API error: %d %s", resp.StatusCode, string(data))
	}

	return data, nil
}

func (c *Client) CreateAgentContainer(ctx context.Context, agentID uuid.UUID, name string, gatewayEndpoint string) (string, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	agentDir, err := c.EnsureAgentDir(agentID)
	if err != nil {
		return "", err
	}

	containerName := fmt.Sprintf("planshark-%s", name)

	networkMode := "bridge"
	envVars := []string{
		"AGENT_DIR=/agent",
		"AGENT_ID=" + agentID.String(),
	}
	if gatewayEndpoint != "" {
		envVars = append(envVars, "OPENAI_BASE_URL="+gatewayEndpoint)
	}

	body := map[string]interface{}{
		"Image": "planshark-agent:latest",
		"HostConfig": map[string]interface{}{
			"Binds": []string{
				fmt.Sprintf("%s/agent.md:/agent/agent.md:ro", agentDir),
				fmt.Sprintf("%s/tool.md:/agent/tool.md:ro", agentDir),
				fmt.Sprintf("%s/heartbeat.md:/agent/heartbeat.md:rw", agentDir),
				fmt.Sprintf("%s/logs:/agent/logs:rw", agentDir),
			},
			"NetworkMode": networkMode,
		},
		"Env":          envVars,
		"Cmd":          []string{"python", "agent.py"},
		"WorkingDir":   "/agent",
		"AttachStdout": true,
		"AttachStderr": true,
		"Tty":          true,
	}

	data, err := c.doRequest("POST", "/containers/create?name="+containerName, body)
	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}

	if len(data) == 0 {
		return "", fmt.Errorf("empty Docker response")
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w, data: %s", err, string(data))
	}

	id, ok := resp["Id"].(string)
	if !ok || id == "" {
		// Check for error message in response
		if msg, hasMsg := resp["message"].(string); hasMsg {
			return "", fmt.Errorf("docker error: %s", msg)
		}
		return "", fmt.Errorf("no container ID returned, response: %s", string(data))
	}

	log.Printf("Created container %s for agent %s", id[:12], agentID)
	return id[:12], nil
}

func (c *Client) CreateOpenClawContainer(ctx context.Context, agentID uuid.UUID, name string, gatewayEndpoint string, apiKey string, model string) (string, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	agentDir, err := c.EnsureAgentDir(agentID)
	if err != nil {
		return "", err
	}

	containerName := fmt.Sprintf("openclaw-%s", name)

	networkMode := "bridge"
	envVars := []string{
		"OPENAI_MODEL=" + model,
	}
	if gatewayEndpoint != "" {
		envVars = append(envVars, "OPENAI_BASE_URL="+gatewayEndpoint)
	}
	if apiKey != "" {
		envVars = append(envVars, "OPENAI_API_KEY="+apiKey)
	}

	body := map[string]interface{}{
		"Image": "openclaw:latest",
		"HostConfig": map[string]interface{}{
			"Binds": []string{
				fmt.Sprintf("%s/logs:/app/logs:rw", agentDir),
			},
			"NetworkMode": networkMode,
		},
		"Env":          envVars,
		"AttachStdout": true,
		"AttachStderr": true,
		"Tty":          true,
	}

	data, err := c.doRequest("POST", "/containers/create?name="+containerName, body)
	if err != nil {
		return "", fmt.Errorf("failed to create openclaw container: %w", err)
	}

	if len(data) == 0 {
		return "", fmt.Errorf("empty Docker response")
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w, data: %s", err, string(data))
	}

	id, ok := resp["Id"].(string)
	if !ok || id == "" {
		// Check for error message in response
		if msg, hasMsg := resp["message"].(string); hasMsg {
			return "", fmt.Errorf("docker error: %s", msg)
		}
		return "", fmt.Errorf("no container ID returned, response: %s", string(data))
	}

	log.Printf("Created OpenClaw container %s for agent %s", id[:12], agentID)
	return id[:12], nil
}

func (c *Client) StartContainer(ctx context.Context, containerID string) error {
	_, err := c.doRequest("POST", "/containers/"+containerID+"/start", nil)
	return err
}

func (c *Client) StopContainer(ctx context.Context, containerID string) error {
	_, err := c.doRequest("POST", "/containers/"+containerID+"/stop?t=10", nil)
	return err
}

func (c *Client) RemoveContainer(ctx context.Context, containerID string, force bool) error {
	forceStr := "0"
	if force {
		forceStr = "1"
	}
	_, err := c.doRequest("DELETE", "/containers/"+containerID+"?force="+forceStr, nil)
	return err
}

func (c *Client) GetContainerStatus(ctx context.Context, containerID string) (string, error) {
	data, err := c.doRequest("GET", "/containers/"+containerID+"/json", nil)
	if err != nil {
		return "unknown", err
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "unknown", err
	}

	state, ok := resp["State"].(map[string]interface{})
	if !ok {
		return "unknown", nil
	}

	if state["Running"] == true {
		return "running", nil
	}
	return "stopped", nil
}

func (c *Client) ContainerExec(ctx context.Context, containerID string, cmd []string) (string, error) {
	execCreate := map[string]interface{}{
		"AttachStdout": true,
		"AttachStderr": true,
		"Tty":          true,
		"Cmd":          cmd,
	}

	data, err := c.doRequest("POST", "/containers/"+containerID+"/exec", execCreate)
	if err != nil {
		return "", err
	}

	var execResp map[string]interface{}
	if err := json.Unmarshal(data, &execResp); err != nil {
		return "", err
	}

	execID := execResp["Id"].(string)
	_, _ = c.doRequest("POST", "/exec/"+execID+"/start", map[string]interface{}{
		"Detach": false,
		"Tty":    true,
	})

	return "", nil
}

func (c *Client) GetContainerLogs(ctx context.Context, containerID string, tail int) (string, error) {
	data, err := c.doRequest("GET", "/containers/"+containerID+"/logs?stdout=true&stderr=true&tail="+fmt.Sprintf("%d", tail), nil)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (c *Client) IsDockerAvailable() bool {
	_, err := c.doRequest("GET", "/_ping", nil)
	return err == nil
}
