# Handoff: starting the next slice

Written on Oct 18, 2026, at the end of the session that got **Act I ready for Rob's playtest**
(Phase 2's gate, "Act I plays in about 6 hours"): chapter title cards, the End of Act I card,
deaths and time per chapter in the playtest log, the wording fixes a playtester would notice,
and `docs/PLAYTEST.md`, Rob's how-to. Next, Rob plays Act I through on his phone. Start a new
Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I): it stays so until Rob's playtest passes the gate.
- `docs/PLAYTEST.md`: how Rob runs the playtest and what he brings back (the Playtest log's numbers and his notes).
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - "Build Phases": Phase 2's gate, and Phase 3's scope (levels 5–10, region map and travel, contracts, faction standing, the Whisper; Barbarian, Paladin, Ranger, Warlock).
  - Sessions, "How it works in the game": new **Title cards** and **The end of an act**.
  - Rules and Progression, "Experience and levels": XP past level 5 is "banked for the levels to come"; XP shows with commas.
  - "Carried over from Whimsywild": the debug mode's **playtest log** (deaths, time by game and by chapter).
- `docs/STORY.md`: Act I's title cards, and the End of Act I card on the road south.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (all three this session).
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save, or delete the slot in IndexedDB), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage). **Check which port the preview server got:** each port has its own saves and log. This session's server was on port 8000; its storage started empty (no saves, a log of `{"version":1,"sessions":[],"scenes":[]}`) and was left that way. Rob's own browser and phone have their own storage, with his games in them.
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js (`newGame`, `gameToSave`, `loadGame`, and `validateSave` if it can be wrong), and `PRACTICE_KEEPS` in story-runner.js if a practice fight should put it back. A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`. (A new field inside `game.battle`, on a combatant, or on a companion's place in the party where missing means none, needs none of this.) This session added `deaths` to the game: save version 20.

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v44` (getting Act I ready for its playtest) |
| Save format | version 20: `game.deaths` (the hero's deaths, each a Fate's Mercy so far; 0 for older saves). Step 19 also takes "(Act II is still being written.)" off the aim of a save at the end of Act I |
| Tests | 597 passing: rules 91, combat 92, saves 81, story 39, levels 29, dungeon 167, spells 43, classes 55 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–5 (heroes stop at level 5; XP still counts up, "banked for the levels to come") |
| Story | Act I is complete, with every chapter's side content, title cards, and the End of Act I card. Only the road event (The Tollman's Lantern) waits, for Phase 3's travel |

