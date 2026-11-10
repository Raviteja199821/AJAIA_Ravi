#!/usr/bin/env bash
# End-to-end smoke test against a running Ajaia Docs API.
# Usage: scripts/smoke_live.sh [API_BASE]   (default: the live Render API)
# Needs: bash, curl, jq. Creates two documents and deletes them again at the end.
set -uo pipefail

API="${1:-https://ajaia-docs-api-r2ve.onrender.com}"
API="${API%/}"
FAILS=0
TMP="$(mktemp -d)"
DOC_ID=""
IMPORT_ID=""

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAILS=$((FAILS + 1)); }
check() { # check <description> <expected> <actual>
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1 (expected $2, got $3)"; fi
}

# call <method> <path> <token> [json-body] -> prints status; body goes to $TMP/body
call() {
  local method="$1" path="$2" token="$3" body="${4:-}"
  local args=(-s -o "$TMP/body" -w '%{http_code}' --max-time 60 -X "$method")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' -d "$body")
  curl "${args[@]}" "$API$path"
}

upload() { # upload <token> <file> -> prints status
  curl -s -o "$TMP/body" -w '%{http_code}' --max-time 60 -X POST \
    -H "Authorization: Bearer $1" -F "file=@$2" "$API/documents/import"
}

login() {
  curl -s --max-time 60 -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"demo123\"}" | jq -r '.token // empty'
}

cleanup() {
  # Always try to remove test docs, even if a step failed part-way.
  [ -n "$DOC_ID" ] && [ -n "${ALICE:-}" ] && call DELETE "/documents/$DOC_ID" "$ALICE" >/dev/null
  [ -n "$IMPORT_ID" ] && [ -n "${ALICE:-}" ] && call DELETE "/documents/$IMPORT_ID" "$ALICE" >/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "Smoke testing $API"

# 1. Health (allow a long first request: free tier cold start)
health="$(curl -s --max-time 120 "$API/health" | jq -r '.ok // empty' 2>/dev/null)"
check "1. /health ok" "true" "$health"
[ "$health" = "true" ] || { echo "API not healthy; aborting."; exit 1; }

# 2. Logins
ALICE="$(login alice)"; BOB="$(login bob)"; CAROL="$(login carol)"
if [ -n "$ALICE" ] && [ -n "$BOB" ] && [ -n "$CAROL" ]; then pass "2. login alice, bob, carol"
else fail "2. login alice, bob, carol"; exit 1; fi

# 3. Create
TITLE="Smoke test $(date -u +%Y-%m-%dT%H:%M:%SZ)"
status="$(call POST /documents "$ALICE" "$(jq -nc --arg t "$TITLE" '{title:$t}')")"
DOC_ID="$(jq -r '.id // empty' "$TMP/body")"
check "3. alice creates \"$TITLE\"" "201" "$status"
[ -n "$DOC_ID" ] || { echo "No document id; aborting."; exit 1; }
DOC="/documents/$DOC_ID"

# 4. No access yet
check "4. bob GET before sharing -> 404" "404" "$(call GET "$DOC" "$BOB")"

# 5. Viewer
check "5a. alice shares with bob as viewer -> 201" "201" \
  "$(call POST "$DOC/shares" "$ALICE" '{"username":"bob","role":"viewer"}')"
status="$(call GET "$DOC" "$BOB")"; role="$(jq -r '.role // empty' "$TMP/body")"
check "5b. bob GET as viewer -> 200 role viewer" "200 viewer" "$status $role"
check "5c. bob PATCH as viewer -> 403" "403" \
  "$(call PATCH "$DOC" "$BOB" '{"content_html":"<p>nope</p>"}')"

# 6. Editor
HTML='<p><strong>smoke</strong></p>'
check "6a. alice upgrades bob to editor -> 200" "200" \
  "$(call POST "$DOC/shares" "$ALICE" '{"username":"bob","role":"editor"}')"
check "6b. bob PATCH as editor -> 200" "200" \
  "$(call PATCH "$DOC" "$BOB" "$(jq -nc --arg h "$HTML" '{content_html:$h}')")"
call GET "$DOC" "$ALICE" >/dev/null
check "6c. alice GET returns exact HTML" "$HTML" "$(jq -r '.content_html' "$TMP/body")"

# 7. Outsider
check "7. carol GET -> 404" "404" "$(call GET "$DOC" "$CAROL")"

# 8. Import
printf '# Smoke import\n\n- one\n- two\n' > "$TMP/smoke.md"
printf '%%PDF-1.4 fake' > "$TMP/smoke.pdf"
status="$(upload "$ALICE" "$TMP/smoke.md")"
IMPORT_ID="$(jq -r '.id // empty' "$TMP/body")"
has_h1="$(jq -r '.content_html // ""' "$TMP/body" | grep -c '<h1>Smoke import</h1>')"
check "8a. import .md -> 201 with <h1>" "201 1" "$status $has_h1"
check "8b. import .pdf -> 400" "400" "$(upload "$ALICE" "$TMP/smoke.pdf")"

# 9. Cleanup (checked explicitly, then cleared so the trap doesn't repeat it)
check "9a. alice deletes test doc -> 204" "204" "$(call DELETE "$DOC" "$ALICE")"
DOC_ID=""
if [ -n "$IMPORT_ID" ]; then
  check "9b. alice deletes imported doc -> 204" "204" "$(call DELETE "/documents/$IMPORT_ID" "$ALICE")"
  IMPORT_ID=""
else
  fail "9b. alice deletes imported doc (no id from import)"
fi

echo
if [ "$FAILS" -eq 0 ]; then echo "ALL PASS"; else echo "$FAILS check(s) FAILED"; fi
exit "$FAILS"
