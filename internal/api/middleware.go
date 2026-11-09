package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/service"
)

type contextKey string

const userContextKey contextKey = "posix_user"

// GetAuthenticatedUser extracts the authenticated user from request context.
func GetAuthenticatedUser(r *http.Request) *domain.User {
	val := r.Context().Value(userContextKey)
	if val == nil {
		return nil
	}
	u, ok := val.(*domain.User)
	if !ok {
		return nil
	}
	return u
}

// Authenticate extracts Bearer token, validates it, and injects user into context.
func Authenticate(authSvc *service.AuthService, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing or invalid Authorization header")
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		user, err := authSvc.ValidateToken(token)
		if err != nil {
			respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired session token")
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, user)
		next(w, r.WithContext(ctx))
	}
}

// RequireRole guards an endpoint to specific RBAC roles (e.g. admin, manager).
func RequireRole(authSvc *service.AuthService, allowedRoles []domain.Role, next http.HandlerFunc) http.HandlerFunc {
	return Authenticate(authSvc, func(w http.ResponseWriter, r *http.Request) {
		user := GetAuthenticatedUser(r)
		if user == nil {
			respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
			return
		}

		hasRole := false
		for _, r := range allowedRoles {
			if user.Role == r {
				hasRole = true
				break
			}
		}

		if !hasRole {
			respondError(w, http.StatusForbidden, "FORBIDDEN", "Insufficient role permissions for this action")
			return
		}

		next(w, r)
	})
}
