# Handoff: starting the next slice

Written on Oct 11, 2026, at the end of the session that built Chapter 2, beat 3: Fen Underbough
in the stocks, Mercy Gaunt's bounty hunters, and Fen joining. Start a new Claude Code session in
this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase (Rob, Oct 11, 2026).
- `docs/DESIGN.md`: the source of truth. The parts most relevant to the next slice:
  - Story: the campaign roadmap; and `docs/STORY.md`, Chapter 2 (Act I), beats 4 and 5.
  - Companions: "How companions work so far" (joining, approval, Fen's return).
  - Combat: "Encounter design" (how fights are sized for the party) and "Enemy behaviour".
- `docs/STORY.md`: campaign beats. Chapter 2's beats 1 to 3 are written up as built; beats 4 (the Bond) and 5 (the Old Ford) are next.
- `story/act-1/ch2-stocks.ink`: the scene just built, as a pattern: a talk loop, a hub of ways out where a failed try comes back without that way, fights with Fate's Mercy, and a companion who may die.

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
| Offline version | `questbound-v27` |
| Save format | version 17 (unchanged: the new scene only adds story flags) |
| Tests | 375 passing: rules 88, combat 62, saves 61, story 17, levels 12, dungeon 57, spells 34, classes 44 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–3 |
| Story | Chapter 1 complete; Chapter 2 beats 1–3 written (it ends on "Take the barrow road north, past the Old Ford, to the Choir's camp at Cairnfield. (The rest of Chapter 2 is still being written.)") |

Built in the last session (Rob took the recommended option on every question: the scene as outlined; a 10 gold fine; Fen sold or left behind escapes and turns up later, sour; and Varrow's hanging moment after the fight):
- **Chapter 2, beat 3** (`story/act-1/ch2-stocks.ink`, knot `ch2_stocks`): Morwen's breakfast now ends on "Head out into the market square". STORY.md lists every choice, check and flag. Every way through ends with `heard_of_cairnfield`.
- **Who Fen is with afterwards:** freed by any means, he's in the party (`fen_freed`). Sold (`fen_sold`) or left behind (`fen_left_behind`), he isn't, and the Old Ford is where he should turn up again.
- **New people** in `data/campaign/people.js`: `tibb` (Old Tibb, the watchman), and `gaunt` and `hunter` drawn with their battle sprites (`sprite: 'bandit-captain'`, `'bandit'`).
- **The hunters' fight** (`stocks-hunters`) now names its captain Mercy Gaunt. Parry names the foe too: the attack text says "Mercy Gaunt can Parry", and the log "(a reaction: AC 17 against this attack)".
- **New story commands** (`externals.js`, declared in `story/externals.ink`): `can_pay(gp)` and `pay(gp)`, for fines and bribes. Tag the choice `#pay:10` and the card shows "Pay · 10 GP" (`tags.js`, `adventure-screen.js`). The DM note is `coinsPaid` in `dm-voice.js`.
- Knock now has a scene (the stocks' padlock), so it's off the "waiting" list in `tests/spells-tests.js`; only Invisibility (the Choir's camp) and Guidance are left there.

## 4. The next slice: the Old Ford

Recommended next: **Chapter 2, beat 5** (STORY.md): the Old Ford at night. The dead cross the ford carrying capstones from the barrows; the watch-post there is under siege, and the objective is to keep three soldiers alive. Check the scope with Rob first, and propose:
- **The road north** from Bramblegate to the ford (no region map yet: a short scene, as the quarry road was), arriving at dusk.
- **Fen's return** if you sold him or left him (`fen_sold`, `fen_left_behind`): he slipped Gaunt's ropes on the road north and turns up at the ford, sour. He can still join, starting with low approval (a negative `approve` after `join_party`). There's always room: Odda is the only other companion so far.
- **The siege fight:** this needs engine work. Fights have no allies yet who aren't companions. Propose the watch soldiers as SRD 5.2.1 **Guards** on the grid, on the party's side and played by the game (like a companion on Hold), who don't count towards the encounter budget; foes target them too. The fight's result records how many lived. Monsters: Zombies and a Ghoul (both in `data/srd/monsters.js` already), sized Moderate for a level 3 party of three (or two, if Fen isn't back).
- **The clue:** the dead are unsealing the old oath-graves one by one, and each was a ward. Saving the soldiers raises Regency approval (there's no faction standing yet: a flag will do), and Varrow's watch holds the outer cairns in Chapter 3.
- **Losing is Fate's Mercy**, as the other Chapter 1–2 fights are.

Questions to put to Rob:
- Do the soldiers fight (Guards played by the game) or just need protecting? Recommended: they fight, so the player can see them hold the line.
- What does keeping fewer than three alive change? Recommended: all three alive earns the Regency flag and Varrow's help in Chapter 3; one or two still earns his thanks; none means the post falls and you carry the news back.
- Is beat 4 (the Bond's return) built with the ford, or as its own slice? The Sibling Bond's letter was posted to the Old Ford's watch-post, but the Mentor's letter, the Rival and the Debt's Free League factor could each come anywhere on the road. Recommended: its own slice, straight after this one.

Smaller follow-ups noted along the way (each could be its own slice):
- **Raising the dead:** if Odda dies in the ossuary or Fen at the stocks (both rare), the temple "keeps them until they can be raised". Raising at a temple (at a price) isn't built; debug mode's Raise works meanwhile.
- **Level 4:** the Ability Score Improvement or a feat on the level-up screen (the rules data goes to level 3 so far; `companionCharacter` caps companions at the rules data's top level).
- **Owing Nettle:** leaving Fen to the hunters with Nettle's goblins at the mill sets `owe_nettle`. Nothing collects on it yet.
- **Gaunt and the hunters** may come back: `gaunt_spared` (run out of town), `hunters_backed_off`, `hunters_faced_down` and `hunters_fled` all leave her alive and angry.
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight. The story itself is fine: Fate's Mercy scenes call `long_rest()`, which restores the party.
- The stocks tile (DawnLike decor at column 0, row 11) is a wooden post with a crossbar, and reads more like a grave marker on the grid; a better pillory may be worth drawing from the sheets.
- A DC 12 or 13 check shows as "Easy" on its card (the ladder is Easy 10, Medium 15). That's working as designed, but Rob may want to know.

## 5. How the companion code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...} }` changes.
  - `tactic`, `likes`, `dislikes`.
  - The `tactics` list.
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`.
  - `companionCharacter(id, level)` builds their sheet at the hero's level; it is never stored.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id. Scene casting uses it too (`sceneCastCost(memberGame(…), spell)`).
  - Also here: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `approve` (it does nothing for a companion who isn't with the hero), `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 2,950 lines):
  - **Combatants:** the hero (`id 'hero'`), companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`), and foes (`side 'enemy'`, with a `name` from the encounter if it has its own, such as Mother Nettle or Mercy Gaunt).
  - **Telling them apart:** `isHero(c)` means the hero themselves; `c.side === 'hero'` means anyone in the party.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`, `partyCombatants`, `companionCombatants`.
  - **Where the party starts:** `freeSquareNear` in `startBattle`: the free squares nearest the hero by `squaresBetween` (diagonals count 1), then top to bottom, then left to right.
  - **Actor versions of hero functions:** `attackPreview(game, optionId, targetId, actorId)`, and `useAction(game, option, { actor })` to spend a companion's slots (it also ends that caster's Sanctuary).
  - **Companion actions:** `companionAttack` (Spiritual Weapon too), `companionCastOn` (wards), `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Falling and losing:** `healCombatant` and `stabilise`; `companionHit` and `companionDeathSave`; `companionDies` (clears effects on them); `checkLost`.
  - **Foes' targets:** `chooseTarget(game, monster)`.
  - **Old saves:** `battle.sneakAttackTurn` can be an old string or an `{ id: 'round:turn' }` object. `vexed` effects carry `byId`, and older ones without it count as the hero's.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. Its order: rescue the fallen (heal, Spare the Dying, Medicine), then free the Paralyzed (Lesser Restoration), then Support's patch-up of anyone Bloodied, then a Concentration spell in a real fight, then a Spiritual Weapon strike, then fight by tactic (an Aggressive Rogue Dashes to reach a foe), then Cunning Action (Hide, or Disengage when Bloodied beside a foe). Allies who aren't companions (the Old Ford's soldiers) would need their own small version of this.
- `js/engine/combat/attacks.js`: `heroAttackOptions(game)` works on a companion's `memberGame` too (`company` is false there). The Light extra attack checks `game.actorId`.
- **Screens:** `battle-screen.js`, `dungeon-map.js` (the party a step behind the hero), `sheet-panel.js` (`partyBlock`, `castBlock`), `debug-panel.js` (`partySection`: Join, Leave, Raise; `practiceSection`; actions in `js/main.js`).
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `companion_alive`, `companion_can_cast`, `companion_cast`, `can_pay` and `pay` are in `js/engine/story/externals.js`, declared in `story/externals.ink`. An Ink function can call them too (`free_fen()` at the bottom of `ch2-stocks.ink`).

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

- **Which page:** monster checks (Ghouls, Parry, the hunters), the encounter-budget check and the Chapter 1–2 scene playthroughs are in `tests/dungeon-tests.js`:
  - Chapter 1: `warrenFight`, `scriptedThen`, `winFight`.
  - Chapter 2, under the mill: `chapter2(seed, { character, flags })` jumps to `ch2_morning`; `downToTheOssuary(game)`, `settleGhouls(game, won)`.
  - Chapter 2, the stocks: `atTheStocks(seed, { character, flags, odda, gold })` jumps to `ch2_stocks` with Odda and 25 gold; `huntersArrive(game)`, `settleHunters(game, won)`, and `toCairnfield(game)` checks a path ended properly. `rogue3` and `knockWizard` are level 3 heroes with Thieves' Tools and Knock.
  - Party sizing, Resolve and the practice fight are in `tests/combat-tests.js` (`withParty`, `partyFight`). Companion fight checks, Lesser Restoration and a Paralyzed Odda are in `tests/classes-tests.js` (`fightWith(character, encounter, seed, { party, setUp })`; `playTurn(game, id)` plays one companion turn right now; `paralyse(game, id)`); saves and migrations in `tests/saves-tests.js`; the Ink bridge, the speaker check and the story-text lint in `tests/story-tests.js`.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice in order (any size: a d20 face, then a d4 for damage…), set `game.rng = scriptedThen([...faces], seed)`. Bless adds a d4 roll before each blessed save's d20. A Fighter's Tactical Mind can turn a failed check into a success with a d10, so test a failed check with a non-Fighter.
- **Party start squares:** companions take the free squares nearest the hero, in join order, sorted by distance (a diagonal counts as one square), then top to bottom, then left to right. In the ossuary (hero at (3, 1)), Odda starts in the doorway at (3, 0). In the mill fight (hero at (3, 1)), Odda alone starts at (2, 1); Odda and Fen at (2, 1) and (4, 1). At the stocks (hero at (3, 5)), Odda starts at (2, 4) and Fen at (3, 4).
- **Initiative order:** Initiative is rolled in combatant order: the hero, the foes, then the companions. Tests often set `battle.order` and `battle.turn` by hand afterwards.
- **Loading modules by hand:** to `import()` game modules in the Browser pane for debugging, first navigate to a fresh page, such as `/tests/combat.html`. A page that loaded the old code keeps it cached, and the versions mix.

## 7. Traps learned the hard way

- **Editing files:**
  - The Edit tool works well on these files (LF line endings).
  - For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run `perl replace.pl target spec` (the script is in the memory note "Shell editing traps"; copy it into your scratchpad).
  - Avoid shell heredocs for anything long: a heredoc of test code failed with "unexpected EOF", and quotes have broken files before. Write files with the Write tool; `sed -i` with simple line-numbered substitutions is fine.
- **Ink:** an inline condition keeps the space after its colon. Write `word{cond:, more}`, not `word{ cond: , more}` (which prints "word , more"); a story test fails on the second. Ink choices go behind conditions as `* {cond} [Text]`, not inside `{ … }` blocks. A story function that calls story commands (like `free_fen()`) is fine.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; stat blocks run together, e.g. `GhoulGhoulMedium Undead`). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it. The Guard stat block will be needed for the Old Ford.
- **Picking DawnLike sprites:** the sheets are tiny. A PowerShell script with `System.Drawing` can enlarge a sheet with nearest-neighbour scaling and label each square "col,row"; then Read the PNG.
- **Playing on screen:**
  - **Save slots:** slot 1 holds Rob's old test game (Juniper) on the port 8000 server. On the title screen, the first "New game" button is slot 1's, and it asks "Replace Juniper Tinderbell's save?" (answer "Keep it"). Slot 2's "New game" is the second one. Use slot 2 or 3, and delete the save afterwards (debug: Reset save, then "Delete it"). Each port is a separate browser origin with its own saves.
  - In the Browser pane, the debug panel covers the page, so close it (the Debug button) before tapping choices.
  - **Getting to a scene:** debug's **Set level** walks through the level-up screens (take the fixed Hit Points, pick the subclass, "Become level N"), **Join** adds Odda or Fen, **Add flag** sets story flags, and **Jump** reaches any knot (`ch2_stocks` starts Fen's scene). **Practice fight** starts any encounter with the party as it is, and puts everyone back afterwards.
  - **Ending a fight quickly:** edit the save in IndexedDB (`questbound` → `slots`, key = slot number): set the foes' `hp` in `game.battle.combatants` to 1, `store.put(record)` with no key (the store has in-line keys), reload, Continue the slot, and finish them off. Debug's **Force next d20** sets the next roll, Initiative included.
  - The battle screen's log keeps only the last 40 lines; read the whole fight from the save in IndexedDB (`game.battle.log`).
  - There's no debug control for a companion's Hit Points: edit the slot's record (`game.party[i].hp`) and reload.
  - **When the Browser pane is hidden:** `computer` clicks can land at half the coordinates, so tap buttons with the JavaScript tool (choice cards are `button.choice-card`) and tap the grid by dispatching a click on `canvas.battle-grid` at the square's centre. Screenshots worked while hidden this session. A walk on the grid waits on animation frames, which a hidden pane never delivers, so the replay stalls ("Mercy Gaunt's turn" and nothing more), but the fight is decided and saved: reload and press Continue.
  - A button list from the JavaScript tool includes hidden ones, such as "Update ready — tap to reload": check `offsetParent` before believing it's on screen (the debug toggle is `position: fixed`, so its `offsetParent` is null even when it's showing).
