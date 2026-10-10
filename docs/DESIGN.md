# Questbound — Game Design Document

Snapshot of the design doc, Oct 6, 2026. This file is the source of truth for Claude Code. When a decision changes, update it here.

## Overview

Questbound is a single-player tabletop RPG where the game is the Dungeon Master. You build one character, play a full level 1–20 campaign under fifth-edition rules, and every time you come back is a short "session" that picks up exactly where you left off.

The screen looks like a classic Nintendo-era RPG: pixel-art towns, dungeons revealed room by room, and tactical battles on a grid like miniatures on a battle map. Underneath, it runs real D&D-style math: ability checks, saving throws, advantage, spell slots and rests. A DM voice narrates every scene in the second person, offers choices shaped by your character, and rolls the dice in the open.

**Design pillars**

1. **It feels like the table.** Dice are visible, every roll shows its modifiers, the DM narrates, and each session opens with a recap. It should feel like sitting down with a good DM, not playing a menu.
2. **Your character changes the story.** Species, class, background and earlier choices open and close options. A rogue and a cleric do not play the same campaign.
3. **Real rules, honestly rolled.** Fifth-edition rules from the free System Reference Document. No hidden fudging; every roll is in the roll log.
4. **Play in bursts, keep a legend.** Five minutes is always useful, closing the game never loses progress, and the world waits for you.
5. **Choices leave marks.** NPCs remember, factions shift, and the ending reflects what you did across all four acts.

**Target play pattern**

- Sessions of 5–30 minutes, on a phone in portrait or on a desktop.
- A full campaign of roughly 40–60 hours from level 1 to 20 (a planning target, tuned in playtests).
- Three save slots, so a second character can start a different path through the same campaign.

## The Game as Dungeon Master

The DM is three engines working together: an authored story engine that runs scripted scenes, a rules engine that rolls dice and enforces fifth-edition math, and procedural tables that fill the world between story beats. No AI service runs while you play.

**How a scene plays**

1. **The DM sets the scene.** Two to four short paragraphs in the second person and present tense, over a pixel-art backdrop.
2. **You pick a choice card.** Cards are dialogue, actions, skill checks, or options unlocked by your character.
3. **The check shows before you commit.** For example, "Persuasion · Hard". You tap the d20 to roll it yourself, or turn on auto-roll.
4. **The roll is shown in full.** "d20 (14) + Cha 3 + Proficiency 2 = 19 vs DC 20 — failure." It also lands in the roll log.
5. **Failure moves the story forward.** A failed lockpick brings the guard around the corner; it never dead-ends the quest.
6. **Consequences land.** XP, loot, story flags, NPC attitude, faction standing, injuries or time passing.

**Choice types**

| Choice | Example | How it resolves |
| --- | --- | --- |
| Skill check | "Athletics · Medium — Climb the collapsed wall" | d20 + ability + proficiency vs DC |
| Class feature | "Rogue — Read the thieves' chalk marks" | Unlocked by class; usually no roll |
| Species or background | "Dwarf — Judge the age of the stonework" | Unlocked by origin; no roll or lower DC |
| Spell | "Speak with Animals — Question the stable cat" | Spends a slot, or ritual time |
| Item | "Rope — Lower yourself into the well" | Requires or uses up the item |
| Approach | "Attack · Sneak past · Parley" | Starts combat, stealth or a social scene |

Options your character doesn't qualify for stay hidden, so scenes read naturally and a second character finds new paths.

**Dice and honesty**

- Every d20 test follows the 2024 rules: ability checks, saving throws and attack rolls, with advantage and disadvantage shown as two dice.
- Difficulty uses the standard ladder (Easy 10, Medium 15, Hard 20, Very Hard 25). **Check difficulty** in Settings shows the word ("Persuasion · Medium", the default), the exact DC ("Persuasion · DC 15"), or nothing, on choice cards and over the die before it's rolled. The roll itself always shows the DC once it's made.
- **Heroic Inspiration** is the DM's reward for playing to your character's Drive (see Character creation). Spend it to reroll any die.
- The random number generator is seeded and saved. Reloading reproduces the same roll, so the dice can't be re-rolled by quitting.

How Heroic Inspiration works in the game so far (★ in the status line means you have it):

- **In a scene:** when one of your own checks or saves fails, the story waits. "Reroll ★" spends your Inspiration and plays that choice again with only that die changed: you tap the d20 again, and the story follows the new roll, even if it's worse. "Keep the roll" saves it for later. The roll shows both faces: "d20 (4 → 15, Heroic Inspiration)".
- **In a fight:** when an attack of yours misses on your turn, a "Reroll ★" button sits above your actions until you do anything else.
- **Not yet:** saves you make during your foes' turns (a Concentration save, say), since those turns are decided before they play out on screen; damage dice; and other people's rolls.
- **Honest dice:** the game keeps the moment before your last choice or attack while you hold Inspiration, and the reroll's new die comes from dice of its own. Quitting and reloading rerolls the same way, so it can't be used to fish for a better roll.

**The DM's voice**

Narration is short, vivid and second person: "You push the door. The smell reaches you first." The DM has a light personality and reacts to big moments: a natural 20 gets a flourish, a natural 1 gets a wry line. NPCs speak in their own voices with a pixel portrait.

How portraits work so far: a line where someone speaks shows their portrait and name beside it, once for a run of lines by the same person. People are drawn with the same sprite builder as heroes (Warden Pike in her helmet and chain mail, Hob the gnome smith in his apron); goblins, the Choir and the wolf use their DawnLike sprites. The cast and their looks are in `data/campaign/people.js`. Lines the hero speaks have no portrait.

**Memory and reactivity**

- **Story flags** record what you did and unlock or close later scenes.
- **NPC attitude** uses the 2024 rules' Friendly, Indifferent and Hostile states, shifted by your choices.
- **Faction standing** tracks how each major faction sees you.
- **Deeds** are a running list of notable acts. The DM quotes them in recaps, and the epilogue reads from them.

**What it won't do**

There is no typed free-text input. Breadth comes from many choices tagged to your character instead, the way Baldur's Gate 3 and the Sorcery! gamebooks handle it.

## Sessions and Short-Burst Play

Every time you open the game is a numbered session, the same ritual as a real tabletop night: a recap, play for as long as you have, then a clean stop. The game saves after every choice and every combat turn, so closing it mid-fight loses nothing.

**The session ritual**

1. **Title card.** "Session 14" with your character's sprite and the current location.
2. **Recap.** If you've been away more than an hour, the DM reads a short "Previously…": the last few deeds, where you are and what you were doing. One tap skips it.
3. **Play.** Pick up exactly where you left off, even mid-conversation or mid-combat.
4. **Stop anywhere.** An optional End Session button has the DM write a session summary into your journal. Just closing the game works too.

**Play comes in small pieces**

| Unit | Typical length | Example |
| --- | --- | --- |
| Scene | 1–3 min | A conversation, a trap, a shop visit |
| Encounter | 3–8 min | A fight on the battle grid |
| Quest | 20–60 min | Clear the barrow; find the missing miller |
| Chapter | 2–4 hours | The opening town's full arc |
| Act | 8–15 hours | Act I, levels 1–4 |

The game points out natural stopping points: after a long rest, a finished quest or a return to town.

**How it works in the game**

- **What counts as a session:** opening a save slot once per visit to the page. Coming back to the title screen and continuing in the same visit carries on the same session, unless you chose End Session.
- **The title card:** shows every session, Session 1 included. The "Previously…" recap shows only after more than an hour away. It gives the last three deeds, where you are, and your aim.
- **Your aim:** the story sets it at each turning point, in the DM's words (`set_objective` in Ink).
- **What now?** sits under the hero strip. It shows your aim and the newest clue from your newest active quest.
- **Session summaries:** **End session** (in the Menu) writes the summary into the journal's Sessions section and returns to the save slots. If you just close the game instead, the summary is written when you next come back. A session where nothing happened isn't written down.
- **Stopping points:** a long rest or a finished quest ends that page with "A good place to stop, if you need to", once, just above the choices.

