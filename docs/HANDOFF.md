# Handoff: starting the next slice

Written on Oct 10, 2026, at the end of the session that built Companions II (the hero's
spells and potions on friends) and Companions III (Odda's Concentration spells, Fen's Cunning
Action, the Help action). Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.**
- `docs/DESIGN.md`: the source of truth. The parts most relevant to the next slice:
  - Story: the campaign roadmap; and `docs/STORY.md`, Chapter 2 (Act I).
  - Companions: "How companions work so far" and "Your spells and potions on your companions".
  - Combat: Encounter design (the 2024 encounter budget).
  - Rules and Progression: Experience and levels, and the level-up screen (level 4 brings the Ability Score Improvement or a feat).
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
| Offline version | `questbound-v24` |
| Save format | version 17 (unchanged by Companions II and III) |
| Tests | 342 passing: rules 88, combat 58, saves 61, story 16, levels 12, dungeon 32, spells 34, classes 41 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–3 |
| Story | Chapter 1 complete; Chapter 2 not written |

Built in the last session, Companions II:
- **Aiming at friends:** spells that help have a `targets` field in `data/srd/spells.js`; `spellAim(spell)` in `js/engine/character/spells.js` turns it into `'self'` (False Life), `'friend'` (one of the party in range) or `'party'` (everyone in range: Bless, Aid). Fight options carry that as `targeting`, plus `company` (the hero has companions, so the button words mention friends).
- **In fights** (`js/engine/combat/battle.js`, "Spells and potions for the party"): `friendProblem`, `friendTargets`, `partyTargets`, `heroCastOn(game, optionId, targetId)` (`heroCastSelf` is the no-aim version), `castOnFriends`, `castHealing` (shared with Odda's healing), `preserveLife`, `castWard`, and `heroDrinkPotion(game, targetId)`.
- **Wards** (`blessed`, `sanctuary`, `shield-of-faith`) go on any party member's id. `blessing(game, c)` covers companions' attacks, saves and death saves; `breakSanctuary(game, c, why)` works for anyone.
- **Divine Spark** heals a companion only (the SRD says "another creature"); alone it's damage only. Rob chose this.
- **Preserve Life** shares its Hit Points among the Bloodied of the party in 30 feet: the fallen first, then the most hurt.
- **Potion of Healing:** with companions, a party list (drink, or give to a friend within 5 feet).
- **Between fights** (`js/engine/character/spell-effects.js`, renamed functions): `sheetSpells`, `sheetSpellProblem`, `castFromSheet(game, spellId, slot, targetId)`, `spellTargets`, `targetProblem`. The Sheet's "Cast a spell" has a chip per party member. `timePasses` ends companions' hour spells too ("Longstrider on Fen").
- **Screens:** `battle-screen.js` (party list under the spell, green frames, grid taps, potion panel), `sheet-panel.js` (chips; spells on each companion in the Party section).

Then Companions III (Rob took the recommended option on every question):
- **Concentration per caster** (battle.js): the hero's is `battle.concentration`, a companion's is `c.concentration` on their combatant; `concentrationOf(battle, c)`. Concentration effects carry `by` (the caster's id; none in older saves means the hero). `startConcentration(game, option, caster)`, `endConcentration(game, caster, why)`, `tidyConcentration(game)` (all casters), `concentrationCheck(game, c, damage)` (through `partySave`). `companionHit` makes the companion's save, and dropping to 0 or dying ends only their spells.
- **Spiritual Weapon per caster:** the effect's `target` is its caster; `spiritualWeapon(battle, casterId)`; `battleScene(game).weapons` is a list (`{ by, pos }`).
- **Odda's AI** (`companion-ai.js`): `realFight(game)` (foes standing worth at least the party's Low XP budget); `concentrate` opens with the tactic's spell (`concentrate` and `spellNote` in `data/campaign/companions.js` tactics) if she keeps a slot for healing; `weaponStrike` each turn. Casting goes through `companionCastOn(game, c, optionId, targetId)` and `companionAttack` (Spiritual Weapon).
- **Hiding for anyone in the party:** `hiddenOf(battle, id)`; `reveal(game, c, why)`; `searchForHidden` (a foe with nobody visible to fight looks for the nearest hidden one). Fen: `companionDash`, `companionDisengage`, `companionHide`, `companionHideProblem`; the AI's `slipAway` and the Dash in `fight`.
- **Help** (the hero's): `helpTargets`, `heroHelpProblem`, `heroHelp(game, targetId)`: distract a foe beside you (`helped` effect, by the helper, used up by an ally's next attack roll) or first aid (DC 10 Medicine) for a fallen companion beside you. On the battle screen under Other actions, with companions only.
- **Spare the Dying** has fight data now (`kind: 'stabilise'`): the hero casts it on a fallen companion within 15 feet. Offered only with companions.

## 4. The next slice: Chapter 2

Recommended next: **Chapter 2** (STORY.md, Act I). Check the scope with Rob first; it's big, so propose splitting it into slices, for example:
1. **Party-sized fights:** the encounter budget for the hero plus companions. Chapter 1's fights are built for one hero (a party of three at level 1 treats only the zombies as a real fight). The fight cards ("Fight · Low") and Resolve (`js/engine/combat/resolve.js`, `resolveLimit`) still size for one hero.
2. **New monsters** from the SRD: Ghouls (their claws Paralyze, which Lesser Restoration ends), Bandits, a Bandit Captain.
3. **Lark's rescue**, and Odda and Fen joining through the story (`join_party`), with approval moments.
4. **Level 4:** the Ability Score Improvement or a feat on the level-up screen (the data and screens go to level 3 so far; `companionCharacter` caps companions at the rules data's top level).

Questions to put to Rob:
- Which slice first? Recommended: party-sized fights and the new monsters, so the story scenes have fights to call.
- Should the fight card's difficulty and Resolve count companions? Recommended: yes, as the 2024 rules size a fight for the whole party.

Smaller follow-ups noted along the way (each could be its own slice):
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight. The story itself is fine: Fate's Mercy scenes call `long_rest()`, which restores the party.

## 5. How the companion code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...} }` changes.
  - `tactic`, `likes`, `dislikes`.
  - The `tactics` list.
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`.
  - `companionCharacter(id, level)` builds their sheet at the hero's level; it is never stored.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id.
  - Also here: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `approve`, `setTactic`, `partyProblems`.
- `js/engine/combat/battle.js` (about 2,800 lines):
  - **Combatants:** the hero (`id 'hero'`), companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`), and foes (`side 'enemy'`).
  - **Telling them apart:** `isHero(c)` means the hero themselves; `c.side === 'hero'` means anyone in the party.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`, `partyCombatants`, `companionCombatants`.
  - **Actor versions of hero functions:** `attackPreview(game, optionId, targetId, actorId)`, and `useAction(game, option, { actor })` to spend a companion's slots (it also ends that caster's Sanctuary).
  - **Companion actions:** `companionAttack` (Spiritual Weapon too), `companionCastOn` (wards), `companionHeal`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Falling and losing:** `healCombatant` and `stabilise`; `companionHit` and `companionDeathSave`; `companionDies` (clears effects on them); `checkLost`.
  - **Foes' targets:** `chooseTarget(game, monster)`.
  - **Old saves:** `battle.sneakAttackTurn` can be an old string or an `{ id: 'round:turn' }` object. `vexed` effects carry `byId`, and older ones without it count as the hero's.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. Its order: rescue the fallen (heal, Spare the Dying, Medicine), then Support's patch-up of anyone Bloodied, then a Concentration spell in a real fight, then a Spiritual Weapon strike, then fight by tactic (an Aggressive Rogue Dashes to reach a foe), then Cunning Action (Hide, or Disengage when Bloodied beside a foe).
- `js/engine/combat/attacks.js`: `heroAttackOptions(game)` works on a companion's `memberGame` too (`company` is false there). The Light extra attack checks `game.actorId`.
- **Screens:** `battle-screen.js`, `sheet-panel.js` (`partyBlock`, `castBlock`), `debug-panel.js` (`partySection`: Join, Leave, Raise; actions in `js/main.js`).
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

- **Which page:** companion fight checks are in `tests/combat-tests.js` (`partyFight` sets Initiative with `scriptedThen`). The hero's spells on companions, Odda's and Fen's choices, Help, party rules and companion sheets are in `tests/classes-tests.js` (`fightWith(character, encounter, seed, { party, setUp })`; `playTurn(game, id)` plays one companion turn right now); saves and migrations in `tests/saves-tests.js`.
- **Party start squares:** companions take the free squares nearest the hero, in join order, sorted by distance, then top to bottom, then left to right. In the mill (hero at 3, 1), Odda alone starts at (2, 1); Odda and Fen start at (2, 1) and (4, 1); Fen alone at (2, 1).
- **Initiative order:** Initiative is rolled in combatant order: the hero, the foes, then the companions.
- **Loading modules by hand:** to `import()` game modules in the Browser pane for debugging, first navigate to a fresh page, such as `/tests/combat.html`. A page that loaded the old code keeps it cached, and the versions mix.

## 7. Traps learned the hard way

- **Editing files:**
  - The Edit tool works well on these files (LF line endings).
  - For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run `perl replace.pl target spec` (the script is in the memory note "Shell editing traps"; copy it into your scratchpad).
  - Avoid shell heredocs for JavaScript edits: quotes have broken files before.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Playing on screen:**
  - In the Browser pane, the debug panel covers the page, so close it (the Debug button) before tapping choices.
  - **Jump** in the debug panel reaches any scene; `ch1_warren_depths.the_dead_turn` is a zombie fight, good for testing a party (a real fight for a level 1 party of three). `ch1_warren.hall_talk` offers Nettle's whole band (400 XP: real for level 2). Odda and Fen win the mill fight before a slow hero's turn comes.
  - The battle screen's log keeps only the last 40 lines; read the whole fight from the save in IndexedDB (`game.battle.log`).
  - **Force next d20** sets the next roll, Initiative included (the hero's is rolled first).
  - There's no debug control for a companion's Hit Points: to test healing between fights, edit the slot's record in IndexedDB (`questbound` → `slots`, key = slot number, `game.party[i].hp`) and reload.
  - **When the Browser pane is hidden**, screenshots come back blank or time out, and `computer` clicks land at half the coordinates. Read the page with `get_page_text` or the JavaScript tool, and tap the grid by dispatching a click on `canvas.battle-grid` at the square's centre.
- **Test saves:** slot 1 holds Rob's old test game (Juniper). Use slot 2 or 3 for testing, and delete the save afterwards (debug: Reset save).
