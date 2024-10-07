package main

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/erigontech/mdbx-go/mdbx"
	"github.com/urfave/cli/v2"
	"github.com/wmitsuda/mdbx-navigator/mdbxnav"
	"github.com/wmitsuda/mdbx-navigator/routes"
)

func main() {
	app := cli.NewApp()
	app.Usage = "Backend service for mdbx-navigator UI"
	app.Flags = []cli.Flag{
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
	}
	app.Action = mainAction

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

func mainAction(cCtx *cli.Context) error {
	data := cCtx.String("data")
	log.Printf("Using data: %s", data)

	valueLength := cCtx.Uint("lengthcap")
	log.Printf("Using value length cap: %d", valueLength)

	log.Println("Opening data file...")
	env, err := mdbx.NewEnv()
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
		ValueLength: valueLength,
	}
	r, err := be.CreateRouter()
	if err != nil {
		return err
	}

	addr := fmt.Sprintf("%s:%d", cCtx.String("host"), cCtx.Uint("port"))
	log.Printf("Listening to: http://%s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		return err
	}

	return nil
}
