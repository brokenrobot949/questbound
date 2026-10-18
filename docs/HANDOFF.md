# Handoff: starting the next slice

Written on Oct 18, 2026, at the end of the session that built **Act I's Chapter 3 side content**:
The Barrow-Wives (three Specters on the Three Wives, each laid to rest by giving back a name, an
oath or a memory), the Specter's Life Drain and Incorporeal Movement, and the Cloak of
Protection. With it, all of Act I's content is built except road events (Phase 3). Start a new
Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I). Rob chose (Oct 17, 2026) to build Act I's side content before moving to Phase 3, then playtest Act I against the phase gate ("Act I plays in about 6 hours"). The side content is now built.
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - "Build Phases": Phase 2's gate, and Phase 3's scope (levels 5–10, region map and travel, contracts, faction standing, the Whisper; Barbarian, Paladin, Ranger, Warlock).
  - World and Exploration, "Towns": **"When side quests come"** (now with Chapter 3's: seen on the walk home, played on the last morning).
  - Rules and Progression, "Experience and levels": side quests' XP; XP still counts up past level 5 but gives no more levels.
  - Character Sheet and Inventory, "Equipment and loot": **Magic weapons**, and new: **Wondrous Items and Attunement** (the Cloak of Protection).
  - Combat, "Act I's side-quest monsters": new: the **Specter**, **Life Drain** (lowering a Hit Point maximum), **Incorporeal Movement**, and **A Barrow-Wife** with its simulation numbers.
  - "The Whisper": the flags so far (new: `named_sunniva`).
- `docs/STORY.md`: **Chapter 1, 2 and 3 side content** are written up as built.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (all five this session).
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save, or delete the slot in IndexedDB), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage). **Check which port the preview server got:** each port has its own saves and log. This session's server was on port 8000 (another chat had a server running in the folder too, on another port); in the Browser pane its storage started empty (no saves, a log of `{"version":1,"sessions":[],"scenes":[]}`) and was left that way. Rob's own browser has its own storage, with his test games in it.
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js (and `PRACTICE_KEEPS` in story-runner.js if a practice fight should put it back). A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`. (A new field inside `game.battle`, on a combatant, or on a companion's place in the party where missing means none, needs none of this: `rampaged`, `person`, `fallsHurt` and a companion's `hpMaxDrop` are such fields.) This session added `hpMaxDrop` to the game: save version 19.

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v43` (Chapter 3's side content) |
| Save format | version 19: `game.hpMaxDrop` (how far Life Drain has lowered the hero's Hit Point maximum, until a Long Rest; 0 for older saves) |
| Tests | 588 passing: rules 91, combat 92, saves 77, story 35, levels 28, dungeon 167, spells 43, classes 55 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–5 (heroes stop at level 5; XP still counts up) |
| Story | Act I is complete, with all three chapters' side content. Every path ends on the road south the day after the feast (`act1_end`). Only the road event (The Tollman's Lantern) waits, for Phase 3's travel. |

Built this session, Chapter 3's side content (Rob's choices, Oct 18, 2026: seen on the walk home, played on the last morning; Life Drain and Incorporeal Movement built, the Wight's Life Drain left out; a wrong step is a fight with that one barrow-wife; a name, an oath and a memory; a Cloak of Protection):
- **Story:** `story/act-1/ch3-barrow-wives.ink` (`side_barrow_wives`: Pike's ask or notice, the knoll, the ring of three barrows in any order, `east_barrow` (name), `west_barrow` (oath), `north_barrow` (memory), `at_rest(which)`, `fought(which, first)`, `the_fallen`, `mercy`, `farewell`; the Ink function `wife_done(which)`). `ch3_homecoming.the_road` now ends at the Old Ford with "Go on, south", and `the_three_wives` shows the Wives at dusk, then Bramblegate's roofs ("Walk the last of the way"). `act1-last-morning.ink` offers it ("Ask Warden Pike about the grey women on the Three Wives", or for a save that never saw them, "Read Warden Pike's new notice"), and `side_quests_left()` counts it. **Fixed in passing:** every side quest on the last morning used to return to the knot's top, and Ink doesn't count a return into the knot you're in as a new visit, so the morning's opening ("Marchbank has letters…") played again after each one. They now return to `act1_last_morning.back` (a short line, then the choices).
- **Flags:** `saw_the_barrow_wives`; `odda_at_the_three_wives`, `fen_at_the_three_wives`; `named_sunniva` (the shard: Whisper); `east_wife_rested` / `east_wife_destroyed`, `west_wife_rested` / `west_wife_destroyed`, `north_wife_rested` / `north_wife_destroyed`; `swore_the_oath` can now be set here too; `given_the_grey_cloak`; `odda_fell_at_the_three_wives`, `fen_fell_at_the_three_wives`; `barrow_wives_fates_mercy`; `barrow_wives_done`.
- **Data:** monster `specter` (`traits: ['incorporeal-movement']`, Life Drain with `drainsMax: true`); encounter `barrow-wife` (one Specter in a barrow chamber, Low for a level 5 party of three; Resolve is offered); quest `barrow-wives`; magic item `cloak-of-protection` (`kind: 'wondrous'`, `attunement`, `worn: { ac: 1, saves: 1 }`); sprite `specter` (Undead sheet row 6, column 0, at 0.8 alpha). No new people: the Wives can't speak.
- **Engine:**
  - `grid.js`: `reachableSquares(…, { incorporeal })` (through walls, obstacles and creatures as difficult terrain, cutting corners, never ending inside a wall or in someone's square, never into water); `passingThrough`; `stepCost`'s new `difficult` argument.
  - `battle.js`: `isIncorporeal`; `reachFor` and `moveAlong` pass it on; the Opportunity Attack test is now "from within reach (beside, or in their square) to out of it". `applyDamage`, `takeHit` and `companionHit` now **return the damage taken** (the hero's and a companion's falling-down halves moved into `heroHit` and `companionTakes`). Section **"Life Drain"** (`lifeDrain`, called from `performAttack` for an attack with `drainsMax`). Death saves and every party save add worn items' bonus (`wornSaveBonus(wornItems(…))`); `acOf` passes `wornItems`.
  - `resources.js`: `hpMaxDropOf`, `lowerMaxHp`; `heroMaxHp` subtracts the drop (never below 0); `freshResources` and `longRestRecovery` set it to 0; `resourceProblems` checks it. `party.js`: `memberMaxHp` subtracts a companion's; `partyLongRest` and `raiseMember` clear it; `partyProblems` checks it. Level-ups cap Hit Points at `heroMaxHp`.
  - `inventory.js`: `findItem` finds Wondrous Items (`category: 'wondrous'`); `wornItems(game)`. `sheet.js`: `armorClass(character, spellsOn, worn)`, `savingThrow(character, ability, worn)`, `wornSaveBonus(worn)`. Callers pass `wornItems` (battle, hazards, the Sheet, the hero strip, Mage Armor's text).
  - UI: the Sheet's "Right now" and the party's rows show "Life Drain: … lower, until a Long Rest"; the armour section shows worn items; the pack says "(wearing)". Debug's Give item lists Wondrous Items.
  - Save version 19 (`migrations.js` step 18).
- **Seen on screen** (phone size, port 8000, Wren made level 5 by editing the save, with Odda and Fen): the walk home's new page (the Three Wives at dusk, Garrick's and Odda's lines, the carter, Bramblegate's roofs); the last morning's new choice; Pike's lines and the knoll; the east barrow's four cards ("Shard of Names", "History · Easy", "Insight · Easy", "Fight · Low"); a forced natural 1 on History, the "tearing silk" line and the Fight card; the barrow-wife on the grid (the barrow, the biers, bones, the grey hooded Specter); a round played (Fen's arrow resisted, 7 to 3; Odda's Sacred Flame for 13 radiant; the barrow-wife drifting to Odda and missing), Resolve finishing it, the after-fight lines; the west barrow's cards and swearing the oath; the north barrow's five cards (Odda's Detect Magic as a Ritual) and taking it; the cloak from the dark, "You now have: Cloak of Protection.", the farewell ("Some of them, at least", Fen's line, Quest complete, 50 XP), back to the square with the new short line; the Sheet with Armor Class 18 (17 + 1), "Cloak of Protection: worn (+1 Armor Class, +1 to every saving throw)" and "(wearing)"; and, with a lowered maximum set in the save, "Hit Points: 42 of 42" with "Life Drain: your Hit Point maximum is 7 lower, until you finish a Long Rest" and Odda's line. **Checked only by tests:** Life Drain landing in a fight (on the hero, with Temporary Hit Points, on a companion, a maximum drained to 0), healing capped at the lowered maximum, Long Rests putting it back, drifting through a wall, the shard and Odda's-lists paths, Survival and Fen finding the locket, Religion with and without Odda, the folded cloak when the last barrow was a fight, drawing steel first (Odda −1), Fate's Mercy, alone with no shard, the Cloak on attack rolls and a death save, save version 19.

The sessions before built Chapter 2's side content, Chapter 1's side content, beat 7 (the feast), level 5, beat 6 (the first shard), foe spellcasting, and Chapter 3's beats 1–5: see git history, DESIGN.md and STORY.md.

## 4. The next slice

Act I's content is built. Rob's plan (Oct 17, 2026) was to playtest Act I against Phase 2's gate ("Act I plays in about 6 hours") before Phase 3. So the next slice is **getting Act I ready for that playtest**, then Phase 3. Put the questions to Rob first, recommended option first. The ones that look like his:

- **What comes next?** (a) A polish pass on Act I's open follow-ups that a playtester would notice (below), then Rob plays it through; (b) Rob plays Act I through now, and the next slice fixes what he finds; (c) start Phase 3's first slice (the region map and travel, say) and playtest later. Recommend (a) or (b): the gate is Phase 2's, and his notes should steer the fixes.
- **For a polish pass, which of these?** The candidates a player would see:
  - The end card still says "That's as far as the story goes for now…" under the End of Act I card; the objective says "(Act II is still being written.)".
  - The milestone note prints "6500", not "6,500" (`dmNotes.xpMilestone`).
  - "Victory! You gain 200 XP" when the hero is at level 5 already (XP counts up, but nothing comes of it).
  - Chapter title cards (the `#heading` tag could open each chapter; only the end of Act I uses it).
  - After a `#combat:` choice, the page shows "▶ Fight" twice (the chosen card faded, then again after the fight).
  - The Sheet's hint "A long rest brings back Hit Points, spell slots and every use of your features" doesn't mention a lowered maximum.
  - A playtest timer check: the debug playtest log records session lengths, time per scene and levels; Rob may want a short "how to playtest" note.
- **The playtest itself** is Rob's: on his phone, from a fresh game, with `?debug` only to read the playtest log at the end.

**Still to use** from Act I: `escape_fates_mercy`, `vault_fates_mercy`, `darts_fates_mercy`, `drain_fates_mercy`, `cats_fates_mercy`, `wolf_den_fates_mercy`, `hobs_ore_fates_mercy` and `barrow_wives_fates_mercy` (narrative only so far), `swore_the_oath` (now also sworn on the Three Wives), `looted_the_champions`, `promised_nettle_warren` and `owe_nettle`, `morwen_free_breakfasts`, `cheated_hobs_bet`, `wolves_moved_on` / `wolves_killed`, beat 7's "For Act II" list in STORY.md, `took_choir_letter` / `copied_choir_drop`, `read_precentor_postscript` and `saw_precentor_seal`, `fen_dodged_the_book`, `gnolls_fed`, `dabbin_hurt`, and now `named_sunniva` (the Whisper), how many barrow-wives were laid to rest (`*_wife_rested`: the Old Circle may care), `given_the_grey_cloak`.

Follow-ups from this slice:
- **The Wight's Life Drain** (Dame Aveline) is still not played (Rob, Oct 18, 2026): the mechanic exists now (`drainsMax`), but it's "in place of one attack" with a Constitution save, which isn't an attack roll, and the chantry's balance was simulated without it.
- **Incorporeal Movement:** a Specter never ends its move inside a wall, so the 1d10 Force damage never comes up; nobody can attack it inside one. Flying over walls or water for other fliers is still not built.
- **Attunement:** a worn item is attuned at once (no Short Rests yet), and there's no limit of three yet (nobody has more than one). Companions can't be given the cloak (nothing moves items between packs).
- **Life Drain's lowered maximum** lasts until a Long Rest. On the last morning that means it rides south with the hero (the story stops there); Fate's Mercy's long rest clears it.
- **A level 5 Wizard alone** against a barrow-wife, by an autopilot using only cantrips, won 27 of 30 and lost about half her maximum: fine for a hero with Magic Missile, harsh for one without. Odda and Fen make it easy (30 of 30).
- **The Barrow-Wives come only on the last morning:** there's no catch-up after it, as for every last-morning side quest.
- **New names:** Sunniva (checked against the cast and the name tables), the Three Wives, the Heron Ford.

Follow-ups from Chapter 2's side content (still open):
- **Gnolls are tough for their XP** (the Gorse Cut was cut to 600 XP after simulation; DESIGN.md has the numbers). **The gnoll behind the cart was cut** (Dabbin died in most fights). **Comprehend Languages can't break a cipher** (it reads the court-tongue line instead). **Hob's reforge** offers the first four plain weapons. **Only a skirmisher ally shoots**; Odda's spells don't reach allies. **Fate's Mercy on the rally day** is a long rest. **The Giant Hyena is Large** but takes one square.

Follow-ups from Chapter 1's side content (still open): Stirges hit hard for a Low fight; killing the she-wolf before round 3 ends the fight; flying is only speed; companions attack a clinging Stirge rather than pull it off; Hob sells weapons only; debug's force-next-d20 in a contest goes to the other side's roll; the last morning is offered even with every side quest done.

Follow-ups from beat 7 and earlier (each could be its own slice): Act II's Chapter 4 must read beat 7's flags (Marchbank, the League's letter, Hesper, the Rival gone); the old-end tests in `tests/saves-tests.js` start from `act1_end` (point them at the new last page when the story goes on); Revivify out of a fight; Memorize Spell and Arcane Recovery wait for Short Rests; Cunning Strike's Poison; Ray of Enfeeblement, Darkness and Pass without Trace in fights; Speak with Dead and Tiny Hut in scenes; Counterspell stops only Hold Person; the shard's power only through `#shard:` choices (the Whisper isn't built); the chantry with Rhosyn alive is hard; foes' spells reach only the party; Heroic Inspiration by choice on a foe's turn; companions don't stabilise you outside a fight; Blindsight isn't played; Large creatures take one square; the great candle is spent once used; Magic Initiate's Spell Change, Skilled's tools, Grappler; the pixel font has no "−"; Fate's Mercy at the vault notes the lost purse before the text says so.

## 5. How the companion, ally and fight code fits together

- `data/campaign/companions.js`: each companion's level 1 choices, plus `levels: { 2: {...}, … }` changes; `tactic`, `likes`, `dislikes`; `approvalBands` (likes 3, dislikes −2).
- `js/engine/character/party.js`: `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen, hpMaxDrop? }]`. `companionCharacter(id, level)` builds their sheet at the hero's level (never stored). `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion (so `heroMaxHp(memberGame(…))` is their maximum, and `wornItems(memberGame(…))` their worn items). Also `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `raiseMember`, `approve`, `feeling`, `setTactic`, `partyProblems`, `fightingMembers`, `memberMaxHp`.
- `js/engine/character/resources.js`: `heroMaxHp` (sheet + Aid − Life Drain), `hpMaxDropOf`, `lowerMaxHp`, `heal`, `longRestRecovery`, `freshResources`.
- `js/engine/combat/battle.js` (about 4,250 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`, and maybe `person`, `fallsHurt`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`). A hymn's risen dead and reinforcements are pushed on the end.
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)`; `c.ally`; `c.side === 'hero'`. Lists: `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`. Helpers: `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`, `healthOf`, `isBloodied`, `isIncorporeal`.
  - **Damage:** `applyDamage` → `takeHit` (monsters inline; the hero via `heroHit`; companions via `companionHit` → `companionTakes`); all return the damage taken. `resistanceCut` first for the party. **Life Drain** (`lifeDrain`) after a `drainsMax` hit.
  - **Wards** (`WARDS`), `castWard`.
  - **Twists:** the hymn (`hymnRises`, `hymnHurt`, `singerOf`) and reinforcements (`reinforcementsDue`, `reinforcementsArrive`), both announced by `objectiveText`.
  - **Concentration:** `concentrationOf`, `startConcentration`, `endConcentration`, `tidyConcentration`, `concentrationCheck`, `holderOf(effect)`, `holdingSomeone`.
  - **Clinging on** (the Stirge): `attach`, `drinkAtStartOfTurn`, `dragClingers`, `settleClings`, `dropClings`, `clingingTo`, `clingersOn`, `pullOffTargets`, `heroPullOff`.
  - **Rampage** (the gnolls): `canRampage`, `rampage`.
  - **Moving:** `blockedFor`, `reachFor` (crawling, Spirit Guardians, incorporeal), `moveAlong` (Opportunity Attacks: leaving reach from beside or from inside someone's square).
  - **A foe's turn:** `enemyTurn`, then `casterTurn` for a monster with `spellcasting`, else `weaponTurn`. `chooseTarget`: the nearest of the hero's side on their feet, the most hurt of equals.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, … , `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn`; `friendsFor` and `forAllies`; `finishBattle` records `lastBattle.alliesAlive`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. It looks only at the party, never at allies.
- `js/engine/combat/grid.js`: `reachableSquares(map, start, feet, blockedBy, { crawling, slowAt, incorporeal })`, `passingThrough`, `stepCost(…, difficult)`, `lineBlock`.
- `js/engine/combat/resolve.js`: Quick Resolve. Its hero autopilot (`playTurn`) isn't exported; the balance simulation below copies it.
- `js/engine/character/inventory.js`: `findItem` (Wondrous Items and magic weapons too), `wornItems`, `plainWeapons`, `makeMagicWeapon`, shops (`priceAt`, `buyItem`). `js/engine/character/sheet.js`: `armorClass(character, spellsOn, worn)`, `savingThrow(character, ability, worn)`, `wornSaveBonus(worn)`.
- **Story commands** (`js/engine/story/externals.js`, declared in `story/externals.ink`): … `contest`, `can_afford_at`, `buy_at`, `item_name`, `plain_weapon`, `make_weapon_magic`. Ink functions: `lies_in_state(id)`, `oath_wall_easy()`, `carried(id)`, `raised_tonight(id)`, `wolves_starving()`, `side_quests_left()`, `hob_owes_star_iron()`, `wife_done(which)`. Tags: `#heading`, `#shop:id`, `#contest:skill:who`, `#shard:id`, `#spell:id`, `#by:companion`, `#check:skill:dc`, `#drive:id`, `#combat:id`.

## 6. Running the tests

The test pages run in the browser; there is no Node or Python on Rob's PC. Start the preview server named `questbound` (`.claude/launch.json` runs `tools/serve.ps1`; it uses port 8000 if it's free). Then, in the Browser pane on a test page such as `/tests/levels.html`, define this with the JavaScript tool:

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
    while (Date.now() - start < 150000) {
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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds; all eight pages take about two and a half minutes). Run it from any test page except `/tests/saves.html`. One page alone (`/tests/story.html`) can be read straight off its `#summary` after about 30 seconds.

**Balance simulation** (how the Gorse Cut and the barrow-wife were checked): on a test page, `await import('/js/engine/combat/battle.js?sim=1')` and the modules it needs (`rules/rng.js`, `character/inventory.js` `startingInventory`, `character/resources.js` `freshResources`, `character/party.js` `joinParty`, `data/campaign/quick-start.js`, `combat/grid.js`, `combat/attacks.js` `parseDice`). Build a game `{ character, rng: createRng(seed), ...startingInventory(c), ...freshResources(c), battle: null, lastBattle: null, party: [], flags: [] }`, join Odda and Fen, `startBattle(game, id, 0)`, and play the hero like Resolve's `playTurn` (stand up, attack the foe it would hurt most with a weapon or cantrip, else move to the square nearest a foe, then the extra attacks, then `endHeroTurn`) until `battle.outcome`; a downed hero's turns run by themselves. A level 5 Champion is `{ ...wren, level: 5, subclassId: 'champion', hitPointRolls: [null, null, null, null], classChoices: { ...wren.classChoices, weaponMasteries: [...wren.classChoices.weaponMasteries, 'longbow'] }, levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { strength: 1, constitution: 1 } }] }` (a level 4 one drops the last roll and the feat). To try another pack, change the shared `encounters` entry's `monsters` in memory (import `/data/campaign/encounters.js`) and put it back after. Calibration, 20–30 fights each: Cairnfield (level 3) 27/30, the Old Ford 30/30, the vault (level 4, Moderate) 20/20, the chantry (High) 12–15/20, the Gorse Cut 27/30, a barrow-wife (level 5) 30/30.

- **Chapter 3's side quest** (`tests/story-tests.js`, at the end): `atTheThreeWives(seed, { flags, companions, shard, seen })` (the ring of barrows on the last morning), `RING`, `hasCloak`. **Chapter 2's:** `atTheRally`, `onDabbinsCart`, `atTheLastMorning(seed, { flags, companions })`, `CHAPTER_1_DONE`, `CHAPTER_3_DONE`. **Chapter 1's:** `inTheSquare`, `settleFight(game, start, { won, setUp })`, `scriptedThen(faces, seed)`, `questStatus`, `has`, `pageText(page)`.
- **The Specter** (`tests/combat-tests.js`, at the end): `specterFight({ party, seed, at })` (the barrow-wife fight, Wren at level 5 first, then the Specter). A test can push its own encounter into `encounters` for a special map and splice it out in `finally` ("drifts through a wall"). **The gnolls:** `gnollFight({ party, seed, keep })`. Magic weapons: after "Attacks: a Shield…". **The Stirge:** `stirgeFight`, `stirgeClings`.
- **The last morning:** `jumpTo(game, 'ch3_night.morning')` then "Go out into Bramblegate".
- **Foe spells, Chapter 3's beats, Chapter 2's beats** (`tests/dungeon-tests.js`): `fanaticFight`, `atTheHomecoming` (the road home now has "Go on, south" before the Three Wives' page), `atTheDarkMoon`, `atTheEve`, `homeFromCairnfield`, `toTheMorning`, `atCairnfield`, and level 4–5 heroes (`champion4` there; `juniper4`, `posy4`, `sorael4` in `level-up-tests.js`; `fighter5` in `combat-tests.js`).
- **Which page:** level-ups in `level-up-tests.js`; companions at every level in `classes-tests.js`; monster checks, foe spells, traps, the encounter budget (each encounter's `sizedFor` must match its difficulty word) and the chapter playthroughs in `dungeon-tests.js`; allies, deep water, the Stirge, the gnolls, the Specter, Life Drain and magic weapons in `combat-tests.js`; the Cloak's maths in `rules-tests.js`; saves, migrations and old ends in `saves-tests.js`; the Ink bridge, tags, story-text lint and the side quests in `story-tests.js`.
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice, set `game.rng = scriptedThen([...faces], seed)` (faces for whatever die comes next: a d20, then each damage die).
- **A downed hero can't `endHeroTurn`** ("It isn't your turn"): to test a death save, let a foe drop the hero during `endHeroTurn`, and script the death save's d20 after its damage dice.
- **Text after a choice** is on the *next* page. Check it after `pick`, not before.
- **Choice lists in older tests** break when a hub gains a choice (the last morning did again this session, in `story-tests.js` and `saves-tests.js`'s old-end test): update the expected arrays.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well. For many exact replacements, a perl one-liner per line. **No shell heredocs at all**: write files with the Write tool. In a Perl one-liner's replacement, `@word` is an array and vanishes, and **`${…}` (a JavaScript template string) is Perl interpolation**: a replacement containing `${item.name}` dies part-way ("Undefined subroutine"). Use the Edit tool for anything with `${`.
- **Ink:**
  - Write `word{cond:, more}`; choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}`, but `+` works (`set_flag(which + "_wife_rested")`); a line where someone speaks ends with `#speaker:id`, and everyone who speaks needs an entry in `people.js`.
  - **Story commands can't be called inside a choice's text.** Put the values in `~ temp` variables first. Conditions in `{…}` before the text are fine.
  - **Tunnels work well for side quests:** `-> side_x -> somewhere`; the scene ends with `->->`. Tunnels can chain and can be called inside a conditional block.
  - **Returning into the knot you're already in doesn't count as a visit.** `-> side_x -> act1_last_morning`, called from the knot's own stitch, left `act1_last_morning`'s read count at 1, so its first-visit text played again. Return to a stitch instead (`-> side_x -> back`).
  - **A `#combat:` choice's content runs after the fight**, so anything said in it reads as after the fight: put a line meant for before the fight on the page before the choice, and pass a parameter on to the after-fight stitch (`-> fought("east", true)`).
  - **Don't name a stitch after a knot.** Stitches can take parameters (`= fought(which, first)`). The story uses no Ink `VAR`s; flags hold everything, and `~ temp` counts within a stitch.
- **The map's title shows the room's name**, so a room's `name` mustn't give away what's in it.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it with `grep -a`; negative modifiers show as `�c` and `�d`). Monsters by name: search "SpecterSpecter" (around line 48783); magic items by name ("Cloak of Protection", around 29274); the Long Rest's "If your Hit Point maximum was reduced" (around 25637). If the extract is gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** `enlarge.ps1 <sheet> <out.png> <scale>` and `crop.ps1 <sheet> <out.png> <firstRow> <rows> <scale>` are in this session's scratchpad (and older ones); Read the PNG. `Characters/Undead0.png`: row 4 white ghosts and a shadow, row 5 hooded reapers, row 6 grey wisp-trailing hoods (the Specter is column 0). Older notes: `Humanoid0.png` row 21 column 0 is the gnoll; `Dog0.png` rows 0–2 dogs and hyenas; `Quadraped0.png` row 4 column 0 a pony; `Pest0.png` insects; `Avian0.png` row 11 bats; `Objects/Decor0.png` row 9 sacks, crates, barrel, hay, row 10 biers and coffins, row 12 bones and skulls, row 19 cobwebs. A sprite entry can take `alpha` (the Specter's 0.8).
- **Playing on screen:**
  - The pane was visible this session and screenshots worked at phone size. **The game page doesn't scroll with `window.scrollBy`**: use `element.scrollIntoView()` on the text or canvas you want.
  - A level 5 hero for screen checks: start a Quick Start game, then edit the save in IndexedDB (`questbound` → `slots`, keyPath `slot`): the Champion above as `game.character`, `xp: 6500`, `hp` from `maxHp`, companions from `joinParty({ character, party: [] }, id)`, flags, `undo: null`; `put` it, reload, Continue. Faster than clicking through four level-ups.
  - **The d20 to tap** is the button in the **last** `.roll-panel`. Don't click every button in a roll panel: "Reroll ★" spends Heroic Inspiration.
  - Tap choices with the JavaScript tool (`.choice-card`). The debug panel (`[aria-label="Debug tools"]`, toggle `button.debug-toggle`): Jump (`select[aria-label="Scene to jump to"]`, then the "Jump" button), Force next d20 (`input[aria-label="d20 face to force"]`, then its button), Party Join/Leave, Set level, Give item. Fill inputs with the native value setter, then dispatch `input` and `change`.
  - **A fight's end:** the "Carry on" button (`battle-button is-primary`). "Resolve" (a button starting "Resolve") plays a fight that's well under the party out at once.
  - **Jumping back into a scene you've played** keeps the story's memory, so once-only choices already taken stay hidden.
  - **The playtest log:** clean it from a test page, not the game page (the game page writes it as it closes).
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP. The hymn's risen dead and reinforcements aren't counted, and killing every foe before reinforcements arrive ends the fight. **The budget isn't the whole story:** check a new fight with the balance simulation (section 6).
