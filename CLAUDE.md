# Questbound — Project Context for Claude Code

Questbound is a single-player, tabletop-style fantasy RPG where the game acts as the Dungeon Master. The player builds one character and plays a level 1–20 campaign under the 2024 fifth-edition rules (SRD 5.2.1), in short sessions that pick up exactly where they left off. The full design is in `docs/DESIGN.md`. Read it before starting any feature, and follow it.

## Working with Rob

- Rob is the game designer and has no coding experience. You are the programmer.
- After each change, explain in plain language what changed, how to see it working, and anything Rob needs to do.
- If the design is unclear, or a technical limit would change the design, ask Rob instead of guessing.
- When Rob changes a design decision, update `docs/DESIGN.md` so it stays the source of truth.
- Build in the phases from `docs/DESIGN.md`, in small, testable slices. **Current phase: Phase 1 (Vertical slice).** Phase 0 is complete.
- Rob commits and pushes with GitHub Desktop. Do not run `git push` unless Rob asks.

## Hard constraints

- Static site hosted on GitHub Pages: plain HTML, CSS and JavaScript only.
- No build step, no npm packages, no frameworks, no CDN links, and no network requests from the game at runtime. Every file the game uses lives in this repo. (This limits the game, not your research while building it.)
- The one third-party library is inkjs, stored at `vendor/ink-full.js` with its licence file beside it.
- Use JavaScript ES modules (`import` / `export`).
- Use relative paths only (`./js/main.js`, `../data/srd/classes.js`). Never start a path with `/`. The site is served from the `/questbound/` subfolder on github.io now and from a subdomain root later; relative paths work in both.
- Use lowercase file and folder names with hyphens. GitHub Pages is case-sensitive even when Rob's computer is not.
- Mobile-first portrait layout that also works on desktop.

## Rules content and trademarks

- Rules follow SRD 5.2.1 (2024 rules). When rules text is needed, work from the SRD 5.2.1 PDF; if you can't reach it, ask Rob to save a copy in `docs/reference/`.
- Never use "Dungeons & Dragons", "D&D", or any Wizards of the Coast logo or trademark in game text, UI, art or player-facing credits beyond the required SRD attribution.
- Never use content that is not in the SRD: beholders, mind flayers, displacer beasts, githyanki, yuan-ti, the Artificer class, the Aasimar species, the Forgotten Realms, or named figures such as Strahd or Tiamat. Anything else the game needs is designed and named originally.
- Every rules entry in `data/srd/` carries `source: 'SRD 5.2.1'`. Original content carries `source: 'original'`.
- `CREDITS.md` and the in-game Credits screen carry the SRD's attribution statement copied word for word from the SRD document, plus credits for DawnLike art, inkjs, fonts and audio.

## Rules engine

- Transcribe rules data into `data/srd/` only as each phase needs it: species, classes, backgrounds, feats, spells, monsters, equipment, magic items, conditions.
- Every d20 test (ability check, saving throw, attack roll) goes through one function in `js/engine/rules/`. It returns the full breakdown: each die, advantage or disadvantage, every modifier with its source, total, DC or AC, and outcome. The UI and roll log display that breakdown.
- Character-sheet numbers are derived from data and choices, not stored. Store only what changes in play (current HP, spent slots and uses, conditions, inventory). Every derived number can report how it was calculated, because tapping it in the UI shows the maths.
- Use one seeded random number generator for all game randomness. Its state is saved with the game, so reloading reproduces the same roll. Never call `Math.random()` in game logic.
- Encounters use the 2024 encounter budget (Low, Moderate, High), sized for the player plus active companions, or for one character in Lone Wolf mode.

## Story (Ink)

- The campaign beats (secret history, cast, shards, chapter-by-chapter beats) are in `docs/STORY.md`. Claude Code writes and maintains them; draft every scene from them, and change the beats there first when the story changes.
- Scenes live in `story/` as `.ink` files: `story/common/` for reusable scenes (shops, inns, rests, camp) and `story/act-1/` to `story/act-4/` for the campaign.
- `vendor/ink-full.js` compiles the Ink files in the browser at startup. If compile time grows noticeable, cache the compiled story in IndexedDB keyed by a content hash.
- The engine owns character state, inventory, HP and dice. Ink owns narrative flow. Ink reaches the engine only through EXTERNAL functions, all defined in one file under `js/engine/story/` with a comment for each: for example `check(skill, dc)`, `save(ability, dc)`, `has_class(id)`, `has_species(id)`, `has_background(id)`, `has_item(id)`, `has_spell(id)`, `give_item(id)`, `give_xp(n)`, `set_flag(id)`, `start_combat(encounter_id)`, `attitude(npc_id, change)`, `faction(id, change)`, `add_deed(text)`, `grant_inspiration()`.
- Use Ink tags for metadata the UI needs (choice type, check, unlock source); don't make the UI parse choice text.
- Writing rules for scenes: second person, present tense, two to four short paragraphs per beat. Failures move the story forward and never dead-end a quest. Options the character doesn't qualify for are hidden.
- Ink story state (`story.state.toJson()`) is saved together with the game state.

