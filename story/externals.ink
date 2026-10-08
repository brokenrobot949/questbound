// Engine functions that scenes can call. Each is written in js/engine/story/externals.js.
// Declare a function here only once the engine supports it.

// check(skill, dc): the hero makes an ability check, e.g. check("persuasion", 15).
// skill is a skill id from data/srd/skills.js, or an ability id such as "strength".
// True on a success. The player sees the full roll.
EXTERNAL check(skill, dc)

// set_flag(id): remembers that something happened, e.g. ~ set_flag("saw_barrow_light")
// Flags are saved with the game. Use short lowercase names with underscores.
EXTERNAL set_flag(id)

// has_flag(id): true if that flag has been set, e.g. { has_flag("saw_barrow_light"): ... }
EXTERNAL has_flag(id)

// has_spell(id): true if the hero can cast that spell now, e.g. { has_spell("knock"): ... }
// A known cantrip, a prepared spell, or a ritual in a Wizard's spellbook all count.
// id is a spell id from data/srd/spells.js, such as "light" or "detect-magic".
EXTERNAL has_spell(id)

// has_class(id), has_species(id), has_background(id): who the hero is, for choices only
// some heroes get, e.g. * {has_background("soldier")} [Show your regiment's token]
// Ids are from data/srd/: "fighter", "dwarf", "acolyte" and so on.
EXTERNAL has_class(id)
EXTERNAL has_species(id)
EXTERNAL has_background(id)

// has_drive(id): true if the hero's Drive is this one ("glory", "faith", "wealth",
// "knowledge", "justice", "freedom" or "kinship").
EXTERNAL has_drive(id)

// drive_moment(id): call it inside a choice that fits a Drive. If it's the hero's Drive, they
// gain Heroic Inspiration. Tag the choice too, so the card can show it:
//   * [Take the job for the silver #drive:wealth]
//       ~ drive_moment("wealth")
EXTERNAL drive_moment(id)

// long_rest(): the hero sleeps the night through, and the next day begins.
EXTERNAL long_rest()

// add_deed(text): writes a notable act into the journal, stamped with the day. Write it in
// the DM's voice, past tense, e.g. ~ add_deed("Talked Warden Pike into opening the gate.")
EXTERNAL add_deed(text)

// start_quest(id): starts a quest from data/campaign/quests.js; the player is told.
// quest_note(id, text): adds a clue or update to the quest's page in the journal.
EXTERNAL start_quest(id)
EXTERNAL quest_note(id, text)

// can_afford(item): true if the hero has the money for one of that item.
// buy(item): pays for one and puts it in the pack. Tag the choice so the card shows the price:
//   + {can_afford("torch")} [Buy a torch #buy:torch]
//       ~ buy("torch")
// Item ids are from data/srd/equipment.js.
EXTERNAL can_afford(item)
EXTERNAL buy(item)

// give_item(item): the hero is given one of an item, free. has_item(item): they carry one.
EXTERNAL give_item(item)
EXTERNAL has_item(item)

// take_item(item): one of an item leaves the pack (used up, eaten or handed over), and the
// player is told. Only call it after has_item says the hero has one, e.g.
//   * {has_item("rations")} [Toss it your rations] ~ take_item("rations")
EXTERNAL take_item(item)

// Fights: a choice tagged #combat:encounter-id (from data/campaign/encounters.js) starts a
// fight on the battle grid. The choice's content runs once the fight is over, and
// combat_won() says how it went:
//   * [Fight them #combat:mill-scavengers]
//       { combat_won():
//           The goblins lie still…
//       - else:
//           You wake somewhere else… (Fate's Mercy: failure moves the story on)
//       }
EXTERNAL combat_won()

// give_xp(n): the hero earns XP for a quest or discovery. Fights give their own XP.
EXTERNAL give_xp(n)

// lose_coins(): the hero's purse is gone (for Fate's Mercy: robbed while unconscious).
EXTERNAL lose_coins()
