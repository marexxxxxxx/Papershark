# Planshark - Projektplan

## Überblick

**Planshark** ist ein leichtgewichtiges, Open-Source-Tool zur Erstellung und Verwaltung von AI-Agenten in Docker-Sandboxes. Es fungiert als zentrales Dashboard und Unified API Gateway mit folgenden Kernzielen:

- Agenten erstellen mit vollständiger Root-Sandbox
- Unified Gateway für lokale AI Provider (Ollama, llama.cpp)
- Rate Limiting pro Gateway
- Monitoring (Status, Token-Verbrauch)
- **Keine Orchestration** – Agents arbeiten isoliert

---

## 1. Projektstruktur

```
planshark/
├── planshark-core/           # Backend (Go)
│   ├── cmd/
│   │   └── server/           # Main entrypoint
│   ├── internal/
│   │   ├── api/              # REST API Handler
│   │   ├── docker/           # Docker SDK Integration
│   │   ├── gateway/          # Unified API Gateway + Rate Limiting
│   │   ├── agent/            # Agent Manager
│   │   ├── db/               # SQLite/PostgreSQL
│   │   └── websocket/        # Real-time updates
│   ├── pkg/
│   │   └── models/           # Shared data models
│   ├── migrations/           # Database migrations
│   └── go.mod
│
├── planshark-dashboard/      # Frontend
│   ├── src/
│   │   ├── components/       # UI Components
│   │   ├── pages/           # Dashboard Pages
│   │   ├── hooks/           # Custom React Hooks
│   │   ├── lib/             # Utilities
│   │   └── stores/           # Zustand stores
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── planshark-agent/          # Agent Template (Python)
│   ├── agent.py              # Main agent loop
│   ├── hearbeat.md           # Status heartbeat
│   ├── agent.md              # Agent persona
│   ├── tool.md               # Available tools
│   └── requirements.txt
│
├── docker/
│   ├── Dockerfile.agent      # Sandbox container
│   └── docker-compose.yml    # Local dev setup
│
├── docs/
│   └── api.md                # API documentation
│
├── Makefile
├── README.md
└── LICENSE
```

---

## 2. Technologie-Stack

### Empfohlene Technologien

| Layer | Technologie | Begründung |
|-------|-------------|------------|
| **Backend** | **Go 1.21+** | Schnell, leichtgewichtig, exzellente Docker/并发-Libraries, einfaches Deployment |
| **Frontend** | **React 18 + Vite + TypeScript** | Schnellste DX, große Community |
| **UI** | **TailwindCSS + shadcn/ui** | Moderne Komponenten, konsistentes Design |
| **State** | **Zustand** | Minimal, performant |
| **Datenbank** | **SQLite (dev) / PostgreSQL (prod)** | Portabel, kein extra Server |
| **Docker SDK** | **docker/go-sdk** | Native Container-Verwaltung in Go |
| **WebSocket** | **gorilla/websocket** | Echtzeit-Dashboard (Logs, Status) |
| **Agent-Runtime** | **Python 3.11+** | Bestes AI/LLM-Ökosystem |

---

## 3. Core-Komponenten

### 3.1 Backend Module

