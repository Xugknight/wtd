# Write That Down

A simple, offline‑friendly scratchpad inspired by `data:text/html,<html contenteditable>`, with quality‑of‑life features for quick note taking, code snippets, and Markdown viewing.

> Status: **MVP in progress** — core features scaffolded, polishing and fixes next.

---

## ✨ Features (intended)

- **Contenteditable editor** with autosave to `localStorage` (per‑tab pads)
- **Multiple pads** via tabs (add/rename/delete)
- **Download** as `.txt` or self‑contained `.html`
- **Open** local files (`.txt`, `.md`, `.html`) into the editor
- **Paste as plain text** toggle to strip formatting
- **Monospace** + **Wrap** toggles
- **Light/Dark themes**
- **Notebook line intensity** slider (controls decorative background)
- **Markdown Preview** panel (live, minimal parser)
- **Service worker** for offline app‑shell caching

---

## 🧰 Tech & Architecture

- **Static** HTML/CSS/JS — no build step required
- **LocalStorage** for pads + UI state
- **Service Worker** (`sw.js`) caches `index.html`, CSS/JS, favicon; network fallback for other requests
- **Zero dependencies** (no MD library; very small inline parser)

---

## ⌨️ Keyboard Shortcuts

- **Ctrl/Cmd + S** → download `.txt`
- **Ctrl/Cmd + Shift + S** → download `.html`
- **Ctrl/Cmd + N** → new pad
- **Ctrl/Cmd + B** → toggle Markdown Preview

**Tabs:**
- Click tab name → switch pads
- **Ctrl/Cmd + Click** tab → rename
- **Right‑click** tab → delete
- **＋** button → add pad
- Overflow menu (when many pads) shows extra pads

---

## 📝 Markdown Preview (how to use)

- Toggle **MD Preview** in the toolbar.
- The preview renders from the editor’s **plain text** content (not HTML).
- Supported basics: headings (`#`, `##`, `###`), bold (`**bold**`), italic (`*italic*`), inline code (\`code\`), fenced code (\`\`\` block \`\`\`), bullet lists (`- item`), links (`[text](https://...)`).  
- Not supported yet: numbered lists, blockquotes, tables (coming soon).

---

## 🔭 Roadmap

- **Fixes first**: tab creation, light theme toggle, intensity slider, Markdown initialization
- **Design**: stylized **dark (slate + amber)** palette
- **Overflow tab menu** with actions (rename, delete) inside
- **Export/Import all pads** (JSON backup/restore)
- **Markdown**: numbered lists, blockquotes, tables, code highlighting (no external runtime libs)
- **Theming**: palette switcher (Dark variants), custom accent color
- **Sync**: optional storage sync via file export/import (no backend)
- **Accessibility**: improved focus rings, better contrast checks, aria‑labels