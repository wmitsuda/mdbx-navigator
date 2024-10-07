# MDBX Navigator

This is an UI for the KV database [libmdbx](https://github.com/erthink/libmdbx).

![screenshot](./doc/mdbx-navigator.png)

The goal is to provide a simple UI for browsing the DB contents, like similar tools that exist for full SQL databases.

## Install

This software is split into 2 parts:

- a backend which reads the DB from the local filesystem and exposes the raw data through a set of REST APIs.
- an UI that consumes those APIs and allows read-only interactions using a regular web browser.
  - The UI is now embedded and served from the backend binary, but it can be run separately during development.

### Building the UI

The UI is a Remix SPA React app. In order to run the development version, first you need to install [nvm](https://github.com/nvm-sh/nvm).

Once `nvm` is installed, inside the `web` directory, run:

```shell
nvm install
```

This will install and select the proper `nodejs` version.

Install all required project dependencies:

```shell
npm ci
```

Build a production build:

```shell
npm run build
```

### Building and running the backend

The backend is the main project of this repo.

It is a regular golang service, it uses [mdbx-go](https://github.com/erigontech/mdbx-go) bindings to access any mdbx database.

It exposes a set of REST APIs + serves the frontend. The details doesn't matter unless you intend to study/modify the code.

The easiest way to run it is:

```shell
go install
mdbx-navigator --data <path-to-your-mdbx.dat-file>
```

It will open the database as read-only in exclusive mode. The frontend will be available at `http://127.0.0.1:56516`.

> No special reason to open it in exclusive mode, I just found it more practical to ensure I don't have to deal with concurrent modifications.

### Trying it

If everything is correct, opening that URL in your preferred browser should display an initial page listing all the tables contained inside the informed mdbx database.
