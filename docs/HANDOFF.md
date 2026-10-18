# Handoff: starting the next slice

Written on Oct 18, 2026, at the end of the session that built **Act I's Chapter 2 side content**:
The Hanging Tree (Fen's Choir letter-drop, with a cipher and a line in the Precentor's own hand),
Hob's ore (escorting Dabbin's cart through gnolls in the Gorse Cut), and Hob's pay for it, a +1
weapon reworked in star-iron. Start a new Claude Code session in this repo and say:

> Read docs/HANDOFF.md, then build the next slice it describes.

Delete this file, or rewrite it, once that slice is done.

---

## 1. Read first

- `CLAUDE.md`: the hard rules (static site, no build step or npm, relative paths, SRD 5.2.1 only, seeded dice, `questbound:` keys, bump the service worker every release). **Rob commits and pushes with GitHub Desktop: never run `git push`.** Its "Current phase" line says Phase 2 (Act I), and it stays there: Rob chose (Oct 17, 2026) to build Act I's side content before moving to Phase 3, then playtest Act I against the phase gate ("Act I plays in about 6 hours").
- `docs/DESIGN.md`: the source of truth. The parts most relevant now:
  - World and Exploration, "Towns": **"When side quests come"** (each at its own chapter's town visit; missed ones on the act's last morning), "Where the content comes from" (road events wait for Phase 3).
  - Rules and Progression, "Experience and levels": **side quests** give XP like the main path (quest XP 50 each, discoveries 25), plus gold or loot.
  - Character Sheet and Inventory, "Equipment and loot": **Magic weapons** (new: Weapon, +1, and how it's stored).
  - Combat: **Act I's side-quest monsters** (the Stirge; new: the Gnoll Warrior, the Giant Hyena, **Rampage**, the Gorse Cut and how its pack was sized by simulation), **Allies who aren't companions** (new: Dabbin, a Scout who shoots; allies who fall badly hurt), "Encounter design".
- `docs/STORY.md`: **Chapter 1 side content** and **Chapter 2 side content** are written up as built. Chapter 3's "Side content" list is what's left.
- The scenes built this session, as patterns: `story/act-1/ch2-hanging-tree.ink` (`side_hanging_tree`) and `story/act-1/ch2-hobs-ore.ink` (`side_hobs_ore`, `hobs_reforge`, the Ink function `hob_owes_star_iron()`). Both are **tunnels**, called from the rally morning (`ch2_rally` in `ch2-temple.ink`) and from the last morning (`act1-last-morning.ink`); the flag `last_morning` changes lines. `side_quests_left()` in `act1-last-morning.ink` lists every Act I side quest: add each new one.

## 2. Working with Rob

- Rob is the game designer and doesn't code. You are the programmer.
- **Asking:** ask with the question tool when a design choice is really his, and put a recommended option first. He usually takes it (all four this session).
- **Slices:** build in small, testable slices. Each finishes with:
  1. Every test page passing.
  2. Checking it on screen at phone size (Browser pane, resize to mobile).
  3. Deleting any save you made while testing (debug: Reset save, or delete the slot in IndexedDB), and your entries in the debug playtest log (`questbound:playtest-log` in localStorage). **Check which port the preview server got:** each port has its own saves and log. This session's server was on port 8000; in the Browser pane its storage started empty (no saves, a log of `{"version":1,"sessions":[],"scenes":[]}`) and was left that way. Rob's own browser has its own storage, with his test games in it.
  4. Updating DESIGN.md and STORY.md.
  5. Raising the service worker VERSION in `service-worker.js`.
  6. A plain-language summary: what changed, what was seen on screen versus checked only by tests, design calls he may want to change, how to try it (hard refresh, `?debug`), and "commit and push with GitHub Desktop".
- **Save shape:** if the save changes shape, raise `SAVE_VERSION` in `js/engine/save/save-format.js` and add a migration step in `js/engine/save/migrations.js`. Never edit an old step. Any new game field goes in both `PLAY_FIELDS` (`js/engine/save/undo.js`) and the save lists in save-format.js. A new field on the character goes in `emptyDraft` (creation.js), the Quick Start heroes, the companions' data and `tests/rules-tests.js`'s `makeHero`. (A new field inside `game.battle`, or on a combatant, needs none of this: older saves without it read as "none". `rampaged`, `person` and `fallsHurt` are such fields.)

## 3. Where things stand

| Thing | Now |
| --- | --- |
| Offline version | `questbound-v42` (Chapter 2's side content) |
| Save format | version 18, unchanged. A magic weapon is an inventory id (`greatsword-plus-1`), so no new shape. |
| Tests | 572 passing: rules 89, combat 84, saves 75, story 31, levels 28, dungeon 167, spells 43, classes 55 |
| Classes | Fighter, Wizard, Cleric, Rogue, levels 1–5 (heroes stop at 6,500 XP) |
| Story | Act I's main story is complete (Chapters 1–3), with Chapter 1's and Chapter 2's side content. Every path ends on the road south the day after the feast (`act1_end`). Chapter 3's side content isn't built. |

Built this session, Chapter 2's side content (Rob's choices, Oct 18, 2026: both on the rally morning, the morning before the barrow; the carter an ally to keep alive; Hob pays by reworking your weapon +1; the cipher a check keyed to the hymnal):
- **Story:** `ch2-hanging-tree.ink`, `ch2-hobs-ore.ink`. `ch2-temple.ink`'s `ch2_rally` has "Call in at Hob's forge" (`forge_call`, `forge_talk`: Hob's pitch, the job, his blades), "Go with Fen to the old hanging tree at the crossroads", and with the job taken, "Ride north on Dabbin's cart" (held path: `by_cart`; ford-fell path: on to `ch2_cairnfield.road_north`). `ch2_eve.back_north` and `ch2_cairnfield.road_north` open differently after the cart ride; Fen's eve talk remembers the seal (`saw_precentor_seal`) and owns up to the book (`fen_dodged_the_book`). The last morning offers both if missed (Hob's ore becomes "Dabbin is overdue"), and Hob's reforge at his forge; "Ride south" goes by the forge while he still owes you.
- **Flags:** `cut_the_hanging_rope`, `saw_precentor_seal`, `read_choir_orders`, `read_choir_orders_part`, `fen_dodged_the_book`, `read_precentor_postscript`, `took_choir_letter`, `copied_choir_drop`, `hanging_tree_done`; `hobs_ore_taken`, `odda_in_the_gorse_cut` / `fen_in_the_gorse_cut` (who stood there), `spotted_gnolls`, `gnolls_fed`, `gnolls_killed`, `dabbin_hurt`, `odda_fell_in_the_gorse_cut` / `fen_fell_in_the_gorse_cut`, `hobs_ore_fates_mercy`, `hobs_ore_done`, `hob_reforged`.
- **Data:** monsters `gnoll-warrior`, `giant-hyena` (Large, one square), `scout` (`data/srd/monsters.js`; `bonusActions: ['rampage']`); `data/srd/magic-items.js` (Weapon, +1, +2, or +3); encounter `gorse-cut-gnolls` (a Giant Hyena and four Gnoll Warriors, 600 XP, sized for a level 3 party of three; `allies` with `person: 'dabbin'` and `fallsHurt: true`); the Rival's chantry allies now `fallsHurt: true` too; quests `hanging-tree`, `hobs-ore`; person `dabbin`; item `choir-letter`; sprites `gnoll`, `giant-hyena`, `scout`, tile `pony`, sheet `quadraped`; DM note `weaponMadeMagic`.
- **Engine:**
  - `battle.js`: section **"Rampage"** (`healthOf`, `isBloodied`, `canRampage`, `rampage`, called at the end of `performAttack`). `allyTurn`: a skirmisher ally (the Scout) shoots its bow when no foe is beside it (the Guards and the Rival, brutes, still brace). `startBattle` copies an ally's `person` and `fallsHurt`; `takeHit` logs "goes down, badly hurt" for `fallsHurt`. `objectiveText` with one ally: "Keep Dabbin alive: still standing" / "down, badly hurt".
  - `inventory.js`: `findItem` resolves `<weapon>-plus-<1..3>` (`magicWeapon`: `baseId`, `baseName`, `magicBonus`, `rarity`, `cost: null`); `plainWeapons(game)`, `makeMagicWeapon(game, id, bonus)`. `attacks.js`: a "Magic" modifier on the attack and `+magicBonus` on damage; mastery by `baseId`.
  - `externals.js` / `externals.ink`: `item_name(item)`, `plain_weapon(n)`, `make_weapon_magic(item)`.
  - `battle-screen.js`: an ally with `person` is drawn as that person (`personFrames`), with the ally frame.
- **Seen on screen** (phone size, port 8000, Wren at level 3 with Odda and Fen, by debug): the rally morning's new choices; The Hanging Tree (the tree, tearing the rope, the drop and the seal, a failed cipher's first lines, a forced History 20 and the court-tongue line with Fen's and Odda's replies, pocketing the letter); Hob's forge pitch; taking the job and riding north (Lark, Dabbin and Parsnip, the Gorse Cut); reading the gorse ("Fight · Moderate · Surprise attack"); the fight on the grid (the gnolls, the Giant Hyena on the road, Parsnip in the shafts, the cart's load, Dabbin on the tail-board as a gnome with the ally frame), two rounds played (Dabbin shooting twice, the hyena and gnolls attacking, Fen killing the hyena), a reload mid-fight (gnolls set to 1 HP in the save), a victory (600 XP), Dabbin's "Rabbits never did that", the Old Ford and the crate, Dabbin's ten gold, the eve's new first line and Fen's seal line; the last morning (by Jump) with Greta's line and the forge-then-ride-south choice, Hob's star-iron, the four weapon choices, "Your Greatsword is now a Greatsword +1…", the Sheet's "Greatsword +1: +6 to hit · 2d6 + 4 slashing" and the letter in the pack. **Checked only by tests:** Rampage (a gnoll's second Rend, once a fight; a Giant Hyena bounding to a new target), no Rampage on the unbloodied, Dabbin falling badly hurt and the story hearing it, the mutton trick, the ford-fell path, Fate's Mercy, Comprehend Languages on the court line, copying the letter back, the last-morning overdue version and its reforge, magic weapon maths and stacks.

