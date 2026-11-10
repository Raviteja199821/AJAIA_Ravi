import html
import os
from io import BytesIO

import mammoth
import markdown

SUPPORTED = {".txt", ".md", ".docx"}
MAX_BYTES = 2 * 1024 * 1024


class FileImportError(ValueError):
    pass


def _ext(filename: str) -> str:
    return os.path.splitext(filename or "")[1].lower()


def file_to_html(filename: str, data: bytes) -> str:
    ext = _ext(filename)
    if ext not in SUPPORTED:
        raise FileImportError("Unsupported file type. Please upload .txt, .md or .docx")
    if len(data) > MAX_BYTES:
        raise FileImportError("File is larger than 2 MB")
    if not data:
        raise FileImportError("File is empty")

    if ext == ".docx":
        try:
            return mammoth.convert_to_html(BytesIO(data)).value
        except Exception as exc:  # mammoth raises many types on bad input
            raise FileImportError("Could not read this .docx file") from exc

    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise FileImportError("Text files must be UTF-8 encoded") from exc

    if ext == ".md":
        return markdown.markdown(text, extensions=["extra", "sane_lists"])

    lines = text.splitlines()
    return "".join(f"<p>{html.escape(line)}</p>" for line in lines) or "<p></p>"


def title_from_filename(filename: str) -> str:
    base = os.path.basename(filename or "")
    title = os.path.splitext(base)[0].strip()[:200]
    return title or "Imported document"
