package service_test

import (
	"context"
	"testing"

	"github.com/davidyusaku-13/posix/internal/database"
	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
	"github.com/davidyusaku-13/posix/internal/service"
)

func setupAuthServices(t *testing.T) (*service.AuthService, *service.UserService) {
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}

	userRepo := sqlite.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	authService := service.NewAuthService(userRepo)

	return authService, userService
}

func TestAuthService_Login(t *testing.T) {
	ctx := context.Background()
	authService, userService := setupAuthServices(t)

	t.Run("login with cashier PIN", func(t *testing.T) {
		res, err := authService.Login(ctx, domain.LoginInput{PIN: "0000"})
		if err != nil {
			t.Fatalf("expected successful cashier PIN login: %v", err)
		}
		if res.User.Role != domain.RoleCashier {
			t.Errorf("expected cashier role, got %s", res.User.Role)
		}
		if res.Token == "" {
			t.Errorf("expected non-empty token")
		}

		// Verify token
		user, err := authService.ValidateToken(res.Token)
		if err != nil {
			t.Fatalf("failed to validate token: %v", err)
		}
		if user.ID != res.User.ID {
			t.Errorf("expected user ID %d, got %d", res.User.ID, user.ID)
		}
	})

	t.Run("login with admin username & password", func(t *testing.T) {
		res, err := authService.Login(ctx, domain.LoginInput{
			Username: "admin",
			Password: "admin123",
		})
		if err != nil {
			t.Fatalf("expected successful admin login: %v", err)
		}
		if res.User.Role != domain.RoleAdmin {
			t.Errorf("expected admin role, got %s", res.User.Role)
		}
	})

	t.Run("invalid PIN rejected", func(t *testing.T) {
		_, err := authService.Login(ctx, domain.LoginInput{PIN: "9999"})
		if err != service.ErrInvalidCredentials {
			t.Fatalf("expected ErrInvalidCredentials, got %v", err)
		}
	})

	t.Run("create user and login with new PIN", func(t *testing.T) {
		created, err := userService.CreateUser(ctx, domain.CreateUserInput{
			Username: "johndoe",
			Name:     "John Doe",
			Role:     domain.RoleCashier,
			PIN:      "4321",
		})
		if err != nil {
			t.Fatalf("failed to create user: %v", err)
		}
		if created.Username != "johndoe" {
			t.Errorf("expected johndoe, got %s", created.Username)
		}

		res, err := authService.Login(ctx, domain.LoginInput{PIN: "4321"})
		if err != nil {
			t.Fatalf("failed to login with newly created PIN: %v", err)
		}
		if res.User.Username != "johndoe" {
			t.Errorf("expected johndoe, got %s", res.User.Username)
		}
	})
}
