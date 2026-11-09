package api

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/davidyusaku-13/posix/internal/service"
)

// NewRouter constructs the HTTP handler conforming to RESTful conventions.
func NewRouter(
	productSvc *service.ProductService,
	orderSvc *service.OrderService,
	authSvc *service.AuthService,
	userSvc *service.UserService,
	notifSvc *service.NotificationService,
	staticFS fs.FS,
) http.Handler {
	productHandler := NewProductHandler(productSvc)
	orderHandler := NewOrderHandler(orderSvc)
	authHandler := NewAuthHandler(authSvc)
	userHandler := NewUserHandler(userSvc)
	notifHandler := NewNotificationHandler(notifSvc)

	mux := http.NewServeMux()

	// REST v1 Endpoints
	mux.HandleFunc("/api/v1/auth/login", authHandler.HandleLogin)
	mux.HandleFunc("/api/v1/auth/me", authHandler.HandleMe)
	mux.HandleFunc("/api/v1/auth/logout", authHandler.HandleLogout)

	mux.HandleFunc("/api/v1/users/", userHandler.HandleUsers)
	mux.HandleFunc("/api/v1/users", userHandler.HandleUsers)

	mux.HandleFunc("/api/v1/products/", productHandler.HandleProducts)
	mux.HandleFunc("/api/v1/products", productHandler.HandleProducts)
	mux.HandleFunc("/api/v1/orders/", orderHandler.HandleOrders)
	mux.HandleFunc("/api/v1/orders", orderHandler.HandleOrders)

	mux.HandleFunc("/api/v1/notifications/config", notifHandler.HandleConfig)
	mux.HandleFunc("/api/v1/notifications/status", notifHandler.HandleStatus)
	mux.HandleFunc("/api/v1/notifications/test", notifHandler.HandleTest)
	mux.HandleFunc("/api/v1/notifications/disconnect", notifHandler.HandleDisconnect)
	mux.HandleFunc("/api/v1/notifications/logs", notifHandler.HandleLogs)

	mux.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]string{
			"status": "healthy",
			"system": "POSIX",
		})
	})

	// Static SPA File Server (when staticFS is provided)
	var staticHandler http.Handler
	if staticFS != nil {
		fileServer := http.FileServer(http.FS(staticFS))
		staticHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/")
			if path == "" {
				fileServer.ServeHTTP(w, r)
				return
			}
			f, err := staticFS.Open(path)
			if err != nil {
				// Fallback to index.html for SPA subpaths (/register, /inventory, /history, /users)
				indexData, readErr := fs.ReadFile(staticFS, "index.html")
				if readErr != nil {
					http.NotFound(w, r)
					return
				}
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(http.StatusOK)
				w.Write(indexData)
				return
			}
			f.Close()
			fileServer.ServeHTTP(w, r)
		})
	}

	// Root dispatcher with CORS middleware
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// CORS headers for local dev environment
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Location")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if strings.HasPrefix(r.URL.Path, "/api/") {
			mux.ServeHTTP(w, r)
			return
		}

		if staticHandler != nil {
			staticHandler.ServeHTTP(w, r)
			return
		}

		mux.ServeHTTP(w, r)
	})
}
