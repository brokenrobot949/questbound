# Questbound

A single-player fantasy RPG where the game is the Dungeon Master. The design is in `docs/DESIGN.md`; credits are in `CREDITS.md`.

## Playing it locally

The game uses JavaScript modules, so opening `index.html` straight from the folder won't work. Instead:

1. Double-click `tools/serve.cmd`. It starts a small test server and opens http://localhost:8000/ in your browser.
2. Keep that window open while you play. Close it to stop the server.
3. After changing files, reload the page (a hard refresh, Ctrl+Shift+R, is safest).

## Debug mode

Open http://localhost:8000/?debug to get a red **Debug** button in the corner. It opens tools to jump to any scene, view and edit story flags and Ink variables, set the hero's level, force the next d20, turn on auto-roll, reset the current save, and read the playtest log (session and scene times, levels reached, deaths). In debug mode, adding `&seed=anything` to the address makes new games roll the same dice every time.

## Checks

Checks run in the browser, and are linked from the footer in debug mode:

- Rules: http://localhost:8000/tests/rules.html
- Story: http://localhost:8000/tests/story.html
- Saves: http://localhost:8000/tests/saves.html (uses its own test database, so it never touches your saves)
