const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

//Create an isolated temporary database for testing.
const testDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "secure-notes-test-")
);

process.env.NOTES_DB_PATH = path.join(
    testDirectory,
    "notes.sqlite"
);

const app = require("../src/server");
const db = require("../src/database");

let server;
let baseUrl;

before(async () => {
    server = await new Promise((resolve, reject) => {
        const instance = app.listen(0, "127.0.0.1");

        instance.once("error", reject);

        instance.once("listening", () => {
            resolve(instance);
        });
    });

    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    }

    db.close();

    fs.rmSync(testDirectory, {
        recursive: true,
        force: true
    });
});

test("Unauthenticated users cannot list notes", async () => {
    const response = await fetch(`${baseUrl}/api/notes`);

    const data = await response.json();

    assert.equal(response.status, 401);

    assert.deepEqual(data, {
        error: "Authentication required"
    });
});

test("Unauthenticated users cannot create notes", async () => {
    const response = await fetch(`${baseUrl}/api/notes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: "Unauthorized",
            content: "This should be rejected."
        })
    });

    const data = await response.json();

    assert.equal(response.status, 401);

    assert.deepEqual(data, {
        error: "Authentication required"
    });
});


test("IDOR protection prevents cross-user note access", async () => {
    //Register two separate test accounts.
    for (const [username, password] of [
        ["riyalab", "RiyaTest12345!"],
        ["ramlab", "RamTest123456!"]
    ]) {
        const response = await fetch(`${baseUrl}/api/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        assert.equal(response.status, 201);
    }

    //Log in and capture each account's session cookie.
    async function login(username, password) {
        const response = await fetch(`${baseUrl}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        assert.equal(response.status, 200);

        const setCookie = response.headers.get("set-cookie");
        assert.ok(setCookie, "Login must issue a session cookie");

        return setCookie.split(";")[0];
    }

    const riyaCookie = await login("riyalab", "RiyaTest12345!");
    const ramCookie = await login("ramlab", "RamTest123456!");

    //Riya creates a private note.
    const createResponse = await fetch(`${baseUrl}/api/notes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: riyaCookie
        },
        body: JSON.stringify({
            title: "Riya Private Note",
            content: "Confidential test content"
        })
    });

    assert.equal(createResponse.status, 201);

    const { noteId } = await createResponse.json();
    const noteUrl = `${baseUrl}/api/notes/${noteId}`;

    //Positive control: Riya can read her own note.
    const authorizedResponse = await fetch(noteUrl, {
        headers: { Cookie: riyaCookie }
    });

    assert.equal(authorizedResponse.status, 200);

    //Negative test 1: Ram cannot read Riya's note.
    const readResponse = await fetch(noteUrl, {
        headers: { Cookie: ramCookie }
    });

    assert.equal(readResponse.status, 404);

    //Negative test 2: Ram cannot modify Riya's note.
    const updateResponse = await fetch(noteUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Cookie: ramCookie
        },
        body: JSON.stringify({
            title: "Unauthorized Change",
            content: "This must not replace Riya's note"
        })
    });

    assert.equal(updateResponse.status, 404);

    //Negative test 3: Ram cannot delete Riya's note.
    const deleteResponse = await fetch(noteUrl, {
        method: "DELETE",
        headers: { Cookie: ramCookie }
    });

    assert.equal(deleteResponse.status, 404);

    //Verify that Riya's note still exists and is unchanged.
    const finalResponse = await fetch(noteUrl, {
        headers: { Cookie: riyaCookie }
    });

    assert.equal(finalResponse.status, 200);

    const note = await finalResponse.json();

    assert.equal(note.title, "Riya Private Note");
    assert.equal(note.content, "Confidential test content");
});


test("Input validation rejects invalid registration and notes", async () => {
    async function register(username, password) {
        return fetch(`${baseUrl}/api/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });
    }

    //Test 1: Username is too short.
    const invalidUsername = await register(
        "ab",
        "ValidPassword123!"
    );

    assert.equal(invalidUsername.status, 400);

    //Test 2: Password is too short.
    const invalidPassword = await register(
        "validationuser",
        "short"
    );

    assert.equal(invalidPassword.status, 400);

    //Register a valid account for testing note validation.
    const validRegistration = await register(
        "validationuser",
        "ValidPassword123!"
    );

    assert.equal(validRegistration.status, 201);

    //Log in to obtain an authenticated session.
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: "validationuser",
            password: "ValidPassword123!"
        })
    });

    assert.equal(loginResponse.status, 200);

    const setCookie = loginResponse.headers.get("set-cookie");
    assert.ok(setCookie);

    const cookie = setCookie.split(";")[0];

    async function createNote(title, content) {
        return fetch(`${baseUrl}/api/notes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: cookie
            },
            body: JSON.stringify({ title, content })
        });
    }

    //Test 3: Empty note title.
    const emptyTitle = await createNote(
        "   ",
        "This note should be rejected."
    );

    assert.equal(emptyTitle.status, 400);

    //Test 4: Note content exceeds 5,000 characters.
    const oversizedContent = await createNote(
        "Validation Test",
        "A".repeat(5001)
    );

    assert.equal(oversizedContent.status, 400);
});


