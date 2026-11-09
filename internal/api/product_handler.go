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

type ProductHandler struct {
	svc *service.ProductService
}

func NewProductHandler(svc *service.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

// HandleProducts routes requests for /api/v1/products and subpaths /api/v1/products/{id}
func (h *ProductHandler) HandleProducts(w http.ResponseWriter, r *http.Request) {
	subpath := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/products"), "/")

	if subpath == "" {
		switch r.Method {
		case http.MethodGet:
			h.listProducts(w, r)
		case http.MethodPost:
			h.createProduct(w, r)
		default:
			respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		}
		return
	}

	// Handle subpaths: {id} or {id}/stock
	parts := strings.Split(subpath, "/")
	id, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_ID", "Product ID must be an integer")
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			h.getProduct(w, r, id)
		case http.MethodPut:
			h.updateProduct(w, r, id)
		default:
			respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		}
		return
	}

	if len(parts) == 2 && parts[1] == "stock" {
		if r.Method == http.MethodPost || r.Method == http.MethodPatch {
			h.adjustStock(w, r, id)
			return
		}
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	respondError(w, http.StatusNotFound, "NOT_FOUND", "Endpoint not found")
}

func (h *ProductHandler) listProducts(w http.ResponseWriter, r *http.Request) {
	// Low stock query filter
	if r.URL.Query().Get("low_stock") == "true" {
		products, err := h.svc.ListLowStock(r.Context())
		if err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		respondJSON(w, http.StatusOK, products)
		return
	}

	// Code exact lookup
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

	// Text query search
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	products, err := h.svc.ListProducts(r.Context(), query)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, products)
}

func (h *ProductHandler) createProduct(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid JSON request body")
		return
	}

	p, err := h.svc.CreateProduct(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidProductData) {
			respondError(w, http.StatusBadRequest, "INVALID_PRODUCT_DATA", err.Error())
			return
		}
		if errors.Is(err, service.ErrDuplicateSKU) {
			respondError(w, http.StatusConflict, "DUPLICATE_SKU", err.Error())
			return
		}
		if errors.Is(err, service.ErrDuplicateBarcode) {
			respondError(w, http.StatusConflict, "DUPLICATE_BARCODE", err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	w.Header().Set("Location", fmt.Sprintf("/api/v1/products/%d", p.ID))
	respondJSON(w, http.StatusCreated, p)
}

func (h *ProductHandler) getProduct(w http.ResponseWriter, r *http.Request, id int64) {
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
}

func (h *ProductHandler) updateProduct(w http.ResponseWriter, r *http.Request, id int64) {
	var input domain.UpdateProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid JSON request body")
		return
	}

	p, err := h.svc.UpdateProduct(r.Context(), id, input)
	if errors.Is(err, domain.ErrProductNotFound) {
		respondError(w, http.StatusNotFound, "PRODUCT_NOT_FOUND", "Product not found")
		return
	}
	if errors.Is(err, service.ErrInvalidProductData) {
		respondError(w, http.StatusBadRequest, "INVALID_PRODUCT_DATA", err.Error())
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, p)
}

func (h *ProductHandler) adjustStock(w http.ResponseWriter, r *http.Request, id int64) {
	var input domain.AdjustStockInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid JSON request body")
		return
	}

	p, err := h.svc.AdjustStock(r.Context(), id, input.Delta)
	if errors.Is(err, domain.ErrProductNotFound) {
		respondError(w, http.StatusNotFound, "PRODUCT_NOT_FOUND", "Product not found")
		return
	}
	if errors.Is(err, domain.ErrInsufficientInventory) {
		respondError(w, http.StatusUnprocessableEntity, "INSUFFICIENT_STOCK", "Adjustment would result in negative inventory")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, p)
}
