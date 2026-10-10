# Secure Notes Lab: Threat Model

## Objective

Assess the security of a locally hosted notes application
using OWASP testing methodologies.

## Application Assets

- User accounts
- Password hashes
- Login sessions
- Private notes
- SQLite database

## Entry Points

- Registration endpoint
- Login endpoint
- Notes API
- Browser interface
- Session cookies

## Trust Boundaries

1. Browser to Express server
2. Authenticated user to private resources
3. Express server to SQLite database

## Security Requirements

1. Users must authenticate before accessing private notes.
2. Users must access only notes they own.
3. Passwords must not be stored in plain text.
4. User input must not modify SQL query structure.
5. Untrusted note content must not execute as JavaScript.
6. Sensitive actions must be protected against unauthorized requests.

## Testing Scope

- OWASP Broken Access Control
- SQL Injection
- Cross Site Scripting
- Authentication and session management
- Security misconfiguration and CSRF

## Environment

Application: Secure Notes Lab
Backend: Node.js and Express
Database: SQLite
Host: 127.0.0.1
Test accounts: Riya and Ram

All testing is restricted to the local laboratory.