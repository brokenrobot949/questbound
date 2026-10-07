# Questbound

A single-player fantasy RPG where the game is the Dungeon Master. The design is in `docs/DESIGN.md`; credits are in `CREDITS.md`.

## Playing it locally

The game uses JavaScript modules, so opening `index.html` straight from the folder won't work. Instead:

1. Double-click `tools/serve.cmd`. It starts a small test server and opens http://localhost:8000/ in your browser.
2. Keep that window open while you play. Close it to stop the server.
3. After changing files, reload the page (a hard refresh, Ctrl+Shift+R, is safest).

## Installing on a phone and playing offline

On the published site (not localhost), the game keeps a copy of itself on the device after the first visit, so it plays offline.

- **iPhone (Safari):** tap Share, then **Add to Home Screen**. Installing matters on iPhone: Safari can clear a website's saves after 7 days without a visit, but home-screen apps keep them.
- **Android (Chrome):** tap the menu, then **Add to Home screen** or **Install app**.

When a new version is pushed, the game shows **Update ready — tap to reload**. Your progress is saved, and tapping it reloads straight back into the game.

**Every release:** `service-worker.js` has a line `const VERSION = 'questbound-v1';`. That number must go up by one in every release you push (v2, v3, …), or installed copies won't update. Claude Code bumps it as part of each change.

While building on localhost the offline copy is switched off, so reloads always show the latest files. To test offline play locally, open http://localhost:8000/?sw.

The icons in `assets/ui/` come from a DawnLike sprite. To use a different one, run `tools/make-icons.ps1` with the sprite's sheet, column and row (instructions are at the top of that file).

## Fonts and settings

The game uses three free fonts, stored in `assets/fonts/` with their licences: Press Start 2P for titles and big numbers, DotGothic16 for the story and buttons, and Atkinson Hyperlegible for players who turn on **Settings → Plain font for the story**. Settings (on the title screen, and under **Menu** in the bar along the bottom during play) also has **Roll the d20 automatically**. Settings belong to the device, not a save slot.

## Debug mode

Open http://localhost:8000/?debug to get a red **Debug** button in the corner. It opens tools to jump to any scene, view and edit story flags and Ink variables, set the hero's level, force the next d20, turn on auto-roll, reset the current save, and read the playtest log (session and scene times, levels reached, deaths). In debug mode, adding `&seed=anything` to the address makes new games roll the same dice every time, including rolled ability scores and names during character creation.

## Checks

Checks run in the browser, and are linked from the footer in debug mode:

- Rules: http://localhost:8000/tests/rules.html
- Story: http://localhost:8000/tests/story.html
- Saves: http://localhost:8000/tests/saves.html (uses its own test database, so it never touches your saves)

To see every hero look at once (each species and class, and every skin, hair, outfit and headgear option), open http://localhost:8000/tests/looks.html. Add `?scale=10` to look closer.
