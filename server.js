require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static frontend files

// ===== MYSQL DATABASE CONNECTION =====
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Failed to connect to DB:", err.message);
  } else {
    console.log("✅ Connected to MySQL Database");
  }
});

// ===== LOGIN API =====
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM admins WHERE email = ? AND password = ?";
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).send("DB error");
    if (results.length === 0) return res.json({ success: false });

    const user = results[0];
    res.json({ success: true, role: user.role });
  });
});

// Fetch all users from the users table
app.get("/api/users", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Fetch active users
app.get("/api/users/active", (req, res) => {
  const sql = "SELECT * FROM users WHERE status = 'ACTIVE' AND DATE(time_in) = CURDATE()";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Failed to fetch active users:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json(results);
  });
});


// DELETE user by ID
app.delete("/api/users/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});


// ADD admin
app.post("/api/admins", (req, res) => {
  const { name, age, email, password, role } = req.body;

  // Validation check
  if (!name || !age || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  const sql = "INSERT INTO admins (name, age, email, password, role) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [name, age, email, password, role], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ success: false, message: "Email already exists." });
      }
      return res.status(500).json({ success: false, message: "Database error." });
    }
    res.json({ success: true });
  });
});




// ===== ROOT ROUTE (FIX FOR RAILWAY) =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== START SERVER =====
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is listening on http://0.0.0.0:${PORT}`);
});
