// Every EXTERNAL function Ink scenes can call is defined here, and only here.
// Each one is declared on the Ink side in story/externals.ink with the same name.
// Ink owns the narrative; these functions are its only way to reach the rules engine.
// None are lookahead-safe: Ink must not call them early while it looks ahead for glue.
//
// runtime.game is the game being played. The functions use its rng, character, flags, money,
// pack and journal. They put each d20 result on game.pendingRolls, and each short DM note
// ("New quest: …") on game.pendingNotes, for the story runner to place on the page.

import { abilityCheck } from '../rules/ability-check.js';
import { canCastSpell } from '../character/spells.js';
import { addItem, buyItem, canAfford, findItem, hasItem, moneyText } from '../character/inventory.js';
import { findDrive } from '../character/creation.js';
import { addDeed, findQuest, questNote, startQuest } from './journal.js';
import { dmNotes } from '../../../data/campaign/dm-voice.js';

export function bindExternals(story, runtime) {
  // check(skill, dc): the hero makes an ability check against a DC, e.g. check("persuasion", 15).
  // skill is a skill id from data/srd/skills.js, or an ability id for a plain ability check.
  // Returns true on a success.
  story.BindExternalFunction(
    'check',
    (skill, dc) => {
      const { game } = runtime;
      const result = abilityCheck({ rng: game.rng, character: game.character, testId: skill, dc });
      game.pendingRolls.push(result);
      return result.success;
    },
    false,
  );

  // set_flag(id): remembers that something happened, e.g. set_flag("saw_barrow_light").
  // Flags are saved with the game and can be read by later scenes.
  story.BindExternalFunction(
    'set_flag',
    (id) => {
      const { game } = runtime;
      const flag = flagId(id);
      if (!game.flags.includes(flag)) game.flags.push(flag);
    },
    false,
  );

  // has_flag(id): true if that flag has been set, e.g. { has_flag("saw_barrow_light"): ... }
  story.BindExternalFunction('has_flag', (id) => runtime.game.flags.includes(flagId(id)), false);

  // has_spell(id): true if the hero can cast that spell now, e.g. { has_spell("knock"): ... }
  // That means a cantrip they know, a prepared or always-prepared spell, or a ritual in a
  // Wizard's spellbook. id is a spell id from data/srd/spells.js.
  story.BindExternalFunction('has_spell', (id) => canCastSpell(runtime.game.character, id), false);

  // has_class(id), has_species(id), has_background(id): who the hero is, for choices only
  // some heroes get, e.g. { has_background("soldier"): ... }. Ids are from data/srd/.
  story.BindExternalFunction('has_class', (id) => runtime.game.character.classId === id, false);
  story.BindExternalFunction('has_species', (id) => runtime.game.character.speciesId === id, false);
  story.BindExternalFunction('has_background', (id) => runtime.game.character.backgroundId === id, false);

  // has_drive(id): true if the hero's Drive is this one (data/campaign/drives.js).
  story.BindExternalFunction('has_drive', (id) => runtime.game.character.drive === id, false);

  // drive_moment(id): the hero just made a choice that fits this Drive. If it's their Drive,
  // they gain Heroic Inspiration. Put a matching #drive:id tag on the choice, so the card
  // can show it, e.g. * [Take the job for the silver #drive:wealth] ~ drive_moment("wealth")
  story.BindExternalFunction(
    'drive_moment',
    (id) => {
      const { game } = runtime;
      if (!findDrive(id)) throw new Error(`Unknown Drive: ${id}`);
      if (game.character.drive !== id) return;
      const drive = findDrive(id).name;
      if (game.inspiration) {
        note(game, dmNotes.alreadyInspired, { drive });
      } else {
        game.inspiration = true;
        note(game, dmNotes.inspirationFromDrive, { drive });
      }
    },
    false,
  );

  // long_rest(): the hero sleeps the night through, and the next day begins.
  // (Hit Points, spell slots and Hit Dice come back here once play uses them.)
  story.BindExternalFunction(
    'long_rest',
    () => {
      const { game } = runtime;
      game.day += 1;
      // The Human's Resourceful trait.
      if (game.character.speciesId === 'human' && !game.inspiration) {
        game.inspiration = true;
        note(game, dmNotes.inspirationFromRest);
      }
    },
    false,
  );

  // add_deed(text): writes a notable act into the journal, stamped with the day, in the DM's
  // words, e.g. ~ add_deed("Talked Warden Pike into opening the gate after sundown.")
  story.BindExternalFunction('add_deed', (text) => addDeed(runtime.game, text), false);

  // start_quest(id): starts a quest from data/campaign/quests.js and tells the player.
  story.BindExternalFunction(
    'start_quest',
    (id) => {
      if (startQuest(runtime.game, id)) note(runtime.game, dmNotes.questStarted, { title: findQuest(id).title });
    },
    false,
  );

  // quest_note(id, text): adds a clue or update to a quest's page in the journal.
  story.BindExternalFunction(
    'quest_note',
    (id, text) => {
      const { game } = runtime;
      questNote(game, id, text);
      // One note per quest per page is plenty ("New quest" already says it's in the journal).
      const title = findQuest(id).title;
      if (!game.pendingNotes.some((n) => n.includes(title))) note(game, dmNotes.questUpdated, { title });
    },
    false,
  );

  // can_afford(item): true if the hero has the money for one of that item.
  // buy(item): pays for one and puts it in the pack. Put a #buy:item tag on the choice so
  // the card shows the price, e.g. + {can_afford("torch")} [Buy a torch #buy:torch] ~ buy("torch")
  story.BindExternalFunction('can_afford', (id) => canAfford(runtime.game, id), false);
  story.BindExternalFunction(
    'buy',
    (id) => {
      const price = buyItem(runtime.game, id);
      note(runtime.game, dmNotes.itemBought, { item: findItem(id).name, cost: moneyText(price) });
    },
    false,
  );

  // give_item(item): the hero is given one of an item, free.
  // has_item(item): true if the hero carries at least one.
  story.BindExternalFunction(
    'give_item',
    (id) => {
      addItem(runtime.game.inventory, id, 1);
      note(runtime.game, dmNotes.itemGained, { item: findItem(id).name });
    },
    false,
  );
  story.BindExternalFunction('has_item', (id) => hasItem(runtime.game, id), false);
}

// A short DM note for the page ("New quest: …"), shown where it happened in the story.
function note(game, template, values = {}) {
  const text = template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  game.pendingNotes.push(text);
}

function flagId(id) {
  if (typeof id !== 'string' || id.trim() === '') throw new Error(`A story flag needs a name, got ${id}`);
  return id.trim();
}
