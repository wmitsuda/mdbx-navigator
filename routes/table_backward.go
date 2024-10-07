package routes

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/erigontech/mdbx-go/mdbx"
	"github.com/wmitsuda/mdbx-navigator/mdbxnav"
)

func (be *Backend) TableBackward(w http.ResponseWriter, r *http.Request) {
	tableName, keyBytes, dupIdxInt, pageSizeInt, err := readParams(w, r)
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

		var prevK []byte
		idx := 0
		var k, v []byte

		if keyBytes != nil {
			log.Printf("%s", hex.EncodeToString(keyBytes))
			k, v, err = cursor.Get(keyBytes, nil, mdbx.SetRange)
			if err != nil {
				if mdbx.IsNotFound(err) {
					if err := json.NewEncoder(w).Encode([]*mdbxnav.KVResult{}); err != nil {
						return err
					}
					return nil
				}
				return err
			}

			if dupIdxInt > 0 {
				// Advance dupsort
				prevK = make([]byte, len(k))
				copy(prevK, k)
				for i := 0; i < dupIdxInt; i++ {
					k, v, err = cursor.Get(nil, nil, mdbx.Next)
					if err != nil {
						return err
					}
				}

				// Must still be the same key
				if !bytes.Equal(prevK, k) {
					return mdbx.ErrNotFound
				}
				idx = dupIdxInt
			}
		} else {
			k, v, err = cursor.Get(nil, nil, mdbx.Last)
			if err != nil {
				if mdbx.IsNotFound(err) {
					if err := json.NewEncoder(w).Encode([]*mdbxnav.KVResult{}); err != nil {
						return err
					}
					return nil
				}
				return err
			}

			dupC, err := cursor.Count()
			if err != nil {
				return err
			}
			idx = int(dupC - 1)
		}

		ret, err := be.readBackward(cursor, k, v, idx, pageSizeInt)
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

// Traverse the cursor backward up to maxResults or beginning of table.
//
// It assumes the current cursor position corresponds to the first matching
// result and their values are already read at k/v/idx.
func (be *Backend) readBackward(cursor *mdbx.Cursor, k, v []byte, idx int, maxResults int) ([]*mdbxnav.KVResult, error) {
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
		k, v, err = cursor.Get(nil, nil, mdbx.Prev)
		if err != nil {
			if mdbx.IsNotFound(err) {
				break
			}
			return nil, err
		}

		if bytes.Equal(prevK, k) {
			idx--
		} else {
			dupC, err := cursor.Count()
			if err != nil {
				return nil, err
			}
			idx = int(dupC - 1)
			prevK = make([]byte, len(k))
			copy(prevK, k)
		}
	}

	for i, j := 0, len(ret)-1; i < j; i, j = i+1, j-1 {
		ret[i], ret[j] = ret[j], ret[i]
	}
	return ret, nil
}