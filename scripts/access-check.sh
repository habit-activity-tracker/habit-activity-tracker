#!/usr/bin/env bash
set -euo pipefail

# Required: ACCESS_BASE_URL, ACCESS_PASSWORD. Optional account emails use documented seed defaults.
# This script prints only endpoint/status assertions; cookie jars live in a temporary directory and
# are removed on exit. It creates synthetic template/goals, so use only a dedicated seeded test target.
: "${ACCESS_BASE_URL:?Set ACCESS_BASE_URL, e.g. http://localhost:8080}"
: "${ACCESS_PASSWORD:?Set ACCESS_PASSWORD; do not put it in this file or captured output}"
PM_EMAIL="${ACCESS_PM_EMAIL:-pm1@example.com}"
ALICE_EMAIL="${ACCESS_ALICE_EMAIL:-alice@example.com}"
BOB_EMAIL="${ACCESS_BOB_EMAIL:-bob@example.com}"
BASE="${ACCESS_BASE_URL%/}"
RUN_ID="d3-access-$(date +%s)"
JARS="$(mktemp -d)"
trap 'rm -rf "$JARS"' EXIT

need() { command -v "$1" >/dev/null || { echo "ERROR missing command: $1"; exit 2; }; }
need curl; need jq
PASS=0; FAIL=0
report() { local label="$1" expected="$2" actual="$3"; if [[ "$expected" == "$actual" ]]; then printf 'PASS %-52s expected=%s actual=%s\n' "$label" "$expected" "$actual"; PASS=$((PASS+1)); else printf 'FAIL %-52s expected=%s actual=%s\n' "$label" "$expected" "$actual"; FAIL=$((FAIL+1)); fi; }
code() { curl -sS -o /dev/null -w '%{http_code}' "$@"; }
login() { local user="$1" jar="$2"; code -c "$jar" -H 'Content-Type: application/json' -d "{\"email\":\"$user\",\"password\":\"$ACCESS_PASSWORD\"}" "$BASE/api/auth/login"; }
json_code() { local jar="$1" method="$2" path="$3" data="${4:-}"; if [[ -n "$data" ]]; then code -b "$jar" -H 'Content-Type: application/json' -X "$method" -d "$data" "$BASE$path"; else code -b "$jar" -X "$method" "$BASE$path"; fi; }
body() { curl -sS -b "$1" "$BASE$2"; }

report 'E-00a health' 200 "$(code "$BASE/api/health")"; report 'E-00b ready' 200 "$(code "$BASE/api/ready")"
malformed_payload='{"email":'
report 'E-01 malformed JSON login' 400 "$(code -X POST -H 'Content-Type: application/json' -d "$malformed_payload" "$BASE/api/auth/login")"
invalid_login_payload="{\"email\":\"$ALICE_EMAIL\",\"password\":\"wrong-password\"}"
report 'E-01 invalid credentials' 401 "$(code -X POST -H 'Content-Type: application/json' -d "$invalid_login_payload" "$BASE/api/auth/login")"
report 'E-01 PM login' 200 "$(login "$PM_EMAIL" "$JARS/pm")"; report 'E-01 Alice login' 200 "$(login "$ALICE_EMAIL" "$JARS/alice")"; report 'E-01 Bob login' 200 "$(login "$BOB_EMAIL" "$JARS/bob")"
for p in /api/auth/me /api/me; do report "no-session $p" 401 "$(code "$BASE$p")"; report "Alice $p" 200 "$(json_code "$JARS/alice" GET "$p")"; done
report 'E-03 no-session logout' 401 "$(code -X POST "$BASE/api/auth/logout")"

template_payload="{\"name\":\"$RUN_ID\",\"unit\":\"minutes\",\"min_value\":1,\"max_value\":1000}"
for p in /api/activity-templates /api/templates; do report "no-session POST $p" 401 "$(code -X POST -H 'Content-Type: application/json' -d "$template_payload" "$BASE$p")"; report "Alice POST $p" 403 "$(json_code "$JARS/alice" POST "$p" "$template_payload")"; done
template_raw="$(curl -sS -b "$JARS/pm" -H 'Content-Type: application/json' -d "$template_payload" -w '\n%{http_code}' "$BASE/api/activity-templates")"
template_status="$(printf '%s\n' "$template_raw" | tail -n1)"
template_response="$(printf '%s\n' "$template_raw" | sed '$d')"
template_id="$(jq -r '.template.id // empty' <<<"$template_response")"; [[ -n "$template_id" ]] || { echo 'FAIL bootstrap template (no id)'; exit 1; }
report 'E-05 PM POST /api/activity-templates' 201 "$template_status"
for p in /api/activity-templates /api/templates; do report "no-session GET $p" 401 "$(code "$BASE$p")"; report "Alice GET $p" 200 "$(json_code "$JARS/alice" GET "$p")"; report "PM GET $p" 200 "$(json_code "$JARS/pm" GET "$p")"; done
patch_payload='{ "description":"Issue 3 synthetic resource" }'; for p in "/api/activity-templates/$template_id" "/api/templates/$template_id"; do report "no-session PATCH $p" 401 "$(code -X PATCH -H 'Content-Type: application/json' -d "$patch_payload" "$BASE$p")"; report "Alice PATCH $p" 403 "$(json_code "$JARS/alice" PATCH "$p" "$patch_payload")"; report "PM PATCH $p" 200 "$(json_code "$JARS/pm" PATCH "$p" "$patch_payload")"; done

