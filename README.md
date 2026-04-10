# Planshark

A lightweight, open-source tool for creating and managing AI agents in Docker sandboxes. Planshark provides a unified API gateway for local AI providers with built-in rate limiting.

## Features

- **Agent Management**: Create, start, stop, and delete AI agents with full root access in isolated Docker containers
- **Unified API Gateway**: Connect to local AI providers (Ollama, llama.cpp, OpenAI-compatible)
- **Rate Limiting**: Configure concurrent request limits per gateway (default: 2 slots)
- **Real-time Monitoring**: Track agent status, token usage, and container logs
- **Config Management**: Edit agent.md, tool.md, and heartbeat.md directly from the dashboard

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- Docker

### Build

```bash
make all
```

### Run

```bash
# Start backend (port 8080)
./planshark-core/bin/server -data ./data

# Start frontend (port 3000)
cd planshark-dashboard && npm run dev
```

Or use the development mode:

```bash
make dev
```

### Access

Open http://localhost:3000 in your browser.

## Configuration

### Add a Gateway

1. Go to "Gateways" in the sidebar
2. Click "Add Gateway"
3. Configure:
   - **Ollama**: Endpoint `http://localhost:11434`, Model `llama3`
   - **llama.cpp**: Endpoint `http://localhost:8080`, Model your model

### Create an Agent

1. Go to "Agents"
2. Click "Create Agent"
3. Select a gateway and optionally override the model
4. Write agent instructions in Markdown

## API

### REST Endpoints

```
GET    /api/v1/agents           - List all agents
POST   /api/v1/agents           - Create agent
GET    /api/v1/agents/:id       - Get agent
DELETE /api/v1/agents/:id       - Delete agent
POST   /api/v1/agents/:id/start  - Start agent
POST   /api/v1/agents/:id/stop  - Stop agent
GET    /api/v1/agents/:id/config - Get agent config
PUT    /api/v1/agents/:id/config - Update agent config
GET    /api/v1/agents/:id/logs   - Get container logs

GET    /api/v1/gateways         - List gateways
POST   /api/v1/gateways         - Create gateway
DELETE /api/v1/gateways/:id    - Delete gateway

POST   /api/v1/chat             - Send chat request

GET    /api/v1/stats            - Get statistics
```

### Example Chat Request

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "uuid", "message": "Hello!"}'
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Planshark Dashboard                │
│              (React + Tailwind)                 │
└─────────────────────┬───────────────────────────┘
                      │ HTTP
┌─────────────────────▼───────────────────────────┐
│              Planshark Backend                   │
│                  (Go)                            │
├──────────────────────────────────────────────────┤
│  Agent Manager │ Gateway Manager │ Docker Client │
└───────┬────────┴────────┬─────────┴───────┬───────┘
        │                 │                │
        │           ┌─────▼─────┐          │
        │           │ Rate      │          │
        │           │ Limiter   │          │
        │           └─────┬─────┘          │
        │                 │                │
        ▼                 ▼                ▼
┌─────────────┐    ┌─────────────┐    ┌───────────┐
│   SQLite    │    │  Ollama /   │    │  Docker   │
│   Database  │    │  llama.cpp  │    │  Engine   │
└─────────────┘    └─────────────┘    └─────┬─────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Agent      │
                                    │  Containers │
                                    └─────────────┘
```

## Tech Stack

- **Backend**: Go, Chi router, SQLite
- **Frontend**: React 18, Vite, TypeScript, TailwindCSS
- **Container**: Docker SDK, root-enabled containers

## License

MIT
