// Engine functions that scenes can call. Each is written in js/engine/story/externals.js.
// Declare a function here only once the engine supports it.

// check(skill, dc): the hero makes an ability check, e.g. check("persuasion", 15).
// skill is a skill id from data/srd/skills.js, or an ability id such as "strength".
// True on a success. The player sees the full roll.
EXTERNAL check(skill, dc)
