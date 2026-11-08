package payment_test

import (
	"context"
	"testing"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/payment"
)

func TestCashProcessor(t *testing.T) {
	ctx := context.Background()
	proc := payment.NewCashProcessor()

	t.Run("exact payment", func(t *testing.T) {
		result, err := proc.Process(ctx, 2500, 2500, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Method != domain.PaymentMethodCash {
			t.Errorf("expected method cash, got %s", result.Method)
		}
		if result.AmountTenderedCents != 2500 {
			t.Errorf("expected tendered 2500, got %d", result.AmountTenderedCents)
		}
		if result.ChangeCents != 0 {
			t.Errorf("expected change 0, got %d", result.ChangeCents)
		}
	})

	t.Run("cash with change due", func(t *testing.T) {
		result, err := proc.Process(ctx, 2706, 3000, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.ChangeCents != 294 {
			t.Errorf("expected change 294, got %d", result.ChangeCents)
		}
	})

	t.Run("insufficient cash tendered", func(t *testing.T) {
		_, err := proc.Process(ctx, 2706, 2000, "")
		if err == nil {
			t.Fatalf("expected error for insufficient cash payment, got nil")
		}
	})
}

func TestCardProcessor(t *testing.T) {
	ctx := context.Background()
	proc := payment.NewCardProcessor()

	t.Run("card payment", func(t *testing.T) {
		result, err := proc.Process(ctx, 4500, 4500, "AUTH-987654")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Method != domain.PaymentMethodCard {
			t.Errorf("expected method card, got %s", result.Method)
		}
		if result.AmountTenderedCents != 4500 {
			t.Errorf("expected amount 4500, got %d", result.AmountTenderedCents)
		}
		if result.ChangeCents != 0 {
			t.Errorf("expected change 0, got %d", result.ChangeCents)
		}
		if result.ReferenceCode != "AUTH-987654" {
			t.Errorf("expected ref code AUTH-987654, got %s", result.ReferenceCode)
		}
	})
}

func TestPaymentRegistry_OpenClosedPrinciple(t *testing.T) {
	registry := payment.NewRegistry()
	registry.Register(domain.PaymentMethodCash, payment.NewCashProcessor())
	registry.Register(domain.PaymentMethodCard, payment.NewCardProcessor())

	t.Run("get existing processor", func(t *testing.T) {
		proc, err := registry.Get(domain.PaymentMethodCash)
		if err != nil {
			t.Fatalf("expected cash processor, got error: %v", err)
		}
		if proc == nil {
			t.Fatalf("expected non-nil processor")
		}
	})

	t.Run("get unsupported processor", func(t *testing.T) {
		_, err := registry.Get("bitcoin")
		if err == nil {
			t.Fatalf("expected error for unsupported payment method, got nil")
		}
	})
}
