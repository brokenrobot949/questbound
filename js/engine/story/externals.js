// Every EXTERNAL function Ink scenes can call is defined here, and only here.
// Each one is declared on the Ink side in story/externals.ink with the same name.
// Ink owns the narrative; these functions are its only way to reach the rules engine.
// None are lookahead-safe: Ink must not call them early while it looks ahead for glue.
//
// runtime.game is the game being played. The functions use its rng, character, flags, money,
// pack and journal. They put each d20 result and each short DM note ("New quest: …") on
// game.pending, in the order they happen, for the story runner to place on the page.

import { abilityCheck } from '../rules/ability-check.js';
import { d20Test } from '../rules/d20-test.js';
import { canCastSpell, findSpell, preparePicks } from '../character/spells.js';
import { castCostText, castInScene, guidanceModifiers, sceneCastCost, spellSaveDc } from '../character/casting.js';
import { findAbility } from '../character/sheet.js';
import { addItem, buyItem, canAfford, COPPER_PER, findItem, hasItem, moneyText, removeItem } from '../character/inventory.js';
import { findDrive } from '../character/creation.js';
import { addDeed, findQuest, finishQuest, questNote, startQuest } from './journal.js';
import { longRestRecovery } from '../character/resources.js';
import { tacticalMind } from '../character/features.js';
import { takeDamage } from '../character/hazards.js';
import { dmNotes } from '../../../data/campaign/dm-voice.js';

