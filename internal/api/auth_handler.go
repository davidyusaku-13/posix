package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/service"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

// HandleLogin handles POST /api/v1/auth/login
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only POST allowed")
		return
	}

	var input domain.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid JSON request body")
		return
	}

	resp, err := h.authSvc.Login(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			respondError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid PIN or username/password")
			return
		}
		if errors.Is(err, service.ErrInactiveUser) {
			respondError(w, http.StatusForbidden, "INACTIVE_ACCOUNT", "User account is deactivated")
			return
		}
		respondError(w, http.StatusBadRequest, "LOGIN_FAILED", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

// HandleMe handles GET /api/v1/auth/me
func (h *AuthHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only GET allowed")
		return
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing authorization header")
		return
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")
	user, err := h.authSvc.ValidateToken(token)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired session")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

// HandleLogout handles POST /api/v1/auth/logout
func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		h.authSvc.InvalidateToken(token)
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}
