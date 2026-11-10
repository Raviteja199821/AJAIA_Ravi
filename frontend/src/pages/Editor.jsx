import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { api } from "../api.js";
import Toolbar from "../components/Toolbar.jsx";
import ShareDialog from "../components/ShareDialog.jsx";
import { RoleBadge } from "../components/ui.jsx";

const SAVE_DELAY_MS = 800;

const STATUS_TEXT = {
  saved: "All changes saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Save failed — will retry on next edit",
};

// key={id} remounts the editor per document, so no state leaks between docs.
export default function EditorRoute() {
  const { id } = useParams();
  return <Editor key={id} id={id} />;
}

function Editor({ id }) {
  const [doc, setDoc] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [status, setStatus] = useState("saved");
  const [shareOpen, setShareOpen] = useState(false);

  const pendingHtml = useRef(null); // latest unsaved HTML, kept on failure for retry
  const timer = useRef(null);
  const saveChain = useRef(Promise.resolve()); // serialises saves so they land in order
  const loaded = useRef(false);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const html = pendingHtml.current;
    if (html == null) return saveChain.current;
    pendingHtml.current = null;
    setStatus("saving");
    saveChain.current = saveChain.current.then(async () => {
      try {
        await api.updateDoc(id, { content_html: html });
        setStatus(pendingHtml.current == null ? "saved" : "unsaved");
      } catch {
        if (pendingHtml.current == null) pendingHtml.current = html;
        setStatus("error");
      }
    });
    return saveChain.current;
  }, [id]);

  const editor = useEditor({
    // TipTap v3 StarterKit already bundles Underline; Link is not needed here.
    extensions: [StarterKit.configure({ link: false })],
    content: "",
    editable: false,
    onUpdate: ({ editor }) => {
      if (!loaded.current || !editor.isEditable) return;
      pendingHtml.current = editor.getHTML();
      setStatus("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
  });

  // Load the document.
  useEffect(() => {
    let cancelled = false;
    api.getDoc(id).then(
      (d) => {
        if (cancelled) return;
        setDoc(d);
        setTitle(d.title);
      },
      (err) => !cancelled && setLoadError(err.message)
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Put the content into the editor once both exist (only the first time).
  useEffect(() => {
    if (!editor || !doc || loaded.current) return;
    editor.commands.setContent(doc.content_html || "<p></p>", { emitUpdate: false });
    editor.setEditable(doc.role !== "viewer", false);
    loaded.current = true;
  }, [editor, doc]);

  // Flush a pending save when leaving the page (unmount).
  useEffect(() => () => {
    if (pendingHtml.current != null) flush();
  }, [flush]);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (status === "saved") return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const commitTitle = async () => {
    const next = title.trim();
    if (!doc || next === doc.title) return setTitle(doc?.title ?? "");
    if (!next) return setTitle(doc.title);
    setTitleError("");
    try {
      const updated = await api.updateDoc(id, { title: next });
      setDoc((d) => ({ ...d, title: updated.title, updated_at: updated.updated_at }));
      setTitle(updated.title);
    } catch (err) {
      setTitle(doc.title);
      setTitleError(err.message);
    }
  };

  if (loadError) {
    return (
      <div className="page">
        <div className="error-box">{loadError}</div>
        <Link to="/">← Back to documents</Link>
      </div>
    );
  }
  if (!doc) return <div className="page muted">Loading…</div>;

  const canEdit = doc.role !== "viewer";
  const isOwner = doc.role === "owner";

  return (
    <div className="page page-wide">
      <div className="editor-head">
        <Link to="/" className="back" title="Back to documents">←</Link>
        <input
          className="title-input"
          value={title}
          maxLength={200}
          disabled={!canEdit}
          aria-label="Document title"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setTitle(doc.title);
              setTimeout(() => e.target.blur());
            }
          }}
        />
        {canEdit ? (
          <span className={`save-status status-${status}`} aria-live="polite">
            {STATUS_TEXT[status]}
          </span>
        ) : (
          <span className="badge badge-viewer">View only</span>
        )}
        <button className={`btn${isOwner ? " btn-primary" : ""}`} onClick={() => setShareOpen(true)}>
          {isOwner ? "Share" : "People"}
        </button>
      </div>
      <div className="muted small sub-line">
        Owner: {doc.owner.display_name} · Your access: <RoleBadge role={doc.role} />
      </div>
      {titleError && <div className="error-box">{titleError}</div>}

      <div className="paper">
        {canEdit && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>

      {shareOpen && <ShareDialog doc={doc} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
