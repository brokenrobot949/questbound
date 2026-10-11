# Handoff: starting the next slice

Written on Oct 10, 2026, at the end of the session that built Chapter 2's first slice: fights
sized for the party, and the Ghoul, Bandit and Bandit Captain (with Lesser Restoration in
fights, and debug mode's Practice fight). Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.**
- `docs/DESIGN.md`: the source of truth. The parts most relevant to the next slice:
  - Story: the campaign roadmap; and `docs/STORY.md`, Chapter 2 (Act I), with its "Fights ready for these scenes".
  - Companions: "How companions work so far" (joining through the story, approval).
  - Combat: "Chapter 2's monsters" and "Encounter design" (how a fight is sized for the party).
  - World and Exploration: Dungeons (the ossuary under the mill is a short delve).
- `docs/STORY.md`: campaign beats. Chapter 2 is where Odda and Fen join.

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
| Offline version | `questbound-v25` |
| Save format | version 17 (unchanged: a practice fight only adds an optional `practice` field to `game.battle`) |
| Tests | 355 passing: rules 88, combat 62, saves 61, story 16, levels 12, dungeon 38, spells 34, classes 44 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–3 |
| Story | Chapter 1 complete; Chapter 2's fights and monsters ready, its scenes not written |

Built in the last session (Rob took the recommended option on every question: this slice first, count companions in a fight's difficulty, and a crossbow instead of the Bandit Captain's Pistol):
- **Party-sized fights** (`js/engine/combat/difficulty.js`): `partyBudget(level, size)`, `partySize(game)` (the hero plus companions who aren't fallen), `encounterXp(encounter)`, `ratingFor(xp, budget)` ('Low', 'Moderate', 'High', 'Deadly'), `fightRating(game, encounterId)`. The fight card uses it (`fightLabel` in `adventure-screen.js`), and so do Resolve and Odda's `realFight`.
- **Encounters** carry `sizedFor: { level, party }`, and a dungeon test checks each `difficulty` against the budget. Chapter 1's are `{ level: 1 or 2, party: 1 }`.
- **Resolve** (`resolve.js`): `resolveLimit(level, size)`; it stops if anyone in the party is below half; the report lists what each lost ("Fen lost 6 Hit Points.") and slots Odda spent. `resolveFight` returns `losses` too.
- **Monsters** (`data/srd/monsters.js`): `ghoul`, `bandit`, `bandit-captain` (a `variant` field explains the crossbow). New data: an attack's `plus: { dice, type }` (extra dice, doubled on a crit), `alone: true` (an action of its own, not part of Multiattack), `onHit` with `save`, `until: 'end-of-next-turn'`, `notTypes`, `notSpecies`; the reaction `'parry'`.
- **In `battle.js`:** `couldTakeHold` (exported) and `onHitCondition(game, attacker, target, onHit)`; `extraDamage`; `parry` / `canParry` (and "it can Parry" in `attackPreview`); a Ghoul's opener choice in `enemyTurn`; a Paralyzed hero's turn passes in `runEnemyTurns`; `applyCondition` ends a party member's Concentration when they're Incapacitated; `endOfTurn` logs "The numbness fades"; `autoFails` and `cantSave` work for anyone.
- **Lesser Restoration** has fight data (`kind: 'restore'`, `ends`): `friendProblem`, `restoreCondition`, `companionRestore`, Odda's `restoreSomeone` in `companion-ai.js` (after rescuing the fallen). Alone, a hero sees it only with a condition on them it can end.
- **Encounters:** `ossuary-ghouls` (two Ghouls; Moderate for a level 3 hero and Odda) and `stocks-hunters` (Captain and two Bandits; Moderate for three). New tiles in `data/campaign/sprites.js`: coffin, gravestone, skull, cobbles, stocks; sprites ghoul, bandit, bandit-captain.
- **Debug: Practice fight** (`startPractice` in `story-runner.js`, `practiceSection` in `debug-panel.js`, `practiceFight` in `main.js`): `game.battle.practice` keeps what to put back; `choiceIndex` is null; `continueAfterBattle` restores and returns the same page with a note.

## 4. The next slice: Lark's rescue and Odda joining

Recommended next: **Chapter 2, beats 1 and 2** (STORY.md): the mill tunnel delve, the Ghouls in the ossuary, Lark Paralyzed on her ledge, and Odda arriving and joining through the story (`join_party("odda")`), with her first approval moments. Check the scope with Rob first, and propose:
- **The ossuary as a dungeon** (4 rooms, like Brackenhollow in `data/campaign/dungeons.js`), with `ossuary-ghouls` in its last room. The encounter has its own map now; moving it into a dungeon room means a `map: { dungeon, room }` instead.
- **Lark** as a person in `data/campaign/people.js` (she has lines already in Chapter 1, so check), and drawn on her ledge (an onlooker-style figure, or a room figure).
- **Freeing Lark:** a `#spell:lesser-restoration` choice (the hero's), or Odda's if she's with you and level 3; otherwise you carry her out and the Ghouls follow (a fight objective, or a chase scene).

Questions to put to Rob:
- Does Odda join before the ossuary fight (so it's sized for two, as `sizedFor` says) or arrive during it? Recommended: she meets you at the mill and goes down with you, so the fight is Moderate for two.
- Fen in the stocks: does he fight beside you in `stocks-hunters` (sized for three) or stay locked in (High for two)? Recommended: freeing him is part of choosing to fight, so he fights.

Smaller follow-ups noted along the way (each could be its own slice):
- **Level 4:** the Ability Score Improvement or a feat on the level-up screen (the data and screens go to level 3 so far; `companionCharacter` caps companions at the rules data's top level).
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
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id.
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
- **Screens:** `battle-screen.js`, `sheet-panel.js` (`partyBlock`, `castBlock`), `debug-panel.js` (`partySection`: Join, Leave, Raise; `practiceSection`; actions in `js/main.js`).
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full` and `approve` are in `js/engine/story/externals.js`, declared in `story/externals.ink`.

## 6. Running the tests

The test pages run in the browser; there is no Node or Python on Rob's PC. Start the preview server named `questbound` (port 8000; `.claude/launch.json` runs `tools/serve.ps1`). Then, in the Browser pane on `http://localhost:8000/`, run this with the JavaScript tool:

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

- **Which page:** monster checks (Ghouls, Parry, the hunters) and the encounter-budget check are in `tests/dungeon-tests.js` (`ghoulFight`, `warrenFight`, `scriptedThen`). Party sizing, Resolve and the practice fight are in `tests/combat-tests.js` (`withParty`, `partyFight`). Companion fight checks, Lesser Restoration and a Paralyzed Odda are in `tests/classes-tests.js` (`fightWith(character, encounter, seed, { party, setUp })`; `playTurn(game, id)` plays one companion turn right now; `paralyse(game, id)`); saves and migrations in `tests/saves-tests.js`.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice in order (any size: a d20 face, then a d4 for damage…), set `game.rng = scriptedThen([...faces], seed)`. Bless adds a d4 roll before each blessed save's d20.
- **Party start squares:** companions take the free squares nearest the hero, in join order, sorted by distance, then top to bottom, then left to right. In the mill (hero at 3, 1), Odda alone starts at (2, 1); Odda and Fen start at (2, 1) and (4, 1); Fen alone at (2, 1).
- **Initiative order:** Initiative is rolled in combatant order: the hero, the foes, then the companions. Tests often set `battle.order` and `battle.turn` by hand afterwards.
- **Loading modules by hand:** to `import()` game modules in the Browser pane for debugging, first navigate to a fresh page, such as `/tests/combat.html`. A page that loaded the old code keeps it cached, and the versions mix.

## 7. Traps learned the hard way

- **Editing files:**
  - The Edit tool works well on these files (LF line endings).
  - For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run `perl replace.pl target spec` (the script is in the memory note "Shell editing traps"; copy it into your scratchpad).
  - Avoid shell heredocs for JavaScript edits: quotes have broken files before.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; stat blocks run together, e.g. `GhoulGhoulMedium Undead`). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** the sheets are tiny. A PowerShell script with `System.Drawing` can enlarge a sheet with nearest-neighbour scaling and label each square "col,row"; then Read the PNG.
- **Playing on screen:**
  - In the Browser pane, the debug panel covers the page, so close it (the Debug button) before tapping choices.
  - **Practice fight** in the debug panel starts any encounter with the party as it is, and puts everyone back afterwards. **Jump** reaches any scene; `ch1_warren_depths.the_dead_turn` is a zombie fight.
  - The battle screen's log keeps only the last 40 lines; read the whole fight from the save in IndexedDB (`game.battle.log`).
  - **Force next d20** sets the next roll, Initiative included (the hero's is rolled first).
  - There's no debug control for a companion's Hit Points: edit the slot's record in IndexedDB (`questbound` → `slots`, key = slot number, `game.party[i].hp`) and reload.
  - **When the Browser pane is hidden:** `computer` clicks can land at half the coordinates, so tap buttons with the JavaScript tool and tap the grid by dispatching a click on `canvas.battle-grid` at the square's centre. A walk on the grid waits on animation frames, which a hidden pane never delivers, so the replay stalls (Skip doesn't help); reload the page and Continue the slot to carry on from the saved state. Screenshots did work this session even while the pane was reported hidden.
- **Test saves:** slot 1 holds Rob's old test game (Juniper). Use slot 2 or 3 for testing, and delete the save afterwards (debug: Reset save, then "Delete it").
