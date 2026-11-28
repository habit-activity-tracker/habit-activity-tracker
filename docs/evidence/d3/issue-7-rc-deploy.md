# Delivery 3 — Issue 7 RC deployment record

**Branch:** `docs/d3-uat-defects`
**Source commit:** `3bb7830c44785841ee490dd0eb10a6431cd82d69` (`d3-staging`, merge of PR #144)
**Deployment date:** 28 November 2026 (Thailand time)
**Status:** **RC DEPLOYED AND SMOKE-TESTED — independent UAT remains NOT RUN**

## Isolation and environment

The RC was deployed in project `cpe334-sec31-ctrl-c-chaya-lab`, region `asia-southeast1`. The production Cloud Run service, production Cloud SQL instance, production secrets, and `habit-tracker-restore-check-20261127` were not used or modified. The RC has separate service, jobs, Cloud SQL instance/database/user, service account, and Secret Manager values.

| Resource | Actual RC value |
|---|---|
| Cloud Run service / revision / traffic | `habit-tracker-rc-20261128` / `habit-tracker-rc-20261128-00001-q7n` / 100% |
| URL | `https://habit-tracker-rc-20261128-860543640437.asia-southeast1.run.app` |
| Cloud SQL | `habit-tracker-rc-pg-20261128`, PostgreSQL 16 Enterprise, `db-f1-micro`, 10 GB SSD, `asia-southeast1-b` |
| RC database / user | `habit_tracker_rc` / `habit_tracker_rc_app` |
| Cloud SQL connection | `cpe334-sec31-ctrl-c-chaya-lab:asia-southeast1:habit-tracker-rc-pg-20261128` |
| RC service account | `habit-rc-runner-20261128@cpe334-sec31-ctrl-c-chaya-lab.iam.gserviceaccount.com` |
| Secrets, version 1 | `habit-tracker-rc-20261128-{database-url,session-secret,demo-password}` |

The RC SQL instance has public IPv4 enabled, but `authorizedNetworks` is empty. Cloud Run uses the Cloud SQL attachment/socket. The RC service account has `roles/cloudsql.client` and `roles/secretmanager.secretAccessor` only on the three RC secrets. No production service-account binding was changed.

## Build and immutable image

Cloud Build command: `gcloud builds submit . --tag="$IMAGE_URI" --project="$PROJECT_ID" --region="$REGION"`.

| Item | Actual evidence |
|---|---|
| Build ID / result / duration | `9348667d-5f3e-452e-a621-d1d091dc2213` / SUCCESS / 45 seconds |
| Image tag | `asia-southeast1-docker.pkg.dev/cpe334-sec31-ctrl-c-chaya-lab/habit-tracker/habit-tracker:3bb7830c44785841ee490dd0eb10a6431cd82d69` |
| Immutable digest | `sha256:2e7ef50448a775fc4ba6c9e908b1af4f952f500364d60ed9263ae9105ef3a69d` |
| Digest verification | Independently checked with `gcloud artifacts docker images describe` |

The build-stage `npm audit` reported 18 moderate vulnerabilities. The runtime dependency audit after `npm ci --omit=dev` reported 0 vulnerabilities. This does not establish that the entire dependency tree is vulnerability-free.

## Migration and seed jobs

| Job | Execution | Result | Verified configuration |
|---|---|---|---|
| `habit-tracker-rc-migrate-20261128` | `habit-tracker-rc-migrate-20261128-99pdf` | PASS — `Completed=True`, `succeededCount: 1`, 17.43 seconds; completed `2026-11-28T07:46:17.478702Z` | Pinned image digest, RC-only service account, RC Cloud SQL attachment, `node api/dist/src/db/migrate.js`, retry count 0 |
| `habit-tracker-rc-seed-20261128` | `habit-tracker-rc-seed-20261128-2vj44` | PASS — `Completed=True`, `succeededCount: 1`, 15.52 seconds; completed `2026-11-28T07:48:17.741500Z` | Pinned image digest, RC-only service account, RC Cloud SQL attachment, `node api/dist/src/seed/seed.js`, retry count 0 |

The seed created the synthetic account used for smoke testing, `pm1@example.com`. Its generated password remained in the Cloud Shell variable `RC_DEMO_PASSWORD`; it was not printed, committed, or copied into this evidence.

## Service, health, readiness and smoke

The service was deployed from the pinned digest using the RC-only resources with `--port=3000`, `--min=0`, `--max=2`, and `--allow-unauthenticated`. Cloud Run completed service/revision creation, traffic routing, and IAM policy configuration.

| Check | Actual result |
|---|---|
| `GET /api/health` | PASS — HTTP 200; `{"status":"ok","commit":"3bb7830c44785841ee490dd0eb10a6431cd82d69"}` |
| `GET /api/ready` | PASS — HTTP 200; `{"status":"ready"}`; confirms database reachability |
| `deploy/smoke_test.py` | PASS — 6/6: `/api/health`, `/api/ready`, `/`, unauthenticated `/api/templates`, login plus authenticated `/api/me`, and logout |

The smoke used `EXPECTED_COMMIT_SHA=3bb7830c44785841ee490dd0eb10a6431cd82d69`, `SMOKE_EMAIL=pm1@example.com`, and `SMOKE_PASSWORD` sourced privately from `RC_DEMO_PASSWORD`. The smoke script did not print credentials.

## UAT and remaining work

This successful deployment and team smoke test do **not** count as independent UAT. UAT-01 through UAT-11 in `docs/deliverable-3/uat-plan.md` remain **NOT RUN** until named independent testers execute them and record their own observed results.

Remaining Issue #133 work:

1. Assign independent testers; execute and record UAT-01 through UAT-11.
2. Create the defect register from actual UAT findings; fix and re-test any defects.
3. Update the traceability matrix/documents and conduct the final technical-debt review from actual UAT evidence.
4. Run the documented RC-only cleanup after UAT and evidence retention approval.

The provision plan is retained in [rc-cloud-shell-provisioning.md](rc-cloud-shell-provisioning.md). It is a plan, not a claim that every planned command was used in the actual deployment.

## Independent UAT evidence

### UAT-01 — Anonymous health, readiness, and UI

- **Tester:** Kulchaya
- **Date:** 28 November 2026 (Asia/Bangkok)
- **Revision:** `habit-tracker-rc-20261128-00001-q7n`
- **Source commit:** `3bb7830c44785841ee490dd0eb10a6431cd82d69`
- **Method:** PowerShell `Invoke-WebRequest`; no credentials, cookies, or secrets used

| Request | Result |
|---|---|
| `GET /api/health` | HTTP 200; `{"status":"ok","commit":"3bb7830c44785841ee490dd0eb10a6431cd82d69"}` |
| `GET /api/ready` | HTTP 200; `{"status":"ready"}` |
| `GET /` | HTTP 200; web application HTML returned |

**UAT-01 result: PASS.** UAT-02 through UAT-11 are recorded below.

### UAT-02 to UAT-11 — Independent browser UAT

- **Tester:** Antigravity browser subagent acting for Kulchaya
- **Date:** 28 November 2026 (Asia/Bangkok)
- **Origin verified:** `https://habit-tracker-rc-20261128-860543640437.asia-southeast1.run.app`
- **Revision:** `habit-tracker-rc-20261128-00001-q7n`
- **Source commit:** `3bb7830c44785841ee490dd0eb10a6431cd82d69`
- **Evidence:** redacted browser evidence; final revision screenshot `final_step_121.png`

| ID | Result | Observation |
|---|---|---|
| UAT-02 | PASS | Alice login displayed Participant; logout redirected to login and protected `/api/auth/me` returned 401. |
| UAT-03 | PASS | PM created the active test template; Alice had no create/edit controls. |
| UAT-04 | PASS | Alice created a goal with HTTP 201; Bob did not see it. |
| UAT-05 | PASS | Record creation succeeded; duplicate returned 409 and the original quantity was unchanged. |
| UAT-06 | PASS | Today and day -7 returned 201; day -8 and tomorrow returned 400. |
| UAT-07 | PASS | Bob received 404 `GOAL_NOT_FOUND`; PM received 403 `ROLE_FORBIDDEN`; no private data leaked. |
| UAT-08 | PASS | Progress capped at 100%; history was scoped to the selected goal. |
| UAT-09 | PASS | `Revise goal` was visible; revision returned 201, showed Version 2, preserved the existing record, and displayed revision history. |
| UAT-10 | PASS | Three reminders were created with future Bangkok-time occurrences; the fourth was rejected. |
| UAT-11 | PASS | Invalid target/date values returned HTTP 400 with safe messages; the form remained usable. |

**UAT-02 to UAT-11 result: PASS.** No new defect was found. The earlier run against `habit-tracker-tn5ktplddq-as.a.run.app` was not used as RC evidence because that origin is the Lab 5 production service, not this RC.
