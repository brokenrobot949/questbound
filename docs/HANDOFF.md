# Handoff: starting the next slice

Written on Oct 12, 2026, at the end of the session that finished Chapter 2: beat 6 (the temple's
secret, the great candle, rallying help in Bramblegate) and beat 8 (the eve of the barrow, with
approval-gated companion talks and a level 4 milestone). Start a new Claude Code session in this
repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase (Act I ends with Chapter 3).
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - World and Exploration, "Dungeons" (the dungeon map; Under Dunn's Mill and Brackenhollow are the patterns).
  - Combat, "Encounter design" (budgets, twists, `sizedFor`), "Allies who aren't companions" (Varrow's watch may fight beside you), and the hymn.
  - Rules and Progression: "Milestones" (new), and levels 1–4 (heroes stop at 4 for now; Chapter 3 ends at level 5, which isn't built).
  - Companions: approval and how it shows (`likes_you` / `dislikes_you`).
- `docs/STORY.md`: **Chapter 3 · The Kings' Barrow**, beats 1–7, and Chapter 2's beat 7 "For Chapter 3" notes (Rhosyn, `vesk_warned`, Tobin). Chapter 2 is written up as built.
- `story/act-1/ch2-eve.ink`: the last scene built, as a pattern for talks that loop and open up with approval. `story/act-1/ch2-temple.ink` for a tunnel scene shared by two paths, a discovery that never dead-ends, and a hub of optional visits.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (he took all eight this session).
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
| Offline version | `questbound-v32` (Rob committed beat 6 as "p2s8" with v31; beat 8 is v32) |
| Save format | version 18. Beats 6 and 8 added only flags. |
| Tests | 440 passing: rules 88, combat 68, saves 68, story 17, levels 22, dungeon 97, spells 34, classes 46 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–4 (heroes stop at 2,700 XP) |
| Story | Chapters 1 and 2 complete. Every path ends at dawn after the eve of the barrow (`ch2_eve.watch`): "Go down into the Kings' Barrow tonight, under the dark of the moon. (The rest of Act I is still being written.)" |

Built this session, part 2: **the eve of the barrow** (`ch2_eve`, Rob's choices, Oct 12, 2026: one talk each plus one that needs approval; a level 4 milestone; approval stays hidden; a quiet watch with no rolls):
- **Entry:** `ch2_rally.north_for_now` (Old Ford held) and `ch2_cairnfield.road_back` (fell) both go to `ch2_eve`, which opens with one choice: "Follow the barrow road north, onto the moor" (`back_north`) or "Lie low near Cairnfield until the dark of the moon" (`lie_low`). Both reach the sheepfold (`camp`).
- **Talks** (`talk`, a loop, each once): `odda_prior` (by `crane_confessed` / `crane_made_amends` / `crane_exposed` / `crane_blackmailed`) then `odda_feels`; `odda_dead` (if `odda_raised`); `odda_emberdeep` (after `odda_prior`, if `likes_you("odda")`: `odda_told_of_emberdeep`); `fen_precentor` (`heard_of_precentor_signet`) then `fen_feels`; `fen_dead` (if `fen_raised`); `fen_ledger` (if `likes_you("fen")`: `fen_told_of_ledger`); `tomorrow`. Disliked: `odda_means_to_go_home`, `fen_just_arithmetic`.
- **The watch, the rest and the milestone:** `watch` (no roll), `long_rest()`, `xp_milestone(4)`, dawn, the aim, END.
- **Engine:** `feeling(game, id)` in `party.js` ('likes', 'dislikes', 'neutral', from `approvalBands` in `data/campaign/companions.js`: likes 3, dislikes −2); story commands `likes_you(id)`, `dislikes_you(id)` (only for a companion with the hero and alive) and `xp_milestone(level)` (DM note `xpMilestone`). The level-up screen opens by itself afterwards (`levelUpReady`).
- **Old ends:** `{ scene: 'ch2_rally', continueAt: 'ch2_eve' }` and a second Cairnfield line, `{ scene: 'ch2_cairnfield', continueAt: 'ch2_eve' }`, after the `unlessFlag: 'ford_fell'` one (`pickUpOldEnd` takes the first match).

Built this session, part 1: **the temple's secret and rallying help** (beat 6; STORY.md has every choice):
- `ch2_homeward` (Old Ford held: the supply cart home), `ch2_temple` (a tunnel, also called from Cairnfield's `news_home` on the `ford_fell` path: the great candle raises anyone who `lies_in_state(id)`; the missing map; the ledger; four judgements; the ward-word **Ysolde**), and `ch2_rally` (Varrow, Nettle, Nan's stall, Lark at the gate).
- Engine: `raiseMember` and `raise_companion`; a choice can fit two Drives (`#drive:faith #drive:kinship`, `parseTags` returns `drives: []`); `unlessFlag` on old ends.

## 4. The next slice

**Chapter 3, beats 1 and 2: under the dark moon, and the barrow gate.** (STORY.md, Chapter 3.) The start of the Kings' Barrow, Act I's last dungeon.
- **Where it starts:** `ch2_eve.watch` ends at dawn. Replace its `-> END` with Chapter 3 (a new `story/act-1/ch3-….ink`), and add `{ scene: 'ch2_eve', continueAt: '<chapter 3>' }` to `story-continues.js`. Update the saves test "Old ends: a save made where the story used to stop…", which jumps to `ch2_eve.watch` as today's end, and the two Cairnfield/north-gate old-end tests that also jump there.
- **Beat 1, the allies turn up** (STORY.md lists the flags): Nettle's goblins make a diversion (`nettle_rallied`), Varrow's watch holds the outer cairns (`varrow_holds_cairns`), the ward-word (`knows_ward_word`), and a Rival (`rival_taken`). Decide with Rob what each actually changes (fewer foes in a fight, no reinforcements, a way past a room, a scene beat only?).
- **Beat 2, the barrow gate:** two Animated Armors (CR 1, 200 XP each; not in `data/srd/monsters.js` yet: transcribe from SRD 5.2.1). 400 XP is Low for a level 4 party of three (Low 750, Moderate 1,125). Speak the ward-word, or pass Religion or History, and they kneel; a Dwarf sees the sealing stone pivots. `vesk_warned` could take away surprise.
- **The dungeon map:** the Kings' Barrow on the dungeon map (`data/campaign/dungeons.js`), like Brackenhollow and Under Dunn's Mill. Needs new tiles or reuse; DawnLike sprites for the armors.
- **Questions worth putting to Rob first:** what each ally does in play; how big the barrow map is (one map for all of Chapter 3, or a map per level); whether to build foe spellcasting first (the chantry's Cultist Fanatic needs it, beat 5); and how level 5 fits (Chapter 3 ends at level 5, but the rules data stops at 4).

Smaller follow-ups noted along the way (each could be its own slice):
- **Foe spellcasting** (for Chapter 3's chantry): the Cultist Fanatic's Command, Hold Person and Spiritual Weapon, used against the party. Rhosyn's `variant` note in `data/srd/monsters.js` says what's missing.
- **Level 5** for the four classes and the companions (Chapter 3 ends there): Extra Attack, level 3 spells, Sneak Attack 3d6, and so on.
- **Cairnfield:** `rhosyn_lives` (slipped away, or Fate's Mercy) should make her the Fanatic in Chapter 3's chantry; `vesk_warned` could take away surprise at the barrow gate; `tobin_freed` could bring Tobin back with the barrow's back ways.
- **Names are unique** (Rob, Oct 12, 2026; STORY.md, "Every character has their own name"): no shared names, none a letter apart, no rhymes. Renamed for it: Chapter 1's runaway on the notice board (now Davy Thrush; Tobin Reed is only the Cairnfield acolyte), the soldier the ghoul took at the Old Ford (Pell, now Rufus, beside Nell), and in STORY.md only: Thane Solveig Ironmantle (was Hulda, like Odda's Abbess Hulda), Knight-Captain Beatrix Marchbank (was Edda, like Odda), Lord Regent Everard Hale (was Corvin, like Corbin), Magister Orla Kettering (was Venn, like Fen), Silas Dray (was Pell Marrick), Ithrien Starling (was Vale, like Hale) and Lucan Ravensworth (was Morrow, like Varrow). The name tables in `names.js` lost every cast and Quick Start name and their near-misses. Left alone as not quite clashes (Rob can say otherwise): Reeve Corbin and Tobin, Orrin (Juniper's mentor) and King Osric, Factor Penhallow and Morwen Tallow.
- **Raising:** the great candle is spent once used (`flame_spent`). A companion who dies after Bramblegate lies dead until Act II's temples; Chapter 3's feast in Bramblegate could offer something. On the `ford_fell` path, a companion who dies at Cairnfield is sent home and isn't at the eve.
- **Level 4:** Magic Initiate's "Spell Change" and the Wizard's and Cleric's cantrip swap on a level-up aren't built. Skilled picks skills only (no tools yet). Grappler waits for grappling. Odda's AI never casts Resistance.
- **Allies:** Odda's spells (healing, Bless) don't reach the soldiers: her AI is for the party only. Allies die at 0 Hit Points with no death saves.
- **Flags for later:** `regency_favour`, `varrow_holds_cairns`, `promised_nettle_warren` (Varrow may mind), `rival_went_ahead` / `rival_taken` (rescue), `league_deal`, `league_refused`, `league_wants_crowns`, `met_penhallow` (Act II), `mentor_warned` and `sibling_letter` (Act II's Bond slot), `knows_oath_wards`, `fen_returned`, `ford_fell` and `ford_abandoned`, the Crane flags, `odda_told_of_emberdeep` and `odda_means_to_go_home` (Chapter 6), `fen_told_of_ledger`, `fen_just_arithmetic` and `heard_of_precentor_signet` (Chapter 11).
- **Owing Nettle:** `owe_nettle` is still uncollected. **Gaunt** may come back (`gaunt_spared`, `hunters_backed_off`, `hunters_faced_down`, `hunters_fled`, `fen_sold`, `fen_left_behind`).
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight.
- The pixel font has no "−" (minus sign), so a negative modifier such as Dexterity 8 (−1) shows as "(_1)" in the score lists (creation and the level-up). Worth a look: a plain hyphen, or a font with the glyph.
- A DC 12 or 13 check shows as "Easy" on its card (the ladder is Easy 10, Medium 15). Working as designed, but Rob may want to know.
- The eve's milestone note says "a good place to stop" before the level-up screen opens (the long rest's note comes first). Harmless: the level-up waits in the save.

## 5. How the companion and ally code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...}, 4: {...} }` changes (`subclassId`, `cantrips`, `prepared`, `levelFeats`).
  - `tactic`, `likes`, `dislikes`; the `tactics` list; `approvalBands` (likes 3, dislikes −2).
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`. A companion who dies stays in the party with `fallen: true` until raised.
  - `companionCharacter(id, level)` builds their sheet at the hero's level (never stored), capped at the class data's top level.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id.
  - Also: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `raiseMember`, `approve`, `feeling`, `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 3,050 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`).
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)` (hero or companion: they have character sheets); `c.ally`; `c.side === 'hero'`. Foes and allies use their monster's stat block.
  - **Lists:** `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`.
  - **Wards** (`WARDS`): `blessed`, `sanctuary`, `shield-of-faith`, `resisting`; `castWard`; damage to the party goes through `takeHit` (the hero) and `companionHit`, both of which call `resistanceCut` first.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn`; `friendsFor` and `forAllies` (healing, potions and Lesser Restoration reach them; wards don't); `objectiveText`; `finishBattle` records `lastBattle.alliesAlive`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. It looks only at the party, never at allies.
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `likes_you`, `dislikes_you`, `companion_alive`, `raise_companion`, `companion_can_cast`, `companion_cast`, `can_pay`, `pay`, `allies_standing`, `ally_standing`, `has_bond`, `bond_name`, `xp_milestone` are in `js/engine/story/externals.js`, declared in `story/externals.ink`.

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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds; waiting 42 seconds inside the same call has been enough lately). Run it from any test page except `/tests/saves.html` (such as `/tests/levels.html`): the save checks run twice at once, as the top page and in a frame, fight over their test database ("The database connection is closing").

- **Beat 8:** `tests/dungeon-tests.js`, at the end: `atTheEve(seed, { character, flags, odda, fen, approval: { odda, fen }, xp })` jumps to `ch2_eve`; `toTheCamp(game)` takes the path the flags say.
- **Beat 6:** `homeFromCairnfield(seed, { character, flags, odda, fen, fallen, gold })` jumps to `ch2_homeward`; `throughTheTemple(game, judgement)` and `toTheMorning(game, judgement)`.
- **Cairnfield:** `atCairnfield(seed, { character, flags, odda, fen, items })`; `upToTheRidge(game)`; `settleCamp(game, start, { won, fled, setUp })`. Sneak with a hero who isn't in Chain Mail (Stealth Disadvantage), and fail checks with a non-Fighter (Tactical Mind).
- **Which page:** level-up checks are in `tests/level-up-tests.js`. Companions at every level, Resistance and the Cleric's fight spells are in `tests/classes-tests.js`. Monster checks, the encounter budget and the Chapter 1–2 scene playthroughs are in `tests/dungeon-tests.js` (`chapter2`, `atTheStocks`, `toTheFord`, `readyAtTheFord`, `settleFord`, `readTheStone`). Allies and deep water: `tests/combat-tests.js` (`fordFight`). Saves, migrations and old ends: `tests/saves-tests.js`. The Ink bridge, tags and story-text lint: `tests/story-tests.js` and `tests/rules-tests.js` (`parseTags`).
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice, set `game.rng = scriptedThen([...faces], seed)`. A Fighter's Tactical Mind can turn a failed check into a success, so test a failed check with a non-Fighter.
- **Text after a choice** is on the *next* page. Check it after `pick`, not before.
- **Loading modules by hand:** navigate to a fresh page first (such as `/tests/combat.html`); a page that loaded old code keeps it cached.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well (LF line endings). For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run `perl replace.pl target spec` (the script is in the memory note "Shell editing traps"). Shell heredocs break on text with quotes and ’: write spec files with the Write tool. In a Perl one-liner's replacement, `@word` is an array and vanishes: a marker like `@@MARK@@` came out as `@@@`.
- **Ink:**
  - Write `word{cond:, more}` (no space before the comma); choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}` (join with `+`); a line where someone speaks ends with `#speaker:id`.
  - A gather that only runs logic works as a labelled gather on its own line (`- (rallied)`), with the `~` line under it.
  - Tunnels across knots work (`-> ch2_temple ->` … `->->`), with choices inside, and the caller carries on after them.
  - A stitch's read count gates a follow-up choice: `* {odda_prior > 0 && likes_you("odda")} [...]`.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; class tables are garbled, with some digits as letters: `j` is 4, `k` is 5). Feats are around line 13100, spells by name (`ResistanceAbjuration Cantrip`), Spellcasting Services around line 15024, monsters by name. If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling in a PowerShell `System.Drawing` script, label each square, then Read the PNG.
- **Playing on screen:**
  - **Save slots:** on the port 8000 server, slot 1 holds Rob's old test game (Juniper, save version 15): never Continue it. On the title screen, the first "New game" is slot 1's; use slot 2's.
  - **When the Browser pane is hidden:** screenshots worked this session. Tap buttons with the JavaScript tool (`.choice-card` elements for choices; a d20 waiting to be tapped is a button whose text is its face, such as "20"; then "Reroll ★" or "Keep the roll"). `[data-key="…"]` works for level-up controls: `hp-fixed`, `feat-ability-score-improvement`, `increase-wisdom1`, `level-up-cantrips-resistance`, `mastery-longbow`, `finish`. The debug panel's toggle is `button.debug-toggle` (it's fixed-position, so `offsetParent` is null). A walk on the grid waits on animation frames: press Skip, or reload and Continue.
  - **Getting to a scene:** debug's **Set level** walks through every level-up screen, **Join** adds Odda or Fen, **Add flag** sets story flags (the input's `aria-label` is "Flag to add"), **Give gold**, and **Jump** reaches any knot (the select's `aria-label` is "Scene to jump to"). Debug has no control for approval or for killing a companion: edit the save (IndexedDB `questbound` → `slots`, key = slot number: `game.party[i].approval`, or `fallen = true` and `hp = 0`), `store.put(record)` with no key, reload, Continue. Don't reload from inside the same script that does the next steps: the page navigates away and the script is cut off.
  - **Ending a fight quickly:** edit the save the same way, set the foes' `hp` to 0 except one at 1 (move it beside the hero with its `pos`; set `escaped: true` on one to test a foe who ran), reload, Continue, and finish that one off (debug's Force next d20 makes the hit sure).
  - **The playtest log:** clean your entries from a test page such as `/tests/levels.html`, not the game page: the game keeps the log in memory and writes its copy back.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP: Moderate means more than the Low budget and up to the Moderate one (650 XP is Moderate for three level 3 characters: Low 450, Moderate 675; 700 would be High). The hymn's risen dead aren't counted.
