# Handoff: starting the next slice

Written on Oct 10, 2026, at the end of the session that built Chapter 2, beats 1 and 2: Lark's
rescue from the ossuary under Dunn's Mill, and Odda joining through the story. Start a new
Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.**
- `docs/DESIGN.md`: the source of truth. The parts most relevant to the next slice:
  - Story: the campaign roadmap; and `docs/STORY.md`, Chapter 2 (Act I), beat 3 and its "Fights ready for these scenes".
  - Companions: "How companions work so far" (joining, their spells in scenes, approval).
  - Combat: "Chapter 2's monsters" (the Bandit and the Bandit Captain's Parry) and "Encounter design".
- `docs/STORY.md`: campaign beats. Chapter 2's beats 1 and 2 are written up as built; beat 3 is next.
- `story/act-1/ch2-millers-daughter.ink`: the scenes just built, as a pattern for the next ones.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He has taken the recommended option every time so far.
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save).
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js.

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v26` |
| Save format | version 17 (unchanged: the new scenes only add story flags and a new dungeon id) |
| Tests | 364 passing: rules 88, combat 62, saves 61, story 17, levels 12, dungeon 46, spells 34, classes 44 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–3 |
| Story | Chapter 1 complete; Chapter 2 beats 1–2 written (it ends on "The rest of Chapter 2 is still being written") |

Built in the last session (Rob took the recommended option on every question: Odda joins at the mill before the delve; Lark's numbness is a story liberty; and, for the next slice, Fen fights beside you at the stocks):
- **Chapter 2, beats 1–2** (`story/act-1/ch2-millers-daughter.ink`, knots `ch2_morning`, `ch2_mill`, `ch2_ossuary`): Chapter 1's last scene now has a choice that leads on into it. STORY.md lists every choice, check and flag.
- **The dungeon under Dunn's Mill** (`mill-ossuary` in `data/campaign/dungeons.js`): cellar, tunnel, niches, ossuary. `ossuary-ghouls` moved into its last room (`map: { dungeon, room }`; hero at (3, 1), Ghouls at (4, 7) and (2, 6)).
- **People as figures:** a dungeon room's `figures` can be `{ person: 'lark', lying: true, … }` (drawn as they look in scenes, from `people.js`), and an encounter's `onlookers` can be `{ person, pos, lying }` (`battle-screen.js` draws them; `battleMap` makes the square an obstacle without a decor).
- **The party on the dungeon map:** companions stand on the free squares nearest the room's entry (`besideEntry` in `js/engine/world/dungeons.js`), which is where a fight there starts them.
- **New story commands** (`externals.js`, declared in `story/externals.ink`): `companion_alive(id)`, `companion_can_cast(id, spell)` and `companion_cast(id, spell)`. A choice tagged `#spell:x #by:odda` shows "Odda's spell · … · level 2 slot" (`spellTag` in `adventure-screen.js`; `#by` in `tags.js`). DM notes `companionCastWithSlot`, `companionCastRitual` and `companionCastFree` are in `dm-voice.js`.
- **A new quest:** `millers-daughter` ("The Miller's Daughter") in `data/campaign/quests.js`.
- **An Ink fix:** Ink keeps the space after the colon of an inline condition, so `{ cond: , text}` prints "word , text". Chapter 1's hymnal line had it; a story test now checks every scene.
- **Dev server:** `.claude/launch.json` has `"autoPort": true` and `tools/serve.ps1` reads `$env:PORT` (still 8000 by default, and `serve.cmd` still uses 8000), because another chat's server held port 8000.

## 4. The next slice: Fen in the stocks

