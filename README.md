# Ajaia Docs

## Overview
A lightweight collaborative document editor: rich-text editing with autosave,
file import and per-document sharing. _(Details to come.)_

## Live demo
https://raviteja199821.github.io/AJAIA_Ravi/ _(available after deployment)_

## Demo accounts
| Username | Password |
|----------|----------|
| alice    | demo123  |
| bob      | demo123  |
| carol    | demo123  |

## Features
_To be written once the features are implemented._

## Supported import files
`.txt`, `.md`, `.docx`, up to 2 MB each. Each import creates a new document.

## Tech stack
- Frontend: React 18, Vite, TipTap v3 (GitHub Pages)
- Backend: Python 3.12, FastAPI, SQLAlchemy 2.0 (Render)
- Database: PostgreSQL (Render) in production, SQLite locally

## Local setup
### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload        # http://localhost:8000
```
With no `DATABASE_URL` set, it uses SQLite (`backend/local.db`) and seeds the demo users on startup.
If `backend/.env` holds the Render `DATABASE_URL`, the local server talks to that database instead.

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
Covers the sharing roles end to end through the API (no access → 404, viewer read-only → 403,
editor can edit but not delete or share, re-share updates the role, unshare revokes access),
import validation and conversion (.md → HTML, unsupported or empty file → 400), and auth (401 without a token).
Tests run on an in-memory SQLite database; `conftest.py` refuses to run against anything else.

## Deployment
_TBD_

## Known limitations
_TBD_

## What I'd build next
_TBD_
