package gateway

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"planshark-core/pkg/models"
)

func TestGatewayManager(t *testing.T) {
	gm := NewGatewayManager()

	g := &models.Gateway{
		ID:         uuid.New(),
		Name:       "Test",
		Provider:   "openai",
		RateLimit:  2,
		TimeoutSec: 10,
	}

	gm.RegisterGateway(g)

	mg := gm.GetGateway(g.ID)
	if mg == nil {
		t.Fatalf("Expected gateway to be registered")
	}

	gm.UnregisterGateway(g.ID)

	if gm.GetGateway(g.ID) != nil {
		t.Fatalf("Expected gateway to be unregistered")
	}
}

func TestRateLimiter(t *testing.T) {
	rl := NewRateLimiter(2)

	if rl.AvailableSlots() != 2 {
		t.Errorf("Expected 2 available slots, got %d", rl.AvailableSlots())
	}

	err := rl.Acquire(1 * time.Second)
	if err != nil {
		t.Fatalf("Failed to acquire slot: %v", err)
	}

	if rl.CurrentUsage() != 1 {
		t.Errorf("Expected 1 usage, got %d", rl.CurrentUsage())
	}

	rl.Release()

	if rl.AvailableSlots() != 2 {
		t.Errorf("Expected 2 available slots after release, got %d", rl.AvailableSlots())
	}
}
