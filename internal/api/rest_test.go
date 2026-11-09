package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"testing/fstest"

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

	userRepo := sqlite.NewUserRepository(db)
	productRepo := sqlite.NewProductRepository(db)
	orderRepo := sqlite.NewOrderRepository(db)
	transactor := sqlite.NewTransactor(db)
	paymentRegistry := payment.DefaultRegistry()

	productService := service.NewProductService(productRepo)
	orderService := service.NewOrderService(orderRepo, productRepo, transactor, paymentRegistry)
	authService := service.NewAuthService(userRepo)
	userService := service.NewUserService(userRepo)

	return api.NewRouter(productService, orderService, authService, userService, nil)
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

	t.Run("POST /api/v1/products creates product and sets Location header", func(t *testing.T) {
		payload := domain.CreateProductInput{
			SKU:           "REST-001",
			Barcode:       "6660001",
			Name:          "Hazelnut Syrup 750ml",
			PriceCents:    1100,
			TaxRateBps:    825,
			StockQuantity: 20,
			MinStockAlert: 5,
		}
		body, _ := json.Marshal(payload)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/products", bytes.NewReader(body))
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d. Body: %s", rr.Code, rr.Body.String())
		}
		location := rr.Header().Get("Location")
		if location == "" {
			t.Errorf("expected Location header in 201 response")
		}

		var created domain.Product
		if err := json.Unmarshal(rr.Body.Bytes(), &created); err != nil {
			t.Fatalf("failed to parse created product: %v", err)
		}
		if created.ID == 0 {
			t.Errorf("expected product ID to be set")
		}
	})

	t.Run("PUT /api/v1/products/{id} updates existing product", func(t *testing.T) {
		// First lookup the product created in the previous test
		reqFind, _ := http.NewRequest(http.MethodGet, "/api/v1/products?code=REST-001", nil)
		rrFind := httptest.NewRecorder()
		router.ServeHTTP(rrFind, reqFind)

		var p domain.Product
		_ = json.Unmarshal(rrFind.Body.Bytes(), &p)

		updatePayload := domain.UpdateProductInput{
			Name:          "Hazelnut Syrup 750ml (Vanilla Infused)",
			PriceCents:    1250,
			TaxRateBps:    825,
			MinStockAlert: 8,
		}
		body, _ := json.Marshal(updatePayload)

		reqUpdate, _ := http.NewRequest(http.MethodPut, "/api/v1/products/"+strconv.FormatInt(p.ID, 10), bytes.NewReader(body))
		rrUpdate := httptest.NewRecorder()
		router.ServeHTTP(rrUpdate, reqUpdate)

		if rrUpdate.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d. Body: %s", rrUpdate.Code, rrUpdate.Body.String())
		}
		var updated domain.Product
		_ = json.Unmarshal(rrUpdate.Body.Bytes(), &updated)
		if updated.PriceCents != 1250 {
			t.Errorf("expected updated price 1250, got %d", updated.PriceCents)
		}
	})

	t.Run("POST /api/v1/products/{id}/stock adjusts inventory stock", func(t *testing.T) {
		reqFind, _ := http.NewRequest(http.MethodGet, "/api/v1/products?code=REST-001", nil)
		rrFind := httptest.NewRecorder()
		router.ServeHTTP(rrFind, reqFind)
		var p domain.Product
		_ = json.Unmarshal(rrFind.Body.Bytes(), &p)

		stockPayload := domain.AdjustStockInput{Delta: 15} // restock +15
		body, _ := json.Marshal(stockPayload)

		reqStock, _ := http.NewRequest(http.MethodPost, "/api/v1/products/"+strconv.FormatInt(p.ID, 10)+"/stock", bytes.NewReader(body))
		rrStock := httptest.NewRecorder()
		router.ServeHTTP(rrStock, reqStock)

		if rrStock.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d. Body: %s", rrStock.Code, rrStock.Body.String())
		}
		var adjusted domain.Product
		_ = json.Unmarshal(rrStock.Body.Bytes(), &adjusted)
		if adjusted.StockQuantity != p.StockQuantity+15 {
			t.Errorf("expected %d, got %d", p.StockQuantity+15, adjusted.StockQuantity)
		}
	})

	t.Run("GET /api/v1/products?low_stock=true filters low stock items", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/products?low_stock=true", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rr.Code)
		}
		var products []domain.Product
		if err := json.Unmarshal(rr.Body.Bytes(), &products); err != nil {
			t.Fatalf("failed to parse json: %v", err)
		}
		for _, prod := range products {
			if prod.StockQuantity > prod.MinStockAlert {
				t.Errorf("product %s stock (%d) exceeds min alert (%d)", prod.Name, prod.StockQuantity, prod.MinStockAlert)
			}
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
		cashierID := int64(1)
		cashierName := "Front Desk Cashier"
		payload := domain.CheckoutRequest{
			Items: []domain.CheckoutItemInput{
				{ProductID: product.ID, Quantity: 1},
			},
			Payment: domain.PaymentInput{
				Method:              string(domain.PaymentMethodCash),
				AmountTenderedCents: 2000,
			},
			CashierID:   &cashierID,
			CashierName: cashierName,
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
		if resp.Order.CashierName != cashierName {
			t.Errorf("expected cashier name %s, got %s", cashierName, resp.Order.CashierName)
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

	t.Run("GET /api/v1/orders/recap returns aggregate sales summary", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders/recap", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d. Body: %s", rr.Code, rr.Body.String())
		}
		var recap domain.OrdersRecap
		if err := json.Unmarshal(rr.Body.Bytes(), &recap); err != nil {
			t.Fatalf("failed to parse recap json: %v", err)
		}
		if recap.TotalOrders < 1 {
			t.Errorf("expected at least 1 order, got %d", recap.TotalOrders)
		}
	})

	t.Run("GET /api/v1/orders/{id} returns focused single order recap", func(t *testing.T) {
		// First get the order list
		reqList, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
		rrList := httptest.NewRecorder()
		router.ServeHTTP(rrList, reqList)

		var orders []domain.Order
		_ = json.Unmarshal(rrList.Body.Bytes(), &orders)
		if len(orders) == 0 {
			t.Fatalf("expected orders in list")
		}

		targetOrder := orders[0]
		reqFocused, _ := http.NewRequest(http.MethodGet, "/api/v1/orders/"+targetOrder.ID, nil)
		rrFocused := httptest.NewRecorder()
		router.ServeHTTP(rrFocused, reqFocused)

		if rrFocused.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rrFocused.Code)
		}
		var focused domain.CheckoutResponse
		if err := json.Unmarshal(rrFocused.Body.Bytes(), &focused); err != nil {
			t.Fatalf("failed to parse focused order: %v", err)
		}
		if focused.Order.ReceiptNumber != targetOrder.ReceiptNumber {
			t.Errorf("expected %s, got %s", targetOrder.ReceiptNumber, focused.Order.ReceiptNumber)
		}
		if len(focused.Items) == 0 {
			t.Errorf("expected order items in focused recap")
		}
	})
}

