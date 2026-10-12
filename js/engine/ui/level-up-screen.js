// The level-up screen. It takes the place of the choices in the Adventure tab as soon as the
// hero has the XP for their next level (never during a fight). The DM marks the moment, then
// the player works down the page: Hit Points, what's new, and the choices the level brings.
// Every choice is saved as it's made, so a reload carries on exactly where the player was.

import * as levelUp from '../character/level-up.js';
import { spellTakenBy } from '../character/creation.js';
import { abilityModifier, findAbility, findFeat, findMastery, findSkill, findWeapon } from '../character/sheet.js';
import { findSpell } from '../character/spells.js';
import { levelUpVoice } from '../../../data/campaign/dm-voice.js';
import { actionButton } from './backup-panels.js';
import { spellList } from './spell-picker.js';
import { el } from './dom.js';
import { chip, chipRow, expandable, keepFocus, optionCard, optionList, section } from './widgets.js';

// Why a spell can't be picked, in words (see creation.spellTakenBy).
const TAKEN_TEXT = {
  species: 'from your species',
  'class-cantrips': 'already a class cantrip',
  'class-spellbook': 'already in your spellbook',
  'class-prepared': 'already prepared',
  'class-domain': 'always prepared (your domain)',
};
const takenText = (holder) => (holder ? TAKEN_TEXT[holder] || 'already from Magic Initiate' : null);

