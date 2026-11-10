# Ajaia Docs: project brief

Read this before every phase. It is the single source of truth for scope and decisions.

## Goal
A lightweight collaborative document editor built as a take-home assignment.
**Timebox: 4–6 hours.** Principle: **depth over breadth**. A small feature set that
is solid, tested and deployed beats many half-finished features.

## Repo facts
- GitHub: `Raviteja199821/AJAIA_Ravi` (public), default branch `main`
- Frontend (GitHub Pages, LIVE): https://raviteja199821.github.io/AJAIA_Ravi/
  (workflow `.github/workflows/deploy.yml`, Pages source = GitHub Actions,
  repo variable `VITE_API_URL=https://ajaia-docs-api-r2ve.onrender.com`)
- Vite production base: `/AJAIA_Ravi/` (case-sensitive), set via `VITE_BASE`
- Backend CORS origin: `https://raviteja199821.github.io` (no path)
- Backend API (Render): https://ajaia-docs-api-r2ve.onrender.com
  (service `srv-dbp61tff3r2c73f6a310`, Oregon, free, auto-deploy on commit to `main`)
- Render Postgres: `ajaia-docs-db` (`dpg-dbp5udetlv9c73ekcft0-a`), Oregon, free, PG 18,
  **expires 2026-12-10**. Render workspace `tea-dbp5j388v5cc73d8jqsg`.
- Render env vars (dashboard only): `DATABASE_URL` (internal), `FRONTEND_ORIGIN`, `PYTHON_VERSION=3.13.5`

## Stack and folder ownership
| Folder      | Owns | Tech | Deployed to |
|-------------|------|------|-------------|
| `frontend/` | UI, editor, routing, API client | React 18 + Vite + TipTap v3, HashRouter | GitHub Pages (via `.github/workflows/`) |
| `backend/`  | API, auth, permissions, persistence, import | Python 3.12, FastAPI, SQLAlchemy 2.0 | Render (web service + Render Postgres) |

Locally the backend uses SQLite (`backend/local.db`) when `DATABASE_URL` is unset.

## Product scope
- **Users**: seeded `alice`, `bob`, `carol`, password `demo123`. Login returns a
  Bearer token stored on the user row (`users.token`).
- **Documents**: create, rename, rich-text edit, autosave (800 ms debounce, with a
  visible status: Saving… / Saved / Error), reopen. Content is stored as HTML from
  TipTap `editor.getHTML()`.
- **Toolbar**: undo/redo, H1/H2/H3, bold, italic, underline, bullet list,
  numbered list, quote.
- **Import**: `.txt`, `.md`, `.docx` (≤ 2 MB) → creates a new document. The
  supported types are shown in the UI.
- **Sharing**: the owner shares by username with role `viewer` | `editor`. Tabs:
  "My documents" / "Shared with me". Viewers get a read-only editor.
- **Permissions**: all rules live in `backend/app/access.py`.
  No access → **404**; insufficient role → **403**. Only the owner can share or delete.
- **Cold start**: show a "Waking up server…" banner when `/health` is slow
  (the Render free tier sleeps).
- **Out of scope**: real-time collaboration, comments, version history.

## Data model
- `users(id, username, display_name, password, token)`
- `documents(id, title, content_html, owner_id, created_at, updated_at)`
- `shares(id, document_id, user_id, role)`, with `UNIQUE(document_id, user_id)`

## API
| Method | Path | Notes |
|--------|------|-------|
| POST   | `/auth/login` | returns token + user |
| GET    | `/users` | list users (for the share picker) |
| GET    | `/documents` | `{ owned: [...], shared: [...] }` |
| POST   | `/documents` | create |
| POST   | `/documents/import` | multipart upload → new doc |
| GET    | `/documents/{id}` | read (any role) |
| PATCH  | `/documents/{id}` | title/content (owner or editor) |
| DELETE | `/documents/{id}` | owner only |
| GET    | `/documents/{id}/shares` | list shares |
| POST   | `/documents/{id}/shares` | owner only; `{username, role}` |
| DELETE | `/documents/{id}/shares/{username}` | owner only |
| GET    | `/health` | liveness, no auth |

## Gotchas
- Render gives `DATABASE_URL` as `postgres://…`. `db.py` rewrites it to `postgresql+psycopg2://…`
  (SQLAlchemy 2.1 defaults bare `postgresql://` to psycopg v3, which we don't install).
- The real `DATABASE_URL` goes only in `backend/.env` (gitignored), never in `.env.example`.
- CORS: allow the origins in `FRONTEND_ORIGIN` (comma-separated) **plus** `http://localhost:5173`.
- Use **HashRouter** (GitHub Pages has no SPA fallback).
- The Pages workflow builds with `VITE_BASE=/AJAIA_Ravi/`.
- Render auto-deploy on push has NOT fired so far (no deploy and no `commit_ignored` event).
  After pushing backend changes, check `list_deploys` and run `trigger_deploy` if nothing started.
- **Never commit secrets.** Only `.env.example` files are tracked.

## Phases
- [x] 1. Repo and project skeleton
- [x] 2. Backend (models, auth, documents, sharing, import, access rules)
- [x] 3. Backend tests (pytest)
- [x] 4. Frontend (login, doc list tabs, editor, toolbar, autosave, share, import)
- [x] 5. Render deploy (web service + Postgres)
- [x] 6. GitHub Pages deploy (Actions workflow)
- [x] 7. Live end-to-end check
- [x] 8. Docs (README, known limitations, next steps)

## Working rules
- One phase at a time. Don't start the next phase until the user says so.
- At the end of each phase: run the checks, commit, push, and give a 3-line status
  (done / verified how / next).
- Free-tier cloud resources only.
- If something fails twice, stop and report instead of trying a third time.
