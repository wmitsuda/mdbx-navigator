package routes

import (
	"encoding/json"
	"net/http"
	"slices"
	"strings"

	"github.com/wmitsuda/mdbx-navigator/mdbxnav"
)

// Returns the preloaded table schema sorted byy table name
func (be *Backend) AllTables(w http.ResponseWriter, r *http.Request) {
	ret := make([]*mdbxnav.Table, 0, len(be.Tables))
	for _, t := range be.Tables {
		ret = append(ret, t)
	}
	slices.SortFunc(ret, func(a, b *mdbxnav.Table) int {
		return strings.Compare(a.Name, b.Name)
	})

	if err := json.NewEncoder(w).Encode(ret); err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
}
