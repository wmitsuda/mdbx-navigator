package routes

import (
	"github.com/erigontech/mdbx-go/mdbx"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
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

	r.Get("/tables", be.AllTables)
	r.Get("/table/{table}/forward", be.TableForward)
	r.Get("/table/{table}/backward", be.TableBackward)
	r.Get("/table/{table}/search", be.TableSearch)
	r.Get("/table/{table}/value", be.GetValue)

	return r, nil
}
