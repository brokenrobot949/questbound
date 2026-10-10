// The battle screen: the grid (drawn on a canvas with DawnLike tiles and sprites), the turn
// order, the hero's Hit Points, the action bar and the fight log.
//
// On the hero's turn, lit squares show where they can move: tap one to go there. Every action
// button says what it does, and every attack its chance to hit, damage and reach. Choose an
// attack, then a foe (on the grid or in the list) to attack it; each foe's button shows the
// chance to hit first. Spells have a button each: choose one, pick the spell slot to use (or
// a free cast), then aim it. An area spell shows the squares it would cover in orange (it
// starts aimed at the most foes it can catch without you); tap the grid to aim it elsewhere,
// then Cast. Misty Step lights the squares it can reach in purple. A spell on yourself
// (Mage Armor, healing, Bless, Sanctuary) has a Cast button. Other actions, Bonus Actions and
// End Turn sit under the spells. After an attack of yours misses, a hero with Heroic
// Inspiration gets a Reroll button at the top, until they do anything else. A fight well
// under your strength offers Resolve, which plays it out at once (combat/resolve.js).
//
// Whatever follows a choice plays out a line at a time, at the Battle speed set in Settings:
// each turn is announced, creatures walk square by square, damage pops up over whoever took
// it, and the line being played shows under the grid. Skip shows the rest at once. The fight
// itself is already decided and saved; this only shows it.

import * as fight from '../combat/battle.js';
import { attackToReroll, rerollAttack } from '../rules/inspiration.js';
import { canResolve, resolveFight } from '../combat/resolve.js';
import { key } from '../combat/grid.js';
import { directionTowards } from '../combat/areas.js';
import { heroSprite } from '../character/look.js';
import { featureUsesLeft, featureUsesMax, heroMaxHp, slotsLeft } from '../character/resources.js';
import { getSetting } from '../save/settings.js';
import { sprites } from '../../../data/campaign/sprites.js';
import { blit, drawCell, drawTile, frameSquare, loadArt, pixelScale, sizeCanvas, spriteImage, TILE } from './tile-art.js';
import { attackSummary, averageText } from './attack-text.js';
import { rollLine } from './roll-format.js';
import { el, showFatalError } from './dom.js';

const FRAME_MS = 500; // each frame of the two-frame idle animation

// How long each part of a turn takes to play out, in milliseconds, at each Battle speed: a
// line of the log, the start of someone's turn, a quick line (Initiative, a new round), and
// one square of walking.
const PACE = {
  slow: { line: 1800, turn: 900, quick: 500, step: 220 },
  normal: { line: 1200, turn: 600, quick: 300, step: 150 },
  fast: { line: 500, turn: 250, quick: 120, step: 70 },
};

const DAMAGE_COLOR = '#ff8a7a';
const HEALING_COLOR = '#7fd99a';

// Washes over squares on the grid: an area spell's reach, and where Misty Step can go.
const AREA_WASH = ['rgba(240, 140, 60, 0.35)', 'rgba(240, 140, 60, 0.9)'];
const TELEPORT_WASH = ['rgba(180, 140, 230, 0.35)', 'rgba(180, 140, 230, 0.9)'];
// Tints under a creature with a condition, and words for the turn order.
const CONDITION_TINTS = {
  paralyzed: 'rgba(180, 140, 230, 0.45)',
  turned: 'rgba(250, 235, 180, 0.45)', // Turn Undead
  blinded: 'rgba(30, 30, 50, 0.5)', // Blindness/Deafness
  poisoned: 'rgba(110, 200, 90, 0.4)',
  outlined: 'rgba(225, 100, 240, 0.45)', // Faerie Fire
  guided: 'rgba(250, 230, 130, 0.5)', // Guiding Bolt
  shield: 'rgba(120, 170, 240, 0.45)',
  sanctuary: 'rgba(240, 240, 255, 0.35)',
};
const CONDITION_WORDS = [
  ['asleep', 'Asleep'],
  ['drowsy', 'Drowsy'],
  ['paralyzed', 'Paralyzed'],
  ['turned', 'Turned'],
  ['blinded', 'Blinded'],
  ['grovel', 'Commanded'],
  ['baned', 'Baned'],
  ['poisoned', 'Poisoned'],
  ['outlined', 'Outlined'],
  ['guided', 'Glowing'],
  ['blessed', 'Blessed'],
  ['sanctuary', 'Sanctuary'],
];

// Log lines already played on screen during this visit, so nothing plays twice.
const played = new WeakSet();

