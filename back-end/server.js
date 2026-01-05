import 'dotenv/config';
import express from "express";
import bcrypt from "bcryptjs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true },
  name: { type: String, required: true },
  teacherName: String
});

const feedbackSchema = new mongoose.Schema({
  teacher: String,
  positive: String,
  constructive: String,
  timestamp: { type: Date, default: Date.now },
  studentName: String,
  studentUsername: String,
  clearedFromAdmin: { type: Boolean, default: false }
});

const User = mongoose.model("User", userSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);

app.use(cors());
app.use(express.json());

// Serve static files from all frontend folders
app.use("/admin", express.static(path.join(__dirname, "../front-end/admin")));
app.use("/student", express.static(path.join(__dirname, "../front-end/student")));
app.use("/teacher", express.static(path.join(__dirname, "../front-end/teacher")));
app.use("/shared", express.static(path.join(__dirname, "../front-end/shared")));

// Serve login page at root
app.use(express.static(path.join(__dirname, "../front-end")));

// ---------------- LOGIN ----------------
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

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

// Admin authentication code
const ADMIN_AUTH_CODE = "LISD-Admin-Code-280";

// ---------------- REGISTER ----------------
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, role, name, teacherName, adminCode } = req.body;

    if (!username || !password || !role || !name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Require admin authentication code for admin registration
    if (role === "admin") {
      if (!adminCode || adminCode !== ADMIN_AUTH_CODE) {
        return res.status(403).json({ message: "Invalid administrator authentication code" });
      }
    }

    if (role === "teacher" && !teacherName) {
      return res.status(400).json({ message: "Teachers must select their name" });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = new User({
      username,
      passwordHash,
      role,
      name,
      ...(role === "teacher" && { teacherName })
    });

    await newUser.save();

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
app.put("/api/profile", async (req, res) => {
  try {
    const { currentUsername, name, newUsername, newPassword } = req.body;

    if (!currentUsername) {
      return res.status(400).json({ message: "Current username is required" });
    }

    const user = await User.findOne({ username: currentUsername });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if new username is taken (if changing)
    if (newUsername && newUsername !== currentUsername) {
      const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${newUsername}$`, "i") } });
      if (existingUser) {
        return res.status(409).json({ message: "Username already taken" });
      }
      user.username = newUsername;
    }

    if (name) {
      user.name = name;
    }

    if (newPassword && newPassword.length >= 6) {
      user.passwordHash = bcrypt.hashSync(newPassword, 10);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      username: user.username,
      name: user.name
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- FEEDBACK ROUTES ----------------

// Get all feedback (for admin/teacher - excludes cleared feedback)
app.get("/feedback", async (req, res) => {
  try {
    const feedback = await Feedback.find({ clearedFromAdmin: { $ne: true } }).sort({ timestamp: -1 });
    res.json(feedback);
  } catch (err) {
    console.error("Get feedback error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get feedback submitted by a specific student (includes cleared feedback)
app.get("/feedback/student/:studentUsername", async (req, res) => {
  try {
    const feedback = await Feedback.find({ studentUsername: req.params.studentUsername }).sort({ timestamp: -1 });
    res.json(feedback);
  } catch (err) {
    console.error("Get student feedback error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get feedback for specific teacher (excludes cleared feedback)
app.get("/feedback/teacher/:teacherName", async (req, res) => {
  try {
    const feedback = await Feedback.find({ 
      teacher: req.params.teacherName,
      clearedFromAdmin: { $ne: true }
    }).sort({ timestamp: -1 });
    res.json(feedback);
  } catch (err) {
    console.error("Get teacher feedback error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get analytics data (excludes cleared feedback)
app.get("/feedback/analytics", async (req, res) => {
  try {
    const feedback = await Feedback.find({ clearedFromAdmin: { $ne: true } });

    // Group by teacher and calculate ratios per time period
    const teachers = [...new Set(feedback.map(f => f.teacher))];
    const analytics = {};

    teachers.forEach(teacher => {
      const teacherFeedback = feedback.filter(f => f.teacher === teacher);

      // Group by school year periods (6 periods: Aug-Sep, Oct-Nov, Dec-Jan, Feb-Mar, Apr-May, Jun-Jul)
      const periods = [
        { name: "Aug-Sep", months: [7, 8] },
        { name: "Oct-Nov", months: [9, 10] },
        { name: "Dec-Jan", months: [11, 0] },
        { name: "Feb-Mar", months: [1, 2] },
        { name: "Apr-May", months: [3, 4] },
        { name: "Jun-Jul", months: [5, 6] }
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
app.post("/feedback", async (req, res) => {
  try {
    const newFeedback = new Feedback(req.body);
    await newFeedback.save();
    res.json(newFeedback);
  } catch (err) {
    console.error("Post feedback error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete single feedback
app.delete("/feedback/:id", async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete feedback error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Clear all feedback (marks as cleared instead of deleting, so students can still see their submissions)
app.delete("/feedback", async (req, res) => {
  try {
    await Feedback.updateMany({ clearedFromAdmin: { $ne: true } }, { clearedFromAdmin: true });
    res.json({ message: "All feedback cleared from admin view" });
  } catch (err) {
    console.error("Clear all feedback error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));