Built this session (Rob's choices, Oct 18, 2026: a polish pass, then he plays; all four fixes; the end of Act I shows a summary):
- **Title cards:** `#heading` lines open each chapter: "Act I · The Barrow Dead" and "Chapter 1 · Bramblegate" at the top of `ch1_arrival` (one frame: CSS `.story-heading:has(+ .story-heading)` and `.story-heading + .story-heading`), "Chapter 2 · The Barrow Road" at the top of `ch2_morning`, "Chapter 3 · The Kings' Barrow" at the top of `ch3_dark_moon`.
- **The End of Act I card:** `data/campaign/acts.js` (each act's `title`, `chapters`, `completeFlag`, `startsAt` and `closing`); `js/engine/story/act-summary.js` (`finishedAct(game)`, `actSummary(game, act)`, `chapterStarts`); `actEndCard` in `js/engine/ui/session-panels.js`, shown by the adventure screen's `showEnd` once the act's flag is set (the old "That's as far as the story goes" card stays for any other end). Time played comes from the playtest log (`tracker.playedMs(game)`, passed in as `startAdventureScreen`'s `playedMs`). The aim is now just "Follow the shard south."
- **Wording:** `xpText` (level-up.js) puts commas in XP everywhere it's shown (the DM's notes, the Sheet, the journal's session summaries, the fight log). New `dmNotes.xpGainedBanked` and `fightWonBanked` at level 5 (`give_xp`, `continueAfterBattle`, and the battle screen's Victory card). The Sheet's Long Rest hint mentions the full Hit Point maximum while Life Drain has lowered it.
- **"▶ Fight" once:** the adventure screen keeps the fight choice it shows above a fight (`fightChoiceShown`) and removes it when the fight ends, since the page after the fight starts with it again.
- **The playtest log:** `game.deaths` counts every lost fight (`finishBattle`, not practice fights) and every death outside a fight (`heroDied` in externals.js, for `take_damage` and `spring_trap`). A session's deaths are the game's count minus `deathsBefore` (so an undo takes one back, and a reload never counts one twice); `recordDeath` is gone. Scene visits now carry `gameId`; `summarizeLog(log, chapterStarts)` gives each game `playedMs` and `chapters` (time per chapter, in the order played: a visit to a chapter's first scene starts it). The debug panel shows them under "By game".
- **Seen on screen** (phone size, port 8000, Wren made level 5 by editing the save, with Odda and Fen): the new game's first page with the act's and Chapter 1's titles in one frame; the Barrow-Wives on the last morning: "You gain 200 XP, banked for the levels to come.", the fight (Resolve), the Victory card's banked line, and after Carry on "▶ Draw steel…" once; riding south: "END OF ACT I · THE BARROW DEAD", then the card (Act I · The Barrow Dead, Wren Ashdown · Human Fighter 5, 7,150 XP, "14 days in the north, over 2 sessions and 1m 32s of play.", Quests done (8 of 8), "With you: Odda Brasswick and Fen Underbough.", "You carry the Shard of Names.", the closing line), all of it readable above the tab bar; the card again after a reload; the Sheet with "XP: 7,150" and, with Life Drain set in the save, the new hint; the debug Playtest log's "By game" line with time played and "Chapter 1: 45s · The last morning: 1m 09s". **Checked only by tests:** Chapters 2 and 3's title cards, deaths counted (a lost fight, the darts' death saves, not a practice fight, an undo taking one back), the migration to version 20, the time-by-chapter maths, the end card's quests and a fallen companion.

## 4. The next slice

**Rob's playtest.** Rob plays Act I through on his phone from a fresh game, following `docs/PLAYTEST.md`, and brings back the Playtest log (screenshots or lines) and his notes. The next slice is **fixing what he found**, then Phase 3.

- **If Rob brings notes:** sort them into bugs, balance and pacing, and design questions. Fix the bugs. Put the design questions to him with the question tool, recommended option first. Compare the time per chapter with STORY.md's "about 2 hours" each, and the total with the gate's "about 6 hours"; if a chapter runs long or short, ask him what to cut or add rather than guessing.
- **If he hasn't played yet:** ask whether to wait for his playtest (recommended: the gate is Phase 2's), or to start Phase 3's first slice meanwhile (the region map and travel, say, with The Tollman's Lantern as the first road event).
- **When the gate passes,** update CLAUDE.md's "Current phase" line to Phase 3, and DESIGN.md's build notes.

**Follow-ups from this slice** (none blocks the playtest):
- **Deaths count from save version 20 on:** a game started before it shows none from earlier.
- **Time played on the End of Act I card** comes from the playtest log on that device, not the save: a save restored on another device shows only the time played there (and none if the log has nothing).
- **Time per chapter follows the scenes in the order played**, so a debug Jump moves it along too. Scene visits logged before this update carry no game and aren't counted per chapter.
- **The hero strip shows the sheet's Hit Point maximum** ("HP 49"), not one lowered by Life Drain or raised by Aid; the status line ("HP 42/42") has the real one. A playtester may notice it after the Barrow-Wives.
- **The end card leaves out** companions' approval (it stays hidden) and how many times Fate's Mercy saved the hero; Rob may want either.

**Still to use** from Act I: `escape_fates_mercy`, `vault_fates_mercy`, `darts_fates_mercy`, `drain_fates_mercy`, `cats_fates_mercy`, `wolf_den_fates_mercy`, `hobs_ore_fates_mercy` and `barrow_wives_fates_mercy` (narrative only so far), `swore_the_oath`, `looted_the_champions`, `promised_nettle_warren` and `owe_nettle`, `morwen_free_breakfasts`, `cheated_hobs_bet`, `wolves_moved_on` / `wolves_killed`, beat 7's "For Act II" list in STORY.md, `took_choir_letter` / `copied_choir_drop`, `read_precentor_postscript` and `saw_precentor_seal`, `fen_dodged_the_book`, `gnolls_fed`, `dabbin_hurt`, `named_sunniva` (the Whisper), how many barrow-wives were laid to rest (`*_wife_rested`: the Old Circle may care), `given_the_grey_cloak`.

Follow-ups from Chapter 3's side content (still open):
- **The Wight's Life Drain** (Dame Aveline) is still not played (Rob, Oct 18, 2026): the mechanic exists (`drainsMax`), but it's "in place of one attack" with a Constitution save, which isn't an attack roll, and the chantry's balance was simulated without it.
- **Incorporeal Movement:** a Specter never ends its move inside a wall, so the 1d10 Force damage never comes up; nobody can attack it inside one. Flying over walls or water for other fliers is still not built.
- **Attunement:** a worn item is attuned at once (no Short Rests yet), and there's no limit of three yet. Companions can't be given the cloak (nothing moves items between packs).
- **Life Drain's lowered maximum** lasts until a Long Rest: on the last morning it rides south with the hero; Fate's Mercy's long rest clears it.
- **A level 5 Wizard alone** against a barrow-wife, by an autopilot using only cantrips, won 27 of 30 and lost about half her maximum. Odda and Fen make it easy (30 of 30).
- **The Barrow-Wives come only on the last morning:** there's no catch-up after it.

Follow-ups from Chapter 2's side content (still open): **gnolls are tough for their XP** (the Gorse Cut was cut to 600 XP after simulation); **the gnoll behind the cart was cut**; **Comprehend Languages can't break a cipher**; **Hob's reforge** offers the first four plain weapons; **only a skirmisher ally shoots**, and Odda's spells don't reach allies; **Fate's Mercy on the rally day** is a long rest; **the Giant Hyena is Large** but takes one square.

Follow-ups from Chapter 1's side content (still open): Stirges hit hard for a Low fight; killing the she-wolf before round 3 ends the fight; flying is only speed; companions attack a clinging Stirge rather than pull it off; Hob sells weapons only; debug's force-next-d20 in a contest goes to the other side's roll; the last morning is offered even with every side quest done.

Follow-ups from beat 7 and earlier (each could be its own slice): Act II's Chapter 4 must read beat 7's flags (Marchbank, the League's letter, Hesper, the Rival gone); the old-end tests in `tests/saves-tests.js` start from `act1_end` (point them at the new last page when the story goes on, and give `data/campaign/story-continues.js` an entry for `act1_end`); Revivify out of a fight; Memorize Spell and Arcane Recovery wait for Short Rests; Cunning Strike's Poison; Ray of Enfeeblement, Darkness and Pass without Trace in fights; Speak with Dead and Tiny Hut in scenes; Counterspell stops only Hold Person; the shard's power only through `#shard:` choices (the Whisper isn't built); the chantry with Rhosyn alive is hard; foes' spells reach only the party; Heroic Inspiration by choice on a foe's turn; companions don't stabilise you outside a fight; Blindsight isn't played; Large creatures take one square; the great candle is spent once used; Magic Initiate's Spell Change, Skilled's tools, Grappler; the pixel font has no "−"; Fate's Mercy at the vault notes the lost purse before the text says so.

**When Act II begins:** add an entry to `data/campaign/acts.js` for it (its chapters, completeFlag, `startsAt` scenes and closing line), and point Act I's `closing` at what comes next. The End of Act I card shows only while the story has no choices, so once `act1_end` leads on into Act II, decide with Rob where the Act I summary should appear (a page of its own before Chapter 4, say).

## 5. How the code fits together

- `data/campaign/companions.js`: each companion's level 1 choices, plus `levels: { 2: {...}, … }` changes; `tactic`, `likes`, `dislikes`; `approvalBands` (likes 3, dislikes −2).
- `data/campaign/acts.js`: the acts (title, chapters, completeFlag, `startsAt` scenes for the playtest log, closing line). `js/engine/story/act-summary.js`: `finishedAct`, `actSummary`, `chapterStarts`.
- `js/engine/save/playtest-log.js`: `PlaytestTracker` (`startSession`, `update`, `pause`, `resume`, `endSession`, `playedMs(game)`, `clear`); a session entry has `gameId`, `activeMs`, `levelStart`/`levelEnd`, `deaths`, `deathsBefore`, `openScene`; a scene visit `{ scene, ms, slot, session, gameId }`. `summarizeLog(log, chapterStarts)`. Main.js creates one tracker, always recording; the debug panel shows it.
- `js/engine/character/party.js`: `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen, hpMaxDrop? }]`. `companionCharacter(id, level)` builds their sheet at the hero's level (never stored). `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Also `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `raiseMember`, `approve`, `feeling`, `setTactic`, `partyProblems`, `fightingMembers`, `memberMaxHp`.
- `js/engine/character/resources.js`: `heroMaxHp` (sheet + Aid − Life Drain), `hpMaxDropOf`, `lowerMaxHp`, `heal`, `longRestRecovery`, `freshResources`. `js/engine/character/level-up.js`: `xpForLevel`, `nextLevelXp` (null at the highest level so far), `xpText`.
- `js/engine/combat/battle.js` (about 4,250 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`, and maybe `person`, `fallsHurt`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`). A hymn's risen dead and reinforcements are pushed on the end.
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)`; `c.ally`; `c.side === 'hero'`. Lists: `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`. Helpers: `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`, `healthOf`, `isBloodied`, `isIncorporeal`.
  - **Damage:** `applyDamage` → `takeHit` (monsters inline; the hero via `heroHit`; companions via `companionHit` → `companionTakes`); all return the damage taken. `resistanceCut` first for the party. **Life Drain** (`lifeDrain`) after a `drainsMax` hit.
  - **Ending:** `checkEnd`, `endBattle(game, 'victory' | 'defeat')`, `finishBattle` (banks XP, counts a defeat in `game.deaths`, sets `lastBattle`).
  - **Wards** (`WARDS`), `castWard`. **Twists:** the hymn (`hymnRises`, `hymnHurt`, `singerOf`) and reinforcements (`reinforcementsDue`, `reinforcementsArrive`), both announced by `objectiveText`.
  - **Concentration:** `concentrationOf`, `startConcentration`, `endConcentration`, `tidyConcentration`, `concentrationCheck`, `holderOf(effect)`, `holdingSomeone`.
  - **Clinging on** (the Stirge): `attach`, `drinkAtStartOfTurn`, `dragClingers`, `settleClings`, `dropClings`, `clingingTo`, `clingersOn`, `pullOffTargets`, `heroPullOff`. **Rampage** (the gnolls): `canRampage`, `rampage`.
  - **Moving:** `blockedFor`, `reachFor` (crawling, Spirit Guardians, incorporeal), `moveAlong` (Opportunity Attacks).
  - **A foe's turn:** `enemyTurn`, then `casterTurn` or `weaponTurn`. `chooseTarget`: the nearest of the hero's side on their feet, the most hurt of equals.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, … , `companionOptions`, `companionCantUse`. **Allies:** `allyTurn`; `friendsFor` and `forAllies`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. `js/engine/combat/grid.js`: `reachableSquares(map, start, feet, blockedBy, { crawling, slowAt, incorporeal })`, `passingThrough`, `stepCost(…, difficult)`, `lineBlock`. `js/engine/combat/resolve.js`: Quick Resolve (its hero autopilot `playTurn` isn't exported).
- `js/engine/character/inventory.js`: `findItem`, `wornItems`, `plainWeapons`, `makeMagicWeapon`, `findShard`, `hasShard`, shops (`priceAt`, `buyItem`). `js/engine/character/sheet.js`: `armorClass(character, spellsOn, worn)`, `savingThrow(character, ability, worn)`, `wornSaveBonus(worn)`, `describeCharacter`.
- **The adventure screen** (`js/engine/ui/adventure-screen.js`): `showPage` (beats: chosen, text, heading, speech, note, roll), `showFight`, `showLevel`, `showChoices`, `showEnd` (the act's card, or the plain end), `choose`. **Session panels** (`session-panels.js`): `sessionCard`, `whatNowBox`, `actEndCard`.
- **Story commands** (`js/engine/story/externals.js`, declared in `story/externals.ink`): … `give_xp`, `xp_milestone`, `take_damage`, `spring_trap` (a death counts via `heroDied`), `contest`, `can_afford_at`, `buy_at`, `item_name`, `plain_weapon`, `make_weapon_magic`. Ink functions: `lies_in_state(id)`, `oath_wall_easy()`, `carried(id)`, `raised_tonight(id)`, `wolves_starving()`, `side_quests_left()`, `hob_owes_star_iron()`, `wife_done(which)`. Tags: `#heading`, `#shop:id`, `#contest:skill:who`, `#shard:id`, `#spell:id`, `#by:companion`, `#check:skill:dc`, `#drive:id`, `#combat:id`.

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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds; all eight pages take about two and a half minutes, so wait with `await new Promise(r => setTimeout(r, 30000))` before reading). Run it from any test page except `/tests/saves.html`. One page alone (`/tests/story.html`) can be read straight off its `#summary` after about 35 seconds.

