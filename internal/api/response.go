package api

import (
	"encoding/json"
	"net/http"
)

// ErrorDetail represents the structured error schema for REST responses.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

// ErrorResponse wraps ErrorDetail for clean standardized JSON serialization.
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// respondJSON writes JSON response with appropriate status code and Content-Type header.
func respondJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

// respondError writes a structured ErrorResponse according to REST best practices.
func respondError(w http.ResponseWriter, statusCode int, code, message string) {
	respondJSON(w, statusCode, ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}
