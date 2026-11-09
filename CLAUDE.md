# Ajaia Docs: project brief

Read this before every phase. It is the single source of truth for scope and decisions.

## Goal
A lightweight collaborative document editor built as a take-home assignment.
**Timebox: 4–6 hours.** Principle: **depth over breadth**. A small feature set that
is solid, tested and deployed beats many half-finished features.

## Repo facts
- GitHub: `Raviteja199821/AJAIA_Ravi` (public), default branch `main`
- Frontend (GitHub Pages): https://raviteja199821.github.io/AJAIA_Ravi/
- Vite production base: `/AJAIA_Ravi/` (case-sensitive), set via `VITE_BASE`
- Backend CORS origin: `https://raviteja199821.github.io` (no path)

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
- Render gives `DATABASE_URL` as `postgres://…`. Rewrite it to `postgresql://…` for SQLAlchemy.
- CORS: allow the origins in `FRONTEND_ORIGIN` (comma-separated) **plus** `http://localhost:5173`.
- Use **HashRouter** (GitHub Pages has no SPA fallback).
- The Pages workflow builds with `VITE_BASE=/AJAIA_Ravi/`.
- **Never commit secrets.** Only `.env.example` files are tracked.

## Phases
- [x] 1. Repo and project skeleton
- [ ] 2. Backend (models, auth, documents, sharing, import, access rules)
- [ ] 3. Backend tests (pytest)
- [ ] 4. Frontend (login, doc list tabs, editor, toolbar, autosave, share, import)
- [ ] 5. Render deploy (web service + Postgres)
- [ ] 6. GitHub Pages deploy (Actions workflow)
- [ ] 7. Live end-to-end check
- [ ] 8. Docs (README, known limitations, next steps)

## Working rules
- One phase at a time. Don't start the next phase until the user says so.
- At the end of each phase: run the checks, commit, push, and give a 3-line status
  (done / verified how / next).
- Free-tier cloud resources only.
- If something fails twice, stop and report instead of trying a third time.
