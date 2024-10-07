package routes

import (
	"io/fs"
	"net/http"

	"github.com/erigontech/mdbx-go/mdbx"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/wmitsuda/mdbx-navigator/mdbxnav"
	"github.com/wmitsuda/mdbx-navigator/web"
)

type Backend struct {
	Env         *mdbx.Env
	Tables      map[string]*mdbxnav.Table
	ValueLength uint
}

func (be *Backend) CreateRouter() (chi.Router, error) {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	corsConfig := cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET"},
		MaxAge:         300,
	})
	r.Use(corsConfig)

	r.Get("/api/tables", be.AllTables)
	r.Get("/api/table/{table}/forward", be.TableForward)
	r.Get("/api/table/{table}/backward", be.TableBackward)
	r.Get("/api/table/{table}/search", be.TableSearch)
	r.Get("/api/table/{table}/value", be.GetValue)

	dir, err := fs.Sub(web.FS, "build/client")
	if err != nil {
		return nil, err
	}
	r.Handle("/*", http.FileServer(http.FS(dir)))

	return r, nil
}