The sessions before built Chapter 1's side content, beat 7 (the feast), level 5, beat 6 (the first shard), foe spellcasting, and Chapter 3's beats 1–5: see git history, DESIGN.md and STORY.md.

## 4. The next slice

**Act I's Chapter 3 side content**, still Phase 2. STORY.md lists it under Chapter 3, "Side content":
- **The Barrow-Wives** (side quest): three restless Specters in the lesser barrows, each laid to rest by finding what they lost.
- **The Tollman's Lantern** (road event): a Will-o'-Wisp on the marsh road. Rob chose (Oct 18, 2026) to leave road events for Phase 3's travel and random tables, so it isn't part of this unless he says otherwise.

Put the questions to Rob first, recommended option first. The ones that look like his:
- **Where is Chapter 3's town visit?** Chapter 3 is the barrow itself, then the walk home (`ch3_homecoming.the_road`, two days down the barrow road past the opened barrows), the feast (`ch3_feast`) and the last morning (`act1_last_morning`). The lesser barrows are on the moor. Offer it on the walk home (a detour among the lesser barrows, level 5, Garrick along?), or on the last morning as a ride back north, or both? There's no later catch-up after the last morning.
- **The Specter** (SRD 5.2.1: CR 1, 200 XP, AC 12, 22 HP, Fly 50 ft hover; resistant to bludgeoning, piercing and slashing among others; Incorporeal Movement; Sunlight Sensitivity; Life Drain +4, 2d6 necrotic, **and its Hit Point maximum drops**). The game can't lower a Hit Point maximum yet (the Wight's Life Drain isn't played either), and passing through creatures and objects is new. Build those, or a variant noted in the monster data? Fight them, or lay each to rest without a fight (the side quest's point)?
- **What each lost:** three small mysteries (a name, a keepsake, a promise?), and how they're found (checks, the Shard of Names' power to speak with the dead, Odda's Detect Magic, Fen's eyes). Using the shard is a flag for the Whisper.
- **Reward:** XP (quest 50, plus each laying-to-rest as a discovery or the fights' XP), and loot: an uncommon magic item fits Act I's last chapter.

**Still to use** from Act I: `escape_fates_mercy`, `vault_fates_mercy`, `darts_fates_mercy`, `drain_fates_mercy`, `cats_fates_mercy`, `wolf_den_fates_mercy` and `hobs_ore_fates_mercy` (narrative only so far), `swore_the_oath`, `looted_the_champions`, `promised_nettle_warren` and `owe_nettle` (nothing settled yet), `morwen_free_breakfasts`, `cheated_hobs_bet` (Greta knows), `wolves_moved_on` / `wolves_killed`, beat 7's "For Act II" list in STORY.md, and now `took_choir_letter` / `copied_choir_drop` (the Choir may come for its letter: with it copied and put back, they never know it was read), `read_precentor_postscript` and `saw_precentor_seal` (Chapter 9's unmasking), `fen_dodged_the_book`, `gnolls_fed` (that pack is still out there), `dabbin_hurt`.

