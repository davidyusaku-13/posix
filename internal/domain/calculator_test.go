package domain

import (
	"testing"
)

func TestCalculateLineSubtotal(t *testing.T) {
	tests := []struct {
		name      string
		unitPrice int64
		quantity  int
		expected  int64
		expectErr bool
	}{
		{"standard item", 1250, 2, 2500, false},
		{"single item", 99, 1, 99, false},
		{"zero quantity should error", 1250, 0, 0, true},
		{"negative quantity should error", 1250, -1, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CalculateLineSubtotal(tt.unitPrice, tt.quantity)
			if (err != nil) != tt.expectErr {
				t.Fatalf("expected error: %v, got: %v", tt.expectErr, err)
			}
			if got != tt.expected {
				t.Errorf("expected %d, got %d", tt.expected, got)
			}
		})
	}
}

func TestCalculateLineTax(t *testing.T) {
	tests := []struct {
		name       string
		subtotal   int64
		taxRateBps int
		expected   int64
	}{
		{"no tax", 1000, 0, 0},
		{"10% tax on $10.00", 1000, 1000, 100},
		{"8.25% tax on $25.00 ($2.0625 -> 206 cents)", 2500, 825, 206},
		{"round up check: 8.25% on $1.50 = 12.375 -> 12 cents", 150, 825, 12},
		{"round up boundary: $1.90 at 8.25% = 15.675 -> 16 cents", 190, 825, 16},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateLineTax(tt.subtotal, tt.taxRateBps)
			if got != tt.expected {
				t.Errorf("expected %d, got %d", tt.expected, got)
			}
		})
	}
}

func TestCalculateChange(t *testing.T) {
	tests := []struct {
		name      string
		tendered  int64
		total     int64
		expected  int64
		expectErr bool
	}{
		{"exact payment", 2000, 2000, 0, false},
		{"tendered more than total", 2500, 2000, 500, false},
		{"tendered less than total should error", 1500, 2000, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CalculateChange(tt.tendered, tt.total)
			if (err != nil) != tt.expectErr {
				t.Fatalf("expected error: %v, got: %v", tt.expectErr, err)
			}
			if got != tt.expected {
				t.Errorf("expected %d, got %d", tt.expected, got)
			}
		})
	}
}