**Built for bursts**

- **What now?** One tap and the DM restates your current objective and suggests a next step.
- **The world waits.** In-game time moves only when you act. No real-time timers, energy meters or daily login pressure.
- **Quick resolve.** Trivial fights can be auto-resolved (see Combat).
- **The journal writes itself.** Every deed, quest and session summary is logged in the DM's voice. It feeds the recaps and becomes the story of your character.

## Character Creation

Character creation follows the 2024 rules order, takes about 10 minutes, and has a one-tap Quick Start for players who want to begin right away. Two light additions, Drive and Bond, give the DM something personal to write toward.

**Steps**

1. **Class.** Pick from the classes available in this build (see Rules and progression for the rollout).
2. **Background.** It grants ability score increases (+2/+1 or +1/+1/+1), an origin feat, two skills, a tool and starting gear. The free rules include Acolyte, Criminal, Sage and Soldier; we add original backgrounds tied to the setting.
3. **Species.** Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc or Tiefling, each with its standard traits.
4. **Ability scores.** Standard array (15, 14, 13, 12, 10, 8), 27-point buy, or roll 4d6 and drop the lowest die. Rolled scores are kept, honestly.
5. **Look.** A sprite builder for skin, hair, species features (ears, horns, tusks) and outfit colours, done with base sprites and palette swaps.
6. **Name, Drive and Bond.** Type a name or roll one from species name tables, then choose a Drive and a Bond.
7. **Equipment.** Take the class and background starting kits, or the starting gold to shop in the first town.

On screen, every skill pick (class, species and the Skilled feat) shares one Skills page after ability scores, so the player sees all the sources at once, sees the bonus each skill would give, and can't pick the same skill twice. A Rogue picks Expertise on the same page. A Fighter or Rogue picks Weapon Mastery weapons on the Equipment step, with the kit's weapons suggested. Creation ends on a review of the finished sheet, where every number can be tapped to show its maths. The dice for rolled scores and rolled names are the new game's own seeded dice, and rolled scores can't be rerolled.

**Drive and Bond (original additions)**

- **Drive** is what pushes your character: Glory, Faith, Wealth, Knowledge, Justice, Freedom or Kinship. Choices that fit your Drive earn Heroic Inspiration, and the DM's recaps lean on it.
- **Bond** is who you left behind: a sibling, a mentor, a rival or a debt. The campaign has authored slots where your Bond returns, at least once per act.

**Quick Start**

Four ready-made heroes, one per launch class, each with a name, look, Drive and Bond. Pick one and be in the first scene within a minute. You can rename and restyle a Quick Start hero before you begin.

## Rules and Progression

