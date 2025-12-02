EO Phoenix Editor

This is a minimal scaffold for an Electron + React + TypeScript editor for EO Phoenix.

How to run (local dev):

1. Open a terminal in the project folder.
2. npm install
3. npm run dev

Notes:
- The preload exposes `window.eo.selectFiles()` and `window.eo.export(payload)`; export copies selected files and writes metadata.json to a folder you choose.
- The canvas-based MediaEditor is a simple starting point: it supports picking files, a border stroke, and a movable text overlay.
