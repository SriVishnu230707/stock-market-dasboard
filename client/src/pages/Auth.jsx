import React, { useState } from "react";
import { api, saveSession } from "../api.js";
import { styles, COLORS } from "../styles.js";
import { ErrorBanner } from "../components/ui.jsx";

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = mode === "login" ? await api.login(form) : await api.register(form);
      saveSession(result);
      onAuthed(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.authWrap}>
      <div style={styles.authCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <div style={{ width: 8, height: 8, background: COLORS.gain, borderRadius: 2 }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Ticker Room</span>
        </div>

        <h1 style={{ fontSize: 17, margin: "0 0 4px" }}>
          {mode === "login" ? "Log in" : "Create an account"}
        </h1>
        <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "0 0 16px" }}>
          Paper-trading demo — no real money, no real market data.
        </p>

        <ErrorBanner message={error} />

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "register" && (
            <input
              style={{ ...styles.input, width: "100%" }}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          )}
          <input
            style={{ ...styles.input, width: "100%" }}
            placeholder="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            style={{ ...styles.input, width: "100%" }}
            placeholder="Password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{
            background: "none",
            border: "none",
            color: COLORS.accent,
            fontSize: 12.5,
            marginTop: 14,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
