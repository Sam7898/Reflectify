import express from "express";
import fs from "fs";
import bcrypt from "bcryptjs";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("front-end/admin")); // serve frontend files

const USERS_FILE = "./users.json";
const FEEDBACK_FILE = "./feedback.json";

// ---------------- LOGIN ----------------
app.post("/api/login", (req, res) => {
    try {
        const { username, password } = req.body;

        // Read users.json
        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
        const user = users.find(u => u.username === username);

        if (!user) {
            console.log("Invalid username:", username);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const valid = bcrypt.compareSync(password, user.passwordHash);
        if (!valid) {
            console.log("Invalid password for user:", username);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        res.json({ message: "Login successful" });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------- FEEDBACK ROUTES ----------------

// Get all feedback
app.get("/feedback", (req, res) => {
    try {
        const feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8"));
        res.json(feedback);
    } catch (err) {
        console.error("Get feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Add new feedback
app.post("/feedback", (req, res) => {
    try {
        const feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8"));
        const newFeedback = { id: Date.now(), ...req.body };
        feedback.push(newFeedback);
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));
        res.json(newFeedback);
    } catch (err) {
        console.error("Post feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete single feedback
app.delete("/feedback/:id", (req, res) => {
    try {
        let feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8"));
        feedback = feedback.filter(f => f.id != req.params.id);
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));
        res.json({ message: "Deleted" });
    } catch (err) {
        console.error("Delete feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Clear all feedback
app.delete("/feedback", (req, res) => {
    try {
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2));
        res.json({ message: "All feedback cleared" });
    } catch (err) {
        console.error("Clear all feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));