# Feature inventory — Sprint 1 baseline

| ID | Short description | Related requirements | Dependencies | Planned sprint |
|---|---|---|---|---|
| F-01 | Authentication and session lifecycle | FR-01, FR-02, NFR-02, NFR-03 | User store, bcrypt, session store | S1 |
| F-02 | Role-based access control and private ownership | FR-08, FR-14, BR-11, NFR-02 | F-01; ownership checks | S1 |
| F-03 | Activity template catalog | FR-03, FR-04, FR-05, BR-10 | F-01; template schema | S1 |
| F-04 | Goal creation and read-only goal lifecycle | FR-06, FR-07, FR-08, BR-08, BR-10 | F-02, F-03 | S1 |
| F-05 | Daily activity recording | FR-09, FR-12, FR-13, BR-04, BR-05, BR-06, BR-07, BR-09 | F-04; transactional record schema | S1 |
| F-06 | Progress calculation | FR-11, BR-01, BR-02, BR-03 | F-05; decimal arithmetic | S1 |
| F-07 | History and progress views | FR-08, FR-11, FR-13, FR-15 | F-04, F-05, F-06 | S1 |
| F-08 | Shared validation and API error contract | FR-07, FR-12, BR-06, BR-07, BR-08, BR-09, NFR-05 | API middleware and timezone library | S1 |
| F-09 | Study dashboard UI | FR-04, FR-06, FR-09, FR-15 | F-03–F-08 | S1 |
| F-10 | Testable deployment/security baseline | NFR-03, NFR-04, NFR-06, NFR-07 | Local test/coverage tooling, environment configuration; CI is Lab 5 work | S1–S3 |
| F-11 | Reminder/schedule placeholder representation | FR-16, BR-11, AD-15, AD-17 | F-02; no notification provider | S3 |

F-11 scope is recorded from the Thursday workshop in SRS decision AD-17: representation and future acceptance criteria only; no notifications are sent.

