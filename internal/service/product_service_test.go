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
}
