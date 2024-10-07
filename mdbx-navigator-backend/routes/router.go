package routes

import (
	"github.com/erigontech/mdbx-go/mdbx"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/wmitsuda/mdbx-navigator-svc/mdbxnav"
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

	return r, nil
}
