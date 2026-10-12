# Handoff: starting the next slice

Written on Oct 12, 2026, at the end of the session that built Chapter 2, beat 6: the temple's
secret (Prior Crane's ledger, Odda's personal hook), the great candle that raises fallen
companions, and rallying help in Bramblegate. Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase.
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - Companions: "How companions work so far" (the great candle; approval, with every swing so far), and "Camp scenes" under "How companions work".
  - Rules and Progression: "Level 4: the Ability Score Improvement or a feat".
- `docs/STORY.md`: Chapter 2. Beats 1 to 7 are written up as built. Beat 8 (the eve of the barrow) has notes on **where it starts** (two ends, one per path) and **things to pick up**. Chapter 3, beat 1 lists the allies and the flags they come from.
- `story/act-1/ch2-temple.ink`: the last scene built, as a pattern: a journey home, a tunnel scene shared by two paths (`ch2_temple`, called from `ch2_homeward` and from Cairnfield's `news_home`), a discovery with several ways in that never dead-ends, a judgement with approval swings, and a morning hub of optional visits (`ch2_rally.about`) that ends on a choice to leave.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (he took all four this session).
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage: your sessions by `gameId`, and the scene entries you added at the end of `scenes`). Note the counts before you start (28 sessions and 49 scenes at the end of this session).
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js. A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`, as `levelFeats` did.

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v31` |
| Save format | version 18. Beat 6 added only flags. |
| Tests | 430 passing: rules 88, combat 68, saves 67, story 17, levels 22, dungeon 88, spells 34, classes 46 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–4 (heroes stop at 2,700 XP) |
| Story | Chapter 1 complete; Chapter 2 beats 1–7 written. If the Old Ford held, the story stops at Bramblegate's north gate the morning before the dark of the moon (`ch2_rally.north_for_now`: "Take the barrow road north, make camp near Cairnfield, and go down into the Kings' Barrow at the dark of the moon. (The rest of Chapter 2 is still being written.)"). If it fell, it stops after Cairnfield (`ch2_cairnfield.road_back`: "Make camp near Cairnfield, and go down into the Kings' Barrow before the dark of the moon."). |