// container: where to draw. onSave(game) after every action, before it plays out.
// onShown(): an action has finished playing out (the status line can catch up).
// onDone(): the player has seen the end of the fight and wants to carry on with the story.
export async function showBattle({ container, game, onSave, onShown = () => {}, onDone }) {
  const art = await loadArt();
  const look = heroSprite(game.character);
  const heroFrames = look.frames.map((rows) => spriteImage(look, rows));
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // option: the attack or spell chosen, waiting to be aimed; aim: where an area spell is aimed
  // ({ direction } or { at }). replaying: lines are playing out, and scene is what the grid
  // shows meanwhile (null: the fight as it stands). walkers: creatures part-way between
  // squares. popups: damage and healing numbers over creatures. flash: squares a spell just
  // covered. caption: the line playing now; lastCaption: the last thing that happened, shown
  // between turns.
  const view = {
    option: null,
    aim: null,
    flash: null,
    replaying: false,
    skip: false,
    wake: null,
    shown: 0,
    frame: 0,
    scene: null,
    walkers: {},
    popups: [],
    popupTimer: null,
    caption: null,
    lastCaption: null,
  };

  const panel = el('section', 'battle');
  panel.setAttribute('aria-label', 'Battle');
  const header = el('div', 'battle-header');
  // Concentration, wards, Shield and Temporary Hit Points, when there are any.
  const status = el('p', 'battle-status');
  const order = el('ol', 'battle-order');
  order.setAttribute('aria-label', 'Turn order');
  const objective = el('p', 'battle-objective');
  const canvas = el('canvas', 'battle-grid');
  canvas.setAttribute('role', 'img');
  // The latest line, big and right under the grid. (The log below reads it to screen readers.)
  const caption = el('div', 'battle-caption');
  caption.setAttribute('aria-hidden', 'true');
  const help = el('p', 'battle-help');
  const controls = el('div', 'battle-controls');
  const logList = el('ol', 'battle-log');
  logList.setAttribute('aria-live', 'polite');
  logList.setAttribute('aria-label', 'Fight log');
  panel.append(header, status, order, objective, canvas, caption, help, controls, logList);
  container.replaceChildren(panel);

  const timer = reduceMotion
    ? null
    : setInterval(() => {
        if (!canvas.isConnected) return clearInterval(timer);
        view.frame += 1;
        draw();
      }, FRAME_MS);

  const pace = () => PACE[getSetting('battleSpeed')] || PACE.normal;

  canvas.addEventListener('click', (event) => {
    if (view.replaying || !fight.isHeroTurn(game)) return;
    const map = fight.battleMap(game.battle);
    const rect = canvas.getBoundingClientRect();
    const pos = {
      x: Math.floor(((event.clientX - rect.left) / rect.width) * map.width),
      y: Math.floor(((event.clientY - rect.top) / rect.height) * map.height),
    };
    const chosen = chosenOption();
    const aiming = chosen && chosen.targeting;
    if (aiming === 'direction' || aiming === 'point') return aimAt(chosen, pos);
    if (aiming === 'square') {
      if (fight.teleportSquares(game, chosen.id).some((s) => s.x === pos.x && s.y === pos.y)) act(() => fight.heroTeleport(game, chosen.id, pos));
      return;
    }
    if (aiming === 'self' || aiming === 'nearest') return;
    const foe = fight.enemies(game.battle).find((c) => c.hp > 0 && c.pos.x === pos.x && c.pos.y === pos.y);
    if (foe && chosen) return act(() => fight.heroAttack(game, chosen.id, foe.id));
    if (!foe && fight.heroReachable(game).has(key(pos))) act(() => fight.heroMove(game, pos));
  });

  // The attack or spell chosen, if it's still there (a slot can run out), or null.
  function chosenOption() {
    return view.option ? fight.heroAttackOptions(game).find((o) => o.id === view.option) || null : null;
  }

  // Aims an area spell at a tapped square: a direction for one that starts from you, the
  // centre for one that doesn't.
  function aimAt(option, pos) {
    const towards = directionTowards(fight.heroCombatant(game.battle).pos, pos);
    const aim = option.targeting === 'direction' ? (towards ? { direction: towards.id } : null) : { at: pos };
    if (!aim) return;
    try {
      fight.areaFor(game, option.id, aim);
    } catch (error) {
      help.textContent = error.message;
      return;
    }
    view.aim = aim;
    render();
  }

  // Heroic Inspiration: the attack just made happens again with a new die. Its old lines leave
  // the log, and the new ones play out in their place.
  async function rerollMissed() {
    if (view.replaying) return;
    let result;
    try {
      result = rerollAttack(game);
    } catch (error) {
      help.textContent = error.message;
      return;
    }
    for (let i = view.shown; i > result.kept; i--) if (logList.lastChild) logList.lastChild.remove();
    view.shown = result.kept;
    view.option = null;
    view.aim = null;
    onSave(game);
    await replay(result.before);
    render();
    onShown();
  }

  // Runs one of the hero's actions and saves, then plays out whatever followed (all at once
  // if instant: Resolve).
  async function act(action, { instant = false } = {}) {
    if (view.replaying) return;
    const before = fight.battleScene(game);
    try {
      action();
    } catch (error) {
      help.textContent = error.message;
      return;
    }
    view.option = null;
    view.aim = null;
    onSave(game);
    await replay(before, { instant });
    render();
    onShown();
  }

  // ---- Playing out what happened ----

  // Plays the log lines not shown yet, one at a time: walks, then the line, then a pause.
  // before: the scene before the first of them, when known. instant: show them all at once,
  // as Skip does.
  async function replay(before = null, { instant = false } = {}) {
    const log = game.battle ? game.battle.log : [];
    if (view.shown >= log.length) return;
    const previous = view.shown > 0 ? fight.replayOf(log[view.shown - 1]) : null;
    const first = fight.replayOf(log[view.shown]);
    view.scene = copyScene(before || (previous && previous.scene) || (first && first.scene) || fight.battleScene(game));
    view.replaying = true;
    view.skip = instant;
    clearPopups();
    render();
    bringIntoView();
    while (view.shown < log.length) {
      const entry = log[view.shown];
      const info = fight.replayOf(entry);
      view.flash = null;
      if (info) {
        if (!view.skip) for (const move of info.moves) await walk(move);
        view.popups = view.skip ? [] : changesBetween(view.scene, info.scene);
        view.flash = view.skip ? null : info.area;
        view.scene = copyScene(info.scene);
      }
      appendLogLine(entry);
      setCaption(entry);
      played.add(entry);
      view.shown += 1;
      render();
      if (!view.skip && view.shown < log.length) await pauseFor(pauseAfter(entry));
    }
    view.replaying = false;
    view.scene = null;
    view.flash = null;
    // The last damage numbers linger a moment.
    view.popupTimer = setTimeout(clearPopups, pace().line);
  }

  function pauseAfter(entry) {
    const p = pace();
    if (entry.turnOf) return p.turn;
    if (entry.newRound || entry.text === 'You end your turn.' || (entry.roll && entry.roll.label === 'Initiative')) return p.quick;
    return entry.roll ? Math.round(p.line * 1.4) : p.line; // a roll has more to read
  }

  // Waits, unless the player taps Skip.
  function pauseFor(ms) {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timeout);
        view.wake = null;
        resolve();
      };
      const timeout = setTimeout(done, ms);
      view.wake = done;
    });
  }

  function skip() {
    view.skip = true;
    if (view.wake) view.wake();
  }

  // Walks a creature along its path, a square at a time. A teleport (Misty Step) just moves it.
  async function walk(move) {
    const unit = view.scene.units.find((u) => u.id === move.id);
    if (!unit) return;
    if (move.teleport) {
      unit.pos = { ...move.path[move.path.length - 1] };
      draw();
      return;
    }
    unit.pos = { ...move.from };
    for (const next of move.path) {
      if (!reduceMotion && !view.skip) await slide(move.id, unit.pos, next, pace().step);
      unit.pos = { ...next };
    }
    draw();
  }

  // Slides a creature from one square to the next, a sprite pixel at a time.
  function slide(id, from, to, ms) {
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const t = view.skip || !canvas.isConnected ? 1 : Math.min(1, (now - start) / ms);
        const along = (a, b) => Math.round((a + (b - a) * t) * TILE) / TILE;
        view.walkers[id] = { x: along(from.x, to.x), y: along(from.y, to.y) };
        draw();
        if (t < 1) return requestAnimationFrame(frame);
        delete view.walkers[id];
        resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  function clearPopups() {
    clearTimeout(view.popupTimer);
    view.popups = [];
    draw();
  }

  // A turn plays out on the grid, so the grid and the line under it should be on screen. (An
  // instant jump: a smooth scroll gets cut short as the panel redraws.)
  function bringIntoView() {
    const top = order.getBoundingClientRect().top;
    const bottom = caption.getBoundingClientRect().bottom;
    const room = window.innerHeight - 64; // the tab bar covers the bottom of the screen
    if (top < 0 || bottom > room) order.scrollIntoView({ block: 'start' });
  }

  // The caption shows whose turn it is and the line playing. Between turns it keeps the last
  // thing that happened.
  function setCaption(entry) {
    if (entry.turnOf) {
      view.caption = { title: entry.text.replace(/\.$/, ''), entry: null };
      return;
    }
    const initiative = entry.roll && entry.roll.label === 'Initiative';
    const title = initiative || !view.caption ? 'Initiative' : view.caption.title;
    view.caption = { title, entry };
    if (!initiative) view.lastCaption = view.caption;
  }

  function renderCaption() {
    const shown = view.replaying ? view.caption : view.lastCaption;
    caption.replaceChildren();
    if (!shown) return;
    if (shown.title) caption.append(el('p', 'battle-caption-title', shown.title));
    if (shown.entry) {
      caption.append(el('p', 'battle-caption-text', shown.entry.text));
      if (shown.entry.roll) caption.append(el('p', 'battle-roll', rollLine(shown.entry.roll)));
    }
  }

  function appendLogLine(entry) {
    const item = el('li', `battle-log-line${entry.turnOf ? ' is-turn' : ''}`);
    item.append(el('span', '', entry.text));
    if (entry.roll) item.append(el('span', 'battle-roll', rollLine(entry.roll)));
    logList.append(item);
    while (logList.children.length > 40) logList.firstChild.remove();
    logList.scrollTop = logList.scrollHeight; // scroll the log, not the page
  }

  // ---- The panel ----

  function render() {
    const battle = game.battle;
    if (!battle) return;
    const scene = view.scene || fight.battleScene(game);
    const hero = scene.units.find((u) => u.id === 'hero');
    const yourTurn = fight.isHeroTurn(game) && !view.replaying;

    header.replaceChildren(
      el('span', 'battle-round', `Round ${scene.round}`),
      el('span', 'battle-hp', `HP ${hero.hp}/${heroMaxHp(game)}${hero.temp ? ` +${hero.temp}` : ''}`),
    );
    const heroConditions = hero.conditions || [];
    const notes = [];
    if (scene.concentration) notes.push(`Concentrating on ${scene.concentration}`);
    if (heroConditions.includes('blessed')) notes.push('Blessed: +1d4 to attacks and saves');
    if (heroConditions.includes('sanctuary')) notes.push('Sanctuary: foes must save to attack you');
    if (heroConditions.includes('shield')) notes.push('Shield up: +5 AC');
    if (heroConditions.includes('shield-of-faith')) notes.push('Shield of Faith: +2 AC');
    if (scene.weapon) notes.push('Spiritual Weapon: strikes as a Bonus Action');
    if (heroConditions.includes('outlined')) notes.push('Outlined: attacks on you have Advantage');
    if (heroConditions.includes('dodging')) notes.push('Dodging');
    if (hero.temp) notes.push(`${hero.temp} Temporary Hit Points`);
    if (game.inspiration) notes.push('★ Heroic Inspiration');
    status.textContent = notes.join(' · ');
    objective.textContent = fight.objectiveText(battle);
    order.replaceChildren(
      ...battle.order
        .map((id) => scene.units.find((u) => u.id === id))
        .filter(Boolean)
        .map((unit) => {
          const c = fight.combatantById(battle, unit.id);
          const down = c.side === 'enemy' ? unit.hp <= 0 : scene.heroState !== 'up';
          const name = c.side === 'hero' ? 'You' : c.name;
          const conditions = unit.conditions || [];
          const tags = [];
          if (unit.escaped) tags.push('fled');
          else if (!down) {
            for (const [kind, word] of CONDITION_WORDS) if (conditions.includes(kind)) tags.push(word);
            if (unit.prone && !conditions.includes('asleep')) tags.push('Prone');
          }
          const label = tags.length ? `${name} (${tags.join(', ')})` : name;
          return el('li', `battle-order-entry${unit.id === scene.actor ? ' is-current' : ''}${down ? ' is-down' : ''}`, label);
        }),
    );
    renderCaption();

    controls.replaceChildren();
    if (view.replaying) {
      help.textContent = '';
      const skipButton = battleButton('Skip ›', skip);
      skipButton.setAttribute('aria-label', 'Skip: show the rest at once');
      controls.append(skipButton);
    } else if (battle.outcome) {
      help.textContent = '';
      controls.append(outcomeCard(battle));
    } else if (yourTurn) {
      renderHeroControls();
    } else {
      const current = fight.currentCombatant(battle);
      help.textContent = `${current.side === 'hero' ? 'You' : current.name}…`;
    }
    canvas.setAttribute('aria-label', describeGrid(scene));
    draw();
  }

  function renderHeroControls() {
    const battle = game.battle;
    const turn = battle.turnState;
    const prone = fight.isProne(battle, 'hero');
    const options = fight.heroAttackOptions(game);
    const chosen = options.find((o) => o.id === view.option) || null;
    if (!chosen) view.option = null;
    help.textContent = chosen
      ? aimHelp(chosen)
      : turn.athleteMove
        ? `Remarkable Athlete: tap a gold square to move up to ${turn.athleteMove} feet without provoking Opportunity Attacks, or carry on.`
        : prone
          ? `You're Prone: your attacks have Disadvantage, and foes beside you have Advantage. Stand up for ${fight.heroStandCost(game)} feet of movement, or crawl (${turn.movementLeft} feet left, each square costs double).`
          : `Your turn. Tap a lit square to move (${turn.movementLeft} feet left), or choose an action.`;
    const summary = (option) => attackSummary(option, { slotsLeft: (level) => slotsLeft(game, level) }).join(' · ');

    // The attack just made missed: Heroic Inspiration can roll it again.
    const missed = attackToReroll(game);
    if (missed) {
      const what = `Spend Heroic Inspiration to roll that attack again: you rolled ${missed.roll.natural}. The new roll stands.`;
      controls.append(actionCard('Reroll ★', what, rerollMissed, 'is-primary'));
    }

    // A button that chooses an attack or spell (tap it again to put it back). A spell has one
    // button, whichever slot it's cast with.
    const choiceCard = (option) => {
      const pressed = Boolean(chosen && (chosen.id === option.id || (option.spellId && chosen.spellId === option.spellId)));
      const card = actionCard(spellName(option), summary(option), () => {
        view.option = pressed ? null : option.id;
        view.aim = !pressed && option.area ? fight.suggestAim(game, option.id) : null;
        render();
      });
      card.setAttribute('aria-pressed', String(pressed));
      const why = fight.heroCantUse(game, option.id);
      card.disabled = Boolean(why);
      if (why) card.title = why;
      return card;
    };

    const weapons = options.filter((o) => o.source === 'weapon');
    if (weapons.length) {
      const attacks = actionGroup(turn.action ? 'Attack (action used)' : 'Attack');
      for (const option of weapons) attacks.list.append(choiceCard(option));
      controls.append(attacks.group);
      if (chosen && chosen.source === 'weapon') controls.append(aimPanel(chosen, options));
    }

    const spells = firstOfEach(options.filter((o) => o.source === 'spell' && !o.bonusAction));
    if (spells.length) {
      const group = actionGroup(turn.action ? 'Spells (action used)' : 'Spells');
      for (const option of spells) group.list.append(choiceCard(option));
      controls.append(group.group);
      if (chosen && chosen.source === 'spell' && !chosen.bonusAction) controls.append(aimPanel(chosen, options));
    }

    // A Cleric's Channel Divinity: Divine Spark, Turn Undead and Preserve Life, while a use is
    // left. Each is an action.
    const channels = options.filter((o) => o.source === 'channel');
    if (channels.length) {
      const left = `${featureUsesLeft(game, 'channel-divinity')} of ${featureUsesMax(game.character, 'channel-divinity')} left`;
      const group = actionGroup(turn.action ? `Channel Divinity (action used · ${left})` : `Channel Divinity (${left})`);
      for (const option of channels) group.list.append(choiceCard(option));
      controls.append(group.group);
      if (chosen && chosen.source === 'channel') controls.append(aimPanel(chosen, options));
    }

    // Standing up from Prone uses movement, not an action.
    if (prone) {
      const movement = actionGroup('Movement');
      const cost = fight.heroStandCost(game);
      const stand = actionCard('Stand up', `Costs ${cost} feet of movement`, () => act(() => fight.heroStandUp(game)));
      stand.disabled = !fight.heroCanStand(game);
      movement.list.append(stand);
      controls.append(movement.group);
    }

    const other = actionGroup(turn.action ? 'Other actions (action used)' : 'Other actions');
    for (const [name, what, run] of [
      ['Dash', 'Double your movement this turn', fight.heroDash],
      ['Disengage', 'Move away this turn without Opportunity Attacks', fight.heroDisengage],
      ['Dodge', 'Attacks on you have Disadvantage until your next turn', fight.heroDodge],
    ]) {
      const card = actionCard(name, what, () => act(() => run(game)));
      card.disabled = turn.action;
      other.list.append(card);
    }
    // Fighters from level 2: Action Surge, once the turn's action is used.
    const surges = featureUsesMax(game.character, 'action-surge');
    if (surges) {
      const left = featureUsesLeft(game, 'action-surge');
      const surge = actionCard('Action Surge', `One more action this turn (not a spell) · ${left} of ${surges} left until you rest`, () => act(() => fight.heroActionSurge(game)));
      surge.disabled = !fight.heroCanSurge(game);
      other.list.append(surge);
    }
    controls.append(other.group);

    const bonuses = fight.heroBonusActions(game);
    const bonusSpells = firstOfEach(options.filter((o) => o.source === 'spell' && o.bonusAction));
    if (bonuses.length || bonusSpells.length) {
      const bonus = actionGroup(turn.bonus ? 'Bonus Action (used)' : 'Bonus Action');
      if (bonuses.includes('second-wind')) {
        const level = game.character.level;
        const what = `Regain 1d10 + ${level} Hit Points (${averageText(5.5 + level)} on average) · ${featureUsesLeft(game, 'second-wind')} left until you rest`;
        bonus.list.append(disabledIf(turn.bonus, actionCard('Second Wind', what, () => act(() => fight.heroSecondWind(game)))));
      }
      if (bonuses.includes('potion')) {
        const potions = game.inventory.find((e) => e.id === 'potion-of-healing').quantity;
        const what = `Regain 2d4 + 2 Hit Points (7 on average) · ${potions} in your pack`;
        bonus.list.append(disabledIf(turn.bonus, actionCard('Drink a Potion of Healing', what, () => act(() => fight.heroDrinkPotion(game)))));
      }
      for (const option of bonusSpells) bonus.list.append(choiceCard(option));
      controls.append(bonus.group);
      if (chosen && chosen.bonusAction) controls.append(aimPanel(chosen, options));
    }

    // A fight well under your strength can be played out at once.
    if (canResolve(game)) {
      const what = 'Well under your strength: play the fight out at once, with real rolls. Weapons and cantrips only, no spell slots or features; it stops if you drop below half your Hit Points.';
      controls.append(actionCard('Resolve', what, () => act(() => resolveFight(game), { instant: true })));
    }
    controls.append(actionCard('End turn', 'Your foes take their turns', () => act(() => fight.endHeroTurn(game)), 'is-primary'));
  }

  // What to do next with the chosen attack or spell.
  function aimHelp(option) {
    const name = spellName(option);
    if (option.targeting === 'direction') return `${name}: tap the grid on the side you want it to go. The orange squares are what it covers.`;
    if (option.targeting === 'point') return `${name}: tap the square to centre it on, up to ${option.range[1]} feet away. The orange squares are what it covers.`;
    if (option.how === 'turn') return `${name}: every Undead within 30 feet of you.`;
    if (option.targeting === 'nearest') return `${name}: the nearest ${option.targets} foes within ${option.range[1]} feet.`;
    if (option.targeting === 'self') return `${name}: on yourself.`;
    if (option.targeting === 'square') return `${name}: tap a purple square to step there.`;
    return `${name}: choose a foe. Tap it on the grid, or below.`;
  }

  // Under the chosen attack or spell: which spell slot to use, then where to aim it.
  function aimPanel(chosen, options) {
    const box = el('div', 'battle-aim');
    const variants = chosen.spellId ? options.filter((o) => o.spellId === chosen.spellId) : [];
    if (variants.length > 1) {
      const row = el('div', 'battle-slots');
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'Spell slot');
      for (const variant of variants) {
        const label = variant.freeCast ? 'Free (once per Long Rest)' : `Level ${variant.slotLevel} slot (${slotsLeft(game, variant.slotLevel)} left)`;
        const chip = battleButton(label, () => {
          view.option = variant.id;
          render();
        }, 'battle-slot');
        chip.setAttribute('aria-pressed', String(variant.id === chosen.id));
        chip.disabled = Boolean(fight.heroCantUse(game, variant.id));
        row.append(chip);
      }
      box.append(row);
    }
    const targeting = chosen.targeting || 'foe';
    if (targeting === 'foe') {
      const targets = actionGroup(`Target for ${spellName(chosen)}`);
      for (const foe of fight.enemies(game.battle).filter((c) => c.hp > 0)) {
        const preview = fight.attackPreview(game, chosen.id, foe.id);
        const card = actionCard(foe.name, targetText(preview), () => act(() => fight.heroAttack(game, chosen.id, foe.id)));
        card.disabled = !preview.inRange;
        card.title = preview.describe;
        targets.list.append(card);
      }
      box.append(targets.group);
    } else if (targeting === 'direction' || targeting === 'point') {
      let area = null;
      try {
        area = view.aim ? fight.areaFor(game, chosen.id, view.aim) : null;
      } catch {
        area = null;
      }
      const caught = area ? area.caught.map((c) => (c.side === 'hero' ? 'you' : c.name)) : [];
      const what = !area ? 'Tap the grid to aim it first' : caught.length ? `Catches ${caught.join(', ')}` : 'Catches nobody';
      if (area && area.caught.some((c) => c.side === 'hero')) box.append(el('p', 'battle-warning', 'Careful: you’re inside it too.'));
      const cast = actionCard(`Cast ${spellName(chosen)}`, what, () => act(() => fight.heroCastArea(game, chosen.id, view.aim)), 'is-primary');
      cast.disabled = !area;
      box.append(cast);
    } else if (targeting === 'self') {
      box.append(actionCard(`Cast ${spellName(chosen)}`, '', () => act(() => fight.heroCastSelf(game, chosen.id)), 'is-primary'));
    } else if (targeting === 'nearest') {
      const targets = fight.nearestTargets(game, chosen);
      const what = targets.length ? `On ${targets.map((c) => c.name).join(', ')}` : `No foes within ${chosen.range[1]} feet`;
      const cast = actionCard(`Cast ${spellName(chosen)}`, what, () => act(() => fight.heroCastMulti(game, chosen.id)), 'is-primary');
      cast.disabled = !targets.length;
      box.append(cast);
    }
    return box;
  }

  function outcomeCard(battle) {
    const card = el('div', 'battle-outcome');
    const won = battle.outcome === 'victory';
    card.append(el('p', 'battle-outcome-title', won ? 'Victory!' : 'You have fallen…'));
    card.append(el('p', 'battle-help', won ? `You gain ${battle.xp} XP.` : 'But this isn’t the end of your story.'));
    card.append(
      battleButton(
        'Carry on',
        () => {
          if (timer) clearInterval(timer);
          clearTimeout(view.popupTimer);
          onDone();
        },
        'is-primary',
      ),
    );
    return card;
  }

  // ---- Drawing ----

  function draw() {
    const battle = game.battle;
    if (!battle) return;
    const scene = view.scene || fight.battleScene(game);
    const map = fight.battleMap(battle);
    const scale = pixelScale(map.width, panel);
    const ctx = sizeCanvas(canvas, map.width, map.height, scale);
    const size = TILE * scale;
    const frame = view.frame % 2;
    const at = (unit) => view.walkers[unit.id] || unit.pos;

    // Floor, walls and things on the floor.
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) drawCell(ctx, art, map, x, y, size);
    }

    // Where the hero can move. A pale wash with a bright edge, so it shows on wood and stone
    // alike; gold squares are a free move (Remarkable Athlete).
    if (fight.isHeroTurn(game) && !view.replaying && !view.option) {
      for (const step of fight.heroReachable(game).values()) {
        if (step.cost === 0) continue;
        const colours = step.free ? ['rgba(240, 200, 90, 0.35)', 'rgba(240, 200, 90, 0.9)'] : ['rgba(222, 238, 214, 0.32)', 'rgba(222, 238, 214, 0.85)'];
        washSquare(ctx, step.pos, size, scale, colours);
      }
    }

    // The chosen spell: the squares an area would cover, or where Misty Step can go. During
    // a replay, the squares a spell just covered.
    const chosen = !view.replaying && fight.isHeroTurn(game) ? chosenOption() : null;
    let aimed = null;
    if (chosen && chosen.area && view.aim) {
      try {
        aimed = fight.areaFor(game, chosen.id, view.aim);
      } catch {
        aimed = null;
      }
    }
    for (const pos of (aimed && aimed.squares) || view.flash || []) washSquare(ctx, pos, size, scale, AREA_WASH);
    if (chosen && chosen.targeting === 'square') for (const pos of fight.teleportSquares(game, chosen.id)) washSquare(ctx, pos, size, scale, TELEPORT_WASH);

    // Tints under creatures held, poisoned, outlined, glowing, shielded or in Sanctuary.
    for (const unit of scene.units) {
      if (unit.escaped || (unit.id !== 'hero' && unit.hp <= 0)) continue;
      for (const kind of unit.conditions || []) {
        if (!CONDITION_TINTS[kind]) continue;
        const pos = at(unit);
        ctx.fillStyle = CONDITION_TINTS[kind];
        ctx.fillRect(pos.x * size, pos.y * size, size, size);
      }
    }

    // Creatures: the fallen first, so the standing are drawn on top. The fallen lie faded on
    // their side; the Prone lie on their side.
    const foes = scene.units.filter((u) => u.id !== 'hero' && !u.escaped).sort((a, b) => (a.hp > 0) - (b.hp > 0));
    for (const unit of foes) {
      const c = fight.combatantById(battle, unit.id);
      const standing = unit.hp > 0;
      const pos = at(unit);
      drawTile(ctx, art, sprites[fight.findMonster(c.monsterId).sprite], pos.x, pos.y, size, standing ? frame : 0, {
        alpha: standing ? 1 : 0.35,
        lying: !standing || unit.prone,
      });
      if (standing) drawHealthBar(ctx, pos, unit.hp / c.maxHp, size, scale);
      // Who the chosen attack can reach.
      if (view.option && standing && !view.replaying) {
        const preview = fight.attackPreview(game, view.option, unit.id);
        if (preview && preview.inRange) frameSquare(ctx, pos, size, scale, '#ff8a7a');
      }
    }
    const hero = scene.units.find((u) => u.id === 'hero');
    const up = scene.heroState === 'up';
    const heroAt = at(hero);
    blit(ctx, heroFrames[up ? frame : 0], 0, 0, heroAt.x, heroAt.y, size, { alpha: up ? 1 : 0.5, lying: !up || hero.prone });
    drawHealthBar(ctx, heroAt, hero.hp / heroMaxHp(game), size, scale);

    // Spiritual Weapon, hovering where it last struck.
    if (scene.weapon) drawPixels(ctx, SPECTRAL_WEAPON, scene.weapon, size, scale);

    // Sleepers snore; whoever an aimed area would catch is framed in orange.
    for (const unit of scene.units) {
      const conditions = unit.conditions || [];
      if (unit.hp > 0 && (conditions.includes('asleep') || conditions.includes('drowsy'))) {
        drawBadge(ctx, conditions.includes('asleep') ? 'Zz' : 'z', at(unit), size, scale);
      }
    }
    if (aimed) for (const c of aimed.caught) frameSquare(ctx, c.pos, size, scale, AREA_WASH[1]);

    // Whose turn it is.
    const actor = scene.units.find((u) => u.id === scene.actor);
    if (actor && (view.replaying || !battle.outcome)) frameSquare(ctx, at(actor), size, scale, '#f0c85a');

    for (const popup of view.popups) {
      const unit = scene.units.find((u) => u.id === popup.id);
      if (unit) drawPopup(ctx, popup, at(unit), size, scale);
    }
  }

  function describeGrid(scene) {
    const hero = scene.units.find((u) => u.id === 'hero');
    const foes = scene.units
      .filter((u) => u.id !== 'hero' && u.hp > 0)
      .map((u) => `${fight.combatantById(game.battle, u.id).name} ${squares(hero.pos, u.pos)} away`);
    return `Battle grid. ${foes.length ? foes.join(', ') : 'No foes standing'}.`;
  }

  // What already happened shows at once (after a reload, say); lines new in this visit that
  // haven't played yet (the start of a fight) play out.
  logList.replaceChildren();
  const log = game.battle.log;
  while (view.shown < log.length && (played.has(log[view.shown]) || !fight.replayOf(log[view.shown]))) {
    appendLogLine(log[view.shown]);
    view.shown += 1;
  }
  const latest = log.slice(0, view.shown).reverse().find((entry) => !entry.turnOf);
  if (latest) view.lastCaption = { title: '', entry: latest };
  render();
  if (view.shown < log.length) {
    replay()
      .then(() => {
        render();
        onShown();
      })
      .catch(showFatalError);
  }
}

