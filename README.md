# Questbound

A single-player fantasy RPG where the game is the Dungeon Master. The design is in `docs/DESIGN.md`; credits are in `CREDITS.md`.

## Playing it locally

The game uses JavaScript modules, so opening `index.html` straight from the folder won't work. Instead:

1. Double-click `tools/serve.cmd`. It starts a small test server and opens http://localhost:8000/ in your browser.
2. Keep that window open while you play. Close it to stop the server.
3. After changing files, reload the page (a hard refresh, Ctrl+Shift+R, is safest).

Rules checks run at http://localhost:8000/tests/rules.html.
