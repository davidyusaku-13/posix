package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/notification"
	"github.com/davidyusaku-13/posix/internal/repository"
)

// NotificationService orchestrates notification business logic and anti-flood deduplication.
type NotificationService struct {
	repo     repository.NotificationRepository
	notifier notification.Notifier
}

func NewNotificationService(repo repository.NotificationRepository, notifier notification.Notifier) *NotificationService {
	return &NotificationService{
		repo:     repo,
		notifier: notifier,
	}
}

// GetConfig returns the current store notification configuration.
func (s *NotificationService) GetConfig(ctx context.Context) (*domain.NotificationConfig, error) {
	return s.repo.GetConfig(ctx)
}

// UpdateConfig validates the payload and updates store notification configuration.
func (s *NotificationService) UpdateConfig(ctx context.Context, input domain.UpdateNotificationConfigInput) (*domain.NotificationConfig, error) {
	if input.OwnerPhone != nil && *input.OwnerPhone != "" {
		if err := domain.ValidatePhoneNumber(*input.OwnerPhone); err != nil {
			return nil, err
		}
		normalized := domain.NormalizePhoneNumber(*input.OwnerPhone)
		input.OwnerPhone = &normalized
	}
	return s.repo.UpdateConfig(ctx, input)
}

// GetStatus retrieves the live WhatsApp connection health and QR pairing data.
func (s *NotificationService) GetStatus(ctx context.Context) (*domain.WhatsAppStatus, error) {
	return s.notifier.GetStatus(ctx)
}

// Disconnect terminates the active WhatsApp Web session.
func (s *NotificationService) Disconnect(ctx context.Context) error {
	return s.notifier.Disconnect(ctx)
}

// SendTestNotification sends an on-demand verification message to the owner's phone or an explicitly passed test phone.
func (s *NotificationService) SendTestNotification(ctx context.Context, targetPhone ...string) error {
	phone := ""
	if len(targetPhone) > 0 && targetPhone[0] != "" {
		phone = targetPhone[0]
	} else {
		cfg, err := s.repo.GetConfig(ctx)
		if err != nil {
			return err
		}
		phone = cfg.OwnerPhone
	}

	if err := domain.ValidatePhoneNumber(phone); err != nil {
		return err
	}
	phone = domain.NormalizePhoneNumber(phone)

	msg := domain.FormatTestMessage(phone)
	sendErr := s.notifier.SendMessage(ctx, phone, msg)

	status := "sent"
	errMsg := ""
	if sendErr != nil {
		status = "failed"
		errMsg = sendErr.Error()
	}

	_ = s.repo.LogNotification(ctx, &domain.NotificationLog{
		Channel:      "whatsapp",
		Recipient:    phone,
		EventType:    "test",
		Payload:      msg,
		Status:       status,
		ErrorMessage: errMsg,
	}, 0)

	if sendErr != nil {
		return fmt.Errorf("failed to send test alert: %w", sendErr)
	}
	return nil
}

// CheckAndNotifyLowStock evaluates an inventory change against thresholds and cooldowns,
// dispatching a low-stock alert if warranted without ever failing checkout.
func (s *NotificationService) CheckAndNotifyLowStock(ctx context.Context, product domain.Product, prevStock, currentStock int, trigger string) error {
	// If current stock is not low, nothing to do
	if currentStock > product.MinStockAlert {
		return nil
	}

	cfg, err := s.repo.GetConfig(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyLowStock || cfg.OwnerPhone == "" {
		return nil // Disabled or unconfigured
	}

	// Cooldown and deduplication check:
	// If it was already below or at threshold, check when the last alert was sent
	if prevStock <= product.MinStockAlert {
		lastSent, err := s.repo.GetLastSentAt(ctx, "low_stock", product.ID)
		if err == nil && lastSent != nil {
			cooldownDuration := time.Duration(cfg.CooldownMinutes) * time.Minute
			if time.Since(*lastSent) < cooldownDuration {
				// Suppress duplicate alert within cooldown period
				return nil
			}
		}
	}

	alert := domain.LowStockAlert{
		Product:       product,
		PreviousStock: prevStock,
		CurrentStock:  currentStock,
		Threshold:     product.MinStockAlert,
		Trigger:       trigger,
		Timestamp:     time.Now(),
	}

	msg := domain.FormatLowStockMessage(alert)

	// Non-blocking dispatch to isolate point of sale transactions
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		sendErr := s.notifier.SendMessage(bgCtx, cfg.OwnerPhone, msg)
		status := "sent"
		errMsg := ""
		if sendErr != nil {
			status = "failed"
			errMsg = sendErr.Error()
			log.Printf("whatsapp alert delivery failed for product %d: %v", product.ID, sendErr)
		}

		_ = s.repo.LogNotification(bgCtx, &domain.NotificationLog{
			Channel:      "whatsapp",
			Recipient:    cfg.OwnerPhone,
			EventType:    "low_stock",
			Payload:      msg,
			Status:       status,
			ErrorMessage: errMsg,
		}, product.ID)
	}()

	return nil
}

// ListLogs returns recent notification audit logs.
func (s *NotificationService) ListLogs(ctx context.Context, limit int) ([]domain.NotificationLog, error) {
	return s.repo.ListLogs(ctx, limit)
}
