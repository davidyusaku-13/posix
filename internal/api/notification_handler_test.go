package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/davidyusaku-13/posix/internal/api"
	"github.com/davidyusaku-13/posix/internal/database"
	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/payment"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
	"github.com/davidyusaku-13/posix/internal/service"
)

type mockNotifierTransport struct {
	sent   []string
	status *domain.WhatsAppStatus
}

func (m *mockNotifierTransport) SendMessage(ctx context.Context, recipientPhone, message string) error {
	m.sent = append(m.sent, recipientPhone)
	return nil
}

func (m *mockNotifierTransport) GetStatus(ctx context.Context) (*domain.WhatsAppStatus, error) {
	if m.status != nil {
		return m.status, nil
	}
	return &domain.WhatsAppStatus{
		Status: "qr_ready",
		QRCode: "mock_qr_data",
	}, nil
}

func (m *mockNotifierTransport) Disconnect(ctx context.Context) error {
	return nil
}

func setupNotificationTestRouter(t *testing.T) (http.Handler, *mockNotifierTransport) {
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}

	productRepo := sqlite.NewProductRepository(db)
	orderRepo := sqlite.NewOrderRepository(db)
	userRepo := sqlite.NewUserRepository(db)
	notifRepo := sqlite.NewNotificationRepository(db)
	transactor := sqlite.NewTransactor(db)

	reg := payment.NewRegistry()
	reg.Register(domain.PaymentMethodCash, payment.NewCashProcessor())
	reg.Register(domain.PaymentMethodCard, payment.NewCardProcessor())

	transport := &mockNotifierTransport{}
	notifSvc := service.NewNotificationService(notifRepo, transport)

	productSvc := service.NewProductService(productRepo, service.WithProductNotificationService(notifSvc))
	orderSvc := service.NewOrderService(orderRepo, productRepo, transactor, reg, service.WithOrderNotificationService(notifSvc))
	authSvc := service.NewAuthService(userRepo)
	userSvc := service.NewUserService(userRepo)

	router := api.NewRouter(productSvc, orderSvc, authSvc, userSvc, notifSvc, nil)
	return router, transport
}

func TestREST_NotificationEndpoints(t *testing.T) {
	router, _ := setupNotificationTestRouter(t)

	t.Run("GET /api/v1/notifications/config returns 200 with default config", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications/config", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var cfg domain.NotificationConfig
		if err := json.Unmarshal(rec.Body.Bytes(), &cfg); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if cfg.Enabled {
			t.Errorf("expected default enabled to be false")
		}
	})

	t.Run("PUT /api/v1/notifications/config with invalid phone returns 422", func(t *testing.T) {
		payload := `{"ownerPhone":"abc"}`
		req := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/config", bytes.NewBufferString(payload))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnprocessableEntity {
			t.Fatalf("expected 422, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("PUT /api/v1/notifications/config updates settings", func(t *testing.T) {
		payload := `{"ownerPhone":"+14155552671","enabled":true,"notifyLowStock":true}`
		req := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/config", bytes.NewBufferString(payload))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var cfg domain.NotificationConfig
		if err := json.Unmarshal(rec.Body.Bytes(), &cfg); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if !cfg.Enabled || cfg.OwnerPhone != "14155552671" {
			t.Errorf("unexpected updated config: %+v", cfg)
		}
	})

	t.Run("GET /api/v1/notifications/status returns WhatsApp status and QR", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications/status", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var status domain.WhatsAppStatus
		if err := json.Unmarshal(rec.Body.Bytes(), &status); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if status.Status != "qr_ready" || status.QRCode != "mock_qr_data" {
			t.Errorf("unexpected status response: %+v", status)
		}
	})

	t.Run("POST /api/v1/notifications/test sends test notification", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/notifications/test", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("POST /api/v1/notifications/test with explicit phone dispatches directly", func(t *testing.T) {
		payload := `{"phone":"+6281234567890"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/notifications/test", bytes.NewBufferString(payload))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("GET /api/v1/notifications/logs returns list of audit events", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications/logs", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var logs []domain.NotificationLog
		if err := json.Unmarshal(rec.Body.Bytes(), &logs); err != nil {
			t.Fatalf("failed to decode logs: %v", err)
		}
		if len(logs) == 0 {
			t.Errorf("expected at least 1 log entry, got 0")
		} else {
			if logs[0].CreatedAt.IsZero() {
				t.Errorf("expected non-zero CreatedAt in API response, got %v", logs[0].CreatedAt)
			}
			if logs[0].CreatedAt.Year() <= 1 {
				t.Errorf("expected valid year in API response CreatedAt, got %d", logs[0].CreatedAt.Year())
			}
		}
	})

	t.Run("POST /api/v1/notifications/disconnect returns 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/notifications/disconnect", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})
}
