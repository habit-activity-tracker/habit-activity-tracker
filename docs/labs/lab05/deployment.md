# Lab 5 deployment guide

This document records the deployment configuration for the Habit & Activity Tracker. It is intentionally free of credentials, real connection strings, service-account keys, and passwords.

## Stack

The application is a Node.js/Express API, a Vite/React web client, and PostgreSQL. Docker Compose builds one multi-stage application image: Express serves the compiled React UI and the API, while a separate one-off `migrate` service applies migrations and seeds the demo baseline. This adapts the Issue #3 guide's separate API/web Dockerfiles to this app's single-origin architecture. The API stores sessions and application data in PostgreSQL; no application state is written to the container filesystem.

The GCP stack is Artifact Registry, one Cloud Run service serving both the API and web UI, a Cloud Run migration job, Cloud SQL for PostgreSQL, and Secret Manager for runtime secrets. Do not commit secret values here.

## Environment variables

| Variable | Purpose | Secret? | Source |
| --- | --- | --- | --- |
| `APP_ENV` | Application environment name | No | `.env` locally; Cloud Run variable |
| `NODE_ENV` | Node runtime mode and secure-cookie behavior | No | `.env` locally; deployment configuration |
| `SESSION_SECRET` | Server-side session signing/configuration secret | Yes | Local uncommitted `.env` or Secret Manager |
| `DATABASE_URL` | PostgreSQL connection URL | Yes | Local `.env` or Secret Manager |
| `TEST_DATABASE_URL` | Isolated database used by API tests | Yes | Test-only local/CI secret |
| `SESSION_TTL` | Session lifetime in hours | No | `.env` or deployment configuration |
| `SESSION_MAX_AGE_HOURS` | Backward-compatible alias for `SESSION_TTL` | No | Only for existing environments |
| `SESSION_COOKIE_SECURE` | Force secure session cookies when `true`; local Compose sets it to `false` for HTTP | No | Deployment configuration only |
| `APP_TIMEZONE` | IANA timezone used for calendar rules | No | `.env` or deployment configuration |
| `SEED_DEMO_PASSWORD` | Local demo seed password | Yes | Local `.env`; never committed or shown in evidence |
| `PORT` | API listen port | No | `.env` or Cloud Run-provided value |
| `HOST` | API bind address | No | `.env`; use `0.0.0.0` in containers |

`.env` is ignored by Git. Only placeholder values belong in `.env.example`. Before every commit, check `git status` and `git diff --cached` for secrets.

## Local commands

```sh
npm ci
cp .env.example .env
docker compose up -d --wait postgres
npm run migrate
npm run seed
npm run build
npm test
npm run start
```

The API listens on `0.0.0.0:$PORT`. Liveness is `GET /api/health` and database readiness is `GET /api/ready`; readiness returns HTTP 503 when PostgreSQL cannot be reached.

After Issue #3 adds the application containers, fill only the local placeholder secrets in `.env`, then run:

```sh
docker compose up --build -d
docker compose ps -a
curl --fail http://localhost:8080/api/health
curl --fail http://localhost:8080/api/ready
```

The default host ports are `8080` for the application and `5433` for PostgreSQL. If either is already occupied, choose alternatives without changing the Compose file:

```sh
HOST_PORT=8081 POSTGRES_HOST_PORT=5434 docker compose up --build -d
```

The `postgres_data` volume is the persistence boundary. `docker compose down` keeps it; do not use `docker compose down -v` when testing persistence.

## GCP release record

Identifiers from the team's verified GCP deployment:

| Item | Value |
| --- | --- |
| GCP project ID | `cpe334-sec31-ctrl-c-chaya-lab` |
| Region | `asia-southeast1` |
| Artifact Registry repository | `habit-tracker` |
| Cloud Run service | `habit-tracker` (single-origin container serving API & UI) |
| Cloud Run migration job | `habit-tracker-migrate` |
| Cloud SQL instance/database | `habit-tracker-pg` / `habit_tracker` |
| Public URL | `https://habit-tracker-tn5ktplddq-as.a.run.app` |

## Release procedure & How to identify running commit

1. Create a feature branch from `lab5-staging` for the Issue.
2. Run the build and automated tests locally (`npm test`, `npm run build`).
3. Open a PR into `lab5-staging`, add label `lab5`, and request teammate review. The author does not approve their own PR (Rule R-09).
4. After review and passing CI, merge into `lab5-staging`.
5. Open a release PR from `lab5-staging` into `main`, request teammate approval, and merge only after required checks pass.
6. The GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) triggers automatically on push to `main`:
   - Runs `test-and-docker` CI check.
   - Authenticates to GCP keylessly via Workload Identity Federation (WIF).
   - Builds container image tagged with the full 40-character commit SHA (`$IMAGE_TAG`).
   - Resolves immutable image digest from Artifact Registry.
   - Updates and executes Cloud Run migration job (`habit-tracker-migrate`).
   - Deploys Cloud Run service (`habit-tracker`) with traffic shifted 100% to latest revision.
   - Runs public smoke test (`deploy/smoke_test.py`) against `$SERVICE_URL`.
7. **How to identify the running commit on Cloud Run:**
   - In the GitHub Actions Step Summary, note `Commit image tag: <SHA>` and the immutable `Digest: <DIGEST>`.
   - In GCP Console, open Cloud Run → `habit-tracker` → **Revisions**. The revision receiving 100% traffic must use that same image digest (and its image tag is the same full `<SHA>`).
   - This image tag/digest pair is the source of truth for the running commit; compare the SHA with the merge commit on `main`.

## Verified first automated release

The first automatic deployment completed successfully after merge commit `6b610b04ced97dd681c81128a83206e0b385669d` reached `main`.

