package notification_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/davidyusaku-13/posix/internal/notification"
)

func TestBaileysClient(t *testing.T) {
	var lastSentPhone string
	var lastSentMsg string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "connected",
				"connectedPhone": "14155552671",
			})
		case "/send":
			var req struct {
				Phone   string `json:"phone"`
				Message string `json:"message"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			lastSentPhone = req.Phone
			lastSentMsg = req.Message
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "delivered"})
		case "/disconnect":
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := notification.NewBaileysClient(server.URL)
	ctx := context.Background()

	t.Run("GetStatus returns connected", func(t *testing.T) {
		status, err := client.GetStatus(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if status.Status != "connected" {
			t.Errorf("expected connected, got %s", status.Status)
		}
		if status.ConnectedPhone != "14155552671" {
			t.Errorf("expected phone 14155552671, got %s", status.ConnectedPhone)
		}
	})

	t.Run("SendMessage dispatches payload to bridge", func(t *testing.T) {
		err := client.SendMessage(ctx, "14155552671", "Low stock alert")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if lastSentPhone != "14155552671" || lastSentMsg != "Low stock alert" {
			t.Errorf("unexpected sent message data: phone=%s, msg=%s", lastSentPhone, lastSentMsg)
		}
	})

	t.Run("Disconnect sends post to bridge", func(t *testing.T) {
		if err := client.Disconnect(ctx); err != nil {
			t.Errorf("unexpected disconnect error: %v", err)
		}
	})

	t.Run("Offline bridge returns graceful disconnected status", func(t *testing.T) {
		offlineClient := notification.NewBaileysClient("http://127.0.0.1:54321")
		status, err := offlineClient.GetStatus(ctx)
		if err != nil {
			t.Fatalf("expected nil error on offline bridge, got %v", err)
		}
		if status.Status != "disconnected" {
			t.Errorf("expected disconnected status, got %s", status.Status)
		}
	})
}
