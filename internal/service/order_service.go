package service

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/payment"
	"github.com/davidyusaku-13/posix/internal/repository"
	"github.com/google/uuid"
)

type OrderService struct {
	orderRepo       repository.OrderRepository
	productRepo     repository.ProductRepository
	transactor      repository.Transactor
	paymentRegistry *payment.Registry
}

func NewOrderService(
	orderRepo repository.OrderRepository,
	productRepo repository.ProductRepository,
	transactor repository.Transactor,
	paymentRegistry *payment.Registry,
) *OrderService {
	return &OrderService{
		orderRepo:       orderRepo,
		productRepo:     productRepo,
		transactor:      transactor,
		paymentRegistry: paymentRegistry,
	}
}

func (s *OrderService) CreateOrder(ctx context.Context, req domain.CheckoutRequest) (*domain.CheckoutResponse, error) {
	if len(req.Items) == 0 {
		return nil, domain.ErrEmptyCart
	}

	processor, err := s.paymentRegistry.Get(domain.PaymentMethod(req.Payment.Method))
	if err != nil {
		return nil, fmt.Errorf("invalid payment method: %w", err)
	}

	orderID := uuid.New().String()
	todayStr := time.Now().Format("20060102")
	now := time.Now().UTC()

	var subtotalCents int64
	var taxCents int64
	orderItems := make([]domain.OrderItem, 0, len(req.Items))
	var paymentResult *payment.ProcessResult
	var receiptNumber string

	err = s.transactor.WithinTransaction(ctx, func(tx *sql.Tx) error {
		// 1. Validate items and inventory
		for _, itemInput := range req.Items {
			if itemInput.Quantity <= 0 {
				return domain.ErrInvalidQuantity
			}

			p, err := s.productRepo.FindByIDTx(ctx, tx, itemInput.ProductID)
			if err != nil {
				return err
			}

			if p.StockQuantity < itemInput.Quantity {
				return domain.ErrInsufficientInventory
			}

			lineSubtotal, err := domain.CalculateLineSubtotal(p.PriceCents, itemInput.Quantity)
			if err != nil {
				return err
			}
			lineTax := domain.CalculateLineTax(lineSubtotal, p.TaxRateBps)

			subtotalCents += lineSubtotal
			taxCents += lineTax

			// Deduct stock in transaction
			if err := s.productRepo.DeductStockTx(ctx, tx, p.ID, itemInput.Quantity); err != nil {
				return err
			}

			orderItems = append(orderItems, domain.OrderItem{
				OrderID:           orderID,
				ProductID:         p.ID,
				ProductName:       p.Name,
				UnitPriceCents:    p.PriceCents,
				Quantity:          itemInput.Quantity,
				LineSubtotalCents: lineSubtotal,
				TaxRateBps:        p.TaxRateBps,
				LineTaxCents:      lineTax,
			})
		}

		grandTotalCents := subtotalCents + taxCents

		// 2. Process payment via OCP strategy
		var payErr error
		paymentResult, payErr = processor.Process(ctx, grandTotalCents, req.Payment.AmountTenderedCents, req.Payment.ReferenceCode)
		if payErr != nil {
			return payErr
		}

		// 3. Generate sequential receipt number
		countToday, err := s.orderRepo.CountTodayTx(ctx, tx, todayStr)
		if err != nil {
			return err
		}
		receiptNumber = fmt.Sprintf("RCP-%s-%04d", todayStr, countToday+1)

		// 4. Persist order
		order := &domain.Order{
			ID:            orderID,
			ReceiptNumber: receiptNumber,
			SubtotalCents: subtotalCents,
			TaxCents:      taxCents,
			TotalCents:    grandTotalCents,
			Status:        "completed",
			CreatedAt:     now,
		}

		paymentRecord := &domain.Payment{
			OrderID:             orderID,
			PaymentMethod:       paymentResult.Method,
			AmountTenderedCents: paymentResult.AmountTenderedCents,
			ChangeCents:         paymentResult.ChangeCents,
			ReferenceCode:       paymentResult.ReferenceCode,
			CreatedAt:           now,
		}

		return s.orderRepo.CreateOrderTx(ctx, tx, order, orderItems, paymentRecord)
	})

	if err != nil {
		return nil, err
	}

	return &domain.CheckoutResponse{
		Order: domain.Order{
			ID:            orderID,
			ReceiptNumber: receiptNumber,
			SubtotalCents: subtotalCents,
			TaxCents:      taxCents,
			TotalCents:    subtotalCents + taxCents,
			Status:        "completed",
			CreatedAt:     now,
		},
		Items: orderItems,
		Payment: domain.Payment{
			OrderID:             orderID,
			PaymentMethod:       paymentResult.Method,
			AmountTenderedCents: paymentResult.AmountTenderedCents,
			ChangeCents:         paymentResult.ChangeCents,
			ReferenceCode:       paymentResult.ReferenceCode,
			CreatedAt:           now,
		},
	}, nil
}

func (s *OrderService) ListOrders(ctx context.Context, limit int) ([]domain.Order, error) {
	return s.orderRepo.List(ctx, limit)
}

func (s *OrderService) GetOrderByID(ctx context.Context, id string) (*domain.CheckoutResponse, error) {
	return s.orderRepo.GetByID(ctx, id)
}

func (s *OrderService) GetRecap(ctx context.Context) (*domain.OrdersRecap, error) {
	return s.orderRepo.GetRecap(ctx)
}
