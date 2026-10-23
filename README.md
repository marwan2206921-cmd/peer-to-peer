# Campus Book Exchange

A responsive, front-end-only campus book exchange demo built with plain HTML, CSS, and JavaScript ES modules.

## Run it

Open a terminal in this folder and start any static file server. For example, with Python installed:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>. A local server is needed because browsers restrict ES modules opened directly from `file://` URLs.

## Demo roles

Use the footer's **Preview as** menu to switch between Visitor, Student, and Admin screens. The seeded administrator account is available for local development. Changes live in memory and reset when the page is refreshed. Registration and sign-in are demos; a production backend must authenticate users and enforce permissions on every protected request. Hiding an admin link or route is not a security boundary.

## Files

- `index.html` — app entry point
- `styles.css` — palette, responsive layouts, and component styling
- `js/app.js` — page rendering, routing, form behavior, and UI actions
- `js/api.js` — Promise-based mock API boundary for backend replacement
- `js/data.js` — currency configuration and seed accounts, books, and inquiries

The API module is the intended seam for replacing mock operations with Node/Express/PostgreSQL requests. It keeps catalog, account, listing, and inquiry operations separate from the page rendering. Deleting a demo account also removes its listings and related inquiries to keep the in-memory data consistent.
"# peer-to-peer" 
