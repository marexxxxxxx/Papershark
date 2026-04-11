package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"planshark-core/internal/api/handlers"
)

func NewRouter(h *handlers.Handler) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	r.Get("/health", h.Health)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/stats", h.GetStats)

		r.Get("/agents", h.ListAgents)
		r.Post("/agents", h.CreateAgent)
		r.Get("/agents/{id}", h.GetAgent)
		r.Put("/agents/{id}", h.UpdateAgent)
		r.Delete("/agents/{id}", h.DeleteAgent)
		r.Post("/agents/{id}/start", h.StartAgent)
		r.Post("/agents/{id}/stop", h.StopAgent)
		r.Get("/agents/{id}/config", h.GetAgentConfig)
		r.Put("/agents/{id}/config", h.UpdateAgentConfig)
		r.Get("/agents/{id}/logs", h.GetAgentLogs)

		r.Get("/agents/{id}/tasks", h.ListTasks)
		r.Post("/agents/{id}/tasks", h.CreateTask)
		r.Get("/agents/{id}/tasks/poll", h.PollTasks)
		r.Get("/tasks/{id}", h.GetTask)
		r.Post("/tasks/{id}/complete", h.CompleteTask)
		r.Delete("/tasks/{id}", h.DeleteTask)

		r.Get("/gateways", h.ListGateways)
		r.Post("/gateways", h.CreateGateway)
		r.Get("/gateways/{id}", h.GetGateway)
		r.Put("/gateways/{id}", h.UpdateGateway)
		r.Delete("/gateways/{id}", h.DeleteGateway)

		r.Post("/chat", h.Chat)
	})

	r.Route("/v1", func(r chi.Router) {
		r.Post("/chat/completions", h.Chat)
		r.Get("/models", h.ListModels)
	})

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
