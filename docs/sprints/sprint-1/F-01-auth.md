# F-01 — Authentication and session lifecycle

## Contract status

Sprint 1 contract, Part A. This contract implements FR-01, FR-02, NFR-02, NFR-03, and AD-16.

**Delivery 3 amendment:** `docs/deliverable-3/contract-amendments.md` Amendment 2 adds AC-02b / TEST-01.9 for malformed JSON. It does not change AC-02a or TEST-01.8.

## Behavior and workflow

1. A user submits an email and password to the login endpoint.
2. The API normalizes the email, loads the user, and compares the password with bcrypt.
3. On success, the API creates an opaque server-side session, sets a secure cookie, and returns the current user's safe identity and role.
4. Protected requests resolve the session to the current user before authorization and domain validation.
5. `/api/me` returns only the current user's safe identity and role.
6. Logout revokes the current session and clears the cookie. Reusing that session is rejected.

Invalid credentials use the same generic error regardless of whether the email exists. Passwords, session secrets, and cookies are never returned or logged.

## Permissions and dependencies

Login is available to seeded Participants and Program Managers. `/api/me` and logout require the current authenticated session. F-02 consumes the resolved user/role for ownership and role checks. Dependencies are the User and Session tables, bcrypt, secure cookie configuration, and a configured session secret.

## Business rules, validation, and failure cases

Emails are normalized before lookup; blank or malformed login requests return `400 INVALID_LOGIN_REQUEST` as defined by AC-02a, while validly shaped wrong/unknown credentials return generic `401 INVALID_CREDENTIALS`. Password comparison is performed with bcrypt. Session middleware rejects missing, revoked, and expired sessions before role/resource validation. Login must not reveal whether an account exists.

## UI behavior

The login screen has email/password validation, a loading state that prevents duplicate submission, a generic authentication error, and a success redirect to the role-appropriate screen. Logout clears the local authenticated state and returns the user to login. `/me` loading and expired-session errors use the shared shell behavior in `system-sds.md`.

## API contract

### `POST /api/auth/login`

Request:

```json
{ "email": "participant@example.test", "password": "<development-password>" }
```

Success: `200` with `Set-Cookie` and:

```json
{ "user": { "id": "uuid", "email": "participant@example.test", "role": "participant" } }
```

Malformed login requests: `400` with `INVALID_LOGIN_REQUEST`. Validly shaped requests with unknown email or wrong password: `401` with `INVALID_CREDENTIALS`; validation must not disclose which account detail was wrong.

### `GET /api/me`

Requires a valid session. Success: `200` with the safe user object above. Missing, revoked, or expired session: `401 SESSION_REQUIRED`.

### `POST /api/auth/logout`

Requires a valid session. Success: `204`, session revoked and cookie cleared. Missing or expired session: `401 SESSION_REQUIRED`.

## Data and security rules

`User.email` is normalized and unique. `User.password_hash` contains only a bcrypt hash with cost factor 12 or stronger. `Session` stores a hash of a random opaque session identifier, `user_id`, `created_at`, `expires_at`, and optional `revoked_at`; the raw session identifier is held only in the client cookie. The default session lifetime is 24 hours and is configurable through `SESSION_TTL`.

The cookie is `HttpOnly`, `Secure` outside local development, `SameSite=Lax`, and scoped to the application. CSRF protection is not implemented in Sprint 1. Session lookup rejects revoked or expired sessions. Unexpected authentication failures return a generic server error without credential details.

Data migration: create or update the `User` and `Session` tables, the role enum, the normalized-email unique index, and session expiry/revocation fields. No activity-domain tables change for F-01.

## Acceptance criteria

| ID | Observable outcome |
|---|---|
| AC-01 | Valid seeded credentials return 200, create a session, and identify the correct role. |
| AC-02 | Invalid credentials return 401 with the stable error shape and reveal no account-existence detail. |
| AC-02a | Malformed login requests return 400 with the stable validation error shape. |
| AC-03 | `/api/me` returns only the authenticated user's safe identity and role. |
| AC-04 | A missing, revoked, or expired session receives 401 on protected endpoints. |
| AC-05 | Logout returns 204, clears the cookie, revokes the session, and prevents reuse. |
| AC-06 | Password storage and application logs contain no plaintext password. |
| AC-07 | The session cookie is not readable by client-side scripts and has the required security attributes. |

## STS for F-01

| Test ID | Linked AC | Level | Preconditions/input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-01 | API/database integration | Seeded valid Participant and Manager accounts. | POST valid login for each role. | 200, session created, correct safe role returned. |
| TEST-02 | AC-02 | API/database integration | Unknown email and wrong-password cases. | POST login. | 401 `INVALID_CREDENTIALS`; no account detail. |
| TEST-02a | AC-02a | API validation/authorization | Missing email, missing password, and malformed email cases. | POST login with malformed body. | 400 `INVALID_LOGIN_REQUEST`; no authentication attempt is disclosed. |
| TEST-03 | AC-03 | API/database integration | Active Participant session. | GET `/api/me`. | 200 with only current user's safe identity and role. |
| TEST-04 | AC-04 | API validation/authorization | Missing, revoked, and expired sessions. | Call `/api/me` and a protected endpoint. | 401 with no private data. |
| TEST-05 | AC-05 | API/database integration | Active session. | POST logout, then reuse cookie. | 204 then 401 on reuse. |
| TEST-06 | AC-06 | Unit | Seeded user and captured logs. | Inspect password storage and logs. | bcrypt hash only; no plaintext password. |
| TEST-07 | AC-07 | API/database integration | Successful login. | Inspect `Set-Cookie`. | Required `HttpOnly`, `SameSite`, `Secure`, and expiry attributes. |

## Definition of Done for F-01

The login, current-user, and logout endpoints are implemented; bcrypt and session expiry are configured; API tests cover valid/invalid login and session rejection; protected endpoint middleware uses the current user; secrets are externalized; a teammate reviews the contract and implementation; and test output is recorded against the release commit.
