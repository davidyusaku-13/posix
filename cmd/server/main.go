package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"
	"time"

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

	// Auto-supervise Baileys Bridge if runtime is present
	bridgeDir := os.Getenv("POSIX_WHATSAPP_BRIDGE_DIR")
	if bridgeDir == "" {
		bridgeDir = "bridge/whatsapp"
	}
	supervisor := notification.StartSupervisedBridge(bridgeDir, bridgeURL)
	if supervisor != nil {
		defer supervisor.Stop()
	}

	addr := fmt.Sprintf(":%s", *port)
	server := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	// Graceful shutdown listener (Ctrl+C / SIGINT / SIGTERM)
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-stopChan
		log.Println("\nShutting down POSIX server...")
		if supervisor != nil {
			supervisor.Stop()
		}
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	displayHost := resolveDisplayHost()
	log.Printf("==============================================")
	log.Printf("  POSIX — Point of Sale")
	log.Printf("  Listening on http://%s%s", displayHost, addr)
	log.Printf("==============================================")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server stopped unexpectedly: %v", err)
	}
}

// resolveDisplayHost detects Tailscale hostname, system hostname, or POSIX_HOST override.
func resolveDisplayHost() string {
	if custom := os.Getenv("POSIX_HOST"); custom != "" {
		return custom
	}

	// 1. Try tailscale status --json
	if tailscaleBin, err := exec.LookPath("tailscale"); err == nil {
		ctx, cancel := context.WithTimeout(context.Background(), 800*time.Millisecond)
		defer cancel()
		out, err := exec.CommandContext(ctx, tailscaleBin, "status", "--json").Output()
		if err == nil {
			var tsStatus struct {
				Self struct {
					HostName string `json:"HostName"`
				} `json:"Self"`
			}
			if err := json.Unmarshal(out, &tsStatus); err == nil && tsStatus.Self.HostName != "" {
				return strings.ToLower(tsStatus.Self.HostName)
			}
		}
	}

	// 2. Fallback to system hostname
	if h, err := os.Hostname(); err == nil && h != "" {
		return strings.ToLower(h)
	}

	return "localhost"
}
