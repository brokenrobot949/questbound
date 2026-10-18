# Handoff: starting the next slice

Written on Oct 18, 2026, at the end of the session that built **Act I's Chapter 1 side content**:
Too Many Cats (the Stirges in the Tallow and Thistle's hayloft), the wolf den on the north road,
Hob's bet (and Hob's forge, which now sells weapons), and one last morning in Bramblegate after
the feast, where any side quest a save missed waits before the road south. Start a new Claude
Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I), and it stays there: Rob chose (Oct 17, 2026) to build Act I's side content before moving to Phase 3, then playtest Act I against the phase gate ("Act I plays in about 6 hours").
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - World and Exploration: "Towns" (**"When side quests come"**: each at its own chapter's town visit, with a catch-up on the act's last morning), "Where the content comes from" (**Act I's contracts are written by hand**: the wolf den and Hob's ore are ordinary side quests; road events wait for Phase 3).
  - Rules and Progression, "Experience and levels": **side quests** give XP like the main path (fights, discoveries, and quest XP: 50 for each of Chapter 1's, 25 for Hob's bet), plus gold or loot.
  - The Game as Dungeon Master, "Dice and honesty": **Contests** (original; SRD 5.2.1 has none).
  - Character Sheet and Inventory, "Equipment and loot": **Shops so far** (Hob's forge, discounts won in the story).
  - Combat: **Act I's side-quest monsters** (the Stirge, flying, the two new fights), "Encounter design" (the 2024 budget, reinforcements).
- `docs/STORY.md`: **Chapter 1 side content** is written up as built. Chapter 2's and Chapter 3's "Side content" lists are what's left. Chapter 3's beat 7 now ends with "One last morning in Bramblegate" and "The road south".
- The scenes built this session, as patterns: `story/act-1/ch1-too-many-cats.ink`, `ch1-wolf-den.ink` and `ch1-hobs-bet.ink` (each a **tunnel**: `-> side_cats -> bramblegate` from Chapter 1's notice board, `-> side_cats -> act1_last_morning` from the last morning, returning with `->->`; the flag `last_morning` changes a few lines), `story/common/hobs-forge.ink` (a shop: `#buy:item #shop:hobs-forge`, `can_afford_at`, `buy_at`), and `story/act-1/act1-last-morning.ink` (`act1_last_morning`, the hub of missed side quests; its Ink function `side_quests_left()`, which each new side quest must join; and `act1_end`, the road south and the End of Act I card).

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (three of four this session: he chose all of Chapter 1's side content in one slice rather than Too Many Cats alone).
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save, or delete the slot in IndexedDB), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage: your sessions by `gameId`, and the scene entries you added at the end of `scenes`). **Check which port the preview server got:** each port has its own saves and log. This session's server was on port 8000; in the Browser pane its storage started empty (no saves, an empty log) and was left empty. Rob's own browser has its own storage, with his test games in it.
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js. A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`, as `levelFeats` did. (A new field inside `game.battle` needs none of this: older saves without it read as "none". The Stirge's `'attached'` effect is one.)

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v41` (Chapter 1's side content; beat 7 went out as v40) |
| Save format | version 18, unchanged. This slice adds only story flags, quests, people and a shop. |
| Tests | 559 passing: rules 89, combat 78, saves 75, story 24, levels 28, dungeon 167, spells 43, classes 55 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–5 (heroes stop at 6,500 XP) |
| Story | Act I's main story is complete (Chapters 1–3), and Chapter 1's side content. Every path ends on the road south the day after the feast (`act1_end`), with the "End of Act I · The Barrow Dead" title card and the aim "Follow the shard south. (Act II is still being written.)". Chapter 2's and Chapter 3's side content isn't built. |

Built this session, Chapter 1's side content (Rob's choices, Oct 18, 2026: each side quest at its own chapter's town visit, plus a catch-up after the feast; the wolf den written by hand now rather than waiting for Phase 3's contracts; all three of Chapter 1's in one slice; side quests give XP plus gold or loot):
- **Story:** `ch1-too-many-cats.ink` (`side_cats`), `ch1-wolf-den.ink` (`side_wolves`, and the Ink function `wolves_starving()`), `ch1-hobs-bet.ink` (`side_hobs_bet`), `story/common/hobs-forge.ink` (`hobs_wares`), `act1-last-morning.ink` (`act1_last_morning`, `act1_end`). `ch1-bramblegate.ink`: the wolf notice on the board, and the board's `read` stitch offers the cat and the wolves; the forge's `talk` offers the bet and the blades. `ch3-homecoming.ink`'s `ch3_night.morning` now ends with "Go out into Bramblegate, one last time" (sticky) to the last morning, instead of the End of Act I card. STORY.md has every check, DC and flag.
- **Flags:** `saw_stirge_bites`, `knows_stirges`, `smoked_the_nest`, `cats_done`, `cats_fates_mercy`, `morwen_free_breakfasts`; `wolves_starving`, `den_unseen`, `wolves_killed`, `wolves_moved_on`, `wolf_den_done`, `wolf_den_fates_mercy`; `hob_discount`, `won_hobs_bet`, `lost_hobs_bet`, `cheated_hobs_bet`, `hobs_bet_done`; `last_morning`.
- **Data:** the **Stirge** in `data/srd/monsters.js` (`fly: 40`, and its Proboscis's `attach: { dice: '2d4', type: 'necrotic' }`); encounters `loft-stirges` and `wolf-den` (with `reinforcements.arrival`, a line of their own, and `unlessFlag` `smoked_the_nest` / `den_unseen`); quests `too-many-cats` and `wolf-den` ("Wolves on the North Road"); people `greta` (Hob's apprentice) and `shepherd`; `data/campaign/shops.js` (`hobs-forge`, with its 10% discount on `hob_discount`); sprites: sheets `pest` and `cat`, the `stirge` sprite, and tiles `hay-bale`, `hatch`, `grey-cat`, `ginger-cat`, `black-cat`, `white-cat`. `story-continues.js`: `{ scene: 'ch3_night', continueAt: 'act1_last_morning' }`.
- **Engine:**
  - `battle.js`, section **"Clinging on"**: `attach` (from `performAttack`, after `onHitCondition`), `drinkAtStartOfTurn` (in `beginTurn`, for foes), `dragClingers` (each step in `moveAlong`), `settleClings` (after every move, a push in `pushAway`, and Misty Step in `heroTeleport`), `dropClings` (a foe that falls, in `takeHit`), `clingingTo`, `clingersOn`, `pullOffTargets`, `heroPullOff`. A clinging foe makes no Opportunity Attacks and does nothing else on its turn (`enemyTurn`). `battleScene` units have `clinging` (the host's id). `speedOf` uses a monster's `fly` speed when it's faster. One reinforcement arriving "comes" and "joins".
  - `companion-ai.js`: `weighUp` counts a foe clinging to the party three times over, like a Hold Person caster.
  - `battle-screen.js`: "Pull Stirge 2 off you" / "… off Odda" under Other actions; "(clinging to you)" in the turn order; a status note while one clings to you.
  - `externals.js` / `externals.ink`: `can_afford_at(shop, item)`, `buy_at(shop, item)` and `contest(skill, who, bonus)` (their roll first, as an `opponent` roll; then the hero's, against their total + 1, with Guidance and Tactical Mind; returns 1, 0 for a tie, or -1; the hero's result has `target: { type: 'contest', value, who }` and outcome 'won', 'tie' or 'lost').
  - `inventory.js`: `findShop`, `shopDiscounts`, `priceAt(game, id, shopId)`; `canAfford` and `buyItem` take an optional shop. `tags.js`: `#shop:id` and `#contest:skill:who`. `adventure-screen.js`: `buyLabel` ("Buy · 1 GP, 8 SP (10% off: Hob's bet)") and `contestLabel` ("Athletics · contest with Greta"). `roll-format.js`'s `targetText`: "Greta's 15".
- **Seen on screen** (phone size, port 8000, Wren): the notice board with the wolf notice and both side-quest cards; Morwen and the stable; the smudge pot; the loft page and its "Fight · Low" card; the hayloft on the grid (the three cats on the beams, hay, crates, barrel, the hatch, two Stirges); a Stirge clinging on ("Stirge 2 (clinging to you)", the status note, the Pull off card); a fallen Stirge letting go; losing to the Stirges and the Fate's Mercy page; Hob's bet, the two contest rolls, a Heroic Inspiration reroll of only Wren's die (1 → 17, won), Greta's and Hob's portraits; Hob's blades with the discount on every card, and a dagger bought; the wolf den (Pike, the road, the howl, the den on the grid with "One Wolf is coming from the hills"), a won fight and Pike's ten gold; the journal (both quests done, the deeds); the last morning (by debug Jump), Hob's forge there, the road south and the End of Act I card. **Checked only by tests:** the Nature check and Speak with Animals at the stable; the third Stirge waking; the Stirge's drink, its trailing along, and letting go of someone who falls; Fen going for a clinging Stirge; the den unseen (no mate, a surprise attack); moving the wolves on; the deer note in The Missing Miller; a tie and a loss in Hob's bet, turning it down; the last morning with every side quest left; the old-end pickup for saves that stopped the morning after the feast.

The sessions before built beat 7 (the feast that ends Act I's main story), level 5, beat 6 (the first shard), foe spellcasting, and Chapter 3's beats 1–5: see git history, DESIGN.md and STORY.md.

## 4. The next slice

**Act I's Chapter 2 side content**, still Phase 2. STORY.md lists it under Chapter 2, "Side content":
- **The Hanging Tree** (Fen): an old Choir dead-drop with a coded note about the Precentor.
- **Hob's ore** (a contract, written by hand like the wolf den): escort a cart through Gnoll country.
- **Road events on the barrow road**: Rob chose (Oct 18, 2026) to leave road events for Phase 3's travel and random tables, so they aren't part of this.

Put the questions to Rob first, recommended option first. The ones that look like his:
- **Where in Chapter 2 is the town visit?** Chapter 2's town moments: Lark's rescue ends with Morwen's late breakfast (`ch2_ossuary.out_to_the_square`), then the stocks that afternoon (`ch2_stocks`), Fen's lead over a pie and a night at the inn; and the morning before the barrow (`ch2_rally`, with "the dark of the moon is tomorrow night", so there's urgency). Fen joins at the stocks, so The Hanging Tree needs him: after the stocks (before the Old Ford), or at `ch2_rally`? Hob's ore takes a day on the road with a cart: the rally morning is short of time. Offer each where it fits, or both at `ch2_rally` with the urgency softened, or a free morning before the road north (between `ch2_stocks` and `ch2_old_ford`)? Missed ones go to the last morning either way (`act1_last_morning`, and add each to `side_quests_left()`).
- **Gnolls:** check the SRD extract (section 7) for which gnolls SRD 5.2.1 has and what their stat blocks do, and pick a fight for a level 3 party of three (Moderate: 675 XP). Anything they do that the grid doesn't yet (a bonus action after a kill, say) is new fight code.
- **The escort:** the cart (and its driver, Hob's cousin?) as allies to keep alive (`allies` and `allyObjective`, as at the Old Ford), or as an onlooker the fight is about? And what Hob's ore is for (a better blade at his forge, a new item in his stock?).
- **The coded note:** a puzzle (a cipher the player solves), a check (Investigation, or Fen's Choir past), or a spell (Comprehend Languages)? It's about the Precentor: Fen's ledger (`fen_told_of_ledger`) and the signet (`heard_of_precentor_signet`) are already planted for Act II.
- **Which first, and how many per slice?** The Hanging Tree is short and needs no new monster; Hob's ore needs Gnolls and an escort fight.

**Still to use** from Act I: `escape_fates_mercy`, `vault_fates_mercy`, `darts_fates_mercy`, `drain_fates_mercy`, `cats_fates_mercy` and `wolf_den_fates_mercy` (narrative only so far), `swore_the_oath`, `looted_the_champions`, `promised_nettle_warren` and `owe_nettle` (nothing settled yet), `morwen_free_breakfasts`, `cheated_hobs_bet` (Greta knows), `wolves_moved_on` / `wolves_killed`, and beat 7's "For Act II" list in STORY.md.

Follow-ups from this slice:
- **Stirges hit hard for a Low fight.** On screen, Wren (12 HP, AC 17) lost the loft fight with the nest smoked: two Proboscis hits of 8 each, before any drinking. The budget calls two Stirges Low for a level 1 hero, and the SRD's Proboscis is 1d6 + 3. A level 1 Wizard is in more danger still. Rob may want one Stirge awake when the nest is smoked (Low is 50, and one Stirge is 25), or to keep it as is and let Fate's Mercy (and Morwen's poker) cover it.
- **Killing the she-wolf before round 3 ends the fight**, and her mate never comes, as at the barrow gate: reinforcements still coming don't keep a fight going. The victory text was made to work for one wolf or two.
- **Flying is only speed:** a flyer still goes round obstacles and can't cross deep water (DESIGN.md says so). Act II's fliers may need more.
- **A Stirge only clings to the party and allies**, and lets go of anyone who drops; it never clings to a turned ally, since nothing turns. Companions attack a clinging Stirge rather than pull it off. Pulling one off a friend needs you beside them.
- **Hob's shop sells weapons only.** Armour (and a Shield) wait for a way to change what you wear; nothing is sold back. Debug's Give item doesn't list his stock. Weapons bought aren't given Weapon Mastery (a Fighter's masteries are still chosen at creation and level 4).
- **Debug's force-next-d20 in a contest** goes to the other side's roll (it rolls first), not the hero's.
- **The last morning** is offered even when every side quest is done (Hob's forge and the ride south): fine, but Rob may notice.
- Debug's Jump list now also shows the Ink functions `wolves_starving` and `side_quests_left` (the known follow-up below).

Follow-ups from beat 7:
- **Act II's Chapter 4 must read beat 7's flags:** Marchbank escorts you whatever you said (`marchbank_agreed`, `marchbank_refused`, `marchbank_put_off`); the League's letter names Silas Dray; `met_hesper` or `named_hesper` for the stone ring; the Rival has gone (`rival_left_bramblegate`) and joins the Choir. Companions still lying in the temple (the candle was spent in Chapter 2) need Act II's temples.
- **Chapter title cards:** the `#heading` tag could open each chapter ("Chapter 2 · The Barrow Road"). Only the end of Act I uses it now.
- **The end card** still says "That's as far as the story goes for now…" under the End of Act I card. Rob might want words of its own for the end of an act.
- **The milestone note** prints "6500", not "6,500" (`dmNotes.xpMilestone`, as on the eve). A number format would fix both.
- **Old-end tests** in `tests/saves-tests.js` start from the story's last page today, `act1_end`. When the story goes on past it, point them at the new last page, and add `{ scene: 'act1_end', continueAt: … }`.
- The great candle's text says "He holds it over them" for one companion or two (singular "them"). Fine, but Rob may notice.

Follow-ups from level 5:
- **Revivify out of a fight:** only in the fight where the companion died (within 10 rounds). A companion who dies on the fight's last turn can't be revived before the story moves on, and allies (the Rival, the watch) can't be. Diamonds aren't sold yet; Odda never casts it.
- **Memorize Spell** and Arcane Recovery wait for Short Rests, which aren't in the game.
- **Cunning Strike's Poison** waits for a Poisoner's Kit. Ray of Enfeeblement, Darkness and Pass without Trace have no fight rules yet; Speak with Dead and Tiny Hut wait for scenes (`WAITING` in `tests/spells-tests.js` lists them).
- **Counterspell** stops only Hold Person (Rob's choice). Spirit Guardians spare allies and turned allies; a foe pushed into them (Thunderwave) isn't struck, nor one a caster's Misty Step lands beside (only walking counts).
- **The hero can't shake a friend out of Hypnotic Pattern** (foes shake each other, and damage ends it). Odda doesn't either.
- **Fireball's 20-foot radius covers most of a small map** (a 9 × 9 block). Working as the rule says.
- **A Fighter's Withdraw-like free moves** end as soon as the hero does anything else (Tactical Shift, then an attack, loses the move).
- **Odda's Spirit Guardians** go up only once a foe is within 30 feet; otherwise she opens with Spiritual Weapon and keeps it.

Follow-ups from beat 6:
- **The shard's power by itself:** only a scene can use it (a `#shard:` choice). Using it outside a scene (from the Sheet), or on the battle grid, isn't built, nor is the Whisper.
- **Speaking with the dead elsewhere:** the shard could speak with other dead the party has met (Aveline, the champions, Tamar at the Old Ford) in later scenes. Each use is a flag of its own for the Whisper (DESIGN.md lists them).
- **The party on the forecourt map** stands at the room's entry, at the top by the moor, though they came up out of the gate at the bottom. A room has one entry (and `entryWhen` by flags).

Follow-ups from foe spellcasting (each could be its own slice):
- **The chantry with Rhosyn alive is hard** (won 8 of 30 by a simple autopilot hero with her spells, 11 without). Rob may want to play the fast way with Rhosyn alive and decide.
- **Foes' spells reach only the party**, never allies such as the Rival or a turned Aveline.
- **`casterTurn` is written for the Fanatic's three spells.** A new spellcasting monster in Act II needs its own spells added there.
- **Command's other words** (Approach, Flee, Drop) aren't built, and the hero's own Command still says only Grovel.
- **Heroic Inspiration by choice** on a foe's turn isn't built: only the automatic reroll against Hold Person.
- No "caster" behaviour that keeps its distance: a Fanatic closes in after casting, like a brute.

Smaller follow-ups noted earlier (still open):
- **Companions and death saves outside a fight:** DESIGN.md's rule says nobody helps (from Phase 1). Rob may want companions to stabilise you instead.
- **Blindsight** (Animated Armor) isn't played: a hidden hero or Fen stays hidden from the guardians.
- **Cairnfield's threads:** `tobin_freed` could bring Tobin back with the barrow's back ways.
- **The Wight's Life Drain** isn't played: the game can't lower a Hit Point maximum yet.
- **A Rival who falls** in the chantry is badly hurt, not dead (`rival_wounded`), though the fight log says they "fall, and don't get up".
- **The long way round** isn't a room of its own on the map.
- **Seeds planted:** `odda_saw_ingriths_oath` (Chapter 6), `swore_the_oath` (the endings, Hesper), `looted_the_champions` (the Whisper; Factor Penhallow wants the crown-stamped gold with `league_deal`).
- **Names are unique** (Rob, Oct 12, 2026; STORY.md). New names this session: Greta (Hob's apprentice), the Grey Teeth, the Fallow Woods. Left alone as not quite clashes: Reeve Corbin and Tobin, Orrin and King Osric, Factor Penhallow and Morwen Tallow.
- **Raising:** the great candle is spent once used (`flame_spent`). A companion who dies after that lies dead until Act II's temples.
- **Levels 4 and 5:** Magic Initiate's "Spell Change" and the Wizard's and Cleric's cantrip swap on a level-up aren't built. Skilled picks skills only. Grappler waits for grappling. Odda's AI never casts Resistance.
- **Allies:** Odda's spells don't reach the soldiers. Allies die at 0 Hit Points with no death saves.
- **Flags for later:** `regency_favour`, `varrow_holds_cairns`, `promised_nettle_warren`, `owe_nettle`, `rival_taken`, `league_deal`, `league_refused`, `league_wants_crowns`, `met_penhallow`, `mentor_warned`, `sibling_letter`, `fen_returned`, `ford_fell`, `ford_abandoned`, the Crane flags, `odda_told_of_emberdeep`, `odda_means_to_go_home`, `fen_told_of_ledger`, `fen_just_arithmetic`, `heard_of_precentor_signet`. **Gaunt** may come back (`gaunt_spared`, `hunters_backed_off`, `hunters_faced_down`, `hunters_fled`, `fen_sold`, `fen_left_behind`).
- Odda's other spells in a fight (Guiding Bolt, Command, Sanctuary), and companions using the Help action.
- After a lost fight, a debug **Jump** that skips the Fate's Mercy scene leaves companions at 0 Hit Points into the next fight.
- The pixel font has no "−" (minus sign), so a negative modifier shows as "(_1)" in the score lists.
- A DC 12 or 13 check shows as "Easy" on its card (the ladder is Easy 10, Medium 15). Working as designed.
- The barrow's flanks on the forecourt map use the `barrow` hill picture, which reads more like a bush than a mound. The champions' tombs use the `bier` picture (a coffin with a gold cross). The sluice wheel is a blue ring from the effects sheet.
- Ink functions (`oath_wall_easy`, `lies_in_state`, `carried`, `raised_tonight`, `wolves_starving`, `side_quests_left`) show up in debug's Jump list, which lists every knot. The list could skip them.
- **Large creatures** (2 × 2 squares) aren't built: the Ogre Zombie takes one square. Act II's big monsters will need them.
- In Fate's Mercy at the vault, the "Your purse is gone." note comes before the text that says the same thing, as at the gate.

## 5. How the companion, ally and fight code fits together

- `data/campaign/companions.js`: each companion's level 1 choices, plus `levels: { 2: {...}, … }` changes; `tactic`, `likes`, `dislikes`; the `tactics` list; `approvalBands` (likes 3, dislikes −2).
- `js/engine/character/party.js`: `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`. `companionCharacter(id, level)` builds their sheet at the hero's level (never stored). `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion (reads and writes go to the member, except `battle`, `rng`, `day`, `time`, `flags`, `xp`, `story`). Also `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `raiseMember`, `approve`, `feeling`, `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 4,100 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`). A hymn's risen dead and reinforcements are pushed on the end, and act last in the round.
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)`; `c.ally`; `c.side === 'hero'`. Lists: `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`. Helpers: `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`.
  - **Wards** (`WARDS`), `castWard`; damage to the party goes through `takeHit` (the hero) and `companionHit`, both of which call `resistanceCut` first.
  - **Twists:** the hymn (`hymnRises`, `hymnHurt`, `singerOf`) and reinforcements (`reinforcementsDue`, `reinforcementsArrive`, with an encounter's own `arrival` line), both announced by `objectiveText`.
  - **Concentration:** `concentrationOf`, `startConcentration`, `endConcentration`, `tidyConcentration`, `concentrationCheck`, `holderOf(effect)`, `holdingSomeone`.
  - **Clinging on** (the Stirge): `attach`, `drinkAtStartOfTurn`, `dragClingers`, `settleClings`, `dropClings`, `clingingTo`, `clingersOn`, `pullOffTargets`, `heroPullOff` (section 3 has where each is called).
  - **A foe's turn:** `enemyTurn` (Command, Turned, Incapacitated, clinging, the singer, waking a sleeper, a coward fleeing, hidden heroes), then `casterTurn` for a monster with `spellcasting`, else `weaponTurn`. Command for anyone: `beginTurn` and `obeyCommand`.
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, `companionRestore`, `companionSpareTheDying`, `companionMedicine`, `companionDodge`, `companionDash`, `companionDisengage`, `companionHide`, `companionMove`, `companionReach`, `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn`; `friendsFor` and `forAllies`; `finishBattle` records `lastBattle.alliesAlive`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. It looks only at the party, never at allies. `weighUp` values foes (a Hold Person caster or a clinging Stirge three times over).
- `js/engine/character/hazards.js`: damage outside a fight (`takeDamage`) and traps (`springTrap`, `findTrap`, `trapDamageDice`).
- **Onlookers on some paths** (`ifFlag`), **rooms that change** (`changes`, `dungeonRows`, `encounterRows`, `mapFlagsFor`), `roomEntry` and `entryWhen`, **calling a foe by name** (`callByName`, `nameCall`, `heroCallByName`, `turnedAllyTurn`).
- **Story commands** (`js/engine/story/externals.js`, declared in `story/externals.ink`): `join_party`, `leave_party`, `in_party`, `party_full`, `approve`, `likes_you`, `dislikes_you`, `companion_alive`, `raise_companion`, `companion_can_cast`, `companion_cast`, `can_pay`, `pay`, `allies_standing`, `ally_standing`, `foe_escaped`, `foe_turned`, `has_bond`, `bond_name`, `xp_milestone`, `take_damage`, `spring_trap`, `has_shard`, `hero_name`, `finish_quest`, `give_item`, and now `can_afford_at`, `buy_at` and `contest`. Ink functions: `lies_in_state(id)` (`ch2-temple.ink`), `oath_wall_easy()` (`ch3-hall.ink`), `carried(id)` and `raised_tonight(id)` (`ch3-homecoming.ink`), `wolves_starving()` (`ch1-wolf-den.ink`), `side_quests_left()` (`act1-last-morning.ink`). Tags: `#heading`, `#shop:id`, `#contest:skill:who` (`tags.js`).

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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds; all eight pages take about two and a half minutes, the dungeon page alone about 80 seconds). Run it from any test page except `/tests/saves.html` (the save checks would run twice at once and fight over their test database).

- **Chapter 1's side quests** (`tests/story-tests.js`, at the end): `inTheSquare(seed, character)` is a new game in Bramblegate's square on the first morning (by `jumpTo(game, 'ch1_morning')`); `settleFight(game, start, { won, setUp })` starts the fight on that card and settles it (no fight XP banked); `scriptedThen(faces, seed)` scripts d20s (and any other dice: the faces are used for whatever die comes next, so a d4 needs a face from 1 to 4); `athletics(character)` is a hero's Athletics bonus; `questStatus(game, id)`, `has(game, flag)`, `pageText(page)`. Use **Sorael** (no Tactical Mind, no Guidance) for a contest you want to tie or lose: a Fighter's Tactical Mind turns a tie into a win from level 2.
- **The Stirge** (`tests/combat-tests.js`, after the Wolf): `stirgeFight({ character, seed, keepSecond, flags })` is the loft with the nest smoked, the hero first, Stirge 1 beside the hero on the hatch at (3, 7), and Stirge 2 out of it unless kept; `stirgeClings(game)` ends the hero's turn with Stirge 1's Proboscis hitting.
- **The last morning:** `jumpTo(game, 'act1_last_morning')`, or `ch3_night.morning` for the card that leads there. The old-end checks in `tests/saves-tests.js` start from `act1_end`.
- **Foe spells, Chapter 3's beats, beat 8, beat 6, Cairnfield** (`tests/dungeon-tests.js`): `fanaticFight`, `atTheHomecoming` (it now goes on through "Go out into Bramblegate" to "Ride south" for the End of Act I card), `toTheFaces`, `atTheShard`, `atTheDarkMoon`, `toTheGate`, `settleGate`, `atTheHall`, `intoTheHall`, `atTheVault`, `settleVault`, `chantryFight`, `atTheChantry`, `settleChantry`, `atTheEve`, `toTheCamp`, `homeFromCairnfield`, `throughTheTemple`, `toTheMorning`, `atCairnfield`, `upToTheRidge`, `settleCamp`. Level 5 heroes: `juniper4`, `posy4`, `sorael4`, `wren4Asi` (`level-up-tests.js`); `posy5`, `sorael5` (`classes-tests.js`); `wizard5`, `cleric5`, `partyFight` (`spells-tests.js`); `fighter5` (`combat-tests.js`); `counterWizard`, `champion5` (`dungeon-tests.js`).
- **Which page:** level-ups in `level-up-tests.js`; companions at every level and the Cleric's fight spells in `classes-tests.js`; monster checks, foe spells, traps, the encounter budget and the chapter playthroughs in `dungeon-tests.js`; allies, deep water and the Stirge in `combat-tests.js`; saves, migrations and old ends in `saves-tests.js`; the Ink bridge, tags, story-text lint, Chapter 1's hub and side quests in `story-tests.js`; d20 rules and `parseTags` in `rules-tests.js`.
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20 (both dice, with Advantage or Disadvantage). To script several dice, set `game.rng = scriptedThen([...faces], seed)`. Wren (the Champion) has Savage Attacker: her first weapon hit each turn rolls its damage dice twice.
- **Text after a choice** is on the *next* page. Check it after `pick`, not before.
- **Loading modules by hand:** navigate to a fresh page first; a page that loaded old code keeps it cached.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well (LF line endings). For many exact replacements, write a spec file and run a small perl replacer, or a perl one-liner for a single line. **No shell heredocs at all**, even quoted ones: write files with the Write tool. In a Perl one-liner's replacement, `@word` is an array and vanishes; write `\x27` for an apostrophe inside a single-quoted one-liner.
- **Ink:**
  - Write `word{cond:, more}` (no space before the comma); choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}` (join with `+`); a line where someone speaks ends with `#speaker:id`, and everyone who speaks needs an entry in `people.js` (a check fails otherwise).
  - **Tunnels work well for side quests:** `-> side_cats -> bramblegate` runs the scene and then goes on; the scene ends with `->->`, from any stitch in it. Choices, checks and `#combat:` fights inside a tunnel all work.
  - **Don't name a stitch after a knot** (`forge` is Chapter 1's forge knot; the last morning's stitch is `smithy`).
  - A gather that only runs logic works as a labelled gather on its own line, with the `~` line under it.
  - A stitch's read count gates a follow-up choice: `* {odda_prior > 0 && likes_you("odda")} [...]`.
  - A `#combat:` choice's content runs after the fight, so text meant to come before the fight has to be on the page before the choice.
  - `~ temp x = spring_trap(...)` then `{ x == "dead": -> mercy }` works; so does `~ temp result = contest(...)` then `{ - result > 0: … }`.
  - `quest_note` starts a quest that hasn't started: guard a note in someone else's quest with its flag (`took_bounty` for The Missing Miller).
- **The map's title shows the room's name**, so a room's `name` mustn't give away what's in it.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it with `grep -a`; class tables are garbled; negative modifiers show as `�c` and `�d`). Monsters by name (the Stirge is around line 49343: search "StirgeStirge"; the Wolf around 61357), spells by name, traps around line 27180. SRD 5.2.1 has no contest rule. If the extract is gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling in a PowerShell `System.Drawing` script, label each square, then Read the PNG (this session's script: `enlarge.ps1 <sheet> <out.png> <scale> <maxRows>`, in its scratchpad; easy to rewrite). `Characters/Pest0.png` has insects (the Stirge is column 5, row 1, a mosquito), `Characters/Avian0.png` row 11 has bats, `Characters/Cat0.png` has cats (grey column 0 row 3, ginger row 1, black column 2 row 0, white row 2). `Objects/Decor0.png` row 9: flour sack, crates, barrel, a hay bale (column 6), straw (column 7); row 19 cobwebs. Knights in plate are on the humanoid sheet's row 4; stone doors on `Objects/Door0.png`; trap plates on `Objects/Trap0.png`; stairs on `Objects/Tile.png` (row 1).
- **Little pictures drawn in code:** the spectral weapons (`SPECTRAL_WEAPON`, `ASH_BLADE` in `battle-screen.js`) are 16 rows of 16 letters, one per pixel.
- **Playing on screen:**
  - This session the pane was visible and screenshots worked at phone size, and fights played out by themselves (End turn, then wait about nine seconds for the foes' turns to replay). In a hidden pane, screenshots can time out or come back at double scale; then copy the grid out by posting `canvas.battle-grid`'s `toDataURL()` to a receiver in the scratchpad (the memory note "Hidden Browser pane traps"), and walks wait on animation frames that never come (press End turn, reload, Continue).
  - **The d20 to tap** is a button in `.roll-panel` showing "20". Don't click every button in a roll panel: the "Reroll ★" button is in there too, and spends Heroic Inspiration.
  - Tap choices with the JavaScript tool (`.choice-card`, its `.choice-text`). The debug panel's toggle is `button.debug-toggle`; check `!panel.hidden && panel.getBoundingClientRect().height > 0` before toggling. To fill a debug input, set its value with the native value setter, then dispatch `input` and `change`. Jump: set the select (`aria-label` "Scene to jump to"), dispatch `change`, click Jump.
  - **Save slots:** in Rob's own browser on port 8000, slot 1 holds his old test game: never Continue it. In the Browser pane's storage the slots may all be empty; check before choosing one.
  - **Setting up a moment in a fight:** edit the save (IndexedDB `questbound` → `slots`, key = slot number: `rec.game.battle`), `store.put(record)` with no key, reload, Continue.
  - **Low-level heroes in late fights:** debug's Jump doesn't level the hero. Force the next d20 to 20 before choosing a fight, so the hero goes first.
  - **Jumping back into a scene you've played:** debug's Jump keeps the story's memory, so once-only (`*`) choices already taken stay hidden; a page whose only choice was taken stops with "ran out of content". Start a fresh save to replay a scene from the top.
  - **The playtest log:** clean your entries from a test page such as `/tests/levels.html`, not the game page: the game keeps the log in memory and writes its copy back.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP. The hymn's risen dead and reinforcements aren't counted on the card, and killing every foe before reinforcements arrive ends the fight.
