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
	productRepo := sqlite.NewProductRepository(db)
	orderRepo := sqlite.NewOrderRepository(db)
	transactor := sqlite.NewTransactor(db)
	paymentRegistry := payment.DefaultRegistry()

	productSvc := service.NewProductService(productRepo)
	orderSvc := service.NewOrderService(orderRepo, productRepo, transactor, paymentRegistry)

	router := api.NewRouter(productSvc, orderSvc, posix.StaticFS())

	addr := fmt.Sprintf(":%s", *port)
	log.Printf("==============================================")
	log.Printf("  POSIX — Point of Sale Interactive eXperience")
	log.Printf("  Listening on http://localhost%s", addr)
	log.Printf("==============================================")

	if err := http.ListenAndServe(addr, router); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server stopped unexpectedly: %v", err)
	}
}