**Balance simulation** (how the Gorse Cut and the barrow-wife were checked): on a test page, `await import('/js/engine/combat/battle.js?sim=1')` and the modules it needs (`rules/rng.js`, `character/inventory.js` `startingInventory`, `character/resources.js` `freshResources`, `character/party.js` `joinParty`, `data/campaign/quick-start.js`, `combat/grid.js`, `combat/attacks.js` `parseDice`). Build a game `{ character, rng: createRng(seed), ...startingInventory(c), ...freshResources(c), battle: null, lastBattle: null, party: [], flags: [] }`, join Odda and Fen, `startBattle(game, id, 0)`, and play the hero like Resolve's `playTurn` (stand up, attack the foe it would hurt most with a weapon or cantrip, else move to the square nearest a foe, then the extra attacks, then `endHeroTurn`) until `battle.outcome`; a downed hero's turns run by themselves. A level 5 Champion is `{ ...wren, level: 5, subclassId: 'champion', hitPointRolls: [null, null, null, null], classChoices: { ...wren.classChoices, weaponMasteries: [...wren.classChoices.weaponMasteries, 'longbow'] }, levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { strength: 1, constitution: 1 } }] }` (`champion5` in story-tests.js). Calibration, 20–30 fights each: Cairnfield (level 3) 27/30, the Old Ford 30/30, the vault (level 4, Moderate) 20/20, the chantry (High) 12–15/20, the Gorse Cut 27/30, a barrow-wife (level 5) 30/30.

