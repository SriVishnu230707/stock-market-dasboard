const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Watchlist = require("../models/Watchlist");
const Portfolio = require("../models/Portfolio");
const { signToken } = require("../lib/auth");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const trimmedEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim();

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({ error: "Please provide a valid email address" });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: trimmedEmail,
      passwordHash,
      name: cleanName || trimmedEmail.split("@")[0],
    });

    // Give every new user a starter watchlist + paper-trading portfolio.
    await Watchlist.create({ user: user._id, symbols: ["AAPL", "MSFT", "NVDA", "AMZN"] });
    await Portfolio.create({ user: user._id });

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const trimmedEmail = (email || "").trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

module.exports = router;
