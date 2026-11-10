import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, getSession, isServerAwake, onServerAwake, setSession } from "./api.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EditorRoute from "./pages/Editor.jsx";

const SHOW_AFTER_MS = 1500; // only show the banner if nothing has answered by then
const PING_TIMEOUT_MS = 10000; // abort a hung /health so the retry loop keeps going
const RETRY_MS = 3000;

function WakeBanner() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (isServerAwake()) return undefined;

    let cancelled = false; // per effect run (StrictMode mounts twice in dev)
    let showTimer;
    let retryTimer;

    const stop = () => {
      clearTimeout(showTimer);
      clearTimeout(retryTimer);
    };
    const awake = () => {
      stop();
      if (!cancelled) setSlow(false);
    };

    // Any successful API call anywhere in the app (login, docs list…) proves it's awake.
    const unsubscribe = onServerAwake(awake);

    showTimer = setTimeout(() => {
      if (!cancelled && !isServerAwake()) setSlow(true);
    }, SHOW_AFTER_MS);

    const ping = async () => {
      try {
        await api.health({ timeoutMs: PING_TIMEOUT_MS });
        awake(); // any successful /health response
      } catch {
        if (cancelled || isServerAwake()) return;
        setSlow(true);
        retryTimer = setTimeout(ping, RETRY_MS);
      }
    };
    ping();

    return () => {
      cancelled = true;
      stop();
      unsubscribe();
    };
  }, []);

  if (!slow) return null;
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
