package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"planshark-core/internal/agent"
	"planshark-core/internal/api"
	"planshark-core/internal/api/handlers"
	"planshark-core/internal/db"
	"planshark-core/internal/docker"
	"planshark-core/internal/gateway"
)

func main() {
	dataDir := flag.String("data", "./data", "data directory")
	addr := flag.String("addr", ":8080", "server address")
	allowedOriginsFlag := flag.String("allowed-origins", "http://localhost:3000", "comma-separated list of allowed origins for CORS")
	flag.Parse()

	allowedOrigins := strings.Split(*allowedOriginsFlag, ",")

	dbPath := fmt.Sprintf("%s/planshark.db", *dataDir)
	dockerBaseDir := fmt.Sprintf("%s/docker", *dataDir)

	if err := os.MkdirAll(*dataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	database, err := db.New(dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer database.Close()
	log.Println("Database initialized")

	dockerClient, err := docker.NewClient(dockerBaseDir)
	if err != nil {
		log.Printf("Warning: Docker client initialization failed: %v", err)
	} else if dockerClient.IsDockerAvailable() {
		log.Println("Docker client connected")
	} else {
		log.Println("Warning: Docker daemon not available")
	}

	gwManager := gateway.NewGatewayManager()

	gateways, err := database.ListGateways()
	if err == nil {
		for _, g := range gateways {
			if g.IsActive {
				gwManager.RegisterGateway(&g)
				log.Printf("Registered gateway: %s (%s)", g.Name, g.Provider)
			}
		}
	}

	agentManager := agent.NewManager(database, dockerClient)

	h := handlers.New(database, agentManager, gwManager)
	router := api.NewRouter(h, allowedOrigins)

	log.Printf("Planshark starting on %s", *addr)
	log.Printf("Data directory: %s", *dataDir)

	if err := http.ListenAndServe(*addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
