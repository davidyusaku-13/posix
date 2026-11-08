package domain

import (
	"errors"
	"fmt"
)

var (
	ErrEmptyCart             = errors.New("cannot checkout with an empty cart")
	ErrInvalidQuantity       = errors.New("quantity must be greater than zero")
	ErrInsufficientPayment   = errors.New("payment amount tendered is less than total amount due")
	ErrInsufficientInventory = errors.New("insufficient inventory for product")
	ErrProductNotFound       = errors.New("product not found")
)

// CalculateLineSubtotal computes price * quantity in minor currency units.
func CalculateLineSubtotal(unitPriceCents int64, quantity int) (int64, error) {
	if quantity <= 0 {
		return 0, ErrInvalidQuantity
	}
	if unitPriceCents < 0 {
		return 0, errors.New("unit price cannot be negative")
	}
	return unitPriceCents * int64(quantity), nil
}

// CalculateLineTax calculates tax based on basis points (1 bps = 0.01%).
// Half-up rounding algorithm: (subtotal * bps + 5000) / 10000
func CalculateLineTax(lineSubtotalCents int64, taxRateBps int) int64 {
	if lineSubtotalCents <= 0 || taxRateBps <= 0 {
		return 0
	}
	return (lineSubtotalCents*int64(taxRateBps) + 5000) / 10000
}

// CalculateChange computes change due for cash payment.
func CalculateChange(amountTenderedCents, totalCents int64) (int64, error) {
	if amountTenderedCents < totalCents {
		return 0, fmt.Errorf("%w: tendered %d cents, required %d cents", ErrInsufficientPayment, amountTenderedCents, totalCents)
	}
	return amountTenderedCents - totalCents, nil
}
