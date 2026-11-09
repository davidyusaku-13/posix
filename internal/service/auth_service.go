package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInactiveUser       = errors.New("user account is deactivated")
	ErrUnauthorized       = errors.New("unauthorized")
)

type session struct {
	user      domain.User
	expiresAt time.Time
}

type AuthService struct {
	userRepo repository.UserRepository
	mu       sync.RWMutex
	sessions map[string]session
}

func NewAuthService(userRepo repository.UserRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		sessions: make(map[string]session),
	}
}

func (s *AuthService) Login(ctx context.Context, input domain.LoginInput) (*domain.AuthResponse, error) {
	var matchedUser *domain.User

	// 1. PIN-based fast authentication
	if strings.TrimSpace(input.PIN) != "" {
		pin := strings.TrimSpace(input.PIN)
		users, err := s.userRepo.List(ctx)
		if err != nil {
			return nil, err
		}

		for _, u := range users {
			if !u.Active || u.PinHash == "" {
				continue
			}
			if err := bcrypt.CompareHashAndPassword([]byte(u.PinHash), []byte(pin)); err == nil {
				matchedUser = &u
				break
			}
		}

		if matchedUser == nil {
			return nil, ErrInvalidCredentials
		}
	} else if strings.TrimSpace(input.Username) != "" && input.Password != "" {
		// 2. Username & Password authentication
		u, err := s.userRepo.FindByUsername(ctx, strings.TrimSpace(input.Username))
		if err != nil || u.PasswordHash == "" {
			return nil, ErrInvalidCredentials
		}
		if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(input.Password)); err != nil {
			return nil, ErrInvalidCredentials
		}
		if !u.Active {
			return nil, ErrInactiveUser
		}
		matchedUser = u
	} else {
		return nil, fmt.Errorf("%w: either PIN or username and password must be provided", ErrInvalidCredentials)
	}

	token := generateSecureToken()

	s.mu.Lock()
	s.sessions[token] = session{
		user:      *matchedUser,
		expiresAt: time.Now().Add(24 * time.Hour),
	}
	s.mu.Unlock()

	return &domain.AuthResponse{
		Token: token,
		User:  *matchedUser,
	}, nil
}

func (s *AuthService) ValidateToken(token string) (*domain.User, error) {
	s.mu.RLock()
	sess, exists := s.sessions[token]
	s.mu.RUnlock()

	if !exists || time.Now().After(sess.expiresAt) {
		return nil, ErrUnauthorized
	}
	return &sess.user, nil
}

func (s *AuthService) InvalidateToken(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, token)
}

func generateSecureToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
