import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, getSession, setSession } from "./api.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EditorRoute from "./pages/Editor.jsx";

function WakeBanner() {
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let done = false;
    let retryTimer;
    const slowTimer = setTimeout(() => !done && setWaking(true), 1500);

    const ping = async () => {
      try {
        await api.health();
        done = true;
        clearTimeout(slowTimer);
        setWaking(false);
      } catch {
        if (!done) {
          setWaking(true);
          retryTimer = setTimeout(ping, 3000);
        }
      }
    };
    ping();

    return () => {
      done = true;
      clearTimeout(slowTimer);
      clearTimeout(retryTimer);
    };
  }, []);

  if (!waking) return null;
  return (
    <div className="wake-banner" role="status">
      Waking up the server (free hosting sleeps when idle) — this can take up to a minute…
    </div>
  );
}

export default function App() {
  const [session, setSessionState] = useState(getSession);
  const navigate = useNavigate();

  // api.js clears storage on 401; keep React state in sync when that happens.
  useEffect(() => {
    const sync = () => setSessionState(getSession());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const onLogin = (s) => {
    setSession(s);
    setSessionState(s);
    navigate("/");
  };

  const onLogout = () => {
    setSession(null);
    setSessionState(null);
    navigate("/login");
  };

  const protect = (el) => (session ? el : <Navigate to="/login" replace />);

  return (
    <>
      <WakeBanner />
      {session && (
        <header className="topbar">
          <Link to="/" className="brand">📄 Ajaia Docs</Link>
          <div className="topbar-right">
            <span className="muted">Signed in as <strong>{session.user.display_name}</strong></span>
            <button className="btn" onClick={onLogout}>Log out</button>
          </div>
        </header>
      )}
      <main>
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/" replace /> : <Login onLogin={onLogin} />}
          />
          <Route path="/" element={protect(<Dashboard />)} />
          <Route path="/doc/:id" element={protect(<EditorRoute />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
