import { useEditorState } from "@tiptap/react";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";
const alt = isMac ? "⌥" : "Alt";

export default function Toolbar({ editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            h1: e.isActive("heading", { level: 1 }),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bulletList: e.isActive("bulletList"),
            orderedList: e.isActive("orderedList"),
            blockquote: e.isActive("blockquote"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  if (!editor || !state) return null;

  const chain = () => editor.chain().focus();

  const groups = [
    [
      { label: "↶", title: `Undo (${mod}+Z)`, run: () => chain().undo().run(), disabled: !state.canUndo },
      { label: "↷", title: `Redo (${mod}+Shift+Z)`, run: () => chain().redo().run(), disabled: !state.canRedo },
    ],
    [1, 2, 3].map((level) => ({
      label: `H${level}`,
      title: `Heading ${level} (${mod}+${alt}+${level})`,
      run: () => chain().toggleHeading({ level }).run(),
      active: state[`h${level}`],
    })),
    [
      { label: <b>B</b>, title: `Bold (${mod}+B)`, run: () => chain().toggleBold().run(), active: state.bold },
      { label: <i>I</i>, title: `Italic (${mod}+I)`, run: () => chain().toggleItalic().run(), active: state.italic },
      { label: <u>U</u>, title: `Underline (${mod}+U)`, run: () => chain().toggleUnderline().run(), active: state.underline },
    ],
    [
      { label: "• List", title: `Bullet list (${mod}+Shift+8)`, run: () => chain().toggleBulletList().run(), active: state.bulletList },
      { label: "1. List", title: `Numbered list (${mod}+Shift+7)`, run: () => chain().toggleOrderedList().run(), active: state.orderedList },
      { label: "❝", title: `Quote (${mod}+Shift+B)`, run: () => chain().toggleBlockquote().run(), active: state.blockquote },
    ],
  ];

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {groups.map((group, gi) => (
        <div className="tb-group" key={gi}>
          {group.map((b) => (
            <button
              key={b.title}
              type="button"
              className={`tb-btn${b.active ? " active" : ""}`}
              title={b.title}
              aria-label={b.title}
              aria-pressed={b.active ?? undefined}
              disabled={b.disabled}
              onMouseDown={(e) => e.preventDefault()} // keep the editor selection
              onClick={b.run}
            >
              {b.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
