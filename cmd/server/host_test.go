package main

import (
	"os"
	"testing"
)

func TestResolveDisplayHost(t *testing.T) {
	t.Run("returns custom POSIX_HOST override", func(t *testing.T) {
		custom := "pos-terminal-01"
		os.Setenv("POSIX_HOST", custom)
		defer os.Unsetenv("POSIX_HOST")

		host := resolveDisplayHost()
		if host != custom {
			t.Errorf("expected %q, got %q", custom, host)
		}
	})

	t.Run("returns non-empty hostname when override is unset", func(t *testing.T) {
		os.Unsetenv("POSIX_HOST")

		host := resolveDisplayHost()
		if host == "" {
			t.Errorf("expected non-empty host")
		}
	})
}
