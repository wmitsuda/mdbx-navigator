package mdbxnav

type Table struct {
	Name string `json:"name"`

	// the fields below mirror mdbx.Stat struct
	PSize         uint   `json:"psize"`
	Depth         uint   `json:"depth"`
	BranchPages   uint64 `json:"branchPages"`
	LeafPages     uint64 `json:"leafPages"`
	OverflowPages uint64 `json:"overflowPages"`
	Entries       uint64 `json:"entries"`
}

type KVResult struct {
	K       string `json:"k"`
	CappedV string `json:"cappedV"`
	VLen    int    `json:"vLength"`
	DupIdx  int    `json:"dupIdx"`
}

// Result type for get k -> v operations
type ValueResult struct {
	V string `json:"v"`
}
