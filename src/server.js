const path = require("node:path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const db = require("./database");

const app = express();

const PORT = 3000;
const HOST = "127.0.0.1";

app.use(express.json({ limit: "10kb" }));

//Sessions for local development only
app.use(
    session({
        name: "notes.sid",
        secret: crypto.randomBytes(32).toString("hex"),
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "strict",
            secure: false,
            maxAge: 60 * 60 * 1000
        }
    })
);

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    next();
}

app.use(
    express.static(path.join(__dirname, "../public"))
);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        application: "Secure Notes Lab"
    });
});

//Register a user
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body || {};

    if (
        typeof username !== "string" ||
        !/^[a-zA-Z0-9_]{3,30}$/.test(username) ||
        typeof password !== "string" ||
        password.length < 12 ||
        Buffer.byteLength(password, "utf8") > 72
    ) {
        return res.status(400).json({
            error: "Invalid username or password"
        });
    }

    const existingUser = db.prepare(
        "SELECT id FROM users WHERE username = ?"
    ).get(username);

    if (existingUser) {
        return res.status(409).json({
            error: "Username already exists"
        });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db.prepare(`
        INSERT INTO users (username, password_hash)
        VALUES (?, ?)
    `).run(username, passwordHash);

    res.status(201).json({
        message: "User registered successfully",
        userId: Number(result.lastInsertRowid)
    });
});

//Logging in
app.post("/api/login", async (req, res, next) => {
    const { username, password } = req.body || {};

    if (
        typeof username !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            error: "Invalid request"
        });
    }

    const user = db.prepare(
        "SELECT * FROM users WHERE username = ?"
    ).get(username);

    const validPassword = user
        ? await bcrypt.compare(password, user.password_hash)
        : false;

    if (!validPassword) {
        return res.status(401).json({
            error: "Invalid credentials"
        });
    }

    req.session.regenerate((err) => {
        if (err) return next(err);

        req.session.userId = user.id;

        res.json({
            message: "Login successful",
            username: user.username
        });
    });
});

//Logging out
app.post("/api/logout", requireAuth, (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);

        res.clearCookie("notes.sid");

        res.json({
            message: "Logged out successfully"
        });
    });
});

//Create a private note
app.post("/api/notes", requireAuth, (req, res) => {
    const { title, content } = req.body || {};

    if (
        typeof title !== "string" ||
        !title.trim() ||
        title.length > 100 ||
        typeof content !== "string" ||
        content.length > 5000
    ) {
        return res.status(400).json({
            error: "Invalid note"
        });
    }

    const result = db.prepare(`
        INSERT INTO notes (owner_id, title, content)
        VALUES (?, ?, ?)
    `).run(req.session.userId, title.trim(), content);

    res.status(201).json({
        message: "Note created",
        noteId: Number(result.lastInsertRowid)
    });
});

//List only the current user's notes
app.get("/api/notes", requireAuth, (req, res) => {
    const notes = db.prepare(`
        SELECT id, title, content, created_at
        FROM notes
        WHERE owner_id = ?
        ORDER BY id DESC
    `).all(req.session.userId);

    res.json(notes);
});

//View one note belonging to the current user
app.get("/api/notes/:id", requireAuth, (req, res) => {
    const note = db.prepare(`
        SELECT id, title, content, created_at
        FROM notes
        WHERE id = ? AND owner_id = ?
    `).get(req.params.id, req.session.userId);

    if (!note) {
        return res.status(404).json({
            error: "Note not found"
        });
    }

    res.json(note);
    
});

app.put("/api/notes/:id", requireAuth, (req, res) => {
    const { title, content } = req.body || {};

    if (
        typeof title !== "string" ||
        !title.trim() ||
        title.length > 100 ||
        typeof content !== "string" ||
        content.length > 5000
    ) {
        return res.status(400).json({
            error: "Invalid note"
        });
    }

    const result = db.prepare(`
        UPDATE notes
        SET title = ?, content = ?
        WHERE id = ? AND owner_id = ?
    `).run(
        title.trim(),
        content,
        req.params.id,
        req.session.userId
    );

    if (result.changes === 0) {
        return res.status(404).json({
            error: "Note not found"
        });
    }

    res.json({
        message: "Note updated successfully"
    });
});


app.delete("/api/notes/:id", requireAuth, (req, res) => {
    const result = db.prepare(`
        DELETE FROM notes
        WHERE id = ? AND owner_id = ?
    `).run(req.params.id, req.session.userId);

    if (result.changes === 0) {
        return res.status(404).json({
            error: "Note not found"
        });
    }

    res.json({
        message: "Note deleted successfully"
    });
});


app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        error: "Internal server error"
    });
});


if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${PORT}`);
    });
}

module.exports = app;