```
┌─────────────────────────────────────────────────────────┐
│                     API Server (Go)                      │
├─────────────────────────────────────────────────────────┤
│  /api/v1/agents     - Agent CRUD                        │
│  /api/v1/gateways   - Gateway Config                    │
│  /api/v1/chat       - Unified Chat Endpoint            │
│  /api/v1/monitor    - Stats & Metrics                   │
│  /ws/logs           - WebSocket for live logs           │
└─────────────────────────────────────────────────────────┘
           │                    │                │
           ▼                    ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Agent Manager  │  │  Gateway Mgr    │  │  Docker Ctrl    │
│                 │  │                 │  │                 │
│ - CRUD agents   │  │ - Provider cfg  │  │ - Containers    │
│ - Config files  │  │ - Rate limits   │  │ - Lifecycle     │
│ - Heartbeat     │  │ - Request queue │  │ - Exec logs     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
           │                    │                │
           ▼                    ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   SQLite/PG     │  │   In-Memory    │  │   Docker API    │
│   Database      │  │   Rate Limiter │  │   (socket)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 3.2 Datenmodell

```sql
-- Gateways (API Provider)
CREATE TABLE gateways (
    id          UUID PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    provider    TEXT NOT NULL, -- 'ollama', 'llamacpp', 'openai'
    endpoint    TEXT NOT NULL,
    api_key     TEXT,          -- optional
    model       TEXT NOT NULL, -- default model
    rate_limit  INTEGER DEFAULT 2,  -- concurrent requests
    timeout_sec INTEGER DEFAULT 60,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
    id              UUID PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    gateway_id      UUID REFERENCES gateways(id),
    model           TEXT,       -- override gateway default
    container_id    TEXT,       -- docker container ID
    status          TEXT DEFAULT 'stopped', -- 'running', 'stopped', 'error'
    state           JSONB,      -- arbitrary agent state
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Request Log (Token tracking)
CREATE TABLE requests (
    id          UUID PRIMARY KEY,
    agent_id    UUID REFERENCES agents(id),
    gateway_id  UUID REFERENCES gateways(id),
    model       TEXT NOT NULL,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    latency_ms      INTEGER,
    status       TEXT, -- 'success', 'error', 'rate_limited'
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Agent Config Files (stored as JSON for simplicity)
CREATE TABLE agent_configs (
    agent_id    UUID PRIMARY KEY REFERENCES agents(id),
    hearbeat_md TEXT,
    agent_md    TEXT NOT NULL,
    tool_md     TEXT
);
```

---

## 4. API Gateway

### 4.1 Provider-Unterstützung

| Provider | Status | Endpoint Format | Auth |
|----------|--------|-----------------|------|
| **Ollama** | Primary | `http://host:11434/api/chat` | None |
| **llama.cpp** (server) | Primary | `http://host:8080/completion` | None |
| **OpenAI-kompatibel** | Optional | Custom URL | API Key |

### 4.2 Rate Limiting

```go
type RateLimiter struct {
    maxConcurrent int           // z.B. 2
    sem           chan struct{} // Semaphore
    timeout       time.Duration // Queue timeout
    queue         chan request  // Waiting requests
}

type Gateway struct {
    ID          string
    Provider    ProviderType
    Endpoint    string
    RateLimiter RateLimiter
    Client      *http.Client
}
```

**Verhalten**:
1. Request kommt an Gateway
2. Prüfe freien Slot (`sem` channel)
3. Falls Slot frei → sofort ausführen
4. Falls voll → in Queue (mit Timeout)
5. Nach Abschluss Slot freigeben

### 4.3 Unified Chat Endpoint

```
POST /api/v1/chat
Content-Type: application/json

{
    "agent_id": "uuid",           // Required
    "message": "Hello agent",     // Required
    "model": "llama3:70b"         // Optional override
}

Response (Streaming):
data: {"content": "Hello"}
data: {"content": " world"}
data: {"done": true, "total_tokens": 42}
```

---

## 5. Docker Sandbox

### 5.1 Container Template

```dockerfile
FROM python:3.11-slim

USER root
WORKDIR /agent

RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent/ ./src/

RUN useradd -m agent && \
    chown -R agent:agent /agent

USER agent

CMD ["python", "src/agent.py"]
```

### 5.2 Container Management

| Action | Go Function | Beschreibung |
|--------|-------------|--------------|
| `create` | `ContainerCreate` | Image bauen, Config-Files mounten |
| `start` | `ContainerStart` | Agent-Prozess starten |
| `stop` | `ContainerStop` | Graceful shutdown (SIGTERM) |
| `exec` | `ContainerExecCreate` | Befehle in Container ausführen |
| `logs` | `ContainerLogs` | stdout/stderr abrufen |
| `delete` | `ContainerRemove` | Container entfernen |

### 5.3 Dateiverwaltung

```
/var/lib/planshark/agents/{agent_id}/
├── hearbeat.md      # Letzte Aktivität, Status
├── agent.md         # Agent-Persona, Anweisungen
├── tool.md          # Verfügbare Tools/Fähigkeiten
├── state.json       # Interner State
└── logs/
    └── 2024-01-15.log
```

**Mount**: `/var/lib/planshark/agents/{id}` → `/agent/config` im Container

---

## 6. Web Dashboard

### 6.1 Seitenstruktur

```
/                        → Dashboard (Agent-Liste)
/agents                  → Alle Agents
/agents/new              → Agent erstellen
/agents/:id              → Agent-Detail
/agents/:id/edit         → Config bearbeiten
/gateways                → Gateway-Verwaltung
/gateways/new            → Gateway hinzufügen
/settings                → System-Einstellungen
```

### 6.2 Dashboard-Seiten

| Seite | Komponenten |
|-------|-------------|
| **Dashboard** | Agent-Grid mit Status-Badges, Quick-Actions, Gateway-Stats |
| **Agent erstellen** | Form: Name, Gateway wählen, Modell wählen |
| **Agent bearbeiten** | Monaco Editor für md-Files, Save-Button |
| **Agent-Detail** | Live-Logs (xterm.js), Terminal, Token-Chart, Actions |
| **Gateway-Verwaltung** | Liste, Rate-Limit-Slider, Slot-Monitor |

### 6.3 UI-Komponenten

- **AgentCard**: Name, Status-Badge, Modell, letzte Aktivität
- **GatewayStatus**: Slots (belegt/verfügbar), Provider-Badge
- **LogViewer**: xterm.js mit ANSI-Farben
- **ConfigEditor**: Monaco Editor mit Markdown-Support
- **TokenChart**: Chart.js für Verbrauch über Zeit

---

## 7. Workflows

### 7.1 Agent erstellen

```
User                          Backend                           Docker
──────────────────────────────────────────────────────────────────────
1. Form ausfüllen
   name="Research-Bot"
   gateway="Ollama Local"
   model="llama3:70b"
                              │
                              ▼
2. POST /api/v1/agents
   body: {name, gateway_id, model}
                              │
                              ├── Create agent in DB
                              ├── mkdir /var/lib/planshark/agents/{id}
                              ├── Generate config files
                              │
                              ▼
3. POST /api/v1/agents/{id}/start
                              │
                              ├── docker create container
                              ├── mount config volume
                              │
                              ▼
4. docker start {container}
                              │
                              ▼
5. Container läuft
   Agent heartbeat: "running"
                              │
                              ▼
6. WS: Status-Update → "running"
```

### 7.2 Chat über Gateway

```
Agent                    Planshark Gateway              Ollama
────────────────────────────────────────────────────────────────
1. Chat-Request
   POST /api/v1/chat
   {agent_id, message}
                         │
                         ▼
2. Get gateway for agent
   Check rate limit
                         │
                         ▼ (wait for slot)
3. Forward to Ollama
   POST /endpoint/api/chat
   {model, messages}
                         │
                         ▼
4. Response (stream)
   data: "..."
                         │
                         ▼
5. Track tokens
   Save to requests DB
                         │
                         ▼
6. Stream to client
   (or return full)
```

---

## 8. Phasen-Plan

### Phase 1: MVP (4-6 Wochen)

**Backend:**
- [ ] Go Projekt-Struktur
- [ ] REST API Setup (Chi/Gin)
- [ ] SQLite Datenbank + Migrations
- [ ] Docker SDK Integration
- [ ] Agent CRUD
- [ ] Container Lifecycle (create/start/stop/delete)
- [ ] Config-Dateien lesen/schreiben

**Gateway:**
- [ ] Ollama Client
- [ ] llama.cpp Client
- [ ] Rate Limiter (Semaphore)
- [ ] Unified Chat Endpoint
- [ ] Token-Tracking

**Frontend:**
- [ ] React + Vite Setup
- [ ] Agent-Liste (Dashboard)
- [ ] Agent erstellen Form
- [ ] Agent-Detail mit Logs
- [ ] Gateway-Liste

### Phase 2: Monitoring (2-3 Wochen)

- [ ] WebSocket für Live-Logs
- [ ] Token-Verbrauch Dashboard
- [ ] Gateway Slot-Monitor
- [ ] Container-Stats (CPU/Memory)
- [ ] Request-History

### Phase 3: Erweiterungen

- [ ] OpenAI-kompatibles Gateway
- [ ] Agent-Templates
- [ ] Authentifizierung (optional)
- [ ] Multi-Node Support
- [ ] Backup/Restore

---

## 9. Dateien zu erstellen (Phase 1)

### Backend
```
planshark-core/
├── cmd/server/main.go
├── go.mod
├── internal/
│   ├── api/
│   │   ├── router.go
│   │   ├── handlers/
│   │   │   ├── agents.go
│   │   │   ├── gateways.go
│   │   │   └── chat.go
│   │   └── middleware/
│   │       └── cors.go
│   ├── docker/
│   │   └── client.go
│   ├── gateway/
│   │   ├── manager.go
│   │   ├── limiter.go
│   │   └── providers/
│   │       ├── ollama.go
│   │       └── llamacpp.go
│   ├── agent/
│   │   └── manager.go
│   └── db/
│       ├── db.go
│       └── migrations/
└── pkg/
    └── models/
        └── models.go
```

### Frontend
```
planshark-dashboard/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   ├── AgentCard.tsx
│   │   ├── GatewayStatus.tsx
│   │   └── LogViewer.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Agents.tsx
│   │   ├── AgentDetail.tsx
│   │   └── Gateways.tsx
│   └── lib/
│       └── api.ts
└── package.json
```

---

## 10. Offene Fragen (zu klären)

| Frage | Empfehlung | Alternativen |
|-------|------------|--------------|
| **Docker Socket** | `/var/run/docker.sock` | Remote Docker API |
| **Frontend-Framework** | React | Vue, Svelte |
| **Real-time** | WebSocket | SSE, Polling |
| **Agent Template** | Python | Node.js, Beides |
| **Logging** | Dateien + DB | Nur DB |

---

## 11. Nächste Schritte

1. **Projekt initialisieren**
   ```bash
   mkdir planshark && cd planshark
   mkdir planshark-core planshark-dashboard
   cd planshark-core && go mod init planshark
   ```

2. **Docker-Socket Berechtigungen prüfen**
   ```bash
   ls -la /var/run/docker.sock
   ```

3. **Test-Ollama starten**
   ```bash
   ollama pull llama3
   ollama serve
   ```

---

*Letztes Update: 2026-04-10*
