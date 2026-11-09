package domain_test

import (
	"strings"
	"testing"
	"time"

	"github.com/davidyusaku-13/posix/internal/domain"
)

func TestFormatLowStockMessage(t *testing.T) {
	alert := domain.LowStockAlert{
		Product: domain.Product{
			ID:            1,
			SKU:           "SKU-COF-001",
			Barcode:       "8901001",
			Name:          "Artisan Espresso Beans 250g",
			PriceCents:    1450,
			StockQuantity: 3,
			MinStockAlert: 5,
		},
		PreviousStock: 6,
		CurrentStock:  3,
		Threshold:     5,
		Trigger:       "order_checkout",
		Timestamp:     time.Date(2026, 11, 10, 14, 30, 0, 0, time.UTC),
	}

	msg := domain.FormatLowStockMessage(alert)

	if !strings.Contains(msg, "⚠️ [POSIX LOW STOCK ALERT]") {
		t.Errorf("expected header in message, got: %s", msg)
	}
	if !strings.Contains(msg, "Artisan Espresso Beans 250g") {
		t.Errorf("expected product name in message, got: %s", msg)
	}
	if !strings.Contains(msg, "SKU-COF-001") {
		t.Errorf("expected SKU in message, got: %s", msg)
	}
	if !strings.Contains(msg, "Current Stock: 3") {
		t.Errorf("expected current stock count, got: %s", msg)
	}
	if !strings.Contains(msg, "Threshold: 5") {
		t.Errorf("expected threshold in message, got: %s", msg)
	}
}

func TestValidatePhoneNumber(t *testing.T) {
	cases := []struct {
		phone string
		valid bool
	}{
		{"+14155552671", true},
		{"+6281234567890", true},
		{"14155552671", true},
		{"6281234567890", true},
		{"", false},
		{"abc", false},
		{"+1", false}, // too short
	}

	for _, tc := range cases {
		err := domain.ValidatePhoneNumber(tc.phone)
		if tc.valid && err != nil {
			t.Errorf("expected %q to be valid, got err: %v", tc.phone, err)
		}
		if !tc.valid && err == nil {
			t.Errorf("expected %q to be invalid, got nil err", tc.phone)
		}
	}
}

func TestNormalizePhoneNumber(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"+1 (415) 555-2671", "14155552671"},
		{"+62 812-3456-7890", "6281234567890"},
		{"08123456789", "628123456789"}, // common Indonesian prefix normalization
		{"14155552671", "14155552671"},
	}

	for _, tc := range cases {
		result := domain.NormalizePhoneNumber(tc.input)
		if result != tc.expected {
			t.Errorf("for input %q: expected %q, got %q", tc.input, tc.expected, result)
		}
	}
}
