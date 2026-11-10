# Ajaia Docs

**Live demo: https://raviteja199821.github.io/AJAIA_Ravi/**

| Username | Password | Starts with |
|----------|----------|-------------|
| alice    | demo123  | owns "Welcome to Ajaia Docs" |
| bob      | demo123  | has editor access to the Welcome doc |
| carol    | demo123  | nothing shared, useful for checking access is denied |

> **First load can take about a minute.** The API runs on Render's free tier, which sleeps when idle.
> The app shows a "Waking up the server…" banner until it responds.

A lightweight collaborative document editor: create and format documents, have them saved
automatically, import files, and share them with other users as a viewer or editor.
See [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions and [SUBMISSION.md](SUBMISSION.md) for the review guide.

## Features
All of these work end to end on the live deployment:
- **Sign in** as one of three seeded demo users (bearer-token auth).
- **Documents:** create, rename (inline title), delete (owner only), and reopen from the dashboard.
- **Rich-text editing** (TipTap): undo/redo, H1/H2/H3, bold, italic, underline, bullet and numbered
  lists, block quote, with active-state highlighting and the usual keyboard shortcuts.
- **Autosave:** 800 ms after you stop typing, with a status line ("Saving…", "All changes saved",
  "Save failed — will retry on next edit"). Pending edits are flushed when you leave the page, and the
  browser warns before you close a tab with unsaved changes.
- **Formatting round-trips exactly:** content is stored as the editor's HTML.
- **File import:** turns a file into a new, editable document (see below).
- **Sharing:** the owner shares by username as **viewer** or **editor**, can change roles, or remove access.
  The dashboard has **My documents** and **Shared with me** tabs, with role badges.
  Viewers get a read-only editor; non-owners can see who has access but can't change it.
- **Permissions enforced on the server:** no access → 404 (so a document's existence isn't revealed),
  too little access → 403. Only the owner can share or delete.
- **Cold-start banner** while the free-tier API wakes up.

## Supported import files
| Type | Converted with | Result |
|------|----------------|--------|
| `.txt` | built in | one paragraph per line (HTML-escaped) |
| `.md`  | Python-Markdown (`extra`, `sane_lists`) | headings, lists, emphasis, tables… |
| `.docx`| mammoth | headings, paragraphs, lists, bold/italic |

The size limit is **2 MB**, and text files must be UTF-8. Unsupported, empty or oversized files are rejected
with a clear message, both in the browser and on the server.

## Tech stack
- **Frontend:** React 18, Vite 5, TipTap v3 (StarterKit), React Router 6 (HashRouter), plain CSS. Hosted on GitHub Pages.
- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2.1, Pydantic 2. Hosted on Render (free web service).
- **Database:** PostgreSQL 18 on Render (free) in production; SQLite for local development and tests.
- **CI/CD:** a GitHub Actions workflow publishes the frontend to Pages; Render builds the backend from `main`.

## Local setup
### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload        # http://localhost:8000
```
With no `DATABASE_URL` set, it uses SQLite (`backend/local.db`) and seeds the demo users on startup.
To use Postgres, put `DATABASE_URL=...` in `backend/.env` (gitignored). See `backend/.env.example`.

### Frontend
Needs Node 18+ (22 recommended).
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local   # backend URL, no trailing slash
npm run dev                                              # http://localhost:5173
```
`npm run build` writes a production build to `frontend/dist/`.

## Running tests
```bash
cd backend && source .venv/bin/activate && python -m pytest -q
```
4 tests cover:
- the sharing roles end to end through the API: no access → 404, viewer is read-only (403), an editor
  can edit but not delete or share, re-sharing updates the role, and unsharing revokes access
- that HTML formatting is preserved exactly
- import validation and conversion
- 401 without a token

Tests run on an in-memory SQLite database; `conftest.py` refuses to run against anything else.

### Live smoke test
[`scripts/smoke_live.sh`](scripts/smoke_live.sh) runs the same sharing, permission and import flow
against a running API using curl and jq. It cleans up the documents it creates.
```bash
scripts/smoke_live.sh                          # the live Render API
scripts/smoke_live.sh http://localhost:8000    # a local backend
```

## Deployment
### Backend: Render (free tier)
- **API:** https://ajaia-docs-api-r2ve.onrender.com (health check: `/health`)
- A Render web service (`rootDir: backend`) plus Render Postgres, both in Oregon.
- Build: `pip install -r requirements.txt`; start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
  Tables are created and the demo data is seeded on first startup.
- **Environment variables** are set in the Render dashboard (ajaia-docs-api → Environment), never in git:
  - `DATABASE_URL`: the database's *Internal* connection string
  - `FRONTEND_ORIGIN`: `https://raviteja199821.github.io` (comma-separated, no path)
  - `PYTHON_VERSION`: `3.13.5`
- On Render the app refuses to start without `DATABASE_URL`, so it can never quietly fall back to
  SQLite, which would lose data on restart.
- **Deploys:** auto-deploy on push is not connected yet, so backend changes are deployed manually
  (dashboard → Manual Deploy).
- [`render.yaml`](render.yaml) is a blueprint that recreates the same setup from scratch.

### Frontend: GitHub Pages
- **App:** https://raviteja199821.github.io/AJAIA_Ravi/
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main` that touches
  `frontend/**` (or by hand from the Actions tab). It runs `npm ci`, then `npm run build`, and publishes
  `frontend/dist` with `actions/deploy-pages`.
- Build settings:
  - `VITE_API_URL` comes from the repository **variable** of the same name. The build fails if it's empty.
  - `VITE_BASE=/AJAIA_Ravi/` makes asset paths match the Pages sub-path.
- `HashRouter` (`#/doc/1`) makes deep links and refreshes work on static hosting.

## Known limitations
- **No real-time collaboration.** If two editors type in the same document at once, the last save wins.
  Neither sees the other's changes until they reload.
- **Demo-grade auth:** seeded users, plain-text demo passwords, and a long-lived bearer token stored in
  `localStorage`. There's no sign-up, password reset or token expiry.
- **Free-tier hosting:** about a 1 minute cold start after idling. The free Postgres database expires on **2026-12-10**.
- **Import is one-way:** images and complex layout in `.docx` files are dropped, and there's no export.
- No comments, version history, search, or folders.

## What I'd build next
1. **Optimistic concurrency:** send `updated_at` with each save and reject stale writes, so edits are
   never silently overwritten.
2. **Version history:** keep a snapshot on save and let users restore earlier versions.
3. **Export** to Markdown and PDF.
4. **Presence:** show who else has the document open.
5. **Real accounts:** hashed passwords, sign-up, and expiring sessions.
