# S2-F10-P — Performance Evidence and 100k Benchmark

## Version history

| Version | Date | Author | Reviewer | Change description |
|---|---|---|---|---|
| v1.0 | 24 November 2026 | Chayanit Kuntanarumitkul | Kulchaya Paipinij | Initial contract for Deliverable 2 Sprint 2 feature S2-F10-P. |

## Linked requirements

- **Canonical Feature:** F-10 (Testable deployment, security, and verification baseline).
- **Non-Functional Requirements:** NFR-01 (API response latency: p95 $\le 500$ ms for authenticated reads under standard load, excluding network transfer).
- **Architecture & SRS Decisions:** AD-04 (PostgreSQL relational data store with indexed queries), AD-11 (Docker Compose local testing baseline).

## Feature SDS: behavior and workflow

S2-F10-P provides automated, reproducible performance evidence proving that the database schema, indexing strategy, and query implementation scale effectively when the system accumulates 100,000 activity records.

### Benchmark workflow
1. **Deterministic Benchmark Seed Generation:**
   - A dedicated Node.js/TypeScript script (`scripts/benchmark-seed.ts`) seeds the database with exactly 100,000 valid `daily_records` rows across multiple participant goals.
   - The generator uses a fixed random seed / deterministic date-stride algorithm to prevent composite key `(goal_id, activity_date)` collisions.
   - **Production Safety Guard:** The generator checks `DATABASE_URL` and `NODE_ENV`. If targeting a production environment, execution is immediately aborted with exit code 1.
2. **Warm-Up Phase:**
   - The benchmark harness (`scripts/benchmark.ts`) logs in as an authenticated participant.
   - It issues 100 warm-up HTTP GET requests to warm PostgreSQL buffer cache and Node.js JIT compilation.
3. **Measurement Phase:**
   - The harness issues 1,000 timed requests to the authenticated read endpoint (`GET /api/goals/:id/records` and `GET /api/goals/:id/progress`).
   - Timings measure server turnaround time (request dispatch to response headers/body completion) in milliseconds.
4. **Statistical Percentile Calculation:**
   - Latencies are sorted in ascending order.
   - Percentiles are computed:
     - $p50 = \text{latency}[\lfloor 0.50 \times N \rfloor]$
     - $p90 = \text{latency}[\lfloor 0.90 \times N \rfloor]$
     - $p95 = \text{latency}[\lfloor 0.95 \times N \rfloor]$
     - $p99 = \text{latency}[\lfloor 0.99 \times N \rfloor]$
   - Pass criteria: $p95 \le 500$ ms.
5. **Reproducible Output Logging:**
   - Outputs machine specifications, PostgreSQL version, total row count, request count, and percentile summary to `docs/evidence/performance-benchmark.log`.

---

## UI / API / data definitions

### Data schema and persistence
- **Tables used:** `users`, `activity_templates`, `goals`, `daily_records`.
- **Schema changes:** **no change**. Uses existing indexed table `daily_records` (`CREATE INDEX IF NOT EXISTS idx_daily_records_goal_id ON daily_records(goal_id)`).
- **Migration:** **no change**.

### API contract
- **Endpoint benchmarked:** `GET /api/goals/:id/records` and `GET /api/goals/:id/progress`.
- **Request / Response shape:** **no change** (benchmarks existing Sprint 1 endpoints under load).

### UI definitions
- **UI components:** **no change** (non-UI engineering verification feature).

---

## Environment and specification baseline

| Parameter | Baseline value | Notes |
|---|---|---|
| **Environment** | Local Docker Compose | Standard testing environment (`docker-compose.yml`). |
| **PostgreSQL version** | PostgreSQL 16 Alpine | Container: `postgres:16-alpine`. |
| **Database Port** | 5433 (host) $\to$ 5432 (container) | Port mapped per project conventions. |
| **Target records** | 100,000 `daily_records` | Distributed across active goals. |
| **Warm-up requests** | 100 requests | Executed before recording measurements. |
| **Measured requests** | 1,000 requests | Sequential / controlled batch. |
| **Latency target** | $p95 \le 500$ ms | Excludes client-to-cloud WAN latency. |

---

## Validation, errors, boundaries, permissions

- **Safety boundary:** Script strictly forbids execution against any production Cloud SQL instance or non-test database URL.
- **Data integrity:** Record quantities must be within the template's `[min_value, max_value]`; dates must be within goal periods.
- **Authentication:** Benchmark runner authenticates with valid credentials, verifying that session cookies and ownership checks (`requireOwnedGoal`) remain active during performance measurement.

---

## Acceptance criteria

| ID | Description |
|---|---|
| **AC-S2-15** | A deterministic seed generator populates 100,000 valid `daily_records` in PostgreSQL without unique-constraint conflicts, database errors, or corrupting existing seed accounts. |
| **AC-S2-16** | An automated benchmark runner executes a 100-request warm-up followed by 1,000 authenticated read requests against the 100,000-record database, calculating p50, p90, p95, and p99 response times. |
| **AC-S2-17** | The measured p95 response time for the authenticated goal query under the 100,000-record benchmark is $\le 500$ ms, evidenced by the benchmark script and committed log output. |

---

## Software Test Specification (STS)

| Test ID | Linked AC | Level | Preconditions / Input | Action | Expected Outcome |
|---|---|---|---|---|---|
| **TEST-S2-15** | AC-S2-15 | Integration / Script | Clean Docker PostgreSQL instance with migrations applied. | Execute `npm run benchmark:seed`. | Generates 100,000 rows in `daily_records`; query `SELECT count(*) FROM daily_records` returns $\ge 100,000$. |
| **TEST-S2-16** | AC-S2-16 | Integration / Script | 100,000 records seeded; server running on port 3000. | Execute `npm run benchmark:run`. | Completes 100 warm-up + 1,000 measured requests; outputs distribution statistics (p50, p90, p95, p99). |
| **TEST-S2-17** | AC-S2-17 | Performance Benchmark | 1,000 measured requests recorded. | Assert $p95 \le 500$ ms. | $p95$ value is below 500 ms; output logged to `docs/evidence/performance-benchmark.log`. |

---

## Definition of Done

1. Seed script `scripts/benchmark-seed.ts` is implemented and verified to insert 100,000 valid rows in local Docker Compose.
2. Benchmark script `scripts/benchmark.ts` is implemented and computes exact percentile latencies.
3. p95 latency is verified to be $\le 500$ ms on the documented local reference environment.
4. Benchmark script, seed script, and output log are committed and reproducible via npm scripts (`npm run benchmark`).