Built this session (Rob's choices, Oct 12, 2026: the truth comes out through the missing map; Odda's reactions as below; Crane raises the fallen with the great candle; rallying is choices in Bramblegate):
- **The way home** (`ch2_homeward`): Cairnfield's `road_back` goes here if the Old Ford held (on the `ford_fell` path it still ends). A choice card, then the watch's supply cart, Pike at the gate at dusk, and `-> ch2_temple ->`, a night at the inn, and "Go out into the town at first light". Cairnfield's `news_home` (the `ford_fell` path) now runs the same: Varrow, `-> ch2_temple ->`, the inn, then `ch2_rally`.
- **The temple** (`ch2_temple`, a tunnel):
  - `vigil` / `the_rite`: anyone `lies_in_state(id)` (an Ink function at the end of the temple knot: in the party but not alive) is raised by the great candle (`raise_companion`, new), with `flame_spent`, `odda_raised`, `fen_raised`.
  - `the_map`, then `press`: no roll with `crane_knows_the_map` or `crane_hiding_something`; Insight 12; Odda's right to see the books; Fen at the chest (Fen +1); Thieves' Tools 13 without Fen; or "Leave it, for now" (Crane brings the ledger to the inn).
  - `ledger` (`crane_secret_known`, 50 XP), then `judgement`: `exposed` (`crane_exposed`, `regency_favour`, 25 gold, no ward-word; Odda −1, Fen −1), `confession` (`crane_confessed`; Odda +2), `blackmail` (`crane_blackmailed`, 50 gold; Odda −2), `amends` (`crane_made_amends`; Odda +1, Fen +1). All but `exposed` go through `ward_word` (`knows_ward_word`: **Ysolde**, the first queen's name).
- **The rally** (`ch2_rally`): `about` is the hub. Varrow (held path only: `varrow_ready` if `varrow_holds_cairns`, else `varrow_ask`, Persuasion 12 or 15 if `varrow_wary`; sets `varrow_holds_cairns` and `varrow_rallied`), Nettle (if `goblins_at_mill`: `nettle_rallied`, maybe `promised_nettle_warren`; the honest answer is Odda +1), `nans_stall`, and the road north through `farewell` (Lark): `north_for_now` (END) or, if `ford_fell`, `ch2_cairnfield.road_north`.
- **Engine:**
  - `raiseMember(game, id)` in `party.js` (on their feet, full Hit Points, everything spent back); debug's Raise uses it too.
  - `raise_companion(id)` in `externals.js` / `externals.ink`, with the DM note `companionRaised` in `dm-voice.js` ("Odda lives again, at full Hit Points.").
  - A choice can fit two Drives: `#drive:faith #drive:kinship`. `parseTags` now returns `drives: []` (not `drive`), and the card shows "★ Your Drive" if any of them is the hero's.
  - Old ends can skip a path: a `story-continues.js` line can have `unlessFlag`. Cairnfield's line is `{ scene: 'ch2_cairnfield', continueAt: 'ch2_homeward', unlessFlag: 'ford_fell' }`.
- **The Old Ford:** on the `ford_fell` path a companion who died there now comes down "on the watch's handcart, with the news" (so they're in the temple when the party gets there that night).

## 4. The next slice

**Chapter 2, beat 8: the eve of the barrow.** (STORY.md, beat 8.) A camp scene the night before the party goes into the Kings' Barrow: companion conversations and a long rest. Then Chapter 3.
- **Where it starts:** two ends, one per path (STORY.md, beat 8, "Where it starts"):
  - Old Ford held: from `ch2_rally.north_for_now`. Replace its `-> END` with the road north and the camp. Add `{ scene: 'ch2_rally', continueAt: '<the eve>' }` to `story-continues.js`. (The page's scene there is `ch2_rally`.)
  - Old Ford fell: from `ch2_cairnfield.road_back` (the `ford_fell` branch). Replace its `-> END`, and add a second Cairnfield line **after** the existing one: `{ scene: 'ch2_cairnfield', continueAt: '<the eve>' }`. `pickUpOldEnd` takes the first match, so held saves still go to `ch2_homeward` and fell saves skip it (`unlessFlag`) and take the new line. Then drop "(The rest of Chapter 2 is still being written.)" from the aims that no longer end.
  - Update the saves test "Old ends: a save made where the story used to stop…", which jumps to `ch2_rally.north_for_now` as today's end.
- **The camp:** DESIGN.md says long rests in the wild open short camp scenes with companion conversations (1–3 minutes each). The Cairnfield sheepfold (`ch2_cairnfield.fold_talk`) is the pattern: questions that loop, and sleep ends it.
- **Things to pick up** (STORY.md, beat 8): the temple's secret (how Odda feels about what you did with Crane: `crane_confessed`, `crane_made_amends`, `crane_exposed`, `crane_blackmailed`), a raised companion's brush with death (`odda_raised`, `fen_raised`), who's coming tomorrow (`varrow_rallied`, `nettle_rallied`, `knows_ward_word`), the Rival taken into the barrow (`rival_taken`), and the miller.
- **Questions worth putting to Rob first:** what the conversations are about (Odda on her order and the Prior, Fen on the Choir and the Precentor, approval-gated lines?); whether approval should show anywhere yet (it's hidden); and whether the eve should hold anything else (a last chance to prepare spells, a watch in the night, a dream for the hero).

Then **Chapter 3, the Kings' Barrow** (STORY.md): under the dark moon the allies turn up, the barrow gate (the ward-word), the Hall of Champions, the flooded vault (Garrick), the Chantry of Ash (Vesk, Dame Aveline, the first shard).

Smaller follow-ups noted along the way (each could be its own slice):
- **Foe spellcasting** (for Chapter 3's chantry): the Cultist Fanatic's Command, Hold Person and Spiritual Weapon, used against the party. Rhosyn's `variant` note in `data/srd/monsters.js` says what's missing.
- **Cairnfield:** `rhosyn_lives` (slipped away, or Fate's Mercy) should make her the Fanatic in Chapter 3's chantry; `vesk_warned` could take away surprise at the barrow gate; `tobin_freed` could bring Tobin back with the barrow's back ways.
- **Tobin Reed:** Chapter 1's notice board has "WANTED: runaway bond-servant Tobin Reed, aged fourteen. Reward for his return from Master Fulke, tanner." Cairnfield's Tobin is "a cobbler's boy from Ashby", "sixteen or so". Probably the same boy: worth a word with Rob about which details to keep.
- **Raising:** the great candle is spent once used (`flame_spent`). A companion who dies after Bramblegate (the eve, Chapter 3) lies dead until Act II's temples; Chapter 3's feast in Bramblegate could offer something.
- **Level 4:** Magic Initiate's "Spell Change" (swap one of its spells on a level-up) and the Wizard's and Cleric's cantrip swap on a level-up aren't built. Skilled picks skills only (no tools yet). Grappler waits for grappling. Odda's AI never casts Resistance (she doesn't know it).
- **Allies:** Odda's spells (healing, Bless) don't reach the soldiers: her AI is for the party only. Allies die at 0 Hit Points with no death saves; Rob may want them to drop and be saveable instead.
- **Flags for later:** `regency_favour` (now also from exposing Crane) and `varrow_holds_cairns` (Chapter 3, beat 1), `promised_nettle_warren` (Varrow may mind), `rival_went_ahead` (rescue), `league_deal`, `league_refused`, `league_wants_crowns`, `met_penhallow` (Act II), `mentor_warned` and `sibling_letter` (Act II's Bond slot), `knows_oath_wards`, `fen_returned`, `ford_fell` and `ford_abandoned`, `crane_confessed` and the other Crane flags (Odda's personal quest goes on in Chapter 6, at Emberdeep).
- **Owing Nettle:** `owe_nettle` is still uncollected. **Gaunt** may come back (`gaunt_spared`, `hunters_backed_off`, `hunters_faced_down`, `hunters_fled`, `fen_sold`, `fen_left_behind`).
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight.
- The pixel font has no "−" (minus sign), so a negative modifier such as Dexterity 8 (−1) shows as "(_1)" in the score lists (creation and the level-up). Worth a look: a plain hyphen, or a font with the glyph.
- A DC 12 or 13 check shows as "Easy" on its card (the ladder is Easy 10, Medium 15). Working as designed, but Rob may want to know.

## 5. How the companion and ally code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...}, 4: {...} }` changes (`subclassId`, `cantrips`, `prepared`, `levelFeats`).
  - `tactic`, `likes`, `dislikes`; the `tactics` list. Odda's Bond is her mentor, Abbess Hulda (the mother-house), which the temple scene names.
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`. A companion who dies stays in the party with `fallen: true` until raised.
  - `companionCharacter(id, level)` builds their sheet at the hero's level (never stored), capped at the class data's top level.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id.
  - Also: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `raiseMember`, `approve`, `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 3,050 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`).
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)` (hero or companion: they have character sheets); `c.ally`; `c.side === 'hero'`. Foes and allies use their monster's stat block.
  - **Lists:** `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`.
  - **Wards** (`WARDS`): `blessed`, `sanctuary`, `shield-of-faith`, `resisting`; `castWard`; damage to the party goes through `takeHit` (the hero) and `companionHit`, both of which call `resistanceCut` first.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn`; `friendsFor` and `forAllies` (healing, potions and Lesser Restoration reach them; wards don't); `objectiveText`; `finishBattle` records `lastBattle.alliesAlive`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. It looks only at the party, never at allies.
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `companion_alive`, `raise_companion`, `companion_can_cast`, `companion_cast`, `can_pay`, `pay`, `allies_standing`, `ally_standing`, `has_bond`, `bond_name` are in `js/engine/story/externals.js`, declared in `story/externals.ink`.

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

- **Beat 6:** `tests/dungeon-tests.js`, at the end: `homeFromCairnfield(seed, { character, flags, odda, fen, fallen, gold })` jumps to `ch2_homeward` (with `knows_dark_of_moon`; `fallen` is companion ids who died); `throughTheTemple(game, judgement)` gets through the temple the quickest way; `toTheMorning(game, judgement)` goes from the judgement to the morning hub. `upToTheRidge` (Cairnfield) goes through the temple and the hub on the `ford_fell` path.
- **Cairnfield:** `atCairnfield(seed, { character, flags, odda, fen, items })` jumps to `ch2_cairnfield`; `upToTheRidge(game)` walks to the overlook; `settleCamp(game, start, { won, fled, setUp })` settles the fight from the choice starting `start`. Sneak with a hero who isn't in Chain Mail (Stealth Disadvantage), and fail checks with a non-Fighter (Tactical Mind).
- **Which page:** level-up checks (levels 2–4, feats, the Quick Start heroes at level 3 as `wren3`, `juniper3`, `posy3`, `sorael3`, and `wren4(levelFeats)`) are in `tests/level-up-tests.js`. Companions at every level, Resistance and the Cleric's fight spells are in `tests/classes-tests.js`. Monster checks, the encounter budget and the Chapter 1–2 scene playthroughs are in `tests/dungeon-tests.js` (`chapter2`, `atTheStocks`, `toTheFord(seed, { character, flags, odda, fen, gold })`, `readyAtTheFord`, `settleFord`, `readTheStone`). Allies and deep water: `tests/combat-tests.js` (`fordFight`). Saves, migrations and old ends: `tests/saves-tests.js`. The Ink bridge, tags and story-text lint: `tests/story-tests.js` and `tests/rules-tests.js` (`parseTags`).
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice, set `game.rng = scriptedThen([...faces], seed)`. A Fighter's Tactical Mind can turn a failed check into a success, so test a failed check with a non-Fighter.
- **Text after a choice:** a line that comes after a choice is on the *next* page. Check it after `pick`, not before (this session's one test bug).
- **Loading modules by hand:** navigate to a fresh page first (such as `/tests/combat.html`); a page that loaded old code keeps it cached.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well (LF line endings). For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run `perl replace.pl target spec` (the script is in the memory note "Shell editing traps"). Shell heredocs break on text with quotes and ’: write spec files with the Write tool.
- **Ink:**
  - Write `word{cond:, more}` (no space before the comma); choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}` (join with `+`); a line where someone speaks ends with `#speaker:id`.
  - A gather that only runs logic works as a labelled gather on its own line (`- (rallied)`), with the `~` line under it.
  - Tunnels across knots work (`-> ch2_temple ->` … `->->`), with choices inside, and the caller carries on after them.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; class tables are garbled, with some digits as letters: `j` is 4, `k` is 5). Feats are around line 13100, spells by name (`ResistanceAbjuration Cantrip`), Spellcasting Services around line 15024. If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling in a PowerShell `System.Drawing` script, label each square, then Read the PNG.
- **Playing on screen:**
  - **Save slots:** on the port 8000 server, slot 1 holds Rob's old test game (Juniper, save version 15): never Continue it. On the title screen, the first "New game" is slot 1's; use slot 2's.
  - **When the Browser pane is hidden:** screenshots worked this session. Tap buttons with the JavaScript tool (`.choice-card` elements for choices; a d20 waiting to be tapped is a button whose text is its face, such as "20"; then "Reroll ★" or "Keep the roll"). `[data-key="…"]` works for level-up controls: `hp-fixed`, `feat-ability-score-improvement`, `increase-wisdom1`, `level-up-cantrips-resistance`, `mastery-longbow`, `finish`. The debug panel's toggle is `button.debug-toggle` (it's fixed-position, so `offsetParent` is null). A walk on the grid waits on animation frames: press Skip, or reload and Continue.
  - **Getting to a scene:** debug's **Set level** walks through every level-up screen, **Join** adds Odda or Fen, **Add flag** sets story flags (the input's `aria-label` is "Flag to add"), **Give gold**, and **Jump** reaches any knot (the select's `aria-label` is "Scene to jump to"). To make a companion fallen, edit the save: IndexedDB `questbound` → `slots`, key = slot number, `game.party[i].fallen = true` and `hp = 0`, `store.put(record)` with no key, reload, Continue.
  - **Ending a fight quickly:** edit the save the same way, set the foes' `hp` to 0 except one at 1 (move it beside the hero with its `pos`; set `escaped: true` on one to test a foe who ran), reload, Continue, and finish that one off (debug's Force next d20 makes the hit sure).
  - **The playtest log:** clean your entries from a test page such as `/tests/levels.html`, not the game page: the game keeps the log in memory and writes its copy back.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP: Moderate means more than the Low budget and up to the Moderate one (650 XP is Moderate for three level 3 characters: Low 450, Moderate 675; 700 would be High). The hymn's risen dead aren't counted.