export function bindExternals(story, runtime) {
  // check(skill, dc): the hero makes an ability check against a DC, e.g. check("persuasion", 15).
  // skill is a skill id from data/srd/skills.js, a tool id ("thieves-tools": the tool's ability,
  // plus Proficiency if the hero is proficient with it), or an ability id for a plain check.
  // Returns true on a success. A Fighter's Tactical Mind can turn a failure into a success,
  // and a hero who knows Guidance adds 1d4.
  story.BindExternalFunction(
    'check',
    (skill, dc) => {
      const { game } = runtime;
      const extraModifiers = guidanceModifiers(game);
      const result = tacticalMind(game, abilityCheck({ rng: game.rng, character: game.character, testId: skill, dc, extraModifiers }));
      game.pending.push({ type: 'roll', result });
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

  // has_spell(id): true if the hero has that spell ready, slots or not: a cantrip they know,
  // a prepared or always-prepared spell, or a ritual in a Wizard's spellbook. id is a spell
  // id from data/srd/spells.js.
  story.BindExternalFunction('has_spell', (id) => canCastSpell(runtime.game.character, id), false);

  // can_cast(id): true if the hero can cast that spell right now, with a way to pay for it:
  // a cantrip, a Ritual, a free cast or a spell slot left (see character/casting.js). Use it
  // to show a spell's choice, and cast(id) in the choice to cast it, e.g.
  //   * {can_cast("knock")} [Knock the lock open #spell:knock]
  //       ~ cast("knock")
  // The #spell tag shows the spell, and what it will cost, on the card.
  story.BindExternalFunction('can_cast', (id) => Boolean(sceneCastCost(runtime.game, id)), false);

  // cast(id): casts the spell, spending a free cast or the lowest slot it can use (a cantrip
  // or a Ritual costs nothing), and says so in a DM note.
  story.BindExternalFunction(
    'cast',
    (id) => {
      castSpellWithNote(runtime.game, id);
    },
    false,
  );

  // cast_on(id, who, ability, bonus): casts a spell that its target saves against (Charm
  // Person on a gate warden, say), e.g. cast_on("charm-person", "Warden Pike", "wisdom", 1).
  // who makes the save (bonus is their saving throw bonus) against the hero's spell save DC,
  // rolled in the open. Returns true if the spell takes hold: the target failed the save.
  story.BindExternalFunction(
    'cast_on',
    (id, who, ability, bonus) => {
      const { game } = runtime;
      castSpellWithNote(game, id);
      const save = findAbility(ability);
      if (!save) throw new Error(`cast_on needs an ability id, got ${ability}`);
      const result = d20Test({
        rng: game.rng,
        kind: 'save',
        label: `${who}'s ${save.name} save against ${findSpell(id).name}`,
        modifiers: [{ label: `${save.abbreviation} save`, value: bonus, source: who }],
        target: { type: 'DC', value: spellSaveDc(game.character, id) },
      });
      // opponent: the roll is someone else's, so a success is bad news for the hero.
      game.pending.push({ type: 'roll', result: { ...result, opponent: who } });
      return !result.success;
    },
    false,
  );

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

  // long_rest(): the hero sleeps the night through: all Hit Points, spell slots and feature
  // uses come back, and the next day begins. It's a natural stopping point, and the DM says so.
  story.BindExternalFunction(
    'long_rest',
    () => {
      const { game } = runtime;
      game.day += 1;
      longRestRecovery(game);
      // The Human's Resourceful trait.
      if (game.character.speciesId === 'human' && !game.inspiration) {
        game.inspiration = true;
        note(game, dmNotes.inspirationFromRest);
      }
      // A Wizard or Cleric can change their prepared spells, until the story moves on.
      if (preparePicks(game.character)) {
        game.canPrepare = true;
        note(game, dmNotes.prepareAfterRest);
      }
      game.pending.push({ type: 'stop' }); // the page ends with "a good place to stop"
    },
    false,
  );

  // set_objective(text): the hero's aim now, in the DM's words, e.g.
  // ~ set_objective("Follow the goblins' trail south to the old quarry.")
  // "What now?" and the recap at the start of a session show it.
  story.BindExternalFunction(
    'set_objective',
    (text) => {
      if (typeof text !== 'string' || text.trim() === '') throw new Error('set_objective needs some text');
      runtime.game.objective = text.trim();
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
      if (!game.pending.some((b) => b.type === 'note' && b.text.includes(title))) note(game, dmNotes.questUpdated, { title });
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

  // take_item(item): one of an item leaves the pack: used up, eaten or handed over.
  // Check has_item first; taking something the hero doesn't have is a story bug.
  story.BindExternalFunction(
    'take_item',
    (id) => {
      removeItem(runtime.game.inventory, id, 1);
      note(runtime.game, dmNotes.itemGone, { item: findItem(id).name });
    },
    false,
  );

  // combat_won(): true if the hero won the last fight. A choice tagged #combat:encounter-id
  // starts a fight on the battle grid; its content runs once the fight is over, e.g.
  //   * [Fight them #combat:mill-scavengers]
  //       { combat_won(): You stand over the goblins… - else: … }
  story.BindExternalFunction('combat_won', () => Boolean(runtime.game.lastBattle && runtime.game.lastBattle.outcome === 'victory'), false);

  // foe_escaped(monster): true if a foe of that kind fled the last fight instead of falling,
  // e.g. { foe_escaped("cultist"): He got away. }. monster is an id from data/srd/monsters.js.
  story.BindExternalFunction('foe_escaped', (id) => Boolean(runtime.game.lastBattle && (runtime.game.lastBattle.escaped || []).includes(id)), false);

  // give_xp(n): the hero earns XP for a quest or discovery (fights give their own).
  story.BindExternalFunction(
    'give_xp',
    (amount) => {
      if (!Number.isInteger(amount) || amount < 0) throw new Error(`give_xp needs a whole number, got ${amount}`);
      runtime.game.xp += amount;
      note(runtime.game, dmNotes.xpGained, { xp: amount });
    },
    false,
  );

  // take_damage(dice, type): the hero takes damage outside a fight, from a trap or a fall,
  // e.g. ~ temp outcome = take_damage("1d6", "bludgeoning"). Resistance halves it. At 0 Hit
  // Points the hero makes death saving throws (shown as rolls) with nobody to help. Returns
  // "up" (still standing), "woke" (dropped, then came round with 1 Hit Point) or "dead"
  // (go to Fate's Mercy).
  story.BindExternalFunction(
    'take_damage',
    (dice, type) => {
      const { game } = runtime;
      const { outcome } = takeDamage(game, dice, type, {
        onDamage: (rolls, taken) => note(game, dmNotes.damageTaken, { damage: taken, type, dice, rolls: rolls.join(', ') }),
        onDying: () => note(game, dmNotes.blackedOut),
      });
      if (outcome === 'woke') note(game, dmNotes.cameRound);
      if (outcome === 'dead') note(game, dmNotes.fellDead);
      return outcome;
    },
    false,
  );

  // give_coins(gp): the hero is paid, in gold pieces, e.g. ~ give_coins(25)
  story.BindExternalFunction(
    'give_coins',
    (gp) => {
      if (!Number.isInteger(gp) || gp < 1) throw new Error(`give_coins needs a whole number of gold pieces, got ${gp}`);
      runtime.game.money += gp * COPPER_PER.gp;
      note(runtime.game, dmNotes.coinsGained, { coins: moneyText(gp * COPPER_PER.gp) });
    },
    false,
  );

  // finish_quest(id): marks a quest done in the journal, and tells the player.
  story.BindExternalFunction(
    'finish_quest',
    (id) => {
      finishQuest(runtime.game, id);
      note(runtime.game, dmNotes.questFinished, { title: findQuest(id).title });
      runtime.game.pending.push({ type: 'stop' });
    },
    false,
  );

  // lose_coins(): the hero's purse is taken (Fate's Mercy: robbed while unconscious).
  story.BindExternalFunction(
    'lose_coins',
    () => {
      runtime.game.money = 0;
      note(runtime.game, dmNotes.coinsLost);
    },
    false,
  );
}

// Casts a spell in a scene and notes what it cost (nothing to note for a cantrip).
function castSpellWithNote(game, id) {
  const cost = castInScene(game, id);
  const spell = findSpell(id).name;
  if (cost.kind === 'ritual') note(game, dmNotes.castRitual, { spell });
  if (cost.kind === 'free') note(game, dmNotes.castFree, { spell });
  if (cost.kind === 'slot') note(game, dmNotes.castWithSlot, { spell, cost: castCostText(cost) });
}

// A short DM note for the page ("New quest: …"), shown where it happened in the story.
function note(game, template, values = {}) {
  const text = template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  game.pending.push({ type: 'note', text });
}

function flagId(id) {
  if (typeof id !== 'string' || id.trim() === '') throw new Error(`A story flag needs a name, got ${id}`);
  return id.trim();
}
