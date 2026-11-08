package service

import (
	"context"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository"
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

func (s *ProductService) LookupProduct(ctx context.Context, code string) (*domain.Product, error) {
	return s.repo.FindByCode(ctx, code)
}

func (s *ProductService) GetProductByID(ctx context.Context, id int64) (*domain.Product, error) {
	return s.repo.FindByID(ctx, id)
}
