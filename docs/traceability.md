# Requirements traceability — Sprint 1 baseline

| Requirement | Feature | Sprint | Acceptance criterion / test |
|---|---|---|---|
| FR-01 | F-01 | S1 | AC-01/AC-02/AC-02a; TEST-01/TEST-02/TEST-02a login validation. |
| FR-02 | F-01 | S1 | AC-03–AC-05; TEST-03–TEST-05 current user and logout. |
| FR-03 | F-03 | S1 | AC-31–AC-34; TEST-31–TEST-34 template creation. |
| FR-04 | F-03 | S1 | AC-35, AC-35a, AC-36–AC-38; TEST-35, TEST-35a, TEST-36–TEST-38 template browsing. |
| FR-05 | F-03 | S1 | AC-17–AC-22; TEST-17–TEST-22 template editing. |
| FR-06 | F-04 | S1 | AC-39/AC-44; TEST-39/TEST-44 goal creation journey. |
| FR-07 | F-04 | S1 | AC-42; TEST-42/TEST-42a target/date validation. |
| FR-08 | F-02/F-04/F-07 | S1 | AC-26/AC-39/AC-48/AC-49; TEST-29/TEST-39/TEST-48/TEST-49 ownership and retrieval. |
| FR-09 | F-05 | S1 | AC-08; TEST-08 daily record creation. |
| FR-10 | F-05 | S1 | AC-14; TEST-14 duplicate rejection without overwrite. |
| FR-11 | F-06 | S1 | AC-45–AC-47; TEST-45–TEST-47 progress calculation. |
| FR-12 | F-05 | S1 | AC-11–AC-13/AC-16; TEST-11–TEST-13/TEST-16 record validation. |
| FR-13 | F-05/F-07 | S1 | AC-15/AC-47; TEST-15/TEST-47 separate goals remain independent. |
| FR-14 | F-02/F-07 | S1 | AC-25–AC-27/AC-49; TEST-28–TEST-30/TEST-49 privacy and authorization. |
| FR-15 | F-07 | S1 | AC-44/AC-50; TEST-44/TEST-50 UI state and history/progress views. |
| FR-16 | F-11 | S3 | Future F-11 contract; no Sprint 1 implementation or test. |
| BR-01 | F-06 | S1 | AC-45; TEST-45 total-period target. |
| BR-02 | F-06 | S1 | AC-45; TEST-45 progress formula. |
| BR-03 | F-06 | S1 | AC-45; TEST-45 half-up rounding and cap. |
| BR-04 | F-05 | S1 | AC-14; TEST-14 unique `(goal_id, activity_date)`. |
| BR-05 | F-05/F-07 | S1 | AC-15/AC-47; TEST-15/TEST-47 same-template goal isolation. |
| BR-06 | F-05 | S1 | AC-13; TEST-13 inclusive range. |
| BR-07 | F-05 | S1 | AC-11; TEST-11 Asia/Bangkok date boundary. |
| BR-08 | F-04 | S1 | AC-42; TEST-42/TEST-42a goal date rules. |
| BR-09 | F-05 | S1 | AC-12; TEST-12 goal-period boundary. |
| BR-10 | F-03/F-04 | S1 | AC-19/AC-43; TEST-19/TEST-43 immutable unit and goal lifecycle. |
| BR-11 | F-02 | S1 | AC-23–AC-27; TEST-26–TEST-30 privacy/role enforcement. F-11 sharing remains out of scope in S3. |
| NFR-01 | F-10 | S2 | N-01 planned performance verification. |
| NFR-02 | F-01/F-02/F-04 | S1 | AC-04/AC-23/AC-40; TEST-04/TEST-26/TEST-40 protected access. |
| NFR-03 | F-01 | S1 | AC-06; TEST-06 bcrypt and log inspection. |
| NFR-04 | F-05/F-08 | S1 | AC-11; TEST-11 UTC persistence/timezone behavior. |
| NFR-05 | F-03/F-04/F-05 | S1 | Contract error-shape tables and TEST-16/TEST-20/TEST-32/TEST-42. |
| NFR-06 | F-10 | S1 | Local coverage command/report plus service/domain and endpoint-permission test review. M-01/M-02 cover secrets and clean setup, not coverage. |
| NFR-07 | F-10 | S3 | N-07 planned secret/deployment/recovery verification. |

## Coverage gaps and approved changes

Coverage gaps: AC-02a and AC-43 have no automated test. AC-06 covers bcrypt storage but not log inspection; AC-07 covers `HttpOnly` and `SameSite=Lax` but not `Secure` or expiry. AC-34, AC-38, AC-44, and AC-50 have no automated component test and rely on build/selected E2E evidence. F-11 and NFR-01/NFR-07 are intentionally planned outside Sprint 1 and are mapped to their later sprint. Approved changes: AD-01 through AD-18 in `srs.md`.

