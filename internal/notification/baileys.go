package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/davidyusaku-13/posix/internal/domain"
)

type BaileysClient struct {
	bridgeURL  string
	httpClient *http.Client
}

var _ Notifier = (*BaileysClient)(nil)

func NewBaileysClient(bridgeURL string) *BaileysClient {
	if bridgeURL == "" {
		bridgeURL = "http://127.0.0.1:8081"
	}
	bridgeURL = strings.TrimRight(bridgeURL, "/")

	return &BaileysClient{
		bridgeURL: bridgeURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type bridgeSendRequest struct {
	Phone   string `json:"phone"`
	Message string `json:"message"`
}

type bridgeStatusResponse struct {
	Status         string `json:"status"`
	QRCode         string `json:"qrCode,omitempty"`
	ConnectedPhone string `json:"connectedPhone,omitempty"`
	Error          string `json:"error,omitempty"`
}

func (c *BaileysClient) SendMessage(ctx context.Context, recipientPhone, message string) error {
	payload, err := json.Marshal(bridgeSendRequest{
		Phone:   recipientPhone,
		Message: message,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.bridgeURL+"/send", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("whatsapp bridge unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errResp struct {
			Error string `json:"error"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		if errResp.Error != "" {
			return fmt.Errorf("bridge error (%d): %s", resp.StatusCode, errResp.Error)
		}
		return fmt.Errorf("bridge returned status %d", resp.StatusCode)
	}

	return nil
}

func (c *BaileysClient) GetStatus(ctx context.Context) (*domain.WhatsAppStatus, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.bridgeURL+"/status", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &domain.WhatsAppStatus{
			Status:    "disconnected",
			Error:     "bridge offline or unreachable",
			UpdatedAt: time.Now(),
		}, nil
	}
	defer resp.Body.Close()

	var bridgeResp bridgeStatusResponse
	if err := json.NewDecoder(resp.Body).Decode(&bridgeResp); err != nil {
		return nil, fmt.Errorf("failed to decode bridge status: %w", err)
	}

	return &domain.WhatsAppStatus{
		Status:         bridgeResp.Status,
		QRCode:         bridgeResp.QRCode,
		ConnectedPhone: bridgeResp.ConnectedPhone,
		Error:          bridgeResp.Error,
		UpdatedAt:      time.Now(),
	}, nil
}

func (c *BaileysClient) Disconnect(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.bridgeURL+"/disconnect", nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil // Bridge not running anyway
	}
	defer resp.Body.Close()

	return nil
}
