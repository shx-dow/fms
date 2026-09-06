#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"
FACULTY_EMAIL="${FACULTY_EMAIL:-faculty1@example.edu}"
FACULTY_PASSWORD="${FACULTY_PASSWORD:?set FACULTY_PASSWORD to a seeded dev password}"
HOD_EMAIL="${HOD_EMAIL:-hod.cse@example.edu}"
HOD_PASSWORD="${HOD_PASSWORD:?set HOD_PASSWORD to a seeded dev password}"
FACULTY_COOKIE="${TMPDIR:-/tmp}/fms-faculty.cookies"
HOD_COOKIE="${TMPDIR:-/tmp}/fms-hod.cookies"
rm -f "$FACULTY_COOKIE" "$HOD_COOKIE"

curl -fsS -c "$FACULTY_COOKIE" -b "$FACULTY_COOKIE" -X POST \
  -d "email=$FACULTY_EMAIL&password=$FACULTY_PASSWORD" "$BASE_URL/login" >/dev/null

REPORT_JSON=$(curl -fsS -b "$FACULTY_COOKIE" "$BASE_URL/api/reports")
REPORT_ID=$(printf '%s' "$REPORT_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["report"]["id"])')

curl -fsS -b "$FACULTY_COOKIE" -H 'content-type: application/json' \
  -d "{\"reportId\":\"$REPORT_ID\",\"teaching\":[{\"courseCode\":\"CSE-301\",\"courseName\":\"Database Systems\",\"programLevel\":\"B.Tech\",\"classType\":\"Lecture\",\"scheduled\":4,\"conducted\":4,\"missed\":0,\"syllabusCompletion\":20}],\"summary\":\"Weekly teaching completed.\",\"completion\":100,\"status\":\"DRAFT\"}" \
  "$BASE_URL/api/reports" >/dev/null

curl -fsS -b "$FACULTY_COOKIE" -H 'content-type: application/json' \
  -d "{\"reportId\":\"$REPORT_ID\",\"teaching\":[{\"courseCode\":\"CSE-301\",\"courseName\":\"Database Systems\",\"programLevel\":\"B.Tech\",\"classType\":\"Lecture\",\"scheduled\":4,\"conducted\":4,\"missed\":0}],\"summary\":\"Weekly teaching completed.\",\"completion\":100,\"status\":\"SUBMITTED\"}" \
  "$BASE_URL/api/reports" >/dev/null

curl -fsS -c "$HOD_COOKIE" -b "$HOD_COOKIE" -X POST \
  -d "email=$HOD_EMAIL&password=$HOD_PASSWORD" "$BASE_URL/login" >/dev/null

QUEUE=$(curl -fsS -b "$HOD_COOKIE" "$BASE_URL/api/reviews")
printf '%s' "$QUEUE" | python3 -c 'import json,sys; assert json.load(sys.stdin)["reports"]; print("review queue: ok")'

curl -fsS -b "$HOD_COOKIE" -H 'content-type: application/json' \
  -d "{\"reportId\":\"$REPORT_ID\",\"decision\":\"APPROVED\",\"remarks\":\"Reviewed in API smoke test.\"}" \
  "$BASE_URL/api/reviews" >/dev/null

curl -fsS -b "$HOD_COOKIE" "$BASE_URL/api/audit" | python3 -c 'import json,sys; actions={e["action"] for e in json.load(sys.stdin)["events"]}; assert "REPORT_SUBMITTED" in actions and "APPROVED" in actions; print("audit trail: ok")'
echo "faculty save/submit: ok"
echo "hod review: ok"
