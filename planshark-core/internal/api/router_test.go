package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSMiddleware(t *testing.T) {
	allowedOrigins := []string{"http://localhost:3000"}
	middleware := corsMiddleware(allowedOrigins)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Case 1: Malicious origin
	req := httptest.NewRequest("GET", "http://example.com/api/v1/agents", nil)
	req.Header.Set("Origin", "http://malicious.com")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	origin := w.Header().Get("Access-Control-Allow-Origin")
	if origin != "" {
		t.Errorf("Access-Control-Allow-Origin should be empty for unauthorized origin, got %s", origin)
	}

	// Case 2: Allowed origin
	req = httptest.NewRequest("GET", "http://example.com/api/v1/agents", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w = httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	origin = w.Header().Get("Access-Control-Allow-Origin")
	if origin != "http://localhost:3000" {
		t.Errorf("Access-Control-Allow-Origin expected http://localhost:3000, got %s", origin)
	}
}
