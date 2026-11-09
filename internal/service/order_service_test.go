package service_test

import (
	"context"
	"testing"

	"github.com/davidyusaku-13/posix/internal/database"
	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/payment"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
	"github.com/davidyusaku-13/posix/internal/service"
)

func setupTestServices(t *testing.T) (*service.OrderService, *service.ProductService) {
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}

	productRepo := sqlite.NewProductRepository(db)
	orderRepo := sqlite.NewOrderRepository(db)
	transactor := sqlite.NewTransactor(db)
	paymentRegistry := payment.DefaultRegistry()

	orderService := service.NewOrderService(orderRepo, productRepo, transactor, paymentRegistry)
	productService := service.NewProductService(productRepo)

	return orderService, productService
}

func TestOrderService_CreateOrder(t *testing.T) {
	ctx := context.Background()
	orderService, productService := setupTestServices(t)

	// Get a test product: BEV-001 Espresso, $12.50 (1250 cents), 825 bps tax
	p, err := productService.LookupProduct(ctx, "BEV-001")
	if err != nil {
		t.Fatalf("failed to find product: %v", err)
	}

	t.Run("successful cash order with cashier attribution", func(t *testing.T) {
		cashierID := int64(1)
		cashierName := "Front Desk Cashier"
		req := domain.CheckoutRequest{
			Items: []domain.CheckoutItemInput{
				{ProductID: p.ID, Quantity: 2},
			},
			Payment: domain.PaymentInput{
				Method:              string(domain.PaymentMethodCash),
				AmountTenderedCents: 3000,
			},
			CashierID:   &cashierID,
			CashierName: cashierName,
		}

		resp, err := orderService.CreateOrder(ctx, req)
		if err != nil {
			t.Fatalf("expected successful order, got error: %v", err)
		}

		if resp.Order.SubtotalCents != 2500 {
			t.Errorf("expected subtotal 2500, got %d", resp.Order.SubtotalCents)
		}
		if resp.Order.TaxCents != 206 {
			t.Errorf("expected tax 206, got %d", resp.Order.TaxCents)
		}
		if resp.Order.TotalCents != 2706 {
			t.Errorf("expected total 2706, got %d", resp.Order.TotalCents)
		}
		if resp.Payment.ChangeCents != 294 {
			t.Errorf("expected change 294, got %d", resp.Payment.ChangeCents)
		}
		if resp.Order.CashierName != cashierName {
			t.Errorf("expected cashier name %s, got %s", cashierName, resp.Order.CashierName)
		}
		if resp.Order.CashierID == nil || *resp.Order.CashierID != cashierID {
			t.Errorf("expected cashier id %d, got %v", cashierID, resp.Order.CashierID)
		}
		if len(resp.Items) != 1 {
			t.Errorf("expected 1 line item, got %d", len(resp.Items))
		}
	})

	t.Run("empty cart rejected", func(t *testing.T) {
		req := domain.CheckoutRequest{
			Items: []domain.CheckoutItemInput{},
			Payment: domain.PaymentInput{
				Method:              string(domain.PaymentMethodCash),
				AmountTenderedCents: 1000,
			},
		}
		_, err := orderService.CreateOrder(ctx, req)
		if err != domain.ErrEmptyCart {
			t.Fatalf("expected ErrEmptyCart, got %v", err)
		}
	})

	t.Run("insufficient stock rejected", func(t *testing.T) {
		req := domain.CheckoutRequest{
			Items: []domain.CheckoutItemInput{
				{ProductID: p.ID, Quantity: 999999},
			},
			Payment: domain.PaymentInput{
				Method:              string(domain.PaymentMethodCash),
				AmountTenderedCents: 999999999,
			},
		}
		_, err := orderService.CreateOrder(ctx, req)
		if err != domain.ErrInsufficientInventory {
			t.Fatalf("expected ErrInsufficientInventory, got %v", err)
		}
	})

	t.Run("underpaid cash payment rejected", func(t *testing.T) {
		req := domain.CheckoutRequest{
			Items: []domain.CheckoutItemInput{
				{ProductID: p.ID, Quantity: 1},
			},
			Payment: domain.PaymentInput{
				Method:              string(domain.PaymentMethodCash),
				AmountTenderedCents: 500, // less than price + tax ($13.53)
			},
		}
		_, err := orderService.CreateOrder(ctx, req)
		if err == nil {
			t.Fatalf("expected error for underpaid cash payment, got nil")
		}
	})

	t.Run("get orders recap summary and focused order details", func(t *testing.T) {
		// Create an order
		created, err := orderService.CreateOrder(ctx, domain.CheckoutRequest{
			Items: []domain.CheckoutItemInput{
				{ProductID: p.ID, Quantity: 1},
			},
			Payment: domain.PaymentInput{
				Method:              string(domain.PaymentMethodCash),
				AmountTenderedCents: 1500,
			},
		})
		if err != nil {
			t.Fatalf("unexpected checkout error: %v", err)
		}

		// Recap test
		recap, err := orderService.GetRecap(ctx)
		if err != nil {
			t.Fatalf("unexpected recap error: %v", err)
		}
		if recap.TotalOrders < 1 {
			t.Errorf("expected at least 1 order in recap, got %d", recap.TotalOrders)
		}

		// Focused single order test
		focused, err := orderService.GetOrderByID(ctx, created.Order.ID)
		if err != nil {
			t.Fatalf("unexpected get order error: %v", err)
		}
		if focused.Order.ReceiptNumber != created.Order.ReceiptNumber {
			t.Errorf("expected %s, got %s", created.Order.ReceiptNumber, focused.Order.ReceiptNumber)
		}
		if len(focused.Items) != 1 {
			t.Errorf("expected 1 line item, got %d", len(focused.Items))
		}
	})
}
