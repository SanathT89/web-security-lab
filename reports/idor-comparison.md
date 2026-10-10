# IDOR Secure and Vulnerable Implementation Comparison

## Test Information

Application: Secure Notes Lab

Testing Tool: OWASP ZAP

OWASP Reference: WSTG-ATHZ-04

Vulnerability Category: Broken Access Control

Environment: Isolated Local Laboratory

## Objective

Compare the behavior of an intentionally vulnerable
application with a secure implementation that enforces
resource ownership.

## Test Scenario

Riya and Ram are separate authenticated test users.

Ram attempts to retrieve a private note owned by Riya
using a modified HTTP GET request.

The same authorization scenario is tested against two
local application implementations.

Endpoint: GET /api/notes/:id

## Vulnerable Implementation

Application Port: 3001

The intentionally vulnerable query checks only the note ID.

    WHERE id = ?

Observed HTTP Status: 200 OK

Observed Result: Ram received Riya's private note,
including its title and content.

![Vulnerable IDOR implementation](../screenshots/idor-vulnerable-get.png)

## Secure Implementation

Application Port: 3000

The secure query checks both the note ID and the
authenticated user's ID.

    WHERE id = ? AND owner_id = ?

Riya's Authorized Request:

HTTP Status: 200 OK

Riya successfully retrieved her own note.

Ram's Unauthorized Request:

HTTP Status: 404 Not Found

Ram was unable to retrieve Riya's private note.

![Secure IDOR implementation](../screenshots/idor-secure-comparison.png)

## Root Cause

The vulnerable implementation fails to verify that
the authenticated user owns the requested note.

Authentication alone does not establish authorization
to access a particular resource.

## Security Remediation

The secure implementation applies resource ownership
verification using the authenticated user's ID from
the server-side session.

Both versions are retained separately for educational
comparison. The vulnerable implementation was not
modified in place during this comparison.

## Conclusion

PASS - SECURE IMPLEMENTATION

The secure application prevented the tested IDOR
scenario while preserving access for the legitimate
note owner.

The intentionally vulnerable version demonstrated
that removing ownership verification exposes
another user's private information.

## Limitations

This assessment covers one note retrieval endpoint
using two controlled test accounts.

It does not establish that the entire application
is free from authorization vulnerabilities.

The vulnerable implementation is retained only
for controlled local security testing.
