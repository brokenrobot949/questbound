# Handoff: starting the next slice

Written on Oct 16, 2026, at the end of the session that built Chapter 3's beats 3 and 4 (the
Hall of Champions, and the flooded vault). Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I); update it whenever work moves to a new phase (Act I ends with Chapter 3).
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - World and Exploration, "Dungeons": the Kings' Barrow is **two maps, one per level** (Rob, Oct 12, 2026). The upper barrow is built; the deep barrow (`deep-barrow`) has its first room, the flooded vault. Rooms can change with the story (the vault drained or flooded). Traps work from the SRD's own traps (`data/srd/traps.js`).
  - Combat: "Chapter 3's monsters" (the Ogre Zombie, and Large creatures taking one square for now), "Encounter design" (budgets, twists, the hymn, Reinforcements, "Foes don't cast spells yet"), and "Allies who aren't companions" (the Rival in the chantry).
  - Rules and Progression: "Milestones", and levels 1–4 (heroes stop at 4 for now; Chapter 3 ends at level 5, which isn't built).
  - The Whisper: dark choices set flags now, counted when the Whisper is built in Phase 3.
- `docs/STORY.md`: **Chapter 3 · The Kings' Barrow**. Beats 1 to 4 are written up as built; beats 5–7 are the plan. Beat 4's "For beat 5" line lists every flag the chantry should use.
- `story/act-1/ch3-vault.ink`: the last scene built (`ch3_vault`), as a pattern for a fight with an approach (sneak, spell or straight in), Fate's Mercy that captures you and lets you escape, freeing people with lines that depend on earlier choices, and a route choice that sets flags for the next beat. `story/act-1/ch3-hall.ink` (`ch3_hall`) is the pattern for traps, spells from the hero or a companion, and a check that fails forward.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (he took all seven this session).
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
| Offline version | `questbound-v35` (this session's two slices: v34 for the hall, v35 for the vault; Rob hadn't pushed v34 yet) |
| Save format | version 18. These slices added only flags, and `battle.absentOnlookers` (inside a fight: older saves read as "everyone's there"). |
| Tests | 474 passing: rules 88, combat 68, saves 71, story 17, levels 22, dungeon 128, spells 34, classes 46 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–4 (heroes stop at 2,700 XP) |
| Story | Chapters 1 and 2 complete; Chapter 3 beats 1–4. Every path ends in the flooded vault, drained or flooded back (`ch3_vault.garrick_goes`): "Go down to the Chantry of Ash, and stop Cantor Vesk's hymn. (The rest of Act I is still being written.)" |

Built this session, beat 4 (Rob's choices, Oct 16, 2026: the Ogre Zombie takes one square for now; acolytes and a hymn; draining is fast, flooding is safe):
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

**Chapter 3, beat 5: the Chantry of Ash** (STORY.md, Chapter 3): the boss fight. It's big enough that it may want splitting into two slices; ask Rob. One way: (a) the way there (the long way round, if flooded) and the chantry room, ending at the doors with the fight ready; (b) the fight itself, with foe spellcasting and the Aveline twist.
- **Where it starts:** `ch3_vault.garrick_goes` ends with `-> END`. Replace it with beat 5 (a new knot, maybe in `story/act-1/ch3-chantry.ink`), and add `{ scene: 'ch3_vault', continueAt: '<beat 5>' }` to `data/campaign/story-continues.js`. Update the saves tests "Old ends: …", which jump to `ch3_vault.garrick_goes` as today's end (six of them), and the dungeon tests that assert `cards(game)` is `[]` after the drain or flood choice (two of them, near the end of `tests/dungeon-tests.js`).
- **The map:** more rooms on the `deep-barrow` map below the vault. Doorways must sit on a band's first or last row: the vault's bottom row is row 10 (its Choir's crawl is at (6, 10) and (7, 10)), and the drained stair is in the middle of the channel at (3, 6) and (4, 6), so the quick way down may need the vault's `changes` rows redrawn to put a doorway on row 10 (keep the change rows covering the whole band). The long way round (the builders' old drain, "up off the landing") needs its own doorway too.
- **Beat 5's pieces** (STORY.md): Cantor Vesk sings the dead awake: a Cultist Fanatic, the Wight (the risen Dame Aveline) and Zombies, High (for a level 4 party of three: more than 1,125 XP, up to 1,500). A Rival who was freed (`rival_freed`) fights beside you as an ally the game plays. The twist: call the Wight by her name, and she stops, remembers her oath, and turns on Vesk (`aveline_rested` or `aveline_destroyed`).
- **The flags to use:** `vault_drained` (quick: arrive before the hymn's done, but the Choir's reinforcements come down behind you) or `vault_flooded` (no reinforcements, but the long way round, a room with its own danger, and arrive later, with the hymn further along); `vault_acolyte_fled` (Vesk is warned); `vault_fates_mercy` (the vault's dead went down to the rite); `darts_fates_mercy` (hours lost); `read_the_oath_wall` (her name and her oath, "until I am called by name"); `rhosyn_lives` (Rhosyn is the Fanatic); `swore_the_oath`.
- **What's missing in the engine:** foe spellcasting (the Fanatic's Command, Hold Person and Spiritual Weapon; Rhosyn's `variant` note); the Wight (SRD extract around line 51578, CR 3, 700 XP: not in `monsters.js`); a way to call Aveline by name in the fight (an action on the battle screen, or a choice before it); the Rival's stat block as an ally.
- **Questions worth putting to Rob first:**
  - Vesk's stat block, and who stands with him (the Fanatic is Rhosyn if she lives, otherwise who?), to make it High with the Wight.
  - The Rival as an ally: which stat block (a Bandit Captain without the crossbow, a Scout, a Veteran?).
  - Calling Aveline by name: an action anyone can take in the fight (with `read_the_oath_wall`), or a choice before it? And what she does then: fights beside you, or just stops?
  - Whether a hero who failed the oath-wall reading can learn her name another way (Garrick or the Rival heard the Choir use it?).
  - What the long way round holds (a squeeze, a climb, a small fight?), and what "arrive later" and the lost hours change (the Wight already up, an extra Zombie?).
- **Later in Chapter 3:** the first shard (beat 6), Bramblegate's thanks (beat 7: the Missing Miller quest finishes, with Garrick home), and level 5 for the four classes and the companions (Chapter 3 ends there).

Smaller follow-ups noted along the way (each could be its own slice):
- **Companions and death saves outside a fight:** DESIGN.md's rule says nobody helps (from Phase 1, when the hero travelled alone). With Odda and Fen standing right there, the darts' "you come round" text has Odda waiting for you to wake. Rob may want companions to stabilise you instead (Spare the Dying, Medicine).
- **Blindsight** (Animated Armor, 60 ft) isn't played: a hidden hero or Fen stays hidden from the guardians. Playing it touches `sees`, the hidden Advantage/Disadvantage lines and the foes' targeting in `battle.js` (the `variant` note in `monsters.js` says so).
- **Foe spellcasting** (for the chantry): the Cultist Fanatic's Command, Hold Person and Spiritual Weapon, used against the party. Rhosyn's `variant` note in `data/srd/monsters.js` says what's missing.
- **Level 5** for the four classes and the companions: Extra Attack, level 3 spells, Sneak Attack 3d6, and so on.
- **Cairnfield's threads:** `rhosyn_lives` should make her the Fanatic in the chantry; `tobin_freed` could bring Tobin back with the barrow's back ways.
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
- **Rooms that change** (`changes` in `dungeons.js`): `dungeonRows(dungeon, flags)` in `js/engine/world/dungeons.js`, used by the dungeon map. Fights use the rows as first drawn (`encounterRows`).
- **Story commands:** `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `likes_you`, `dislikes_you`, `companion_alive`, `raise_companion`, `companion_can_cast`, `companion_cast`, `can_pay`, `pay`, `allies_standing`, `ally_standing`, `has_bond`, `bond_name`, `xp_milestone`, `take_damage`, `spring_trap` are in `js/engine/story/externals.js`, declared in `story/externals.ink`. `lies_in_state(id)` is an Ink function in `ch2-temple.ink`, and `oath_wall_easy()` one in `ch3-hall.ink`.

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

- **Chapter 3:** `tests/dungeon-tests.js`, at the end: `atTheDarkMoon(seed, { character, flags, odda, fen })` jumps to `ch3_dark_moon`; `toTheGate(game)` waits out the day and goes down to the gate; `settleGate(game, start, { won, setUp })` settles the gate fight. `atTheHall(seed, { character, flags, odda, fen })` goes through the gate by the ward-word and down the stair; `intoTheHall(game)` finds the darts (a natural 20) and goes into the hall. `champion4` is a level 4 Champion (so Odda is level 4, with Detect Magic); `juniper` is a Sage Wizard with Mage Hand, Comprehend Languages and Detect Magic; `barrowRoom(id)` is a room of the upper barrow; `darts` is the Poisoned Darts trap. `atTheVault(seed, { character, flags, odda, fen })` jumps to `ch3_vault` (a level 4 Champion unless given); `settleVault(game, start, { won, setUp })` settles the fight at the wheel; `sable` is the level 4 Champion with a Rival Bond called Sable Rook; `vaultRoom()` is the flooded vault.
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
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it; class tables are garbled, with some digits as letters: `j` is 4, `k` is 5; negative modifiers show as `�c` and `�d`). Traps are around line 27180 (Poisoned Darts at 27305), and monsters by name (Animated Armor around line 34796, the Ogre Zombie around 52102). If it's gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling in a PowerShell `System.Drawing` script, label each square, then Read the PNG. Knights in plate are on the humanoid sheet's row 4; stone doors on `Objects/Door0.png` (the gilt-framed one is column 4, row 1); trap plates on `Objects/Trap0.png` (row 0); stairs on `Objects/Tile.png` (row 1). Big zombies are on `Characters/Undead0.png` row 0 (columns 6 and 7), and a crowned skeleton king and a dark lich-like figure on row 2 (columns 6 and 7), which might suit the Wight. `Objects/Decor0.png` row 20 has a bloodied altar (column 1) and two knight statues (columns 3 and 4), for the chantry and Aveline's tomb.
- **The deep barrow's stand-ins:** the effects sheet (`Objects/Effect0.png`) holds rings and swirls that can stand in for machinery (the sluice wheel).
- **Playing on screen:**
  - **Screenshots** worked this session at mobile size (the pane wasn't hidden). If they time out, the memory note "Hidden Browser pane traps" has the canvas-copy workaround.
  - **Save slots:** in Rob's own browser on port 8000, slot 1 holds his old test game (Juniper, save version 15): never Continue it. In the Browser pane's storage the slots may all be empty; check before choosing one.
  - Tap buttons with the JavaScript tool (`.choice-card` elements for choices; a d20 waiting to be rolled is a button showing "20"). `[data-key="…"]` works for level-up controls: `hp-fixed`, `subclass-champion`, `feat-ability-score-improvement`, `increase-strength1`, `mastery-spear`, `finish`. The debug panel's toggle is `button.debug-toggle` (fixed-position, so `offsetParent` is null).
  - **Fights in a hidden pane:** walks wait on animation frames that never come. Press End turn, then reload the page and Continue the slot: the fight is saved as decided.
  - **Getting to a scene:** debug's **Set level** walks through every level-up screen, **Join** adds Odda or Fen (two Join buttons: click both), **Add flag** sets story flags (the input's `aria-label` is "Flag to add"), **Give gold**, and **Jump** reaches any knot (the select's `aria-label` is "Scene to jump to"; set its value, dispatch `change`, then click Jump). To fill a debug input from the JavaScript tool, set its value with the native value setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)`), then dispatch `input` and `change`. Debug has no control for approval or for killing a companion: edit the save (IndexedDB `questbound` → `slots`, key = slot number), `store.put(record)` with no key, reload, Continue.
  - **The playtest log:** clean your entries from a test page such as `/tests/levels.html`, not the game page: the game keeps the log in memory and writes its copy back.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP: Moderate means more than the Low budget and up to the Moderate one. The hymn's risen dead and reinforcements aren't counted on the card.
