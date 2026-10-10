// The character creation steps, one screen each. Every function takes the screen's context
// and returns the nodes to show:
//   ctx.draft            the hero being built (see character/creation.js)
//   ctx.set(draft, { redraw })   stores a changed draft; redraw false only refreshes the
//                        Back / Next bar (used while typing, so the text box keeps its place)
//   ctx.state            the screen's own state (rolled ability scores, which tab is open)
//   ctx.rng              the game's dice, for rolling scores and names

import { abilities } from '../../../data/srd/abilities.js';
import { skills } from '../../../data/srd/skills.js';
import { classes } from '../../../data/srd/classes.js';
import { species } from '../../../data/srd/species.js';
import { backgrounds } from '../../../data/srd/backgrounds.js';
import { feats } from '../../../data/srd/feats.js';
import { standardArray, pointBuy, maxAbilityScore } from '../../../data/srd/character-creation.js';
import { drives } from '../../../data/campaign/drives.js';
import { bonds } from '../../../data/campaign/bonds.js';
import * as creation from '../character/creation.js';
import {
  abilityModifier,
  abilityScore,
  armorClass,
  findAbility,
  findArmor,
  findBackground,
  findClass,
  findFeat,
  findMastery,
  findSkill,
  findSpecies,
  findWeapon,
  skillBonus,
  skillProficiency,
  speed,
} from '../character/sheet.js';
import { MAX_NAME_LENGTH } from '../character/validate.js';
import { signedNumber } from './roll-format.js';
import { el } from './dom.js';
import { chip, chipRow, expandable, optionCard, optionList, section, swatchChip, textField } from './widgets.js';
import { heroSheet } from './hero-sheet.js';
import { findSpell, magicInitiateLists, speciesSpells, spellsOnList } from '../character/spells.js';
import { spellList } from './spell-picker.js';
import { skinTones, hairStyles, hairColors, clothColors } from '../../../data/campaign/hero-looks.js';
import { headgearFor, heroSprite, rollLook, speciesFeatureNames } from '../character/look.js';
import { portrait } from './sprite-canvas.js';

const abilityName = (id) => findAbility(id).name;
const skillName = (id) => findSkill(id).name;
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const heading = (text) => el('h2', 'creation-heading', text);
const intro = (text) => el('p', 'creation-intro', text);
const note = (text) => el('p', 'creation-note', text);

