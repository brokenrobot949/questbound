# Handoff: starting the next slice

Written on Oct 12, 2026, at the end of the session that built Chapter 3's beats 1 and 2 (under the
dark moon, and the barrow gate). Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase (Act I ends with Chapter 3).
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - World and Exploration, "Dungeons": the Kings' Barrow is **two maps, one per level** (Rob, Oct 12, 2026), and things in a room (the sealing stone) can change with the story, as figures do.
  - Combat: "Chapter 3's monsters", "Encounter design" (budgets, twists, `sizedFor`, the new plain **Reinforcements**), "Allies who aren't companions".
  - Rules and Progression: "Milestones", and levels 1–4 (heroes stop at 4 for now; Chapter 3 ends at level 5, which isn't built).
  - Companions: approval and how it shows (`likes_you` / `dislikes_you`).
- `docs/STORY.md`: **Chapter 3 · The Kings' Barrow**. Beats 1 and 2 are written up as built; beats 3–7 are the plan. Beat 4 now has the Rival chained at the sluice wheel, and beat 5 has them fighting beside you.
- `story/act-1/ch3-barrow-gate.ink`: the last scene built (`ch3_dark_moon`, `ch3_gate`), as a pattern for a dungeon room with several ways past a guardian, a fight with a twist the story's allies change, and Fate's Mercy that fails forward. `story/act-1/ch2-millers-daughter.ink` (`ch2_ossuary`) is the pattern for walking room to room with `#room:` and `#go:` tags.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (he took all four this session).
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage: your sessions by `gameId`, and the scene entries you added at the end of `scenes`). **Check which port the preview server got:** each port has its own saves and log. On port 8000 the log held 28 sessions and 49 scenes (this session's server landed on port 64219, which started empty and was left empty).
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js. A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`, as `levelFeats` did. (A new field inside `game.battle`, like `reinforcements` this session, needs none of this: older saves without it read as "none coming".)

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v33` (this slice) |
| Save format | version 18. This slice added only flags, and `battle.reinforcements`. |
| Tests | 452 passing: rules 88, combat 68, saves 69, story 17, levels 22, dungeon 108, spells 34, classes 46 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–4 (heroes stop at 2,700 XP) |
| Story | Chapters 1 and 2 complete; Chapter 3 beats 1–2. Every path ends at the open great gate (`ch3_gate.into_the_dark`): "Go down into the Kings' Barrow, find Garrick, and stop the Choir's hymn. (The rest of Act I is still being written.)" |

Built this session (Rob's choices, Oct 12, 2026: Nettle covers the approach; Varrow's watch holds back stragglers; two maps, one per level; the Rival is at the sluice wheel):
- **Entry:** `ch2_eve.watch` now goes on to `ch3_dark_moon` (no more END there), which sets the aim at its top so old saves get it too. Old end: `{ scene: 'ch2_eve', continueAt: 'ch3_dark_moon' }`.
- **Beat 1, `ch3_dark_moon`:** one choice ("Wait out the day…"), then the day, the ridge at night, Varrow's watch at the cairns (`varrow_rallied`) or a warning about stragglers, Garrick, a Rival, why the great gate, Vesk's lookout (`vesk_warned`) and Nettle's din (`nettle_rallied`) drawing him off. One choice on: "Go down into the bowl, to the great gate".
- **Beat 2, `ch3_gate`:** sets `gate_guardians_woken` (warned and no goblins) or `gate_unseen`, and `odda_at_the_gate` / `fen_at_the_gate`. Room `kings-barrow/forecourt`. Ways past: ward-word; Religion 13 (10 with Odda); History 13; a Dwarf's pivot (asleep only); Strike before they wake (`#surprise`, asleep only) or Fight them (awake). Kneeling or the pivot gives 400 XP. Fate's Mercy (`gate_fates_mercy`): robbed, long rest, then they kneel. Flags: `gate_ward_word`, `gate_old_forms`, `gate_words_of_passage`, `gate_pivoted`, `gate_guardians_knelt`, `gate_guardians_destroyed`, `gate_opened`, `odda_fell_at_the_gate`, `fen_fell_at_the_gate`.
- **Data:** `animated-armor` in `data/srd/monsters.js` (Blindsight noted as not played); its sprite (humanoid sheet, row 4, col 3) and the `sealing-stone` tile (a new `door` sheet, `Objects/Door0.png`) in `data/campaign/sprites.js`; the `kings-barrow` dungeon (one room so far) in `data/campaign/dungeons.js`; the `barrow-gate` encounter, with the sealing stone as onlookers, in `data/campaign/encounters.js`.
- **Engine:** plain reinforcements in `js/engine/combat/battle.js` (`reinforcementsDue`, `reinforcementsArrive`, `reinforcementsText`; `objectiveText` warns until they come). Quick Resolve is never offered for a fight with them (`resolve.js`).

## 4. The next slice

**Chapter 3, beat 3: the Hall of Champions.** (STORY.md, Chapter 3.) The rest of the upper barrow's map.
- **Where it starts:** `ch3_gate.into_the_dark` ends with `-> END`. Replace it with beat 3 (a new knot, maybe in a new `story/act-1/ch3-hall.ink`), and add `{ scene: 'ch3_gate', continueAt: '<beat 3>' }` to `data/campaign/story-continues.js`. Update the saves tests "Old ends: …", which jump to `ch3_gate.into_the_dark` as today's end (four of them), and the dungeon tests that assert `cards(game)` is `[]` at the open gate (ward-word, Fate's Mercy).
- **The map:** add rooms below the forecourt in `kings-barrow`. The forecourt's doorway is row 8, squares (3, 8) and (4, 8): already floor (`G`), with the sealing stone drawn there as figures until `gate_opened`. The next room's band starts on row 8, and the forecourt gets `exits: { <room>: [{ x: 3, y: 8 }, { x: 4, y: 8 }] }` (the dungeon test checks doorways sit on a band's first or last row and are standable). The fight at the gate puts the stone back as onlookers, so it stays in the way there.
- **Beat 3's pieces** (STORY.md): a pressure-plate dart corridor (a trap: DESIGN.md says traps work as in the rules, and damage outside a fight that drops you to 0 means death saves with nobody to help); the oath-wall (History or Arcana, a bonus for a Sage) whose champions' names matter in beat 5 (calling the Wight, Dame Aveline, by name); and a temptation to loot the graves (Wealth; Odda dislikes it).
- **Questions worth putting to Rob first:**
  - The champions on the oath-wall: how many, and their names (Dame Aveline must be one; check new names against the cast and `names.js`, per STORY.md's "Every character has their own name").
  - "It raises the Whisper": the Whisper is Phase 3 (Act II). Keep a flag now (`looted_the_champions`) and count it later, or start a hidden Whisper score now?
  - The dart corridor: a Perception or Investigation check to spot the plates first, then a Dexterity save for the darts? How much damage at level 4?
  - What Detect Magic (Odda prepares it from level 4) should show in the hall: the oath-wards' glow, or a hidden way?
- **Later in Chapter 3, still to decide:** the Ogre Zombie (beat 4, not in `monsters.js` yet), the Rival's stat block as an ally in the chantry (a Scout? a Bandit Captain without the crossbow?), foe spellcasting for the chantry's Cultist Fanatic (beat 5), and level 5 for the four classes and the companions (Chapter 3 ends there).

Smaller follow-ups noted along the way (each could be its own slice):
- **Blindsight** (Animated Armor, 60 ft) isn't played: a hidden hero or Fen stays hidden from the guardians. Playing it touches `sees`, the hidden Advantage/Disadvantage lines and the foes' targeting in `battle.js` (the `variant` note in `monsters.js` says so).
- **Foe spellcasting** (for the chantry): the Cultist Fanatic's Command, Hold Person and Spiritual Weapon, used against the party. Rhosyn's `variant` note in `data/srd/monsters.js` says what's missing.
- **Level 5** for the four classes and the companions: Extra Attack, level 3 spells, Sneak Attack 3d6, and so on.
- **Cairnfield's threads:** `rhosyn_lives` should make her the Fanatic in the chantry; `tobin_freed` could bring Tobin back with the barrow's back ways. (`vesk_warned` is now used at the gate.)
- **Names are unique** (Rob, Oct 12, 2026; STORY.md, "Every character has their own name"). Left alone as not quite clashes (Rob can say otherwise): Reeve Corbin and Tobin, Orrin (Juniper's mentor) and King Osric, Factor Penhallow and Morwen Tallow.
- **Raising:** the great candle is spent once used (`flame_spent`). A companion who dies after Bramblegate (now including at the gate) lies dead until Act II's temples; Chapter 3's feast in Bramblegate could offer something.
- **Level 4:** Magic Initiate's "Spell Change" and the Wizard's and Cleric's cantrip swap on a level-up aren't built. Skilled picks skills only (no tools yet). Grappler waits for grappling. Odda's AI never casts Resistance.
- **Allies:** Odda's spells (healing, Bless) don't reach the soldiers: her AI is for the party only. Allies die at 0 Hit Points with no death saves.
- **Flags for later:** `regency_favour`, `varrow_holds_cairns` (Chapter 3 uses `varrow_rallied`), `promised_nettle_warren` (Varrow may mind), `owe_nettle`, `rival_taken` (beat 4), `league_deal`, `league_refused`, `league_wants_crowns`, `met_penhallow` (Act II), `mentor_warned` and `sibling_letter` (Act II's Bond slot), `knows_oath_wards`, `fen_returned`, `ford_fell` and `ford_abandoned`, the Crane flags, `odda_told_of_emberdeep` and `odda_means_to_go_home` (Chapter 6), `fen_told_of_ledger`, `fen_just_arithmetic` and `heard_of_precentor_signet` (Chapter 11). **Gaunt** may come back (`gaunt_spared`, `hunters_backed_off`, `hunters_faced_down`, `hunters_fled`, `fen_sold`, `fen_left_behind`).
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight.
- The pixel font has no "−" (minus sign), so a negative modifier such as Dexterity 8 (−1) shows as "(_1)" in the score lists (creation and the level-up). Worth a look: a plain hyphen, or a font with the glyph.
- A DC 12 or 13 check shows as "Easy" on its card (the ladder is Easy 10, Medium 15). The gate's History 13 shows "History · Easy". Working as designed, but Rob may want to know.
- The barrow's flanks on the forecourt map use the `barrow` hill picture, which reads more like a bush than a mound. A better tile could come with the hall's map.

## 5. How the companion, ally and fight code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...}, 4: {...} }` changes (`subclassId`, `cantrips`, `prepared`, `levelFeats`).
  - `tactic`, `likes`, `dislikes`; the `tactics` list; `approvalBands` (likes 3, dislikes −2).
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`. A companion who dies stays in the party with `fallen: true` until raised.
  - `companionCharacter(id, level)` builds their sheet at the hero's level (never stored), capped at the class data's top level.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id.
  - Also: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `raiseMember`, `approve`, `feeling`, `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 3,100 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`). A hymn's risen dead and reinforcements are pushed on the end, and act last in the round.
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)` (hero or companion: they have character sheets); `c.ally`; `c.side === 'hero'`. Foes and allies use their monster's stat block.
  - **Lists:** `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`.
  - **Wards** (`WARDS`): `blessed`, `sanctuary`, `shield-of-faith`, `resisting`; `castWard`; damage to the party goes through `takeHit` (the hero) and `companionHit`, both of which call `resistanceCut` first.
  - **Twists:** the hymn (`hymnRises`, `hymnHurt`, `singerOf`) and reinforcements (`reinforcementsDue` at the start, `reinforcementsArrive` at each new round), both announced by `objectiveText`.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn`; `friendsFor` and `forAllies` (healing, potions and Lesser Restoration reach them; wards don't); `finishBattle` records `lastBattle.alliesAlive`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. It looks only at the party, never at allies.
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `likes_you`, `dislikes_you`, `companion_alive`, `raise_companion`, `companion_can_cast`, `companion_cast`, `can_pay`, `pay`, `allies_standing`, `ally_standing`, `has_bond`, `bond_name`, `xp_milestone` are in `js/engine/story/externals.js`, declared in `story/externals.ink`. `lies_in_state(id)` is an Ink function in `ch2-temple.ink`.

## 6. Running the tests

The test pages run in the browser; there is no Node or Python on Rob's PC. Start the preview server named `questbound` (`.claude/launch.json` runs `tools/serve.ps1`; it uses port 8000 if it's free, otherwise another port). Then, in the Browser pane on that address (a test page such as `/tests/levels.html`), define this with the JavaScript tool:

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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds; two calls of about 40 seconds each were enough this session). Run it from any test page except `/tests/saves.html` (such as `/tests/levels.html`): the save checks run twice at once, as the top page and in a frame, fight over their test database ("The database connection is closing").

- **Chapter 3:** `tests/dungeon-tests.js`, at the end: `atTheDarkMoon(seed, { character, flags, odda, fen })` jumps to `ch3_dark_moon`; `toTheGate(game)` waits out the day and goes down to the gate; `settleGate(game, start, { won, setUp })` settles the gate fight. `dwarf` is the Champion as a Dwarf; `gateRoom()` is the forecourt. Fight checks use `warrenFight('barrow-gate', champion)`.
- **Beat 8:** `atTheEve(seed, { character, flags, odda, fen, approval: { odda, fen }, xp })` jumps to `ch2_eve`; `toTheCamp(game)` takes the path the flags say.
- **Beat 6:** `homeFromCairnfield(seed, { character, flags, odda, fen, fallen, gold })` jumps to `ch2_homeward`; `throughTheTemple(game, judgement)` and `toTheMorning(game, judgement)`.
- **Cairnfield:** `atCairnfield(seed, { character, flags, odda, fen, items })`; `upToTheRidge(game)`; `settleCamp(game, start, { won, fled, setUp })`. Sneak with a hero who isn't in Chain Mail (Stealth Disadvantage), and fail checks with a non-Fighter (Tactical Mind): `lifeCleric` works.
- **Which page:** level-up checks are in `tests/level-up-tests.js`. Companions at every level, Resistance and the Cleric's fight spells are in `tests/classes-tests.js`. Monster checks, the encounter budget and the chapter scene playthroughs are in `tests/dungeon-tests.js`. Allies and deep water: `tests/combat-tests.js` (`fordFight`). Saves, migrations and old ends: `tests/saves-tests.js`. The Ink bridge, tags and story-text lint: `tests/story-tests.js` and `tests/rules-tests.js` (`parseTags`).
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice, set `game.rng = scriptedThen([...faces], seed)`. A Fighter's Tactical Mind can turn a failed check into a success, so test a failed check with a non-Fighter.
- **Text after a choice** is on the *next* page. Check it after `pick`, not before.
- **Loading modules by hand:** navigate to a fresh page first (such as `/tests/combat.html`); a page that loaded old code keeps it cached.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well (LF line endings). For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run a small perl replacer (the memory note "Shell editing traps" has it). **No shell heredocs at all**, even quoted ones: write files with the Write tool. In a Perl one-liner's replacement, `@word` is an array and vanishes.
- **Ink:**
  - Write `word{cond:, more}` (no space before the comma); choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}` (join with `+`); a line where someone speaks ends with `#speaker:id`.
  - A gather that only runs logic works as a labelled gather on its own line (`- (rallied)`), with the `~` line under it.
  - Tunnels across knots work (`-> ch2_temple ->` … `->->`), with choices inside, and the caller carries on after them. A tunnel that only prints (`-> speak_up ->`) before a `{ check(...): … }` puts the roll after its text, as you'd want.
  - A stitch's read count gates a follow-up choice: `* {odda_prior > 0 && likes_you("odda")} [...]`.
  - A `#combat:` choice's content runs after the fight, so text meant to come before the fight has to be on the page before the choice.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; class tables are garbled, with some digits as letters: `j` is 4, `k` is 5; negative modifiers show as `�c` and `�d`). Monsters by name (Animated Armor was around line 34796). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling in a PowerShell `System.Drawing` script, label each square, then Read the PNG. Knights in plate are on the humanoid sheet's row 4; stone doors on `Objects/Door0.png`.
- **Playing on screen:**
  - **Save slots:** on the port 8000 server, slot 1 holds Rob's old test game (Juniper, save version 15): never Continue it. On the title screen, the first "New game" is slot 1's; use slot 2's.
  - **When the Browser pane is hidden:** screenshots time out. To see the dungeon map or battle grid anyway, run a one-shot receiver from your scratchpad (a PowerShell `HttpListener` on another localhost port that saves a POSTed data URL as a PNG; the memory note "Hidden Browser pane traps" has the script), then in the page: `fetch('http://localhost:<port>/', { method: 'POST', mode: 'no-cors', body: canvas.toDataURL('image/png') })` on `canvas.dungeon-map-canvas` or `canvas.battle-grid`, and Read the PNG. Tap buttons with the JavaScript tool (`.choice-card` elements for choices). `[data-key="…"]` works for level-up controls: `hp-fixed`, `subclass-champion`, `feat-ability-score-improvement`, `increase-strength1`, `mastery-spear`, `finish`. The debug panel's toggle is `button.debug-toggle` (fixed-position, so `offsetParent` is null).
  - **Fights in a hidden pane:** walks wait on animation frames that never come. Press End turn, then reload the page and Continue the slot: the fight is saved as decided.
  - **Getting to a scene:** debug's **Set level** walks through every level-up screen, **Join** adds Odda or Fen, **Add flag** sets story flags (the input's `aria-label` is "Flag to add"), **Give gold**, and **Jump** reaches any knot (the select's `aria-label` is "Scene to jump to"). To fill a debug input from the JavaScript tool, set its value with the native value setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)`), then dispatch `input` and `change`. Debug has no control for approval or for killing a companion: edit the save (IndexedDB `questbound` → `slots`, key = slot number), `store.put(record)` with no key, reload, Continue.
  - **The playtest log:** clean your entries from a test page such as `/tests/levels.html`, not the game page: the game keeps the log in memory and writes its copy back.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP: Moderate means more than the Low budget and up to the Moderate one. The hymn's risen dead and reinforcements aren't counted on the card.
