// A tiny Markdown -> HTML renderer, ported line-for-line from server.py's
// Python version so the static (Vercel) build renders docs identically to
// the local Python-server build. Headers, bold/italic, inline code, links,
// tables, "- "/"1. " lists incl. "- [ ]" checkboxes, horizontal rules,
// paragraphs, and wrapped-line continuation for list items. No nested lists,
// no code blocks -- none of this repo's docs use them.

const _INLINE_CODE = /`([^`]+)`/g;
const _BOLD = /\*\*([^*]+?)\*\*/g;
const _ITALIC = /(?<!\*)\*([^*\n]+?)\*(?!\*)/g;
const _LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

const _HEADER = /^(#{1,6})\s+(.*)$/;
const _HR = /^-{3,}$/;
const _UL_ITEM = /^-\s+(.*)$/;
const _OL_ITEM = /^\d+\.\s+(.*)$/;
const _CHECKBOX = /^\[([ xX])\]\s+(.*)$/;
const _TABLE_SEP = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(text) {
  text = escapeHtml(text);
  text = text.replace(_INLINE_CODE, "<code>$1</code>");
  text = text.replace(_BOLD, "<strong>$1</strong>");
  text = text.replace(_ITALIC, "<em>$1</em>");
  text = text.replace(_LINK, '<a href="$2">$1</a>');
  return text;
}

function splitTableRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map(c => c.trim());
}

function renderTable(rows) {
  const headerCells = splitTableRow(rows[0]);
  const bodyRows = rows.slice(2).map(splitTableRow);
  const thead = "<tr>" + headerCells.map(c => `<th>${inlineMd(c)}</th>`).join("") + "</tr>";
  const tbody = bodyRows
    .map(r => "<tr>" + r.map(c => `<td>${inlineMd(c)}</td>`).join("") + "</tr>")
    .join("");
  return `<div class="md-table-wrap"><table class="md-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
}

function renderUl(items) {
  const parts = ['<ul class="md-list">'];
  for (const text of items) {
    const m = _CHECKBOX.exec(text);
    _CHECKBOX.lastIndex = 0;
    if (m) {
      const checked = m[1].toLowerCase() === "x";
      const cls = checked ? "check-item done" : "check-item";
      const box = checked ? "☑" : "☐";
      parts.push(
        `<li class="${cls}"><span class="md-checkbox" aria-hidden="true">${box}</span>${inlineMd(m[2])}</li>`
      );
    } else {
      parts.push(`<li>${inlineMd(text)}</li>`);
    }
  }
  parts.push("</ul>");
  return parts.join("");
}

function isBlockStart(line) {
  const s = line.trim();
  return (
    s === "" ||
    _HEADER.test(s) ||
    _HR.test(s) ||
    _UL_ITEM.test(s) ||
    _OL_ITEM.test(s) ||
    s.startsWith("|")
  );
}

function consumeContinuation(lines, i, parts) {
  const n = lines.length;
  while (
    i < n &&
    lines[i].trim() !== "" &&
    /^\s/.test(lines[i]) &&
    !isBlockStart(lines[i].trim())
  ) {
    parts.push(lines[i].trim());
    i += 1;
  }
  return i;
}

function renderMarkdown(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const n = lines.length;
  while (i < n) {
    const stripped = lines[i].trim();

    if (stripped === "") {
      i += 1;
      continue;
    }

    if (stripped.startsWith("|") && i + 1 < n && _TABLE_SEP.test(lines[i + 1].trim())) {
      const tableRows = [stripped, lines[i + 1].trim()];
      i += 2;
      while (i < n && lines[i].trim().startsWith("|")) {
        tableRows.push(lines[i].trim());
        i += 1;
      }
      out.push(renderTable(tableRows));
      continue;
    }

    let m = _HEADER.exec(stripped);
    if (m) {
      const level = m[1].length;
      out.push(`<h${level}>${inlineMd(m[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (_HR.test(stripped)) {
      out.push("<hr/>");
      i += 1;
      continue;
    }

    if (_UL_ITEM.test(stripped)) {
      const items = [];
      while (i < n && _UL_ITEM.test(lines[i].trim())) {
        const parts = [_UL_ITEM.exec(lines[i].trim())[1]];
        i += 1;
        i = consumeContinuation(lines, i, parts);
        items.push(parts.join(" "));
      }
      out.push(renderUl(items));
      continue;
    }

    if (_OL_ITEM.test(stripped)) {
      const items = [];
      while (i < n && _OL_ITEM.test(lines[i].trim())) {
        const parts = [_OL_ITEM.exec(lines[i].trim())[1]];
        i += 1;
        i = consumeContinuation(lines, i, parts);
        items.push(parts.join(" "));
      }
      out.push("<ol>" + items.map(t => `<li>${inlineMd(t)}</li>`).join("") + "</ol>");
      continue;
    }

    const para = [stripped];
    i += 1;
    while (i < n && !isBlockStart(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    out.push(`<p>${inlineMd(para.join(" "))}</p>`);
  }

  return out.join("\n");
}
