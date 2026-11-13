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

For the second release, repeat the procedure above, then record its release SHA, immutable digest, revision with 100% traffic, and confirmation that the Lab 5 release banner appears at the public URL before and after sign-in.

## Issue #2 evidence

- Cloud-ready checklist: this file, `.env.example`, `api/src/config/env.ts`, `api/src/server.ts`, and `api/src/app.ts`.
- Verify with `npm run build` and `npm test` on the Issue #2 commit.
- Do not add screenshots containing secrets, passwords, connection strings, or key files.
