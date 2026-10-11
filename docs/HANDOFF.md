# Handoff: starting the next slice

Written on Oct 11, 2026, at the end of the session that built Chapter 2, beats 4 and 5 together:
the Old Ford (the watch-post under siege, its soldiers fighting beside you, Fen's return, the
oath-stone clue) and the Bond's return in Act I. Start a new Claude Code session in this repo and
say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase.
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - Rules and Progression (levels, and what level 4 brings).
  - Combat: "Allies who aren't companions" (new), "Encounter design".
  - Companions: "How companions work so far".
- `docs/STORY.md`: Chapter 2. Beats 1 to 5 are written up as built; beats 6 (the temple's secret), 7 (the camp at Cairnfield) and 8 (eve of the barrow, level 4) are next.
- `story/act-1/ch2-old-ford.ink`: the scene just built, as a pattern: a travel stretch, a talk loop, a fight with allies whose survival the story counts (`allies_standing()`, `ally_standing(id)`), a walk-away option, Fate's Mercy, and the Bond (`has_bond`, `bond_name()`).

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it, but not always: this session he chose to build the Bond's return together with the Old Ford instead of as its own slice.
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
| Offline version | `questbound-v28` |
| Save format | version 17 (unchanged: allies live inside a fight's combatants, and `lastBattle` gained an optional `alliesAlive`) |
| Tests | 392 passing: rules 88, combat 68, saves 62, story 17, levels 12, dungeon 67, spells 34, classes 44 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–3 |
| Story | Chapter 1 complete; Chapter 2 beats 1–5 written. It ends on "Cross the Old Ford and follow the barrow road north to the Choir's camp at Cairnfield. (The rest of Chapter 2 is still being written.)", or, if the post fell, "Carry word to Bramblegate that the Old Ford has fallen, then take the barrow road north to the Choir's camp at Cairnfield." |

Built in the last session (Rob's choices: the soldiers fight, as Guards played by the game; tiered results by how many live; Fen back before the fight; the Bond built into the same scene):
- **The scene** (`story/act-1/ch2-old-ford.ink`, knot `ch2_old_ford`): the stocks' `road_north` now runs straight into it. A night at the inn (long rest), the barrow road (Survival 12), the Old Ford at dusk, Brannock's questions, the night fight or slipping away, dawn (the fallen, the oath-stone, the watch's report, Fen's decision, the Bond), and the aim north. STORY.md lists every choice, check and flag.
- **Allies in fights** (`js/engine/combat/battle.js`): an encounter's `allies` (`data/campaign/encounters.js`) fight on the hero's side with a monster's stat block, and the game plays them (`allyTurn`: hold the square, hit the most wounded foe beside them, or Dodge). They're `side: 'hero'`, `ally: true`. Foes target them. They don't count for difficulty or for losing. At 0 Hit Points they die. Your healing, potions and Lesser Restoration reach them (`forAllies`, `friendsFor`); wards don't. `allyObjective` shows "Keep the watch alive: 3 of 3 still standing." The battle screen draws them from the DawnLike sheets with a faint blue frame.
- **Deep water** (`terrain: 'water'` in `js/engine/combat/grid.js`): can't be entered, blocks neither sight nor attacks. The ford itself is difficult ground. Tiles `deep-water` and `ford` come from the water pits in `Objects/Pit0.png` (new `pit` sheet in `data/campaign/sprites.js`).
- **New data:** the SRD **Guard** in `data/srd/monsters.js` (sprite `guard`: a soldier in grey mail, Player sheet column 1, row 3); the `ford-dead` encounter; people `brannock`, `wat`, `nell`, `penhallow` (the Free League factor) and `rival`.
- **The Bond in scenes:** `has_bond(id)` and `bond_name()` (`externals.js`, declared in `story/externals.ink`). A person with `bond: 'rival'` in `people.js` shows the player's name for their rival under the portrait (`speakerName` in `js/engine/ui/speakers.js`; the adventure screen passes the hero).
- **How many of the watch lived:** `allies_standing()` and `ally_standing(id)`, from `game.lastBattle.alliesAlive` (the ids of the allies alive when the fight ended, won or lost).

## 4. The next slice

Two candidates; ask Rob which comes first. Recommended first: **level 4**.

**A. Level 4 (recommended first).** A typical hero has about 2,575 XP after the ford, and level 4 needs 2,700. The rules data stops at level 3, so a hero who passes 2,700 just can't level up yet (no error, it's capped by `nextLevelXp`). STORY.md puts level 4 at the eve of the barrow (beat 8), with an Ability Score Improvement or a feat. The slice:
- Level 4 in `data/srd/classes.js` for the four classes (SRD 5.2.1 class tables; any level 4 features), with spell slots and cantrips where they change.
- The level-up screen's **Ability Score Improvement** (+2 to one score or +1 to two, to a maximum of 20) **or a feat** (SRD 5.2.1 general feats with level 4 prerequisites: transcribe the few that are needed; ask Rob which).
- Companions at level 4: raise `TOP_LEVEL` in `js/engine/character/party.js`, add `levels: { 4: {...} }` in `data/campaign/companions.js` (their ASI or feat, set for them), and check their Hit Points rise.
- Checks in `tests/level-up-tests.js` and `tests/classes-tests.js`.

**B. Chapter 2, beat 7: the camp at Cairnfield.** The Choir's camp among the opened barrows (Cultists, Sister Rhosyn the Cultist Fanatic, the dead). Sneak in (Stealth, Fen's help, or Invisibility, the last spell still waiting for a scene in `tests/spells-tests.js`), blend in by singing the hymns with Fen (Performance), or attack. You learn the crown vault opens at the dark of the moon in three days, and Garrick works the sluice gates. Your rival, if you have one, is a prisoner here (`rival_went_ahead`), or is taken in Chapter 3.

**A question to put to Rob either way: where does beat 6 (the temple's secret) go?** It happens in Bramblegate, but the party is now at the Old Ford heading north. Recommended: after Cairnfield, the party goes back to Bramblegate to rally help before the dark of the moon (Chapter 3's beat 1 is "the allies you earned turn up": Nettle's goblins, Varrow's watch, Crane's ward-word), and the temple's secret happens then. If the post fell, the party is already going back now, so beat 6 could come straight after the ford on that path.

Smaller follow-ups noted along the way (each could be its own slice):
- **Allies:** Odda's spells (healing, Bless) don't reach the soldiers: her AI is for the party only. Allies die at 0 Hit Points with no death saves; Rob may want them to drop and be saveable instead. A Defensive or Support companion could stay near allies too.
- **No rest after the ford:** a won fight runs straight on to dawn and the road, with no rest. The next scene on the road north (or Cairnfield's approach) should offer a rest or a camp.
- **Flags for later:** `regency_favour` and `varrow_holds_cairns` (Chapter 3, beat 1), `rival_went_ahead` (rescue in Chapter 3), `league_deal`, `league_refused`, `league_wants_crowns`, `met_penhallow` (Act II, the Free League), `mentor_warned` and `sibling_letter` (Act II's Bond slot), `knows_oath_wards` (the Kings' Barrow, and the Old Circle), `fen_returned` (Fen's approval starts low), `ford_fell` and `ford_abandoned`.
- **Raising the dead:** Odda or Fen can now also die at the ford (`odda_fell_at_the_ford`, `fen_fell_at_the_ford`); raising at a temple isn't built. Debug mode's Raise works meanwhile.
- **Owing Nettle:** `owe_nettle` is still uncollected. **Gaunt** may come back (`gaunt_spared`, `hunters_backed_off`, `hunters_faced_down`, `hunters_fled`, `fen_sold`, `fen_left_behind`).
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight. The story itself is fine: Fate's Mercy scenes call `long_rest()`.
- The stocks tile reads more like a grave marker on the grid; the ford's barricade (the `crates` decor) reads like a wooden fence. Both are fine, but better pictures may exist in the sheets.
- A DC 12 or 13 check shows as "Easy" on its card (the ladder is Easy 10, Medium 15). That's working as designed, but Rob may want to know.

## 5. How the companion and ally code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...} }` changes.
  - `tactic`, `likes`, `dislikes`.
  - The `tactics` list.
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`.
  - `companionCharacter(id, level)` builds their sheet at the hero's level; it is never stored. `TOP_LEVEL` caps it at 3 for now.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id.
  - Also here: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `approve` (any whole number; it does nothing for a companion who isn't with the hero), `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 3,000 lines):
  - **Combatants, in this order** (Initiative is rolled in it): the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`, ids from the encounter such as `brannock`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`).
  - **Telling them apart:** `isHero(c)` is the hero; `isPartyMember(c)` the hero or a companion (who have character sheets); `c.ally` an ally; `c.side === 'hero'` anyone on the hero's side. Anything without a sheet (foes and allies) uses its monster's stat block for AC, speed, size, saves and damage.
  - **Lists:** `partyCombatants` (hero and companions), `companionCombatants`, `allyCombatants`, `enemies`.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf` (an ally is `'up'` or `'dead'`), `upright`.
  - **Where the party starts:** `freeSquareNear` in `startBattle`: the free squares nearest the hero by `squaresBetween` (diagonals count 1), then top to bottom, then left to right. Allies are placed first, so companions don't take their squares.
  - **Actor versions of hero functions:** `attackPreview(game, optionId, targetId, actorId)`, and `useAction(game, option, { actor })`.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn`; `friendsFor` and `forAllies` (healing, potions and Lesser Restoration reach them); `objectiveText` (an encounter's `allyObjective`); `finishBattle` records `lastBattle.alliesAlive`.
  - **Falling and losing:** `healCombatant` (an ally while standing) and `stabilise`; `companionHit` and `companionDeathSave`; `companionDies`; `checkLost` (allies don't keep a fight going).
  - **Foes' targets:** `chooseTarget(game, monster)`: the nearest of the hero's side standing, allies included.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. Its order: rescue the fallen, free the Paralyzed, Support's patch-up of anyone Bloodied, a Concentration spell in a real fight, a Spiritual Weapon strike, fight by tactic, then Cunning Action. It looks only at the party, never at allies.
- `js/engine/combat/attacks.js`: `heroAttackOptions(game)` works on a companion's `memberGame` too. `monsterAttackOptions(monster)` serves foes and allies.
- **Screens:** `battle-screen.js` (allies drawn with the foes, framed pale blue; `company()` is true with companions or allies), `dungeon-map.js`, `sheet-panel.js`, `debug-panel.js` (`partySection`: Join, Leave, Raise; `practiceSection`: the ford fight is there too), `speakers.js` (`speakerName`).
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `companion_alive`, `companion_can_cast`, `companion_cast`, `can_pay`, `pay`, `allies_standing`, `ally_standing`, `has_bond`, `bond_name` are in `js/engine/story/externals.js`, declared in `story/externals.ink`. Ink functions can call them too (`fen_rejoins()` and `watch_fate()` at the bottom of `ch2-old-ford.ink`).

## 6. Running the tests

The test pages run in the browser; there is no Node or Python on Rob's PC. Start the preview server named `questbound` (`.claude/launch.json` runs `tools/serve.ps1`; it uses port 8000 if it's free, or another port it's given, and the result says which). Then, in the Browser pane on that address (a test page such as `/tests/combat.html`), define this with the JavaScript tool:

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
window.__results = null;
runAll(['rules', 'combat', 'saves', 'story', 'levels', 'dungeon', 'spells', 'classes']).then((r) => { window.__results = r; });
```

Then read `window.__results` in a later call until it's filled. (Awaiting `runAll` directly works while the Browser pane is showing, but the JavaScript tool gives up after 45 seconds, and a hidden pane runs the pages slowly.)

- **Which page:** monster checks, the encounter-budget check and the Chapter 1–2 scene playthroughs are in `tests/dungeon-tests.js`:
  - Chapter 1: `warrenFight`, `scriptedThen`, `winFight`.
  - Chapter 2, under the mill: `chapter2(seed, { character, flags })`; `downToTheOssuary(game)`, `settleGhouls(game, won)`.
  - Chapter 2, the stocks: `atTheStocks(seed, { character, flags, odda, gold })`; `huntersArrive(game)`, `settleHunters(game, won)`, and `toCairnfield(game)` (the scene ends at the night at the inn, with the choice "Set out north at first light").
  - Chapter 2, the Old Ford: `toTheFord(seed, { character, flags, odda, fen, gold })` jumps to `ch2_old_ford` with Odda and Fen; `readyAtTheFord(game, reply)` walks to the fight's choices (reply: the answer to Fen, if he's waiting there); `settleFord(game, { won, standing, setUp })` (standing: the ids of the watch left alive); `readTheStone(game)`. Wren's Bond is her sibling Kit Ashdown; `knockWizard` (Juniper) has a mentor, Orrin Mossbottom, and Comprehend Languages; `rogue3` (Sorael) owes Old Mother Quill. For a rival, give a hero `bond: { type: 'rival', name }`.
  - Allies and deep water: `tests/combat-tests.js` (`fordFight({ party, seed })`: the hero goes first, then set `battle.order` by hand). Party sizing, Resolve and the practice fight are there too (`withParty`, `partyFight`). Companion fight checks are in `tests/classes-tests.js`; saves and migrations in `tests/saves-tests.js`; the Ink bridge, the speaker check and the story-text lint in `tests/story-tests.js`.
- **Settling a fight in a test** by setting `battle.outcome` skips the engine's victory step, so the fight's XP isn't banked (`battle.xp` stays 0). Check other XP instead, or win it by the rules.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice in order, set `game.rng = scriptedThen([...faces], seed)`. Bless adds a d4 roll before each blessed save's d20. A Fighter's Tactical Mind can turn a failed check into a success with a d10, so test a failed check with a non-Fighter.
- **Party start squares:** companions take the free squares nearest the hero, in join order. At the Old Ford (hero at (3, 3)), Odda starts at (3, 2) and Fen at (2, 3); the watch stand at (4, 2) (Brannock), (1, 3) (Wat) and (6, 3) (Nell).
- **Loading modules by hand:** to `import()` game modules in the Browser pane for debugging, first navigate to a fresh page, such as `/tests/combat.html`. A page that loaded the old code keeps it cached, and the versions mix.

## 7. Traps learned the hard way

- **Editing files:**
  - The Edit tool works well on these files (LF line endings).
  - For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run `perl replace.pl target spec` (the script is in the memory note "Shell editing traps"; copy it into your scratchpad).
  - Avoid shell heredocs for anything long. Write files with the Write tool; `sed -i` with simple substitutions is fine.
- **Ink:**
  - An inline condition keeps the space after its colon: write `word{cond:, more}`, not `word{ cond: , more}`. A story test fails on the second.
  - Choices go behind conditions as `* {cond} [Text]`, not inside `{ … }` blocks.
  - A string passed to a story command doesn't fill in `{…}`: join the parts with `+`, as in `quest_note("missing-miller", "A letter from " + bond_name() + ".")`. Story text itself does fill it in (`It's {bond_name()}.`).
  - A line where someone speaks ends with `#speaker:id`, even a short one ("I always do," Fen says.). Letters read aloud have none.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; stat blocks run together, e.g. `GuardsGuardMedium`, and a stat block's numbers follow on the next lines). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** the sheets are tiny. A PowerShell script with `System.Drawing` can enlarge a sheet with nearest-neighbour scaling and label each square; then Read the PNG. Water is in `Objects/Pit0.png` (rows 8–19 are water-filled pits; the middle column of a pit has no rim).
- **Playing on screen:**
  - **Save slots:** on the port 8000 server, slot 1 holds Rob's old test game (Juniper). Each port is a separate browser origin with its own saves; this session's server got port 56744, which had none. Use slot 2 or 3, and delete the save afterwards (debug: Reset save, then "Delete it").
  - In the Browser pane, the debug panel covers the page, so close it (the Debug button) before tapping choices, then tap the Adventure tab.
  - **Getting to a scene:** debug's **Set level** walks through the level-up screens (take the fixed Hit Points, pick the subclass, "Become level N"), **Join** adds Odda or Fen, **Add flag** sets story flags (`fen_sold` brings Fen back at the ford), and **Jump** reaches any knot or stitch (`ch2_old_ford`, or `ch2_old_ford.rival`).
  - **Ending a fight quickly:** edit the save in IndexedDB (`questbound` → `slots`, key = slot number): set the foes' `hp` in `game.battle.combatants` to 0 except one at 1, `store.put(record)` with no key, reload, Continue the slot, and finish that one off. An ally's `hp` set to 0 there counts as dead.
  - **Changing the hero's Bond to test it:** edit `game.character.bond` in the same record (`{ type: 'rival', name: 'Sable Rook' }`), reload, Continue, then Jump.
  - The battle screen's log keeps only the last 40 lines; read the whole fight from the save (`game.battle.log`).
  - **When the Browser pane is hidden:** tap buttons with the JavaScript tool (choice cards are `button.choice-card`, the d20 is `button.d20`), and tap the grid by dispatching a click on `canvas.battle-grid`. A walk on the grid waits on animation frames, which a hidden pane never delivers: press Skip, or reload and Continue.
  - A button list from the JavaScript tool includes hidden ones, such as "Update ready — tap to reload": check `offsetParent` before believing it's on screen.
