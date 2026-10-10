const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");


const databasePath = process.env.NOTES_DB_PATH 
    ? path.resolve(process.env.NOTES_DB_PATH)
    : path.join(__dirname, "../data/notes.sqlite");

fs.mkdirSync(path.dirname(databasePath), {
    recursive: true
});

const db = new DatabaseSync(databasePath);

db.exec("PRAGMA foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (owner_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );
`);

module.exports = db;
