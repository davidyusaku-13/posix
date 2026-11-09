package service_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/davidyusaku-13/posix/internal/database"
	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
	"github.com/davidyusaku-13/posix/internal/service"
)

// mockNotifier captures sent messages for assertions.
type mockNotifier struct {
	mu           sync.Mutex
	sentMessages []struct {
		phone   string
		message string
	}
	sendErr error
	status  *domain.WhatsAppStatus
}

func (m *mockNotifier) SendMessage(ctx context.Context, recipientPhone, message string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.sendErr != nil {
		return m.sendErr
	}
	m.sentMessages = append(m.sentMessages, struct {
		phone   string
		message string
	}{recipientPhone, message})
	return nil
}

func (m *mockNotifier) GetStatus(ctx context.Context) (*domain.WhatsAppStatus, error) {
	if m.status != nil {
		return m.status, nil
	}
	return &domain.WhatsAppStatus{Status: "connected"}, nil
}

func (m *mockNotifier) Disconnect(ctx context.Context) error {
	return nil
}

func TestNotificationService_LowStockAlerts(t *testing.T) {
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	defer db.Close()

	repo := sqlite.NewNotificationRepository(db)
	mock := &mockNotifier{}
	svc := service.NewNotificationService(repo, mock)
	ctx := context.Background()

	// 1. Initially disabled: should not send any alerts
	p := domain.Product{
		ID:            10,
		SKU:           "TEST-01",
		Name:          "Test Coffee",
		StockQuantity: 3,
		MinStockAlert: 5,
	}
	err = svc.CheckAndNotifyLowStock(ctx, p, 6, 3, "order_checkout")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	time.Sleep(30 * time.Millisecond)
	if len(mock.sentMessages) != 0 {
		t.Fatalf("expected 0 messages when disabled, got %d", len(mock.sentMessages))
	}

	// 2. Enable notifications with phone number
	phone := "+14155552671"
	enabled := true
	cooldown := 60
	_, err = svc.UpdateConfig(ctx, domain.UpdateNotificationConfigInput{
		OwnerPhone:      &phone,
		Enabled:         &enabled,
		CooldownMinutes: &cooldown,
	})
	if err != nil {
		t.Fatalf("failed to update config: %v", err)
	}

	// 3. Stock drops from 6 -> 3 (crosses threshold of 5): should send alert
	err = svc.CheckAndNotifyLowStock(ctx, p, 6, 3, "order_checkout")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	time.Sleep(30 * time.Millisecond)
	if len(mock.sentMessages) != 1 {
		t.Fatalf("expected 1 sent message, got %d", len(mock.sentMessages))
	}
	if mock.sentMessages[0].phone != "14155552671" {
		t.Errorf("expected normalized recipient 14155552671, got %s", mock.sentMessages[0].phone)
	}

	// 4. Duplicate alert within cooldown window (drops from 3 -> 2): should be suppressed
	err = svc.CheckAndNotifyLowStock(ctx, p, 3, 2, "order_checkout")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	time.Sleep(30 * time.Millisecond)
	if len(mock.sentMessages) != 1 {
		t.Errorf("expected cooldown suppression (still 1 sent message), got %d", len(mock.sentMessages))
	}

	// 5. Send test notification
	err = svc.SendTestNotification(ctx)
	if err != nil {
		t.Fatalf("failed to send test notification: %v", err)
	}
	if len(mock.sentMessages) != 2 {
		t.Fatalf("expected 2 total sent messages, got %d", len(mock.sentMessages))
	}

	// 6. Check logs
	logs, err := svc.ListLogs(ctx, 10)
	if err != nil {
		t.Fatalf("failed to list logs: %v", err)
	}
	if len(logs) < 2 {
		t.Errorf("expected at least 2 logged events, got %d", len(logs))
	}
}

func TestNotificationService_DeliveryFailureDoesNotThrow(t *testing.T) {
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	defer db.Close()

	repo := sqlite.NewNotificationRepository(db)
	mock := &mockNotifier{
		sendErr: errors.New("whatsapp socket offline"),
	}
	svc := service.NewNotificationService(repo, mock)
	ctx := context.Background()

	phone := "+14155552671"
	enabled := true
	_, _ = svc.UpdateConfig(ctx, domain.UpdateNotificationConfigInput{
		OwnerPhone: &phone,
		Enabled:    &enabled,
	})

	p := domain.Product{
		ID:            20,
		SKU:           "TEST-02",
		Name:          "Tea",
		StockQuantity: 1,
		MinStockAlert: 5,
	}

	// Low stock dispatch fails gracefully without returning an error that breaks checkout
	err = svc.CheckAndNotifyLowStock(ctx, p, 6, 1, "order_checkout")
	if err != nil {
		t.Fatalf("expected fault isolation (nil error), got %v", err)
	}
	time.Sleep(30 * time.Millisecond)

	// But it should be recorded in audit logs as failed
	logs, err := svc.ListLogs(ctx, 5)
	if err != nil {
		t.Fatalf("failed to get logs: %v", err)
	}
	if len(logs) == 0 || logs[0].Status != "failed" {
		t.Errorf("expected log with status 'failed', got %+v", logs)
	}
}
