# SQL Injection Baseline Security Assessment

## Test Information

Application: Secure Notes Lab

Testing Tool: OWASP ZAP

OWASP Reference: WSTG-INPV-05

Vulnerability Category: SQL Injection

Environment: Local Secure Application

Application Port: 3000

## Objective

Determine whether user-controlled input in a note ID
can manipulate the application's SQL query and
retrieve unauthorized information.

## Test Scenario

Riya owns private note ID 2.

Ram is authenticated using a separate account.

Ram sends a modified GET request containing a
SQL injection payload targeting Riya's note.

Endpoint: GET /api/notes/:id

Encoded Payload: 2%20OR%201%3D1

Decoded Payload: 2 OR 1=1

## Security Control

The secure implementation uses a parameterized
SQL query with an ownership restriction:

    SELECT id, title, content, created_at
    FROM notes
    WHERE id = ? AND owner_id = ?

The note ID is supplied as a bound parameter,
rather than concatenated into the SQL statement.

## Expected Result

The application should not interpret the injected
OR condition as executable SQL.

Riya's private note should not be disclosed.

## Actual Result

HTTP Status: 404 Not Found

Response Body:

    {"error":"Note not found"}

The application did not return Riya's private note.

![SQL injection baseline test](../screenshots/sqli-baseline.png)

## Conclusion

PASS - TESTED PAYLOAD

The tested SQL injection payload did not result
in unauthorized data disclosure.

The observed behavior is consistent with the
application's parameterized SQL query and
resource ownership restriction.


## Additional Testing

A second SQL injection payload was tested against
the GET /api/notes/:id endpoint.

Payload: 2%27

Decoded Payload: 2'

Observed HTTP Status: 404 Not Found

Observed Result: The application did not disclose
Riya's private note.

## Recommendations

Validate note IDs as positive integers before
passing them to database queries.

Continue using parameterized queries for all
database operations.

Retest database queries whenever new endpoints
or dynamic SQL statements are introduced.


## Limitations

This assessment covers two SQL injection payload
against the GET /api/notes/:id endpoint.

Additional payloads, input parameters, and endpoints
must be assessed before making broader claims
about SQL injection resistance.
