package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrDuplicateUsername = errors.New("username is already taken")
	ErrInvalidUserData   = errors.New("invalid user data")
)

type UserService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) ListUsers(ctx context.Context) ([]domain.User, error) {
	return s.repo.List(ctx)
}

func (s *UserService) GetUserByID(ctx context.Context, id int64) (*domain.User, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *UserService) CreateUser(ctx context.Context, input domain.CreateUserInput) (*domain.User, error) {
	username := strings.ToLower(strings.TrimSpace(input.Username))
	name := strings.TrimSpace(input.Name)

	if username == "" {
		return nil, fmt.Errorf("%w: username cannot be empty", ErrInvalidUserData)
	}
	if name == "" {
		return nil, fmt.Errorf("%w: name cannot be empty", ErrInvalidUserData)
	}
	if input.Role != domain.RoleCashier && input.Role != domain.RoleManager && input.Role != domain.RoleAdmin {
		return nil, fmt.Errorf("%w: invalid role '%s'", ErrInvalidUserData, input.Role)
	}

	if existing, _ := s.repo.FindByUsername(ctx, username); existing != nil {
		return nil, ErrDuplicateUsername
	}

	var pinHash string
	if strings.TrimSpace(input.PIN) != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(strings.TrimSpace(input.PIN)), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash PIN: %w", err)
		}
		pinHash = string(hash)
	}

	var passwordHash string
	if strings.TrimSpace(input.Password) != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash password: %w", err)
		}
		passwordHash = string(hash)
	}

	u := &domain.User{
		Username:     username,
		Name:         name,
		Role:         input.Role,
		PinHash:      pinHash,
		PasswordHash: passwordHash,
		Active:       true,
	}

	return s.repo.Create(ctx, u)
}

func (s *UserService) UpdateUser(ctx context.Context, id int64, input domain.UpdateUserInput) (*domain.User, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(input.Name) != "" {
		existing.Name = strings.TrimSpace(input.Name)
	}

	if input.Role != "" {
		if input.Role != domain.RoleCashier && input.Role != domain.RoleManager && input.Role != domain.RoleAdmin {
			return nil, fmt.Errorf("%w: invalid role '%s'", ErrInvalidUserData, input.Role)
		}
		existing.Role = input.Role
	}

	if strings.TrimSpace(input.PIN) != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(strings.TrimSpace(input.PIN)), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash PIN: %w", err)
		}
		existing.PinHash = string(hash)
	}

	if strings.TrimSpace(input.Password) != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash password: %w", err)
		}
		existing.PasswordHash = string(hash)
	}

	if input.Active != nil {
		existing.Active = *input.Active
	}

	return s.repo.Update(ctx, existing)
}

func (s *UserService) DeleteUser(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
