# Mon Bondhu – Health & Daily Check‑in (Static Web App)

This repository contains a small static web app with three pages:

- Home/portal (`homepage.html`)
- Daily Check‑in calendar (`index.html` + `app.js` + `styles.css`)
- Embedded Maps helper (`maps.html` + `maps.css`)

There is no backend required; all pages run directly in the browser.

## Quick start

Open the entry page in your browser:

- Double‑click `homepage.html` to open it, or
- Serve the folder locally (recommended for consistent asset loading):

```bash
npx http-server . -p 3000 --cors
# then open http://localhost:3000/homepage.html
```

If you prefer PowerShell without installing anything globally:

```powershell
cd %CD%  # project folder
powershell -NoProfile -Command "Start-Process http://localhost:3000/homepage.html"; npx http-server . -p 3000 --cors
```

> Note: `package.json` currently lists server scripts pointing to `src/server.js`, but no server code is present. The app is static and does not need Node to run.

## Pages and features

### 1) Home – Mon Bondhu (`homepage.html` + `style.css`)
- **Purpose**: Landing page with navigation and rotating daily health tips.
- **Highlights**:
  - Dropdown menu linking to Maps and Health Tracker
  - Voice search button (uses Web Speech API when available)
  - Responsive layout and quick‑action links

### 2) Daily Check‑in Calendar (`index.html`, `app.js`, `styles.css`)
- **Purpose**: Track a once‑per‑day mood/health level (0 best → 10 worst).
- **Tech**: [FullCalendar 6](https://fullcalendar.io/) via CDN; all data stored in `localStorage`.
- **Key features**:
  - Click any day to record a mood from 0–10 (color‑coded).
  - Today summary, current streak, and best streak are computed automatically.
  - Export/Import JSON backup from the footer.
  - Clear all entries (with confirmation).
- **Data format (localStorage)**:
  - Key: `daily-checkin-entries-v2`
  - Value: JSON object mapping `YYYY-MM-DD` → number (0–10)
  - Automatic migration from legacy `daily-checkin-dates-v1` (array of dates) occurs on load.

### 3) Embedded Map Helper (`maps.html`, `maps.css`)
- **Purpose**: Quickly generate and preview a Google Maps embed for a place or coordinates.
- **Features**:
  - Accepts plain text or full Google Maps URLs; extracts the `q`/`query` parameter.
  - Zoom selector and "Use My Location" (via Geolocation API).
  - One‑click copy of the embed link.

## File overview

- `homepage.html` – Landing/portal page
- `style.css` – Styles for the portal
- `index.html` – Daily Check‑in UI
- `app.js` – Client logic for mood selection, streaks, import/export
- `styles.css` – Styles for the check‑in calendar and modal
- `maps.html` – Map embed generator page
- `maps.css` – Styles for the map page
- `package.json` – Present but not required to run; no backend used

## Development notes

- No build step or bundler is required. Edits to HTML/CSS/JS are reflected on refresh.
- If you serve the folder, any static server works (e.g., `npx http-server`, `npx serve`).
- External dependencies are loaded via CDNs on the pages that need them.

## Windows reminder (optional)

To create a daily reminder that opens the tracker page:

1. Open Task Scheduler → Create Basic Task
2. Trigger: Daily at your preferred time
3. Action: Start a program
   - Program/script: `powershell.exe`
   - Add arguments: `-Command "Start-Process 'http://localhost:3000/index.html'"`
   - Start in: your project folder
4. Ensure your local static server is running at that time (see Quick start).

