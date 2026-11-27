# Issue 5 — Coverage and UI traceability evidence

- **Candidate commit:** `03231fdcd58b9aaf5add0b292ed5e074f7b0b4ba`
- **Branch:** `feature/d3-readiness-evidence`
- **Run date/time:** 27 November 2026, 21:56 ICT
- **Environment:** local Docker PostgreSQL service on port 5433
- **Coverage command:**
  `npx cross-env NODE_OPTIONS=--experimental-vm-modules jest --selectProjects api --runInBand --coverage --coverageReporters=text --coverageReporters=json-summary`

## Coverage result

| Scope | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| All instrumented API source | 88.17% (619/702) | 78.57% (341/434) | 91.42% (96/105) | 91.61% (546/596) |
| Service/domain scope (`src/services` + `src/validators`) | 88.24% (225/255) | 84.52% (213/252) | 100.00% (33/33) | 97.87% (184/188) |

The service/domain statement result is below the NFR-06 target of 90%. NFR-06 therefore remains a disclosed gap; this run does not claim AC-S3-13 as passed.

## Test execution supporting the measurement

| Suite | Result |
|---|---|
| API Jest suites | 14 passed |
| API tests | 83 passed, 0 failed, 0 skipped |

The raw Jest coverage summary was generated at `api/coverage/coverage-summary.json` during the run. It is not committed because coverage output is generated data; the table above records the reproducible summary and scope.

## UI traceability gap (GAP-02)

AC-34, AC-38, AC-44, and AC-50 have no dedicated component-level automated tests in this repository. The Delivery 3 contract does not add a component-test framework; the current evidence remains build/E2E and the acceptance matrix must keep these rows marked incomplete for component-test coverage. No unsupported PASS claim is made.

## Remaining work

- Add focused component tests in the final-delivery test plan, or explicitly retain the four UI rows as incomplete.
- Increase service/domain statement coverage to at least 90%, or retain this measured gap with an owner and remediation issue.
- Chayanit supplies the separate isolated-restore evidence for GAP-06.