// Each creature's Hit Points (and Temporary Hit Points) that went down (damage) or up
// (healing) between two scenes.
function changesBetween(before, after) {
  const popups = [];
  const total = (unit) => unit.hp + (unit.temp || 0);
  for (const unit of after.units) {
    const was = before.units.find((u) => u.id === unit.id);
    if (!was || total(was) === total(unit)) continue;
    if (total(unit) < total(was)) popups.push({ id: unit.id, text: `-${total(was) - total(unit)}`, color: DAMAGE_COLOR });
    else popups.push({ id: unit.id, text: `+${total(unit) - total(was)}`, color: HEALING_COLOR });
  }
  return popups;
}

// One button for each spell: the first of its options (a free cast, then the lowest slot).
function firstOfEach(options) {
  return options.filter((option, i) => options.findIndex((o) => o.spellId === option.spellId) === i);
}

// "Burning Hands", without "(level 2 slot)" or "(free)".
function spellName(option) {
  return option.name.replace(/ \((free|level \d+ slot)\)$/, '');
}

// A pale wash with a bright edge over a square.
function washSquare(ctx, pos, size, scale, [fill, edge]) {
  const inset = 2 * scale;
  ctx.lineWidth = scale;
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.fillRect(pos.x * size + inset, pos.y * size + inset, size - 2 * inset, size - 2 * inset);
  ctx.strokeRect(pos.x * size + inset + scale / 2, pos.y * size + inset + scale / 2, size - 2 * inset - scale, size - 2 * inset - scale);
}

