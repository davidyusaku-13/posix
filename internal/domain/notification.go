package domain

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var (
	ErrInvalidPhoneNumber   = errors.New("invalid phone number: must be in international or E.164 format with at least 8 digits")
	ErrNotificationDisabled = errors.New("notifications are currently disabled")
	ErrWhatsAppNotConnected = errors.New("whatsapp service is not connected or authenticated")
)

// NotificationConfig holds the store owner notification preferences.
type NotificationConfig struct {
	OwnerPhone      string    `json:"ownerPhone"`
	Enabled         bool      `json:"enabled"`
	NotifyLowStock  bool      `json:"notifyLowStock"`
	CooldownMinutes int       `json:"cooldownMinutes"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// UpdateNotificationConfigInput carries payload to adjust notification settings.
type UpdateNotificationConfigInput struct {
	OwnerPhone      *string `json:"ownerPhone,omitempty"`
	Enabled         *bool   `json:"enabled,omitempty"`
	NotifyLowStock  *bool   `json:"notifyLowStock,omitempty"`
	CooldownMinutes *int    `json:"cooldownMinutes,omitempty"`
}

// LowStockAlert encapsulates details for a low-inventory event.
type LowStockAlert struct {
	Product       Product   `json:"product"`
	PreviousStock int       `json:"previousStock"`
	CurrentStock  int       `json:"currentStock"`
	Threshold     int       `json:"threshold"`
	Trigger       string    `json:"trigger"` // "order_checkout", "stock_adjustment"
	Timestamp     time.Time `json:"timestamp"`
}

// WhatsAppStatus represents the connection health of the Baileys socket.
type WhatsAppStatus struct {
	Status         string    `json:"status"` // "connected", "qr_ready", "disconnected", "initializing"
	QRCode         string    `json:"qrCode,omitempty"`
	ConnectedPhone string    `json:"connectedPhone,omitempty"`
	Error          string    `json:"error,omitempty"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// NotificationLog represents an audit log entry for dispatched alerts.
type NotificationLog struct {
	ID           int64     `json:"id"`
	Channel      string    `json:"channel"`
	Recipient    string    `json:"recipient"`
	EventType    string    `json:"eventType"`
	Payload      string    `json:"payload"`
	Status       string    `json:"status"` // "sent", "failed", "skipped"
	ErrorMessage string    `json:"errorMessage,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

var nonDigitRegex = regexp.MustCompile(`\D`)

// NormalizePhoneNumber strips non-digit characters and normalizes leading zero if standard Indonesian.
func NormalizePhoneNumber(phone string) string {
	digits := nonDigitRegex.ReplaceAllString(phone, "")
	if strings.HasPrefix(digits, "0") && len(digits) >= 10 {
		digits = "62" + digits[1:]
	}
	return digits
}

// ValidatePhoneNumber ensures the phone number contains between 8 and 15 digits.
func ValidatePhoneNumber(phone string) error {
	normalized := NormalizePhoneNumber(phone)
	if len(normalized) < 8 || len(normalized) > 15 {
		return ErrInvalidPhoneNumber
	}
	return nil
}

// FormatLowStockMessage builds a clean, readable WhatsApp alert for the store owner.
func FormatLowStockMessage(alert LowStockAlert) string {
	ts := alert.Timestamp
	if ts.IsZero() {
		ts = time.Now()
	}

	return fmt.Sprintf(
		"⚠️ [POSIX LOW STOCK ALERT]\n"+
			"────────────────────────\n"+
			"Store Alert: Item inventory has fallen below minimum threshold!\n\n"+
			"📦 Item: %s\n"+
			"🏷️ SKU: %s\n"+
			"📊 Current Stock: %d (Previous: %d)\n"+
			"🚨 Threshold: %d\n"+
			"⚡ Trigger: %s\n"+
			"🕒 Time: %s\n"+
			"────────────────────────\n"+
			"Please reorder or restock soon.",
		alert.Product.Name,
		alert.Product.SKU,
		alert.CurrentStock,
		alert.PreviousStock,
		alert.Threshold,
		alert.Trigger,
		ts.Format("02 Jan 2006 15:04:05 MST"),
	)
}

// FormatTestMessage builds an on-demand verification message.
func FormatTestMessage(ownerPhone string) string {
	return fmt.Sprintf(
		"✅ [POSIX NOTIFICATION TEST]\n"+
			"────────────────────────\n"+
			"Hello! This is a test alert from your POSIX Point of Sale terminal.\n\n"+
			"📱 Configured Number: %s\n"+
			"🕒 Server Timestamp: %s\n"+
			"────────────────────────\n"+
			"Your WhatsApp notification channel is successfully connected!",
		ownerPhone,
		time.Now().Format("02 Jan 2006 15:04:05 MST"),
	)
}
