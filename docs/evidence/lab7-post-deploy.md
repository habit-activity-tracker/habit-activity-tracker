# Lab 7 Post-deploy Evidence

**Service:** `https://habit-tracker-tn5ktplddq-as.a.run.app`  
**Revision:** `habit-tracker-00010-sp4`  
**Release commit:** `1f425cc`  
**Deploy run:** `45050703685`  
**Image index digest:** `sha256:424dd0de7041f1e3e3cf0efbe4863e1f2744762c46ffbb9f15e7f4f5d46c7b3d`  
**linux/amd64 manifest:** `sha256:0aae38c476937c48fd3f5f982a36729970645a87b54292eb6dd3402f65451970`  
**Date:** 2026-11-23 (Asia/Bangkok)

## Public checks

The repository smoke checks passed:

```text
PASS /api/health
PASS /api/ready
PASS /
PASS /api/templates
SKIP login: optional smoke credentials not configured
```

## Preserved login behavior

The following requests were sent with PowerShell `Invoke-WebRequest` and
`Content-Type: application/json`:

| Case | Expected | Actual | Trace ID |
|---|---:|---:|---|
| Malformed email: `{"email":"abc","password":"x"}` | 400 `INVALID_LOGIN_REQUEST` | 400 | `3521e3f8d1d7b876e7dfc377c5a916f3;o=1` |
| Unknown valid email | 401 `INVALID_CREDENTIALS` | 401 | `4840d5c113586798e7dfc377c5a91d81` |
| Invalid JSON: `{email:abc,password:x}` | Follow-up decision | 500 `INTERNAL_ERROR` | `e700aaacf2658bc2e7dfc377c5a916a1` |

The first two cases confirm the preserved authentication behavior. The last
case is recorded as `PD-03a` (invalid test input) and tracked separately in
[Issue #89](https://github.com/habit-activity-tracker/habit-activity-tracker/issues/89).
It is outside the approved Lab 7 scope; no Lab 7 implementation change was
made for it.

## Remaining evidence

- [x] Chayanit confirms the release image digest and platform manifest from
  Artifact Registry. The image index is `sha256:424dd0de...c7b3d`, matching
  the release evidence; the `linux/amd64` manifest is
  `sha256:0aae38c4...1970`.
- [x] Cloud Logging confirms the invalid-JSON request reached revision
  `habit-tracker-00010-sp4` and returned HTTP 500:

  ```text
  timestamp: 2026-11-23T08:10:43.099720Z
  severity: ERROR
  status: 500
  method: POST
  URL: https://habit-tracker-tn5ktplddq-as.a.run.app/api/auth/login
  revision: habit-tracker-00010-sp4
  trace: e700aaacf2658bc2e7dfc377c5a916a1
  ```

  This confirms `PD-03a` is a real production finding, not only a client-side
  test-input artifact. The follow-up remains tracked in Issue #89 and is not
  included in the Lab 7 implementation scope.