// Spiritual Weapon: a spectral mace of light, drawn a pixel at a time over its square.
const SPECTRAL_WEAPON = {
  rows: [
    '................',
    '..........LLL...',
    '.........LWWWL..',
    '.........LWWWL..',
    '.........LWWWL..',
    '..........LWL...',
    '.........LWL....',
    '........LWL.....',
    '.......LWL......',
    '......LWL.......',
    '.....LGL........',
    '....LGL.........',
    '...LGL..........',
    '..LGL...........',
    '...L............',
    '................',
  ],
  colors: { L: 'rgba(150, 200, 255, 0.85)', W: '#f4f8ff', G: '#e8c860' },
};

// Draws a little picture (rows of colour letters, '.' see-through) over a square.
function drawPixels(ctx, { rows, colors }, pos, size, scale) {
  const pixel = size / rows.length;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      ctx.fillStyle = colors[row[x]];
      ctx.fillRect(pos.x * size + x * pixel, pos.y * size + y * pixel, pixel, pixel);
    }
  });
}

// A little word in the top corner of a square ("Zz" over a sleeper).
function drawBadge(ctx, text, pos, size, scale) {
  ctx.save();
  ctx.font = `${5 * scale}px 'Press Start 2P', monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = '#140c1c';
  ctx.strokeText(text, pos.x * size + size - scale, pos.y * size + scale);
  ctx.fillStyle = '#9fc4f0';
  ctx.fillText(text, pos.x * size + size - scale, pos.y * size + scale);
  ctx.restore();
}

function copyScene(scene) {
  return { ...scene, units: scene.units.map((u) => ({ ...u, pos: { ...u.pos } })) };
}

// "65% to hit · Advantage: Pack Tactics", "80% it fails the save", "Out of range".
function targetText(preview) {
  if (preview.invalid) return preview.invalid;
  if (!preview.inRange) return 'Out of range';
  const percent = `${Math.round(preview.chance * 100)}%`;
  const how = preview.option.how;
  const chance = how === 'save' ? `${percent} it fails the save` : how === 'darts' ? 'Never misses' : `${percent} to hit`;
  return [chance, ...preview.advantage.map((r) => `Advantage: ${r}`), ...preview.disadvantage.map((r) => `Disadvantage: ${r}`)].join(' · ');
}

function squares(a, b) {
  const n = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  return `${n * 5} feet`;
}

function drawHealthBar(ctx, pos, fraction, size, scale) {
  const width = size - 4 * scale;
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(pos.x * size + 2 * scale, pos.y * size + size - 3 * scale, width, 2 * scale);
  ctx.fillStyle = fraction > 0.5 ? '#6daa2c' : fraction > 0.25 ? '#dad45e' : '#d04648';
  ctx.fillRect(pos.x * size + 2 * scale, pos.y * size + size - 3 * scale, Math.round(width * Math.max(0, fraction)), 2 * scale);
}

// A damage or healing number over a creature's head, outlined so it reads on any floor.
function drawPopup(ctx, popup, pos, size, scale) {
  ctx.save();
  ctx.font = `${7 * scale}px 'Press Start 2P', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = '#140c1c';
  const x = pos.x * size + size / 2;
  const y = pos.y * size + scale;
  ctx.strokeText(popup.text, x, y);
  ctx.fillStyle = popup.color;
  ctx.fillText(popup.text, x, y);
  ctx.restore();
}

// A group of action buttons under a label ("Attack", "Bonus Action").
function actionGroup(label) {
  const group = el('div', 'battle-row');
  group.append(el('span', 'battle-row-label', label));
  const list = el('div', 'battle-actions');
  group.append(list);
  return { group, list };
}

// An action button that says what it does underneath its name.
function actionCard(name, what, onClick, extra = '') {
  const button = el('button', `slot-button battle-button battle-action ${extra}`.trim());
  button.type = 'button';
  button.append(el('span', 'battle-action-name', name));
  if (what) button.append(el('span', 'battle-action-what', what));
  button.addEventListener('click', onClick);
  return button;
}

function battleButton(label, onClick, extra = '') {
  const button = el('button', `slot-button battle-button ${extra}`.trim(), label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

function disabledIf(condition, button) {
  button.disabled = condition;
  return button;
}