The game uses the 2024 fifth-edition rules as published in SRD 5.2.1 (https://www.dndbeyond.com/srd), the free Creative Commons version of the core rules. Characters level 1 to 20 on the standard XP table. Four classes ship first; the other eight arrive in later phases.

**Experience and levels**

- The standard XP table applies: 300 XP for level 2, 6,500 for level 5, 64,000 for level 10 and 355,000 for level 20.
- XP comes from defeated monsters (their stat-block XP), finished quests and major discoveries.
- Getting past an encounter without fighting (sneaking, talking it down, a clever spell) earns its full XP, so peaceful solutions are never a penalty.
- Hours per tier are in the Story section's campaign roadmap.

**Level-up screen**

The DM marks the moment with a line of narration, then walks you through: hit points (roll your Hit Die or take the average, your choice each time), new features, subclass at level 3, Ability Score Improvement or feat at levels 4, 8, 12 and 16, an Epic Boon at 19, and new spells.

- The level-up opens as soon as your XP reaches the next level, in place of the story's choices, but never in the middle of a fight. It goes one level at a time, so XP for two levels means two level-ups in a row.
- Every choice is saved as you make it. A rolled Hit Die stands: reloading can't swap a bad roll for the fixed value.
- Your current Hit Points rise by as much as your maximum does.
- The journal records each new level as a deed.

**Class features that act on their own**

A few features would need a pop-up at an awkward moment, so the game uses them for you when it's clearly worth it:
- **Tactical Mind** (Fighter 2) spends a Second Wind use on a failed ability check only when the extra d10 could turn it into a success, and the use is spent only if it does.
- **Opportunity attacks** are taken automatically.
- **Sneak Attack** (Rogue) is used on the first hit each turn that qualifies.
- **Weapon Mastery** properties are always used: a Quarterstaff always tries to Topple, a Javelin always Slows.

A setting to be asked instead can come later, alongside the Shield spell's reaction.

**Class rollout**

| Phase | Classes | Why then |
| --- | --- | --- |
| Launch (Phases 1–2) | Fighter, Rogue, Cleric, Wizard | The four classic roles; they test martial, skill, divine and arcane systems |
| Phase 3 | Barbarian, Paladin, Ranger, Warlock | Reuse launch systems with new twists (Rage, Smite, Pact Magic) |
| Phase 5 | Bard, Sorcerer, Monk, Druid | Druid comes last: Wild Shape turns beast stat blocks into player forms |

The free rules include one subclass per class, such as Champion, Thief, Life Domain and Evoker. Original subclasses can be added later.

**The Cleric (Phase 2, levels 1–3 so far)**

- **The basics:** Wisdom spellcasting, d8 Hit Dice, Wisdom and Charisma saves, two skills from History, Insight, Medicine, Persuasion or Religion, Simple weapons, Light and Medium armour and Shields. Kit A is a chain shirt, Shield, mace, Holy Symbol and Priest's Pack with 7 GP; kit B is 110 GP.
- **Divine Order** (chosen on the Class step): a **Protector** gains Martial weapons and Heavy armour; a **Thaumaturge** knows a fourth cantrip and adds their Wisdom modifier (at least +1) to Arcana and Religion checks, shown in the roll.
- **Spells:** three cantrips, and prepared spells straight from the whole Cleric list (no spellbook): four at level 1, five at level 2, six at level 3 (when level 2 spells open up). The Cleric list in the game is the curated one: the cantrips and spells already in the data, growing with each slice.
- **Channel Divinity** (level 2; two uses, back after a Long Rest; a Short Rest would give one back once Short Rests arrive): its own group of buttons in a fight.
  - **Divine Spark:** 1d8 + Wisdom, either Radiant damage to a foe within 30 feet (Constitution save for half) or healing for you. (The Necrotic option comes when a foe resists Radiant.)
  - **Turn Undead:** every Undead within 30 feet makes a Wisdom save or is Turned for a minute: Frightened and Incapacitated, it spends its turns moving as far from you as it can. Damage ends it, and so does your dropping to 0 Hit Points. The button is greyed out with no Undead in reach.
- **Life Domain** (level 3, the SRD's subclass):
  - **Disciple of Life:** a healing spell cast with a slot heals 2 + the slot's level more (not Magic Initiate's free cast).
  - **Life Domain spells:** Aid, Bless, Cure Wounds and Lesser Restoration are always prepared, on top of the six. A domain spell you'd already prepared frees its place at the level-up.
  - **Preserve Life** (Channel Divinity): heals you, if you're Bloodied, by up to five times your Cleric level, but no higher than half your Hit Points.
- **Aid:** your Hit Point maximum and current Hit Points rise by 5 (10 with a level 3 slot) until your next Long Rest. Cast it from the Sheet or in a fight.
- **Lesser Restoration** is waiting for its scene: a level 2 spell, so not before level 3. In Chapter 2, a Ghoul's claws leave Lark Paralyzed in the mill tunnel, and it frees her.
- **More of the Cleric list** (the Wizard can take Blindness/Deafness too):
  - **Shield of Faith** (Bonus Action, Concentration): +2 AC.
  - **Inflict Wounds** (touch): 2d10 Necrotic, half on a Constitution save; +1d10 per slot level above 1.
  - **Command:** a Wisdom save, or on its next turn the foe Grovels: it falls Prone and does nothing else. (The other commands, Approach, Drop, Flee and Halt, are for scenes.)
  - **Bane** (Concentration): the nearest three foes within 30 feet make a Charisma save, or subtract 1d4 from their attack rolls and saves, shown in each roll. A higher slot adds a target. (Choosing which foes comes later; the battle screen names who it will catch before you cast.)
  - **Blindness/Deafness:** a Constitution save, or the foe is Blinded for a minute: its attacks have Disadvantage, attacks against it have Advantage, and it can't make Opportunity Attacks. It saves again at the end of each of its turns. (Deafened does nothing in a fight yet.)
  - **Spiritual Weapon** (Bonus Action, Concentration): a spectral mace appears beside a foe within 60 feet and makes a melee spell attack (1d8 + Wisdom, Force). On later turns, as a Bonus Action and with no slot, it moves up to 20 feet and strikes again. It's drawn on the grid.
  - **Prayer of Healing** takes 10 minutes, so it's cast from the Sheet only: 2d8 Hit Points (no Wisdom bonus), once until your next Long Rest.
  - **Purify Food and Drink** (a Ritual) cleans the spoiled flour in the goblins' larder, and Nettle notices.
  - **Not yet:** Protection from Evil and Good, because it uses up a flask of Holy Water (25 GP) each time, and Holy Water arrives with shops. The Resistance cantrip and the rest of the level 2 list come later.
- **Posy Hearthstone** is the Quick Start Cleric: a halfling Acolyte and Thaumaturge, with Healing Word from the Acolyte's Magic Initiate.

**The Rogue (Phase 2, levels 1–3 so far)**

- **The basics:** Dexterity, d8 Hit Dice, Dexterity and Intelligence saves, four skills from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Persuasion, Sleight of Hand or Stealth. Simple weapons, and Martial weapons with Finesse or Light (Shortsword, Scimitar); Light armour; Thieves' Tools. Kit A is leather armour, two Daggers, a Shortsword, a Shortbow with 20 arrows and a Quiver, Thieves' Tools and a Burglar's Pack, with 8 GP; kit B is 100 GP.
- **Expertise** (on the Skills step): two skills the Rogue is proficient in add twice the Proficiency Bonus, marked ★ on the sheet. Sleight of Hand and Stealth are suggested.
- **Weapon Mastery:** two kinds of weapon (see Combat).
- **Sneak Attack:** once a turn, a hit with a Finesse or Ranged weapon deals an extra 1d6 (2d6 at level 3) if the roll had Advantage, or if a friend of the Rogue stands beside the target and the roll had no Disadvantage. With companions beside the foe it often comes without Advantage; alone, its usual sources are Vex, Hide and Steady Aim. The game always uses it on the first hit that qualifies; the target's card says "Sneak Attack +1d6 on a hit", and the roll shows the dice.
- **Thieves' Cant:** a Rogue reads the thieves' chalk marks in scenes. (The "one other language" waits for languages to be tracked.)
- **Cunning Action** (level 2): Dash, Disengage or Hide as a Bonus Action.
- **Steady Aim** (level 3): a Bonus Action before moving, which gives Advantage on the next attack this turn but leaves no more movement this turn.
- **Thief** (level 3, the SRD's subclass): Second-Story Work gives a Climb Speed equal to your Speed, shown on the sheet. Fast Hands waits for things to do with a Bonus Action Utilize (caltrops, ball bearings, magic items). Climbing choices and locks come in Chapter 2.
- **Thieves' Tools** make a check of their own in scenes: Dexterity, plus Proficiency for a Rogue or a Criminal, e.g. picking the postern lock at Bramblegate's north gate.
- **Sorael Thornvale** is the Quick Start Rogue: a wood elf Criminal with Expertise in Stealth and Sleight of Hand, Weapon Mastery with the Dagger and the Shortsword, and the Criminal's 50 gold, enough for a Potion of Healing in Bramblegate.

**Preparing spells after a Long Rest** (the Wizard and the Cleric): a Long Rest in the story ends with a DM note, and until your next story choice the Sheet's **Prepared spells** lets you swap spells in and out, up to your number. A Wizard chooses from their spellbook, a Cleric from the Cleric list.

**Spells**

The free rules hold over 300 spells, and each needs either combat code or a story use. Launch ships a curated set of about 60 Cleric and Wizard spells across spell levels 1–9, growing with each phase. Utility spells such as Detect Magic, Speak with Dead and Knock double as keys that unlock choice cards in scenes. Concentration and ritual casting work as written.

Phase 1 ships 44 spells (16 cantrips, 22 level 1, 6 level 2): enough choice for a Wizard of levels 1–3, for Magic Initiate on the Cleric, Druid or Wizard list, and every spell a species grants by character level 3. Phase 2 adds the Cleric's own (so far Aid, Bane, Blindness/Deafness, Command, Inflict Wounds, Lesser Restoration, Prayer of Healing, Purify Food and Drink, Shield of Faith and Spiritual Weapon: 54 in all). In a scene, a choice that needs a spell is shown only to heroes who can cast it: a known cantrip, a prepared or always-prepared spell, or a ritual in a Wizard's spellbook.

How spells work in the game so far:

- **In a fight**, every spell has a button under **Spells** (or **Bonus Action**) that says what it does. Choose one, pick the spell slot to use (a higher slot adds dice, darts or rays), then aim it. A higher slot is only offered when it does more: the extra creatures that Hold Person, Bless or Longstrider can take wait for companions, so those use your lowest slot left.
- **Spell attacks and single targets:** Fire Bolt, Ray of Frost, Shocking Grasp, Chill Touch, Poison Spray, Magic Missile, Scorching Ray, Ray of Sickness (Poisoned until the end of your next turn), and Hold Person (Paralyzed; Humanoids only, so not goblins, who are Fey).
- **Area spells:** Burning Hands (a 15-foot Cone), Thunderwave (a 15-foot Cube that pushes foes 10 feet) and Shatter (a 10-foot-radius Sphere up to 60 feet away, which catches you too if you're inside it). Damage is rolled once for everyone; each makes the save, and a save takes half. The grid shows the area in orange before you cast. It starts aimed at the most foes it can catch without you, and you tap the grid to aim it elsewhere.
- **Areas on the grid:** a Cone is 1, 3 and 3 squares ahead (7 squares on a diagonal too), a Cube a block beside you, and a Sphere every square within its radius, counted like movement. Walls block an area.
- **Sleep:** a 5-foot-radius Sphere of foes, who make a Wisdom save or grow drowsy (no actions). At the end of their next turn they save again or fall asleep (Unconscious and Prone). Damage wakes a sleeper, and so does an awake friend shaking it. The dead never sleep.
- **Concentration:** Sleep and Hold Person last while you concentrate, one spell at a time. Taking damage means a Constitution save (DC 10 or half the damage) or the spell ends. Dropping to 0 Hit Points or the fight ending also ends it. The battle screen shows what you're concentrating on.
- **The helpless:** the Unconscious and Paralyzed fail Strength and Dexterity saves, attacks against them have Advantage, and a hit from within 5 feet is a Critical Hit. A singer who can't speak can't sing, so Sleep or Hold Person on the Choir's acolyte stops the hymn.
- **Shield** is a reaction the game casts for you, with your lowest slot, whenever an attack would hit you and +5 AC would make it miss. It's never cast when it wouldn't help. **Cast Shield by itself** in Settings turns this off, to save your slots. (Asking each time can come later.)
- **Misty Step:** a Bonus Action teleport to an empty square you can see within 30 feet (shown in purple), with no Opportunity Attacks. You can spend only one spell slot a turn, so after Misty Step your action can only be a cantrip.
- **On yourself:** Mage Armor (AC 13 + Dex until your next Long Rest, without armour), False Life (Temporary Hit Points, lost first and gone after a Long Rest) and Longstrider (+10 feet of Speed for about an hour, which ends when the story's time of day moves on). Cast them from the Sheet's **Cast a spell on yourself** between fights, or as an action in one.
- **Free casts:** a spell from Magic Initiate (Juniper's Thunderwave) or a species can be cast once per Long Rest without a slot, as the 2024 rules allow. The button offers that first.
- **The Cleric and Druid spells Magic Initiate gives** (a Fighter with the Acolyte background, or a Human whose Versatile feat is Magic Initiate, can have them). Until companions join the fights, the ones that can help a friend go on you:
  - **Cure Wounds** (an action, 2d8 + your spellcasting modifier) and **Healing Word** (a Bonus Action, 2d4 + the modifier) heal you, in a fight or from the Sheet between fights. A higher slot adds 2d8 or 2d4. They're greyed out at full Hit Points.
  - **Bless:** +1d4 to your attack rolls and saving throws while you concentrate, shown in each roll.
  - **Sanctuary** (a Bonus Action): a foe that attacks you must first make a Wisdom save against your spell save DC, or its attack is lost. It ends when you attack, cast a spell or deal damage, or after a minute (10 rounds). The game never casts Shield or Hellish Rebuke for you while it's up.
  - **Guiding Bolt:** a ranged spell attack for 4d6 radiant; the next attack roll against the target before the end of your next turn has Advantage. Radiant damage gets past a zombie's Undead Fortitude.
  - **Faerie Fire:** a 20-foot Cube (a 4 × 4 block) within 60 feet. Each creature in it makes a Dexterity save or is outlined in violet light, and attacks against it have Advantage while you concentrate. It catches you too if you're inside, so the suggested aim never does.
- **Hellish Rebuke** (a Tiefling of the Infernal legacy, from level 3) is a reaction the game casts for you with its free use, the first time a foe within 60 feet hurts you: the foe makes a Dexterity save against 2d10 fire damage, half on a success. It never spends your spell slots. **Cast Hellish Rebuke by itself** in Settings turns this off.
- **In scenes:** a spell choice shows only to a hero who can cast it now, and its card says what it costs: "Spell · Light" for a cantrip, "· as a Ritual" (10 minutes longer, no slot), "· free" (Magic Initiate's once-per-Long-Rest cast), or "· level 1 slot". The scene takes the cheapest way, and a DM note says what was spent.
  - A Wizard can cast any Ritual in their spellbook, prepared or not; anyone else needs the ritual spell prepared.
  - A spell its target saves against, such as Charm Person on Warden Pike, rolls that save in the open. The die is the NPC's, so the colours flip: their success is your setback.
  - STORY.md lists where each spell is useful in Chapter 1. Knock and Invisibility wait for Chapter 2, because a hero first has them at level 3.
- **Guidance:** a hero who knows it adds 1d4 to every ability check in a scene, shown in the roll's breakdown.
- **Not yet in fights:** Charm Person, Fog Cloud and Invisibility. They work in scenes.

**Rests**

- **Short rest** (1 hour): spend Hit Dice to heal; recharge short-rest features. Allowed anywhere you're not in danger.
- **Long rest** (8 hours): full recovery. Safe at inns and friendly camps; resting in the wild rolls for interruption.
- Long rests are the game's suggested stopping points.

**Death and failure**

Death saving throws work as written. By default, a death triggers **Fate's Mercy** instead of a game over: you wake somewhere with a lasting consequence, such as captured, robbed, in a faction's debt or carrying a scar. The story fails forward from there. A **Hardcore** option, set at creation, makes death final for that save slot.

**Adapted for a video game**

- Carrying capacity (Strength × 15 lb) is tracked, with a warning rather than a hard block.
- Ammunition is tracked, and half is recovered after a fight, as in the rules.
- Only costly spell components, such as Revivify's diamond, are tracked; a spellcasting focus covers the rest.
- Crafting and other downtime activities come in a later phase.

## Character Sheet and Inventory

The character sheet is a live, tabbed version of the paper sheet: every number on it is the one the rules engine actually uses, and tapping any number shows how it was calculated.

| Tab | What it shows |
| --- | --- |
| Core | Name, species, class and level, background, XP bar, HP and temporary HP, Hit Dice, AC, initiative, speed, proficiency bonus, Heroic Inspiration, conditions, exhaustion |
| Abilities | Six scores and modifiers, saving throws, 18 skills with proficiency and expertise marks, passive Perception, senses, languages, tools |
| Features | Class, subclass, species, background and feat features, with uses remaining ("Second Wind 1/2") |
| Spells | Slots by level, prepared spells, cantrips, spell save DC and attack bonus, current concentration |
| Inventory | Equipped gear on the character sprite, backpack, weight, coins, attuned items (3 max) |
| Journal | Active and finished quests, deeds, people met (portrait and attitude), places, session summaries, roll log |

**Equipment and loot**

- Weapons, armour, adventuring gear and magic items come from the free rules, including 2024 weapon mastery properties.
- Equipped gear shows on your sprite as a colour change, since DawnLike sprites are recoloured rather than layered.
- For now: the armour you wear and your Shield come from your starting kit. The Sheet's **Armour and weapons** section shows what you're wearing and your Armor Class, then every weapon with its bonus to hit, damage, average damage and reach, the same numbers the battle screen uses. Every weapon in your pack is at hand in a fight (you draw the one you need as you attack); a two-handed weapon can't be used while you carry a Shield, and a bow needs arrows, and the Sheet says so. In the Pack, your armour is marked "(wearing)" and your Shield "(on your arm)". Changing armour arrives with the first armour you can find or buy.
- Coins use the standard five types (copper, silver, electrum, gold, platinum).
- Magic items scale with tier: mostly common and uncommon in Act I, rare in Act II, very rare in Act III, legendary in Act IV. Loot tables are original, built from rules-listed items.
- Unknown magic items are identified with a short rest of study or the Identify spell, as in the rules.
- Shops buy at half price and stock by town size; some stock depends on your faction standing.

**Inventory rules**

The backpack has no slot limit, only carrying capacity. Consumables (potions, scrolls, ammunition) stack. Quest items are locked so they can't be sold or dropped by accident.

## Combat

Combat plays on a tactical grid, like miniatures on a battle map: 5-foot squares, initiative order, and the full turn of movement, action, bonus action and reaction.

**The battlefield**

- The fight happens where it starts: the dungeon room, road or tavern you were in.
- The grid is 8 squares wide so it fits a phone in portrait at 3× pixel scale, and scrolls vertically.
- Terrain matters: difficult ground, half and three-quarters cover, doors, hazards such as fire and pits, and darkness (darkvision counts).

**Your turn**

1. Tap your token; reachable squares light up (a 30-foot speed is 6 squares).
2. Choose an action from the action bar: Attack, Magic, Dash, Disengage, Dodge, Help, Hide, Ready, Study, Utilize or an item.
3. Bonus actions sit in their own bar. Reactions, such as an opportunity attack or the Shield spell, pop up as prompts or can be set to automatic.
4. Before any attack, the game shows your chance to hit ("65%") and the damage dice.

How it works in the game so far: every action button says what it does under its name. An attack shows its bonus to hit, damage dice, average damage and reach ("+5 to hit · 2d6 + 3 slashing · 10 on average · melee"); Dash, Dodge, Second Wind and the rest say what they do and how many uses are left. Choosing an attack lists each foe with your chance to hit it, and any Advantage or Disadvantage and why.

**Watching turns play out**

Every turn, the enemies' and your own, plays out a line at a time instead of all at once:

- Each creature's turn is announced ("Goblin Warrior 2's turn"), and a gold frame marks whoever is acting on the grid and in the turn order.
- Creatures walk square by square. A walk that provokes an Opportunity Attack stops for it, then carries on.
- Damage and healing pop up as numbers over whoever took them, and Hit Points (the bars and the header) change as each hit lands, not before.
- The line playing now shows in a box right under the grid, with its roll; between turns that box keeps the last thing that happened. The full fight log sits below the actions.
- When a turn starts playing, the screen scrolls so the grid and that box are in view.
- **Battle speed** in Settings sets the pace (Slow, Normal or Fast), and **Skip** shows the rest at once. The fight is decided and saved before it plays out, so skipping or reloading never changes what happened.

**Rules on the grid**

Initiative, attack rolls against AC, critical hits, damage types and resistances, saving throws, area spells drawn as cones, spheres and lines, opportunity attacks, cover, concentration checks, the 2024 conditions, weapon mastery and death saves all work as written. Sneaking up first gives enemies disadvantage on initiative, per the 2024 surprise rule.

**Weapon Mastery and two weapons** (so far)

- A Fighter chooses three kinds of weapon and a Rogue two. The choice comes on the Equipment step of creation, starting with the weapons in the kits. Older saves give a Fighter the weapons in their pack. Changing them after a Long Rest comes with shops, once there are new weapons to master.
- The properties the game's weapons have:
  - **Vex** (Shortsword, Shortbow): a hit that deals damage gives Advantage on your next attack roll against that foe, until the end of your next turn.
  - **Sap** (Mace, Spear, Flail): a hit gives the foe Disadvantage on its next attack roll, until the start of your next turn.
  - **Slow** (Javelin, Longbow): a hit that deals damage takes 10 feet off the foe's Speed until the start of your next turn. Two Slows still take only 10.
  - **Topple** (Quarterstaff): a hit makes the foe save (Constitution, DC 8 + the ability modifier + Proficiency) or fall Prone.
  - **Graze** (Greatsword): a miss still deals your ability modifier in damage.
  - **Nick** (Dagger, Scimitar): the Light extra attack (below) is part of the Attack action, so the Bonus Action stays free.
  - Push and Cleave wait for weapons that have them.
- **Two Light weapons** (Dagger, Scimitar, Shortsword), and no Shield: after you attack with one, you can attack with the other, or a second Dagger, once a turn as a Bonus Action, without your ability modifier on its damage. Two-Weapon Fighting adds the modifier. With Nick on either weapon, the extra attack is part of the Attack action and sits with the attacks; otherwise it's under Bonus Action.
- Each weapon button names its mastery ("Vex: a hit gives you Advantage on your next attack against that foe"). The turn order marks a foe as Vexed, Sapped or Slowed.

**Sight, walls and hiding**

- Walls block sight and attacks (Total Cover): nobody can attack through one. Obstacles (sacks, barrels, trees, boulders, the goblin onlookers) block sight but not attacks. Cover's +2 or +5 to AC comes later. The fights so far have no walls inside the arena, so this changes none of them.
- **Hide** is an action for anyone, and a Bonus Action with a Rogue's Cunning Action. It works only out of every foe's sight: a DC 15 Dexterity (Stealth) check. On your turn, blue squares show where you'd be out of every foe's sight. The Hide button is greyed out while a foe can see you, and it says who.
- **Hidden** (the Invisible condition): your attacks have Advantage, attacks against you have Disadvantage, and you provoke no Opportunity Attacks. You stay hidden until you make an attack roll or cast a spell, or a foe finds you. Each foe's turn, it moves to where it can see your square, then takes the Search action: Wisdom (Perception) against your Stealth total. So a foe spends its turn looking for you instead of attacking. You're drawn faint, and the turn order says "Hidden".
- **Noisy armour:** armour marked for Stealth Disadvantage (Chain Mail, Scale Mail and the like) gives Disadvantage on every Stealth check, in fights and scenes.

**Enemy behaviour**

- Each monster has a behaviour profile: brute (charges the nearest target), skirmisher (hit and run), caster (keeps distance), pack hunter or coward.
- Clever enemies focus wounded characters and spellcasters; beasts flee when badly hurt.
- Humanoids may surrender or run, which opens interrogation or mercy choices afterwards.

**Encounter design**

- Fights are built with the 2024 encounter budget (Low, Moderate, High), sized for you and your companions.
- Most fights are Moderate and bosses are High. Fewer, better fights beat many filler fights.
- Every authored fight gets a twist where possible: a hazard, an objective, reinforcements or a chance to parley.

**Quick resolve and speed**

- A fight well under your party's strength offers **Resolve**: the engine plays it out instantly with real rolls and reports HP lost and resources spent. Story and boss fights are always played by hand.
  - **Well under** means the monsters' XP is no more than half the Low budget for one character of your level (SRD 5.2.1, XP Budget per Character): 25 XP at level 1, 50 at level 2, 75 at level 3. In Chapter 1, a level 2 hero can resolve the wolf, the warren's lookout or the mill's two goblins. Encounters marked `byHand` (Mother Nettle, the Choir at the breach) never offer it.
  - **How you fight:** stand up if Prone, close in if nothing's in reach, and attack the foe you'd hurt most with a weapon or cantrip, then with a second Light weapon if you have one. Resolve never spends spell slots, free casts, Second Wind, Action Surge or potions, and never hides.
  - **It hands the fight back** if you're below half your Hit Points at the start of one of your turns, and it isn't offered once you are. Otherwise it reports the rounds and Hit Points lost: "Resolved in 3 rounds: you lost 6 Hit Points."
- Settings cover animation speed (Battle speed: Slow, Normal or Fast), auto-roll, automatic reactions (so far: Cast Shield by itself and Cast Hellish Rebuke by itself) and auto end-turn.

## World and Exploration

The world is a hand-made region map of towns, wilds and dungeons. You travel between places on the map, explore towns as illustrated scenes, and explore dungeons room by room on a grid revealed as you go.

**Overworld travel**

- A pixel-art region map with locations joined by roads and trails, hidden under fog until discovered.
- Rumours, quests and maps reveal new locations.
- Each journey takes in-game hours or days, at the 2024 travel paces (slow, normal, fast), which change your Perception and Stealth on the road.
- Each leg rolls on that region's table: a fight, a roadside event, a discovery or a quiet trip.

**Towns**

- Each town is a scene backdrop with tappable places: inn, temple, smithy, market, quest board and notable NPCs.
- The inn is a safe long rest. The temple heals, lifts curses and, at a price, raises the dead.
- Each town has 2–4 named NPCs with portraits, opinions about you, and side quests.

**Dungeons**

- Dungeons use the same tiles as the combat grid. Rooms are revealed as you enter.
- The map sits above the choices and shows the room you're in, with your hero at its entrance; **Whole map** shows every room explored so far, and the rest stays dark. The story moves you room to room, and the map follows only as far as you've read (it waits for any d20 you haven't tapped).
- Tap a door or room to move your party token: the ways on light up in gold, and tapping one is the same as tapping its "Go" choice card. Rooms hold traps, puzzles, monsters, treasure or lore.
- Whoever is in a room stands on the map when you walk in: Mother Nettle before her throne with her band around her, the dead at their digging. Where a room has a fight, they stand on the squares the fight starts them on. The story moves them on: those who leave or scatter are gone from the map, and those who fall lie where they fell.
- Traps work as in the rules. Damage outside a fight that drops you to 0 Hit Points means death saving throws with nobody to help (you see each roll); three failures lead to Fate's Mercy.
- Every fight card shows how hard the fight is ("Fight · Low", "Fight · Deadly"), from the encounter budget.
- Searching uses Investigation and Perception checks; traps work as in the rules.
- Fights start in place on the same map, with no screen change.
- Most dungeons have 5–15 rooms (20–60 minutes), with cleared rooms safe for a short rest.

**Where the content comes from**

| Content | How it's made | Target share of play | Example |
| --- | --- | --- | --- |
| Main quests | Written by hand | About half | Act I's barrow mystery |
| Side quests | Written by hand | About a quarter | The miller's missing daughter |
| Contracts | Templates from the quest board | About 15% | Clear the wolf den on the north road |
| Road events | Random tables per region | About 10% | A broken cart, an ambush, a lost pilgrim |

Contracts combine a template (bounty, escort, retrieve, investigate, rescue) with a location, a monster table for your tier and a reward. Generated dungeons are assembled from hand-written room templates, so they keep authored flavour. This keeps the world alive between story beats and gives players who want it some optional extra adventuring.

**Time**

Days pass with travel and rests, and day or night changes encounters and some scenes. A few story quests have deadlines in in-game days, which never tick while the game is closed.

## Story

The campaign is **The Shattered Crown**: four acts that match the four tiers of play, taking a nobody from a frontier town to the person who decides what the crown really was. All names here are working placeholders. The chapter-by-chapter beats, the secret history, the cast and the shards are in `docs/STORY.md`.

**Campaign roadmap** (hours are planning targets, about 46 in all, tuned in playtests)

| Act | Tier | Levels | Hours | Key beats |
| --- | --- | --- | --- | --- |
| I · The Barrow Dead | 1 · Local heroes | 1–4 | About 6 | Raids and walking dead; the Ashen Choir found; first shard claimed |
| II · The Shard Road | 2 · Heroes of the realm | 5–10 | About 15 | Shards in four regions; more companions join; the crown's secret |
| III · The Crown War | 3 · Masters of the realm | 11–16 | About 15 | Civil war, pick a side; a betrayal comes due; the undercity opens |
| IV · What Sleeps Beneath | 4 · Masters of the world | 17–20 | About 10 | The Unking's prison; planar rifts open; four possible endings |

Acts II and III are the longest because each spans six levels and most of the side content.

**Premise**

Twenty years ago the Concord Crown, which bound the kingdom of Caldmere's noble houses in peace, shattered on the day the old king died. The realm has drifted under a Lord Regent ever since. Now the dead are walking out of the barrows near the frontier town of Bramblegate, and they are digging for something.

The twist: the crown was never a symbol of peace. It was the lock on a prison beneath the capital, holding a being the old songs call the Unking. Every shard that leaves its resting place weakens the lock.

**The four acts**

- **Act I · The Barrow Dead (levels 1–4).** Local trouble in Bramblegate: goblin raids, a missing miller, the walking dead. You trace them to the Ashen Choir, a cult digging in the Kings' Barrow, and end the act holding the first shard. It whispers your name.
- **Act II · The Shard Road (levels 5–10).** You travel the realm while three factions court and hunt you. You recover shards from a drowned abbey, a dwarven foundry, an elven court and a dragon's hoard. More companions join, and an old druid circle tells you what the crown truly holds.
- **Act III · The Crown War (levels 11–16).** The realm splits into civil war. You back a faction, play them against each other, or reach for the crown yourself. A betrayal shaped by your earlier choices opens the city beneath the capital.
- **Act IV · What Sleeps Beneath (levels 17–20).** You descend into the Unking's prison as reality frays and planar rifts open. The ending depends on what you do with the crown.

**Factions**

| Faction | Wants | Offers you |
| --- | --- | --- |
| The Regency | The crown reforged to make the Regent's rule legitimate | Soldiers, law and a title |
| The Ashen Choir | The crown reforged to wake the "Sleeping King" (they don't know what he really is) | Forbidden magic, and answers |
| The Free League | The crown destroyed and the realm made a league of free cities | Gold, ships and freedom |
| The Old Circle | The prison kept sealed at any cost | The truth, and a way to fight the Unking |

**The Whisper**

Each shard you carry offers a power, such as flight, foresight or a terrible word of command. Using it raises your Whisper, a hidden measure of the Unking's hold on you. A high Whisper unlocks dark options and closes others, and it shapes the ending.

**Endings**

1. **Wear the crown.** Reforge it and become the new lock: ruler of Caldmere forever, and never free.
2. **Crown a ruler.** Reforge it for the faction you backed, and live with what they do with it.
3. **Break the prison.** Destroy the crown and face the Unking. It is the hardest fight in the game, and winnable only with the allies you earned.
4. **Kneel.** Possible only with a high Whisper: bargain with the Unking and take the realm for yourself.

An epilogue then shows each town, faction and companion, built from your story flags and deeds.

**Tone**

Classic high fantasy with some grit, warmth and humour in the people you meet, at a PG-13 level. Violence is real but not lingered on.

**Pitches set aside**

- **The Silent Gods.** A year ago every god stopped answering prayers, and clerics and paladins are weakening. A mystery campaign about who silenced them, and why.
- **The Drowned Coast.** The sea is rising over an island realm, and sunken empires are surfacing. Ship travel between islands, pirates, sea monsters and ruins.

**Writing volume**

The writing is the biggest cost of this game, bigger than the code. A 40–60 hour campaign needs roughly 400–600 authored scenes. The plan: Claude Code writes the beats for each chapter (in `docs/STORY.md`) and drafts the scenes from them, and Rob reviews, edits and approves both.

## Companions

You play one character, but up to two companions can travel with you, chosen from six who join through the story. Fifth edition is balanced around a party, so companions keep fights fair and give the DM people to write. A Lone Wolf option plays the whole campaign solo.

**The roster (placeholders)**

| Companion | Class | Joins | Personal quest hook |
| --- | --- | --- | --- |
| Dwarf priest | Cleric | Act I | Her temple sold the barrow's location to the Ashen Choir |
| Halfling informant | Rogue | Act I | A former Choir spy with a price on his head |
| Orc sellsword | Fighter | Act II | Owes the Regency a debt she can't pay |
| Elf scholar | Wizard | Act II | Studied the crown and hid what she found |
| Tiefling outcast | Warlock | Act II | His patron is something that knows the Unking |
| Goliath wanderer | Barbarian | Act III | The last of a clan the old king destroyed |

**How companions work**

- **Control:** They act on their own with a tactic setting (Aggressive, Defensive, Support or Hold), or you can control every token yourself.
- **Levelling:** They level with you. You make their big picks (subclass, feats) or let them auto-pick.
- **Approval:** Each companion likes or dislikes your choices. High approval unlocks their personal quest and a better epilogue; low approval means they leave, or turn on you in Act III.
- **Camp scenes:** Long rests in the wild open a short camp scene with companion conversations. At 1–3 minutes each, they suit short sessions.
- **Death:** Companions make death saves like you do. A dead companion can be raised at a temple or by spell; a few story choices can cost one their life for good.

**How companions work so far (Phase 2)**

- **Odda Brasswick** (dwarf Cleric, Acolyte, Protector) and **Fen Underbough** (halfling Rogue, Criminal) are full characters, built like heroes. Up to two travel with you.
- **Joining and leaving:** a scene adds or removes a companion (`join_party`, `leave_party`), and the DM says so. Chapter 2 is where Odda and Fen join. Until it's written, debug mode can add or remove them.
- **Levels:** they're always your level. Their big picks are set for now: Odda takes the Life Domain at level 3, Fen the Thief. Each later level takes the fixed Hit Points, and their Hit Points rise when yours do.
- **The Party section of the Sheet** shows each companion's portrait, Hit Points, likes and dislikes, full sheet and **tactic**:
  - **Aggressive:** goes after the foe they'd hurt most.
  - **Defensive:** stays within 10 feet of you and fights what comes near, or Dodges.
  - **Support:** heals first, then fights from beside you. This is Odda's to start with; Fen starts Aggressive.
  - **Hold:** doesn't move, and fights only what they can reach from there.
- **In a fight:**
  - They start on the free squares nearest you, roll their own Initiative and take their own turns.
  - Whatever the tactic, they first help anyone at 0 Hit Points, you first. They use a healing spell if they have one (Odda's Healing Word, then Cure Wounds), or else Spare the Dying, or the Help action's DC 10 Medicine check to stabilise.
  - So far they spend spell slots only on healing; they attack with weapons and cantrips (Odda's Sacred Flame).
  - They don't yet cast Concentration spells or use Bonus Action features such as Cunning Action. Fen does take the Nick extra attack with his dagger.
  - Fen's Sneak Attack counts you or Odda standing beside his target, as the rule says, and your Sneak Attack counts them.
- **Foes** go after the nearest of the party on their feet, the most wounded of equals. Nobody attacks someone who's down, and a hidden hero has to be found first.
- **When you fall**, the fight goes on while a companion stands. You make death saves, and they try to get you back up. The fight is lost only if you die, or you're stable at 0 Hit Points with no companion left standing; then Fate's Mercy happens as before. After a win, anyone at 0 Hit Points comes to with 1.
- **Companions fall** and make death saves as you do. Three failures, or a blow of their whole Hit Point maximum, and they die. A fallen companion stays with you but doesn't fight until raised: at a temple or by a spell, once those exist. Debug mode can raise them for now.
- **Long Rests** bring them back to full, as they do you.
- **Approval:** each companion keeps a score. Scenes raise or lower it with `approve(id, change)` when you do something they like or dislike (their likes and dislikes are in the data and on the Sheet). The score isn't shown to the player; debug mode shows it.
- **Not yet:**
  - Your own spells and potions on a companion (healing, Bless).
  - Controlling their turns yourself.
  - Camp scenes, the Lone Wolf setting, and sizing fights for the party. Chapter 1's fights are built for one hero, and companions arrive in Chapter 2.

**Lone Wolf**

A setting chosen at character creation. You travel alone and encounters are rebuilt for one character. It's harder at levels 1–4, so the DM offers more chances to avoid fights.

## Visual Style, Art and Audio

The look is classic Nintendo-era pixel art from a single free art family, drawn at whole-number scale on a pixel-perfect canvas. The family is DawnLike (https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181), chosen because a fifth-edition campaign needs hundreds of monsters and DawnLike covers them in one consistent style.

**DawnLike at a glance**

| | DawnLike |
| --- | --- |
| Era it evokes | Late NES / Game Boy Color, 16-colour palette |
| Tile and sprite size | 16 × 16, shown at 3× |
| Characters | Many ready-made heroes and NPCs; customised by palette swaps |
| Gear on your sprite | Colour changes only |
| Animation | Two-frame idle |
| Monsters | Very broad: undead, dragons, fiends, elementals, beasts |
| Tiles, items, UI | All included, one palette |
| Licence | CC-BY 4.0 (credit DragonDePlatino and DawnBringer) |

The LPC (Liberated Pixel Cup) art family was considered and set aside: better character customisation and animation, but thin monster coverage.

**How the art is used**

- **Battle and dungeon maps:** tiles at 3× scale, 8 squares across in portrait.
- **Town scenes:** backdrops assembled from the same tiles, with tappable buildings and NPCs.
- **Heroes:** built from DawnLike's commissioned player template (a plain body, plus the Warrior's armour and the Mage's robe), not its ready-made heroes, because those cover only some species and can't be recoloured part by part. Every pixel is tagged as skin, hair, outfit and so on, so each part takes its own colour from the 16-colour palette. Species features (pointed ears, tusks, horns, a dragon's crest, goliath markings) are drawn automatically, Small heroes stand two pixels shorter, worn armour sets the armour's colour (steel or leather), and headgear depends on class (a horned helmet for Fighters, a hood for Wizards). Every hero look can be checked at once on `tests/looks.html`.
- **Portraits:** the character's sprite enlarged inside a framed box, the classic Dragon Quest approach, so portraits always match.
- **Dice:** a pixel d20 with a short tumble animation and a flash on natural 20s and 1s.
- **Gaps:** monsters without a sprite reuse a close match with a palette shift, the same approach as Whimsywild.

**Fonts**

Chosen in Phase 0, all under the SIL Open Font License and stored in the repo:

- **Press Start 2P** for the title, headings and big numbers (the d20, SUCCESS and FAILURE).
- **DotGothic16** for narration, choices and interface text: a readable pixel font in the classic Japanese console RPG style, with digits that can't be mistaken for letters (5 and S, 8 and B), which matters when every roll shows its maths. Pixelify Sans was tried first and set aside for that reason.
- **Atkinson Hyperlegible** for the "Plain font for the story" setting, which switches narration and choices to it for comfort.

**Audio (polish phase)**

Chiptune music by region and mood (town, wilds, dungeon, battle, boss), plus sound effects for dice, hits, spells and menus. Sources are CC0 or CC-BY packs such as Kenney's audio packs. Music and effects get separate volume controls and start only after the player's first tap.

## Interface

The game is designed mobile-first in portrait, with one main Adventure screen that switches its top half between scene art, dungeon map and battle grid, so you never lose your place. On wide screens, the picture sits on the left and the text and choices on the right.

**Bottom navigation:** Adventure · Sheet · Journal · Map · Menu

**Adventure screen (top to bottom)**

- **Status bar:** HP bar, spell slots, Heroic Inspiration, gold, and the in-game day and time.
- **Picture window (about 45%):** the town backdrop, the dungeon map with your party token, or the battle grid.
- **DM window:** narration in a classic bordered RPG text box. Text types out; a tap finishes it.
- **Choice cards:** stacked under the narration, each tagged with its check or unlock.
- **Roll log:** a drawer that slides up and lists every roll this session.
- **Bottom navigation.**

**Combat layout (top to bottom)**

- Status bar (HP, slots, round number).
- An initiative strip of portraits, with the current turn highlighted.
- The grid fills the picture window and expands to about 60% of the screen. Your party are circles, enemies are diamonds, and reachable squares are shaded.
- The action bar and bonus action bar, with hit chance and damage dice shown before you confirm.
- Bottom navigation.

In a fight, the picture becomes the grid and the choices become actions. The status bar and navigation never move, so a fight never feels like a different game.

**Other screens**

- **Title:** three save slots, each showing the character's sprite, level, location and session count.
- **Session card and recap:** shown on return, with one tap to skip.
- **Level up:** a step-by-step flow, one decision per screen.
- **Map:** the region map with fog, known locations, current quests marked, and travel.
- **Menu:** settings, export and import save, credits.

**Accessibility**

Text size options, a high-contrast text box, reduced motion (no screen shake or flashes), and ally and enemy markers that use shape as well as colour.

## Technical Architecture

The game is a static multi-file website on GitHub Pages, built like Whimsywild: plain HTML, CSS and JavaScript modules, no build step, no CDN, and every file in the repo. Two things are new: story scenes are written in Ink, a scripting language made for branching stories, and the game installs to a phone's home screen and plays offline.

**Carried over from Whimsywild**

- Static site only: no npm, no frameworks, no CDN links and no external network requests.
- JavaScript ES modules with relative paths only, and lowercase hyphenated file names.
- Content lives in `data/` and `story/`, never hard-coded in engine files.
- Mobile-first portrait layout that also works on desktop.
- Testing runs on a local server, with a hard refresh after changes.
- A debug mode: jump to any scene, set level, grant items, view and edit flags, force a die result, plus a playtest log.

**Folder structure**

```
questbound/
  index.html
  manifest.webmanifest   home-screen install details
  service-worker.js      offline play and update prompts
  CLAUDE.md              rules for Claude Code
  CREDITS.md             rules attribution, art, font and audio credits
  docs/DESIGN.md         this document
  css/style.css
  js/
    main.js              startup and screen routing
    engine/
      rules/             dice, checks, saves, conditions, spells, rests
      character/         creation, sheet maths, levelling, inventory
      combat/            grid, turns, actions, enemy behaviour
      story/             Ink bridge, flags, journal, recaps
      world/             region map, travel, dungeons, contracts
      save/              save slots, export and import, migrations
      ui/                screens and widgets
  data/
    srd/                 species, classes, backgrounds, feats, spells,
                         monsters, equipment, magic items, conditions
    campaign/            places, NPCs, factions, companions,
                         loot, encounter tables, contract templates
  story/
    common/              reusable scenes: shops, inns, rests, camp
    act-1/ act-2/ act-3/ act-4/
  tests/                 rules checks that run in the browser
  vendor/
    ink-full.js          Ink runtime and compiler (inkjs)
  assets/
    dawnlike/ tiles/ sprites/ ui/ fonts/ audio/
```

**Story scripting with Ink**

Ink (https://github.com/inkle/inkjs) is inkle's language for interactive stories. It reads almost like a screenplay, tracks every choice automatically, and its JavaScript version runs and compiles stories in the browser with no build step. Scenes ask the rules engine for checks and character facts:

```
=== miller_door ===
The miller's door hangs open. Flour drifts across the step like snow.
* [Investigation · Medium — Study the tracks]
    { check("investigation", 15):
        Three sets of boots, one dragging. They went toward the barrows.
        ~ set_flag("miller_taken")
    - else:
        Too many footprints. Someone has been through since.
    }
* {has_class("rogue")} [Rogue — Find the hidden strongbox]
    -> strongbox
* [Leave] -> bramblegate_square
```

The engine owns the character, inventory, HP and dice; Ink owns the narrative and its flags. Both are saved together.

**Rules data**

Rules content is typed into `data/srd/` from the SRD 5.2.1 document, one phase at a time, covering only what that phase needs. Each file is a plain list of objects with short comments, so numbers and text can be edited safely.

**Saves**

- Three save slots in the browser's IndexedDB storage, which holds far more than localStorage. Settings stay in localStorage. Every key is prefixed with `questbound:`.
- Autosave after every choice and every combat turn. The dice generator's state is saved too, so reloading can't reroll. While you hold Heroic Inspiration, the save also keeps the moment before your last choice or attack, so a reroll still works after the game is closed (save version 14). It also notes when a Wizard or Cleric has just rested and can change their prepared spells (version 15). Version 16 adds a Fighter's Weapon Mastery weapons, taken from their pack for older saves, and version 17 the party.
- Every save has a version number and a migration path.
- Export and import as a downloadable file or a copyable text code, with a backup reminder every 10 sessions.

**Offline and home-screen install**

A web app manifest and service worker let the game install to a phone's home screen and play offline. On iPhone this matters for a long campaign: Safari can clear a site's saved data after 7 days of browsing without a visit, but home-screen web apps don't count toward that limit. When a new version is pushed, the game shows an "Update ready — tap to reload" prompt instead of needing a hard refresh.

All of Rob's games on the same github.io address share one storage area. Questbound is built on github.io and moves to a subdomain of Rob's Namecheap domain before the first real playthrough, so its saves get their own.

## Licensing and Credits

The 2024 core rules can be used freely because SRD 5.2.1 is released under Creative Commons Attribution 4.0, which only requires credit. The limits are the brand itself and anything left out of the SRD.

**Free to use, with credit**

- Rules, classes, species, backgrounds, feats, spells, equipment, magic items and monsters that appear in the SRD.
- `CREDITS.md` and the in-game Credits screen carry the attribution statement printed in the SRD document, which names SRD 5.2.1, Wizards of the Coast, the SRD page (https://www.dndbeyond.com/srd) and the CC-BY-4.0 licence. Claude Code copies it word for word from the SRD.
- The licence can't be revoked or changed by Wizards of the Coast.

**Off limits**

- The names "Dungeons & Dragons" and "D&D", their logos and other Wizards trademarks, in the title, art or descriptions.
- Content Wizards kept out of the SRD: beholders, mind flayers, displacer beasts, githyanki and yuan-ti; the Artificer class and Aasimar species; settings such as the Forgotten Realms; named figures such as Strahd and Tiamat.
- Anything the campaign needs that isn't in the SRD (extra subclasses, backgrounds, monsters) is designed and named originally.

**Other credits**

| Asset | Licence | What it requires |
| --- | --- | --- |
| DawnLike art | CC-BY 4.0 | Credit DragonDePlatino and DawnBringer |
| inkjs | Open source | Keep its licence file in `vendor/` |
| Fonts | SIL Open Font License | Keep each font's licence file |
| Audio | CC0 or CC-BY | Credit CC-BY authors |

## Build Phases

The build runs in six phases, each ending in a playable game and a playtest gate. Phase 1 is the milestone that matters most: a one-hour slice that proves the core loop is fun before the big writing push begins.

| Phase | Scope | Gate to move on |
| --- | --- | --- |
| 0 · Foundations | Repo setup, rules engine (dice, checks, sheet maths), Ink bridge, saves and debug mode; home-screen install and offline play from day one | A test scene rolls a check, saves and reloads correctly |
| 1 · Vertical slice | Fighter and Wizard, levels 1–3, character creation, Bramblegate, one dungeon, grid combat; about one hour of play, with session recaps and the journal | It's fun in 10-minute sessions on a phone |
| 2 · Act I | Rogue and Cleric join, levels 1–5, the first two companions, all of Act I; shops, rests, loot tables, Quick Start heroes and Fate's Mercy | Act I plays in about 6 hours |
| 3 · Act II | Levels 5–10, region map and travel, contracts, faction standing and the Whisper; Barbarian, Paladin, Ranger and Warlock | A level 10 hero is fairly matched against Act II bosses |
| 4 · Acts III and IV | Levels 11–20, the Crown War, the descent, four endings and the epilogue; the remaining companions and their personal quests | A full level 1 to 20 playthrough reaches an ending |
| 5 · Polish | Bard, Sorcerer, Monk and Druid; chiptune music and sound effects; Hardcore mode; balance passes, accessibility review, more side quests and contracts | — |

Claude Code builds each phase in small, testable slices, as with Whimsywild.

## Decisions

All ten decisions are settled.

| # | Decision | Chosen |
| --- | --- | --- |
| 1 | How the DM works | Authored story, no AI. An AI narrator would need a Claude API key, cost money per use and break the no-network rule, so it's a later optional mode at most |
| 2 | Rules edition | 2024 rules (SRD 5.2.1) |
| 3 | Art path | DawnLike |
| 4 | Combat view | Tactical grid |
| 5 | Party | Companions plus a Lone Wolf option |
| 6 | Campaign premise | The Shattered Crown |
| 7 | Death | Fate's Mercy by default, plus a Hardcore option |
| 8 | Launch classes | Fighter, Rogue, Cleric, Wizard |
| 9 | Hosting | github.io during the build; a subdomain of Rob's domain before the first real playthrough |
| 10 | Name | Questbound |

**Name note.** Playrix soft-launched a mobile hero-team battler under the name Questbound in 2024, later listed as Perfect Heroes. There's no concept clash, and it's fine for a hobby project; revisit it before any commercial release.
