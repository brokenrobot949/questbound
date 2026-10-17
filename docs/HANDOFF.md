# Handoff: starting the next slice

Written on Oct 17, 2026, at the end of the session that built foe spellcasting: the Cultist
Fanatics (Cantor Vesk, Sister Rhosyn) now cast Hold Person, Command and Spiritual Weapon at the
party. Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase (Act I ends with Chapter 3).
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - Combat: "Chapter 3's monsters" (the Wight, the chantry, calling a foe by name), **"Foes who cast spells"** (built this session), "Encounter design" (the hymn, Reinforcements), "Allies who aren't companions" (the Rival).
  - World and Exploration, "Dungeons": the Kings' Barrow (both maps built), rooms that change with the story, traps.
  - Rules and Progression: "Milestones", and levels 1–4 (heroes stop at 4 for now; Chapter 3 ends at level 5, which isn't built).
  - The Whisper: dark choices set flags now, counted when the Whisper is built in Phase 3.
- `docs/STORY.md`: **Chapter 3 · The Kings' Barrow**. Beats 1 to 5 are written up as built; beats 6–7 are the plan. Beat 5 lists the chantry's flags.
- `story/act-1/ch3-chantry.ink`: the last scene built (`ch3_chantry`): two routes in, an approach that depends on whether the foe was warned, a boss fight with a twist the hero triggers on the grid, and outcomes read back with `foe_turned` and `ally_standing`. `ch3-vault.ink` and `ch3-hall.ink` are the patterns for Fate's Mercy by capture, traps, and spells in scenes.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (he took all four this session, and all eleven the session before).
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage: your sessions by `gameId`, and the scene entries you added at the end of `scenes`). **Check which port the preview server got:** each port has its own saves and log. This session's server was on port 8000; in the Browser pane its storage started empty (no saves, an empty log) and was left empty. Rob's own browser has its own storage, with his test games in it.
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js. A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`, as `levelFeats` did. (A new field inside `game.battle` needs none of this: older saves without it read as "none".)

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v37` (foe spellcasting; the chantry went out as v36) |
| Save format | version 18, unchanged. This slice added only fields inside a fight (a foe's `spellsCast` and `concentration`, `turnState.commanded`, the 'halt' effect, `by` on a Command): older saves without them read as "none". |
| Tests | 497 passing: rules 89, combat 68, saves 72, story 17, levels 22, dungeon 149, spells 34, classes 46 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–4 (heroes stop at 2,700 XP) |
| Story | Chapters 1 and 2 complete; Chapter 3 beats 1–5. Every path ends with Cantor Vesk dying at the altar (`ch3_chantry.vesk_dying`): "See what Cantor Vesk was reaching for. (The rest of Act I is still being written.)" |

Built this session, foe spellcasting (Rob's choices, Oct 17, 2026: Grovel and Halt only; Hold Person first; Heroic Inspiration spent by itself against Hold Person; companions free the held, then go for the caster):
- **Data:** the Cultist Fanatic in `data/srd/monsters.js` has `spellcasting` (`ability`, `saveDc` 12, `attackBonus` 4, `atWill`, and `spells`: Hold Person 1/day, Command 2/day with `words: ['grovel', 'halt']`, Spiritual Weapon 2/day as a Bonus Action with its `look`). Its `variant` note now says only Grovel and Halt are used, and that Light and Thaumaturgy do nothing in a fight yet.
- **Engine** (`js/engine/combat/battle.js`, section "A foe's spells"): `casterTurn` (Hold Person, then the Bonus Action weapon, then Command, then `weaponTurn`, its old brute attack code split out of `enemyTurn`), `foeHoldPerson`, `foeCommand`, `foeWeapon` (summons or strikes, through the party's own `spiritStrike`), `foeWeaponOption`, `closeIn`, `spellLeft`, `spendSpell`, `spellTargets`, `castingOrder`, `foeBeside`. Command for everyone now goes through `beginTurn` (a pending 'grovel' or 'halt' becomes `turnState.commanded`) and `obeyCommand` (foes, the hero and companions). A foe's Concentration: `concentrationCheck` and `endConcentration` work for foes (damage, falling, fleeing, being Incapacitated), and `endConcentration` says who can move again. A party member's Hold Person save at the end of their turn is in `endOfTurn`. `conditionsOf` adds 'held' for a paralysis held up by Concentration. `holdingSomeone(battle, c)` is exported for the companions. `battleScene` marks a foe's weapon (`foe: true`) and what a foe concentrates on.
- **Heroic Inspiration:** `rerollKept(rng, result)` in `js/engine/rules/d20-test.js` rolls a check or save's kept die again; `foeHoldPerson` uses it for the hero's first failed save when `reactionPolicy.inspiration` is on (Settings: **Spend Inspiration against Hold Person**, `autoInspiration` in `js/engine/save/settings.js`).
- **Companions** (`companion-ai.js`): `weighUp` counts a foe holding one of the party three times over. Odda's Lesser Restoration already freed the Paralyzed, Hold Person's included (the old handoff wrongly said it couldn't).
- **Battle screen:** "Held", "Commanded: Grovel" / "Commanded: Halt", and "(concentrating on Hold Person)" for foes in the turn order; the status line says when you're Held or Commanded; a foe's Spiritual Weapon is drawn as a blade of grey ash (`ASH_BLADE`).
- **Seen on screen** (phone size, a Cairnfield practice fight with Odda and Fen): Rhosyn's Hold Person on the hero, Odda's Lesser Restoration, the ash blade on the grid, Grovel obeyed, the turn order and status lines above, and the new Settings switch.

Built in the two sessions before (Chapter 3's beats 3–5): see git history and STORY.md. In short: the Hall of Champions and the dart corridor (`ch3_hall`), the flooded vault (`ch3_vault`), and the Chantry of Ash (`ch3_chantry`), with calling Aveline by name (`callByName`), allies and reinforcements on some paths (`ifFlag`), onlookers on some paths, rooms that change (`changes`, `dungeonRows`, `encounterRows`, `mapFlagsFor`), `roomEntry` and `entryWhen`, and traps (`springTrap`). Old ends: `{ scene: 'ch3_gate', continueAt: 'ch3_hall' }`, `{ scene: 'ch3_hall', continueAt: 'ch3_vault' }`, `{ scene: 'ch3_vault', continueAt: 'ch3_chantry' }`.

## 4. The next slice

**The end of Act I** (each its own slice, probably). Put the questions to Rob first, recommended option first.
- **Beat 6, the first shard** (STORY.md): as Vesk dies he breaks the shard's seal, and it flies to your hand (the Shard of Names: speak with the dead, learn any living creature's name). It whispers your full name, the one your Bond calls you; a vision of a girl in a burning chamber and a crown breaking; the barrow shudders (`shard_names`). The Whisper itself is Phase 3, so it's a flag for now. Questions worth asking: whether the shard does anything in play yet (a key that unlocks choices, as spells do, or only a flag); how the party gets out of the shuddering barrow (a short escape: a check or two, Fate's Mercy if it goes wrong, or straight to beat 7); what happens to `rival_wounded` and the companions who fell (`odda_fell_*`, `fen_fell_*`); and whether beats 6 and 7 are one slice.
- **Beat 7, Bramblegate's thanks:** the feast at the Tallow and Thistle, Garrick home (The Missing Miller finishes: the reeve's 50 gold), Lark, Knight-Captain Beatrix Marchbank's "request", a Free League courier's letter, the old woman with an owl, and the shard saying your name again. You reach level 5. **End of Act I**, and Phase 2: update CLAUDE.md's "Current phase" line to Phase 3 then.
- **Level 5** for the four classes and the companions (Extra Attack, level 3 spells, Sneak Attack 3d6, and so on), which the end of Act I needs. It's a big slice of its own; it could come before beat 7.
- **Still to use:** `rival_wounded` (carry them out), the companions who fell in the barrow (`odda_fell_*`, `fen_fell_*`: home to the temple), `vault_fates_mercy` and `darts_fates_mercy` (narrative only so far), `swore_the_oath`, `looted_the_champions`.

Follow-ups from this session (each could be its own slice):
- **The chantry with Rhosyn alive is hard.** Played 30 times by a simple autopilot hero (no Action Surge, Second Wind or calling Aveline), it was won 8 times with the Fanatics' spells and 11 without; Rhosyn and two acolytes come down the stair on round 3 and aren't counted in its difficulty, as reinforcements never are. Cairnfield (27 and 27 of 30) and the chantry with Rhosyn dead (24 and 22) barely changed. Rob may want to play the fast way with Rhosyn alive and decide.
- **Foes' spells reach only the party** (the hero and companions), never allies such as the Rival or a turned Aveline. Holding the Rival (a Bandit Captain, Humanoid) would be fair play; it needs Command and Hold Person handled in `allyTurn` and `turnedAllyTurn`, and the end-of-turn save for allies.
- **`casterTurn` is written for the Fanatic's three spells.** A new spellcasting monster in Act II (a Priest, a Mage) needs its own spells added there; `spellcasting.spells` is the data, but each spell's use is code.
- **Command's other words** (Approach, Flee, Drop) aren't built, and the hero's own Command still says only Grovel. Halt now works on anyone (`obeyCommand`), so the hero's Command could offer it too.
- **Heroic Inspiration by choice** on a foe's turn (a pause that asks) isn't built: the turns are decided before they play out. Only the automatic reroll against Hold Person exists.
- A foe's later Spiritual Weapon strikes read "Sister Rhosyn casts Spiritual Weapon at Odda, and misses", as the party's own strikes do ("You cast Spiritual Weapon at…"). Fine, but "strikes at" might read better for both.
- No "caster" behaviour that keeps its distance: a Fanatic closes in after casting, like a brute.

Smaller follow-ups noted earlier (still open):
- **Companions and death saves outside a fight:** DESIGN.md's rule says nobody helps (from Phase 1, when the hero travelled alone). With Odda and Fen standing right there, the darts' "you come round" text has Odda waiting for you to wake. Rob may want companions to stabilise you instead (Spare the Dying, Medicine).
- **Blindsight** (Animated Armor, 60 ft) isn't played: a hidden hero or Fen stays hidden from the guardians. Playing it touches `sees`, the hidden Advantage/Disadvantage lines and the foes' targeting in `battle.js` (the `variant` note in `monsters.js` says so).
- **Cairnfield's threads:** `tobin_freed` could bring Tobin back with the barrow's back ways.
- **The Wight's Life Drain** isn't played: the game can't lower a Hit Point maximum yet (the `variant` note says so). Act II's undead will want it.
- **A Rival who falls** in the chantry is badly hurt, not dead (`rival_wounded`), though the fight log says they "fall, and don't get up". Allies otherwise die at 0 Hit Points.
- **The long way round** isn't a room of its own on the map: you arrive in the chantry by the drain in its left wall (`entryWhen`).
- **Seeds planted:** `odda_saw_ingriths_oath` (Ingrith Hammerfall of Emberdeep, "sworn to keep the fire", may be the smith who carried the first Flame out of Emberdeep: Chapter 6); `swore_the_oath` (the hero swore the Concord oath and meant it: the endings, Hesper); `looted_the_champions` (the Whisper; and the gold is stamped with the crown, which Factor Penhallow wants with `league_deal`).
- **Names are unique** (Rob, Oct 12, 2026; STORY.md, "Every character has their own name"). Left alone as not quite clashes (Rob can say otherwise): Reeve Corbin and Tobin, Orrin (Juniper's mentor) and King Osric, Factor Penhallow and Morwen Tallow.
- **Raising:** the great candle is spent once used (`flame_spent`). A companion who dies after Bramblegate lies dead until Act II's temples; Chapter 3's feast in Bramblegate could offer something.
- **Level 4:** Magic Initiate's "Spell Change" and the Wizard's and Cleric's cantrip swap on a level-up aren't built. Skilled picks skills only (no tools yet). Grappler waits for grappling. Odda's AI never casts Resistance.
- **Allies:** Odda's spells (healing, Bless) don't reach the soldiers: her AI is for the party only. Allies die at 0 Hit Points with no death saves.
- **Flags for later:** `regency_favour`, `varrow_holds_cairns` (Chapter 3 uses `varrow_rallied`), `promised_nettle_warren` (Varrow may mind), `owe_nettle`, `rival_taken` (beat 4), `league_deal`, `league_refused`, `league_wants_crowns`, `met_penhallow` (Act II), `mentor_warned` and `sibling_letter` (Act II's Bond slot), `fen_returned`, `ford_fell` and `ford_abandoned`, the Crane flags, `odda_told_of_emberdeep` and `odda_means_to_go_home` (Chapter 6), `fen_told_of_ledger`, `fen_just_arithmetic` and `heard_of_precentor_signet` (Chapter 11). **Gaunt** may come back (`gaunt_spared`, `hunters_backed_off`, `hunters_faced_down`, `hunters_fled`, `fen_sold`, `fen_left_behind`).
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight.
- The pixel font has no "−" (minus sign), so a negative modifier such as Dexterity 8 (−1) shows as "(_1)" in the score lists (creation and the level-up). Worth a look: a plain hyphen, or a font with the glyph.
- A DC 12 or 13 check or save shows as "Easy" on its card (the ladder is Easy 10, Medium 15). The darts' Dexterity save (DC 13) shows "Easy". Working as designed, but Rob may want to know.
- The barrow's flanks on the forecourt map use the `barrow` hill picture, which reads more like a bush than a mound.
- The champions' tombs use the `bier` picture, a coffin with a gold cross on it, as the breach under Brackenhollow does. A plainer stone tomb could come from DawnLike's decor sheets.
- Ink functions (`oath_wall_easy`, `lies_in_state`) show up in debug's Jump list, which lists every knot. Jumping to one isn't useful; the list could skip them.
- **Large creatures** (2 × 2 squares) aren't built: the Ogre Zombie takes one square (Rob, Oct 16, 2026). Act II's big monsters will need them.
- **The sluice wheel's picture** is a segmented blue ring from DawnLike's effects sheet (row 24, column 4), standing in for a water wheel DawnLike doesn't have.
- **Garrick after the vault:** he waits at the great gate; beat 7 brings him home and finishes The Missing Miller.
- In Fate's Mercy at the vault, the "Your purse is gone." note comes before the text that says the same thing, as at the gate. Harmless, but Rob may notice.

## 5. How the companion, ally and fight code fits together

- `data/campaign/companions.js`:
  - Each companion's level 1 choices, plus `levels: { 2: {...}, 3: {...}, 4: {...} }` changes (`subclassId`, `cantrips`, `prepared`, `levelFeats`).
  - `tactic`, `likes`, `dislikes`; the `tactics` list; `approvalBands` (likes 3, dislikes −2).
- `js/engine/character/party.js`:
  - `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`. A companion who dies stays in the party with `fallen: true` until raised.
  - `companionCharacter(id, level)` builds their sheet at the hero's level (never stored), capped at the class data's top level.
  - `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`, which come from the game. `actorId` is the member's id.
  - Also: `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `raiseMember`, `approve`, `feeling`, `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 3,500 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`). A hymn's risen dead and reinforcements are pushed on the end, and act last in the round. A foe that casts has `spellsCast` and `concentration` too.
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)` (hero or companion: they have character sheets); `c.ally`; `c.side === 'hero'`. Foes and allies use their monster's stat block.
  - **Lists:** `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`.
  - **Party helpers:** `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`.
  - **Wards** (`WARDS`): `blessed`, `sanctuary`, `shield-of-faith`, `resisting`; `castWard`; damage to the party goes through `takeHit` (the hero) and `companionHit`, both of which call `resistanceCut` first.
  - **Twists:** the hymn (`hymnRises`, `hymnHurt`, `singerOf`) and reinforcements (`reinforcementsDue` at the start, `reinforcementsArrive` at each new round), both announced by `objectiveText`.
  - **Concentration:** `concentrationOf`, `startConcentration`, `endConcentration`, `tidyConcentration` (a foe's ends quietly), `concentrationCheck` (party or foe), `holderOf(effect)` (`by`, or the hero in older saves), `holdingSomeone`.
  - **A foe's turn:** `enemyTurn` (Command, Turned, Incapacitated, the singer, waking a sleeper, a coward fleeing, hidden heroes), then `casterTurn` for a monster with `spellcasting`, else `weaponTurn`. Command for anyone: `beginTurn` and `obeyCommand`.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn`; `friendsFor` and `forAllies` (healing, potions and Lesser Restoration reach them; wards don't); `finishBattle` records `lastBattle.alliesAlive`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. It looks only at the party, never at allies.
- `js/engine/character/hazards.js`: damage outside a fight (`takeDamage`, death saves alone) and traps (`springTrap`, `findTrap`, `trapDamageDice`).
- **Onlookers on some paths** (`ifFlag` in `encounters.js`): `onlookersAbsent(encounter, flags)`; `startBattle` keeps them on `battle.absentOnlookers`, and `battleMap` caches a map for each set.
- **Rooms that change** (`changes` in `dungeons.js`): `dungeonRows(dungeon, flags)` in `js/engine/world/dungeons.js`, used by the dungeon map and by fights (`encounterRows(encounter, flags)`, with the flags kept on `battle.mapFlags`, picked by `mapFlagsFor`). `roomEntry(room, flags)`: where the hero arrives (`entryWhen`).
- **Calling a foe by name** (`callByName` in `encounters.js`): `nameCall(game)`, `heroCallByName(game)` (it turns: `side 'hero'`, `ally`, `turned`), `turnedAllyTurn`; `finishBattle` records `lastBattle.turned`.
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `likes_you`, `dislikes_you`, `companion_alive`, `raise_companion`, `companion_can_cast`, `companion_cast`, `can_pay`, `pay`, `allies_standing`, `ally_standing`, `foe_escaped`, `foe_turned`, `has_bond`, `bond_name`, `xp_milestone`, `take_damage`, `spring_trap` are in `js/engine/story/externals.js`, declared in `story/externals.ink`. `lies_in_state(id)` is an Ink function in `ch2-temple.ink`, and `oath_wall_easy()` one in `ch3-hall.ink`.

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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds; three calls of about 40 seconds each were enough this session). Run it from any test page except `/tests/saves.html` (such as `/tests/levels.html`): the save checks run twice at once, as the top page and in a frame, fight over their test database ("The database connection is closing").

- **Foe spells:** `tests/dungeon-tests.js`, after the Cairnfield checks. `fanaticFight({ character, seed, at, odda, fen, spent, inspiration })` starts Cairnfield with Rhosyn's hymn broken, every other foe out of it, Rhosyn at `at` (two squares above the hero at (3, 8) unless given), Odda or Fen at the squares given, the turn order hero, Rhosyn, companions, and `spent` the spells she has already cast (`{ 'hold-person': 1 }`). `sceneAt(entry)` is the scene just after a log line (`fight.replayOf`), `unitIn(scene, id)` a creature in it, and `linesInOrder(game, starts)` finds log lines in order. Breaking her Concentration in a test: `game.rng = scriptedThen([15, 6, 6, 6, 6, 2], seed)` then `fight.heroAttack(game, 'greatsword-melee', rhosyn.id)` (a hit, four damage dice for Savage Attacker, and a failed Constitution save).
- **Chapter 3:** `atTheDarkMoon(seed, { character, flags, odda, fen })` jumps to `ch3_dark_moon`; `toTheGate(game)` waits out the day and goes down to the gate; `settleGate(game, start, { won, setUp })` settles the gate fight. `atTheHall(seed, { character, flags, odda, fen })` goes through the gate by the ward-word and down the stair; `intoTheHall(game)` finds the darts (a natural 20) and goes into the hall. `champion4` is a level 4 Champion (so Odda is level 4, with Detect Magic); `juniper` is a Sage Wizard with Mage Hand, Comprehend Languages and Detect Magic; `barrowRoom(id)` is a room of the upper barrow; `darts` is the Poisoned Darts trap. `atTheVault(seed, { character, flags, odda, fen })` jumps to `ch3_vault` (a level 4 Champion unless given); `settleVault(game, start, { won, setUp })` settles the fight at the wheel; `sable` is the level 4 Champion with a Rival Bond called Sable Rook; `vaultRoom()` is the flooded vault. `chantryFight(encounterId, flags, character)` starts a chantry fight with the hero going first (no companions); `atTheChantry(seed, { character, flags, odda, fen })` jumps to `ch3_chantry` (drained unless the flags say `vault_flooded`); `settleChantry(game, start, { won, setUp })`; `chantryRoom()`. In a `setUp`, `Object.assign(fight.combatantById(g.battle, 'wight-1'), { side: 'hero', ally: true, turned: true })` makes Aveline turned, as calling her would.
- **Beat 8:** `atTheEve(seed, { character, flags, odda, fen, approval: { odda, fen }, xp })` jumps to `ch2_eve`; `toTheCamp(game)` takes the path the flags say.
- **Beat 6:** `homeFromCairnfield(seed, { character, flags, odda, fen, fallen, gold })` jumps to `ch2_homeward`; `throughTheTemple(game, judgement)` and `toTheMorning(game, judgement)`.
- **Cairnfield:** `atCairnfield(seed, { character, flags, odda, fen, items })`; `upToTheRidge(game)`; `settleCamp(game, start, { won, fled, setUp })`. Sneak with a hero who isn't in Chain Mail (Stealth Disadvantage), and fail checks with a non-Fighter (Tactical Mind): `lifeCleric` works.
- **Which page:** level-up checks are in `tests/level-up-tests.js`. Companions at every level, Resistance and the Cleric's fight spells are in `tests/classes-tests.js`. Monster checks, foe spells, traps, the encounter budget and the chapter scene playthroughs are in `tests/dungeon-tests.js`. Allies and deep water: `tests/combat-tests.js` (`fordFight`). Saves, migrations and old ends: `tests/saves-tests.js`. The Ink bridge, tags and story-text lint: `tests/story-tests.js` and `tests/rules-tests.js` (`parseTags`, and the d20 checks, `rerollKept` among them).
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice (a trap's save, its 1d3 and its d6s, then death saves), set `game.rng = scriptedThen([...faces], seed)`. A Fighter's Tactical Mind can turn a failed check into a success, so test a failed check with a non-Fighter. Wren (the Champion) has Savage Attacker: her first weapon hit each turn rolls its damage dice twice.
- **Text after a choice** is on the *next* page. Check it after `pick`, not before.
- **Loading modules by hand:** navigate to a fresh page first (such as `/tests/combat.html`); a page that loaded old code keeps it cached.
- **Playing a fight many times** (to judge difficulty): in a test page, import `battle.js`, start the encounter with companions, and drive the hero with a small loop (stand, move beside the nearest foe, attack with `greatsword-melee`, `endHeroTurn`). To compare with a monster's spells off, set `monsters.find(...).spellcasting = undefined` in the page (the data module is shared) and put it back after.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well (LF line endings). For many exact replacements, write a spec file of `@@@FROM / @@@TO / @@@END` blocks with the Write tool and run a small perl replacer (the memory note "Shell editing traps" has it). **No shell heredocs at all**, even quoted ones: write files with the Write tool. In a Perl one-liner's replacement, `@word` is an array and vanishes.
- **Ink:**
  - Write `word{cond:, more}` (no space before the comma); choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}` (join with `+`); a line where someone speaks ends with `#speaker:id`.
  - A gather that only runs logic works as a labelled gather on its own line (`- (rallied)`), with the `~` line under it.
  - Tunnels across knots work (`-> ch2_temple ->` … `->->`), with choices inside, and the caller carries on after them. A tunnel that only prints (`-> reading ->`) before a `{ check(...): … }` puts the roll after its text, as you'd want.
  - A stitch's read count gates a follow-up choice: `* {odda_prior > 0 && likes_you("odda")} [...]`.
  - A `#combat:` choice's content runs after the fight, so text meant to come before the fight has to be on the page before the choice.
  - `~ temp x = spring_trap(...)` then `{ x == "dead": -> mercy }` works; the save's roll lands on the page before the lines after the call.
- **The map's title shows the room's name** ("The Kings' Barrow · The crowned passage"), so a room's `name` mustn't give away what's in it.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; class tables are garbled, with some digits as letters: `j` is 4, `k` is 5; negative modifiers show as `�c` and `�d`). Traps are around line 27180 (Poisoned Darts at 27305), spells by name (Lesser Restoration at 20458), and monsters by name (Animated Armor around line 34796, the Cultist Fanatic around 38939, the Priest around 46518, the Wight around 51578, the Ogre Zombie around 52102). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling in a PowerShell `System.Drawing` script, label each square, then Read the PNG. Knights in plate are on the humanoid sheet's row 4; stone doors on `Objects/Door0.png` (the gilt-framed one is column 4, row 1); trap plates on `Objects/Trap0.png` (row 0); stairs on `Objects/Tile.png` (row 1). Big zombies are on `Characters/Undead0.png` row 0 (columns 6 and 7), and a crowned skeleton king and a dark lich-like figure on row 2 (columns 6 and 7). `Objects/Decor0.png` row 20 has a bloodied altar (column 1) and two knight statues (columns 3 and 4).
- **Little pictures drawn in code:** the spectral weapons (`SPECTRAL_WEAPON`, `ASH_BLADE` in `battle-screen.js`) are 16 rows of 16 letters, one per pixel, with a colour for each letter.
- **Playing on screen:**
  - **Screenshots** in a hidden pane sometimes time out and sometimes come back at double scale, showing only the top-left quarter (this session, until the pane was shown). When they do, copy the grid out: run a receiver from the scratchpad in the background (the memory note "Hidden Browser pane traps" has it; this session's is `receive.ps1`), then POST `canvas.battle-grid`'s `toDataURL()` to it and Read the PNG.
  - **States that only show during a replay** (a Held hero never gets a turn of their own, so "You (Held)" shows only while the foes' turn plays back): attach a `MutationObserver` to `#battle-area` before pressing End turn, and record `.battle-order` and `.battle-status` whenever they say what you're looking for (post the canvas from inside it, too).
  - **Save slots:** in Rob's own browser on port 8000, slot 1 holds his old test game (Juniper, save version 15): never Continue it. In the Browser pane's storage the slots may all be empty; check before choosing one.
  - Tap buttons with the JavaScript tool (`.choice-card` elements for choices; a d20 waiting to be rolled is a button showing "20"). `[data-key="…"]` works for level-up controls: `hp-fixed`, `subclass-champion`, `feat-ability-score-improvement`, `increase-strength1`, `mastery-spear`, `finish`. The debug panel's toggle is `button.debug-toggle` (fixed-position, so `offsetParent` is null). A button list taken with `querySelectorAll('button')` includes hidden ones, such as the "Update ready" banner in `index.html`.
  - **Fights in a hidden pane:** walks wait on animation frames that never come. Press End turn, then reload the page and Continue the slot: the fight is saved as decided. That works for the hero's own move too (tap a square on `canvas.battle-grid` by dispatching a click at its centre, reload, Continue, and the hero is there).
  - **Setting up a moment in a fight:** edit the save (IndexedDB `questbound` → `slots`, key = slot number: `rec.game.battle`), `store.put(record)` with no key, reload, Continue. This session: giving a foe its spells back (`spellsCast = {}`, `concentration = null`, and removing its 'spiritual-weapon' effect), getting a fallen companion up (their combatant's `state`, `deathSaves`, and `game.party[i].hp`), and clearing foes out (`hp = 0`).
  - **Low-level heroes in late fights:** debug's Jump doesn't level the hero, and a level 1 hero can die in round 1 of the chantry fight (Aveline's two bow shots). Force the next d20 to 20 in debug before choosing the fight, so the hero goes first.
  - **Getting to a scene:** debug's **Set level** walks through every level-up screen, **Join** adds Odda or Fen (two Join buttons: click both), **Add flag** sets story flags (the input's `aria-label` is "Flag to add"), **Give gold**, **Jump** reaches any knot (the select's `aria-label` is "Scene to jump to"; set its value, dispatch `change`, then click Jump), and **Fight** under "Fight to practise" starts any encounter as a practice fight (everyone back as they were afterwards). To fill a debug input from the JavaScript tool, set its value with the native value setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)`), then dispatch `input` and `change`.
  - **The playtest log:** clean your entries from a test page such as `/tests/levels.html`, not the game page: the game keeps the log in memory and writes its copy back.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP: Moderate means more than the Low budget and up to the Moderate one. The hymn's risen dead and reinforcements aren't counted on the card.