Follow-ups from this slice:
- **Gnolls are tough for their XP.** Six Gnoll Warriors and a Giant Hyena (800 XP, Moderate at level 4 by the budget) were won only 16 times in 30 by a plain autopilot, with Dabbin alive in 7: harder than the chantry (High). The pack was cut to a Giant Hyena and four Gnoll Warriors (600 XP: Moderate for a level 3 party of three; Low by the budget at level 4, where most heroes are by then): won 27 in 30, Dabbin alive in 24, about like Chapter 3's Moderate vault fight. Rob may want the card to say Moderate at level 4, which needs 751+ XP; the simulation says that's too hard. DESIGN.md has the numbers.
- **The gnoll behind the cart was cut:** with one starting there, Dabbin died in most fights (he holds his ground and never moves to safety). Rob may want more danger to Dabbin; a gnoll coming up behind on round 2 was tried (Dabbin alive in 14 of 29).
- **Comprehend Languages can't break a cipher** (SRD 5.2.1: "doesn't decode symbols or secret messages"), so in The Hanging Tree it reads the line in the old court tongue instead, alongside History 15. Rob's option said the spell would read the whole note; tell him if he hasn't heard.
- **Hob's reforge** offers the first four kinds of plain weapon in the pack, in pack order; a fifth can't be picked. Magic weapons aren't sold, and debug's Give item doesn't list them. Companions don't get one.
- **Allies:** only a skirmisher (the Scout) shoots. The Rival (a Bandit Captain with a crossbow) still braces when no foe is beside them; Rob may want them to shoot too (it would make the chantry easier). Odda's spells still don't reach allies.
- **Fate's Mercy on the rally day** is a long rest at the Old Ford (one more day on the counter) like every other Fate's Mercy, though the eve is still "the night before the dark of the moon".
- **The Giant Hyena is Large** but takes one square, as the Ogre Zombie does.
- Debug's Jump list now also shows `hob_owes_star_iron` (an Ink function).

