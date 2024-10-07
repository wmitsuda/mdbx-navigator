package routes

import (
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

var ErrParseParam = errors.New("invalid param")

func readParams(w http.ResponseWriter, r *http.Request) (string, []byte, int, int, error) {
	tableName := chi.URLParam(r, "table")
	log.Printf("table: %s", tableName)

	keyBytes, dupIdxInt, err := readKey(w, r)
	if err != nil {
		// readKey already sent err 500
		return "", nil, 0, 0, err
	}

	pageSize := r.URL.Query().Get("pagesize")
	log.Printf("PageSize: %s", pageSize)
	if pageSize == "" {
		http.Error(w, "Missing page size", http.StatusBadRequest)
		return "", nil, 0, 0, ErrParseParam
	}
	pageSizeInt, err := strconv.Atoi(pageSize)
	if err != nil {
		http.Error(w, "Invalid page size", http.StatusBadRequest)
		return "", nil, 0, 0, err
	}

	return tableName, keyBytes, dupIdxInt, pageSizeInt, nil
}

func readKey(w http.ResponseWriter, r *http.Request) ([]byte, int, error) {
	key := r.URL.Query().Get("key")
	log.Printf("Key: %s", key)
	dupIdx := r.URL.Query().Get("dupidx")
	log.Printf("DupIdx: %s", dupIdx)
	dupIdxInt := 0

	var keyBytes []byte
	var err error
	if key != "" {
		if !strings.HasPrefix(key, "0x") {
			http.Error(w, "key must be an hexstring", http.StatusBadRequest)
			return nil, 0, ErrParseParam
		}
		keyBytes, err = hex.DecodeString(key[2:])
		if err != nil {
			http.Error(w, "key must be an hexstring", http.StatusBadRequest)
			return nil, 0, err
		}

		if dupIdx != "" {
			dupIdxInt, err = strconv.Atoi(dupIdx)
			if err != nil {
				http.Error(w, "DupIdx must be a int", http.StatusBadRequest)
				return nil, 0, err
			}
		}
	}
	return keyBytes, dupIdxInt, nil
}
