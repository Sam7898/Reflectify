import express from "express";
import fs from "fs-extra";

const router = express.Router();

// Path to store feedback
const FEEDBACK_FILE = "feedback.json";

// POST /feedback - save feedback
router.post("/feedback", async (req, res) => {
  try {
    const feedback = req.body;

    // Load existing feedback
    const data = await fs.readJson(FEEDBACK_FILE).catch(() => []);
    
    // Add new feedback
    data.push(feedback);
    
    // Save updated feedback
    await fs.writeJson(FEEDBACK_FILE, data, { spaces: 2 });

    res.json({ message: "Feedback submitted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save feedback." });
  }
});

export default router;