const signed = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// container: where to show it. onSave(game) after every choice. onDone(result): the hero has
// gained the level; result is { level, hpGained } (see finishLevelUp).
export function showLevelUp({ container, game, onSave, onDone }) {
  levelUp.beginLevelUp(game);
  onSave(game);

  const panel = el('section', 'level-up');
  panel.setAttribute('aria-label', 'Level up');
  container.replaceChildren(panel);

  // Applies one choice through the rules engine, saves, and redraws.
  const change = (apply) => {
    try {
      apply();
    } catch (error) {
      problem = error.message;
      keepFocus(panel, render);
      return;
    }
    problem = '';
    onSave(game);
    keepFocus(panel, render);
  };
  let problem = '';

  function render() {
    const plan = levelUp.levelUpPlan(game);
    const draft = game.levelUp;
    const cls = game.character.classId;
    const voice = (levelUpVoice[cls] || levelUpVoice.default).replace('{level}', plan.level);
    const nodes = [el('h2', 'level-up-title', `Level ${plan.level}!`), el('p', 'narration-text', voice)];

    nodes.push(hitPointsSection(plan, draft));
    if (plan.subclasses) nodes.push(subclassSection(plan, draft));
    // The subclass and Ability Score Improvement features are the choices below, so they
    // aren't listed again.
    const features = plan.features.filter((f) => !f.id.endsWith('-subclass') && f.id !== 'ability-score-improvement');
    if (features.length || plan.more.length || plan.speciesSpells.length) nodes.push(featuresSection(features, plan.more, plan.speciesSpells));
    if (plan.feat) nodes.push(...featSections(plan, draft));
    if (plan.scholar) nodes.push(scholarSection(plan, draft));
    if (plan.masteries) nodes.push(masterySection(plan, draft));
    if (plan.slots) nodes.push(...spellsSections(plan, draft));

    const needs = levelUp.levelUpProblems(game);
    const footer = el('div', 'level-up-footer');
    if (problem) footer.append(el('p', 'level-up-problem', problem));
    footer.append(el('p', 'level-up-needs', needs.length ? needs[0] : 'All set.'));
    const finish = actionButton(`Become level ${plan.level}`, () => {
      try {
        const result = levelUp.finishLevelUp(game);
        onDone(result);
      } catch (error) {
        problem = error.message;
        keepFocus(panel, render);
      }
    }, 'is-primary');
    finish.dataset.key = 'finish';
    finish.disabled = needs.length > 0;
    footer.append(finish);
    nodes.push(footer);
    panel.replaceChildren(...nodes);
  }

  // Roll the Hit Die or take the fixed value, the player's choice each level.
  function hitPointsSection(plan, draft) {
    const hp = plan.hitPoints;
    const con = hp.con < 0 ? `−${Math.abs(hp.con)}` : `+${hp.con}`;
    const box = section('Hit Points', `Roll your Hit Die (1d${hp.die}) or take the fixed ${hp.fixed}. Either way you add your Constitution modifier (${con}).`);
    if (hp.conGain > 0) box.append(el('p', 'section-text', `Your higher Constitution also adds ${hp.conGain} Hit Points for your earlier levels.`));
    if (hp.rolled !== null) {
      box.append(el('p', 'section-text', `You rolled ${hp.rolled} on the d${hp.die}. Your Hit Point maximum rises by ${hp.gained}.`));
      return box;
    }
    if (draft.hitPoints === 'fixed') {
      box.append(el('p', 'section-text', `You take the fixed ${hp.fixed}. Your Hit Point maximum rises by ${hp.gained}.`));
    }
    const roll = actionButton(`Roll 1d${hp.die}`, () => change(() => levelUp.chooseHitPoints(game, 'roll')));
    roll.dataset.key = 'hp-roll';
    const fixed = actionButton(`Take ${hp.fixed} (+${hp.fixedGain} Hit Points)`, () => change(() => levelUp.chooseHitPoints(game, 'fixed')));
    fixed.dataset.key = 'hp-fixed';
    fixed.setAttribute('aria-pressed', String(draft.hitPoints === 'fixed'));
    const row = el('div', 'slot-actions');
    row.append(roll, fixed);
    box.append(row);
    return box;
  }

  function subclassSection(plan, draft) {
    const box = section(`${plan.className} subclass`, 'Your subclass shapes the rest of your career: you gain its features at the levels it lists.');
    box.append(
      optionList(
        plan.subclasses.map((sub) =>
          optionCard({
            key: `subclass-${sub.id}`,
            title: sub.name,
            lines: [sub.summary, `Level ${plan.level}: ${sub.levels.find((r) => r.level === plan.level).features.map((id) => sub.features[id].name).join(', ')}`],
            selected: draft.subclassId === sub.id,
            onSelect: () => change(() => levelUp.chooseSubclass(game, sub.id)),
          }),
        ),
      ),
    );
    return box;
  }

  function featuresSection(features, more, speciesSpells) {
    const box = section('New features', features.length || speciesSpells.length ? 'Tap one to read it.' : '');
    for (const feature of features) box.append(expandable(`${feature.name} (${feature.source})`, feature.text));
    for (const { name, text } of more) box.append(el('p', 'section-text', `${name}: ${text}`));
    for (const { spell, note, source } of speciesSpells) {
      box.append(expandable(`${spell.name} (${source})`, `You always have ${spell.name} prepared, and can cast it ${note}.`));
    }
    return box;
  }

  // The Ability Score Improvement or a feat, then the chosen one's own choices.
  function featSections(plan, draft) {
    const chosen = draft.feat ? findFeat(draft.feat.id) : null;
    const box = section('Ability Score Improvement or a feat', 'Raise your ability scores, or take a feat instead.');
    const tagFor = (feat) => (feat.id === 'ability-score-improvement' ? 'Recommended' : feat.category === 'fighting-style' ? 'Fighting Style' : 'Origin feat');
    box.append(
      optionList(
        plan.feat.choices.map((feat) =>
          optionCard({
            key: `feat-${feat.id}`,
            title: feat.name,
            tag: tagFor(feat),
            lines: [feat.summary],
            selected: Boolean(chosen && chosen.id === feat.id),
            onSelect: () => change(() => levelUp.chooseFeat(game, feat.id)),
          }),
        ),
      ),
    );
    if (chosen) box.append(expandable(`${chosen.name}: the full rule`, chosen.text));
    const nodes = [box];
    if (plan.feat.increase) nodes.push(increaseSection(plan.feat.increase));
    if (plan.feat.skills) nodes.push(featSkillsSection(plan.feat.skills, draft.feat));
    if (plan.feat.initiate) nodes.push(initiateSection(plan.feat.initiate, draft.feat));
    return nodes;
  }

  // The Ability Score Improvement: a + and − for each score.
  function increaseSection(increase) {
    const box = section('Your ability scores', `Add ${increase.points} points: +2 to one score, or +1 to two. No score can go above 20.`);
    box.append(el('p', 'points-left', `Points left: ${increase.left} of ${increase.points}`));
    const list = el('div', 'score-list');
    for (const row of increase.abilities) {
      const now = row.score + row.raised;
      const line = el('div', 'score-row');
      const top = el('div', 'score-top');
      top.append(el('span', 'score-name', row.name), el('span', 'score-final', `${now} (${signed(abilityModifier(now))})`));
      const stepper = el('div', 'stepper');
      const button = (delta, label, text) => {
        const b = el('button', 'stepper-button', text);
        b.type = 'button';
        b.dataset.key = `increase-${row.id}${delta}`;
        b.setAttribute('aria-label', `${label} ${row.name}`);
        b.disabled = !levelUp.canAdjustIncrease(increase, row, delta);
        b.addEventListener('click', () => change(() => levelUp.adjustFeatIncrease(game, row.id, delta)));
        return b;
      };
      stepper.append(button(-1, 'Lower', '−'), el('span', 'stepper-value', signed(row.raised)), button(1, 'Raise', '+'));
      const controls = el('div', 'score-controls');
      controls.append(stepper);
      if (row.raised) controls.append(el('span', 'score-cost', `was ${row.score}`));
      line.append(top, controls);
      list.append(line);
    }
    box.append(list);
    return box;
  }

  // Skilled: three skills the hero isn't proficient in yet.
  function featSkillsSection(pick, feat) {
    const box = section('Skilled', `Choose ${pick.count} skills you aren’t proficient in yet: ${feat.skills.length} chosen.`);
    const full = feat.skills.length >= pick.count;
    box.append(
      chipRow(
        pick.from.map((id) => {
          const skill = findSkill(id);
          const chosen = feat.skills.includes(id);
          return chip({
            key: `feat-skill-${id}`,
            label: `${skill.name} (${findAbility(skill.ability).abbreviation})`,
            selected: chosen,
            disabled: !chosen && full,
            onToggle: () => change(() => levelUp.toggleFeatSkill(game, id)),
          });
        }),
        'Skilled',
      ),
    );
    return box;
  }

  // Magic Initiate: its spell list, ability, two cantrips and a level 1 spell.
  function initiateSection(pick, feat) {
    const box = section(`Magic Initiate (${capitalise(feat.list)})`, 'A spell list you haven’t taken Magic Initiate for already.');
    box.append(
      chipRow(
        ['cleric', 'druid', 'wizard'].map((list) =>
          chip({
            key: `feat-list-${list}`,
            label: pick.lists.includes(list) ? capitalise(list) : `${capitalise(list)} · already taken`,
            selected: feat.list === list,
            disabled: !pick.lists.includes(list),
            onToggle: () => change(() => levelUp.setFeatList(game, list)),
          }),
        ),
        'Magic Initiate spell list',
      ),
    );
    box.append(el('p', 'section-text', 'Spellcasting ability'));
    box.append(
      chipRow(
        ['intelligence', 'wisdom', 'charisma'].map((id) =>
          chip({
            key: `feat-ability-${id}`,
            label: findAbility(id).name,
            selected: feat.ability === id,
            onToggle: () => change(() => levelUp.setFeatAbility(game, id)),
          }),
        ),
        'Magic Initiate spellcasting ability',
      ),
    );
    const after = levelUp.heroAfter(game);
    const holder = levelUp.initiateHolder(game);
    const taken = (id) => takenText(spellTakenBy(after, id, holder));
    box.append(el('p', 'section-text', `Two cantrips: ${feat.cantrips.length} chosen.`));
    box.append(
      spellList({
        keyPrefix: 'feat-cantrip',
        ids: pick.cantrips,
        chosen: feat.cantrips,
        full: feat.cantrips.length >= 2,
        taken,
        onToggle: (id) => change(() => levelUp.toggleFeatCantrip(game, id)),
      }),
    );
    box.append(el('p', 'section-text', 'One level 1 spell. It’s always prepared, and you can cast it once per Long Rest without a spell slot.'));
    box.append(
      spellList({
        keyPrefix: 'feat-spell',
        ids: pick.spells,
        chosen: feat.spell ? [feat.spell] : [],
        full: false, // choosing another swaps it
        taken,
        onToggle: (id) => change(() => levelUp.chooseFeatSpell(game, id)),
      }),
    );
    return box;
  }

  // A Fighter's new kind of weapon for Weapon Mastery.
  function masterySection(plan, draft) {
    const pick = plan.masteries;
    const box = section('Weapon Mastery', `Choose ${pick.count} more kind of weapon: ${draft.masteries.length} chosen. In a fight, you use its mastery property.`);
    const full = draft.masteries.length >= pick.count;
    box.append(
      chipRow(
        pick.from.map((id) => {
          const weapon = findWeapon(id);
          const chosen = draft.masteries.includes(id);
          return chip({
            key: `mastery-${id}`,
            label: `${weapon.name} · ${findMastery(weapon.mastery).name}`,
            selected: chosen,
            disabled: !chosen && full,
            onToggle: () => change(() => levelUp.toggleLevelUpMastery(game, id)),
          });
        }),
        'Weapon Mastery',
      ),
    );
    const properties = [...new Set(pick.from.map((id) => findWeapon(id).mastery))].map(findMastery);
    for (const mastery of properties) box.append(expandable(`${mastery.name}: ${mastery.summary}`, mastery.text));
    return box;
  }

  function scholarSection(plan, draft) {
    const box = section('Scholar', 'Choose a skill you are proficient in. You gain Expertise in it: twice your Proficiency Bonus.');
    box.append(
      chipRow(
        plan.scholar.from.map((id) =>
          chip({
            key: `scholar-${id}`,
            label: findSkill(id).name,
            selected: draft.scholarSkill === id,
            onToggle: () => change(() => levelUp.chooseScholarSkill(game, id)),
          }),
        ),
        'Scholar skill',
      ),
    );
    return box;
  }

  // Spell slots, then the new spells: Evocation Savant's and the spellbook's for a Wizard, and
  // the newly prepared ones (a Cleric's straight from the Cleric list).
  function spellsSections(plan, draft) {
    const slotText = (slots) => slots.map((n, i) => `${n} level ${i + 1}`).join(' and ');
    const changed = slotText(plan.slots.after) !== slotText(plan.slots.before);
    const slots = section('Spell slots');
    slots.append(el('p', 'section-text', changed ? `Now ${slotText(plan.slots.after)} (was ${slotText(plan.slots.before)}).` : `Still ${slotText(plan.slots.after)}.`));
    const nodes = [slots];

    // A spell the hero would have twice (a cantrip Magic Initiate gives too, say) says why.
    const after = levelUp.heroAfter(game);
    const holders = { cantrips: 'class-cantrips', spellbook: 'class-spellbook', savant: 'class-spellbook' };
    const pickBox = (heading, hint, which, pick, details = true) => {
      const pickSection = section(heading, `${hint} ${draft[which].length} of ${pick.count} chosen.`);
      pickSection.append(
        spellList({
          keyPrefix: `level-up-${which}`,
          ids: pick.from, // picked spells stay in the list, in place
          chosen: draft[which],
          full: draft[which].length >= pick.count,
          taken: (id) => (holders[which] ? takenText(spellTakenBy(after, id, holders[which])) : null),
          onToggle: (id) => change(() => levelUp.toggleLevelUpSpell(game, which, id)),
          details,
        }),
      );
      nodes.push(pickSection);
    };

    if (plan.cantrips) {
      const n = plan.cantrips.count;
      pickBox('New cantrip', `Learn ${n} more ${plan.className} cantrip${n === 1 ? '' : 's'}.`, 'cantrips', plan.cantrips);
    }
    if (plan.savant) {
      pickBox('Evocation Savant', 'Two Wizard spells from the Evocation school, of level 1 or 2, copied into your spellbook for free.', 'savant', plan.savant);
    }
    const top = plan.slots.after.length;
    const levels = top === 1 ? '1' : `1 to ${top}`;
    if (plan.spellbook) pickBox('New spellbook spells', `Copy ${plan.spellbook.count} Wizard spells of level ${levels} into your spellbook.`, 'spellbook', plan.spellbook);
    if (plan.prepared) {
      const already = game.character.spells.prepared.map((id) => findSpell(id).name).join(', ');
      const n = plan.prepared.count;
      const what = plan.spellbook ? `${n} more` : `${n} more ${plan.className} spell${n === 1 ? '' : 's'} of level ${levels}`;
      pickBox('Prepared spells', `You can prepare ${what} (you have ${already} ready).`, 'prepared', plan.prepared, !plan.spellbook);
    }
    return nodes;
  }

  render();
}
