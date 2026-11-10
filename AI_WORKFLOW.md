# How I used AI on this project

## Tools I used
I used two tools, for two different jobs:

- **Claude (chat)** was my planning partner. I used it to settle the tech stack, break the work into
  eight phases, and write a detailed prompt for each phase. It also helped me when I got stuck on
  setup problems like GitHub login and Render configuration.
- **Claude Code in VS Code** did most of the implementation. It used the `gh` CLI for GitHub
  (pushing, repo variables, Pages, Actions) and the Render MCP connector for Render (services,
  deploys, logs).

I kept anything involving accounts or secrets in my own hands: Render environment variables,
the database URL, and GitHub authentication. After every phase I read Claude Code's report and
checked the results myself before moving on.

## Where AI genuinely saved time
The biggest win was the boilerplate and wiring: the repo structure, FastAPI models and routes,
the React pages, the TipTap toolbar, the GitHub Actions workflow, and the Render config. That would
have taken me most of the timebox on its own. AI also made it cheap to write tests and a live smoke
script, which I probably would have cut under time pressure otherwise.

Writing a `CLAUDE.md` project brief at the start was one of the more useful decisions. Every
phase began by reading it, so the stack, scope and gotchas stayed consistent across sessions.

## What I changed, rejected, or caught
AI output wasn't always right the first time. These were the main corrections:

- **The wake-up banner bug.** On the live site, the "Waking up the server" banner never went away,
  even though documents were loading. My first diagnosis, with Claude's help, blamed React StrictMode
  or a bad success check. That was wrong. Instead of patching blindly, I had Claude Code reproduce
  the bug first. The real cause was that the first `/health` request could hang forever during a
  Render cold start, and nothing ever retried it. The fix added a timeout and retry, and now any
  successful API call hides the banner. This was a good reminder to reproduce a bug before fixing it.
- **Silent SQLite fallback in production.** The first Render deploy looked healthy, but it was
  missing `DATABASE_URL` and had quietly created a throwaway SQLite database. I noticed because the
  Welcome document's timestamp matched the deploy time exactly. Now the app refuses to start on
  Render without a database URL and logs which driver it's using.
- **A secret in the wrong file.** At one point the real database URL ended up in `.env.example`,
  which is tracked by git. It was caught and moved to the ignored `.env` before anything was
  committed, and I checked the history afterwards to be sure.
- **Library changes newer than expected.** SQLAlchemy 2.1 switched its default Postgres driver, so
  the first connection failed. We now name `psycopg2` explicitly. Similarly, TipTap v3 already
  includes Underline in its starter kit, so adding it separately would have caused a duplicate.
- **Tests that could have touched production.** Because my local `.env` points at the real
  database, I made sure the tests force an in-memory SQLite database and refuse to run otherwise.
- **Smaller fixes:** pinned Python 3.13 so local and Render match, marked timestamps as UTC (SQLite
  drops the timezone), and split the frontend bundle after a size warning.
- **An approach I rejected:** at one point I considered dropping the backend and having the frontend
  talk directly to Supabase. I decided against it because I wanted the permission rules to live in
  real, testable server code, which is what this assignment is evaluating.

## How I verified the work
I didn't take "done" at face value. For each layer I checked:
- **Backend:** 4 pytest tests that run the full sharing flow through the real API (viewer vs editor,
  revoking access, import validation, auth), run twice to confirm they're repeatable.
- **API behaviour:** curl checks for the 401, 403 and 404 cases, plus CORS checks confirming the live
  site is allowed and an unknown origin is rejected.
- **Deployment:** confirmed the production build uses the right base path and points at the Render
  API, not localhost.
- **Live system:** a smoke script (`scripts/smoke_live.sh`) that runs 15 checks against the deployed
  API.
- **Real usage:** a full two-browser test on the live site, with Alice in a normal window and Bob in
  incognito. I covered formatting, refresh, rename, import, sharing as viewer, upgrading to editor,
  and removing access.

## Looking back
AI made it realistic to ship a full stack in a short timebox, but the moments that mattered most were
the ones where I had to slow down and question the output: a deploy that looked healthy but wasn't,
a secret in the wrong file, and a bug whose first explanation was wrong. If I did this again, I'd
connect Render's GitHub integration on day one, so auto-deploy works, and I'd ask for a "reproduce
first" step on every bug.