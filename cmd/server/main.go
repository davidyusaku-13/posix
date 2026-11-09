package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/davidyusaku-13/posix"
	"github.com/davidyusaku-13/posix/internal/api"
	"github.com/davidyusaku-13/posix/internal/database"
	"github.com/davidyusaku-13/posix/internal/notification"
	"github.com/davidyusaku-13/posix/internal/payment"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
	"github.com/davidyusaku-13/posix/internal/service"
)

func main() {
	port := flag.String("port", "8080", "Port to listen on")
	dbPath := flag.String("db", "posix.db", "SQLite database file path")
	flag.Parse()

	if envPort := os.Getenv("PORT"); envPort != "" {
		*port = envPort
	}
	if envDB := os.Getenv("POSIX_DB"); envDB != "" {
		*dbPath = envDB
	}

	log.Printf("Initializing POSIX database at: %s", *dbPath)
	db, err := database.InitDB(*dbPath)
	if err != nil {
		log.Fatalf("Fatal: Database initialization error: %v", err)
	}
	defer db.Close()

	// Dependency Inversion wiring: Concrete SQLite repos -> Services -> Router
	userRepo := sqlite.NewUserRepository(db)
	productRepo := sqlite.NewProductRepository(db)
	orderRepo := sqlite.NewOrderRepository(db)
	notifRepo := sqlite.NewNotificationRepository(db)
	transactor := sqlite.NewTransactor(db)
	paymentRegistry := payment.DefaultRegistry()

	// Notification Transport via Baileys WhatsApp Bridge
	bridgeURL := os.Getenv("POSIX_WHATSAPP_BRIDGE_URL")
	if bridgeURL == "" {
		bridgeURL = "http://127.0.0.1:8081"
	}
	baileysNotifier := notification.NewBaileysClient(bridgeURL)
	notifSvc := service.NewNotificationService(notifRepo, baileysNotifier)

	productSvc := service.NewProductService(productRepo, service.WithProductNotificationService(notifSvc))
	orderSvc := service.NewOrderService(orderRepo, productRepo, transactor, paymentRegistry, service.WithOrderNotificationService(notifSvc))
	authSvc := service.NewAuthService(userRepo)
	userSvc := service.NewUserService(userRepo)

	router := api.NewRouter(productSvc, orderSvc, authSvc, userSvc, notifSvc, posix.StaticFS())

	addr := fmt.Sprintf(":%s", *port)
	log.Printf("==============================================")
	log.Printf("  POSIX — Point of Sale")
	log.Printf("  Listening on http://localhost%s", addr)
	log.Printf("==============================================")

	if err := http.ListenAndServe(addr, router); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server stopped unexpectedly: %v", err)
	}
}
