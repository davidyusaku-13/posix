package notification_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/davidyusaku-13/posix/internal/notification"
)

func TestSupervisor_AlreadyRunningBridge(t *testing.T) {
	// Mock an already-running bridge
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/status" {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"connected"}`))
		}
	}))
	defer server.Close()

	// Should detect existing bridge and not spawn anything
	supervisor := notification.StartSupervisedBridge("nonexistent", server.URL)
	if supervisor != nil {
		t.Errorf("expected supervisor to be nil when bridge is already running, got non-nil")
		supervisor.Stop()
	}
}

func TestSupervisor_DisabledViaEnv(t *testing.T) {
	os.Setenv("POSIX_DISABLE_WHATSAPP_SUPERVISOR", "true")
	defer os.Unsetenv("POSIX_DISABLE_WHATSAPP_SUPERVISOR")

	supervisor := notification.StartSupervisedBridge("bridge/whatsapp", "http://127.0.0.1:9999")
	if supervisor != nil {
		t.Errorf("expected nil supervisor when disabled via env")
		supervisor.Stop()
	}
}

func TestSupervisor_NonExistentDirectory(t *testing.T) {
	supervisor := notification.StartSupervisedBridge("non_existent_path_xyz", "http://127.0.0.1:9999")
	if supervisor != nil {
		t.Errorf("expected nil supervisor for missing directory, got non-nil")
		supervisor.Stop()
	}
}
