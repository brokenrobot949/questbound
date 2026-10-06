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
