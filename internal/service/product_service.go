package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository"
)

var (
	ErrInvalidProductData = errors.New("invalid product data")
	ErrDuplicateSKU       = errors.New("product with this SKU already exists")
	ErrDuplicateBarcode   = errors.New("product with this barcode already exists")
)

type ProductService struct {
	repo repository.ProductRepository
}

func NewProductService(repo repository.ProductRepository) *ProductService {
	return &ProductService{repo: repo}
}

func (s *ProductService) ListProducts(ctx context.Context, query string) ([]domain.Product, error) {
	return s.repo.List(ctx, query)
}

func (s *ProductService) ListLowStock(ctx context.Context) ([]domain.Product, error) {
	return s.repo.ListLowStock(ctx)
}

func (s *ProductService) LookupProduct(ctx context.Context, code string) (*domain.Product, error) {
	return s.repo.FindByCode(ctx, code)
}

func (s *ProductService) GetProductByID(ctx context.Context, id int64) (*domain.Product, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *ProductService) CreateProduct(ctx context.Context, input domain.CreateProductInput) (*domain.Product, error) {
	name := strings.TrimSpace(input.Name)
	sku := strings.TrimSpace(input.SKU)
	barcode := strings.TrimSpace(input.Barcode)

	if name == "" {
		return nil, fmt.Errorf("%w: product name is required", ErrInvalidProductData)
	}
	if sku == "" {
		return nil, fmt.Errorf("%w: product SKU is required", ErrInvalidProductData)
	}
	if barcode == "" {
		return nil, fmt.Errorf("%w: product barcode is required", ErrInvalidProductData)
	}
	if input.PriceCents < 0 {
		return nil, fmt.Errorf("%w: price cannot be negative", ErrInvalidProductData)
	}
	if input.TaxRateBps < 0 {
		return nil, fmt.Errorf("%w: tax rate cannot be negative", ErrInvalidProductData)
	}
	if input.StockQuantity < 0 {
		return nil, fmt.Errorf("%w: stock quantity cannot be negative", ErrInvalidProductData)
	}

	// Check for unique constraints
	if existing, _ := s.repo.FindByCode(ctx, sku); existing != nil {
		return nil, ErrDuplicateSKU
	}
	if existing, _ := s.repo.FindByCode(ctx, barcode); existing != nil {
		return nil, ErrDuplicateBarcode
	}

	p := &domain.Product{
		SKU:           sku,
		Barcode:       barcode,
		Name:          name,
		Description:   strings.TrimSpace(input.Description),
		PriceCents:    input.PriceCents,
		TaxRateBps:    input.TaxRateBps,
		StockQuantity: input.StockQuantity,
		MinStockAlert: input.MinStockAlert,
	}

	return s.repo.Create(ctx, p)
}

func (s *ProductService) UpdateProduct(ctx context.Context, id int64, input domain.UpdateProductInput) (*domain.Product, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, fmt.Errorf("%w: product name cannot be empty", ErrInvalidProductData)
	}
	if input.PriceCents < 0 {
		return nil, fmt.Errorf("%w: price cannot be negative", ErrInvalidProductData)
	}
	if input.TaxRateBps < 0 {
		return nil, fmt.Errorf("%w: tax rate cannot be negative", ErrInvalidProductData)
	}

	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	existing.Name = name
	existing.Description = strings.TrimSpace(input.Description)
	existing.PriceCents = input.PriceCents
	existing.TaxRateBps = input.TaxRateBps
	existing.MinStockAlert = input.MinStockAlert

	return s.repo.Update(ctx, existing)
}

func (s *ProductService) AdjustStock(ctx context.Context, id int64, delta int) (*domain.Product, error) {
	return s.repo.AdjustStock(ctx, id, delta)
}
