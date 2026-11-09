package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/service"
)

type NotificationHandler struct {
	svc *service.NotificationService
}

func NewNotificationHandler(svc *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

// HandleConfig routes GET and PUT /api/v1/notifications/config.
func (h *NotificationHandler) HandleConfig(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		respondError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "notifications service is not configured")
		return
	}

	switch r.Method {
	case http.MethodGet:
		cfg, err := h.svc.GetConfig(r.Context())
		if err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		respondJSON(w, http.StatusOK, cfg)

	case http.MethodPut:
		var input domain.UpdateNotificationConfigInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			respondError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "invalid request json body")
			return
		}

		cfg, err := h.svc.UpdateConfig(r.Context(), input)
		if err != nil {
			if errors.Is(err, domain.ErrInvalidPhoneNumber) {
				respondError(w, http.StatusUnprocessableEntity, "INVALID_PHONE_NUMBER", err.Error())
				return
			}
			respondError(w, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
			return
		}
		respondJSON(w, http.StatusOK, cfg)

	default:
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
	}
}

// HandleStatus routes GET /api/v1/notifications/status.
func (h *NotificationHandler) HandleStatus(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		respondJSON(w, http.StatusOK, domain.WhatsAppStatus{
			Status: "disconnected",
			Error:  "notification service disabled",
		})
		return
	}

	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	status, err := h.svc.GetStatus(r.Context())
	if err != nil {
		respondJSON(w, http.StatusOK, domain.WhatsAppStatus{
			Status: "disconnected",
			Error:  err.Error(),
		})
		return
	}

	respondJSON(w, http.StatusOK, status)
}

type testNotificationInput struct {
	Phone string `json:"phone,omitempty"`
}

// HandleTest routes POST /api/v1/notifications/test.
func (h *NotificationHandler) HandleTest(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		respondError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "notifications service is not configured")
		return
	}

	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	var input testNotificationInput
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&input)
	}

	if err := h.svc.SendTestNotification(r.Context(), input.Phone); err != nil {
		if errors.Is(err, domain.ErrInvalidPhoneNumber) {
			respondError(w, http.StatusUnprocessableEntity, "INVALID_PHONE_NUMBER", err.Error())
			return
		}
		respondError(w, http.StatusUnprocessableEntity, "DELIVERY_FAILED", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"status":  "success",
		"message": "test notification successfully dispatched",
	})
}

// HandleDisconnect routes POST /api/v1/notifications/disconnect.
func (h *NotificationHandler) HandleDisconnect(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		respondJSON(w, http.StatusOK, map[string]string{"status": "disconnected"})
		return
	}

	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	_ = h.svc.Disconnect(r.Context())
	respondJSON(w, http.StatusOK, map[string]string{
		"status":  "disconnected",
		"message": "whatsapp session terminated",
	})
}

// HandleLogs routes GET /api/v1/notifications/logs.
func (h *NotificationHandler) HandleLogs(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		respondJSON(w, http.StatusOK, []any{})
		return
	}

	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	limit := 50
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			limit = l
		}
	}

	logs, err := h.svc.ListLogs(r.Context(), limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "LOGS_QUERY_FAILED", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, logs)
}
