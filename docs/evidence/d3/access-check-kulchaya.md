# Delivery 3 — Access matrix independent review

**Reviewer:** Kulchaya  
**Date:** 27 November 2026 (Asia/Bangkok)  
**Local revision checked:** `1e9f9f767da239c2ace2c6a2c34257a2460d33ce`  
**Accounts:** synthetic `pm1@example.com`, `alice@example.com`, and `bob@example.com`; password values and cookies are not recorded.

## Router-to-matrix review

I checked `api/src/app.ts` and all route files against `docs/deliverable-3/endpoint-list.md`. The matrix includes the mounted auth aliases, template aliases, goal summary/revision routes, reminder create/list routes, records, progress, and the intentionally absent goal PATCH/DELETE routes. No router endpoint was found to be missing from the matrix.

## Independent local Docker run

The repeatable `scripts/access-check.sh` was run against the freshly built local Compose app at `http://localhost:8080`. The output was redacted by design: it contains only endpoint labels and status assertions.

```text
PASS E-01 malformed JSON login       expected=400 actual=400
PASS E-01 invalid credentials        expected=401 actual=401
PASS E-01 PM/Alice/Bob login         expected=200 actual=200
PASS owner and role/ownership checks expected=200/401/403/404 as expected
PASS E-12 revisions                  expected=201 actual=201
PASS E-14 reminder create            expected=201 actual=201
PASS E-16 record create              expected=201 actual=201
PASS AC-43 PATCH/DELETE absent       expected=404 actual=404
SUMMARY pass=74 fail=0 version=unknown
```

Run time: `2026-11-27 17:35 ICT`. No password, cookie, token, or private payload was captured.

## Cloud Run run status

The existing redacted Cloud Run artifact is `access-check-cloudrun.txt`. It records `73/74 PASS` with the expected pre-RC failure: malformed JSON returned `500` on the deployed `v0.2.0` service before the Issue 2 fix was deployed.

I also attempted an independent run against the current public service URL using the local synthetic password without recording it. Login for the three synthetic accounts returned `401`, so the run could not proceed to resource checks. This is a credential/configuration blocker, not a pass result; a Cloud Shell run with the service's configured synthetic demo credential must be attached before approval.

## Review decision

Local Docker: PASS (74/74). Cloud Run: evidence exists but requires a successful authenticated rerun on the intended deployed revision. Do not merge until the Cloud Run output is attached with version, date, role labels, and no secrets/cookies.
