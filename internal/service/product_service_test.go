package service_test

import (
	"context"
	"testing"

	"github.com/davidyusaku-13/posix/internal/domain"
)

func TestProductService(t *testing.T) {
	ctx := context.Background()
	_, productService := setupTestServices(t)

	t.Run("list all products", func(t *testing.T) {
		products, err := productService.ListProducts(ctx, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(products) == 0 {
			t.Fatalf("expected seeded products")
		}
	})

	t.Run("lookup product by barcode", func(t *testing.T) {
		p, err := productService.LookupProduct(ctx, "8901001")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if p.SKU != "BEV-001" {
			t.Errorf("expected BEV-001, got %s", p.SKU)
		}
	})

	t.Run("lookup nonexistent code returns ErrProductNotFound", func(t *testing.T) {
		_, err := productService.LookupProduct(ctx, "INVALID_CODE")
		if err != domain.ErrProductNotFound {
			t.Fatalf("expected ErrProductNotFound, got %v", err)
		}
	})

	t.Run("create product with validation", func(t *testing.T) {
		validInput := domain.CreateProductInput{
			SKU:           "SVC-001",
			Barcode:       "7770001",
			Name:          "Specialty Drip Coffee",
			Description:   "Single origin pour over",
			PriceCents:    450,
			TaxRateBps:    825,
			StockQuantity: 50,
			MinStockAlert: 10,
		}

		created, err := productService.CreateProduct(ctx, validInput)
		if err != nil {
			t.Fatalf("unexpected error creating product: %v", err)
		}
		if created.ID == 0 {
			t.Errorf("expected generated product ID")
		}

		// Validation: empty name
		invalidName := validInput
		invalidName.Name = ""
		invalidName.SKU = "SVC-002"
		invalidName.Barcode = "7770002"
		_, err = productService.CreateProduct(ctx, invalidName)
		if err == nil {
			t.Fatalf("expected error for empty name, got nil")
		}

		// Validation: negative price
		invalidPrice := validInput
		invalidPrice.Name = "Valid Name"
		invalidPrice.SKU = "SVC-003"
		invalidPrice.Barcode = "7770003"
		invalidPrice.PriceCents = -100
		_, err = productService.CreateProduct(ctx, invalidPrice)
		if err == nil {
			t.Fatalf("expected error for negative price, got nil")
		}
	})

	t.Run("update product", func(t *testing.T) {
		p, err := productService.LookupProduct(ctx, "SVC-001")
		if err != nil {
			t.Fatalf("failed to find product: %v", err)
		}

		updateInput := domain.UpdateProductInput{
			Name:          "Specialty Drip Coffee (Large)",
			Description:   "Updated 16oz pour over",
			PriceCents:    525,
			TaxRateBps:    825,
			MinStockAlert: 15,
		}

		updated, err := productService.UpdateProduct(ctx, p.ID, updateInput)
		if err != nil {
			t.Fatalf("unexpected error updating product: %v", err)
		}
		if updated.PriceCents != 525 {
			t.Errorf("expected price 525, got %d", updated.PriceCents)
		}
	})

	t.Run("adjust stock delta", func(t *testing.T) {
		p, err := productService.LookupProduct(ctx, "SVC-001")
		if err != nil {
			t.Fatalf("failed to find product: %v", err)
		}
		initialStock := p.StockQuantity

		adjusted, err := productService.AdjustStock(ctx, p.ID, 25)
		if err != nil {
			t.Fatalf("unexpected error restocking: %v", err)
		}
		if adjusted.StockQuantity != initialStock+25 {
			t.Errorf("expected %d, got %d", initialStock+25, adjusted.StockQuantity)
		}
	})

	t.Run("list low stock products", func(t *testing.T) {
		// Create a product with stock <= min_stock_alert
		_, err := productService.CreateProduct(ctx, domain.CreateProductInput{
			SKU:           "CRIT-001",
			Barcode:       "7770099",
			Name:          "Low Stock Item",
			PriceCents:    300,
			TaxRateBps:    825,
			StockQuantity: 3,
			MinStockAlert: 10,
		})
		if err != nil {
			t.Fatalf("failed to create critical item: %v", err)
		}

		lowStockList, err := productService.ListLowStock(ctx)
		if err != nil {
			t.Fatalf("unexpected error listing low stock: %v", err)
		}
		if len(lowStockList) == 0 {
			t.Fatalf("expected low stock products, got 0")
		}
	})
}
