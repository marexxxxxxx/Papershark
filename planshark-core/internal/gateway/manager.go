package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"planshark-core/pkg/models"
)

type RateLimiter struct {
	maxConcurrent int
	sem           chan struct{}
	mu            sync.Mutex
	waiting       int
}

func NewRateLimiter(max int) *RateLimiter {
	return &RateLimiter{
		maxConcurrent: max,
		sem:           make(chan struct{}, max),
	}
}

func (rl *RateLimiter) Acquire(timeout time.Duration) error {
	rl.mu.Lock()
	if len(rl.sem) < rl.maxConcurrent {
		rl.mu.Unlock()
		rl.sem <- struct{}{}
		return nil
	}
	rl.waiting++
	rl.mu.Unlock()

	select {
	case rl.sem <- struct{}{}:
		rl.mu.Lock()
		rl.waiting--
		rl.mu.Unlock()
		return nil
	case <-time.After(timeout):
		rl.mu.Lock()
		rl.waiting--
		rl.mu.Unlock()
		return fmt.Errorf("rate limit timeout")
	}
}

func (rl *RateLimiter) Release() {
	<-rl.sem
}

func (rl *RateLimiter) CurrentUsage() int {
	return len(rl.sem)
}

func (rl *RateLimiter) AvailableSlots() int {
	return rl.maxConcurrent - len(rl.sem)
}

type GatewayManager struct {
	gateways     map[uuid.UUID]*ManagedGateway
	rateLimiters map[uuid.UUID]*RateLimiter
	mu           sync.RWMutex
	httpClient   *http.Client
}

type ManagedGateway struct {
	Gateway *models.Gateway
	Limiter *RateLimiter
}

