package notification

import (
	"context"

	"github.com/davidyusaku-13/posix/internal/domain"
)

// Notifier defines the contract for outbound notification transports.
type Notifier interface {
	// SendMessage sends a text message to the specified recipient phone number.
	SendMessage(ctx context.Context, recipientPhone, message string) error

	// GetStatus retrieves the connection and authentication state of the notification transport.
	GetStatus(ctx context.Context) (*domain.WhatsAppStatus, error)

	// Disconnect terminates the active session.
	Disconnect(ctx context.Context) error
}
