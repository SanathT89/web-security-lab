
const authSection = document.getElementById("auth-section");
const notesSection = document.getElementById("notes-section");
const notesList = document.getElementById("notes-list");
const message = document.getElementById("message");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const noteForm = document.getElementById("note-form");

const noteTitle = document.getElementById("note-title");
const noteContent = document.getElementById("note-content");

const cancelButton = document.getElementById("cancel-button");
const logoutButton = document.getElementById("logout-button");

let editingNoteId = null;

//Send HTTP requests to our Express backend
async function apiRequest(url, method = "GET", body = null) {
    const options = {
        method,
        credentials: "same-origin"
    };

    if (body !== null) {
        options.headers = {
            "Content-Type": "application/json"
        };
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

function showNotesSection(loggedIn) {
    authSection.hidden = loggedIn;
    notesSection.hidden = !loggedIn;
}

function resetNoteForm() {
    editingNoteId = null;
    noteForm.reset();

    document.getElementById("form-title").textContent =
        "Create a Note";

    document.getElementById("save-button").textContent =
        "Save Note";

    cancelButton.hidden = true;
}

//Render the user's notes
function displayNotes(notes) {
    notesList.replaceChildren();

    if (notes.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No notes yet.";
        notesList.appendChild(emptyMessage);
        return;
    }

    notes.forEach((note) => {
        const card = document.createElement("article");
        card.className = "note";

        const title = document.createElement("h4");
        title.textContent = note.title;

        const content = document.createElement("p");
        content.textContent = note.content; 
        /*
            We use the above instead of content.innerHTML = note.content; 
            as it interprets it as HTML and can introduce Cross Site Scripting vulnerabilities
        */ 

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editingNoteId = note.id;

            noteTitle.value = note.title;
            noteContent.value = note.content;

            document.getElementById("form-title").textContent =
                "Edit Note";

            document.getElementById("save-button").textContent =
                "Update Note";

            cancelButton.hidden = false;
            noteTitle.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "danger";

        deleteButton.addEventListener("click", async () => {
            if (!confirm("Delete this note?")) {
                return;
            }

            try {
                await apiRequest(
                    `/api/notes/${note.id}`,
                    "DELETE"
                );

                resetNoteForm();
                await loadNotes();
                showMessage("Note deleted successfully.");
            } catch (error) {
                showMessage(error.message, true);
            }
        });

        card.appendChild(title);
        card.appendChild(content);
        card.appendChild(editButton);
        card.appendChild(deleteButton);

        notesList.appendChild(card);
    });
}

async function loadNotes() {
    const notes = await apiRequest("/api/notes");
    displayNotes(notes);
}

//Register an account
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username =
        document.getElementById("register-username").value;

    const password =
        document.getElementById("register-password").value;

    try {
        await apiRequest("/api/register", "POST", {
            username,
            password
        });

        registerForm.reset();
        showMessage("Account created. You can now log in.");
    } catch (error) {
        showMessage(error.message, true);
    }
});

//Log in
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username =
        document.getElementById("login-username").value.trim();

    const password =
        document.getElementById("login-password").value;

    try {
        const result = await apiRequest("/api/login", "POST", {
            username,
            password
        });

        loginForm.reset();
        showNotesSection(true);
        resetNoteForm();

        await loadNotes();
        showMessage(`Logged in as ${result.username}`);
    } catch (error) {
        showMessage(error.message, true);
    }
});

//Create or update a note
noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const note = {
        title: noteTitle.value,
        content: noteContent.value
    };

    const isEditing = editingNoteId !== null;

    const url = isEditing
        ? `/api/notes/${editingNoteId}`
        : "/api/notes";

    const method = isEditing ? "PUT" : "POST";

    try {
        await apiRequest(url, method, note);

        resetNoteForm();
        await loadNotes();

        showMessage(
            isEditing
                ? "Note updated successfully."
                : "Note created successfully."
        );
    } catch (error) {
        showMessage(error.message, true);
    }
});

//Cancel editing
cancelButton.addEventListener("click", resetNoteForm);

//Log out
logoutButton.addEventListener("click", async () => {
    try {
        await apiRequest("/api/logout", "POST");

        resetNoteForm();
        notesList.replaceChildren();
        showNotesSection(false);
        showMessage("Logged out successfully.");
    } catch (error) {
        showMessage(error.message, true);
    }
});

//Check whether the browser already has a valid session
async function initialize() {
    try {
        const notes = await apiRequest("/api/notes");

        showNotesSection(true);
        displayNotes(notes);
    } catch (error) {
        showNotesSection(false);
    }
}

initialize();
