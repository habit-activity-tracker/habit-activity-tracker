# Lab 5 deployment guide

This document records the deployment configuration for the Habit & Activity Tracker. It is intentionally free of credentials, real connection strings, service-account keys, and passwords.

## Stack

The application is a Node.js/Express API, a Vite/React web client, and PostgreSQL. In the Issue #2 baseline, Docker Compose runs only PostgreSQL; the API and web client are run with the npm scripts. The Docker application services are intentionally deferred to Issue #3. The API stores sessions and application data in PostgreSQL; no application state is written to the container filesystem.

The planned GCP stack is Artifact Registry, Cloud Run for the API and web service, Cloud SQL for PostgreSQL, and Secret Manager for runtime secrets. Resource names must be filled in after the team creates them; do not commit secret values here.

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
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
```

The `postgres_data` volume is the persistence boundary. `docker compose down` keeps it; do not use `docker compose down -v` when testing persistence.

## GCP release record

Fill these identifiers from the team's actual GCP project and deployment after Issue #1/Issue #5. Do not invent them in evidence:

| Item | Value |
| --- | --- |
| GCP project ID | `TODO: team project ID` |
| Region | `TODO: e.g. asia-southeast1` |
| Artifact Registry repository | `TODO` |
| Cloud Run API service | `TODO` |
| Cloud Run web service | `TODO` |
| Cloud SQL instance/database | `TODO` |
| Public URL | `TODO` |

## Release procedure

1. Create a feature branch from `lab5-staging` for the Issue.
2. Run the build and automated tests locally.
3. Open a PR into `lab5-staging`, add label `lab5`, and request a specific review from the teammate. The author does not approve their own PR.
4. After review and passing CI, merge into `lab5-staging`.
5. Open a release PR from `lab5-staging` into `main`, request teammate approval, and merge only after required checks pass.
6. The deploy workflow runs only from `main`, tags the image with the full commit SHA, runs migrations as a separate step, deploys the service, and performs a read-only smoke test.
7. Record the release commit SHA, workflow run URL, image digest, and Cloud Run revision in the evidence index. The running commit is identified from the workflow summary and Cloud Run revision metadata.

## Issue #2 evidence

- Cloud-ready checklist: this file, `.env.example`, `api/src/config/env.ts`, `api/src/server.ts`, and `api/src/app.ts`.
- Verify with `npm run build` and `npm test` on the Issue #2 commit.
- Do not add screenshots containing secrets, passwords, connection strings, or key files.
