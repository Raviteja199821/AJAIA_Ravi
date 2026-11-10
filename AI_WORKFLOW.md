> **DRAFT — Ravi to edit in his own words.** The facts below are accurate for this project;
> the wording and opinions should be rewritten by me before submission.

# AI workflow

## Tools
- **Claude (chat)** to plan the stack and the 8 phases, and to write a detailed prompt for each phase.
- **Claude Code in VS Code** for the implementation, working through the **gh CLI** for GitHub
  (repo variables, Pages, Actions runs) and the **Render MCP connector** for Render (services, deploys, logs).
- I reviewed each phase's report, ran the manual checks, and made the account- and secret-related
  changes myself (Render env vars, GitHub login).

## Where AI sped things up
- **Scaffolding:** repo layout, `CLAUDE.md` project brief, `.gitignore`/`.editorconfig`, Vite config.
- **Backend:** models, the single `access.py` permission module, auth, importers, and the routes,
  including curl checks after each step.
- **Tests:** the pytest suite for sharing roles, import and auth, plus a live smoke script.
- **UI:** the dashboard, editor with toolbar and autosave, share dialog, and styling.
- **Deploy config:** the GitHub Pages workflow, `render.yaml`, and reading Render deploy logs.

## What was changed or rejected
- **Python 3.13 instead of 3.12:** pinned to match the local venv, so local and Render use the same version.
- **psycopg2 named explicitly:** SQLAlchemy 2.1 changed the default `postgresql://` driver to psycopg v3.
  The first Postgres connection failed, so `db.py` now rewrites the URL to `postgresql+psycopg2://`.
- **UTC timestamps:** SQLite drops timezone info, so the API marks naive timestamps as UTC before
  returning them. Otherwise the browser would show the wrong local time.
- **Tests isolated from production:** `conftest.py` forces `DATABASE_URL=sqlite://` before the app is
  imported and refuses to run against anything else, because `backend/.env` holds the real Render URL.
- **Startup guard:** the first Render deploy came up "healthy" but had no `DATABASE_URL`, so it
  quietly seeded a throwaway SQLite file. I spotted this because the Welcome doc's timestamp matched
  the deploy time. The app now refuses to start on Render without `DATABASE_URL` and logs the driver
  (not the URL) at startup.
- **Secret caught before commit:** the real database URL had been pasted into the tracked
  `backend/.env.example`. It was moved to the gitignored `backend/.env` before anything was committed,
  and every commit was checked for secrets.
- **Bundle split:** the first build warned about a 590 kB bundle. TipTap and React were split into
  separate cacheable chunks.
- **Rejected a frontend-only / Supabase approach,** to keep a real Python API where the permission
  rules live on the server and are tested.
- **Render auto-deploy:** pushes never triggered a deploy. This was confirmed from the deploy and
  event lists, worked around by triggering deploys manually, and documented.

## How it was verified
- **pytest:** 4 tests through the real API on in-memory SQLite, run twice to confirm they're repeatable.
- **Local curl checks** after building the backend: login, 401/403/404 cases, and import.
- **CORS preflights** from `localhost:5173` and the Pages origin (allowed), plus an unknown origin (rejected).
- **Build checks:** asset paths use `/AJAIA_Ravi/`, and the bundle contains the Render URL and not localhost.
- **Live smoke script** (`scripts/smoke_live.sh`): 15 checks against the deployed API, all passing.
- **Manual two-browser checklist** (alice in a normal window, bob in incognito) on the live site.

## My notes

