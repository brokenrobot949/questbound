// The level-up screen. It takes the place of the choices in the Adventure tab as soon as the
// hero has the XP for their next level (never during a fight). The DM marks the moment, then
// the player works down the page: Hit Points, what's new, and the choices the level brings.
// Every choice is saved as it's made, so a reload carries on exactly where the player was.

import * as levelUp from '../character/level-up.js';
import { findSkill } from '../character/sheet.js';
import { findSpell } from '../character/spells.js';
import { levelUpVoice } from '../../../data/campaign/dm-voice.js';
import { actionButton } from './backup-panels.js';
import { spellList } from './spell-picker.js';
import { el } from './dom.js';
import { chip, chipRow, expandable, keepFocus, optionCard, optionList, section } from './widgets.js';

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
    // The subclass feature itself is the subclass choice above, so it isn't listed again.
    const features = plan.features.filter((f) => !f.id.endsWith('-subclass'));
    if (features.length || plan.speciesSpells.length) nodes.push(featuresSection(features, plan.speciesSpells));
    if (plan.scholar) nodes.push(scholarSection(plan, draft));
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

  function featuresSection(features, speciesSpells) {
    const box = section('New features', 'Tap one to read it.');
    for (const feature of features) box.append(expandable(`${feature.name} (${feature.source})`, feature.text));
    for (const { spell, note, source } of speciesSpells) {
      box.append(expandable(`${spell.name} (${source})`, `You always have ${spell.name} prepared, and can cast it ${note}.`));
    }
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

    const pickBox = (heading, hint, which, pick, details = true) => {
      const pickSection = section(heading, `${hint} ${draft[which].length} of ${pick.count} chosen.`);
      pickSection.append(
        spellList({
          keyPrefix: `level-up-${which}`,
          ids: pick.from, // picked spells stay in the list, in place
          chosen: draft[which],
          full: draft[which].length >= pick.count,
          onToggle: (id) => change(() => levelUp.toggleLevelUpSpell(game, which, id)),
          details,
        }),
      );
      nodes.push(pickSection);
    };

    if (plan.savant) {
      pickBox('Evocation Savant', 'Two Wizard spells from the Evocation school, of level 1 or 2, copied into your spellbook for free.', 'savant', plan.savant);
    }
    const top = plan.slots.after.length;
    const levels = top === 1 ? '1' : `1 to ${top}`;
    if (plan.spellbook) pickBox('New spellbook spells', `Copy ${plan.spellbook.count} Wizard spells of level ${levels} into your spellbook.`, 'spellbook', plan.spellbook);
    if (plan.prepared) {
      const already = game.character.spells.prepared.map((id) => findSpell(id).name).join(', ');
      const what = plan.spellbook ? `${plan.prepared.count} more` : `${plan.prepared.count} more ${plan.className} spells of level ${levels}`;
      pickBox('Prepared spells', `You can prepare ${what} (you have ${already} ready).`, 'prepared', plan.prepared, !plan.spellbook);
    }
    return nodes;
  }

  render();
}
