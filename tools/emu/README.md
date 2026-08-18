# emu

`emu` is the local Evidence Management UI for `zkcrypto-audit` session state.
It is an independent tool under `tools/emu/` and does not modify plugins,
generated Codex stubs, router metadata, reports, PoCs, or index artifacts.

## One-command dev (requires bun)

After the one-time backend and frontend setup below:

```bash
cd tools/emu
bun run dev
```

This starts the backend on `127.0.0.1:8765` and the frontend on
`127.0.0.1:5173` in one terminal; stopping either (or Ctrl-C) stops both.

## Backend

```bash
cd tools/emu/backend
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -e .
python3 -m emu.api
```

The backend listens on `http://127.0.0.1:8765` and exposes `/api/*`.

## Frontend

```bash
cd tools/emu/frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` to the backend.
