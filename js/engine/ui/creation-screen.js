// The New Hero screen: Quick Start, or build a hero step by step (class, background, species,
// ability scores, skills, name / Drive / Bond, equipment), ending on a review of the sheet.
//
// The dice seed is chosen before creation starts, so rolled ability scores and names use
// the game's own RNG, and the game carries on from the same dice when it begins.

import { quickStartHeroes } from '../../../data/campaign/quick-start.js';
import { createRng } from '../rules/rng.js';
import { creationSteps, emptyDraft, finishCharacter, findBond, findDrive, prepareStep, stepProblems } from '../character/creation.js';
import { describeCharacter, findBackground } from '../character/sheet.js';
import { actionButton } from './backup-panels.js';
import {
  abilitiesStep,
  abilityView,
  backgroundStep,
  classStep,
  detailsStep,
  equipmentStep,
  lookStep,
  reviewStep,
  skillsStep,
  speciesStep,
  spellsStep,
} from './creation-steps.js';
import { heroSprite } from '../character/look.js';
import { el } from './dom.js';
import { spriteCanvas } from './sprite-canvas.js';
import { keepFocus, optionCard, optionList, section } from './widgets.js';

const STEP_NAMES = {
  class: 'Class',
  background: 'Background',
  species: 'Species',
  abilities: 'Ability scores',
  skills: 'Skills',
  spells: 'Spells',
  look: 'Look',
  details: 'Name, Drive and Bond',
  equipment: 'Equipment',
  review: 'Review',
};

const RENDER = {
  class: classStep,
  background: backgroundStep,
  species: speciesStep,
  abilities: abilitiesStep,
  skills: skillsStep,
  spells: spellsStep,
  look: lookStep,
  details: detailsStep,
  equipment: equipmentStep,
};