// "Strength or Dexterity", "Insight, Perception or Survival".
function orList(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}
function andList(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// Spell names from their ids ("pass-without-trace" → "Pass without Trace"), until the spells
// data arrives with their real entries.
const SMALL_WORDS = ['of', 'with', 'without', 'the', 'and'];
function spellName(id) {
  return id
    .split('-')
    .map((word, i) => (i > 0 && SMALL_WORDS.includes(word) ? word : capitalise(word)))
    .join(' ');
}

function featName(feat, spellList) {
  return spellList ? `${feat.name} (${capitalise(spellList)})` : feat.name;
}

function itemText({ item, quantity }) {
  return quantity > 1 ? `${item.name} ×${quantity}` : item.name;
}

// ---- Step 1: Class ----

export function classStep(ctx) {
  const { draft } = ctx;
  const nodes = [heading('Choose your class'), intro('Your class is your training: how you fight, and what you’re best at.')];
  nodes.push(
    optionList(
      classes.map((cls) =>
        optionCard({
          key: `class-${cls.id}`,
          title: cls.name,
          lines: [
            `Hit Die d${cls.hitDie} · Best at ${orList(cls.primaryAbilities.map(abilityName))}`,
            `Saving throws: ${andList(cls.savingThrows.map(abilityName))}`,
            `Weapons: ${weaponText(cls)} · Armour: ${armourText(cls.armorTraining)}`,
          ],
          selected: draft.classId === cls.id,
          onSelect: () => ctx.set(creation.chooseClass(ctx.draft, cls.id)),
        }),
      ),
    ),
  );

  const cls = findClass(draft.classId);
  if (!cls) return nodes;
  const features = section(`${cls.name} features at level 1`, 'Tap one to read it.');
  for (const id of cls.levels[0].features) features.append(expandable(cls.features[id].name, cls.features[id].text));
  nodes.push(features);

  if (cls.id === 'fighter') {
    const styles = section('Fighting Style', 'Choose one. You can swap it whenever you gain a Fighter level.');
    styles.append(
      optionList(
        feats
          .filter((f) => f.category === 'fighting-style')
          .map((feat) =>
            optionCard({
              key: `style-${feat.id}`,
              title: feat.name,
              tag: feat.id === 'defense' ? 'Recommended' : '',
              lines: [feat.text],
              selected: draft.classChoices.fightingStyle === feat.id,
              onSelect: () => ctx.set(creation.chooseFightingStyle(ctx.draft, feat.id)),
            }),
          ),
      ),
    );
    nodes.push(styles);
  }
  if (cls.divineOrders) {
    const orders = section('Divine Order', 'Choose the sacred role you’re dedicated to.');
    orders.append(
      optionList(
        cls.divineOrders.map((order) =>
          optionCard({
            key: `order-${order.id}`,
            title: order.name,
            lines: [order.summary],
            selected: draft.classChoices.divineOrder === order.id,
            onSelect: () => ctx.set(creation.chooseDivineOrder(ctx.draft, order.id)),
          }),
        ),
      ),
    );
    nodes.push(orders);
  }
  if (cls.levels[0].weaponMasteries) nodes.push(note('You choose the weapons for Weapon Mastery with your equipment.'));
  if (cls.spellcasting) {
    nodes.push(note(cls.spellcasting.spellbook ? 'You choose your cantrips and spellbook after your skills.' : 'You choose your cantrips and prepared spells after your skills.'));
  }
  return nodes;
}

// "Simple and Martial", or "Simple, and Martial with Finesse or Light" (the Rogue).
function weaponText(cls) {
  const kinds = andList(cls.weaponProficiencies.map(capitalise));
  return cls.martialWeaponsWith ? `${kinds}, and Martial with ${orList(cls.martialWeaponsWith.map(capitalise))}` : kinds;
}

function armourText(training) {
  const kinds = training.filter((t) => t !== 'shield').map(capitalise);
  if (kinds.length === 0) return 'none';
  return `${andList(kinds)}${training.includes('shield') ? ', and Shields' : ''}`;
}

// ---- Step 2: Background ----

export function backgroundStep(ctx) {
  const { draft } = ctx;
  const nodes = [heading('Choose your background'), intro('What you did before adventuring. It raises three of your abilities, and gives you a feat, two skills, a tool and some gear.')];
  nodes.push(
    optionList(
      backgrounds.map((bg) =>
        optionCard({
          key: `background-${bg.id}`,
          title: bg.name,
          lines: [
            `Abilities: ${andList(bg.abilities.map(abilityName))}`,
            `Feat: ${featName(findFeat(bg.feat.id), bg.feat.spellList)}`,
            `Skills: ${andList(bg.skills.map(skillName))} · Tool: ${creation.findItem(bg.tool).name}`,
          ],
          selected: draft.backgroundId === bg.id,
          onSelect: () => ctx.set(creation.chooseBackground(ctx.draft, bg.id)),
        }),
      ),
    ),
  );

  const bg = findBackground(draft.backgroundId);
  if (!bg) return nodes;
  const feat = findFeat(bg.feat.id);
  const box = section(`Feat: ${featName(feat, bg.feat.spellList)}`);
  box.append(el('p', 'section-text', feat.text));
  if (feat.spellLists) box.append(note('You choose this feat’s spells after your skills.'));
  nodes.push(box);
  return nodes;
}

// ---- Step 3: Species ----

export function speciesStep(ctx) {
  const { draft } = ctx;
  const nodes = [heading('Choose your species'), intro('Your people: your size, your senses, and gifts in your blood.')];
  nodes.push(
    optionList(
      species.map((sp) => {
        const facts = [orList(sp.sizes.map(capitalise)), `Speed ${sp.speed} ft`];
        if (sp.darkvision) facts.push(`Darkvision ${sp.darkvision} ft`);
        return optionCard({
          key: `species-${sp.id}`,
          title: sp.name,
          lines: [facts.join(' · '), sp.traits.filter((t) => !t.level).map((t) => t.name).join(', ')],
          selected: draft.speciesId === sp.id,
          onSelect: () => ctx.set(creation.chooseSpecies(ctx.draft, sp.id)),
        });
      }),
    ),
  );

  const sp = findSpecies(draft.speciesId);
  if (!sp) return nodes;
  const traits = section(`${sp.name} traits`, 'Tap one to read it.');
  for (const trait of sp.traits) traits.append(expandable(trait.level ? `${trait.name} (level ${trait.level})` : trait.name, trait.text));
  nodes.push(traits);

  if (sp.choice) nodes.push(speciesChoiceSection(ctx, sp));
  if (sp.sizes.length > 1) {
    const box = section('Size', sp.sizes.length > 1 ? `A ${sp.name} can be Medium (about 4 to 7 feet tall) or Small (about 2 to 4 feet tall).` : '');
    box.append(
      chipRow(
        sp.sizes.map((size) =>
          chip({ key: `size-${size}`, label: capitalise(size), selected: draft.size === size, onToggle: () => ctx.set(creation.chooseSize(ctx.draft, size)) }),
        ),
        'Size',
      ),
    );
    nodes.push(box);
  }
  if (sp.spellcastingAbilityChoice) {
    const box = section('Spellcasting ability', `Used for the spells your ${sp.name} heritage gives you.`);
    box.append(
      chipRow(
        ['intelligence', 'wisdom', 'charisma'].map((id) =>
          chip({
            key: `casting-${id}`,
            label: abilityName(id),
            selected: draft.spellcastingAbility === id,
            onToggle: () => ctx.set(creation.chooseSpellcastingAbility(ctx.draft, id)),
          }),
        ),
        'Spellcasting ability',
      ),
    );
    nodes.push(box);
  }
  if (sp.originFeat) {
    const box = section('Versatile: an Origin feat', 'Choose one. Skilled is recommended.');
    box.append(
      optionList(
        feats
          .filter((f) => f.category === 'origin')
          .map((feat) =>
            optionCard({
              key: `origin-${feat.id}`,
              title: feat.name,
              tag: feat.id === 'skilled' ? 'Recommended' : '',
              lines: [feat.text],
              selected: draft.originFeat === feat.id,
              onSelect: () => ctx.set(creation.chooseOriginFeat(ctx.draft, feat.id)),
            }),
          ),
      ),
    );
    nodes.push(box);
  }
  return nodes;
}

// Ancestry, lineage or legacy.
function speciesChoiceSection(ctx, sp) {
  const { draft } = ctx;
  const box = section(sp.choice.name, 'Choose one.');
  const select = (id) => ctx.set(creation.chooseSpeciesOption(ctx.draft, id));
  if (sp.choice.options.every((o) => o.damageType && !o.text)) {
    // Dragonborn: ten colours, each with a damage type.
    box.append(
      chipRow(
        sp.choice.options.map((o) =>
          chip({ key: `option-${o.id}`, label: `${o.name} (${capitalise(o.damageType)})`, selected: draft.speciesChoice === o.id, onToggle: () => select(o.id) }),
        ),
        sp.choice.name,
      ),
    );
    return box;
  }
  box.append(
    optionList(
      sp.choice.options.map((o) =>
        optionCard({ key: `option-${o.id}`, title: o.name, lines: o.text ? [o.text] : lineageFacts(o), selected: draft.speciesChoice === o.id, onSelect: () => select(o.id) }),
      ),
    ),
  );
  return box;
}

function lineageFacts(option) {
  const facts = [];
  if (option.darkvision) facts.push(`Darkvision ${option.darkvision} ft`);
  if (option.speed) facts.push(`Speed ${option.speed} ft`);
  if (option.resistance) facts.push(`Resistance to ${capitalise(option.resistance)} damage`);
  const spells = [];
  if (option.cantrip) spells.push(`${spellName(option.cantrip)} cantrip`);
  if (option.cantrips) spells.push(`${andList(option.cantrips.map(spellName))} cantrips`);
  if (option.alwaysPrepared) spells.push(`${spellName(option.alwaysPrepared)} always prepared`);
  if (option.level3Spell) spells.push(`${spellName(option.level3Spell)} at level 3`);
  if (option.level5Spell) spells.push(`${spellName(option.level5Spell)} at level 5`);
  return [facts.join(' · '), spells.join(', ')].filter(Boolean);
}

// ---- Step 4: Ability scores ----

const METHODS = [
  { id: 'standard-array', label: 'Standard Array', hint: `Give out ${standardArray.join(', ')}: one score to each ability.` },
  { id: 'point-buy', label: 'Point Buy', hint: `Spend ${pointBuy.budget} points. Every score starts at 8 and can go up to 15; higher scores cost more.` },
  {
    id: 'random',
    label: 'Roll',
    hint: 'Roll four d6 and drop the lowest, six times. Rolled scores are kept: once you roll, you can’t roll again or switch to another way.',
  },
];

// The ability tab the player is looking at. It can differ from the draft's method while
// they read about rolling before deciding to roll.
export function abilityView(ctx) {
  return ctx.state.rolls ? 'random' : ctx.state.abilityView || ctx.draft.abilityScoreMethod;
}

export function abilitiesStep(ctx) {
  const { draft, state } = ctx;
  const cls = findClass(draft.classId);
  const bg = findBackground(draft.backgroundId);
  const view = abilityView(ctx);
  const nodes = [heading('Set your ability scores'), intro(`A ${cls.name} is best at ${orList(cls.primaryAbilities.map(abilityName))}.`)];

  const chooseView = (id) => {
    state.abilityView = id;
    if (id === 'random') ctx.redraw();
    else ctx.set(creation.setAbilityMethod(ctx.draft, id));
  };
  nodes.push(
    chipRow(
      METHODS.map((m) =>
        chip({
          key: `method-${m.id}`,
          label: m.label,
          selected: view === m.id,
          disabled: Boolean(state.rolls) && m.id !== 'random',
          onToggle: () => chooseView(m.id),
        }),
      ),
      'How to set your scores',
    ),
  );
  const method = METHODS.find((m) => m.id === view);
  nodes.push(note(state.rolls ? 'You rolled, so these scores are yours to keep. You can still choose which ability gets which.' : method.hint));

  if (view === 'random' && !state.rolls) {
    const roll = el('button', 'slot-button is-primary', 'Roll the dice');
    roll.type = 'button';
    roll.dataset.key = 'roll-scores';
    roll.addEventListener('click', () => {
      state.rolls = creation.rollAbilityScores(ctx.rng);
      ctx.set(creation.setAbilityMethod(ctx.draft, 'random', state.rolls.map((r) => r.total)));
    });
    nodes.push(roll);
    return nodes;
  }
  if (state.rolls) nodes.push(diceList(state.rolls));

  if (view === 'point-buy') {
    const left = pointBuy.budget - creation.pointBuySpent(draft.baseAbilityScores);
    nodes.push(el('p', 'points-left', `Points left: ${left} of ${pointBuy.budget}`));
  } else {
    const arrange = el('button', 'text-button', `Arrange them for a ${cls.name}`);
    arrange.type = 'button';
    arrange.dataset.key = 'arrange';
    arrange.addEventListener('click', () => {
      const values = state.rolls ? state.rolls.map((r) => r.total) : null;
      ctx.set(creation.setAbilityMethod(ctx.draft, view, values));
    });
    nodes.push(arrange);
  }

  nodes.push(
    note(`Your ${bg.name} background raises ${orList(bg.abilities.map(abilityName))}: +2 to one and +1 to another, or +1 to all three.`),
  );
  const list = el('div', 'score-list');
  for (const ability of abilities) list.append(scoreRow(ctx, ability, view, bg));
  nodes.push(list);
  return nodes;
}

function scoreRow(ctx, ability, view, bg) {
  const { draft, state } = ctx;
  const base = draft.baseAbilityScores[ability.id];
  const row = el('div', 'score-row');
  const top = el('div', 'score-top');
  const final = abilityScore(draft, ability.id).value;
  top.append(el('span', 'score-name', ability.name), el('span', 'score-final', `${final} (${signedNumber(abilityModifier(final))})`));
  row.append(top);

  const controls = el('div', 'score-controls');
  if (view === 'point-buy') {
    const stepper = el('div', 'stepper');
    const button = (delta, label, text) => {
      const b = el('button', 'stepper-button', text);
      b.type = 'button';
      b.dataset.key = `${ability.id}${delta}`;
      b.setAttribute('aria-label', `${label} ${ability.name}`);
      b.disabled = !creation.canAdjustPointBuy(ctx.draft, ability.id, delta);
      b.addEventListener('click', () => ctx.set(creation.adjustPointBuy(ctx.draft, ability.id, delta)));
      return b;
    };
    stepper.append(button(-1, 'Lower', '−'), el('span', 'stepper-value', String(base)), button(1, 'Raise', '+'));
    controls.append(stepper, el('span', 'score-cost', `cost ${pointBuy.costs[base]}`));
  } else {
    const values = state.rolls ? state.rolls.map((r) => r.total) : standardArray;
    const select = el('select', 'score-select');
    select.dataset.key = `score-${ability.id}`;
    select.setAttribute('aria-label', `${ability.name} score`);
    for (const value of [...new Set(values)].sort((a, b) => b - a)) {
      const option = el('option', '', String(value));
      option.value = String(value);
      select.append(option);
    }
    select.value = String(base);
    select.addEventListener('change', () => ctx.set(creation.assignScore(ctx.draft, ability.id, Number(select.value))));
    controls.append(select);
  }

  if (bg.abilities.includes(ability.id)) {
    const current = draft.backgroundIncreases[ability.id] || 0;
    controls.append(
      chipRow(
        [0, 1, 2].map((amount) =>
          chip({
            key: `increase-${ability.id}-${amount}`,
            label: `+${amount}`,
            selected: current === amount,
            disabled: base + amount > maxAbilityScore,
            onToggle: () => ctx.set(creation.setIncrease(ctx.draft, ability.id, amount)),
          }),
        ),
        `${bg.name} increase to ${ability.name}`,
      ),
    );
  }
  row.append(controls);
  return row;
}

// The six rolls, each die shown, with the dropped one struck through.
function diceList(rolls) {
  const list = el('ol', 'dice-list');
  list.setAttribute('aria-label', 'Your rolls');
  for (const roll of rolls) {
    const item = el('li', 'dice-roll');
    item.append(el('span', 'dice-total', String(roll.total)));
    roll.dice.forEach((face, i) => {
      const die = el('span', roll.dropped.includes(i) ? 'die is-dropped' : 'die', String(face));
      if (roll.dropped.includes(i)) die.setAttribute('aria-label', `${face}, dropped`);
      item.append(die);
    });
    list.append(item);
  }
  return list;
}

// ---- Step 5: Skills ----

export function skillsStep(ctx) {
  const { draft } = ctx;
  const cls = findClass(draft.classId);
  const sp = findSpecies(draft.speciesId);
  const bg = findBackground(draft.backgroundId);
  const nodes = [heading('Choose your skills'), intro('You add your Proficiency Bonus to checks with skills you’re proficient in.')];

  const given = section(`From your ${bg.name} background`);
  given.append(el('p', 'section-text', andList(bg.skills.map(skillName))));
  nodes.push(given);

  const titles = { class: `${cls.name} skills`, species: `${sp.name} trait`, feat: 'Skilled feat' };
  const takenText = { background: 'from background', class: `${cls.name} skill`, species: `${sp.name} trait`, feat: 'Skilled feat' };
  for (const source of ['class', 'species', 'feat']) {
    const picks = creation.skillPicks(ctx.draft, source);
    if (!picks) continue;
    const box = section(titles[source], `Choose ${picks.count}: ${picks.chosen.length} chosen.`);
    const full = picks.chosen.length >= picks.count;
    box.append(
      chipRow(
        picks.from.map((id) => {
          const chosen = picks.chosen.includes(id);
          const takenBy = creation.skillTakenBy(ctx.draft, id, source);
          const skill = findSkill(id);
          const label = takenBy ? `${skill.name} · ${takenText[takenBy]}` : `${skill.name} (${findAbility(skill.ability).abbreviation})`;
          return chip({
            key: `skill-${source}-${id}`,
            label,
            selected: chosen,
            disabled: !chosen && (full || Boolean(takenBy)),
            onToggle: () => ctx.set(creation.toggleSkill(ctx.draft, source, id)),
          });
        }),
        titles[source],
      ),
    );
    nodes.push(box);
  }

  // A Rogue's Expertise: two of the skills chosen above.
  const expertise = creation.expertisePicks(ctx.draft);
  if (expertise) {
    const box = section('Expertise', `Choose ${expertise.count} of your skills: ${expertise.chosen.length} chosen. You add twice your Proficiency Bonus to them. Sleight of Hand and Stealth are recommended.`);
    const full = expertise.chosen.length >= expertise.count;
    box.append(
      chipRow(
        expertise.from.map((id) => {
          const chosen = expertise.chosen.includes(id);
          return chip({
            key: `expertise-${id}`,
            label: skillName(id),
            selected: chosen,
            disabled: !chosen && full,
            onToggle: () => ctx.set(creation.toggleExpertise(ctx.draft, id)),
          });
        }),
        'Expertise',
      ),
    );
    if (!expertise.from.length) box.append(note('Choose your skills above first.'));
    nodes.push(box);
  }

  const known = skills.filter((s) => skillProficiency(draft, s.id).level !== 'none');
  const summary = section('Your skills so far');
  summary.append(el('p', 'section-text', known.map((s) => `${s.name} ${signedNumber(skillBonus(draft, s.id).value)}`).join(' · ')));
  nodes.push(summary);
  return nodes;
}

// ---- Spells (Wizards, and heroes with Magic Initiate) ----

const TAKEN_TEXT = {
  species: 'from your species',
  'class-cantrips': 'already a class cantrip',
  'class-spellbook': 'already in your spellbook',
  'class-prepared': 'already prepared',
  'initiate-background': 'already from Magic Initiate',
  'initiate-species': 'already from Magic Initiate',
};

// Why a spell can't be picked here, in words, or null (see creation.spellTakenBy).
function takenText(draft, spellId, where) {
  const holder = creation.spellTakenBy(draft, spellId, where);
  return holder ? TAKEN_TEXT[holder] : null;
}

export function spellsStep(ctx) {
  const { draft } = ctx;
  const cls = findClass(draft.classId);
  const nodes = [heading('Choose your spells'), intro('Tap a spell to choose it, or “What it does” to read it.')];

  const fromSpecies = speciesSpells(draft);
  if (fromSpecies && fromSpecies.cantrips.length + fromSpecies.always.length > 0) {
    const box = section(`From your species (${fromSpecies.label})`, 'You know these already, so they’re not offered below.');
    const names = [...fromSpecies.cantrips.map((id) => `${findSpell(id).name} (cantrip)`), ...fromSpecies.always.map(({ id }) => findSpell(id).name)];
    box.append(el('p', 'section-text', andList(names)));
    nodes.push(box);
  }

  if (creation.classSpellPicks(draft, 'cantrips')) {
    // A Wizard prepares from their spellbook; a Cleric has none, and prepares straight from
    // the Cleric list.
    const book = Boolean(creation.classSpellPicks(draft, 'spellbook'));
    const hints = {
      cantrips: (p) => `Choose ${p.count}: ${p.chosen.length} chosen. You can cast cantrips as often as you like.`,
      spellbook: (p) => `Choose ${p.count} level 1 spells to copy into your spellbook: ${p.chosen.length} chosen.`,
      prepared: (p) =>
        book
          ? `Choose ${p.count} spellbook spells to have ready: ${p.chosen.length} chosen. You can change them after a Long Rest, and cast rituals from your spellbook without preparing them.`
          : `Choose ${p.count} level 1 ${cls.name} spells to have ready: ${p.chosen.length} chosen. You can change them after every Long Rest, from the whole ${cls.name} list.`,
    };
    const titles = { cantrips: `${cls.name} cantrips`, spellbook: 'Your spellbook', prepared: 'Prepared spells' };
    for (const which of ['cantrips', 'spellbook', 'prepared']) {
      const picks = creation.classSpellPicks(draft, which);
      if (!picks) continue;
      const box = section(titles[which], hints[which](picks));
      const where = which !== 'prepared' ? `class-${which}` : book ? null : 'class-prepared';
      if (which === 'prepared' && picks.from.length === 0) {
        box.append(note('Choose your spellbook spells first.'));
      } else {
        box.append(
          spellList({
            keyPrefix: `class-${which}`,
            ids: picks.from,
            chosen: picks.chosen,
            full: picks.chosen.length >= picks.count,
            taken: (id) => (where ? takenText(draft, id, where) : null),
            onToggle: (id) => ctx.set(creation.toggleClassSpell(ctx.draft, which, id)),
            details: which !== 'prepared' || !book,
          }),
        );
      }
      nodes.push(box);
    }
  }

  for (const entry of draft.magicInitiate) nodes.push(initiateSection(ctx, entry));
  return nodes;
}

// One Magic Initiate feat: its list (Versatile only), ability, two cantrips and a level 1 spell.
function initiateSection(ctx, entry) {
  const { draft } = ctx;
  const from = entry.source === 'background' ? `your ${findBackground(draft.backgroundId).name} background` : 'your Versatile trait';
  const listName = entry.list ? ` (${capitalise(entry.list)})` : '';
  const box = section(`Magic Initiate${listName}`, `From ${from}.`);

  if (entry.source === 'species') {
    const allowed = magicInitiateLists(draft, entry.source);
    const all = findFeat('magic-initiate').spellLists;
    box.append(el('p', 'section-text', 'Spell list'));
    box.append(
      chipRow(
        all.map((list) =>
          chip({
            key: `initiate-list-${list}`,
            label: allowed.includes(list) ? capitalise(list) : `${capitalise(list)} · already taken`,
            selected: entry.list === list,
            disabled: !allowed.includes(list),
            onToggle: () => ctx.set(creation.setInitiateList(ctx.draft, entry.source, list)),
          }),
        ),
        'Magic Initiate spell list',
      ),
    );
  }
  if (!entry.list) return box;

  box.append(el('p', 'section-text', 'Spellcasting ability'));
  box.append(
    chipRow(
      ['intelligence', 'wisdom', 'charisma'].map((id) =>
        chip({
          key: `initiate-${entry.source}-ability-${id}`,
          label: abilityName(id),
          selected: entry.ability === id,
          onToggle: () => ctx.set(creation.setInitiateAbility(ctx.draft, entry.source, id)),
        }),
      ),
      'Magic Initiate spellcasting ability',
    ),
  );

  const where = `initiate-${entry.source}`;
  const cantripIds = spellIdsOn(entry.list, 0);
  box.append(el('p', 'section-text', `Two cantrips: ${entry.cantrips.length} chosen.`));
  box.append(
    spellList({
      keyPrefix: `${where}-cantrip`,
      ids: cantripIds,
      chosen: entry.cantrips,
      full: entry.cantrips.length >= 2,
      taken: (id) => takenText(draft, id, where),
      onToggle: (id) => ctx.set(creation.toggleInitiateCantrip(ctx.draft, entry.source, id)),
    }),
  );
  box.append(el('p', 'section-text', 'One level 1 spell. It’s always prepared, and you can cast it once per Long Rest without a spell slot.'));
  box.append(
    spellList({
      keyPrefix: `${where}-spell`,
      ids: spellIdsOn(entry.list, 1),
      chosen: entry.spell ? [entry.spell] : [],
      full: false, // choosing another swaps it
      taken: (id) => takenText(draft, id, where),
      onToggle: (id) => ctx.set(creation.chooseInitiateSpell(ctx.draft, entry.source, id)),
    }),
  );
  return box;
}

function spellIdsOn(list, level) {
  return spellsOnList(list, level).map((s) => s.id);
}

// ---- Look ----

export function lookStep(ctx) {
  const { draft } = ctx;
  const look = draft.look;
  const set = (changes) => ctx.set(creation.chooseLook(ctx.draft, changes));
  const nodes = [heading('Your look'), intro('How you appear in town, in dungeons and in battle.')];

  // Shown in the starting armour, which is chosen on the Equipment step.
  const dressed = creation.previewHero(creation.prepareStep(draft, 'equipment'));
  const stage = el('div', 'look-stage');
  stage.append(portrait(heroSprite(dressed), { scale: 6, label: 'Your hero as they look now' }));
  const features = speciesFeatureNames(draft);
  const sp = findSpecies(draft.speciesId);
  if (features.length) stage.append(note(`Every ${sp.name} has ${andList(features)}.`));
  if (dressed.armorId) stage.append(note(`Shown in ${findArmor(dressed.armorId).name}, from your starting kit. Armour changes your colours.`));
  const roll = el('button', 'text-button', 'Surprise me');
  roll.type = 'button';
  roll.dataset.key = 'roll-look';
  roll.addEventListener('click', () => ctx.set(creation.chooseLook(ctx.draft, rollLook(ctx.rng, ctx.draft))));
  stage.append(roll);
  nodes.push(stage);

  const swatches = (title, list, field, shade = 1) => {
    const box = section(title);
    box.append(
      chipRow(
        list.map((option) =>
          swatchChip({
            key: `look-${field}-${option.id}`,
            label: option.name,
            color: option.ramp[shade],
            selected: look[field] === option.id,
            onToggle: () => set({ [field]: option.id }),
          }),
        ),
        title,
      ),
    );
    return box;
  };
  const choices = (title, list, field) => {
    const box = section(title);
    box.append(
      chipRow(
        list.map((option) =>
          chip({ key: `look-${field}-${option.id}`, label: option.name, selected: look[field] === option.id, onToggle: () => set({ [field]: option.id }) }),
        ),
        title,
      ),
    );
    return box;
  };

  nodes.push(swatches('Skin', skinTones, 'skin'));
  nodes.push(choices('Hairstyle', hairStyles, 'hairStyle'));
  nodes.push(swatches('Hair colour', hairColors, 'hairColor', 0));
  nodes.push(
    choices(
      'Beard',
      [
        { id: false, name: 'None' },
        { id: true, name: 'Beard' },
      ],
      'beard',
    ),
  );
  nodes.push(swatches('Outfit', clothColors, 'outfit'));
  nodes.push(swatches('Accent (tabard or sash)', clothColors, 'accent'));
  nodes.push(choices('Headgear', headgearFor(draft.classId), 'headgear'));
  return nodes;
}

// ---- Step 6: Name, Drive and Bond ----

export function detailsStep(ctx) {
  const { draft } = ctx;
  const nodes = [heading('Name, Drive and Bond')];

  const nameBox = section('Name');
  nameBox.append(
    nameRow(ctx, {
      key: 'hero-name',
      label: 'Your name',
      value: draft.name,
      onInput: (value) => ctx.set(creation.setName(ctx.draft, value), { redraw: false }),
      onRoll: () => ctx.set(creation.setName(ctx.draft, creation.rollName(ctx.rng, draft.speciesId))),
    }),
  );
  nodes.push(nameBox);

  const driveBox = section('Drive', 'What pushes you? Choices that fit your Drive earn Heroic Inspiration.');
  driveBox.append(
    optionList(
      drives.map((drive) =>
        optionCard({
          key: `drive-${drive.id}`,
          title: drive.name,
          lines: [drive.summary, `Inspiration: ${drive.inspiration}`],
          selected: draft.drive === drive.id,
          onSelect: () => ctx.set(creation.chooseDrive(ctx.draft, drive.id)),
        }),
      ),
    ),
  );
  nodes.push(driveBox);

  const bondBox = section('Bond', 'Who did you leave behind? They’ll come back into your story at least once in every act.');
  bondBox.append(
    optionList(
      bonds.map((bond) =>
        optionCard({
          key: `bond-${bond.id}`,
          title: bond.name,
          lines: [bond.summary],
          selected: draft.bond.type === bond.id,
          onSelect: () => ctx.set(creation.chooseBond(ctx.draft, bond.id)),
        }),
      ),
    ),
  );
  const bond = creation.findBond(draft.bond.type);
  if (bond) {
    bondBox.append(
      nameRow(ctx, {
        key: 'bond-name',
        label: bond.nameLabel,
        value: draft.bond.name,
        onInput: (value) => ctx.set(creation.setBondName(ctx.draft, value), { redraw: false }),
        onRoll: () => ctx.set(creation.setBondName(ctx.draft, creation.rollBondName(ctx.rng, ctx.draft))),
      }),
    );
  }
  nodes.push(bondBox);
  return nodes;
}

// A name box with a "Roll" button beside it.
function nameRow(ctx, { key, label, value, onInput, onRoll }) {
  const row = el('div', 'name-row');
  const { wrap } = textField({ key, label, value, maxLength: MAX_NAME_LENGTH, onInput });
  const roll = el('button', 'slot-button', 'Roll');
  roll.type = 'button';
  roll.dataset.key = `${key}-roll`;
  roll.setAttribute('aria-label', `Roll ${label.toLowerCase()}`);
  roll.addEventListener('click', onRoll);
  row.append(wrap, roll);
  return row;
}

// ---- Step 7: Equipment ----

export function equipmentStep(ctx) {
  const { draft } = ctx;
  const cls = findClass(draft.classId);
  const bg = findBackground(draft.backgroundId);
  const nodes = [heading('Starting equipment'), intro('Take the kits, or take gold and shop in Bramblegate.')];
  nodes.push(kitSection(ctx, 'class', `${cls.name} equipment`), kitSection(ctx, 'background', `${bg.name} equipment`));

  const preview = creation.previewHero(ctx.draft);
  const kit = creation.startingKit(ctx.draft);
  const box = section('What you’ll carry');
  box.append(el('p', 'section-text', kit.items.length ? kit.items.map(itemText).join(', ') : 'Nothing but the clothes you stand in.'));
  box.append(el('p', 'section-text', `Gold: ${kit.gold} GP`));
  const worn = findArmor(preview.armorId);
  const ac = armorClass(preview).value;
  box.append(el('p', 'section-text', worn ? `You’ll wear the ${worn.name}: AC ${ac}.` : `No armour: AC ${ac}.`));
  const slowed = speed(preview).parts.find((p) => p.value < 0);
  if (slowed) box.append(note(`${slowed.label}: your Strength is lower, so your Speed drops by 10 feet while you wear it.`));
  nodes.push(box);
  const masteries = masterySection(ctx, kit);
  if (masteries) nodes.push(masteries);
  return nodes;
}

// Weapon Mastery (the Fighter and the Rogue): which kinds of weapon, and what each mastery
// property does. Weapons in the starting kits are marked.
function masterySection(ctx, kit) {
  const picks = creation.masteryPicks(ctx.draft);
  if (!picks) return null;
  const box = section('Weapon Mastery', `Choose ${picks.count}: ${picks.chosen.length} chosen. In a fight, you use the mastery property of the weapons you choose.`);
  const carried = kit.items.map(({ item }) => item.id);
  const full = picks.chosen.length >= picks.count;
  box.append(
    chipRow(
      picks.from.map((id) => {
        const weapon = findWeapon(id);
        const chosen = picks.chosen.includes(id);
        return chip({
          key: `mastery-${id}`,
          label: `${weapon.name} · ${findMastery(weapon.mastery).name}${carried.includes(id) ? ' (in your kit)' : ''}`,
          selected: chosen,
          disabled: !chosen && full,
          onToggle: () => ctx.set(creation.toggleMastery(ctx.draft, id)),
        });
      }),
      'Weapon Mastery',
    ),
  );
  const properties = [...new Set(picks.from.map((id) => findWeapon(id).mastery))].map(findMastery);
  for (const mastery of properties) box.append(expandable(`${mastery.name}: ${mastery.summary}`, mastery.text));
  return box;
}

function kitSection(ctx, which, title) {
  const { draft } = ctx;
  const box = section(title, 'Choose one.');
  box.append(
    optionList(
      creation.kitOptions(ctx.draft, which).map((kit) => {
        const items = kit.items.map(({ id, quantity }) => itemText({ item: creation.findItem(id), quantity }));
        return optionCard({
          key: `kit-${which}-${kit.option}`,
          title: `Option ${kit.option}`,
          lines: items.length ? [items.join(', '), `and ${kit.gold} GP`] : [`${kit.gold} GP to spend`],
          selected: draft.startingEquipment[which] === kit.option,
          onSelect: () => ctx.set(creation.chooseKit(ctx.draft, which, kit.option)),
        });
      }),
    ),
  );
  return box;
}

// ---- Step 8: Review ----

// quickStart: the Quick Start hero being reviewed, or null when the player built their own.
export function reviewStep(ctx, quickStart) {
  const { draft } = ctx;
  const hero = creation.previewHero(draft);
  const sheet = heroSheet(hero);
  const nodes = [heading(quickStart ? 'Quick Start' : 'Your hero')];
  if (quickStart) {
    nodes.push(intro(quickStart.summary));
    const { wrap } = textField({
      key: 'quick-name',
      label: 'Name (you can change it)',
      value: draft.name,
      maxLength: MAX_NAME_LENGTH,
      onInput: (value) => {
        ctx.set(creation.setName(ctx.draft, value), { redraw: false });
        sheet.querySelector('.sheet-name').textContent = value;
      },
    });
    const restyle = el('button', 'text-button', 'Change look');
    restyle.type = 'button';
    restyle.dataset.key = 'restyle';
    restyle.addEventListener('click', () => ctx.goTo('look'));
    nodes.push(wrap, restyle);
  }
  nodes.push(sheet);

  const drive = creation.findDrive(draft.drive);
  const bond = creation.findBond(draft.bond.type);
  const story = section('Drive and Bond');
  story.append(el('p', 'section-text', `Drive: ${drive.name}. ${drive.summary}`), el('p', 'section-text', `Bond: ${bond.name}, ${hero.bond.name}. ${bond.summary}`));
  nodes.push(story);

  const kit = creation.startingKit(ctx.draft);
  const gear = section('Equipment');
  gear.append(el('p', 'section-text', kit.items.length ? kit.items.map(itemText).join(', ') : 'No gear.'), el('p', 'section-text', `Gold: ${kit.gold} GP`));
  nodes.push(gear);
  return nodes;
}