- **Getting Act I ready for its playtest** (`tests/story-tests.js`, at the end): `champion5`; title cards, banked XP notes, deaths, the End of Act I card. The playtest log's deaths and time by chapter: `tests/saves-tests.js` ("Playtest log: …"; `fakeGame(scene, { slot, session, level, createdAt, deaths })`). The migration to version 20 and `deaths` in the save: saves-tests.js. `xpText`: level-up-tests.js. A death from the darts: dungeon-tests.js ("struck down by the darts").
- **Chapter 3's side quest** (story-tests.js): `atTheThreeWives(seed, { flags, companions, shard, seen })`, `RING`, `hasCloak`. **Chapter 2's:** `atTheRally`, `onDabbinsCart`, `atTheLastMorning(seed, { flags, companions })`, `CHAPTER_1_DONE`, `CHAPTER_3_DONE` (to reach "Ride south" plainly, also set `hanging_tree_done`, `hobs_ore_done` and `hob_reforged`, or Hob's card changes). **Chapter 1's:** `inTheSquare`, `settleFight(game, start, { won, setUp })`, `scriptedThen(faces, seed)`, `questStatus`, `has`, `pageText(page)`.
- **The Specter** (`tests/combat-tests.js`, at the end): `specterFight({ party, seed, at })`. **The gnolls:** `gnollFight({ party, seed, keep })`. **The Stirge:** `stirgeFight`, `stirgeClings`.
- **The last morning:** `jumpTo(game, 'ch3_night.morning')` then "Go out into Bramblegate".
- **Foe spells, Chapter 3's beats, Chapter 2's beats** (`tests/dungeon-tests.js`): `fanaticFight`, `atTheHomecoming`, `atTheDarkMoon`, `atTheEve`, `homeFromCairnfield`, `toTheMorning`, `atCairnfield`, and level 4–5 heroes (`champion4` there; `juniper4`, `posy4`, `sorael4` in `level-up-tests.js`; `fighter5` in `combat-tests.js`).
- **Which page:** level-ups in `level-up-tests.js`; companions at every level in `classes-tests.js`; monster checks, foe spells, traps, the encounter budget and the chapter playthroughs in `dungeon-tests.js`; allies, deep water, the Stirge, the gnolls, the Specter, Life Drain and magic weapons in `combat-tests.js`; the Cloak's maths in `rules-tests.js`; saves, migrations, old ends and the playtest log in `saves-tests.js`; the Ink bridge, tags, story-text lint, the side quests and the act's end in `story-tests.js`.
- **A new game's first page** now starts with two heading beats (the act's and Chapter 1's), so a test reading the Drive line looks for the first text beat that isn't a heading.
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked unless the test sets `battle.xp` first (`settleFight(…, { setUp: (g) => (g.battle.xp = 1250) })`). A lost fight settled that way counts a death.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice, set `game.rng = scriptedThen([...faces], seed)`.
- **A downed hero can't `endHeroTurn`** ("It isn't your turn"): to test a death save, let a foe drop the hero during `endHeroTurn`, and script the death save's d20 after its damage dice.
- **Text after a choice** is on the *next* page. Check it after `pick`, not before.
- **Choice lists in older tests** break when a hub gains a choice: update the expected arrays.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well. For many exact replacements, a perl one-liner per line. **No shell heredocs**: write files with the Write tool. In a Perl one-liner's replacement, `@word` is an array and vanishes, and **`${…}` (a JavaScript template string) breaks it** (bash "bad substitution", or Perl "Undefined subroutine"). **Perl's `\x{00B7}` writes a single Latin-1 byte, not UTF-8 "·"**: put any non-ASCII text (·, ’, —) in with the Edit tool, and check with `cat -A` (UTF-8 "·" shows as `M-BM-7`).
- **Ink:**
  - Write `word{cond:, more}`; choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}`, but `+` works (`set_flag(which + "_wife_rested")`); a line where someone speaks ends with `#speaker:id`, and everyone who speaks needs an entry in `people.js`. A title is a line ending in `#heading`.
  - **Story commands can't be called inside a choice's text.** Put the values in `~ temp` variables first.
  - **Tunnels work well for side quests:** `-> side_x -> somewhere`; the scene ends with `->->`.
  - **Returning into the knot you're already in doesn't count as a visit.** Return to a stitch instead (`-> side_x -> back`).
  - **A `#combat:` choice's content runs after the fight**, so anything said in it reads as after the fight: put a line meant for before the fight on the page before the choice.
  - **Don't name a stitch after a knot.** The story uses no Ink `VAR`s; flags hold everything, and `~ temp` counts within a stitch.
