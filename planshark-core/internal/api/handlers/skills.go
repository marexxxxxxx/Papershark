package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"planshark-core/pkg/models"
)

func (h *Handler) GetAgentSkills(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid agent id", http.StatusBadRequest)
		return
	}

	skills, err := h.db.GetAgentSkills(agentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if skills == nil {
		skills = []models.AgentSkill{}
	}

	json.NewEncoder(w).Encode(skills)
}

func (h *Handler) SetAgentSkill(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid agent id", http.StatusBadRequest)
		return
	}

	skillName := chi.URLParam(r, "skillName")
	if skillName == "" {
		http.Error(w, "skill name is required", http.StatusBadRequest)
		return
	}

	var req models.SetSkillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.db.SetAgentSkill(agentID, skillName, req.IsEnabled); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "is_enabled": req.IsEnabled})
}
