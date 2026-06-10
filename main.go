package main

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/erigontech/mdbx-go/mdbx"
	"github.com/urfave/cli/v3"
	"github.com/wmitsuda/mdbx-navigator/mdbxnav"
	"github.com/wmitsuda/mdbx-navigator/routes"
)

func main() {
	cmd := &cli.Command{
		Usage: "Backend service for mdbx-navigator UI",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:     "data",
				Required: true,
				Usage:    "path to the mdbx.dat",
			},
			&cli.StringFlag{
				Name:  "host",
				Value: "127.0.0.1",
				Usage: "IP address to bind the API to",
			},
			&cli.UintFlag{
				Name:  "port",
				Value: 56516,
				Usage: "port to bind the API to",
			},
			&cli.UintFlag{
				Name:  "lengthcap",
				Value: 32,
				Usage: "max length for value search results",
			},
		},
		Action: mainAction,
	}

	if err := cmd.Run(context.Background(), os.Args); err != nil {
		log.Fatal(err)
	}
}

func mainAction(ctx context.Context, cmd *cli.Command) error {
	data := cmd.String("data")
	log.Printf("Using data: %s", data)

	valueLength := cmd.Uint("lengthcap")
	log.Printf("Using value length cap: %d", valueLength)

	log.Println("Opening data file...")
	env, err := mdbx.NewEnv(mdbx.Default)
	if err != nil {
		return err
	}
	defer env.Close()

	if err := env.SetOption(mdbx.OptMaxDB, 1000); err != nil {
		return err
	}

	if err := env.Open(data, mdbx.Readonly, fs.ModeExclusive); err != nil {
		return err
	}

	tables, err := mdbxnav.ReadTables(env)
	if err != nil {
		return err
	}
	log.Printf("Loaded %d tables", len(tables))
	log.Println("Data file opened")

	be := &routes.Backend{
		Env:         env,
		Tables:      tables,
		ValueLength: uint(valueLength),
	}
	r, err := be.CreateRouter()
	if err != nil {
		return err
	}

	addr := fmt.Sprintf("%s:%d", cmd.String("host"), cmd.Uint("port"))
	log.Printf("Listening to: http://%s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		return err
	}

	return nil
}
