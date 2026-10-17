# Handoff: starting the next slice

Written on Oct 16, 2026, at the end of the session that built Chapter 3's beats 3, 4 and 5 (the
Hall of Champions, the flooded vault, and the Chantry of Ash). Start a new Claude Code session in
this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase (Act I ends with Chapter 3).
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - Combat: "Chapter 3's monsters" (the Wight, the chantry, **calling a foe by name**), "Encounter design" (the hymn, Reinforcements, and **"Foes don't cast spells yet"**, which this next slice changes), "Allies who aren't companions" (the Rival), and the spell rules the hero already has ("Spell conditions" in `battle.js`: Command's grovel, Hold Person's paralysis).
  - World and Exploration, "Dungeons": the Kings' Barrow (both maps built), rooms that change with the story, traps.
  - Rules and Progression: "Milestones", and levels 1–4 (heroes stop at 4 for now; Chapter 3 ends at level 5, which isn't built).
  - The Whisper: dark choices set flags now, counted when the Whisper is built in Phase 3.
- `docs/STORY.md`: **Chapter 3 · The Kings' Barrow**. Beats 1 to 5 are written up as built; beats 6–7 are the plan. Beat 5 lists the chantry's flags.
- `story/act-1/ch3-chantry.ink`: the last scene built (`ch3_chantry`): two routes in, an approach that depends on whether the foe was warned, a boss fight with a twist the hero triggers on the grid, and outcomes read back with `foe_turned` and `ally_standing`. `ch3-vault.ink` and `ch3-hall.ink` are the patterns for Fate's Mercy by capture, traps, and spells in scenes.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (he took all eleven this session).
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage: your sessions by `gameId`, and the scene entries you added at the end of `scenes`). **Check which port the preview server got:** each port has its own saves and log. This session's server was on port 8000, and in the Browser pane its storage started empty (no saves, an empty log) and was left empty. Rob's own browser has its own storage, with his test games in it.
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js. A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`, as `levelFeats` did. (A new field inside `game.battle` needs none of this: older saves without it read as "none".)

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v36` (the chantry; the hall and the vault went out as v35, committed as "p2s9") |
| Save format | version 18. These slices added only flags, and fields inside a fight (`battle.absentOnlookers`, `battle.mapFlags`, `battle.reinforcements.absent`, a combatant's `turned`) and `lastBattle.turned`: older saves without them read as "none". |
| Tests | 486 passing: rules 88, combat 68, saves 72, story 17, levels 22, dungeon 139, spells 34, classes 46 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–4 (heroes stop at 2,700 XP) |
| Story | Chapters 1 and 2 complete; Chapter 3 beats 1–5. Every path ends with Cantor Vesk dying at the altar (`ch3_chantry.vesk_dying`): "See what Cantor Vesk was reaching for. (The rest of Act I is still being written.)" |

Built this session, beat 5 (Rob's choices, Oct 16, 2026: the chantry now and foe spells next; calling Aveline is an action in the fight; Vesk, Aveline and Zombies, with the Choir behind you on the fast way; the Rival as a Bandit Captain):
- **Entry:** `ch3_vault.garrick_goes` now goes on to `ch3_chantry`, which sets the aim at its top. Old end: `{ scene: 'ch3_vault', continueAt: 'ch3_chantry' }` (the first choice depends on `vault_drained` or `vault_flooded`).
- **The chantry** (`deep-barrow/chantry`, `ch3_chantry`): the drained stair (`#go:chantry`; unwarned, Stealth 13 for surprise; warned by `vault_acolyte_fled`, Vesk is waiting) or the old drain (Acrobatics or Athletics 12, a failure 2d6 bludgeoning, `drain_fates_mercy`; then always a surprise attack). Fights `chantry` and `chantry-late`. Flags: `odda_at_the_chantry`, `fen_at_the_chantry`, `chantry_won`, `aveline_rested` (called by name: +700 XP) or `aveline_destroyed`, `rival_wounded`, `odda_fell_in_the_chantry`, `fen_fell_in_the_chantry`, `chantry_fates_mercy` (Aveline strikes Vesk down by herself; robbed, a long rest; also sets `aveline_rested`).
- **Data:** the Wight (`data/srd/monsters.js`, Life Drain left out with a `variant` note); Vesk and Aveline in `people.js` (sprites `cantor`, `wight`); the chantry room (rows 10–21, with `entryWhen` for the drain at (1, 13)); the vault's bottom row now holds the outflow, which is the stair once drained (the `vault → chantry` doorway at (3, 10) and (4, 10)); the `chantry` and `chantry-late` encounters, with `avelinesName` (`callByName`); sprites `altar` and `tomb-slab`.
- **Engine:** `callByName` (`nameCall`, `heroCallByName`, `turnedAllyTurn` in `battle.js`; a button under Other actions on the battle screen; `lastBattle.turned` and the `foe_turned(monster)` story command); allies with `ifFlag` and `bondName`; reinforcements with `ifFlag` and `name` (and the warning text names them); fights drawn from the room as the story left it (`battle.mapFlags`, `mapFlagsFor`, `encounterRows(encounter, flags)`); `roomEntry(room, flags)` for where the hero arrives on the dungeon map.

Built earlier this session, beat 4 (Rob's choices: the Ogre Zombie takes one square for now; acolytes and a hymn; draining is fast, flooding is safe):
- **Entry:** `ch3_hall.wall_opens` now goes on to `ch3_vault` (no more END there), which sets the aim at its top. Old end: `{ scene: 'ch3_hall', continueAt: 'ch3_vault' }`.
- **The flooded vault** (`deep-barrow/vault`, `ch3_vault`): sets `odda_at_the_vault` / `fen_at_the_vault`. Approach: Stealth 12 or Minor Illusion for surprise, or attack from the landing. The fight `vault-wheel` (Ogre Zombie, Ghoul, five acolytes; 775 XP, Moderate; the hymn raises a Zombie from the black water on round 3; acolytes flee by the Choir's crawl). Flags: `vault_won`, `vault_acolyte_fled`, `odda_fell_in_the_vault`, `fen_fell_in_the_vault`, `vault_fates_mercy` (chained to the wheel, robbed, a long rest; Fen or Garrick's pin frees you), `garrick_freed`, `rival_freed`, then `vault_drained` or `vault_flooded`. Garrick goes up to wait at the gate.
- **Data:** the Ogre Zombie in `data/srd/monsters.js` (with a `variant` note about its size); Garrick in `data/campaign/people.js`; the `deep-barrow` dungeon with the vault's `changes`; the `vault-wheel` encounter; sprites `ogre-zombie`, `sluice-wheel` (an Effect0 ring standing in: DawnLike has no water wheel), `sluice-gate` and `stair-down` (and the `tile` sheet).
- **Engine:** onlookers with `ifFlag` (`onlookersAbsent` and `battle.absentOnlookers` in `battle.js`; the battle screen skips them); rooms with `changes`, drawn by `dungeonRows(dungeon, flags)` in `js/engine/world/dungeons.js` (the dungeon map uses it; fights use the rows as first drawn); the hymn's warning says "a Zombie" when none started the fight.

Built earlier this session, beat 3 (Rob's choices: seven champions with Tamar; the Whisper as a flag for now; the SRD's Poisoned Darts; Detect Magic shows the oath-wards' glow):
- **Entry:** `ch3_gate.into_the_dark` now goes on to `ch3_hall` (no more END there), which sets the aim at its top so old saves get it too. Old end: `{ scene: 'ch3_gate', continueAt: 'ch3_hall' }`.
- **The crowned passage** (`kings-barrow/corridor`, the dart corridor): Search (Perception 15) finds the plates (`darts_spotted`, 50 XP); a Mage Hand sets them off safely; walking on, or a failed search, springs them (`darts_sprung`): `spring_trap("poisoned-darts")`. Fate's Mercy on three failed death saves (`darts_fates_mercy`: a long rest, hours lost, not used later yet).
- **The Hall of Champions** (`kings-barrow/hall`): five tombs. Detect Magic (the hero's first, else Odda's at level 4) sets `saw_oath_wards`. Loot the graves: 50 gold, Wealth, Odda −1, `looted_the_champions`.
- **The oath-wall** (`kings-barrow/oath-wall`): History or Arcana 13 (10 for a Sage or with `saw_oath_wards`), or Comprehend Languages, reads the names: `read_the_oath_wall`, 100 XP, a Missing Miller note with Aveline's oath, and `odda_saw_ingriths_oath` with Odda there. A failure leaves the names unread. Then swear the oath and mean it (Glory, `swore_the_oath`) or say the words; either opens the way (`oath_wall_opened`).
- **Data:** `data/srd/traps.js` (Poisoned Darts, with its higher-level damage); the upper barrow's rows 9–29 and three rooms in `data/campaign/dungeons.js`; the `trap` sheet and the `dart-plate` and `oath-door` tiles in `data/campaign/sprites.js`; the `trapStruck` note in `dm-voice.js`.
- **Engine:** `springTrap`, `findTrap` and `trapDamageDice` in `js/engine/character/hazards.js`; the `spring_trap(id)` story command; figures with `shownOn` flags (drawn only once a flag is set) in `js/engine/world/dungeons.js`.

## 4. The next slice

**Foe spellcasting: the Cultist Fanatic's spells** (Rob, Oct 16, 2026: the slice after the chantry). Cantor Vesk and Sister Rhosyn are Cultist Fanatics, and today they fight only with their Pact Blades. This slice gives them their SRD 5.2.1 Spellcasting, used against the party, in the chantry and at Cairnfield. It's engine work: there's no new scene.
- **The SRD's Fanatic** (`data/srd/monsters.js`, `cultist-fanatic`; the SRD extract has it near line 38939): spellcasting ability Wisdom, spell save DC 12, +4 to hit with spell attacks. At will: Light and Thaumaturgy (no use in a fight). **Command** twice a day, **Hold Person** once a day, and as a Bonus Action, **Spiritual Weapon** twice a day. Rhosyn's `variant` note says what's left out; replace it.
- **What the engine has already**, from the party's own spells (see "Spell conditions" and "Wards" at the top of `battle.js`):
  - Command's 'grovel' effect: a foe it lands on falls Prone on its next turn, and its turn ends (`enemyTurn`). Nothing yet makes the hero or a companion grovel.
  - Hold Person's 'paralyzed' effect (with `concentration` and `by`: the caster), and Paralyzed's rules for the party (from the Ghoul's Claw: no move or action, failed Strength and Dexterity saves, Advantage on attacks against them, Critical Hits from within 5 feet). Hold Person also needs the save repeated at the end of each of the target's turns.
  - Spiritual Weapon for a party caster: the 'spiritual-weapon' effect (`target`: its caster, `pos`, `damage`, `modifiers`) and `spiritStrike`; Odda uses it (`companion-ai.js`).
  - Saves for the party: `partySave(game, c, ability, dc, label)` (with Bless); foe saves: `foeSave`.
  - **Missing:** foes concentrating (a foe's Concentration, broken by damage with a Constitution save, or when it falls), which ends its Hold Person and its Spiritual Weapon; and a foe's turn choosing between its spells and its blade.
- **Where it shows:** in the chantry, Vesk sings the hymn until round 3 (a singer does nothing else), so his spells come after; Rhosyn, coming down the stair with the Choir on round 3 (if she lives), casts from the start. At Cairnfield, Rhosyn sings until round 3 too. The fights' stated difficulty doesn't change (XP is the same), but check Cairnfield still feels Moderate for a level 3 party.
- **Questions worth putting to Rob first:**
  - Which Command words the Fanatics use. Recommend Grovel (Prone, and the turn ends) and Halt (no move, and no action or Bonus Action); Flee and Approach would move the hero for them, and Drop needs weapons that can be dropped.
  - When a Fanatic casts: say, Spiritual Weapon on its first turn (a Bonus Action, so it still attacks), Hold Person on the hero or whoever hits hardest while it isn't concentrating, Command when nobody's held. Or keep it simpler.
  - Whether the hero can spend Heroic Inspiration to reroll a save against a foe's spell. Today, saves on the foes' turns can't be rerolled ("Heroic Inspiration" in `rules/inspiration.js`).
  - Whether Odda's AI should go after a Fanatic who's holding someone (to break its Concentration), or cast Lesser Restoration. Hold Person can't be ended by it, so focusing the caster is the rules' answer.
- **Checks to add** (`tests/combat-tests.js` or `tests/dungeon-tests.js`): each spell against the hero and a companion; the save shown in full; Concentration broken by damage; Spiritual Weapon's attacks; a Fanatic singing doesn't cast; the battle screen's turn order showing "Held" and "Grovelling".

**After that, the end of Act I** (each its own slice, probably):
- **Beat 6, the first shard** (STORY.md): as Vesk dies he breaks the shard's seal, and it flies to your hand (the Shard of Names: speak with the dead, learn any living creature's name). It whispers your full name, the one your Bond calls you; a vision of a girl in a burning chamber and a crown breaking; the barrow shudders (`shard_names`). The Whisper itself is Phase 3, so it's a flag for now.
- **Beat 7, Bramblegate's thanks:** the feast at the Tallow and Thistle, Garrick home (The Missing Miller finishes: the reeve's 50 gold), Lark, Knight-Captain Beatrix Marchbank's "request", a Free League courier's letter, the old woman with an owl, and the shard saying your name again. You reach level 5. **End of Act I**, and Phase 2: update CLAUDE.md's "Current phase" line to Phase 3 then.
- **Level 5** for the four classes and the companions (Extra Attack, level 3 spells, Sneak Attack 3d6, and so on), which the end of Act I needs. It's a big slice of its own; it could come before beat 7.
- **Still to use:** `rival_wounded` (carry them out), the companions who fell in the barrow (`odda_fell_*`, `fen_fell_*`: home to the temple), `vault_fates_mercy` and `darts_fates_mercy` (narrative only so far), `swore_the_oath`, `looted_the_champions`.

Smaller follow-ups noted along the way (each could be its own slice):
- **Companions and death saves outside a fight:** DESIGN.md's rule says nobody helps (from Phase 1, when the hero travelled alone). With Odda and Fen standing right there, the darts' "you come round" text has Odda waiting for you to wake. Rob may want companions to stabilise you instead (Spare the Dying, Medicine).
- **Blindsight** (Animated Armor, 60 ft) isn't played: a hidden hero or Fen stays hidden from the guardians. Playing it touches `sees`, the hidden Advantage/Disadvantage lines and the foes' targeting in `battle.js` (the `variant` note in `monsters.js` says so).
- **Cairnfield's threads:** `rhosyn_lives` brings Rhosyn down the chantry stair with the Choir (built); `tobin_freed` could bring Tobin back with the barrow's back ways.
- **The Wight's Life Drain** isn't played: the game can't lower a Hit Point maximum yet (the `variant` note says so). Act II's undead will want it.
- **A Rival who falls** in the chantry is badly hurt, not dead (`rival_wounded`), though the fight log says they "fall, and don't get up". Allies otherwise die at 0 Hit Points.
- **The long way round** isn't a room of its own on the map: you arrive in the chantry by the drain in its left wall (`entryWhen`).
- **Seeds planted this slice:** `odda_saw_ingriths_oath` (Ingrith Hammerfall of Emberdeep, "sworn to keep the fire", may be the smith who carried the first Flame out of Emberdeep: Chapter 6); `swore_the_oath` (the hero swore the Concord oath and meant it: the endings, Hesper); `looted_the_champions` (the Whisper; and the gold is stamped with the crown, which Factor Penhallow wants with `league_deal`).
- **Names are unique** (Rob, Oct 12, 2026; STORY.md, "Every character has their own name"). The seven champions were checked against the cast and `names.js`. Left alone as not quite clashes (Rob can say otherwise): Reeve Corbin and Tobin, Orrin (Juniper's mentor) and King Osric, Factor Penhallow and Morwen Tallow.
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
- **The sluice wheel's picture** is a segmented blue ring from DawnLike's effects sheet (row 24, column 4), standing in for a water wheel DawnLike doesn't have. The dart plates and the stair down come from `Trap0.png` and `Tile.png`.
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
- `js/engine/character/hazards.js`: damage outside a fight (`takeDamage`, death saves alone) and traps (`springTrap`, `findTrap`, `trapDamageDice`).
- **Onlookers on some paths** (`ifFlag` in `encounters.js`): `onlookersAbsent(encounter, flags)` lists those who aren't there; `startBattle` keeps them on `battle.absentOnlookers`, and `battleMap` caches a map for each set (so two fights of the same encounter can differ).
- **Rooms that change** (`changes` in `dungeons.js`): `dungeonRows(dungeon, flags)` in `js/engine/world/dungeons.js`, used by the dungeon map and by fights (`encounterRows(encounter, flags)`, with the flags kept on `battle.mapFlags`, picked by `mapFlagsFor`). `roomEntry(room, flags)`: where the hero arrives (`entryWhen`).
- **Calling a foe by name** (`callByName` in `encounters.js`): `nameCall(game)` (the button's text and why it's greyed out), `heroCallByName(game)` (it turns: `side 'hero'`, `ally`, `turned`), `turnedAllyTurn` (it goes for `goesFor`, then the nearest foe); `finishBattle` records `lastBattle.turned`.
- **Allies and reinforcements on some paths:** allies with `ifFlag` and `bondName` (the Rival, named by the Bond) in `startBattle`; reinforcements with `ifFlag` and `name` (`reinforcementsAbsent`, `reinforcementsComing`, `reinforcementsText`).
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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds; two calls of about 40 seconds each were enough this session). Run it from any test page except `/tests/saves.html` (such as `/tests/levels.html`): the save checks run twice at once, as the top page and in a frame, fight over their test database ("The database connection is closing").

- **Chapter 3:** `tests/dungeon-tests.js`, at the end: `atTheDarkMoon(seed, { character, flags, odda, fen })` jumps to `ch3_dark_moon`; `toTheGate(game)` waits out the day and goes down to the gate; `settleGate(game, start, { won, setUp })` settles the gate fight. `atTheHall(seed, { character, flags, odda, fen })` goes through the gate by the ward-word and down the stair; `intoTheHall(game)` finds the darts (a natural 20) and goes into the hall. `champion4` is a level 4 Champion (so Odda is level 4, with Detect Magic); `juniper` is a Sage Wizard with Mage Hand, Comprehend Languages and Detect Magic; `barrowRoom(id)` is a room of the upper barrow; `darts` is the Poisoned Darts trap. `atTheVault(seed, { character, flags, odda, fen })` jumps to `ch3_vault` (a level 4 Champion unless given); `settleVault(game, start, { won, setUp })` settles the fight at the wheel; `sable` is the level 4 Champion with a Rival Bond called Sable Rook; `vaultRoom()` is the flooded vault. `chantryFight(encounterId, flags, character)` starts a chantry fight with the hero going first (no companions); `atTheChantry(seed, { character, flags, odda, fen })` jumps to `ch3_chantry` (drained unless the flags say `vault_flooded`); `settleChantry(game, start, { won, setUp })`; `chantryRoom()`. In a `setUp`, `Object.assign(fight.combatantById(g.battle, 'wight-1'), { side: 'hero', ally: true, turned: true })` makes Aveline turned, as calling her would.
- **Beat 8:** `atTheEve(seed, { character, flags, odda, fen, approval: { odda, fen }, xp })` jumps to `ch2_eve`; `toTheCamp(game)` takes the path the flags say.
- **Beat 6:** `homeFromCairnfield(seed, { character, flags, odda, fen, fallen, gold })` jumps to `ch2_homeward`; `throughTheTemple(game, judgement)` and `toTheMorning(game, judgement)`.
- **Cairnfield:** `atCairnfield(seed, { character, flags, odda, fen, items })`; `upToTheRidge(game)`; `settleCamp(game, start, { won, fled, setUp })`. Sneak with a hero who isn't in Chain Mail (Stealth Disadvantage), and fail checks with a non-Fighter (Tactical Mind): `lifeCleric` works.
- **Which page:** level-up checks are in `tests/level-up-tests.js`. Companions at every level, Resistance and the Cleric's fight spells are in `tests/classes-tests.js`. Monster checks, traps, the encounter budget and the chapter scene playthroughs are in `tests/dungeon-tests.js`. Allies and deep water: `tests/combat-tests.js` (`fordFight`). Saves, migrations and old ends: `tests/saves-tests.js`. The Ink bridge, tags and story-text lint: `tests/story-tests.js` and `tests/rules-tests.js` (`parseTags`).
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice (a trap's save, its 1d3 and its d6s, then death saves), set `game.rng = scriptedThen([...faces], seed)`. A Fighter's Tactical Mind can turn a failed check into a success, so test a failed check with a non-Fighter.
- **Text after a choice** is on the *next* page. Check it after `pick`, not before.
- **Loading modules by hand:** navigate to a fresh page first (such as `/tests/combat.html`); a page that loaded old code keeps it cached.

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
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; class tables are garbled, with some digits as letters: `j` is 4, `k` is 5; negative modifiers show as `�c` and `�d`). Traps are around line 27180 (Poisoned Darts at 27305), and monsters by name (Animated Armor around line 34796, the Cultist Fanatic around 38939, the Priest around 46518, the Wight around 51578, the Ogre Zombie around 52102). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling in a PowerShell `System.Drawing` script, label each square, then Read the PNG. Knights in plate are on the humanoid sheet's row 4; stone doors on `Objects/Door0.png` (the gilt-framed one is column 4, row 1); trap plates on `Objects/Trap0.png` (row 0); stairs on `Objects/Tile.png` (row 1). Big zombies are on `Characters/Undead0.png` row 0 (columns 6 and 7), and a crowned skeleton king and a dark lich-like figure on row 2 (columns 6 and 7), which might suit the Wight. `Objects/Decor0.png` row 20 has a bloodied altar (column 1) and two knight statues (columns 3 and 4), for the chantry and Aveline's tomb.
- **The deep barrow's stand-ins:** the effects sheet (`Objects/Effect0.png`) holds rings and swirls that can stand in for machinery (the sluice wheel).
- **Playing on screen:**
  - **Screenshots** worked this session at mobile size (the pane wasn't hidden). If they time out, the memory note "Hidden Browser pane traps" has the canvas-copy workaround.
  - **Save slots:** in Rob's own browser on port 8000, slot 1 holds his old test game (Juniper, save version 15): never Continue it. In the Browser pane's storage the slots may all be empty; check before choosing one.
  - Tap buttons with the JavaScript tool (`.choice-card` elements for choices; a d20 waiting to be rolled is a button showing "20"). `[data-key="…"]` works for level-up controls: `hp-fixed`, `subclass-champion`, `feat-ability-score-improvement`, `increase-strength1`, `mastery-spear`, `finish`. The debug panel's toggle is `button.debug-toggle` (fixed-position, so `offsetParent` is null).
  - **Fights in a hidden pane:** walks wait on animation frames that never come. Press End turn, then reload the page and Continue the slot: the fight is saved as decided. That works for the hero's own move too (this session: tap a square on `canvas.battle-grid` by dispatching a click at its centre, reload, Continue, and the hero is there).
  - **Low-level heroes in late fights:** debug's Jump doesn't level the hero, and a level 1 hero can die in round 1 of the chantry fight (Aveline's two bow shots). Force the next d20 to 20 in debug before choosing the fight, so the hero goes first.
  - **Getting to a scene:** debug's **Set level** walks through every level-up screen, **Join** adds Odda or Fen (two Join buttons: click both), **Add flag** sets story flags (the input's `aria-label` is "Flag to add"), **Give gold**, and **Jump** reaches any knot (the select's `aria-label` is "Scene to jump to"; set its value, dispatch `change`, then click Jump). To fill a debug input from the JavaScript tool, set its value with the native value setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)`), then dispatch `input` and `change`. Debug has no control for approval or for killing a companion: edit the save (IndexedDB `questbound` → `slots`, key = slot number), `store.put(record)` with no key, reload, Continue.
  - **The playtest log:** clean your entries from a test page such as `/tests/levels.html`, not the game page: the game keeps the log in memory and writes its copy back.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP: Moderate means more than the Low budget and up to the Moderate one. The hymn's risen dead and reinforcements aren't counted on the card.
