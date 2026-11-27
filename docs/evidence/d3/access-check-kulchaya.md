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

The redacted Cloud Run retest is recorded in `access-check-cloudrun-kulchaya.txt`. It was run from Google Cloud Shell against the deployed revision and passed all 74 assertions.

| Item | Value |
|---|---|
| GCP project | `cpe334-sec31-ctrl-c-chaya-lab` |
| Service | `habit-tracker` |
| Region | `asia-southeast1` |
| Revision | `habit-tracker-00014-ntq` |
| Traffic | 100% |
| Image digest | `sha256:83583b200d2e3999ccb5365cc5cba49520631ab5250e95b7e8f0a22d99ed3648` |
| Result | `74/74 PASS`, `fail=0` |

The retest includes malformed JSON `400`, valid PM/Alice/Bob login `200`, 401/403/404 ownership checks, owner success, reminder/record creation, and AC-43 absent routes. No password, cookie, token, or private payload was recorded.

## Review decision

Local Docker: PASS (74/74). Cloud Run: PASS (74/74) on revision `habit-tracker-00014-ntq`. Both redacted outputs are attached; no remaining access-matrix blocker was found.
