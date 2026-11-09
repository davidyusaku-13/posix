package sqlite_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/davidyusaku-13/posix/internal/database"
	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
)

func setupTestDB(t *testing.T) *sql.DB {
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	return db
}

func TestProductRepository(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	ctx := context.Background()
	repo := sqlite.NewProductRepository(db)

	t.Run("List returns all products", func(t *testing.T) {
		products, err := repo.List(ctx, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(products) == 0 {
			t.Fatalf("expected seeded products, got 0")
		}
	})

	t.Run("List with search filter", func(t *testing.T) {
		products, err := repo.List(ctx, "Espresso")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(products) != 1 {
			t.Fatalf("expected 1 result, got %d", len(products))
		}
		if products[0].SKU != "BEV-001" {
			t.Errorf("expected SKU BEV-001, got %s", products[0].SKU)
		}
	})

	t.Run("FindByCode matches barcode or SKU", func(t *testing.T) {
		byBarcode, err := repo.FindByCode(ctx, "8901001")
		if err != nil {
			t.Fatalf("failed to find by barcode: %v", err)
		}
		if byBarcode.Name != "Espresso Whole Bean 250g" {
			t.Errorf("unexpected product: %s", byBarcode.Name)
		}

		bySKU, err := repo.FindByCode(ctx, "BEV-001")
		if err != nil {
			t.Fatalf("failed to find by SKU: %v", err)
		}
		if bySKU.ID != byBarcode.ID {
			t.Errorf("expected matching IDs")
		}
	})

	t.Run("FindByCode not found returns domain.ErrProductNotFound", func(t *testing.T) {
		_, err := repo.FindByCode(ctx, "NONEXISTENT")
		if err != domain.ErrProductNotFound {
			t.Fatalf("expected ErrProductNotFound, got %v", err)
		}
	})

	t.Run("Create product persists and returns generated ID", func(t *testing.T) {
		newProd := &domain.Product{
			SKU:           "NEW-001",
			Barcode:       "9990001",
			Name:          "Specialty Matchstick Tea",
			Description:   "Organic Japanese ceremonial grade",
			PriceCents:    1850,
			TaxRateBps:    825,
			StockQuantity: 15,
			MinStockAlert: 5,
		}
		created, err := repo.Create(ctx, newProd)
		if err != nil {
			t.Fatalf("failed to create product: %v", err)
		}
		if created.ID == 0 {
			t.Errorf("expected non-zero ID")
		}

		fetched, err := repo.FindByID(ctx, created.ID)
		if err != nil {
			t.Fatalf("failed to fetch created product: %v", err)
		}
		if fetched.Name != newProd.Name {
			t.Errorf("expected %s, got %s", newProd.Name, fetched.Name)
		}
	})

	t.Run("Update product modifies metadata", func(t *testing.T) {
		prod, err := repo.FindByCode(ctx, "NEW-001")
		if err != nil {
			t.Fatalf("failed to find product: %v", err)
		}
		prod.Name = "Updated Matcha Tea"
		prod.PriceCents = 1950

		updated, err := repo.Update(ctx, prod)
		if err != nil {
			t.Fatalf("failed to update product: %v", err)
		}
		if updated.Name != "Updated Matcha Tea" {
			t.Errorf("expected updated name, got %s", updated.Name)
		}
		if updated.PriceCents != 1950 {
			t.Errorf("expected updated price 1950, got %d", updated.PriceCents)
		}
	})

	t.Run("AdjustStock increments and decrements correctly", func(t *testing.T) {
		prod, err := repo.FindByCode(ctx, "NEW-001")
		if err != nil {
			t.Fatalf("failed to find product: %v", err)
		}
		initialStock := prod.StockQuantity

		// Restock +10
		adjusted, err := repo.AdjustStock(ctx, prod.ID, 10)
		if err != nil {
			t.Fatalf("failed to restock: %v", err)
		}
		if adjusted.StockQuantity != initialStock+10 {
			t.Errorf("expected %d, got %d", initialStock+10, adjusted.StockQuantity)
		}

		// Reduce -5
		adjusted2, err := repo.AdjustStock(ctx, prod.ID, -5)
		if err != nil {
			t.Fatalf("failed to reduce stock: %v", err)
		}
		if adjusted2.StockQuantity != initialStock+5 {
			t.Errorf("expected %d, got %d", initialStock+5, adjusted2.StockQuantity)
		}
	})

	t.Run("ListLowStock returns items below threshold", func(t *testing.T) {
		// Create an item with low stock
		lowProd := &domain.Product{
			SKU:           "LOW-001",
			Barcode:       "9990002",
			Name:          "Almost Gone Item",
			PriceCents:    500,
			TaxRateBps:    825,
			StockQuantity: 2,
			MinStockAlert: 5,
		}
		_, err := repo.Create(ctx, lowProd)
		if err != nil {
			t.Fatalf("failed to create low product: %v", err)
		}

		lowItems, err := repo.ListLowStock(ctx)
		if err != nil {
			t.Fatalf("failed to list low stock: %v", err)
		}
		found := false
		for _, item := range lowItems {
			if item.SKU == "LOW-001" {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected LOW-001 to be in low stock list")
		}
	})
}

func TestOrderRepository(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	ctx := context.Background()
	txManager := sqlite.NewTransactor(db)
	orderRepo := sqlite.NewOrderRepository(db)
	productRepo := sqlite.NewProductRepository(db)

	p, err := productRepo.FindByCode(ctx, "BEV-001")
	if err != nil {
		t.Fatalf("failed to find product: %v", err)
	}

	orderID := "test-order-uuid"
	receiptNum := "RCP-20261108-0001"
	order := &domain.Order{
		ID:            orderID,
		ReceiptNumber: receiptNum,
		SubtotalCents: 1250,
		TaxCents:      103,
		TotalCents:    1353,
		Status:        "completed",
		CreatedAt:     time.Now().UTC(),
	}

	items := []domain.OrderItem{
		{
			OrderID:           orderID,
			ProductID:         p.ID,
			ProductName:       p.Name,
			UnitPriceCents:    p.PriceCents,
			Quantity:          1,
			LineSubtotalCents: 1250,
			TaxRateBps:        p.TaxRateBps,
			LineTaxCents:      103,
		},
	}

	payment := &domain.Payment{
		OrderID:             orderID,
		PaymentMethod:       domain.PaymentMethodCash,
		AmountTenderedCents: 2000,
		ChangeCents:         647,
		CreatedAt:           time.Now().UTC(),
	}

	err = txManager.WithinTransaction(ctx, func(tx *sql.Tx) error {
		if err := productRepo.DeductStockTx(ctx, tx, p.ID, 1); err != nil {
			return err
		}
		return orderRepo.CreateOrderTx(ctx, tx, order, items, payment)
	})
	if err != nil {
		t.Fatalf("transaction failed: %v", err)
	}

	// Verify retrieval
	retrieved, err := orderRepo.GetByID(ctx, orderID)
	if err != nil {
		t.Fatalf("failed to retrieve order: %v", err)
	}
	if retrieved.Order.ReceiptNumber != receiptNum {
		t.Errorf("expected %s, got %s", receiptNum, retrieved.Order.ReceiptNumber)
	}
	if len(retrieved.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(retrieved.Items))
	}
	if retrieved.Payment.ChangeCents != 647 {
		t.Errorf("expected change 647, got %d", retrieved.Payment.ChangeCents)
	}
}
