package mdbxnav

import (
	"log"

	"github.com/erigontech/mdbx-go/mdbx"
)

func ReadTables(env *mdbx.Env) (map[string]*Table, error) {
	tables := make(map[string]*Table)

	if err := env.View(func(txn *mdbx.Txn) error {
		dbi, err := txn.OpenRoot(0)
		if err != nil {
			return err
		}

		cursor, err := txn.OpenCursor(dbi)
		if err != nil {
			return err
		}

		k, _, err := cursor.Get(nil, nil, mdbx.First)
		if err != nil {
			return err
		}
		for k != nil {
			tableDBI, err := txn.OpenDBI(string(k), 0, nil, nil)
			if err != nil {
				return err
			}
			defer env.CloseDBI(tableDBI)

			stat, err := txn.StatDBI(tableDBI)
			if err != nil {
				return err
			}

			log.Printf("found table: name=%s entries=%d", string(k), stat.Entries)
			tables[string(k)] = &Table{
				Name:          string(k),
				PSize:         stat.PSize,
				Depth:         stat.Depth,
				BranchPages:   stat.BranchPages,
				LeafPages:     stat.LeafPages,
				OverflowPages: stat.OverflowPages,
				Entries:       stat.Entries,
			}
			k, _, err = cursor.Get(nil, nil, mdbx.Next)
			if err != nil && !mdbx.IsNotFound(err) {
				return err
			}
		}

		stat, err := txn.StatDBI(dbi)
		if err != nil {
			return err
		}
		log.Printf("root size: %d", stat.Entries)

		defer cursor.Close()

		return nil
	}); err != nil {
		return nil, err
	}

	return tables, nil
}