| Item | Verified value |
| --- | --- |
| Workflow run | [Deploy demo run #43387891834](https://github.com/habit-activity-tracker/habit-activity-tracker/actions/runs/43387891834) |
| Image tag / release commit | `6b610b04ced97dd681c81128a83206e0b385669d` |
| Immutable image digest | `asia-southeast1-docker.pkg.dev/cpe334-sec31-ctrl-c-chaya-lab/habit-tracker/habit-tracker@sha256:2c4a8ee974d28a170db31dbe3c7ec6e11306156c72bb251b8cfcdb77f8ee783c` |
| Public URL | `https://habit-tracker-tn5ktplddq-as.a.run.app` |
| Smoke test | Passed: health, readiness, UI, and unauthenticated API check |

## Verified release pair for Issue #8

Release A and Release B were both deployed successfully and were used to verify persistence across rollback and roll-forward.

| Release | Commit SHA | Immutable image digest | Verification |
| --- | --- | --- | --- |
| A | `6b610b04ced97dd681c81128a83206eb0385669d` | `sha256:2c4a8ee974d28a170db31dbe3c7ec6e11306156c72bb251b8cfcdb77f8ee783c` | Ready, 100% traffic, smoke test passed |
| B | `d99e4f681df3d432b382ccc48b06c1b3227ab925` | `sha256:e83edc8a96615f96d2043e5ab9d804af2f1f0621d1891821246c461ec8da5eab` | Ready, 100% traffic, smoke test passed |

Rollback to Release A and roll-forward to Release B both preserved the same goal and daily record. The duplicate-record rule was also verified before rollback. The related workflow runs are [rollback run #3](https://github.com/habit-activity-tracker/habit-activity-tracker/actions/runs/43397228496) and [roll-forward run #4](https://github.com/habit-activity-tracker/habit-activity-tracker/actions/runs/43398115548).

## Cloud-readiness checklist

1. **Uploaded files:** This Sprint 1 application has no upload feature and no local-folder upload path. Application state is stored in PostgreSQL, not in the container filesystem.
2. **Production-safe seed:** `api/src/seed/seed.ts` reads `SEED_DEMO_PASSWORD` from environment configuration, hashes it with bcrypt, and uses idempotent upserts. Passwords are not rendered or logged.
3. **No production dev shortcuts:** The login page has only email/password fields. There is no user picker, impersonation shortcut, or default password in the UI.
4. **Database sessions:** `api/src/services/auth.service.ts` stores and reads sessions from PostgreSQL's `sessions` table; sessions are not kept in server memory.
5. **Cloud Run port contract:** `api/src/config/env.ts` reads and validates `PORT`, defaults `HOST` to `0.0.0.0`, and `api/src/server.ts` passes both values to `listen()`.
6. **Readiness:** `GET /api/ready` runs `SELECT 1`, returns `200` when PostgreSQL is reachable, and returned `503 {"status":"not_ready"}` during the verified local database-stop test.

## Definition of Done (Handout Section 11)

- [x] A fresh clone builds and runs; settings come from environment variables and no secret is in the repository, image, logs, or evidence.
- [x] The public URL serves the latest release from `main`, and the running commit is identifiable by the full SHA and image digest.
- [x] Data survived rollback to Release A and roll-forward to Release B.
- [x] CI runs on PRs into `lab5-staging` and `main`; the intentionally failing C-02 PR was blocked by the required check.
- [x] The latest releases reached `main` through reviewed PRs and were deployed by the workflow.
- [x] The repository is public and remains public through grading.
- [x] This deployment guide and the evidence index are complete; both members participated in implementation, review, testing, and deployment.
- [ ] Evidence PDF submitted on LEB2. This submission step is intentionally outside this documentation change.

## Evidence index

| Rubric part | Evidence | What it proves |
| --- | --- | --- |
| Part 1: CI and quality gate | [CI PR #45](https://github.com/habit-activity-tracker/habit-activity-tracker/pull/45), [C-02 PR #52](https://github.com/habit-activity-tracker/habit-activity-tracker/pull/52), [CI workflow](../../../.github/workflows/ci-docker.yml) | Passing PR checks and a failing required check that blocked merge |
| Part 2: Docker and reproducible configuration | [Docker PR #44](https://github.com/habit-activity-tracker/habit-activity-tracker/pull/44), `.env.example`, `Dockerfile`, `.dockerignore` | Clean Docker build, environment configuration, and no committed secret |
| Part 3: GCP deployment and persistence | [First deployment PR #51](https://github.com/habit-activity-tracker/habit-activity-tracker/pull/51), public URL above, Release A/B table, rollback/roll-forward runs | Public UI/API/database operation and persistence across redeployments |
| Part 4: Repeatable release pipeline | [Workflow release PR #55](https://github.com/habit-activity-tracker/habit-activity-tracker/pull/55), [deployment-proof PR #56](https://github.com/habit-activity-tracker/habit-activity-tracker/pull/56), [release PR #58](https://github.com/habit-activity-tracker/habit-activity-tracker/pull/58), `deploy.yml`, `release.sh` | Reviewed staging-to-main releases, workflow deployment, commit/digest traceability |

Screenshots belong beside the corresponding evidence in the final PDF. Each screenshot must have a numbered caption identifying the check/requirement, commit/run/URL, and must not show passwords, secret values, connection strings, or key files.

## Issue #2 evidence

- Cloud-ready checklist: this file, `.env.example`, `api/src/config/env.ts`, `api/src/server.ts`, and `api/src/app.ts`.
- Verify with `npm run build` and `npm test` on the Issue #2 commit.
- Do not add screenshots containing secrets, passwords, connection strings, or key files.
