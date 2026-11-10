# Architecture

```
 Browser
 ┌──────────────────────────────┐   HTTPS + JSON       ┌───────────────────────────┐   SQL    ┌──────────────────┐
 │ GitHub Pages (static)        │  Authorization:      │ Render web service        │ (private │ Render Postgres  │
 │ React 18 + Vite + TipTap v3  │  Bearer <token>      │ FastAPI + SQLAlchemy      │ network) │ users, documents,│
 │ HashRouter, autosave 800 ms  │ ───────────────────▶ │ access.py = all perms     │ ───────▶ │ shares           │
 │ /AJAIA_Ravi/                 │ ◀─── CORS-checked ── │ importers.py (.txt/.md/   │          │                  │
 └──────────────────────────────┘                      │   .docx → HTML)           │          └──────────────────┘
                                                       └───────────────────────────┘
```

## Data model
| Table | Columns | Notes |
|---|---|---|
| `users` | id, username (unique), display_name, password, token (unique) | 3 seeded demo users |
| `documents` | id, title, content_html, owner_id → users, created_at, updated_at | content is TipTap `getHTML()` |
| `shares` | id, document_id → documents (cascade), user_id → users, role (`viewer`/`editor`) | unique(document_id, user_id) |

## API
| Endpoints | Access |
|---|---|
| `POST /auth/login`, `GET /health` | public |
| `GET /me`, `GET /users` | logged in |
| `GET /documents` → `{owned, shared}`, `POST /documents`, `POST /documents/import` | logged in |
| `GET /documents/{id}`, `GET /documents/{id}/shares` | viewer or higher |
| `PATCH /documents/{id}` | editor or higher |
| `DELETE /documents/{id}`, `POST /documents/{id}/shares`, `DELETE /documents/{id}/shares/{username}` | owner |

## Key decisions
- **Store HTML.** Formatting round-trips exactly, with no conversion layer. TipTap parses stored HTML
  through its own schema, so stray or unsupported markup is dropped instead of rendered.
- **One permission point.** `access.get_doc_for(db, id, user, need)` is used by every document route.
  No access → **404**, so a document's existence isn't revealed. Access but too low a role → **403**.
  The tests exercise these rules through the real API.
- **Mocked auth.** Seeded users and a random bearer token stored on the user row. The assignment allows
  mocked auth, and this keeps the focus on documents and sharing.
- **HashRouter** because GitHub Pages is static hosting with no SPA fallback.
- **Import converts to HTML on the server and doesn't store the file.** Render's free disk is temporary,
  and an imported file becomes an ordinary editable document.
- **Autosave with an 800 ms debounce.** Saves run one at a time in order. A failed save keeps the pending
  HTML and retries on the next edit, and pending saves are flushed when you leave the page.
- **Fail loudly in production.** On Render the app refuses to start without `DATABASE_URL`, rather than
  quietly using a throwaway SQLite file.

## Prioritized vs. cut
**Built:** editing and formatting, autosave, import, role-based sharing, permission tests, and a live deploy.
**Cut on purpose** (to fit the 4–6 h timebox): real-time collaboration, comments, version history,
real authentication, and file attachments.

## Tradeoffs and risks
- **Last write wins** if two editors type at the same time.
- **Plain-text demo passwords** and tokens that never expire. Fine for a demo, not for production.
- **Free-tier cold start** of about a minute. The UI shows a banner while it happens.
- **The free database expires on 2026-12-10.**
- **Render auto-deploy isn't connected**, so backend deploys are triggered by hand.

## Next 2–4 hours
1. Optimistic concurrency: check `updated_at` on PATCH and return 409 on a stale write, so overwrites
   are never silent.
2. Version history: save snapshots and allow restoring them.
3. Markdown and PDF export.
4. Presence indicators (who has the document open).
5. Hashed passwords, sign-up and expiring sessions.
