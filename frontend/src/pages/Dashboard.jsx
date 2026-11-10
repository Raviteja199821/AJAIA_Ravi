import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { formatDate, RoleBadge } from "../components/ui.jsx";

const IMPORT_TYPES = [".txt", ".md", ".docx"];
const MAX_BYTES = 2 * 1024 * 1024;

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [docs, setDocs] = useState(null);
  const [tab, setTab] = useState("owned");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setDocs(await api.listDocs());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const createDoc = () =>
    run(async () => {
      const doc = await api.createDoc("Untitled document");
      navigate(`/doc/${doc.id}`);
    });

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!IMPORT_TYPES.includes(ext)) {
      setError(`"${file.name}" isn't supported. Please choose a .txt, .md or .docx file.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`"${file.name}" is larger than 2 MB.`);
      return;
    }
    run(async () => {
      const doc = await api.importDoc(file);
      navigate(`/doc/${doc.id}`);
    });
  };

  const deleteDoc = (e, doc) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    run(async () => {
      await api.deleteDoc(doc.id);
      await load();
    });
  };

  const list = docs ? docs[tab] : [];

  return (
    <div className="page">
      <div className="page-head">
        <h2>Documents</h2>
        <div className="actions">
          <input
            ref={fileInput}
            type="file"
            accept={IMPORT_TYPES.join(",")}
            hidden
            onChange={onPickFile}
          />
          <button className="btn" disabled={busy} onClick={() => fileInput.current?.click()}>
            ⬆ Import file
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={createDoc}>
            + New document
          </button>
        </div>
      </div>
      <p className="muted small">
        Import turns a .txt, .md or .docx file (max 2 MB) into a new editable document.
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "owned"}
          className={`tab${tab === "owned" ? " active" : ""}`}
          onClick={() => setTab("owned")}
        >
          My documents ({docs ? docs.owned.length : "…"})
        </button>
        <button
          role="tab"
          aria-selected={tab === "shared"}
          className={`tab${tab === "shared" ? " active" : ""}`}
          onClick={() => setTab("shared")}
        >
          Shared with me ({docs ? docs.shared.length : "…"})
        </button>
      </div>

      {!docs && !error && <p className="muted">Loading…</p>}

      {docs && list.length === 0 && (
        <div className="empty">
          {tab === "owned"
            ? "No documents yet. Create one or import a file."
            : "Nothing has been shared with you yet."}
        </div>
      )}

      <ul className="doc-list">
        {list.map((doc) => (
          <li
            key={doc.id}
            className="doc-row"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/doc/${doc.id}`)}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/doc/${doc.id}`)}
          >
            <span className="doc-icon" aria-hidden>📝</span>
            <div className="doc-main">
              <div className="doc-title">{doc.title}</div>
              <div className="muted small">
                {tab === "shared" && `Owned by ${doc.owner.display_name} · `}
                Edited {formatDate(doc.updated_at)}
              </div>
            </div>
            <RoleBadge role={doc.role} />
            {doc.role === "owner" && (
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={(e) => deleteDoc(e, doc)}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
