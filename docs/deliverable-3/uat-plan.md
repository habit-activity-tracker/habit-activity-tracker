# Delivery 3 — Independent UAT plan

**Audience:** Kulchaya's independent testers.
**Candidate:** `https://habit-tracker-rc-20261128-860543640437.asia-southeast1.run.app`; revision `habit-tracker-rc-20261128-00001-q7n`; commit `3bb7830c44785841ee490dd0eb10a6431cd82d69`; image `sha256:2e7ef50448a775fc4ba6c9e908b1af4f952f500364d60ed9263ae9105ef3a69d`.
**Safety:** use only supplied RC test accounts/data. Do not use production accounts, secrets, cookies, connection strings, or real personal data. Record a result only after executing the stated check.

## Tester instructions

1. Record tester initials, date/time, browser/device, RC URL, revision and commit in the result sheet.
2. Start with a clean browser profile/incognito window per role. Do not record passwords or cookie values.
3. For each case, write PASS, FAIL, BLOCKED or NOT RUN plus a short observation. A planned case is not a PASS.
4. Capture only redacted screenshots: no credentials, tokens, cookies, connection strings, or private activity data.
5. Run UAT only after the RC evidence record contains the observed URL, revision, digest, and a successful authenticated smoke result. Otherwise mark the affected case BLOCKED.

| ID | Role / setup | UAT action and expected outcome | Result / evidence (tester completes) |
|---|---|---|---|
| UAT-01 | Anonymous | Open `/api/health`, `/api/ready`, and the UI. Expect health/ready 200 and the login UI. | **PASS** — Kulchaya, 28 November 2026 ICT. `/api/health` returned HTTP 200 with commit `3bb7830c44785841ee490dd0eb10a6431cd82d69`; `/api/ready` returned HTTP 200; UI root returned HTTP 200. Console output recorded in the Issue 7 evidence/PR thread. |
| UAT-02 | Participant | Log in with supplied RC participant account; confirm the displayed current user/role and log out. After logout, protected page/API requires login. | NOT RUN |
| UAT-03 | Program Manager | Create an active template with an agreed test name/range; confirm a participant cannot create or edit it. | NOT RUN |
| UAT-04 | Participant | Browse active templates; create a goal with a valid period-total target and valid dates. Confirm it appears only in the participant's list. | NOT RUN |
| UAT-05 | Participant | Create a daily record at the template minimum or maximum; try a duplicate same goal/date and confirm rejection without changing the first value. | NOT RUN |
| UAT-06 | Participant | Verify record-date boundaries: today and seven days ago are accepted when inside the goal period; day eight ago and future/out-of-period dates are rejected. | NOT RUN |
| UAT-07 | Second participant and manager | Attempt to read the first participant's goal/history/progress/revisions/reminders. Expect safe denial (manager 403, other participant 404) and no private data. | NOT RUN |
| UAT-08 | Participant | View progress/history; confirm displayed progress is capped at 100% and records belong to the selected goal. | NOT RUN |
| UAT-09 | Participant | Use Revise goal to change permitted target/end date; confirm revision appears in history and existing daily records remain visible. | NOT RUN |
| UAT-10 | Participant | Create up to three reminder schedules with valid time/weekdays; confirm next occurrence is future in Bangkok time. A fourth schedule is rejected; no notification is expected. | NOT RUN |
| UAT-11 | Participant | Trigger one safe validation error (for example invalid numeric/date field) and confirm a user-safe error is shown; browser workflow remains usable. | NOT RUN |

## Completion record

| Field | Value |
|---|---|
| RC URL / Cloud Run revision | `https://habit-tracker-rc-20261128-860543640437.asia-southeast1.run.app` / `habit-tracker-rc-20261128-00001-q7n` |
| Commit / immutable digest | `3bb7830c44785841ee490dd0eb10a6431cd82d69` / `sha256:2e7ef50448a775fc4ba6c9e908b1af4f952f500364d60ed9263ae9105ef3a69d` |
| Tester(s) | Not assigned |
| UAT cases passed / failed / blocked / not run | 1 / 0 / 0 / 10 after Kulchaya's UAT-01 run |
| Defects linked | None — no UAT executed |

The RC evidence record is `docs/evidence/d3/issue-7-rc-deploy.md`; technical-debt decisions are in `technical-debt.md`. Testers must not infer a result from automated evidence or from this plan.
