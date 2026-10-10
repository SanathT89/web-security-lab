
# Secure Notes Lab
### Web Application Security Assessment and Remediation

A web application security project built with Node.js, Express, SQLite, and vanilla JavaScript.

The project demonstrates how common web application security weaknesses can be assessed using OWASP testing guidance, OWASP ZAP, manual HTTP testing, source code review, and automated regression tests.

It includes an intentionally vulnerable IDOR laboratory for comparing insecure and secure access control implementations.

## Project Objectives

- Develop a functional authenticated web application
- Apply OWASP web application security testing practices
- Assess access control, SQL injection, XSS, and session management
- Demonstrate the impact of a deliberately introduced IDOR vulnerability
- Compare vulnerable and secure implementations
- Validate security controls through automated regression tests
- Document security findings, evidence, and limitations

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | SQLite (`node:sqlite`) |
| Frontend | HTML, CSS, JavaScript |
| Authentication | Express Sessions, bcryptjs |
| Security Testing | OWASP ZAP, manual HTTP testing |
| Automated Testing | Node.js Test Runner |

## Application Features

- User registration and authentication
- Password hashing using bcrypt
- Session-based authentication
- Private note creation, retrieval, modification, and deletion
- Server-side note ownership verification
- Parameterized SQLite queries
- Safe frontend text rendering

## Security Assessment Overview

The assessment covers selected OWASP-related security risks.

| Security Area | Assessment | Result |
|---|---|---|
| Broken Access Control (IDOR) | Unauthorized GET, PUT, and DELETE | Secure implementation passed tested scenarios |
| Deliberately Vulnerable IDOR | Cross-user note retrieval | Vulnerability reproduced in isolated lab |
| SQL Injection | Injection payloads and source review | No injection identified in tested scenarios |
| Stored XSS | Note title and content payloads | No JavaScript execution observed |
| Authentication | Unauthenticated read/write requests | Rejected with HTTP 401 |
| Session Management | Logout invalidation and session renewal | Tested behaviors passed |
| Input Validation | Invalid registration and note inputs | Invalid inputs rejected |
| Automated Regression Tests | Seven test groups | 7 passed, 0 failed |

These results are limited to the performed tests and reviewed code. They do not establish that the application is free from all vulnerabilities.

## IDOR Vulnerability Demonstration

A deliberately vulnerable version of the application is maintained separately under `lab/idor/`.

The vulnerability was introduced by removing resource ownership verification from the GET note endpoint.

### Vulnerable Query

```sql
SELECT id, title, content, created_at
FROM notes
WHERE id = ?;
```

The query retrieves a note without checking whether the authenticated user owns it.

### Secure Query

```sql
SELECT id, title, content, created_at
FROM notes
WHERE id = ? AND owner_id = ?;
```

The secure implementation uses the authenticated user ID from the server-side session to enforce resource ownership.

### Observed Comparison

| Scenario | Vulnerable Lab | Secure Application |
|---|---|---|
| Ram requests Riya's private note | 200 OK | 404 Not Found |
| Private note disclosed | Yes | No |
| Ownership restriction | Missing | Enforced |

The intentionally vulnerable implementation demonstrates how missing object-level authorization can expose private user information.

![Vulnerable IDOR demonstration](screenshots/idor-vulnerable-get.png)

![Secure access control comparison](screenshots/idor-secure-comparison.png)

**Important:** The vulnerable implementation is provided exclusively for educational testing. It must not be exposed to public networks or deployed with real user data.

## SQL Injection Assessment

The application uses prepared SQL statements with bound parameters.

Manual testing included SQL injection expressions in note identifiers, followed by source code review of the database operations.

The tested payloads returned HTTP 404 without disclosing another user's note.

The assessment found no direct interpolation of user-controlled values into the reviewed SQL statements.

[Read the SQL Injection Assessment](reports/sqli-baseline.md)

## Cross-Site Scripting Assessment

Stored XSS testing was performed against note titles and note content.

The tested HTML event-handler payload did not execute JavaScript.

The frontend uses `textContent` when displaying user-controlled note data, preventing that data from being interpreted as HTML in the reviewed rendering paths.

