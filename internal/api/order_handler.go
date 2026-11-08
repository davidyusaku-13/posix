package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/service"
)

type OrderHandler struct {
	svc *service.OrderService
}

func NewOrderHandler(svc *service.OrderService) *OrderHandler {
	return &OrderHandler{svc: svc}
}

// HandleOrders handles:
// - POST /api/v1/orders (Create order / checkout)
// - GET  /api/v1/orders (List recent orders)
// - GET  /api/v1/orders/{id} (Get single order with receipt details)
func (h *OrderHandler) HandleOrders(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/orders"), "/")

	if path != "" {
		// Specific order by ID: GET /api/v1/orders/{id}
		if r.Method != http.MethodGet {
			respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only GET allowed on specific order resource")
			return
		}
		h.getOrder(w, r, path)
		return
	}

	switch r.Method {
	case http.MethodPost:
		h.createOrder(w, r)
	case http.MethodGet:
		h.listOrders(w, r)
	default:
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
	}
}

func (h *OrderHandler) createOrder(w http.ResponseWriter, r *http.Request) {
	var req domain.CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid JSON request body")
		return
	}

	resp, err := h.svc.CreateOrder(r.Context(), req)
	if err != nil {
		if errors.Is(err, domain.ErrEmptyCart) {
			respondError(w, http.StatusUnprocessableEntity, "EMPTY_CART", err.Error())
			return
		}
		if errors.Is(err, domain.ErrInvalidQuantity) {
			respondError(w, http.StatusUnprocessableEntity, "INVALID_QUANTITY", err.Error())
			return
		}
		if errors.Is(err, domain.ErrInsufficientInventory) {
			respondError(w, http.StatusUnprocessableEntity, "INSUFFICIENT_STOCK", err.Error())
			return
		}
		if errors.Is(err, domain.ErrInsufficientPayment) {
			respondError(w, http.StatusUnprocessableEntity, "INSUFFICIENT_PAYMENT", err.Error())
			return
		}
		if errors.Is(err, domain.ErrProductNotFound) {
			respondError(w, http.StatusNotFound, "PRODUCT_NOT_FOUND", err.Error())
			return
		}
		respondError(w, http.StatusUnprocessableEntity, "ORDER_CREATION_FAILED", err.Error())
		return
	}

	// REST Best Practice: 201 Created with Location header pointing to the created resource
	w.Header().Set("Location", fmt.Sprintf("/api/v1/orders/%s", resp.Order.ID))
	respondJSON(w, http.StatusCreated, resp)
}

func (h *OrderHandler) listOrders(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	orders, err := h.svc.ListOrders(r.Context(), limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, orders)
}

func (h *OrderHandler) getOrder(w http.ResponseWriter, r *http.Request, id string) {
	order, err := h.svc.GetOrderByID(r.Context(), id)
	if errors.Is(err, domain.ErrProductNotFound) {
		respondError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "Order not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, order)
}
