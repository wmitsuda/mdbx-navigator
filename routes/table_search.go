package routes

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/erigontech/mdbx-go/mdbx"
	"github.com/go-chi/chi/v5"
	"github.com/wmitsuda/mdbx-navigator/mdbxnav"
)

func readSearchKey(w http.ResponseWriter, r *http.Request) ([]byte, error) {
	key := r.URL.Query().Get("key")
	log.Printf("Key: %s", key)

	var keyBytes []byte
	var err error
	if !strings.HasPrefix(key, "0x") {
		http.Error(w, "key must be an hexstring", http.StatusBadRequest)
		return nil, ErrParseParam
	}

	partialKey := key[2:]
	if len(partialKey)%2 != 0 {
		partialKey += "0"
	}
	keyBytes, err = hex.DecodeString(partialKey)
	if err != nil {
		http.Error(w, "key must be an hexstring", http.StatusBadRequest)
		return nil, err
	}

	return keyBytes, nil
}

func readSearchParams(w http.ResponseWriter, r *http.Request) (string, []byte, int, error) {
	tableName := chi.URLParam(r, "table")
	log.Printf("table: %s", tableName)

	keyBytes, err := readSearchKey(w, r)
	if err != nil {
		// readKey already sent err 500
		return "", nil, 0, err
	}

	pageSize := r.URL.Query().Get("pagesize")
	log.Printf("PageSize: %s", pageSize)
	if pageSize == "" {
		http.Error(w, "Missing page size", http.StatusBadRequest)
		return "", nil, 0, ErrParseParam
	}
	pageSizeInt, err := strconv.Atoi(pageSize)
	if err != nil {
		http.Error(w, "Invalid page size", http.StatusBadRequest)
		return "", nil, 0, err
	}

	return tableName, keyBytes, pageSizeInt, nil
}

func (be *Backend) TableSearch(w http.ResponseWriter, r *http.Request) {
	tableName, keyBytes, pageSizeInt, err := readSearchParams(w, r)
	if err != nil {
		// err already handled inside readParams
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

		log.Printf("%s", hex.EncodeToString(keyBytes))
		k, v, err := cursor.Get(keyBytes, nil, mdbx.SetRange)
		if err != nil {
			if mdbx.IsNotFound(err) {
				if err := json.NewEncoder(w).Encode([]*mdbxnav.KVResult{}); err != nil {
					return err
				}
				return nil
			}
			return err
		}

		ret, err := be.readForward(cursor, k, v, 0, pageSizeInt)
		if err != nil {
			return err
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

// Traverse the cursor forward up to maxResults or EOF.
//
// It assumes the current cursor position corresponds to the first matching
// result and their values are already read at k/v/idx.
func (be *Backend) readSearchForward(cursor *mdbx.Cursor, k, v []byte, idx int, maxResults int) ([]*mdbxnav.KVResult, error) {
	ret := make([]*mdbxnav.KVResult, 0, maxResults)

	prevK := make([]byte, len(k))
	copy(prevK, k)

	for c := 0; c < maxResults; c++ {
		capped := v[:]
		if len(v) > int(be.ValueLength) {
			capped = v[:be.ValueLength]

		}
		ret = append(ret, &mdbxnav.KVResult{
			K:       "0x" + hex.EncodeToString(k),
			CappedV: "0x" + hex.EncodeToString(capped),
			VLen:    len(v),
			DupIdx:  idx,
		})

		var err error
		k, v, err = cursor.Get(nil, nil, mdbx.Next)
		if err != nil {
			if mdbx.IsNotFound(err) {
				break
			}
			return nil, err
		}

		if bytes.Equal(prevK, k) {
			idx++
		} else {
			idx = 0
			prevK = make([]byte, len(k))
			copy(prevK, k)
		}
	}

	return ret, nil
}
