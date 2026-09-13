import React, { useState } from "react";
import { api, saveSession } from "../api.js";
import { styles, COLORS } from "../styles.js";
import { ErrorBanner } from "../components/ui.jsx";
import { Zap, ShieldCheck } from "lucide-react";

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

  async function handleDemoLogin() {
    setError("");
    setLoading(true);
    const demoCreds = {
      email: "demo@tickerroom.com",
      password: "demouser123",
      name: "Demo Trader",
    };
    try {
      let result;
      try {
        result = await api.login({ email: demoCreds.email, password: demoCreds.password });
      } catch {
        result = await api.register(demoCreds);
      }
      saveSession(result);
      onAuthed(result);
    } catch (err) {
      setError(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.authWrap}>
      <div style={styles.authCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 10, height: 10, background: COLORS.gain, borderRadius: 3 }} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.2 }}>Ticker Room</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              background: "rgba(53,215,165,0.12)",
              color: COLORS.gain,
              padding: "2px 8px",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            Live Market Tape
          </span>
        </div>

        <h1 style={{ fontSize: 18, margin: "0 0 6px", fontWeight: 700 }}>
          {mode === "login" ? "Log in to your dashboard" : "Create your trading account"}
        </h1>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 16px", lineHeight: 1.4 }}>
          Real-time stock price streaming, custom watchlists, and price alerts.
        </p>

        {/* 1-Click Quick Demo Access button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "linear-gradient(135deg, rgba(122,162,255,0.16), rgba(126,240,213,0.16))",
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.text,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 16,
            transition: "all 0.18s ease",
          }}
        >
          <Zap size={15} fill={COLORS.amber} color={COLORS.amber} />
          <span>Instant 1-Click Demo Login</span>
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "4px 0 16px",
            color: COLORS.textMuted,
            fontSize: 12,
          }}
        >
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          <span>or sign in with email</span>
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        </div>

        <ErrorBanner message={error} />

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <input
              style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          )}
          <input
            style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
            placeholder="Email address"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
            placeholder="Password (min 6 chars)"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <button type="submit" style={{ ...styles.primaryBtn, width: "100%", marginTop: 4 }} disabled={loading}>
            {loading ? "Verifying…" : mode === "login" ? "Sign In" : "Register Account"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <button
            onClick={() => {
              setError("");
              setMode(mode === "login" ? "register" : "login");
            }}
            style={{
              background: "none",
              border: "none",
              color: COLORS.accent,
              fontSize: 12.5,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
          </button>

          <span style={{ fontSize: 11.5, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
            <ShieldCheck size={13} color={COLORS.gain} /> Secure JWT
          </span>
        </div>
      </div>
    </div>
  );
}
