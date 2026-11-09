package notification

import (
	"context"
	"time"

	"github.com/davidyusaku-13/posix/internal/domain"
)

// NoopNotifier is a null-object implementation used for testing and offline environments.
type NoopNotifier struct{}

func NewNoopNotifier() *NoopNotifier {
	return &NoopNotifier{}
}

func (n *NoopNotifier) SendMessage(ctx context.Context, recipientPhone, message string) error {
	return nil
}

func (n *NoopNotifier) GetStatus(ctx context.Context) (*domain.WhatsAppStatus, error) {
	return &domain.WhatsAppStatus{
		Status:    "disconnected",
		UpdatedAt: time.Now(),
	}, nil
}

func (n *NoopNotifier) Disconnect(ctx context.Context) error {
	return nil
}
