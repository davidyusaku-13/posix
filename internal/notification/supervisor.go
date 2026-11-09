package notification

import (
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// BridgeSupervisor manages the lifecycle of the local Baileys WhatsApp bridge child process.
type BridgeSupervisor struct {
	cmd       *exec.Cmd
	bridgeURL string
	doneChan  chan struct{}
}

// StartSupervisedBridge checks if the WhatsApp bridge is already running on bridgeURL.
// If not, and if bridgeDir exists and bun/node is available, it starts the bridge as a child process.
func StartSupervisedBridge(bridgeDir, bridgeURL string) *BridgeSupervisor {
	if os.Getenv("POSIX_DISABLE_WHATSAPP_SUPERVISOR") == "true" {
		return nil
	}

	if bridgeURL == "" {
		bridgeURL = "http://127.0.0.1:8081"
	}
	bridgeURL = strings.TrimRight(bridgeURL, "/")

	// 1. Check if bridge is already running externally
	client := &http.Client{Timeout: 800 * time.Millisecond}
	resp, err := client.Get(bridgeURL + "/status")
	if err == nil {
		resp.Body.Close()
		log.Printf("[Supervisor] WhatsApp bridge is already running at %s", bridgeURL)
		return nil
	}

	// 2. Check if bridge directory and entrypoint exist
	entrypoint := filepath.Join(bridgeDir, "index.ts")
	if _, err := os.Stat(entrypoint); os.IsNotExist(err) {
		return nil
	}

	// 3. Find runtime (prefer bun, fallback to node)
	runtimeBin, err := exec.LookPath("bun")
	useBun := true
	if err != nil {
		runtimeBin, err = exec.LookPath("node")
		useBun = false
		if err != nil {
			log.Printf("[Supervisor] Note: Neither 'bun' nor 'node' found in PATH. WhatsApp bridge will not auto-start.")
			return nil
		}
	}

	var cmd *exec.Cmd
	if useBun {
		cmd = exec.Command(runtimeBin, "run", entrypoint)
	} else {
		cmd = exec.Command(runtimeBin, entrypoint)
	}

	cmd.Dir = bridgeDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		log.Printf("[Supervisor] Failed to start WhatsApp bridge: %v", err)
		return nil
	}

	log.Printf("[Supervisor] Auto-started WhatsApp bridge (PID: %d, runtime: %s)", cmd.Process.Pid, filepath.Base(runtimeBin))

	supervisor := &BridgeSupervisor{
		cmd:       cmd,
		bridgeURL: bridgeURL,
		doneChan:  make(chan struct{}),
	}

	go func() {
		_ = cmd.Wait()
		close(supervisor.doneChan)
	}()

	// Wait up to 3s for bridge to respond to /status
	for i := 0; i < 15; i++ {
		time.Sleep(200 * time.Millisecond)
		resp, err := client.Get(bridgeURL + "/status")
		if err == nil {
			resp.Body.Close()
			log.Printf("[Supervisor] WhatsApp bridge is ready at %s", bridgeURL)
			break
		}
	}

	return supervisor
}

// Stop cleanly terminates the child process using SIGINT, with a timeout before SIGKILL.
func (s *BridgeSupervisor) Stop() {
	if s == nil || s.cmd == nil || s.cmd.Process == nil {
		return
	}

	log.Printf("[Supervisor] Terminating WhatsApp bridge (PID: %d)...", s.cmd.Process.Pid)
	_ = s.cmd.Process.Signal(os.Interrupt)

	select {
	case <-s.doneChan:
		log.Println("[Supervisor] WhatsApp bridge stopped cleanly.")
	case <-time.After(3 * time.Second):
		log.Printf("[Supervisor] WhatsApp bridge did not stop in time, forcing kill...")
		_ = s.cmd.Process.Kill()
	}
}
