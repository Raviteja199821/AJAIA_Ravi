# Submission: Ajaia Docs

| | |
|---|---|
| **Live product** | https://raviteja199821.github.io/AJAIA_Ravi/ |
| **API** | https://ajaia-docs-api-r2ve.onrender.com (`/health`) |
| **Repository** | https://github.com/Raviteja199821/AJAIA_Ravi |
| **Walkthrough video** | see [VIDEO_URL.txt](VIDEO_URL.txt) |

> **Note:** the first load may take about 1 minute while the free-tier API wakes up (a banner shows
> while this happens). The free database is valid until **2026-12-10**.

## Demo credentials
`alice`, `bob`, `carol`. The password for all three is `demo123`. The login page has one-click buttons for each.

## Suggested review flow (about 5 minutes)
1. **alice:** sign in, click **+ New document**, add headings, bold, lists and a quote, and wait for
   "All changes saved". Refresh the page; the formatting is kept.
2. **alice:** click **⬆ Import file** and pick a `.md`, `.txt` or `.docx` file. It opens as a new
   editable document.
3. **alice:** click **Share** and add **bob** as a **Viewer**.
4. **bob** (incognito window): the doc appears under **Shared with me** and is read-only. Then, as
   alice, change bob to **Editor**. Bob refreshes, edits, and alice sees the change after a refresh.
5. **carol:** sign in. Nothing is shared with her, and opening alice's doc URL shows "Document not found".

## What's in the repo
| Path | What |
|---|---|
| [README.md](README.md) | overview, features, setup, tests, deployment, limitations |
| [ARCHITECTURE.md](ARCHITECTURE.md) | diagram, data model, API, decisions, tradeoffs |
| [AI_WORKFLOW.md](AI_WORKFLOW.md) | how AI tools were used and checked |
| [SUBMISSION.md](SUBMISSION.md) | this file |
| [VIDEO_URL.txt](VIDEO_URL.txt) | walkthrough video link |
| [backend/](backend/) | FastAPI app (`app/`) and pytest suite (`tests/`) |
| [frontend/](frontend/) | React + Vite + TipTap app |
| [scripts/smoke_live.sh](scripts/smoke_live.sh) | end-to-end check against a running API |
| [render.yaml](render.yaml) | Render blueprint (backend + Postgres) |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | GitHub Pages deploy |
| [docs/screenshots/](docs/screenshots/) | screenshots |

## Status
**Works end to end (live):**
- login
- create, rename, delete and reopen documents
- rich-text formatting
- autosave with a status line
- `.txt`/`.md`/`.docx` import
- viewer/editor sharing with role changes and removal
- the "My documents" and "Shared with me" tabs
- a read-only view for viewers
- server-side 404/403 permission rules
- the cold-start banner

**Incomplete or simplified:**
- no real-time collaboration (last write wins)
- mocked auth with plain-text demo passwords
- no export, comments or version history
- backend deploys on Render are triggered manually

**Next 2–4 hours:**
1. Optimistic concurrency (reject stale saves)
2. Version history with restore
3. Markdown/PDF export
4. Presence indicators
5. Hashed passwords and sign-up
