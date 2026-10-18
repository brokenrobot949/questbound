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
import { findAbility, findSkill, findTool } from '../character/sheet.js';
import { addItem, buyItem, canAfford, COPPER_PER, findItem, hasItem, hasShard, makeMagicWeapon, moneyText, plainWeapons, removeItem } from '../character/inventory.js';
import { findBond, findDrive } from '../character/creation.js';
import { addDeed, findQuest, finishQuest, questNote, startQuest } from './journal.js';
import { longRestRecovery } from '../character/resources.js';
import { approve, feeling, findCompanion, inParty, joinParty, leaveParty, memberGame, memberOf, PARTY_LIMIT, partyLongRest, raiseMember } from '../character/party.js';
import { nextLevelXp, xpForLevel, xpText } from '../character/level-up.js';
import { tacticalMind } from '../character/features.js';
import { findTrap, springTrap, takeDamage, trapDamageDice } from '../character/hazards.js';
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

  // join_party(id): a companion (data/campaign/companions.js) joins the hero, e.g.
  // ~ join_party("odda"). Up to two travel at once, so check party_full() first. The DM says
  // who joined. leave_party(id): they go their own way.
  story.BindExternalFunction(
    'join_party',
    (id) => {
      const { game } = runtime;
      if (inParty(game, id)) return;
      joinParty(game, id);
      note(game, dmNotes.joinedParty, { name: findCompanion(id).character.name });
    },
    false,
  );
  story.BindExternalFunction(
    'leave_party',
    (id) => {
      const { game } = runtime;
      if (!inParty(game, id)) return;
      leaveParty(game, id);
      note(game, dmNotes.leftParty, { name: findCompanion(id).character.name });
    },
    false,
  );

  // in_party(id): true if that companion is travelling with the hero (fallen or not).
  // party_full(): true if two companions already are.
  story.BindExternalFunction('in_party', (id) => inParty(runtime.game, id), false);
  story.BindExternalFunction('party_full', () => (runtime.game.party || []).length >= PARTY_LIMIT, false);

  // companion_alive(id): true if that companion is with the hero and hasn't fallen (died) in a
  // fight. Wrap a companion's lines in it after a fight they could have died in, e.g.
  //   { companion_alive("odda"): Odda wipes her mace on a burial cloth. #speaker:odda }
  story.BindExternalFunction('companion_alive', (id) => aliveMember(runtime.game, id) !== null, false);

  // raise_companion(id): a companion who fell (died) is alive again, on their feet with all
  // their Hit Points, and the DM says so. Nothing happens if they're not with the hero or
  // haven't fallen, e.g. { in_party("odda") && not companion_alive("odda"): ~ raise_companion("odda") }
  story.BindExternalFunction(
    'raise_companion',
    (id) => {
      const { game } = runtime;
      if (!findCompanion(id)) throw new Error(`Unknown companion: ${id}`);
      if (raiseMember(game, id)) note(game, dmNotes.companionRaised, { name: findCompanion(id).character.name.split(' ')[0] });
    },
    false,
  );

  // Companions' spells in scenes, as can_cast and cast are for the hero.
  // companion_can_cast(id, spell): that companion is with the hero, alive, and can cast the
  // spell right now, with a way to pay for it (their own spell slots or free casts).
  // companion_cast(id, spell): they cast it, paying the cheapest way, and the DM says so. Tag
  // the choice with the spell and #by, so the card shows whose spell it is and its cost:
  //   * {companion_can_cast("odda", "lesser-restoration")} [Ask Odda to free her #spell:lesser-restoration #by:odda]
  //       ~ companion_cast("odda", "lesser-restoration")
  story.BindExternalFunction(
    'companion_can_cast',
    (id, spell) => {
      const member = aliveMember(runtime.game, id);
      return Boolean(member && sceneCastCost(memberGame(runtime.game, member), spell));
    },
    false,
  );
  story.BindExternalFunction(
    'companion_cast',
    (id, spell) => {
      const { game } = runtime;
      const member = aliveMember(game, id);
      if (!member) throw new Error(`${id} isn't with the hero to cast ${spell}`);
      const caster = memberGame(game, member);
      const cost = castInScene(caster, spell);
      const values = { name: caster.character.name.split(' ')[0], spell: findSpell(spell).name, cost: castCostText(cost) };
      if (cost.kind === 'ritual') note(game, dmNotes.companionCastRitual, values);
      if (cost.kind === 'free') note(game, dmNotes.companionCastFree, values);
      if (cost.kind === 'slot') note(game, dmNotes.companionCastWithSlot, values);
    },
    false,
  );

  // approve(id, change): a companion liked (1) or disliked (-1) what the hero just did, e.g.
  // ~ approve("fen", 1) for sparing someone. Nothing happens if they aren't with the hero.
  // The companions' likes and dislikes are in data/campaign/companions.js.
  story.BindExternalFunction(
    'approve',
    (id, change) => {
      if (!findCompanion(id)) throw new Error(`Unknown companion: ${id}`);
      approve(runtime.game, id, change);
    },
    false,
  );

  // likes_you(id), dislikes_you(id): how a companion with the hero (and alive) feels about
  // them, from their hidden approval and approvalBands in data/campaign/companions.js. Both
  // false in between, or if they're not with the hero, e.g.
  //   * {likes_you("odda")} [Sit with Odda while the fire burns down]
  story.BindExternalFunction('likes_you', (id) => Boolean(aliveMember(runtime.game, id)) && feeling(runtime.game, id) === 'likes', false);
  story.BindExternalFunction('dislikes_you', (id) => Boolean(aliveMember(runtime.game, id)) && feeling(runtime.game, id) === 'dislikes', false);

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
      partyLongRest(game);
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

  // can_afford_at(shop, item) and buy_at(shop, item): the same, in a shop from
  // data/campaign/shops.js, at its price there (less any discount the hero has won). Tag the
  // choice with #buy:item and #shop:id, so the card shows that price, e.g.
  //   + {can_afford_at("hobs-forge", "dagger")} [Buy a dagger #buy:dagger #shop:hobs-forge]
  //       ~ buy_at("hobs-forge", "dagger")
  story.BindExternalFunction('can_afford_at', (shop, id) => canAfford(runtime.game, id, shop), false);
  story.BindExternalFunction(
    'buy_at',
    (shop, id) => {
      const price = buyItem(runtime.game, id, shop);
      note(runtime.game, dmNotes.itemBought, { item: findItem(id).name, cost: moneyText(price) });
    },
    false,
  );

  // contest(skill, who, bonus): the hero and someone else both make a check, and the higher
  // total wins (arm-wrestling Hob's apprentice: contest("athletics", "Greta", 5)). who rolls
  // first, adding bonus, in the open; then the hero rolls to beat it (Guidance and a Fighter's
  // Tactical Mind help, as with check). Returns 1 if the hero wins, -1 if they lose, and 0 for a
  // tie: neither has the better of it yet (a scene can have them go again).
  story.BindExternalFunction(
    'contest',
    (skill, who, bonus) => {
      const { game } = runtime;
      const theirs = d20Test({
        rng: game.rng,
        kind: 'check',
        label: `${who}'s ${testName(skill)} check`,
        modifiers: [{ label: testName(skill), value: bonus, source: who }],
      });
      game.pending.push({ type: 'roll', result: { ...theirs, opponent: who } });
      // To win, the hero has to beat their total: meeting it is a tie.
      const rolled = abilityCheck({ rng: game.rng, character: game.character, testId: skill, dc: theirs.total + 1, extraModifiers: guidanceModifiers(game) });
      const mine = tacticalMind(game, { ...rolled, label: `${testName(skill)} contest` });
      const outcome = mine.success ? 1 : mine.total === theirs.total ? 0 : -1;
      const result = {
        ...mine,
        target: { type: 'contest', value: theirs.total, who },
        success: outcome === 0 ? null : outcome > 0,
        outcome: ['lost', 'tie', 'won'][outcome + 1],
      };
      game.pending.push({ type: 'roll', result });
      return outcome;
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

  // item_name(item): an item's name, to print in a scene ("Longsword"); "" for "".
  story.BindExternalFunction(
    'item_name',
    (id) => {
      if (id === '') return '';
      const item = findItem(id);
      if (!item) throw new Error(`Unknown item: ${id}`);
      return item.name;
    },
    false,
  );

  // Making a weapon magic (Hob's star-iron): plain_weapon(n) is the id of the nth kind of plain
  // weapon in the pack (1 for the first), in pack order, or "" if there are fewer.
  // make_weapon_magic(item): one of that weapon becomes a +1 magic weapon, and the DM says so.
  // (Ink can't call these inside a choice's text: put them in temporary variables first, as
  // hobs_reforge does in story/act-1/ch2-hobs-ore.ink.)
  story.BindExternalFunction('plain_weapon', (n) => plainWeapons(runtime.game)[n - 1] || '', false);
  story.BindExternalFunction(
    'make_weapon_magic',
    (id) => {
      const plain = findItem(id);
      const magic = makeMagicWeapon(runtime.game, id, 1);
      note(runtime.game, dmNotes.weaponMadeMagic, { weapon: plain.name, item: magic.name, bonus: magic.magicBonus });
    },
    false,
  );

  // has_shard(id): true while the hero carries that shard of the crown (an id from
  // data/campaign/shards.js, such as "names"). A choice that uses its power is shown only with
  // it, and tagged so the card shows the shard:
  //   * {has_shard("names")} [Ask the dead man his name #shard:names]
  story.BindExternalFunction('has_shard', (id) => hasShard(runtime.game, id), false);

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

  // foe_turned(monster): true if the hero called a foe of that kind by its name in the last
  // fight, and it turned to their side (the encounter's callByName), e.g.
  //   { foe_turned("wight"): She remembered her oath. }
  story.BindExternalFunction('foe_turned', (id) => Boolean(runtime.game.lastBattle && (runtime.game.lastBattle.turned || []).includes(id)), false);

  // allies_standing(): how many of the allies who fought beside the party in the last fight
  // (an encounter's allies: the Old Ford's soldiers) came through it alive, won or lost, e.g.
  //   { allies_standing() == 3: All three of them are still on their feet. }
  // 0 if the last fight had none. ally_standing(id): true if that one did (an ally's id from
  // the encounter, e.g. ally_standing("brannock")).
  const alliesAlive = () => (runtime.game.lastBattle && runtime.game.lastBattle.alliesAlive) || [];
  story.BindExternalFunction('allies_standing', () => alliesAlive().length, false);
  story.BindExternalFunction('ally_standing', (id) => alliesAlive().includes(id), false);

  // has_bond(id): true if the hero's Bond is this kind ("sibling", "mentor", "rival" or
  // "debt", from data/campaign/bonds.js). bond_name(): the name the player gave them (for a
  // Debt, who the hero owes), to print in a scene: "A letter from {bond_name()}."
  story.BindExternalFunction(
    'has_bond',
    (id) => {
      if (!findBond(id)) throw new Error(`Unknown Bond: ${id}`);
      return Boolean(runtime.game.character.bond && runtime.game.character.bond.type === id);
    },
    false,
  );
  story.BindExternalFunction('bond_name', () => (runtime.game.character.bond && runtime.game.character.bond.name) || '', false);

  // hero_name(): the hero's whole name, as the player gave it, to print in a scene:
  // "It says your name: {hero_name()}."
  story.BindExternalFunction('hero_name', () => runtime.game.character.name, false);

  // give_xp(n): the hero earns XP for a quest or discovery (fights give their own).
  story.BindExternalFunction(
    'give_xp',
    (amount) => {
      if (!Number.isInteger(amount) || amount < 0) throw new Error(`give_xp needs a whole number, got ${amount}`);
      runtime.game.xp += amount;
      const banked = nextLevelXp(runtime.game.character) === null; // at the highest level so far
      note(runtime.game, banked ? dmNotes.xpGainedBanked : dmNotes.xpGained, { xp: xpText(amount) });
    },
    false,
  );

  // xp_milestone(level): a story milestone the hero should have reached that level by, e.g.
  // ~ xp_milestone(4). A hero with less XP than the level needs is brought up to it (the level-up
  // follows), and the DM says so; a hero with enough already gets nothing more.
  story.BindExternalFunction(
    'xp_milestone',
    (level) => {
      const { game } = runtime;
      const needed = xpForLevel(level);
      if (game.xp >= needed) return;
      game.xp = needed;
      note(game, dmNotes.xpMilestone, { xp: xpText(needed), level });
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
      if (outcome === 'dead') heroDied(game);
      return outcome;
    },
    false,
  );

  // spring_trap(id): a trap from data/srd/traps.js springs on the hero, outside a fight, e.g.
  // ~ temp darts = spring_trap("poisoned-darts"). They make its saving throw (shown as a roll);
  // on a failure it strikes them, and the damage works as for take_damage. Returns "safe"
  // (the save succeeded), or take_damage's "up", "woke" or "dead" (go to Fate's Mercy).
  story.BindExternalFunction(
    'spring_trap',
    (id) => {
      const { game } = runtime;
      const trap = findTrap(id);
      if (!trap) throw new Error(`Unknown trap: ${id}`);
      const sides = trapDamageDice(trap, game.character.level).split('d')[1];
      const { outcome } = springTrap(game, trap, {
        onHits: (hits) => note(game, dmNotes.trapStruck, { hits, what: hits === 1 ? trap.one : trap.many }),
        onDamage: (rolls, taken) => note(game, dmNotes.damageTaken, { damage: taken, type: trap.damage.type, dice: `${rolls.length}d${sides}`, rolls: rolls.join(', ') }),
        onDying: () => note(game, dmNotes.blackedOut),
      });
      if (outcome === 'woke') note(game, dmNotes.cameRound);
      if (outcome === 'dead') heroDied(game);
      return outcome;
    },
    false,
  );

  // give_coins(gp): the hero is paid, in gold pieces, e.g. ~ give_coins(25)
  story.BindExternalFunction(
    'give_coins',
    (gp) => {
      runtime.game.money += goldInCopper('give_coins', gp);
      note(runtime.game, dmNotes.coinsGained, { coins: moneyText(gp * COPPER_PER.gp) });
    },
    false,
  );

  // can_pay(gp): true if the hero has that many gold pieces' worth of money.
  // pay(gp): they hand it over (a fine, a bribe, a toll), and the DM says so. Show the choice
  // with can_pay and tag it #pay:gp, so the card shows the price, e.g.
  //   * {can_pay(10)} [Pay his fine #pay:10]
  //       ~ pay(10)
  story.BindExternalFunction('can_pay', (gp) => runtime.game.money >= goldInCopper('can_pay', gp), false);
  story.BindExternalFunction(
    'pay',
    (gp) => {
      const { game } = runtime;
      const copper = goldInCopper('pay', gp);
      if (game.money < copper) throw new Error(`The hero can't pay ${gp} gold: check can_pay first`);
      game.money -= copper;
      note(game, dmNotes.coinsPaid, { coins: moneyText(copper) });
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

// A companion who's with the hero and hasn't fallen, or null.
function aliveMember(game, id) {
  if (!findCompanion(id)) throw new Error(`Unknown companion: ${id}`);
  const member = memberOf(game, id);
  return member && !member.fallen ? member : null;
}

// "Athletics", "Thieves’ Tools" or "Strength": what a check with this id is called.
function testName(id) {
  const named = findSkill(id) || findTool(id) || findAbility(id);
  if (!named) throw new Error(`Unknown skill, tool or ability: ${id}`);
  return named.name;
}

// A short DM note for the page ("New quest: …"), shown where it happened in the story.
function note(game, template, values = {}) {
  const text = template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  game.pending.push({ type: 'note', text });
}

// The hero died outside a fight (a trap, a fall), and the story goes to Fate's Mercy. It
// counts in game.deaths, as a lost fight does (combat/battle.js, finishBattle).
function heroDied(game) {
  game.deaths = (game.deaths || 0) + 1;
  note(game, dmNotes.fellDead);
}

// A whole number of gold pieces from a scene, in copper; anything else is a story bug.
function goldInCopper(name, gp) {
  if (!Number.isInteger(gp) || gp < 1) throw new Error(`${name} needs a whole number of gold pieces, got ${gp}`);
  return gp * COPPER_PER.gp;
}

function flagId(id) {
  if (typeof id !== 'string' || id.trim() === '') throw new Error(`A story flag needs a name, got ${id}`);
  return id.trim();
}
