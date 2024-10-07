package routes

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/erigontech/mdbx-go/mdbx"
	"github.com/go-chi/chi/v5"
	"github.com/wmitsuda/mdbx-navigator/mdbxnav"
)

func (be *Backend) GetValue(w http.ResponseWriter, r *http.Request) {
	tableName := chi.URLParam(r, "table")
	log.Printf("table: %s", tableName)

	keyBytes, dupIdxInt, err := readKey(w, r)
	if err != nil {
		// readKey already sent err 500
		return
	}

	if err := be.Env.View(func(txn *mdbx.Txn) error {
		tableDBI, err := txn.OpenDBISimple(tableName, 0)
		if err != nil {
			return err
		}
		defer be.Env.CloseDBI(tableDBI)

		cursor, err := txn.OpenCursor(tableDBI)
		if err != nil {
			return err
		}
		defer cursor.Close()

		// Fimnd exact key
		log.Printf("%s", hex.EncodeToString(keyBytes))
		k, v, err := cursor.Get(keyBytes, nil, mdbx.Set)
		if err != nil {
			if mdbx.IsNotFound(err) {
				if err := json.NewEncoder(w).Encode([]*mdbxnav.KVResult{}); err != nil {
					return err
				}
				return nil
			}
			return err
		}

		// Advances dup keys
		for i := 0; i < dupIdxInt; i++ {
			k, v, err = cursor.Get(nil, nil, mdbx.Next)
			if err != nil {
				if mdbx.IsNotFound(err) {
					if err := json.NewEncoder(w).Encode([]*mdbxnav.KVResult{}); err != nil {
						return err
					}
					return nil
				}
				return err
			}
		}

		// Check if it is still the same key (otherwise asked for non-existent dup idx)
		if !bytes.Equal(keyBytes, k) {
			http.Error(w, fmt.Sprintf("Key not found: %s", tableName), http.StatusNotFound)
			return nil
		}

		ret := &mdbxnav.ValueResult{
			V: "0x" + hex.EncodeToString(v),
		}
		if err := json.NewEncoder(w).Encode(ret); err != nil {
			return err
		}
		return nil
	}); err != nil {
		if mdbx.IsNotFound(err) {
			http.Error(w, fmt.Sprintf("Table not found: %s", tableName), http.StatusNotFound)
			return
		}

		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
}
