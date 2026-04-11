package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"planshark-core/internal/agent"
	"planshark-core/internal/db"
	"planshark-core/internal/gateway"
	"planshark-core/pkg/models"
)

type Handler struct {
	db *db.DB
	ag *agent.Manager
	gw *gateway.GatewayManager
}

func New(database *db.DB, agentMgr *agent.Manager, gwMgr *gateway.GatewayManager) *Handler {
	return &Handler{
		db: database,
		ag: agentMgr,
		gw: gwMgr,
	}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.ag.GetStats()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(stats)
}

func (h *Handler) ListAgents(w http.ResponseWriter, r *http.Request) {
	agents, err := h.ag.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(agents)
}

func (h *Handler) GetAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	a, err := h.ag.Get(id)
	if err != nil {
		http.Error(w, "agent not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(a)
}

func (h *Handler) CreateAgent(w http.ResponseWriter, r *http.Request) {
	var rawReq map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&rawReq); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	gatewayIDRaw, exists := rawReq["gateway_id"]
	if !exists || gatewayIDRaw == nil || gatewayIDRaw == "" {
		http.Error(w, "gateway_id is required", http.StatusBadRequest)
		return
	}

	var req models.CreateAgentRequest
	gatewayID, err := uuid.Parse(rawReq["gateway_id"].(string))
	if err != nil {
		http.Error(w, "invalid gateway_id format", http.StatusBadRequest)
		return
	}
	req.GatewayID = gatewayID

	if rawReq["name"] == nil || rawReq["name"] == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	req.Name = rawReq["name"].(string)

	if rawReq["model"] != nil {
		req.Model = rawReq["model"].(string)
	}
	if rawReq["agent_md"] != nil {
		req.AgentMD = rawReq["agent_md"].(string)
	}
	if rawReq["tool_md"] != nil {
		req.ToolMD = rawReq["tool_md"].(string)
	}

	created, err := h.ag.Create(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

func (h *Handler) StartAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.ag.Start(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	a, _ := h.ag.Get(id)
	json.NewEncoder(w).Encode(a)
}

func (h *Handler) StopAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.ag.Stop(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	a, _ := h.ag.Get(id)
	json.NewEncoder(w).Encode(a)
}

func (h *Handler) DeleteAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.ag.Delete(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) UpdateAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req models.UpdateAgentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	a, err := h.ag.Get(id)
	if err != nil {
		http.Error(w, "agent not found", http.StatusNotFound)
		return
	}

	if req.Name != "" {
		a.Name = req.Name
	}
	if req.Model != "" {
		a.Model = req.Model
	}
	if req.GatewayID != nil {
		a.GatewayID = req.GatewayID
	}

	if err := h.ag.Update(a); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(a)
}

func (h *Handler) GetAgentConfig(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	cfg, err := h.ag.GetConfig(id)
	if err != nil {
		http.Error(w, "config not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(cfg)
}

func (h *Handler) UpdateAgentConfig(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req models.UpdateAgentConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.ag.UpdateConfig(id, &req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cfg, _ := h.ag.GetConfig(id)
	json.NewEncoder(w).Encode(cfg)
}

func (h *Handler) GetAgentLogs(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	logs, err := h.ag.GetLogs(id, 100)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"logs": logs})
}

func (h *Handler) ListGateways(w http.ResponseWriter, r *http.Request) {
	gateways, err := h.db.ListGateways()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	type GatewayResponse struct {
		models.Gateway
		AvailableSlots int `json:"available_slots"`
		UsedSlots      int `json:"used_slots"`
	}

	result := make([]GatewayResponse, len(gateways))
	for i, g := range gateways {
		mg := h.gw.GetGateway(g.ID)
		if mg != nil {
			result[i] = GatewayResponse{
				Gateway:        g,
				AvailableSlots: mg.Limiter.AvailableSlots(),
				UsedSlots:      mg.Limiter.CurrentUsage(),
			}
		} else {
			result[i] = GatewayResponse{Gateway: g}
		}
	}

	json.NewEncoder(w).Encode(result)
}

func (h *Handler) GetGateway(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	g, err := h.db.GetGateway(id)
	if err != nil {
		http.Error(w, "gateway not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(g)
}

func (h *Handler) CreateGateway(w http.ResponseWriter, r *http.Request) {
	var req models.CreateGatewayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Endpoint == "" || req.Model == "" {
		http.Error(w, "name, endpoint and model are required", http.StatusBadRequest)
		return
	}

	if req.RateLimit <= 0 {
		req.RateLimit = 2
	}
	if req.TimeoutSec <= 0 {
		req.TimeoutSec = 60
	}

	g := &models.Gateway{
		Name:       req.Name,
		Provider:   req.Provider,
		Endpoint:   req.Endpoint,
		APIKey:     req.APIKey,
		Model:      req.Model,
		RateLimit:  req.RateLimit,
		TimeoutSec: req.TimeoutSec,
		IsActive:   true,
	}

	if err := h.db.CreateGateway(g); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.gw.RegisterGateway(g)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(g)
}

func (h *Handler) UpdateGateway(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req models.CreateGatewayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	g, err := h.db.GetGateway(id)
	if err != nil {
		http.Error(w, "gateway not found", http.StatusNotFound)
		return
	}

	g.Name = req.Name
	g.Provider = req.Provider
	g.Endpoint = req.Endpoint
	g.APIKey = req.APIKey
	g.Model = req.Model
	g.RateLimit = req.RateLimit
	g.TimeoutSec = req.TimeoutSec

	if err := h.db.UpdateGateway(g); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.gw.UnregisterGateway(id)
	h.gw.RegisterGateway(g)

	json.NewEncoder(w).Encode(g)
}

func (h *Handler) DeleteGateway(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.db.DeleteGateway(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.gw.UnregisterGateway(id)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Chat(w http.ResponseWriter, r *http.Request) {
	var req models.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	a, err := h.ag.Get(req.AgentID)
	if err != nil {
		http.Error(w, "agent not found", http.StatusNotFound)
		return
	}

	if a.GatewayID == nil {
		http.Error(w, "agent has no gateway configured", http.StatusBadRequest)
		return
	}

	model := req.Model
	if model == "" {
		model = a.Model
	}

	messages := []map[string]string{
		{"role": "user", "content": req.Message},
	}

	result, err := h.gw.Chat(r.Context(), *a.GatewayID, model, messages)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	h.db.CreateRequestLog(&models.RequestLog{
		AgentID:      req.AgentID,
		GatewayID:    *a.GatewayID,
		Model:        model,
		InputTokens:  result.InputTokens,
		OutputTokens: result.OutputTokens,
		LatencyMs:    result.LatencyMs,
		Status:       "success",
	})

	response := models.ChatResponse{
		Content:      result.Content,
		Done:         true,
		TotalTokens:  result.InputTokens + result.OutputTokens,
		InputTokens:  result.InputTokens,
		OutputTokens: result.OutputTokens,
	}

	json.NewEncoder(w).Encode(response)
}

func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid agent id", http.StatusBadRequest)
		return
	}

	var req models.CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Input == "" {
		http.Error(w, "input is required", http.StatusBadRequest)
		return
	}

	task := &models.Task{
		AgentID:  agentID,
		TaskType: models.TaskTypeChat,
		Input:    req.Input,
	}

	if req.TaskType != "" {
		task.TaskType = req.TaskType
	}

	if err := h.db.CreateTask(task); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(task)
}

func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid agent id", http.StatusBadRequest)
		return
	}

	tasks, err := h.db.ListTasksByAgent(agentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(tasks)
}

func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	taskID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid task id", http.StatusBadRequest)
		return
	}

	task, err := h.db.GetTask(taskID)
	if err != nil {
		http.Error(w, "task not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(task)
}

func (h *Handler) PollTasks(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid agent id", http.StatusBadRequest)
		return
	}

	limit := 5
	if l := r.URL.Query().Get("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
	}

	tasks, err := h.db.ClaimTasks(agentID, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(tasks)
}

func (h *Handler) CompleteTask(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	taskID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid task id", http.StatusBadRequest)
		return
	}

	var req struct {
		Output string `json:"output"`
		Error  string `json:"error"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	status := models.TaskStatusCompleted
	if req.Error != "" {
		status = models.TaskStatusFailed
	}

	if err := h.db.UpdateTaskStatus(taskID, status, req.Output, req.Error); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": string(status)})
}

func (h *Handler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	taskID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid task id", http.StatusBadRequest)
		return
	}

	if err := h.db.DeleteTask(taskID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ListModels(w http.ResponseWriter, r *http.Request) {
	gateways, err := h.db.ListGateways()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	type modelInfo struct {
		ID     string `json:"id"`
		Object string `json:"object"`
	}
	models := make([]modelInfo, 0)
	for _, g := range gateways {
		models = append(models, modelInfo{
			ID:     g.Model,
			Object: "model",
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"object": "list",
		"data":   models,
	})
}
