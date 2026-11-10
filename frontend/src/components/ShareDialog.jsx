import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function ShareDialog({ doc, onClose }) {
  const isOwner = doc.role === "owner";
  const [shares, setShares] = useState(null);
  const [users, setUsers] = useState([]);
  const [pick, setPick] = useState("");
  const [role, setRole] = useState("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = async () => {
    try {
      setShares(await api.listShares(doc.id));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    reload();
    if (isOwner) api.users().then(setUsers, (err) => setError(err.message));
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const act = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sharedNames = new Set((shares || []).map((s) => s.user.username));
  const candidates = users.filter(
    (u) => u.id !== doc.owner.id && !sharedNames.has(u.username)
  );

  const addShare = (e) => {
    e.preventDefault();
    if (!pick) {
      setError("Choose a person to share with.");
      return;
    }
    act(async () => {
      await api.share(doc.id, pick, role);
      setPick("");
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <h3 id="share-title">{isOwner ? `Share “${doc.title}”` : "People with access"}</h3>

        {isOwner && (
          <form className="share-form" onSubmit={addShare}>
            <select value={pick} onChange={(e) => setPick(e.target.value)} disabled={busy} aria-label="Person">
              <option value="">
                {candidates.length ? "Choose a person…" : "Everyone already has access"}
              </option>
              {candidates.map((u) => (
                <option key={u.id} value={u.username}>
                  {u.display_name} ({u.username})
                </option>
              ))}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={busy} aria-label="Role">
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button className="btn btn-primary" disabled={busy}>Share</button>
          </form>
        )}

        {error && <div className="error-box">{error}</div>}

        <h4 className="muted small">People with access</h4>
        <ul className="people">
          <li>
            <span>
              {doc.owner.display_name} <span className="muted small">({doc.owner.username})</span>
            </span>
            <span className="badge badge-owner">owner</span>
          </li>
          {!shares && <li className="muted">Loading…</li>}
          {shares?.map((s) => (
            <li key={s.user.id}>
              <span>
                {s.user.display_name} <span className="muted small">({s.user.username})</span>
              </span>
              {isOwner ? (
                <span className="people-actions">
                  <select
                    value={s.role}
                    disabled={busy}
                    aria-label={`Role for ${s.user.username}`}
                    onChange={(e) => act(() => api.share(doc.id, s.user.username, e.target.value))}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    className="btn btn-sm btn-danger"
                    disabled={busy}
                    onClick={() => act(() => api.unshare(doc.id, s.user.username))}
                  >
                    Remove
                  </button>
                </span>
              ) : (
                <span className={`badge badge-${s.role}`}>{s.role}</span>
              )}
            </li>
          ))}
        </ul>
        {!isOwner && <p className="muted small">Only the owner can change who has access.</p>}

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