- **The map's title shows the room's name**, so a room's `name` mustn't give away what's in it.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it with `grep -a`). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** see the notes in older handoffs (git history) and `data/campaign/sprites.js`; `Characters/Undead0.png` row 6 column 0 is the Specter.
- **Playing on screen:**
  - The pane was visible this session and screenshots worked at phone size. **The game page doesn't scroll with `window.scrollBy`**: use `element.scrollIntoView()`.
  - A level 5 hero for screen checks: start a Quick Start game, then edit the save in IndexedDB (`questbound` → `slots`, keyPath `slot`) from the game page: the Champion above as `game.character`, `xp: 6500`, `hp` from `heroMaxHp({ ...game, hpMaxDrop: 0 })`, companions from `joinParty({ character, party: [] }, id)`, flags, done quests in `journal.quests`, `undo: null`; `put` it, reload, Continue, then debug Jump to `ch3_night.morning`.
  - **The d20 to tap** is the button in the **last** `.roll-panel`. Don't click every button in a roll panel: "Reroll ★" spends Heroic Inspiration.
  - Tap choices with the JavaScript tool (`.choice-card`, matching `.choice-text`). The debug panel (`[aria-label="Debug tools"]`, toggle `button.debug-toggle`): Jump (`select[aria-label="Scene to jump to"]`, then the "Jump" button), Force next d20, Party Join/Leave, Set level, Give item. Fill inputs with the native value setter, then dispatch `input` and `change`.
  - **A fight's end:** "Skip ›", then "Resolve" (a button starting "Resolve") for a fight well under the party, then "Carry on".
  - **Jumping back into a scene you've played** keeps the story's memory, so once-only choices already taken stay hidden.
  - **The playtest log:** clean it from a test page, not the game page (the game page writes it as it closes).
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP. **The budget isn't the whole story:** check a new fight with the balance simulation (section 6).
