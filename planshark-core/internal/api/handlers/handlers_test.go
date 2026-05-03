package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/go-chi/chi/v5"
	"planshark-core/internal/db"
	"planshark-core/internal/gateway"
	"planshark-core/pkg/models"
)

func TestGatewayHandlers(t *testing.T) {
	// Setup DB
	dbPath := "test_handlers.db"
	database, err := db.New(dbPath)
	if err != nil {
		t.Fatalf("Failed to create test db: %v", err)
	}
	defer os.Remove(dbPath)

	gwManager := gateway.NewGatewayManager()

	h := New(database, nil, gwManager)

	r := chi.NewRouter()
	r.Post("/api/v1/gateways", h.CreateGateway)
	r.Get("/api/v1/gateways", h.ListGateways)

	// Test Create Gateway
	reqBody := models.CreateGatewayRequest{
		Name:     "Test GW",
		Provider: "openai",
		Endpoint: "http://test",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/gateways", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status created, got %d", w.Code)
	}

	// Test List Gateways
	req = httptest.NewRequest("GET", "/api/v1/gateways", nil)
	w = httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status OK, got %d", w.Code)
	}
}
