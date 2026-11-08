package payment

import (
	"context"
	"fmt"
	"sync"

	"github.com/davidyusaku-13/posix/internal/domain"
)

// ProcessResult is the outcome of a processed payment.
type ProcessResult struct {
	Method              domain.PaymentMethod
	AmountTenderedCents int64
	ChangeCents         int64
	ReferenceCode       string
}

// Processor defines the strategy for processing customer payment (Open/Closed Principle).
type Processor interface {
	Process(ctx context.Context, totalCents, tenderedCents int64, ref string) (*ProcessResult, error)
}

// CashProcessor handles cash tenders and computes exact change.
type CashProcessor struct{}

func NewCashProcessor() *CashProcessor {
	return &CashProcessor{}
}

func (c *CashProcessor) Process(ctx context.Context, totalCents, tenderedCents int64, ref string) (*ProcessResult, error) {
	changeCents, err := domain.CalculateChange(tenderedCents, totalCents)
	if err != nil {
		return nil, err
	}
	return &ProcessResult{
		Method:              domain.PaymentMethodCash,
		AmountTenderedCents: tenderedCents,
		ChangeCents:         changeCents,
		ReferenceCode:       ref,
	}, nil
}

// CardProcessor handles debit/credit card settlements.
type CardProcessor struct{}

func NewCardProcessor() *CardProcessor {
	return &CardProcessor{}
}

func (c *CardProcessor) Process(ctx context.Context, totalCents, tenderedCents int64, ref string) (*ProcessResult, error) {
	// Card payments settle the exact total due with zero change
	return &ProcessResult{
		Method:              domain.PaymentMethodCard,
		AmountTenderedCents: totalCents,
		ChangeCents:         0,
		ReferenceCode:       ref,
	}, nil
}

// Registry manages payment processors, allowing runtime extension without modifying core code (OCP).
type Registry struct {
	mu         sync.RWMutex
	processors map[domain.PaymentMethod]Processor
}

func NewRegistry() *Registry {
	return &Registry{
		processors: make(map[domain.PaymentMethod]Processor),
	}
}

func (r *Registry) Register(method domain.PaymentMethod, p Processor) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.processors[method] = p
}

func (r *Registry) Get(method domain.PaymentMethod) (Processor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.processors[method]
	if !ok {
		return nil, fmt.Errorf("unsupported payment method: %s", method)
	}
	return p, nil
}

// DefaultRegistry creates a registry pre-loaded with standard Cash and Card processors.
func DefaultRegistry() *Registry {
	r := NewRegistry()
	r.Register(domain.PaymentMethodCash, NewCashProcessor())
	r.Register(domain.PaymentMethodCard, NewCardProcessor())
	return r
}
