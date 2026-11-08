package posix

import (
	"embed"
	"io/fs"
)

//go:embed all:frontend/dist
var frontendDist embed.FS

// StaticFS returns the embedded frontend filesystem sub-rooted at "frontend/dist".
func StaticFS() fs.FS {
	sub, err := fs.Sub(frontendDist, "frontend/dist")
	if err != nil {
		return nil
	}
	return sub
}
