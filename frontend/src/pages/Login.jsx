import { useState } from "react";
import { api } from "../api.js";

const DEMO_USERS = ["alice", "bob", "carol"];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("alice");
  const [password, setPassword] = useState("demo123");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter a username and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onLogin(await api.login(username.trim(), password));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <h1>📄 Ajaia Docs</h1>
        <p className="muted">Write, format and share documents with your team.</p>

        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="demo">
          <span className="muted small">Demo accounts (password demo123)</span>
          <div className="chips">
            {DEMO_USERS.map((u) => (
              <button
                type="button"
                key={u}
                className={`chip${username === u ? " active" : ""}`}
                onClick={() => {
                  setUsername(u);
                  setPassword("demo123");
                  setError("");
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