Follow-ups from Chapter 1's side content:
- **Stirges hit hard for a Low fight.** Two Proboscis hits of 8 each on a level 1 Wren. Rob may want one Stirge awake when the nest is smoked, or to let Fate's Mercy cover it.
- **Killing the she-wolf before round 3 ends the fight**, and her mate never comes: reinforcements still coming don't keep a fight going.
- **Flying is only speed:** a flyer still goes round obstacles and can't cross deep water. Act II's fliers (and the Specter's hover) may need more.
- **A Stirge only clings to the party and allies.** Companions attack a clinging Stirge rather than pull it off.
- **Hob's shop sells weapons only.** Armour waits for a way to change what you wear; nothing is sold back. Weapons bought aren't given Weapon Mastery.
- **Debug's force-next-d20 in a contest** goes to the other side's roll (it rolls first), not the hero's.
- **The last morning** is offered even when every side quest is done (Hob's forge and the ride south).

Follow-ups from beat 7:
- **Act II's Chapter 4 must read beat 7's flags:** Marchbank escorts you whatever you said (`marchbank_agreed`, `marchbank_refused`, `marchbank_put_off`); the League's letter names Silas Dray; `met_hesper` or `named_hesper` for the stone ring; the Rival has gone (`rival_left_bramblegate`) and joins the Choir. Companions still lying in the temple need Act II's temples.
- **Chapter title cards:** the `#heading` tag could open each chapter. Only the end of Act I uses it now.
- **The end card** still says "That's as far as the story goes for now…" under the End of Act I card.
- **The milestone note** prints "6500", not "6,500" (`dmNotes.xpMilestone`).
- **Old-end tests** in `tests/saves-tests.js` start from the story's last page today, `act1_end`. When the story goes on past it, point them at the new last page, and add `{ scene: 'act1_end', continueAt: … }`.

Follow-ups from level 5, beat 6, foe spellcasting and earlier (each could be its own slice):
- **Revivify out of a fight:** only in the fight where the companion died. Diamonds aren't sold yet; Odda never casts it.
- **Memorize Spell** and Arcane Recovery wait for Short Rests, which aren't in the game.
- **Cunning Strike's Poison** waits for a Poisoner's Kit. Ray of Enfeeblement, Darkness and Pass without Trace have no fight rules yet; Speak with Dead and Tiny Hut wait for scenes.
- **Counterspell** stops only Hold Person. Spirit Guardians spare allies and turned allies.
- **The shard's power by itself:** only a scene can use it (a `#shard:` choice). The Whisper isn't built.
- **The chantry with Rhosyn alive is hard** (won 8 of 30 by an autopilot with her spells).
- **Foes' spells reach only the party.** `casterTurn` is written for the Fanatic's three spells. Command's other words aren't built. No "caster" behaviour that keeps its distance.
- **Heroic Inspiration by choice** on a foe's turn isn't built: only the automatic reroll against Hold Person.
- **Companions and death saves outside a fight:** nobody helps (Phase 1's rule). Rob may want companions to stabilise you.
- **Blindsight** (Animated Armor) isn't played. **The Wight's Life Drain** isn't played (no lowering a Hit Point maximum: the Specter needs it too).
- **Large creatures** (2 × 2 squares) aren't built: the Ogre Zombie and the Giant Hyena take one square.
- **Raising:** the great candle is spent once used (`flame_spent`). A companion who dies after that lies dead until Act II's temples.
- **Levels 4 and 5:** Magic Initiate's "Spell Change" and the cantrip swap on a level-up aren't built. Skilled picks skills only. Grappler waits for grappling. Odda's AI never casts Resistance.
- **Names are unique** (Rob, Oct 12, 2026). New names this session: Dabbin, Parsnip, the Gorse Cut, star-iron.
- The pixel font has no "−" (minus sign). A DC 12 or 13 check shows as "Easy" on its card (working as designed).
- In Fate's Mercy at the vault, the "Your purse is gone." note comes before the text that says the same thing.

## 5. How the companion, ally and fight code fits together

- `data/campaign/companions.js`: each companion's level 1 choices, plus `levels: { 2: {...}, … }` changes; `tactic`, `likes`, `dislikes`; `approvalBands` (likes 3, dislikes −2).
- `js/engine/character/party.js`: `game.party` is `[{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic, approval, fallen }]`. `companionCharacter(id, level)` builds their sheet at the hero's level (never stored). `memberGame(game, member)` is a Proxy that lets every rule taking a `game` work on a companion. Also `joinParty`, `leaveParty`, `partyLongRest`, `partyLevelUp`, `raiseMember`, `approve`, `feeling`, `setTactic`, `partyProblems`, `fightingMembers`.
- `js/engine/combat/battle.js` (about 4,200 lines):
  - **Combatants, in this order:** the hero (`id 'hero'`), the foes (`side 'enemy'`), any allies (`side 'hero'`, `ally: true`, `monsterId`, `hp`, `maxHp`, and maybe `person`, `fallsHurt`), then the companions (`side 'hero'`, `companion: true`, `state`, `deathSaves`, `concentration`). A hymn's risen dead and reinforcements are pushed on the end.
  - **Telling them apart:** `isHero(c)`; `isPartyMember(c)`; `c.ally`; `c.side === 'hero'`. Lists: `partyCombatants`, `companionCombatants`, `allyCombatants`, `enemies`. Helpers: `actorGame(game, c)`, `hpOf`, `maxHpOf`, `stateOf`, `upright`, `healthOf` (with Temporary Hit Points), `isBloodied`.
  - **Wards** (`WARDS`), `castWard`; damage to the party goes through `takeHit` (the hero) and `companionHit`, both of which call `resistanceCut` first.
  - **Twists:** the hymn (`hymnRises`, `hymnHurt`, `singerOf`) and reinforcements (`reinforcementsDue`, `reinforcementsArrive`), both announced by `objectiveText`.
  - **Concentration:** `concentrationOf`, `startConcentration`, `endConcentration`, `tidyConcentration`, `concentrationCheck`, `holderOf(effect)`, `holdingSomeone`.
  - **Clinging on** (the Stirge): `attach`, `drinkAtStartOfTurn`, `dragClingers`, `settleClings`, `dropClings`, `clingingTo`, `clingersOn`, `pullOffTargets`, `heroPullOff`.
  - **Rampage** (the gnolls): `canRampage` (checked in `performAttack` before the damage), `rampage` (after it).
  - **A foe's turn:** `enemyTurn`, then `casterTurn` for a monster with `spellcasting`, else `weaponTurn`. `chooseTarget`: the nearest of the hero's side on their feet, the most hurt of equals (so a weak ally draws foes).
  - **Companion actions:** `companionAttack`, `companionCastOn`, `companionHeal`, … , `companionOptions`, `companionCantUse`.
  - **Allies:** `allyTurn` (holds ground; melee beside, a skirmisher shoots, else braces); `friendsFor` and `forAllies`; `finishBattle` records `lastBattle.alliesAlive`.
- `js/engine/combat/companion-ai.js`: `companionTurn(game, c)`. It looks only at the party, never at allies.
- `js/engine/combat/resolve.js`: Quick Resolve. Its hero autopilot (`playTurn`) isn't exported; the balance simulation below copies it.
- `js/engine/character/inventory.js`: `findItem` (magic weapons too), `plainWeapons`, `makeMagicWeapon`, shops (`priceAt`, `buyItem`).
- **Story commands** (`js/engine/story/externals.js`, declared in `story/externals.ink`): … `contest`, `can_afford_at`, `buy_at`, and now `item_name`, `plain_weapon`, `make_weapon_magic`. Ink functions: `lies_in_state(id)`, `oath_wall_easy()`, `carried(id)`, `raised_tonight(id)`, `wolves_starving()`, `side_quests_left()`, `hob_owes_star_iron()`. Tags: `#heading`, `#shop:id`, `#contest:skill:who`.

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

Then read `window.__results` in a later call until it's filled (the JavaScript tool gives up after 45 seconds; all eight pages take about two and a half minutes). Run it from any test page except `/tests/saves.html`.

**Balance simulation** (how the Gorse Cut was sized): on a test page, `await import('/js/engine/combat/battle.js?sim=1')` and the modules it needs (`rules/rng.js`, `character/inventory.js` `startingInventory`, `character/resources.js` `freshResources`, `character/party.js` `joinParty`, `data/campaign/quick-start.js`, `combat/grid.js`, `combat/attacks.js` `parseDice`). Build a game `{ character, rng: createRng(seed), ...startingInventory(c), ...freshResources(c), battle: null, lastBattle: null, party: [], flags: [] }`, join Odda and Fen, `startBattle(game, id, 0)`, and play the hero like Resolve's `playTurn` (stand up, attack the foe it would hurt most with a weapon, else move to the square nearest a foe, then the extra attacks, then `endHeroTurn`) until `battle.outcome`. A level 4 Champion is `{ ...wren, level: 4, subclassId: 'champion', hitPointRolls: [null, null, null] }`. To try another pack, change the shared `encounters` entry's `monsters` in memory (import `/data/campaign/encounters.js`) and put it back after. Calibration, 20–30 fights each: Cairnfield (level 3) 27/30, the Old Ford 30/30, the vault (level 4, Moderate) 20/20, the chantry (High) 12–15/20.

- **Chapter 2's side quests** (`tests/story-tests.js`, at the end): `atTheRally(seed, { character, flags, fen })` (the rally morning with Odda and Fen and the hymnal), `onDabbinsCart(game)`, `atTheLastMorning(seed, { flags, companions })`, `CHAPTER_1_DONE`. **Chapter 1's:** `inTheSquare`, `settleFight(game, start, { won, setUp })`, `scriptedThen(faces, seed)`, `questStatus`, `has`, `pageText(page)`.
- **The gnolls** (`tests/combat-tests.js`, at the end): `gnollFight({ party, seed, keep })` (the Gorse Cut, Wren at level 3 first; `keep` lists the foes left standing). Magic weapons: after "Attacks: a Shield…". **The Stirge:** `stirgeFight`, `stirgeClings`.
- **The last morning:** `jumpTo(game, 'ch3_night.morning')` then "Go out into Bramblegate".
- **Foe spells, Chapter 3's beats, Chapter 2's beats** (`tests/dungeon-tests.js`): `fanaticFight`, `atTheHomecoming`, `atTheDarkMoon`, `atTheEve`, `homeFromCairnfield`, `toTheMorning`, `atCairnfield`, and level 4–5 heroes (`champion4` there; `juniper4`, `posy4`, `sorael4` in `level-up-tests.js`; `fighter5` in `combat-tests.js`).
- **Which page:** level-ups in `level-up-tests.js`; companions at every level in `classes-tests.js`; monster checks, foe spells, traps, the encounter budget (each encounter's `sizedFor` must match its difficulty word) and the chapter playthroughs in `dungeon-tests.js`; allies, deep water, the Stirge, the gnolls and magic weapons in `combat-tests.js`; saves, migrations and old ends in `saves-tests.js`; the Ink bridge, tags, story-text lint and the side quests in `story-tests.js`; d20 rules in `rules-tests.js`.
- **Settling a fight in a test** by setting `battle.outcome` skips the victory step, so the fight's XP isn't banked.
- **Scripting dice:** `forceNextD20` sets only the next d20. To script several dice, set `game.rng = scriptedThen([...faces], seed)` (faces for whatever die comes next).
- **Text after a choice** is on the *next* page. Check it after `pick`, not before.
- **Choice lists in older tests** break when a hub gains a choice (the rally and the last morning did this session): update the expected arrays.

## 7. Traps learned the hard way

- **Editing files:** the Edit tool works well. For many exact replacements, a perl one-liner per line. **No shell heredocs at all**: write files with the Write tool. In a Perl one-liner's replacement, `@word` is an array and vanishes.
- **Ink:**
  - Write `word{cond:, more}`; choices go behind conditions as `* {cond} [Text]`; a string passed to a story command doesn't fill in `{…}`; a line where someone speaks ends with `#speaker:id`, and everyone who speaks needs an entry in `people.js`.
  - **Story commands can't be called inside a choice's text** (`[Your {item_name(plain_weapon(1))}]` is a runtime error: they aren't lookahead-safe). Put the values in `~ temp` variables first, then `+ {first != ""} [Your {first_name}]` (`hobs_reforge.pick`). Conditions in `{…}` before the text are fine.
  - **Tunnels work well for side quests:** `-> side_x -> somewhere`; the scene ends with `->->`. Tunnels can chain (`-> farewell -> side_hobs_ore -> ch2_cairnfield.road_north`) and can be called inside a conditional block.
  - **Don't name a stitch after a knot.** A gather that only runs logic works as a labelled gather. A stitch's read count gates a follow-up choice. A `#combat:` choice's content runs after the fight. `~ temp x = spring_trap(...)` then `{ x == "dead": -> mercy }` works. `quest_note` starts a quest that hasn't started.
  - Stitches can take parameters: `-> rework(first)`, `= rework(weapon)`.
- **The map's title shows the room's name**, so a room's `name` mustn't give away what's in it.
- **SRD rules text:** Read and WebFetch can't quote the SRD. An extract may still be at `C:\Users\Rob\AppData\Local\Temp\claude\C--Users-Rob-OneDrive-Documents-GitHub-questbound\555a4119-fd0b-466e-afbc-ceb9a6003453\scratchpad\srd-full.txt` (grep it with `grep -a`; negative modifiers show as `�c` and `�d`). Monsters by name: search "SpecterSpecter" (around line 48783), "Gnoll Warrior" (around 41184), "Giant Hyena" (54146). If the extract is gone, the memory note "SRD PDF text extraction" says how to rebuild it.
- **Picking DawnLike sprites:** enlarge a sheet with nearest-neighbour scaling (`enlarge.ps1 <sheet> <out.png> <scale>`, in this session's scratchpad or the older ones; easy to rewrite), crop and compare candidates side by side at 12×, then Read the PNG. `Characters/Humanoid0.png` row 21 column 0 is the gnoll; `Characters/Dog0.png` rows 0–2 are dogs, jackals and hyenas; `Characters/Quadraped0.png` row 4 column 0 is a brown pony with a red mane; there's no cart anywhere (the cart is drawn as crates and a plank tail-board). Older notes: `Characters/Pest0.png` (insects), `Avian0.png` row 11 (bats), `Cat0.png`, `Objects/Decor0.png` row 9 (sacks, crates, barrel, hay), row 19 cobwebs.
- **Playing on screen:**
  - The pane was visible this session and screenshots worked at phone size (sometimes at double scale). Fights play out by themselves after End turn (wait about 20 to 30 seconds for a full round of seven foes and three friends to replay).
  - **The d20 to tap** is the "20" button in the **last** `.roll-panel` (earlier panels keep theirs). Don't click every button in a roll panel: "Reroll ★" spends Heroic Inspiration.
  - Tap choices with the JavaScript tool (`.choice-card`, its `.choice-text`). The debug panel (`[aria-label="Debug tools"]`, toggle `button.debug-toggle`): Party Join buttons (each beside its name), Set level (then click through the level-up screen: take the average, pick the subclass card, "Become level N"; the screen re-renders, so re-read refs after each tap), Give item, Force next d20, Jump (`select[aria-label="Scene to jump to"]`). Fill inputs with the native value setter, then dispatch `input` and `change`.
  - **A fight's end:** the "Carry on" button with class `battle-outcome` (another "Carry on" can be on the page).
  - **Setting up a moment in a fight:** edit the save (IndexedDB `questbound` → `slots`, keyPath `slot`: `rec.game.battle.combatants`), `put` the record, reload, Continue.
  - **Jumping back into a scene you've played** keeps the story's memory, so once-only choices already taken stay hidden.
  - **The playtest log:** clean it from a test page, not the game page.
- **Encounter difficulty:** a fight is rated by the smallest budget that *holds* its XP. The hymn's risen dead and reinforcements aren't counted, and killing every foe before reinforcements arrive ends the fight. **The budget isn't the whole story:** check a new fight with the balance simulation (section 6).
