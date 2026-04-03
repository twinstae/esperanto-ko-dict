# Esperanto–Korean dictionary (CSR)

A static Astro site: the home page and a single `/words` shell load dictionary data in the browser (`fetch` + IndexedDB). Lookup runs entirely on the client.

## Commands

| Command        | Action                                              |
| -------------- | --------------------------------------------------- |
| `bun install`  | Install dependencies                                |
| `bun run dev`  | Dev server (default `localhost:4321`)             |
| `bun run build`| Production build to `dist/`                         |
| `bun run build:dict` | Regenerate `public/data/eo-ko.json` from `dict.xlsx` |
| `bun test`     | Run tests                                           |

## Dictionary data

- Source: `dict.xlsx` (sheet **에-한**).
- Generated JSON: `public/data/eo-ko.json` (run `bun run build:dict` after changing the spreadsheet).

## URLs

- `/` — search form.
- `/words/<lemma>` — lookup (e.g. `/words/Kate%C4%A5ismo` for `Kateĥismo`).

### Static hosting and `/words/...`

The app is one HTML shell at `words/index.html`. Direct requests to `/words/something` need a **rewrite** so the server serves that HTML while the browser URL stays `/words/something`.

- **Netlify**: [`public/_redirects`](public/_redirects) is copied into `dist/`.
- **Vercel**: [`vercel.json`](vercel.json) rewrites `/words/:path*` → `/words/index.html`.
- **GitHub Pages** (no server rewrites): use a host that supports SPA-style rewrites, or duplicate the common “copy `index.html` to `404.html`” pattern, or use hash-based URLs instead.

Local dev uses a small Vite middleware in [`astro.config.mjs`](astro.config.mjs) so `/words/<lemma>` resolves without extra config.

## Project layout

- [`src/lib/dict-store.ts`](src/lib/dict-store.ts) — fetch JSON, IndexedDB, lookup.
- [`src/lib/xlsx-eo-han.ts`](src/lib/xlsx-eo-han.ts) — XLSX → entries (build script and tests).
- [`scripts/xlsx-to-json.ts`](scripts/xlsx-to-json.ts) — CLI to emit `public/data/eo-ko.json`.
