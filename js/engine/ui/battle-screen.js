// The battle screen: the grid (drawn on a canvas with DawnLike tiles and sprites), the turn
// order, the hero's Hit Points, the action bar and the fight log.
//
// On the hero's turn, lit squares show where they can move: tap one to go there. Every action
// button says what it does, and every attack its chance to hit, damage and reach. Choose an
// attack, then a foe (on the grid or in the list) to attack it; each foe's button shows the
// chance to hit first. Other actions, Bonus Actions and End Turn sit under the attacks.
//
// Whatever follows a choice plays out a line at a time, at the Battle speed set in Settings:
// each turn is announced, creatures walk square by square, damage pops up over whoever took
// it, and the line being played shows under the grid. Skip shows the rest at once. The fight
// itself is already decided and saved; this only shows it.

import * as fight from '../combat/battle.js';
import { key } from '../combat/grid.js';
import { heroSprite } from '../character/look.js';
import { featureUsesLeft, featureUsesMax, maxHp, slotsLeft } from '../character/resources.js';
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

  // option: the attack chosen, waiting for a target. replaying: lines are playing out, and
  // scene is what the grid shows meanwhile (null: the fight as it stands). walkers: creatures
  // part-way between squares. popups: damage and healing numbers over creatures. caption: the
  // line playing now; lastCaption: the last thing that happened, shown between turns.
  const view = {
    option: null,
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
  panel.append(header, order, objective, canvas, caption, help, controls, logList);
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
    const foe = fight.enemies(game.battle).find((c) => c.hp > 0 && c.pos.x === pos.x && c.pos.y === pos.y);
    if (foe && view.option) return act(() => fight.heroAttack(game, view.option, foe.id));
    if (!foe && fight.heroReachable(game).has(key(pos))) act(() => fight.heroMove(game, pos));
  });

  // Runs one of the hero's actions and saves, then plays out whatever followed.
  async function act(action) {
    if (view.replaying) return;
    const before = fight.battleScene(game);
    try {
      action();
    } catch (error) {
      help.textContent = error.message;
      return;
    }
    view.option = null;
    onSave(game);
    await replay(before);
    render();
    onShown();
  }

  // ---- Playing out what happened ----

  // Plays the log lines not shown yet, one at a time: walks, then the line, then a pause.
  // before: the scene before the first of them, when known.
  async function replay(before = null) {
    const log = game.battle ? game.battle.log : [];
    if (view.shown >= log.length) return;
    const previous = view.shown > 0 ? fight.replayOf(log[view.shown - 1]) : null;
    const first = fight.replayOf(log[view.shown]);
    view.scene = copyScene(before || (previous && previous.scene) || (first && first.scene) || fight.battleScene(game));
    view.replaying = true;
    view.skip = false;
    clearPopups();
    render();
    bringIntoView();
    while (view.shown < log.length) {
      const entry = log[view.shown];
      const info = fight.replayOf(entry);
      if (info) {
        if (!view.skip) for (const move of info.moves) await walk(move);
        view.popups = view.skip ? [] : changesBetween(view.scene, info.scene);
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

  // Walks a creature along its path, a square at a time.
  async function walk(move) {
    const unit = view.scene.units.find((u) => u.id === move.id);
    if (!unit) return;
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
      el('span', 'battle-hp', `HP ${hero.hp}/${maxHp(game.character)}`),
    );
    objective.textContent = fight.objectiveText(battle);
    order.replaceChildren(
      ...battle.order
        .map((id) => scene.units.find((u) => u.id === id))
        .filter(Boolean)
        .map((unit) => {
          const c = fight.combatantById(battle, unit.id);
          const down = c.side === 'enemy' ? unit.hp <= 0 : scene.heroState !== 'up';
          const name = c.side === 'hero' ? 'You' : c.name;
          let label = !down && unit.prone ? `${name} (Prone)` : name;
          if (unit.escaped) label = `${name} (fled)`;
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
    help.textContent = chosen
      ? `${chosen.name}: choose a foe to attack. Tap it on the grid, or below.`
      : turn.athleteMove
        ? `Remarkable Athlete: tap a gold square to move up to ${turn.athleteMove} feet without provoking Opportunity Attacks, or carry on.`
        : prone
          ? `You're Prone: your attacks have Disadvantage, and foes beside you have Advantage. Stand up for ${fight.heroStandCost(game)} feet of movement, or crawl (${turn.movementLeft} feet left, each square costs double).`
          : `Your turn. Tap a lit square to move (${turn.movementLeft} feet left), or choose an action.`;

    const attacks = actionGroup(turn.action ? 'Attack (action used)' : 'Attack');
    for (const option of options) {
      const what = attackSummary(option, { slotsLeft: (level) => slotsLeft(game, level) }).join(' · ');
      const card = actionCard(option.name, what, () => {
        view.option = view.option === option.id ? null : option.id;
        render();
      });
      card.setAttribute('aria-pressed', String(view.option === option.id));
      // Action Surge's extra action can't cast a spell.
      card.disabled = turn.action || (turn.surged && option.source === 'spell');
      attacks.list.append(card);
    }
    controls.append(attacks.group);

    if (chosen) {
      const targets = actionGroup(`Target for ${chosen.name}`);
      for (const foe of fight.enemies(battle).filter((c) => c.hp > 0)) {
        const preview = fight.attackPreview(game, chosen.id, foe.id);
        const card = actionCard(foe.name, targetText(preview), () => act(() => fight.heroAttack(game, chosen.id, foe.id)));
        card.disabled = !preview.inRange;
        card.title = preview.describe;
        targets.list.append(card);
      }
      controls.append(targets.group);
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
    if (bonuses.length) {
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
      controls.append(bonus.group);
    }

    controls.append(actionCard('End turn', 'Your foes take their turns', () => act(() => fight.endHeroTurn(game)), 'is-primary'));
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
      ctx.lineWidth = scale;
      for (const step of fight.heroReachable(game).values()) {
        if (step.cost === 0) continue;
        ctx.fillStyle = step.free ? 'rgba(240, 200, 90, 0.35)' : 'rgba(222, 238, 214, 0.32)';
        ctx.strokeStyle = step.free ? 'rgba(240, 200, 90, 0.9)' : 'rgba(222, 238, 214, 0.85)';
        const inset = 2 * scale;
        ctx.fillRect(step.pos.x * size + inset, step.pos.y * size + inset, size - 2 * inset, size - 2 * inset);
        ctx.strokeRect(step.pos.x * size + inset + scale / 2, step.pos.y * size + inset + scale / 2, size - 2 * inset - scale, size - 2 * inset - scale);
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
    drawHealthBar(ctx, heroAt, hero.hp / maxHp(game.character), size, scale);

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

// Each creature's Hit Points that went down (damage) or up (healing) between two scenes.
function changesBetween(before, after) {
  const popups = [];
  for (const unit of after.units) {
    const was = before.units.find((u) => u.id === unit.id);
    if (!was || was.hp === unit.hp) continue;
    if (unit.hp < was.hp) popups.push({ id: unit.id, text: `-${was.hp - unit.hp}`, color: DAMAGE_COLOR });
    else popups.push({ id: unit.id, text: `+${unit.hp - was.hp}`, color: HEALING_COLOR });
  }
  return popups;
}

function copyScene(scene) {
  return { ...scene, units: scene.units.map((u) => ({ ...u, pos: { ...u.pos } })) };
}

// "65% to hit · Advantage: Pack Tactics", "80% it fails the save", "Out of range".
function targetText(preview) {
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
