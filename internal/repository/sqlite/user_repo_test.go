package sqlite_test

import (
	"context"
	"testing"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository/sqlite"
)

func TestUserRepository(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	ctx := context.Background()
	userRepo := sqlite.NewUserRepository(db)

	t.Run("default seeded users exist", func(t *testing.T) {
		users, err := userRepo.List(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(users) == 0 {
			t.Fatalf("expected seeded users, got 0")
		}

		admin, err := userRepo.FindByUsername(ctx, "admin")
		if err != nil {
			t.Fatalf("expected admin user, got error: %v", err)
		}
		if admin.Role != domain.RoleAdmin {
			t.Errorf("expected role admin, got %s", admin.Role)
		}
	})

	t.Run("create, update, and find user", func(t *testing.T) {
		newUser := &domain.User{
			Username:     "cashier2",
			Name:         "Sarah Cashier",
			Role:         domain.RoleCashier,
			PinHash:      "$2a$10$dummyhash...",
			PasswordHash: "",
			Active:       true,
		}

		created, err := userRepo.Create(ctx, newUser)
		if err != nil {
			t.Fatalf("failed to create user: %v", err)
		}
		if created.ID == 0 {
			t.Errorf("expected non-zero ID")
		}

		// Update
		created.Name = "Sarah Senior Cashier"
		created.Role = domain.RoleManager
		updated, err := userRepo.Update(ctx, created)
		if err != nil {
			t.Fatalf("failed to update user: %v", err)
		}
		if updated.Name != "Sarah Senior Cashier" {
			t.Errorf("expected updated name, got %s", updated.Name)
		}
		if updated.Role != domain.RoleManager {
			t.Errorf("expected role manager, got %s", updated.Role)
		}
	})
}