Recommended next: **Chapter 2, beat 3** (STORY.md): Fen Underbough in the stocks in Bramblegate's market square, the bounty hunters ("Dead or alive. The Choir pays double for dead."), and Fen joining (`join_party("fen")`). Check the scope with Rob first, and propose:
- **The scene** (a new knot, say `ch2_stocks`, after Morwen's breakfast): Fen begs ("I know where they're taking your miller. I used to sing with them."); a Rogue who read the chalk marks (`read_cant_marks`) knows him for the songbird with the bounty on him.
- **Freeing him:** pick the lock (Thieves' Tools: a Rogue, or a Criminal), Knock it open (loudly), persuade Captain Varrow, or pay his fine. He joins.
- **Fighting the hunters** (`stocks-hunters`, Moderate for three): Rob chose that choosing to fight frees Fen first, so call `join_party("fen")` before the `#combat` choice and he starts on the grid beside you. Odda is in the party already, so the party is full (`party_full()`).
- **Handing him over** (a Wealth Drive moment): Fen's approval doesn't exist until he joins, but Odda's does (she dislikes cruelty; Fen's own dislikes include hangings and the Choir).
- **Fen's approval moments** (likes: cleverness, freedom, sparing people; dislikes: hangings, people who worship authority, the Ashen Choir).
- **Losing the fight is Fate's Mercy**, as the other Chapter 1–2 fights are.

Questions to put to Rob:
- If you hand Fen over or turn him away, does he ever join later (say, he escapes and finds you at the Old Ford), or is he gone for Act I? STORY.md only says the same lead comes from Nettle's goblins or the hunters, at a price. Recommended: he escapes and turns up later, sour, so the companion isn't lost for good.
- What does Fen's fine cost? Recommended: 10 gold, so a hero who lost their purse to Fate's Mercy may not afford it and has to choose another way.

Smaller follow-ups noted along the way (each could be its own slice):
- **Raising the dead:** if Odda dies in the ossuary (rare: three failed death saves), the temple "keeps her until she can be raised". Raising at a temple (at a price) isn't built; debug mode's Raise works meanwhile.
- **Level 4:** the Ability Score Improvement or a feat on the level-up screen (the rules data goes to level 3 so far; `companionCharacter` caps companions at the rules data's top level).
- **The Old Ford** (Chapter 2, beat 5) needs allies who aren't in the party: three soldiers to keep alive.
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight. The story itself is fine: Fate's Mercy scenes call `long_rest()`, which restores the party.
- The stocks tile (DawnLike decor at column 0, row 11) is a wooden post with a crossbar; a better pillory may be worth drawing from the sheets.

## 5. How the companion code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...} }` changes.
  - `tactic`, `likes`, `dislikes`.
  - The `tactics` list.
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`.
  - `companionCharacter(id, level)` builds their sheet at the hero's level; it is never stored.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id. Scene casting uses it too (`sceneCastCost(memberGame(…), spell)`).
  - Also here: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `approve`, `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 2,950 lines):
  - **Combatants:** the hero (`id 'hero'`), companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`), and foes (`side 'enemy'`).
  - **Telling them apart:** `isHero(c)` means the hero themselves; `c.side === 'hero'` means anyone in the party.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`, `partyCombatants`, `companionCombatants`.
  - **Actor versions of hero functions:** `attackPreview(game, optionId, targetId, actorId)`, and `useAction(game, option, { actor })` to spend a companion's slots (it also ends that caster's Sanctuary).
  - **Companion actions:** `companionAttack` (Spiritual Weapon too), `companionCastOn` (wards), `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Falling and losing:** `healCombatant` and `stabilise`; `companionHit` and `companionDeathSave`; `companionDies` (clears effects on them); `checkLost`.
  - **Foes' targets:** `chooseTarget(game, monster)`.
  - **Old saves:** `battle.sneakAttackTurn` can be an old string or an `{ id: 'round:turn' }` object. `vexed` effects carry `byId`, and older ones without it count as the hero's.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. Its order: rescue the fallen (heal, Spare the Dying, Medicine), then free the Paralyzed (Lesser Restoration), then Support's patch-up of anyone Bloodied, then a Concentration spell in a real fight, then a Spiritual Weapon strike, then fight by tactic (an Aggressive Rogue Dashes to reach a foe), then Cunning Action (Hide, or Disengage when Bloodied beside a foe).
- `js/engine/combat/attacks.js`: `heroAttackOptions(game)` works on a companion's `memberGame` too (`company` is false there). The Light extra attack checks `game.actorId`.
- **Screens:** `battle-screen.js`, `dungeon-map.js` (the party a step behind the hero), `sheet-panel.js` (`partyBlock`, `castBlock`), `debug-panel.js` (`partySection`: Join, Leave, Raise; `practiceSection`; actions in `js/main.js`).
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `companion_alive`, `companion_can_cast` and `companion_cast` are in `js/engine/story/externals.js`, declared in `story/externals.ink`.

## 6. Running the tests

The test pages run in the browser; there is no Node or Python on Rob's PC. Start the preview server named `questbound` (`.claude/launch.json` runs `tools/serve.ps1`; it uses port 8000 if it's free, or another port it's given, and the result says which). Then, in the Browser pane on that address, run this with the JavaScript tool:

```js
window.runAll = async (pages) => {
  const out = {};
  for (const page of pages) {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-2000px;width:800px;height:600px';
    frame.src = `/tests/${page}.html?t=${Date.now()}`;
    document.body.append(frame);
    const start = Date.now();
    let summary = '';
    while (Date.now() - start < 90000) {
      await new Promise((r) => setTimeout(r, 500));
      const s = frame.contentDocument && frame.contentDocument.querySelector('#summary');
      if (s && /passed/.test(s.textContent)) { summary = s.textContent; break; }
    }
    out[page] = { summary: summary || 'TIMEOUT', fails: [...frame.contentDocument.querySelectorAll('li.fail')].map((li) => li.textContent) };
    frame.remove();
  }
  return out;
};
await runAll(['rules', 'combat', 'saves', 'story', 'levels', 'dungeon', 'spells', 'classes']);
```

- **Which page:** monster checks (Ghouls, Parry, the hunters), the encounter-budget check and the Chapter 1–2 scene playthroughs are in `tests/dungeon-tests.js` (`ghoulFight`, `warrenFight`, `scriptedThen`; for Chapter 2: `chapter2(seed, { character, flags })` jumps to `ch2_morning`, `downToTheOssuary(game)`, `settleGhouls(game, won)`). Party sizing, Resolve and the practice fight are in `tests/combat-tests.js` (`withParty`, `partyFight`). Companion fight checks, Lesser Restoration and a Paralyzed Odda are in `tests/classes-tests.js` (`fightWith(character, encounter, seed, { party, setUp })`; `playTurn(game, id)` plays one companion turn right now; `paralyse(game, id)`); saves and migrations in `tests/saves-tests.js`; the Ink bridge and the story-text lint in `tests/story-tests.js`.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice in order (any size: a d20 face, then a d4 for damage…), set `game.rng = scriptedThen([...faces], seed)`. Bless adds a d4 roll before each blessed save's d20.
- **Party start squares:** companions take the free squares nearest the hero, in join order, sorted by distance, then top to bottom, then left to right. A doorway row counts: in the ossuary (hero at (3, 1)), Odda starts in the doorway at (3, 0). In the mill fight (hero at (3, 1)), Odda alone starts at (2, 1); Odda and Fen at (2, 1) and (4, 1).
- **Initiative order:** Initiative is rolled in combatant order: the hero, the foes, then the companions. Tests often set `battle.order` and `battle.turn` by hand afterwards.
- **Loading modules by hand:** to `import()` game modules in the Browser pane for debugging, first navigate to a fresh page, such as `/tests/combat.html`. A page that loaded the old code keeps it cached, and the versions mix.

## 7. Traps learned the hard way

- **Editing files:**
  - The Edit tool works well on these files (LF line endings).
  - For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run `perl replace.pl target spec` (the script is in the memory note "Shell editing traps"; copy it into your scratchpad).
  - Avoid shell heredocs for anything long: a heredoc of test code failed this session with "unexpected EOF", and quotes have broken files before. Write the spec file with the Write tool.
- **Ink:** an inline condition keeps the space after its colon. Write `word{cond:, more}`, not `word{ cond: , more}` (which prints "word , more"); a story test fails on the second. Ink choices go behind conditions as `* {cond} [Text]`, not inside `{ … }` blocks.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; stat blocks run together, e.g. `GhoulGhoulMedium Undead`). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** the sheets are tiny. A PowerShell script with `System.Drawing` can enlarge a sheet with nearest-neighbour scaling and label each square "col,row"; then Read the PNG.
- **Playing on screen:**
  - In the Browser pane, the debug panel covers the page, so close it (the Debug button) before tapping choices.
  - **Getting to a scene:** debug's **Set level** walks through the level-up screens (take the fixed Hit Points, pick the subclass, "Become level N"), then **Jump** reaches any knot (`ch2_morning` starts Chapter 2). **Practice fight** starts any encounter with the party as it is, and puts everyone back afterwards.
  - The battle screen's log keeps only the last 40 lines; read the whole fight from the save in IndexedDB (`game.battle.log`).
  - **Force next d20** sets the next roll, Initiative included (the hero's is rolled first).
  - There's no debug control for a companion's Hit Points: edit the slot's record in IndexedDB (`questbound` → `slots`, key = slot number, `game.party[i].hp`) and reload.
  - **When the Browser pane is hidden:** `computer` clicks can land at half the coordinates, so tap buttons with the JavaScript tool (choice cards are `button.choice-card`) and tap the grid by dispatching a click on `canvas.battle-grid` at the square's centre. A walk on the grid waits on animation frames, which a hidden pane never delivers, so the replay stalls, but the fight itself is decided and saved: reading `game.battle` from IndexedDB shows where everyone is, and reloading and pressing Continue shows the result. Screenshots can be stale while hidden; read the page text instead.
  - A button list from the JavaScript tool includes hidden ones, such as "Update ready — tap to reload": check `offsetParent` before believing it's on screen.
- **Test saves:** slot 1 holds Rob's old test game (Juniper) on the port 8000 server. Each port is a separate browser origin with its own saves, so a server on another port starts with empty slots. Use slot 2 or 3 for testing, and delete the save afterwards (debug: Reset save, then "Delete it").
