# Performance Benchmark Log (S2-F10-P / NFR-01)
Timestamp: 2026-11-24T14:58:23.489Z
Feature: S2-F10-P (Performance evidence and 100k benchmark)
Status: PASS

## Environment & Host Specification
- Platform: Darwin 23.6.0 (x64)
- CPU: Intel(R) Core(TM) i5-8210Y CPU @ 1.60GHz (4 cores)
- Total Memory: 8.00 GB
- Node.js Version: v24.14.0
- Database: PostgreSQL 16 Alpine on Docker Compose (port 5433)

## Benchmark Configuration
- Database Table: daily_records
- Total Seeded Records: 100002
- Tested Endpoint: GET /api/goals/:id/records
- Warm-up Requests: 100
- Measured Requests: 1000

## Measured Latency Distribution (Server Turnaround, Excl. WAN Transfer)
- Min: 57.03 ms
- Average: 100.59 ms
- p50 (Median): 79.79 ms
- p90: 148.12 ms
- p95: 187.46 ms (Target: <= 500 ms)
- p99: 461.14 ms
- Max: 983.88 ms

## Verification Outcome
- NFR-01 Requirement: p95 <= 500 ms
- Observed p95: 187.46 ms
- Outcome: COMPLIANT (PASSED)