[Read the XSS Assessment](reports/xss-assessment.md)

## Authentication and Session Security

The assessment verified that:

- Unauthenticated users cannot read private notes
- Unauthenticated users cannot create, update, or delete notes
- Logout invalidates the tested authenticated session
- A subsequent login issues a different session identifier
- Session cookies include `HttpOnly` and `SameSite=Strict`

The application uses HTTP and development-only session settings in the local laboratory.

Additional hardening, including HTTPS, Secure cookies, production session storage, and authentication rate limiting, is necessary before deployment.

[Read the Authentication and Session Assessment](reports/auth-session-assessment.md)

## Automated Security Regression Tests

Seven automated test groups were implemented using the Node.js built-in test runner.

| Test | Result |
|---|---|
| Unauthenticated note listing | PASS |
| Unauthenticated note creation | PASS |
| Cross-user IDOR protection | PASS |
| Registration and note input validation | PASS |
| SQL injection test payloads | PASS |
| Logout session invalidation | PASS |
| Frontend safe rendering source check | PASS |

**Final result: 7 passed, 0 failed.**

Tests run with an isolated temporary SQLite database and do not modify the normal application database.

The XSS source check verifies specific safe rendering patterns; it is not a complete browser-based XSS test.

![Automated security test results](screenshots/automated-security-tests.png)

## Installation and Setup

### Requirements

- Node.js 24 or later
- npm
- Git
- Docker Desktop (optional, for OWASP ZAP testing)

### 1. Clone the Repository

```bash
git clone https://github.com/SanathT89/web-security-lab.git
cd web-security-lab
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Secure Application

```bash
node src/server.js
```

Open:

http://127.0.0.1:3000

The application creates its SQLite database locally.

Register a test account through the web interface to begin using it.

### 4. Run Automated Security Tests

```bash
node --test tests/security.test.js
```

The tests automatically create and remove an isolated testing database.

### 5. Run the Intentionally Vulnerable IDOR Lab (Optional)

```bash
node lab/idor/server.js
```

The vulnerable lab runs on:

http://127.0.0.1:3001

It uses a separate local database. Create fictional test accounts and notes when reproducing the IDOR demonstration.

**Warning:** The vulnerable lab is intended only for controlled localhost testing. Do not deploy it publicly.

## OWASP ZAP Testing

OWASP ZAP was used to inspect and modify HTTP requests, replay authenticated sessions, and collect security evidence.

The assessment included both authenticated and unauthenticated HTTP requests.

ZAP was run locally through Docker during development.

See the individual security reports for test scenarios, observed responses, and supporting screenshots.

## Project Structure

```text
web-security-lab/
├── src/                  # Secure Express backend
├── public/               # Browser interface
├── lab/
│   └── idor/             # Intentionally vulnerable IDOR example
├── tests/                # Automated security tests
├── docs/                 # Threat model
├── reports/              # Security assessments and findings
├── screenshots/          # Redacted testing evidence
├── data/                 # Local database (Git ignored)
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## Security Documentation

- [Threat Model](docs/threat-model.md)
- [IDOR Baseline Assessment](reports/idor-baseline.md)
- [IDOR Unauthorized Modification Test](reports/idor-put-test.md)
- [IDOR Unauthorized Deletion Test](reports/idor-delete-test.md)
- [IDOR Vulnerability Demonstration](reports/idor-vulnerability.md)
- [Secure and Vulnerable IDOR Comparison](reports/idor-comparison.md)
- [SQL Injection Assessment](reports/sqli-baseline.md)
- [XSS Assessment](reports/xss-assessment.md)
- [Authentication and Session Assessment](reports/auth-session-assessment.md)
- [Final Security Assessment](reports/final-security-assessment.md)

## Security Limitations

This project is an testing laboratory and is not intended for production deployment.

The assessment does not comprehensively cover every OWASP Top 10 category, injection technique, XSS context, CSRF scenario, dependency vulnerability, or production security requirement.

A passing test suite demonstrates that the implemented tests passed. It does not guarantee the absence of security vulnerabilities.

## References

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ZAP](https://www.zaproxy.org/)
