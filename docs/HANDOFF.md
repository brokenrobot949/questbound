# Handoff: starting the next slice

Written on Oct 10, 2026, at the end of the session that built Weapon Mastery, the Rogue, Hide,
and Companions I. Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.**
- `docs/DESIGN.md`: the source of truth. The parts most relevant to the next slice:
  - Rules and Progression: the Cleric, the Rogue, and how spells work.
  - Combat: Weapon Mastery, Sight, walls and hiding.
  - Companions: "How companions work so far".
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
| Offline version | `questbound-v22` |
| Save format | version 17 (16 added a Fighter's Weapon Mastery, 17 the party) |
| Tests | 327 passing: rules 88, combat 58, saves 61, story 16, levels 12, dungeon 32, spells 33, classes 27 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–3 |
| Story | Chapter 1 complete; Chapter 2 not written |

Built in the last session, in order:
1. **Weapon Mastery** for Fighters (3) and Rogues (2):
   - Vex, Sap, Slow, Topple, Graze and Nick all work.
   - So does the Light property's extra attack with a second Light weapon.
   - Data: `data/srd/weapon-masteries.js`.
2. **The Rogue**, levels 1–3:
   - Expertise, Sneak Attack, Thieves' Cant, Cunning Action and Steady Aim; the Thief subclass.
   - Thieves' Tools checks (`check("thieves-tools", 15)`).
   - Sorael Thornvale, the Quick Start Rogue.
   - Three Rogue scene choices: the postern lock, the chalk marks, the miller's strongbox.
3. **Hide and sight lines:**
   - `lineBlock` in `js/engine/combat/grid.js`: walls block sight and attacks, obstacles block sight only.
   - The Hide action, and blue squares on the grid where no foe can see you.
   - Foes search for a hidden hero.
   - Noisy armour gives Disadvantage on Stealth.
4. **Companions I:**
   - Odda (dwarf Cleric) and Fen (halfling Rogue) join through `join_party(id)` in Ink, or through debug.
   - They act on their own with a tactic (Aggressive, Defensive, Support, Hold), shown in the Party section of the Sheet.
   - They make death saves and rescue the fallen; foes target the nearest party member.
   - The fight is lost only when nobody is left standing.

## 4. The next slice: Companions II, your magic on your friends

Recommended last session. Today a hero's healing spells, wards and potions only go on the hero themselves. Code comments say "until companions join the fights" (`js/engine/combat/attacks.js` near `TARGETING`, `upcastHelps` in `js/engine/character/spells.js`, DESIGN.md "How spells work").

What it should cover (check the scope with Rob first):
- **Healing an ally in a fight:**
  - Cure Wounds (touch, 5 ft) and Healing Word (60 ft) on any party member in range.
  - Healing a companion at 0 Hit Points brings them to.
  - Use `healCombatant(game, target, amount)` in `battle.js`, which already handles the fallen.
- **Potion of Healing on a friend:** as a Bonus Action, you can give it to a creature within 5 feet (SRD).
- **Wards on allies:**
  - **Bless:** up to 3 creatures within 30 ft.
  - **Sanctuary:** 1 creature within 30 ft.
  - **Shield of Faith:** 1 creature within 60 ft.
  - Bless needs `blessing()` (now hero-only) to also cover companions' attack rolls and saves. Use `partySave()` in battle.js for their saves.
  - The Sanctuary check in `performAttack` uses `isHero(target)`.
  - Shield of Faith's AC already reads effects by combatant id (`acOf`).
- **Spells with extra targets:** a higher slot adds a target to Bless, Aid and Hold Person. `upcastHelps` should start counting those once there's someone to take them.
- **Out of fights:** the Sheet's "Cast a spell on yourself" (`castBlock` in `js/engine/ui/sheet-panel.js`, `castSelfSpell` / `selfSpellsToCast` in `js/engine/character/spell-effects.js`) could heal a companion too.
- **Maybe:**
  - Odda casting Bless or Shield of Faith herself. That needs Concentration per caster: `battle.concentration` and effects with `concentration: true` are the hero's only.
  - Fen using Cunning Action.
  - The Help action.

Questions to put to Rob before building:
1. **Aiming:** how should a spell aimed at a friend be aimed? Recommended: a list of the party (you, Odda, Fen) like the foe list, each greyed out when out of range, plus tapping them on the grid.
2. **Bless:** should it take the nearest friends automatically, as Bane does with foes? Or should the player pick up to three?
3. **Scope:** should Odda's own Concentration spells (Bless, Shield of Faith, Spiritual Weapon) be part of this slice or the next? It's the bigger refactor.

The other candidate for "next" is **Chapter 2** (STORY.md, Act I). That covers:
- Lark's rescue, and Odda and Fen joining through the story.
- New monsters: Ghouls, Bandits, a Bandit Captain.
- Level 4: the Ability Score Improvement or feat.
- Fights sized for a party.

Rob asked for the companions work first.

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
- `js/engine/combat/battle.js` (about 2,400 lines):
  - **Combatants:** the hero (`id 'hero'`), companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`), and foes (`side 'enemy'`).
  - **Telling them apart:** `isHero(c)` means the hero themselves; `c.side === 'hero'` means anyone in the party.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`, `partyCombatants`, `companionCombatants`.
  - **Actor versions of hero functions:** `attackPreview(game, optionId, targetId, actorId)`, and `useAction(game, option, { actor })` to spend a companion's slots.
  - **Companion actions:** `companionAttack`, `companionHeal`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Falling and losing:** `healCombatant` and `stabilise`; `companionHit` and `companionDeathSave`; `checkLost`.
  - **Foes' targets:** `chooseTarget(game, monster)`.
  - **Old saves:** two fields still have to read older saves. `battle.sneakAttackTurn` can be an old string or an `{ id: 'round:turn' }` object. `vexed` effects carry `byId`, and older ones without it count as the hero's.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. Its order: rescue the fallen (heal, Spare the Dying, Medicine), then Support's patch-up of anyone Bloodied, then fight by tactic.
- `js/engine/combat/attacks.js`: `heroAttackOptions(game)` works on a companion's `memberGame` too. The Light extra attack checks `game.actorId`.
- **Screens:**
  - `js/engine/ui/battle-screen.js` draws companions, shows their Hit Points in the status line, and marks their state in the turn order.
  - `js/engine/ui/sheet-panel.js` (`partyBlock`) is the Party section.
  - `js/engine/ui/debug-panel.js` (`partySection`) has Join, Leave and Raise; their actions live in `js/main.js`.
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

- **Which page:** companion fight checks are in `tests/combat-tests.js` (`partyFight` sets Initiative with `scriptedThen`). Party rules and companion sheets are in `tests/classes-tests.js`; saves and migrations in `tests/saves-tests.js`.
- **Initiative order:** Initiative is rolled in combatant order: the hero, the foes, then the companions.
- **Loading modules by hand:** to `import()` game modules in the Browser pane for debugging, first navigate to a fresh page, such as `/tests/combat.html`. A page that loaded the old code keeps it cached, and the versions mix.

## 7. Traps learned the hard way

- **Editing files:**
  - The Edit tool works well on these files (LF line endings).
  - Avoid shell heredocs for JavaScript edits: quotes have broken files before (see the memory note "Shell editing traps").
  - Small `perl -0pi -e` substitutions are fine when escaped carefully.
- **SRD rules text:** Read and WebFetch can't quote the SRD. The last session's extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Playing on screen:**
  - In the Browser pane, the debug panel covers the page, so close it (the Debug button) before tapping choices.
  - **Jump** in the debug panel reaches any scene.
  - **Force next d20** sets the next roll, Initiative included.
- **Test saves:** slot 1 holds Rob's old test game (Juniper). Use slot 2 or 3 for testing, and delete the save afterwards (debug: Reset save).
