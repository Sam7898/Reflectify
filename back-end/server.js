import express from "express";
import fs from "fs";
import bcrypt from "bcryptjs";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from all frontend folders
app.use("/admin", express.static(path.join(__dirname, "../front-end/admin")));
app.use("/student", express.static(path.join(__dirname, "../front-end/student")));
app.use("/teacher", express.static(path.join(__dirname, "../front-end/teacher")));
app.use("/shared", express.static(path.join(__dirname, "../front-end/shared")));

// Serve login page at root
app.use(express.static(path.join(__dirname, "../front-end")));

const USERS_FILE = path.join(__dirname, "users.json");
const FEEDBACK_FILE = path.join(__dirname, "feedback.json");

// Helper to read/write JSON files
function readJSON(file) {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------------- LOGIN ----------------
app.post("/api/login", (req, res) => {
    try {
        const { username, password } = req.body;
        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const valid = bcrypt.compareSync(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        res.json({ 
            message: "Login successful",
            role: user.role,
            username: user.username,
            name: user.name || user.username,
            teacherName: user.teacherName || null
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------- REGISTER ----------------
app.post("/api/register", (req, res) => {
    try {
        const { username, password, role, name, teacherName } = req.body;

        if (!username || !password || !role || !name) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!['student', 'teacher', 'admin'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        if (role === 'teacher' && !teacherName) {
            return res.status(400).json({ message: "Teachers must select their name" });
        }

        if (username.length < 3) {
            return res.status(400).json({ message: "Username must be at least 3 characters" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const users = readJSON(USERS_FILE);

        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return res.status(409).json({ message: "Username already exists" });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const newUser = {
            username,
            passwordHash,
            role,
            name,
            ...(role === 'teacher' && { teacherName })
        };

        users.push(newUser);
        writeJSON(USERS_FILE, users);

        res.json({ 
            message: "Account created successfully",
            role: newUser.role,
            username: newUser.username,
            name: newUser.name,
            teacherName: newUser.teacherName || null
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------- UPDATE PROFILE ----------------
app.put("/api/profile", (req, res) => {
    try {
        const { currentUsername, name, newUsername, newPassword } = req.body;

        if (!currentUsername) {
            return res.status(400).json({ message: "Current username is required" });
        }

        const users = readJSON(USERS_FILE);
        const userIndex = users.findIndex(u => u.username === currentUsername);

        if (userIndex === -1) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if new username is taken (if changing)
        if (newUsername && newUsername !== currentUsername) {
            if (users.find(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
                return res.status(409).json({ message: "Username already taken" });
            }
            users[userIndex].username = newUsername;
        }

        if (name) {
            users[userIndex].name = name;
        }

        if (newPassword && newPassword.length >= 6) {
            users[userIndex].passwordHash = bcrypt.hashSync(newPassword, 10);
        }

        writeJSON(USERS_FILE, users);

        res.json({ 
            message: "Profile updated successfully",
            username: users[userIndex].username,
            name: users[userIndex].name
        });
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------- FEEDBACK ROUTES ----------------

// Get all feedback
app.get("/feedback", (req, res) => {
    try {
        const feedback = readJSON(FEEDBACK_FILE);
        res.json(feedback);
    } catch (err) {
        console.error("Get feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get feedback for specific teacher
app.get("/feedback/teacher/:teacherName", (req, res) => {
    try {
        const feedback = readJSON(FEEDBACK_FILE);
        const filtered = feedback.filter(f => f.teacher === req.params.teacherName);
        res.json(filtered);
    } catch (err) {
        console.error("Get teacher feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get analytics data
app.get("/feedback/analytics", (req, res) => {
    try {
        const feedback = readJSON(FEEDBACK_FILE);
        
        // Group by teacher and calculate ratios per time period
        const teachers = [...new Set(feedback.map(f => f.teacher))];
        const analytics = {};

        teachers.forEach(teacher => {
            const teacherFeedback = feedback.filter(f => f.teacher === teacher);
            
            // Group by school year periods (6 periods: Aug-Sep, Oct-Nov, Dec-Jan, Feb-Mar, Apr-May, Jun-Jul)
            const periods = [
                { name: 'Aug-Sep', months: [7, 8] },
                { name: 'Oct-Nov', months: [9, 10] },
                { name: 'Dec-Jan', months: [11, 0] },
                { name: 'Feb-Mar', months: [1, 2] },
                { name: 'Apr-May', months: [3, 4] },
                { name: 'Jun-Jul', months: [5, 6] }
            ];

            analytics[teacher] = periods.map(period => {
                const periodFeedback = teacherFeedback.filter(f => {
                    const month = new Date(f.timestamp).getMonth();
                    return period.months.includes(month);
                });

                const total = periodFeedback.length;
                const withConstructive = periodFeedback.filter(f => f.constructive && f.constructive.trim()).length;
                const positiveOnly = total - withConstructive;

                return {
                    period: period.name,
                    total,
                    positiveOnly,
                    withConstructive,
                    ratio: total > 0 ? ((positiveOnly / total) * 100).toFixed(1) : 0
                };
            });
        });

        res.json({ teachers, analytics, totalFeedback: feedback.length });
    } catch (err) {
        console.error("Get analytics error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Add new feedback
app.post("/feedback", (req, res) => {
    try {
        const feedback = readJSON(FEEDBACK_FILE);
        const newFeedback = { id: Date.now(), ...req.body };
        feedback.push(newFeedback);
        writeJSON(FEEDBACK_FILE, feedback);
        res.json(newFeedback);
    } catch (err) {
        console.error("Post feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete single feedback
app.delete("/feedback/:id", (req, res) => {
    try {
        let feedback = readJSON(FEEDBACK_FILE);
        feedback = feedback.filter(f => f.id != req.params.id);
        writeJSON(FEEDBACK_FILE, feedback);
        res.json({ message: "Deleted" });
    } catch (err) {
        console.error("Delete feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Clear all feedback
app.delete("/feedback", (req, res) => {
    try {
        writeJSON(FEEDBACK_FILE, []);
        res.json({ message: "All feedback cleared" });
    } catch (err) {
        console.error("Clear all feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
