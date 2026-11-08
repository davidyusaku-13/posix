package api

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/service"
)

type ProductHandler struct {
	svc *service.ProductService
}

func NewProductHandler(svc *service.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

// HandleProducts handles GET /api/v1/products and GET /api/v1/products/{id}
func (h *ProductHandler) HandleProducts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only GET method allowed on this endpoint")
		return
	}

	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/products"), "/")
	if path != "" {
		// Specific product ID: /api/v1/products/{id}
		id, err := strconv.ParseInt(path, 10, 64)
		if err != nil {
			respondError(w, http.StatusBadRequest, "INVALID_ID", "Product ID must be an integer")
			return
		}
		p, err := h.svc.GetProductByID(r.Context(), id)
		if errors.Is(err, domain.ErrProductNotFound) {
			respondError(w, http.StatusNotFound, "PRODUCT_NOT_FOUND", "Product not found")
			return
		}
		if err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		respondJSON(w, http.StatusOK, p)
		return
	}

	// Collection level query params
	if code := strings.TrimSpace(r.URL.Query().Get("code")); code != "" {
		p, err := h.svc.LookupProduct(r.Context(), code)
		if errors.Is(err, domain.ErrProductNotFound) {
			respondError(w, http.StatusNotFound, "PRODUCT_NOT_FOUND", "Product not found")
			return
		}
		if err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		respondJSON(w, http.StatusOK, p)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	products, err := h.svc.ListProducts(r.Context(), query)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, products)
}
