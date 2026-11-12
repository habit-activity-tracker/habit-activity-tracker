"""Public deployment checks for the Habit Tracker. Credentials are never printed.

Usage:  python3 deploy/smoke_test.py SERVICE_URL

Checks (in order, each retried up to 5 times, 3 s apart, to tolerate cold starts):
  1. GET /api/health      -> {"status": "ok"}
  2. GET /api/ready       -> {"status": "ready"}  (the app can reach the database)
  3. GET /                -> the built React app (contains its #root mount point)
  4. GET /api/templates   -> 401 SESSION_REQUIRED without a session
                             (the API, the session guard and the error envelope work)
  5. OPTIONAL login test  -> login, GET /api/me, logout. Runs only if BOTH
     SMOKE_EMAIL and SMOKE_PASSWORD are set. Uses a session cookie (not a token)
     and always logs out, even if a check fails.

Only the Python standard library is used. Exits non-zero if any check fails.
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


def make_client():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request(client, base, path, data=None, method=None):
    """Return (status, body_bytes). HTTP error statuses are returned, not raised."""
    headers = {'Content-Type': 'application/json'} if data is not None else {}
    req = urllib.request.Request(
        base + path,
        headers=headers,
        data=json.dumps(data).encode() if data is not None else None,
        method=method,
    )
    try:
        with client.open(req, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def error_code(body):
    try:
        return json.loads(body).get('error', {}).get('code')
    except (ValueError, AttributeError):
        return None


def public_checks():
    return (
        ('/api/health', lambda s, b: s == 200 and json.loads(b).get('status') == 'ok'),
        ('/api/ready', lambda s, b: s == 200 and json.loads(b).get('status') == 'ready'),
        # The Vite build has no <html> tag; the React mount point proves the client is served.
        ('/', lambda s, b: s == 200 and b'id="root"' in b),
        ('/api/templates', lambda s, b: s == 401 and error_code(b) == 'SESSION_REQUIRED'),
    )


def check(base):
    client = make_client()
    for path, predicate in public_checks():
        for attempt in range(5):
            try:
                status, body = request(client, base, path)
                if not predicate(status, body):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return

    logged_in = False
    try:
        status, _ = request(client, base, '/api/auth/login', {'email': email, 'password': password})
        if status != 200:
            raise RuntimeError('Login smoke check failed')
        logged_in = True
        status, body = request(client, base, '/api/me')
        if status != 200 or json.loads(body).get('user', json.loads(body)).get('email') is None:
            raise RuntimeError('Login smoke check failed')
        print('PASS login and authenticated /api/me')
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if logged_in:
            request(client, base, '/api/auth/logout', data={}, method='POST')
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    try:
        check(sys.argv[1].rstrip('/'))
    except RuntimeError as error:
        sys.exit(str(error))