func NewGatewayManager() *GatewayManager {
	return &GatewayManager{
		gateways:     make(map[uuid.UUID]*ManagedGateway),
		rateLimiters: make(map[uuid.UUID]*RateLimiter),
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (gm *GatewayManager) RegisterGateway(g *models.Gateway) {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	gm.gateways[g.ID] = &ManagedGateway{
		Gateway: g,
		Limiter: NewRateLimiter(g.RateLimit),
	}
	gm.rateLimiters[g.ID] = gm.gateways[g.ID].Limiter
}

func (gm *GatewayManager) UnregisterGateway(id uuid.UUID) {
	gm.mu.Lock()
	defer gm.mu.Unlock()
	delete(gm.gateways, id)
	delete(gm.rateLimiters, id)
}

func (gm *GatewayManager) GetGateway(id uuid.UUID) *ManagedGateway {
	gm.mu.RLock()
	defer gm.mu.RUnlock()
	return gm.gateways[id]
}

func (gm *GatewayManager) ListGateways() []*ManagedGateway {
	gm.mu.RLock()
	defer gm.mu.RUnlock()
	result := make([]*ManagedGateway, 0, len(gm.gateways))
	for _, g := range gm.gateways {
		result = append(result, g)
	}
	return result
}

func (gm *GatewayManager) Chat(ctx context.Context, gatewayID uuid.UUID, model string, messages []map[string]string) (*ChatResult, error) {
	gm.mu.RLock()
	mg, ok := gm.gateways[gatewayID]
	gm.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("gateway not found")
	}

	timeout := time.Duration(mg.Gateway.TimeoutSec) * time.Second
	if err := mg.Limiter.Acquire(timeout); err != nil {
		return nil, fmt.Errorf("rate limited: %w", err)
	}
	defer mg.Limiter.Release()

	start := time.Now()
	result, err := gm.doChat(ctx, mg.Gateway, model, messages)
	if err != nil {
		return result, err
	}

	result.LatencyMs = int(time.Since(start).Milliseconds())
	return result, nil
}

func (gm *GatewayManager) doChat(ctx context.Context, gateway *models.Gateway, model string, messages []map[string]string) (*ChatResult, error) {
	var reqBody interface{}
	var reqBodyBytes []byte
	var err error

	switch gateway.Provider {
	case models.ProviderOllama:
		reqBody = OllamaRequest{
			Model:    model,
			Messages: messages,
			Stream:   false,
		}
		reqBodyBytes, err = json.Marshal(reqBody)
	case models.ProviderLlamaCpp:
		reqBody = LlamaCppRequest{
			Prompt: messages[len(messages)-1]["content"],
			Model:  model,
			Stream: false,
		}
		reqBodyBytes, err = json.Marshal(reqBody)
	case models.ProviderOpenAI, models.ProviderMistral, models.ProviderCohere, models.ProviderOllamaCloud, models.ProviderMammut:
		reqBody = OpenAIRequest{
			Model:    model,
			Messages: messages,
			Stream:   false,
		}
		reqBodyBytes, err = json.Marshal(reqBody)
	case models.ProviderAnthropic:
		systemPrompt := ""
		var anthropicMessages []AnthropicMessage
		for _, m := range messages {
			if m["role"] == "system" {
				systemPrompt = m["content"]
			} else {
				anthropicMessages = append(anthropicMessages, AnthropicMessage{
					Role:    m["role"],
					Content: m["content"],
				})
			}
		}
		reqBody = AnthropicRequest{
			Model:     model,
			Messages:  anthropicMessages,
			MaxTokens: 4096,
			System:    systemPrompt,
		}
		reqBodyBytes, err = json.Marshal(reqBody)
	case models.ProviderGemini:
		reqBody = GeminiRequest{
			Contents: buildGeminiContents(messages),
		}
		reqBodyBytes, err = json.Marshal(reqBody)
	case models.ProviderAzure:
		reqBody = OpenAIRequest{
			Model:    model,
			Messages: messages,
			Stream:   false,
		}
		reqBodyBytes, err = json.Marshal(reqBody)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", gateway.Provider)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	endpoint := gateway.Endpoint
	switch gateway.Provider {
	case models.ProviderOllama:
		endpoint += "/api/chat"
	case models.ProviderLlamaCpp:
		endpoint += "/completion"
	case models.ProviderOpenAI, models.ProviderMistral, models.ProviderCohere, models.ProviderOllamaCloud, models.ProviderMammut:
		endpoint += "/chat/completions"
	case models.ProviderAnthropic:
		endpoint += "/v1/messages"
	case models.ProviderGemini:
		endpoint += "/v1beta/models/" + model + ":generateContent"
	case models.ProviderAzure:
		endpoint += "/openai/deployments/" + model + "/chat/completions?api-version=2024-02-01"
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(reqBodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	switch gateway.Provider {
	case models.ProviderAnthropic:
		req.Header.Set("x-api-key", gateway.APIKey)
		req.Header.Set("anthropic-version", "2023-06-01")
	case models.ProviderGemini:
		req.Header.Set("x-goog-api-key", gateway.APIKey)
	case models.ProviderAzure:
		req.Header.Set("api-key", gateway.APIKey)
	default:
		if gateway.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+gateway.APIKey)
		}
	}

	resp, err := gm.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	switch gateway.Provider {
	case models.ProviderOllama:
		var ollamaResp OllamaResponse
		if err := json.Unmarshal(body, &ollamaResp); err != nil {
			return nil, fmt.Errorf("failed to parse ollama response: %w", err)
		}
		return &ChatResult{
			Content:      ollamaResp.Message.Content,
			InputTokens:  ollamaResp.PromptEvalCount,
			OutputTokens: ollamaResp.EvalCount,
		}, nil

	case models.ProviderLlamaCpp:
		var llamaResp LlamaCppResponse
		if err := json.Unmarshal(body, &llamaResp); err != nil {
			return nil, fmt.Errorf("failed to parse llamacpp response: %w", err)
		}
		return &ChatResult{
			Content:      llamaResp.Content,
			InputTokens:  0,
			OutputTokens: llamaResp.TokenCount,
		}, nil

	case models.ProviderOpenAI, models.ProviderMistral, models.ProviderCohere, models.ProviderOllamaCloud, models.ProviderMammut, models.ProviderAzure:
		var openaiResp OpenAIResponse
		if err := json.Unmarshal(body, &openaiResp); err != nil {
			return nil, fmt.Errorf("failed to parse openai response: %w", err)
		}
		if len(openaiResp.Choices) > 0 {
			return &ChatResult{
				Content:      openaiResp.Choices[0].Message.Content,
				InputTokens:  openaiResp.Usage.PromptTokens,
				OutputTokens: openaiResp.Usage.CompletionTokens,
			}, nil
		}

	case models.ProviderAnthropic:
		var anthropicResp AnthropicResponse
		if err := json.Unmarshal(body, &anthropicResp); err != nil {
			return nil, fmt.Errorf("failed to parse anthropic response: %w", err)
		}
		if len(anthropicResp.Content) > 0 {
			return &ChatResult{
				Content:      anthropicResp.Content[0].Text,
				InputTokens:  anthropicResp.Usage.InputTokens,
				OutputTokens: anthropicResp.Usage.OutputTokens,
			}, nil
		}

	case models.ProviderGemini:
		var geminiResp GeminiResponse
		if err := json.Unmarshal(body, &geminiResp); err != nil {
			return nil, fmt.Errorf("failed to parse gemini response: %w", err)
		}
		if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
			return &ChatResult{
				Content:      geminiResp.Candidates[0].Content.Parts[0].Text,
				InputTokens:  geminiResp.UsageMetadata.PromptTokenCount,
				OutputTokens: geminiResp.UsageMetadata.CandidatesTokenCount,
			}, nil
		}
	}

	return nil, fmt.Errorf("unexpected response format")
}

type ChatResult struct {
	Content      string
	InputTokens  int
	OutputTokens int
	LatencyMs    int
}

type OllamaRequest struct {
	Model    string              `json:"model"`
	Messages []map[string]string `json:"messages"`
	Stream   bool                `json:"stream"`
}

type OllamaResponse struct {
	Model   string `json:"model"`
	Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"message"`
	PromptEvalCount int  `json:"prompt_eval_count"`
	EvalCount       int  `json:"eval_count"`
	Done            bool `json:"done"`
}

type LlamaCppRequest struct {
	Prompt string `json:"prompt"`
	Model  string `json:"model"`
	Stream bool   `json:"stream"`
}

type LlamaCppResponse struct {
	Content         string `json:"content"`
	Stop            bool   `json:"stop"`
	TokenCount      int    `json:"token_count"`
	PromptEvalCount int    `json:"prompt_eval_count,omitempty"`
}

type OpenAIRequest struct {
	Model    string              `json:"model"`
	Messages []map[string]string `json:"messages"`
	Stream   bool                `json:"stream"`
}

type OpenAIResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int    `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

type AnthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AnthropicRequest struct {
	Model       string             `json:"model"`
	Messages    []AnthropicMessage `json:"messages"`
	MaxTokens   int                `json:"max_tokens"`
	System      string             `json:"system,omitempty"`
	Temperature float64            `json:"temperature,omitempty"`
}

type AnthropicResponse struct {
	Type    string `json:"type"`
	ID      string `json:"id"`
	Role    string `json:"role"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	StopReason   string `json:"stop_reason"`
	StopSequence string `json:"stop_sequence,omitempty"`
	Usage        struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

type GeminiContent struct {
	Role  string `json:"role"`
	Parts []struct {
		Text string `json:"text"`
	} `json:"parts"`
}

type GeminiRequest struct {
	Contents          []GeminiContent `json:"contents"`
	SystemInstruction *struct {
		Parts []struct {
			Text string `json:"text"`
		} `json:"parts"`
	} `json:"systemInstruction,omitempty"`
	GenerationConfig *struct {
		Temperature     float64 `json:"temperature,omitempty"`
		TopP            float64 `json:"topP,omitempty"`
		TopK            int     `json:"topK,omitempty"`
		MaxOutputTokens int     `json:"maxOutputTokens,omitempty"`
	} `json:"generationConfig,omitempty"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Role  string `json:"role"`
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	UsageMetadata struct {
		PromptTokenCount     int `json:"promptTokenCount"`
		CandidatesTokenCount int `json:"candidatesTokenCount"`
		TotalTokenCount      int `json:"totalTokenCount"`
	} `json:"usageMetadata"`
}

func buildGeminiContents(messages []map[string]string) []GeminiContent {
	var contents []GeminiContent
	var systemText string

	for _, m := range messages {
		role := m["role"]
		if role == "system" {
			systemText = m["content"]
			continue
		}
		if role == "user" {
			role = "user"
		} else if role == "assistant" {
			role = "model"
		}
		contents = append(contents, GeminiContent{
			Role: role,
			Parts: []struct {
				Text string `json:"text"`
			}{{Text: m["content"]}},
		})
	}

	if systemText != "" && len(contents) > 0 {
		contents[0].Role = "model"
		req := GeminiRequest{
			Contents: contents,
		}
		req.SystemInstruction = &struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		}{
			Parts: []struct {
				Text string `json:"text"`
			}{{Text: systemText}},
		}
	}

	return contents
}

type WsConn struct {
	conn *websocket.Conn
}
