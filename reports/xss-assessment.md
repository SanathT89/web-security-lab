
# Cross-Site Scripting (XSS) Security Assessment

## Test Information

Application: Secure Notes Lab

Testing Tool: Web Browser and Manual Source Code Review

OWASP Reference: WSTG-INPV-02

Vulnerability Category: Stored Cross-Site Scripting (XSS)

Environment: Local Secure Application

Application Port: 3000

## Objective

Determine whether user-controlled note titles and
content can execute JavaScript when rendered
in the application.

## Test 1: Stored XSS in Note Content

### Test Scenario

An authenticated user created a note containing
an HTML element with a JavaScript event handler.

Test Payload:

    <img src=x onerror=alert('XSS')>

The note was saved and the webpage was refreshed.

### Expected Result

The application should display the supplied
content as text without executing JavaScript.

### Actual Result

No JavaScript alert was observed.

The tested payload did not demonstrate
JavaScript execution in the browser.

![Stored XSS note content test](../screenshots/xss-stored-baseline.png)

### Conclusion

PASS - TESTED PAYLOAD

No stored XSS execution was observed during
the note content test.

## Test 2: Stored XSS in Note Title

### Test Scenario

An authenticated user created a note with
the same XSS payload in the title field.

Test Payload:

    <img src=x onerror=alert('XSS')>

The note was saved and displayed in the browser.

### Expected Result

The title should be displayed as text
without executing JavaScript.

### Actual Result

The HTML payload appeared as plain text.

No JavaScript alert was observed.

![Stored XSS note title test](../screenshots/xss-title-baseline.png)

### Conclusion

PASS - TESTED PAYLOAD

No stored XSS execution was observed during
the note title test.

## Frontend Source Code Review

File Reviewed: public/app.js

The frontend renders note titles and content
using the textContent property.

Relevant Implementation:

    title.textContent = note.title;
    content.textContent = note.content;

The application also uses form field values
when populating the note editing interface.

No unsafe innerHTML assignments or document.write()
calls were identified in the reviewed file.

## Security Control

Using textContent prevents the browser from
interpreting supplied note data as HTML.

The tested JavaScript event handler therefore
was not executed through these rendering paths.

## Overall Conclusion

PASS - TESTED STORED XSS SCENARIOS

Both tested input locations handled the payload
without observed JavaScript execution.

The source code review found safe text rendering
for note titles and content.

No stored XSS vulnerability was identified
in the tested application functionality.

## Limitations

This assessment tested one HTML event-handler
payload in two input locations.

It does not cover every possible XSS payload,
browser behavior, rendering context, or
future application feature.

The source code review was limited to the
current public/app.js implementation.

Further testing would be necessary before
making broader claims about XSS resistance.