func TestREST_AuthAndUserEndpoints(t *testing.T) {
	router := setupTestRouter(t)

	var token string
	t.Run("POST /api/v1/auth/login with PIN returns token", func(t *testing.T) {
		body, _ := json.Marshal(domain.LoginInput{PIN: "1234"}) // admin PIN
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d. Body: %s", rr.Code, rr.Body.String())
		}
		var authResp domain.AuthResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &authResp); err != nil {
			t.Fatalf("failed to parse auth response: %v", err)
		}
		if authResp.Token == "" {
			t.Errorf("expected non-empty auth token")
		}
		if authResp.User.Role != domain.RoleAdmin {
			t.Errorf("expected admin role, got %s", authResp.User.Role)
		}
		token = authResp.Token
	})

	t.Run("GET /api/v1/auth/me returns active authenticated user", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rr.Code)
		}
		var u domain.User
		if err := json.Unmarshal(rr.Body.Bytes(), &u); err != nil {
			t.Fatalf("failed to parse me json: %v", err)
		}
		if u.Username != "admin" {
			t.Errorf("expected admin username, got %s", u.Username)
		}
	})

	t.Run("GET /api/v1/users lists users", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/users", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rr.Code)
		}
		var users []domain.User
		if err := json.Unmarshal(rr.Body.Bytes(), &users); err != nil {
			t.Fatalf("failed to parse users json: %v", err)
		}
		if len(users) == 0 {
			t.Errorf("expected users list")
		}
	})

	t.Run("POST /api/v1/users creates new staff user", func(t *testing.T) {
		body, _ := json.Marshal(domain.CreateUserInput{
			Username: "cashier99",
			Name:     "Test Staff",
			Role:     domain.RoleCashier,
			PIN:      "9999",
		})
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/users", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d. Body: %s", rr.Code, rr.Body.String())
		}
		if rr.Header().Get("Location") == "" {
			t.Errorf("expected Location header in 201 response")
		}
	})
}

func TestREST_SPASubpathFallback(t *testing.T) {
	mockFS := fstest.MapFS{
		"index.html": {Data: []byte("<!doctype html><html><body>POSIX SPA</body></html>")},
		"assets/app.js": {Data: []byte("console.log('posix');")},
	}

	db, _ := database.InitDB(":memory:")
	productRepo := sqlite.NewProductRepository(db)
	orderRepo := sqlite.NewOrderRepository(db)
	userRepo := sqlite.NewUserRepository(db)
	transactor := sqlite.NewTransactor(db)
	paymentRegistry := payment.DefaultRegistry()

	productService := service.NewProductService(productRepo)
	orderService := service.NewOrderService(orderRepo, productRepo, transactor, paymentRegistry)
	authService := service.NewAuthService(userRepo)
	userService := service.NewUserService(userRepo)

	router := api.NewRouter(productService, orderService, authService, userService, mockFS)

	subpaths := []string{"/inventory", "/history", "/users", "/register"}
	for _, path := range subpaths {
		t.Run("direct load "+path+" returns index.html", func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodGet, path, nil)
			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			if rr.Code != http.StatusOK {
				t.Fatalf("expected 200 OK for %s, got %d", path, rr.Code)
			}
			if !bytes.Contains(rr.Body.Bytes(), []byte("POSIX SPA")) {
				t.Errorf("expected body to contain POSIX SPA, got: %s", rr.Body.String())
			}
		})
	}

	t.Run("static asset file is served directly", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/assets/app.js", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK for asset, got %d", rr.Code)
		}
		if !bytes.Contains(rr.Body.Bytes(), []byte("console.log")) {
			t.Errorf("expected asset contents, got: %s", rr.Body.String())
		}
	})
}
