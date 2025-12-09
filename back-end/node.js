// clearFeedback.js
import fs from "fs";

const DB_PATH = "./db.json"; // or your feedback.json path

fs.writeFile(DB_PATH, "", (err) => {
    if (err) console.error("Failed to clear file:", err);
    else console.log("feedback.json cleared!");
});