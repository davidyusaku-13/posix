package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/davidyusaku-13/posix/internal/api"
	"github.com/davidyusaku-13/posix/internal/database"
	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/payment"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
	"github.com/davidyusaku-13/posix/internal/service"
)

func setupTestRouter(t *testing.T) http.Handler {
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to init test db: %v", err)
	}

	productRepo := sqlite.NewProductRepository(db)
	orderRepo := sqlite.NewOrderRepository(db)
	transactor := sqlite.NewTransactor(db)
	paymentRegistry := payment.DefaultRegistry()

	productService := service.NewProductService(productRepo)
	orderService := service.NewOrderService(orderRepo, productRepo, transactor, paymentRegistry)

	return api.NewRouter(productService, orderService, nil)
}

func TestREST_ProductEndpoints(t *testing.T) {
	router := setupTestRouter(t)

	t.Run("GET /api/v1/products returns 200 and product list", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/products", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rr.Code)
		}
		if rr.Header().Get("Content-Type") != "application/json" {
			t.Errorf("expected application/json content-type, got %s", rr.Header().Get("Content-Type"))
		}

		var products []domain.Product
		if err := json.Unmarshal(rr.Body.Bytes(), &products); err != nil {
			t.Fatalf("failed to parse json: %v", err)
		}
		if len(products) == 0 {
			t.Fatalf("expected products in catalog")
		}
	})

	t.Run("GET /api/v1/products?code=8901001 returns 200 and exact product", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/products?code=8901001", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rr.Code)
		}

		var product domain.Product
		if err := json.Unmarshal(rr.Body.Bytes(), &product); err != nil {
			t.Fatalf("failed to parse json: %v", err)
		}
		if product.Barcode != "8901001" {
			t.Errorf("expected barcode 8901001, got %s", product.Barcode)
		}
	})

	t.Run("GET /api/v1/products?code=UNKNOWN returns 404 with structured error", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/products?code=UNKNOWN", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found, got %d", rr.Code)
		}

		var errResp api.ErrorResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("failed to parse error json: %v", err)
		}
		if errResp.Error.Code != "PRODUCT_NOT_FOUND" {
			t.Errorf("expected code PRODUCT_NOT_FOUND, got %s", errResp.Error.Code)
		}
	})
}

func TestREST_OrderEndpoints(t *testing.T) {
	router := setupTestRouter(t)

	// Fetch a valid product
	reqList, _ := http.NewRequest(http.MethodGet, "/api/v1/products?code=8901001", nil)
	rrList := httptest.NewRecorder()
	router.ServeHTTP(rrList, reqList)
	var product domain.Product
	_ = json.Unmarshal(rrList.Body.Bytes(), &product)

	t.Run("POST /api/v1/orders returns 201 Created and Location header", func(t *testing.T) {
		payload := domain.CheckoutRequest{
			Items: []domain.CheckoutItemInput{
				{ProductID: product.ID, Quantity: 1},
			},
			Payment: domain.PaymentInput{
				Method:              string(domain.PaymentMethodCash),
				AmountTenderedCents: 2000,
			},
		}
		body, _ := json.Marshal(payload)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/orders", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d. Body: %s", rr.Code, rr.Body.String())
		}

		location := rr.Header().Get("Location")
		if location == "" {
			t.Fatalf("expected Location header in 201 response")
		}

		var resp domain.CheckoutResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp.Order.ID == "" {
			t.Errorf("expected non-empty order ID")
		}
	})

	t.Run("POST /api/v1/orders with underpayment returns 422 Unprocessable Entity", func(t *testing.T) {
		payload := domain.CheckoutRequest{
			Items: []domain.CheckoutItemInput{
				{ProductID: product.ID, Quantity: 1},
			},
			Payment: domain.PaymentInput{
				Method:              string(domain.PaymentMethodCash),
				AmountTenderedCents: 100, // $1.00 when price is $12.50 + tax
			},
		}
		body, _ := json.Marshal(payload)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/orders", bytes.NewReader(body))
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnprocessableEntity {
			t.Fatalf("expected 422 Unprocessable Entity, got %d. Body: %s", rr.Code, rr.Body.String())
		}

		var errResp api.ErrorResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("failed to parse error response: %v", err)
		}
		if errResp.Error.Code != "INSUFFICIENT_PAYMENT" {
			t.Errorf("expected INSUFFICIENT_PAYMENT, got %s", errResp.Error.Code)
		}
	})
}
