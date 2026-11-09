package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/service"
)

type UserHandler struct {
	userSvc *service.UserService
}

func NewUserHandler(userSvc *service.UserService) *UserHandler {
	return &UserHandler{userSvc: userSvc}
}

// HandleUsers routes collection /api/v1/users and item /api/v1/users/{id}
func (h *UserHandler) HandleUsers(w http.ResponseWriter, r *http.Request) {
	subpath := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/users"), "/")

	if subpath == "" {
		switch r.Method {
		case http.MethodGet:
			h.listUsers(w, r)
		case http.MethodPost:
			h.createUser(w, r)
		default:
			respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		}
		return
	}

	id, err := strconv.ParseInt(subpath, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_ID", "User ID must be an integer")
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getUser(w, r, id)
	case http.MethodPut:
		h.updateUser(w, r, id)
	case http.MethodDelete:
		h.deleteUser(w, r, id)
	default:
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
	}
}

func (h *UserHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userSvc.ListUsers(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, users)
}

func (h *UserHandler) getUser(w http.ResponseWriter, r *http.Request, id int64) {
	user, err := h.userSvc.GetUserByID(r.Context(), id)
	if errors.Is(err, domain.ErrProductNotFound) {
		respondError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, user)
}

func (h *UserHandler) createUser(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid JSON request body")
		return
	}

	user, err := h.userSvc.CreateUser(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidUserData) {
			respondError(w, http.StatusBadRequest, "INVALID_USER_DATA", err.Error())
			return
		}
		if errors.Is(err, service.ErrDuplicateUsername) {
			respondError(w, http.StatusConflict, "DUPLICATE_USERNAME", err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	w.Header().Set("Location", fmt.Sprintf("/api/v1/users/%d", user.ID))
	respondJSON(w, http.StatusCreated, user)
}

func (h *UserHandler) updateUser(w http.ResponseWriter, r *http.Request, id int64) {
	var input domain.UpdateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid JSON request body")
		return
	}

	user, err := h.userSvc.UpdateUser(r.Context(), id, input)
	if errors.Is(err, domain.ErrProductNotFound) {
		respondError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
		return
	}
	if errors.Is(err, service.ErrInvalidUserData) {
		respondError(w, http.StatusBadRequest, "INVALID_USER_DATA", err.Error())
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, user)
}

func (h *UserHandler) deleteUser(w http.ResponseWriter, r *http.Request, id int64) {
	if err := h.userSvc.DeleteUser(r.Context(), id); err != nil {
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"})
}