## Saves

- Three save slots in IndexedDB, in a database named `questbound`. Settings go in localStorage under keys prefixed with `questbound:`. Rob's other games share the same github.io address, so unprefixed keys can collide.
- Autosave after every choice and every combat turn. Each save holds game state, Ink state, RNG state, session count and last-played time, written in a single transaction.
- Every save has a version number, with a migration path for older saves.
- Export and import the full save as a downloadable `.json` file and as a copyable text code. Show a backup reminder every 10 sessions.

## Offline and home-screen install

- `manifest.webmanifest` and `service-worker.js` let the game install to a phone's home screen and play offline.
- The service worker uses a versioned cache name (`questbound-v1`, `questbound-v2`, …). Bump the version with every release Rob pushes.
- When a new version is waiting, show "Update ready — tap to reload" instead of relying on a hard refresh.
- The service worker must not get in the way of development: skip caching on localhost and in debug mode.

## Architecture

```
questbound/
  index.html
  manifest.webmanifest
  service-worker.js
  CLAUDE.md
  CREDITS.md
  docs/DESIGN.md
  css/style.css
  js/
    main.js              startup and screen routing
    engine/
      rules/             dice, checks, saves, conditions, spells, rests
      character/         creation, sheet maths, levelling, inventory
      combat/            grid, turns, actions, enemy behaviour
      story/             Ink bridge and externals, flags, journal, recaps
      world/             region map, travel, dungeons, contracts
      save/              save slots, export and import, migrations
      ui/                screens and widgets
  data/
    srd/                 rules content from SRD 5.2.1
    campaign/            places, NPCs, factions, companions, loot,
                         encounter tables, contract templates
  story/
    common/ act-1/ act-2/ act-3/ act-4/
  tests/                 rules checks that run in the browser
  vendor/
    ink-full.js          inkjs runtime and compiler, plus its licence
  assets/
    dawnlike/            the original DawnLike pack, unmodified
    tiles/ sprites/ ui/ fonts/ audio/
```

- `js/engine/` holds logic. `data/` and `story/` hold all content: names, numbers, rules entries and narrative. Never hard-code content in engine files.
- Data files are ES modules that export plain arrays and objects, with short comments so Rob can safely edit numbers and text.
- Screens are regular HTML and CSS. The battle grid, dungeon maps, region map and scene backdrops are drawn on canvas.

## Art and audio

- Art is DawnLike (16 × 16, CC-BY 4.0; credit DragonDePlatino and DawnBringer). Rob downloads the pack from OpenGameArt and adds it to `assets/dawnlike/`. Keep that folder unmodified; map sprite IDs to sheet positions in a data file.
- Draw at whole-number scale (3× on phones) with `image-rendering: pixelated`. Never scale pixel art by fractions.
- Character looks come from base sprites plus palette swaps; equipped armour changes colour. Monsters without a matching sprite reuse a close match with a palette shift.
- Portraits are the character's sprite enlarged inside a framed box.
- Fonts are self-hosted in `assets/fonts/` with their licence files: a pixel font for headings and numbers, a more readable pixel font for narration, and a setting that switches narration to a plain font.
- Audio arrives in Phase 5: MP3 files only, starting only after the player's first tap, with mute plus separate music and effects volume saved under the `questbound:` prefix.

## Tone and writing

- Classic high fantasy with some grit, and warmth and humour in the people you meet. PG-13: violence is real but not lingered on.
- The DM narrates in the second person, present tense, in short vivid paragraphs. A natural 20 gets a flourish and a natural 1 gets a wry line.
- Journal and roll-log lines are short and stamped with the in-game day, like "Day 12: talked the toll-bridge trolls down to half price."
- Place and character names in `docs/DESIGN.md` (Caldmere, Bramblegate, the Ashen Choir) are working names; use them unless Rob changes them.

## Testing

- Opening `index.html` directly will not work because of ES modules. Start a simple local static server from the repo root and give Rob the address to open.
- Remind Rob to hard refresh after changes when testing locally.
- `tests/rules.html` runs rules checks in the browser (ability modifiers, proficiency bonus by level, attack and damage maths, spell slots, XP thresholds) and shows a pass or fail list. Add checks whenever rules code changes, and run them before saying a rules change is done.
- Add a debug mode, turned on by adding `?debug` to the URL, with:
  - jump to any Ink knot, and view or edit story flags
  - set level, grant items and gold
  - force the next d20 result, and toggle auto-roll
  - a "Reset save" button for the current slot
  - a playtest log that records session lengths, time per scene, levels reached and deaths, with averages