// slot: the save slot the hero is for. seed: the new game's dice seed.
// onCancel(): back to the save slots. onFinish({ character, rngState }): begin the game.
export function startCreationScreen({ root, slot, seed, onCancel, onFinish }) {
  const body = root.getElementById('creation-body');
  const progress = root.getElementById('creation-progress');
  const needs = root.getElementById('creation-needs');
  const back = root.getElementById('creation-back');
  const next = root.getElementById('creation-next');
  const confirmArea = root.getElementById('creation-confirm');
  const footer = root.getElementById('creation-footer');
  root.getElementById('creation-slot').textContent = `Slot ${slot}`;

  const state = {
    step: 'start',
    mode: 'build', // 'build' or 'quick'
    drafts: { build: emptyDraft(), quick: null },
    quickStart: null, // the Quick Start hero picked
    rolls: null, // rolled ability scores, once rolled (kept for good)
    abilityView: null, // the ability score tab being looked at
  };

  const ctx = {
    get draft() {
      return state.drafts[state.mode];
    },
    set(draft, { redraw = true } = {}) {
      state.drafts[state.mode] = draft;
      if (redraw) render();
      else refreshNav();
    },
    redraw: () => render(),
    goTo: (step) => goTo(step),
    state,
    rng: createRng(seed),
  };

  // A Quick Start hero opens on the review, which has a button to restyle them.
  const steps = () => (state.mode === 'quick' ? ['look', 'review'] : creationSteps(ctx.draft));

  function goTo(step) {
    state.step = step;
    if (step !== 'start') state.drafts[state.mode] = prepareStep(ctx.draft, step);
    confirmArea.replaceChildren();
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    keepFocus(body, () => body.replaceChildren(...renderStep()));
    refreshNav();
  }

  function renderStep() {
    if (state.step === 'start') return startStep();
    if (state.step === 'review') return reviewStep(ctx, state.mode === 'quick' ? state.quickStart : null);
    return RENDER[state.step](ctx);
  }

  // What stops the player moving on from this step.
  function problems() {
    if (state.step === 'start') return [];
    const list = stepProblems(ctx.draft, state.step);
    if (state.step === 'abilities' && abilityView(ctx) === 'random' && !state.rolls) list.unshift('Roll your scores, or choose another way.');
    return list;
  }

  function refreshNav() {
    const list = steps();
    const index = list.indexOf(state.step);
    progress.replaceChildren();
    if (state.step !== 'start' && state.mode === 'build') {
      progress.append(el('span', 'progress-label', `Step ${index + 1} of ${list.length}: ${STEP_NAMES[state.step]}`));
      const pips = el('span', 'progress-pips');
      pips.setAttribute('aria-hidden', 'true');
      list.forEach((_, i) => pips.append(el('span', i <= index ? 'pip is-done' : 'pip')));
      progress.append(pips);
    }

    footer.hidden = state.step === 'start';
    const blocking = problems();
    // The first thing still to do, so the bar stays small on a phone.
    const more = blocking.length > 1 ? ` · ${blocking.length - 1} more to do` : '';
    needs.textContent = blocking.length ? `${blocking[0].replace(/\.$/, '')}${more}` : '';
    back.hidden = state.step === 'start';
    next.hidden = state.step === 'start';
    next.textContent = state.step === 'review' ? 'Begin adventure' : 'Next';
    next.disabled = blocking.length > 0;
  }

  back.onclick = () => {
    if (state.mode === 'quick') {
      goTo(state.step === 'look' ? 'review' : 'start');
      return;
    }
    const list = steps();
    const index = list.indexOf(state.step);
    goTo(index <= 0 ? 'start' : list[index - 1]);
  };

  next.onclick = () => {
    if (problems().length > 0) return;
    const list = steps();
    const index = list.indexOf(state.step);
    if (state.step !== 'review') {
      goTo(list[index + 1]);
      return;
    }
    try {
      const character = finishCharacter(ctx.draft);
      next.disabled = true;
      onFinish({ character, rngState: ctx.rng.getState() });
    } catch (error) {
      needs.textContent = error.message;
    }
  };

  // Leaving asks first once the player has started choosing.
  root.getElementById('creation-cancel').onclick = () => {
    if (state.step === 'start') {
      onCancel();
      return;
    }
    const confirm = el('div', 'slot-confirm');
    confirm.append(
      el('p', 'slot-warning', 'Leave without keeping this hero?'),
      actionButton('Leave', onCancel, 'is-danger'),
      actionButton('Keep going', () => confirmArea.replaceChildren()),
    );
    confirmArea.replaceChildren(confirm);
    confirm.querySelector('button').focus();
  };

  // ---- The first page: Quick Start or build your own ----

  function startStep() {
    const nodes = [
      el('h2', 'creation-heading', 'Who will you be?'),
      el('p', 'creation-intro', 'Take a ready-made hero and be in the first scene in a minute, or build your own.'),
    ];
    const quick = section('Quick Start');
    quick.append(
      optionList(
        quickStartHeroes.map((hero) => {
          const c = hero.character;
          return optionCard({
            key: `quick-${hero.id}`,
            media: spriteCanvas(heroSprite(c), { scale: 3 }),
            title: c.name,
            lines: [
              `${describeCharacter(c)} · ${findBackground(c.backgroundId).name}`,
              hero.summary,
              `Drive: ${findDrive(c.drive).name} · Bond: ${findBond(c.bond.type).name}, ${c.bond.name}`,
            ],
            onSelect: () => {
              state.mode = 'quick';
              state.quickStart = hero;
              state.drafts.quick = structuredClone(c);
              goTo('review');
            },
          });
        }),
      ),
    );
    const build = section('Build your own');
    build.append(
      optionList([
        optionCard({
          key: 'build',
          title: 'Build a hero',
          lines: ['Class, background, species, ability scores, skills, spells, look, name, Drive, Bond and equipment. About 10 minutes.'],
          onSelect: () => {
            state.mode = 'build';
            goTo('class');
          },
        }),
      ]),
    );
    nodes.push(quick, build);
    return nodes;
  }

  confirmArea.replaceChildren();
  goTo('start');
}
