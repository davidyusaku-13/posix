package sqlite_test

import (
	"context"
	"testing"
	"time"

	"github.com/davidyusaku-13/posix/internal/database"
	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
)

func TestNotificationRepository(t *testing.T) {
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to init in-memory db: %v", err)
	}
	defer db.Close()

	repo := sqlite.NewNotificationRepository(db)
	ctx := context.Background()

	t.Run("GetConfig returns default settings", func(t *testing.T) {
		cfg, err := repo.GetConfig(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if cfg == nil {
			t.Fatal("expected config, got nil")
		}
		if cfg.Enabled {
			t.Errorf("expected default enabled to be false, got true")
		}
		if !cfg.NotifyLowStock {
			t.Errorf("expected default notifyLowStock to be true, got false")
		}
		if cfg.CooldownMinutes != 60 {
			t.Errorf("expected default cooldown to be 60, got %d", cfg.CooldownMinutes)
		}
	})

	t.Run("UpdateConfig modifies settings correctly", func(t *testing.T) {
		phone := "+14155552671"
		enabled := true
		cooldown := 30
		updated, err := repo.UpdateConfig(ctx, domain.UpdateNotificationConfigInput{
			OwnerPhone:      &phone,
			Enabled:         &enabled,
			CooldownMinutes: &cooldown,
		})
		if err != nil {
			t.Fatalf("failed to update config: %v", err)
		}
		if updated.OwnerPhone != phone {
			t.Errorf("expected phone %s, got %s", phone, updated.OwnerPhone)
		}
		if !updated.Enabled {
			t.Errorf("expected enabled to be true")
		}
		if updated.CooldownMinutes != 30 {
			t.Errorf("expected cooldown 30, got %d", updated.CooldownMinutes)
		}

		// Re-fetch to ensure persistence
		fetched, err := repo.GetConfig(ctx)
		if err != nil {
			t.Fatalf("failed to re-fetch config: %v", err)
		}
		if fetched.OwnerPhone != phone || !fetched.Enabled || fetched.CooldownMinutes != 30 {
			t.Errorf("persisted config mismatch: %+v", fetched)
		}
	})

	t.Run("LogNotification and ListLogs", func(t *testing.T) {
		logEntry := &domain.NotificationLog{
			Channel:      "whatsapp",
			Recipient:    "+14155552671",
			EventType:    "low_stock",
			Payload:      "Low stock alert for Espresso Beans",
			Status:       "sent",
			ErrorMessage: "",
		}

		err := repo.LogNotification(ctx, logEntry, 101)
		if err != nil {
			t.Fatalf("failed to log notification: %v", err)
		}

		logs, err := repo.ListLogs(ctx, 10)
		if err != nil {
			t.Fatalf("failed to list logs: %v", err)
		}
		if len(logs) == 0 {
			t.Fatal("expected at least 1 log entry, got 0")
		}
		if logs[0].Recipient != "+14155552671" {
			t.Errorf("expected recipient +14155552671, got %s", logs[0].Recipient)
		}
		if logs[0].Status != "sent" {
			t.Errorf("expected status 'sent', got %s", logs[0].Status)
		}
		if logs[0].CreatedAt.IsZero() {
			t.Errorf("expected non-zero CreatedAt for log, got %v", logs[0].CreatedAt)
		}
		if logs[0].CreatedAt.Year() <= 1 {
			t.Errorf("expected valid year for log CreatedAt, got %v", logs[0].CreatedAt.Year())
		}

		lastSent, err := repo.GetLastSentAt(ctx, "low_stock", 101)
		if err != nil {
			t.Fatalf("failed to get last sent time: %v", err)
		}
		if lastSent == nil {
			t.Fatal("expected lastSent time, got nil")
		}
		if time.Since(*lastSent) > 5*time.Second {
			t.Errorf("expected recent lastSent time, got %v", *lastSent)
		}
	})
}
