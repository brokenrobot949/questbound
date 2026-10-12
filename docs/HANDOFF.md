# Handoff: starting the next slice

Written on Oct 11, 2026, at the end of the session that built level 4 (the Ability Score
Improvement or a feat, for heroes and companions), the Resistance cantrip, and then Chapter 2,
beat 7: the Choir's camp at Cairnfield. Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase.
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - Rules and Progression: "Level 4: the Ability Score Improvement or a feat", the Cleric (Resistance).
  - Combat: "Allies who aren't companions", "Encounter design" (the hymn, and foes not casting spells yet).
  - Companions: "How companions work so far" (their level 4).
- `docs/STORY.md`: Chapter 2. Beats 1 to 5 and 7 are written up as built. Beat 6 (the temple's secret) has a **When** note: it comes after Cairnfield, or on the visit back to Bramblegate before it if the post fell. Beat 7 ends with notes **For Chapter 3**. Beat 8 has notes on level 4.
- `story/act-1/ch2-cairnfield.ink`: the last scene built, as a pattern: a travel stretch with a camp (a long rest and a talk loop), an overlook, several ways in (a check with or without a companion's help, a spell, a check helped by an item, a fight), a quiet success that can slip away or strike with surprise, a fight, a prisoner's fate, and Fate's Mercy.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it.
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage: your sessions by `gameId`, and the scene entries you added at the end of `scenes`).
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js. A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`, as `levelFeats` did.

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v30` |
| Save format | version 18 (the hero's `levelFeats`; a level-up's `feat`, `cantrips` and `masteries`). Cairnfield added only flags. |
| Tests | 417 passing: rules 88, combat 68, saves 66, story 17, levels 22, dungeon 76, spells 34, classes 46 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–4 (heroes stop at 2,700 XP) |
| Story | Chapter 1 complete; Chapter 2 beats 1–5 and 7 written. The Old Ford now runs straight on into Cairnfield, which ends on "Go back to Bramblegate and rally help before the dark of the moon, three nights away. (The rest of Chapter 2 is still being written.)", or, if the Old Ford fell, "Make camp near Cairnfield, and go down into the Kings' Barrow before the dark of the moon." |

Built in the last session, part 2: **Cairnfield** (Rob's choices: a Moderate fight with Rhosyn's hymn; her spells left out until foes can cast; failing a quiet way in is the fight; after a won fight a young acolyte yields):
- **The scene** (`story/act-1/ch2-cairnfield.ink`, knot `ch2_cairnfield`): the Old Ford's `road_on` runs into it. STORY.md, beat 7, lists every choice, check and flag. If `ford_fell`, a short visit to Captain Varrow comes first (`news_home`): **that's where beat 6 slots in on that path**.
- **The fight** (`cairnfield-camp` in `data/campaign/encounters.js`): Sister Rhosyn (`cultist-fanatic`, new in `data/srd/monsters.js`, with a `variant` note on her missing spells), four "Choir Acolyte"s and two Zombies, on a moor map with barrow mounds, opened barrows, tents and a campfire (new tiles `barrow`, `open-barrow`, `tent`, `campfire` and sheets `map`, `effect` in `data/campaign/sprites.js`; Rhosyn's sprite is the red-hooded figure on the Player sheet, column 7, row 3). A hymn raises a third Zombie on round 3 (`hymn.from: 'the opened barrow'`, new).
- **Engine tweaks** (`battle.js`): foes who share a given name are numbered ("Choir Acolyte 1"); the hymn's lines name where the dead rise from, and its objective says "a second" or "another".
- **New people:** `rhosyn` (sprite) and `tobin` (drawn like a hero, in grey) in `people.js`.
- **Invisibility** has its scene now (removed from `WAITING` in `tests/spells-tests.js`).
- **Old ends pick up** (`data/campaign/story-continues.js`, `pickUpOldEnd` in `story-runner.js`, called from `loadGame`): a save that stopped where an older version of the story ended "for now" carries on from where the story goes today. **Whenever a slice turns a `-> END` into the next scene, add a line there** (the knot the story stopped in, and where it goes now). Cairnfield's `road_back` ends the story today, so it isn't listed yet: list `ch2_cairnfield` when beat 6 or 8 follows it.

Built in the last session, part 1: **level 4** (Rob's choices: level 4 before Cairnfield; the Ability Score Improvement plus the Origin feats and, for Fighters, Fighting Styles, with Grappler later; Odda and Fen take +1 main score and +1 Constitution; beat 6 after Cairnfield):
- **Level 4 data** (`data/srd/classes.js`): every class's level 4 row has the `ability-score-improvement` feature. Wizard and Cleric: 4 cantrips, 7 prepared, slots [4, 3]. Fighter: Second Wind 3, Weapon Mastery 4. Rogue: Sneak Attack 2d6.
- **The feat** (`data/srd/feats.js`): the Ability Score Improvement is a General feat (`prerequisiteLevel: 4`, `repeatable`, `scoreIncrease: { points: 2, perAbility: 2 }`). Every feat has a `summary` line for the level-up cards.
- **On the character:** `levelFeats: [{ level, id, increases?, skills? }]` (`sheet.js` header). `abilityScore` adds the increases; `characterFeats` lists them ("Level 4"); `skillProficiency` counts Skilled's skills; `featLevels(character)` and `qualifiesForFeat(character, feat, level)` are in sheet.js. A Magic Initiate taken at level 4 keeps its spells in `magicInitiate` with `source: 'level-4'` (`levelSource(level)` in spells.js); `magicInitiateSources` and `magicInitiateLists` know about it.
- **The rules checker** (`validate.js`, `levelFeatProblems`): one feat at each `featLevels` level, one the hero qualifies for, not doubled unless repeatable, the Ability Score Improvement's points right, and no score above 20 with the raises.
- **The level-up** (`js/engine/character/level-up.js`): the draft gains `feat`, `cantrips`, `masteries`. `levelUpPlan` gains `feat` ({ choices, increase, skills, initiate }), `masteries`, `cantrips`, `more` (features that grow) and `hitPoints.conGain`. Choices: `chooseFeat`, `adjustFeatIncrease`, `canAdjustIncrease`, `toggleFeatSkill`, `setFeatList`, `setFeatAbility`, `toggleFeatCantrip`, `chooseFeatSpell`, `toggleLevelUpMastery`, and `toggleLevelUpSpell(game, 'cantrips', id)`. A spell the hero would have twice is refused (`spellTakenBy` in creation.js, which now counts domain spells as `class-domain`). `lowerLevel` (debug) takes it all back.
- **The screen** (`level-up-screen.js`): feat cards, a + and − per score, Skilled's chips, Magic Initiate's list, ability and spells, Weapon Mastery chips, the new cantrip, and "what grows". The DM has a level-up line for each class (`levelUpVoice` in dm-voice.js).
- **Companions** (`data/campaign/companions.js`): `levels[4]` with `levelFeats`, and Odda's `cantrips` (Mending) and `prepared` (Detect Magic). `companionCharacter` now caps at the class data's top level (no more `TOP_LEVEL`) and applies `cantrips` and `levelFeats` changes.
- **Resistance** (`data/srd/spells.js`; `battle.js`: the `resisting` ward, `resistedType`, `resistanceCut`): a touch cantrip, Concentration; the game picks the damage type most foes deal, and cuts 1d4 off that type once a turn (`usedTurn`). The turn order shows "(Resistance)".

## 4. The next slice

**Chapter 2, beat 6: the temple's secret, and rallying help in Bramblegate.** (STORY.md, beat 6.) After Cairnfield the aim is "Go back to Bramblegate and rally help before the dark of the moon". Prior Crane's ledger shows a payment from "the Choir of Ash": he sold the temple's map of the Kings' Barrow to clear the temple's debts to Free League moneylenders. Choices: expose him to the reeve (Justice), let Odda decide (she asks for a public confession: Faith or Kinship), blackmail him (Wealth), or help him make it right (he gives the barrow's **ward-word**, which Chapter 3's barrow gate uses). Odda's approval swings hard on it, and it's her personal hook.
- **Where it goes:** a new scene at the end of `ch2_cairnfield.road_back` (held path) back to Bramblegate. On the `ford_fell` path it belongs in `ch2_cairnfield.news_home`, before the party goes north again; then Cairnfield's aim is already right ("Make camp near Cairnfield…").
- **Rallying help** (STORY.md, Chapter 3, beat 1, "The allies you earned turn up"): Varrow's watch if you saved the Old Ford (`varrow_holds_cairns`, `regency_favour`), Nettle's goblins if you spared them (`goblins_spared`; `owe_nettle` is still uncollected), Crane's ward-word. Bramblegate is where those are asked for, so this slice could set them up.
- **Odda dead?** If Odda fell (at the ford or Cairnfield), she lies before the altar flame in this very temple: raising the dead isn't built yet, and her hook needs her. Ask Rob what happens then (the temple raises her for a price? Crane does it as penance?).
- **Tobin**, if sent to Varrow (`tobin_to_varrow`), is in the watch-house cells; if freed, he's on the road home to Ashby.
- Questions worth putting to Rob first: what Odda does if you expose Crane versus help him; whether rallying the allies is choices in this scene or happens off-screen in Chapter 3; and what happens to Odda's hook if she's dead.

Then **beat 8, the eve of the barrow** (a camp with companion conversations and a long rest), and Chapter 3.

Smaller follow-ups noted along the way (each could be its own slice):
- **Foe spellcasting** (for Chapter 3's chantry): the Cultist Fanatic's Command, Hold Person and Spiritual Weapon, used against the party. Rhosyn's `variant` note in `data/srd/monsters.js` says what's missing.
- **Cairnfield:** `rhosyn_lives` (slipped away, or Fate's Mercy) should make her the Fanatic in Chapter 3's chantry; `vesk_warned` could take away surprise at the barrow gate; `tobin_freed` could bring Tobin back with the barrow's back ways.
- **Level 4:** Magic Initiate's "Spell Change" (swap one of its spells on a level-up) and the Wizard's and Cleric's cantrip swap on a level-up aren't built. Skilled picks skills only (no tools yet). Grappler waits for grappling. Odda's AI never casts Resistance (she doesn't know it).
- **Allies:** Odda's spells (healing, Bless) don't reach the soldiers: her AI is for the party only. Allies die at 0 Hit Points with no death saves; Rob may want them to drop and be saveable instead.
- **Flags for later:** `regency_favour` and `varrow_holds_cairns` (Chapter 3, beat 1), `rival_went_ahead` (rescue), `league_deal`, `league_refused`, `league_wants_crowns`, `met_penhallow` (Act II), `mentor_warned` and `sibling_letter` (Act II's Bond slot), `knows_oath_wards`, `fen_returned`, `ford_fell` and `ford_abandoned`.
- **Raising the dead:** Odda or Fen can die at the ford (`odda_fell_at_the_ford`, `fen_fell_at_the_ford`) or at Cairnfield (`odda_fell_at_cairnfield`, `fen_fell_at_cairnfield`); raising at a temple isn't built. Debug mode's Raise works meanwhile.
- **Owing Nettle:** `owe_nettle` is still uncollected. **Gaunt** may come back (`gaunt_spared`, `hunters_backed_off`, `hunters_faced_down`, `hunters_fled`, `fen_sold`, `fen_left_behind`).
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight.
- The pixel font has no "−" (minus sign), so a negative modifier such as Dexterity 8 (−1) shows as "(_1)" in the score lists (creation and the level-up). Worth a look: a plain hyphen, or a font with the glyph.
- A DC 12 or 13 check shows as "Easy" on its card (the ladder is Easy 10, Medium 15). Working as designed, but Rob may want to know.

## 5. How the companion and ally code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...}, 4: {...} }` changes (`subclassId`, `cantrips`, `prepared`, `levelFeats`).
  - `tactic`, `likes`, `dislikes`; the `tactics` list.
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`.
  - `companionCharacter(id, level)` builds their sheet at the hero's level (never stored), capped at the class data's top level.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id.
  - Also: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `approve`, `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 3,050 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`).
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)` (hero or companion: they have character sheets); `c.ally`; `c.side === 'hero'`. Foes and allies use their monster's stat block.
  - **Lists:** `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`.
  - **Wards** (`WARDS`): `blessed`, `sanctuary`, `shield-of-faith`, `resisting`; `castWard`; damage to the party goes through `takeHit` (the hero) and `companionHit`, both of which call `resistanceCut` first.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn`; `friendsFor` and `forAllies` (healing, potions and Lesser Restoration reach them; wards don't); `objectiveText`; `finishBattle` records `lastBattle.alliesAlive`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. It looks only at the party, never at allies.
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `companion_alive`, `companion_can_cast`, `companion_cast`, `can_pay`, `pay`, `allies_standing`, `ally_standing`, `has_bond`, `bond_name` are in `js/engine/story/externals.js`, declared in `story/externals.ink`.

## 6. Running the tests

The test pages run in the browser; there is no Node or Python on Rob's PC. Start the preview server named `questbound` (`.claude/launch.json` runs `tools/serve.ps1`; it uses port 8000 if it's free). Then, in the Browser pane on that address (a test page such as `/tests/levels.html`), define this with the JavaScript tool:

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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds). Run it from any test page except `/tests/saves.html` (such as `/tests/levels.html`): the save checks run twice at once, as the top page and in a frame, fight over their test database ("The database connection is closing").

- **Cairnfield:** `tests/dungeon-tests.js`, at the end: `atCairnfield(seed, { character, flags, odda, fen, items })` jumps to `ch2_cairnfield`; `upToTheRidge(game)` walks to the overlook (by way of Varrow if `ford_fell`); `settleCamp(game, start, { won, fled, setUp })` settles the fight from the choice starting `start` (fled: foe ids that ran, such as `cultist-2`). Sneak with a hero who isn't in Chain Mail (Stealth Disadvantage), and fail checks with a non-Fighter (Tactical Mind).
- **Which page:** level-up checks (levels 2–4, feats, the Quick Start heroes at level 3 as `wren3`, `juniper3`, `posy3`, `sorael3`, and `wren4(levelFeats)`) are in `tests/level-up-tests.js`. Companions at every level, Resistance and the Cleric's fight spells are in `tests/classes-tests.js`. Monster checks, the encounter budget and the Chapter 1–2 scene playthroughs are in `tests/dungeon-tests.js` (`chapter2`, `atTheStocks`, `toTheFord(seed, { character, flags, odda, fen, gold })`, `readyAtTheFord`, `settleFord`, `readTheStone`). Allies and deep water: `tests/combat-tests.js` (`fordFight`). Saves and migrations: `tests/saves-tests.js`. The Ink bridge and story-text lint: `tests/story-tests.js`.
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice, set `game.rng = scriptedThen([...faces], seed)`. A Fighter's Tactical Mind can turn a failed check into a success, so test a failed check with a non-Fighter.
- **Loading modules by hand:** navigate to a fresh page first (such as `/tests/combat.html`); a page that loaded old code keeps it cached.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well (LF line endings). For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run `perl replace.pl target spec` (the script is in the memory note "Shell editing traps"). Shell heredocs break on text with quotes and ’: write spec files with the Write tool.
- **Ink:** write `word{cond:, more}` (no space before the comma); choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}` (join with `+`); a line where someone speaks ends with `#speaker:id`.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; class tables are garbled, with some digits as letters: `j` is 4, `k` is 5). Feats are around line 13100, spells by name (`ResistanceAbjuration Cantrip`). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling in a PowerShell `System.Drawing` script, label each square, then Read the PNG.
- **Playing on screen:**
  - **Save slots:** on the port 8000 server, slot 1 holds Rob's old test game (Juniper, save version 15): never Continue it. On the title screen, the first "New game" is slot 1's; use slot 2's.
  - **When the Browser pane is hidden:** tap buttons with the JavaScript tool (`[data-key="…"]` works for level-up controls: `hp-fixed`, `feat-ability-score-improvement`, `increase-wisdom1`, `level-up-cantrips-resistance`, `mastery-longbow`, `finish`); the debug panel's toggle is `button.debug-toggle` (it's fixed-position, so `offsetParent` is null). A walk on the grid waits on animation frames: press Skip, or reload and Continue.
  - **Getting to a scene:** debug's **Set level** walks through every level-up screen (fixed Hit Points, the subclass, the level 4 feat), **Join** adds Odda or Fen, **Add flag** sets story flags, **Jump** reaches any knot, and **Fight** starts a practice fight.
  - **Ending a fight quickly:** edit the save in IndexedDB (`questbound` → `slots`, key = slot number), set the foes' `hp` to 0 except one at 1 (move it beside the hero with its `pos`; set `escaped: true` on one to test a foe who ran), `store.put(record)` with no key, reload, Continue, and finish that one off (debug's Force next d20 makes the hit sure).
  - **The playtest log:** clean your entries from a test page such as `/tests/levels.html`, not the game page: the game keeps the log in memory and writes its copy back.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP: Moderate means more than the Low budget and up to the Moderate one (650 XP is Moderate for three level 3 characters: Low 450, Moderate 675; 700 would be High). The hymn's risen dead aren't counted.