test("SQL injection payloads do not bypass database queries", async () => {
    const username = "sqlitestuser";
    const password = "SQLiTestPassword123!";

    //Register a test account.
    const registration = await fetch(`${baseUrl}/api/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    assert.equal(registration.status, 201);

    //Log in and obtain its session cookie.
    const login = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    assert.equal(login.status, 200);

    const setCookie = login.headers.get("set-cookie");
    assert.ok(setCookie);

    const cookie = setCookie.split(";")[0];

    //Create a legitimate note.
    const createResponse = await fetch(`${baseUrl}/api/notes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: cookie
        },
        body: JSON.stringify({
            title: "SQLi Regression Note",
            content: "Original note content"
        })
    });

    assert.equal(createResponse.status, 201);

    const { noteId } = await createResponse.json();

    //Confirm a legitimate note ID works.
    const validResponse = await fetch(
        `${baseUrl}/api/notes/${noteId}`,
        { headers: { Cookie: cookie } }
    );

    assert.equal(validResponse.status, 200);

    //Test SQL injection expressions in the note ID.
    const payloads = [
        `${noteId} OR 1=1`,
        `${noteId}'`
    ];

    for (const payload of payloads) {
        const response = await fetch(
            `${baseUrl}/api/notes/${encodeURIComponent(payload)}`,
            { headers: { Cookie: cookie } }
        );

        assert.equal(
            response.status,
            404,
            `Unexpected response for payload: ${payload}`
        );

        const data = await response.json();

        assert.deepEqual(data, {
            error: "Note not found"
        });
    }

    //Test SQL injection in the login username.
    const injectionLogin = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: "' OR 1=1 --",
            password: "IncorrectPassword123!"
        })
    });

    assert.equal(injectionLogin.status, 401);

    //Verify that the original note remains accessible.
    const finalResponse = await fetch(
        `${baseUrl}/api/notes/${noteId}`,
        { headers: { Cookie: cookie } }
    );

    assert.equal(finalResponse.status, 200);

    const note = await finalResponse.json();

    assert.equal(note.title, "SQLi Regression Note");
    assert.equal(note.content, "Original note content");
});


test("Logout invalidates the authenticated session", async () => {
    const username = "sessiontestuser";
    const password = "SessionTest12345!";

    //Register a test user.
    const registration = await fetch(`${baseUrl}/api/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    assert.equal(registration.status, 201);

    //Log in and capture the session cookie.
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    assert.equal(loginResponse.status, 200);

    const setCookie = loginResponse.headers.get("set-cookie");
    assert.ok(setCookie);

    const cookie = setCookie.split(";")[0];

    //Confirm the session works before logout.
    const beforeLogout = await fetch(`${baseUrl}/api/notes`, {
        headers: {
            Cookie: cookie
        }
    });

    assert.equal(beforeLogout.status, 200);

    //Log out using the authenticated session.
    const logoutResponse = await fetch(`${baseUrl}/api/logout`, {
        method: "POST",
        headers: {
            Cookie: cookie
        }
    });

    assert.equal(logoutResponse.status, 200);

    //Replay the ORIGINAL cookie after logout.
    const afterLogout = await fetch(`${baseUrl}/api/notes`, {
        headers: {
            Cookie: cookie
        }
    });

    assert.equal(afterLogout.status, 401);

    const data = await afterLogout.json();

    assert.deepEqual(data, {
        error: "Authentication required"
    });
});


test("Frontend note renderer uses safe text rendering", () => {
    const frontendPath = path.join(
        __dirname,
        "../public/app.js"
    );

    const source = fs.readFileSync(frontendPath, "utf8");

    
    const executableSource = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

    //Check that note titles and content are assigned using textContent.
    assert.match(
        executableSource,
        /\btitle\.textContent\s*=\s*note\.title\s*;/
    );

    assert.match(
        executableSource,
        /\bcontent\.textContent\s*=\s*note\.content\s*;/
    );

    //Guard against common unsafe HTML insertion methods.
    assert.doesNotMatch(
        executableSource,
        /\.innerHTML\s*=|\.outerHTML\s*=|\.insertAdjacentHTML\s*\(|document\.write\s*\(/
    );
});