TZ_VAL="${ACCESS_TIMEZONE:-Asia/Bangkok}"
today="$(TZ="$TZ_VAL" date +%F)"; goal_payload="{\"template_id\":\"$template_id\",\"target\":100,\"start_date\":\"$today\",\"end_date\":\"2099-12-31\"}"
report 'E-08 no-session POST goals' 401 "$(code -X POST -H 'Content-Type: application/json' -d "$goal_payload" "$BASE/api/goals")"; report 'E-08 PM POST goals' 403 "$(json_code "$JARS/pm" POST /api/goals "$goal_payload")"
alice_goal="$(curl -sS -b "$JARS/alice" -H 'Content-Type: application/json' -d "$goal_payload" "$BASE/api/goals" | jq -r '.goal.id')"; bob_goal="$(curl -sS -b "$JARS/bob" -H 'Content-Type: application/json' -d "$goal_payload" "$BASE/api/goals" | jq -r '.goal.id')"; [[ -n "$alice_goal" && -n "$bob_goal" && "$alice_goal" != null && "$bob_goal" != null ]] || { echo 'FAIL bootstrap goals'; exit 1; }
report 'E-09 no-session GET goals' 401 "$(code "$BASE/api/goals")"; report 'E-09 PM GET goals' 403 "$(json_code "$JARS/pm" GET /api/goals)"; report 'E-09 Alice GET goals' 200 "$(json_code "$JARS/alice" GET /api/goals)"
for suffix in '' /summary /revisions /reminder-schedules /records /progress; do path="/api/goals/$alice_goal$suffix"; report "no-session GET $path" 401 "$(code "$BASE$path")"; report "PM GET $path" 403 "$(json_code "$JARS/pm" GET "$path")"; report "Bob GET Alice $path" 404 "$(json_code "$JARS/bob" GET "$path")"; report "Alice GET $path" 200 "$(json_code "$JARS/alice" GET "$path")"; done
revision_payload='{"target":101,"end_date":"2099-12-31"}'
report 'E-12 no-session POST revision' 401 "$(code -X POST -H 'Content-Type: application/json' -d "$revision_payload" "$BASE/api/goals/$alice_goal/revisions")"; report 'E-12 PM POST revision' 403 "$(json_code "$JARS/pm" POST "/api/goals/$alice_goal/revisions" "$revision_payload")"; report 'E-12 Bob POST Alice revision' 404 "$(json_code "$JARS/bob" POST "/api/goals/$alice_goal/revisions" "$revision_payload")"; report 'E-12 Alice POST revision' 201 "$(json_code "$JARS/alice" POST "/api/goals/$alice_goal/revisions" "$revision_payload")"
reminder_payload='{ "local_time":"08:30", "days_of_week":[1] }'; record_payload="{\"activity_date\":\"$today\",\"quantity\":1}"
for suffix in reminder-schedules records; do payload="$reminder_payload"; [[ "$suffix" == records ]] && payload="$record_payload"; path="/api/goals/$alice_goal/$suffix"; report "no-session POST $path" 401 "$(code -X POST -H 'Content-Type: application/json' -d "$payload" "$BASE$path")"; report "PM POST $path" 403 "$(json_code "$JARS/pm" POST "$path" "$payload")"; report "Bob POST Alice $path" 404 "$(json_code "$JARS/bob" POST "$path" "$payload")"; done
report 'E-14 Alice POST reminder' 201 "$(json_code "$JARS/alice" POST "/api/goals/$alice_goal/reminder-schedules" "$reminder_payload")"
report 'E-16 Alice POST record' 201 "$(json_code "$JARS/alice" POST "/api/goals/$alice_goal/records" "$record_payload")"
absent_payload='{"target":99}'
for method in PATCH DELETE; do report "AC-43 $method absent route" 404 "$(json_code "$JARS/alice" "$method" "/api/goals/$alice_goal" "$absent_payload")"; done
report 'E-03 Alice valid logout' 204 "$(json_code "$JARS/alice" POST /api/auth/logout)"
report 'E-03 Alice /me after logout' 401 "$(json_code "$JARS/alice" GET /api/auth/me)"
printf 'SUMMARY pass=%s fail=%s version=%s\n' "$PASS" "$FAIL" "${ACCESS_VERSION:-unknown}"
[[ "$FAIL" -eq 0 ]]
