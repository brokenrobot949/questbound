// The battle screen: the grid (drawn on a canvas with DawnLike tiles and sprites), the turn
// order, the hero's Hit Points, the action bar and the fight log.
//
// On the hero's turn, lit squares show where they can move: tap one to go there. Choose an
// attack, then a foe (on the grid or in the list) to attack it; each foe's button shows the
// chance to hit first. Other actions, Bonus Actions and End Turn sit under the attacks.
// Enemy turns play out a line at a time in the log.

import * as fight from '../combat/battle.js';
import { key } from '../combat/grid.js';
import { heroSprite } from '../character/look.js';
import { featureUsesLeft, featureUsesMax, maxHp } from '../character/resources.js';
import { sprites } from '../../../data/campaign/sprites.js';
import { blit, drawCell, drawTile, frameSquare, loadArt, pixelScale, sizeCanvas, spriteImage, TILE } from './tile-art.js';
import { rollLine } from './roll-format.js';
import { el } from './dom.js';

const LINE_MS = 450; // how long each line of an enemy's turn waits before the next
const FRAME_MS = 500;

// container: where to draw. onSave(game) after every action. onDone(): the player has seen
// the end of the fight and wants to carry on with the story.
export async function showBattle({ container, game, onSave, onDone }) {
  const art = await loadArt();
  const look = heroSprite(game.character);
  const heroFrames = look.frames.map((rows) => spriteImage(look, rows));
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const view = { option: null, revealing: false, shownLog: 0, frame: 0 };
  const panel = el('section', 'battle');
  panel.setAttribute('aria-label', 'Battle');
  const header = el('div', 'battle-header');
  const order = el('ol', 'battle-order');
  order.setAttribute('aria-label', 'Turn order');
  const canvas = el('canvas', 'battle-grid');
  canvas.setAttribute('role', 'img');
  const help = el('p', 'battle-help');
  const controls = el('div', 'battle-controls');
  const logList = el('ol', 'battle-log');
  logList.setAttribute('aria-live', 'polite');
  panel.append(header, order, canvas, help, controls, logList);
  container.replaceChildren(panel);

  const timer = reduceMotion
    ? null
    : setInterval(() => {
        if (!canvas.isConnected) return clearInterval(timer);
        view.frame += 1;
        draw();
      }, FRAME_MS);

  canvas.addEventListener('click', (event) => {
    if (view.revealing || !fight.isHeroTurn(game)) return;
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

  // Runs one of the hero's actions, saves, then shows whatever followed, a line at a time.
  async function act(action) {
    try {
      action();
    } catch (error) {
      help.textContent = error.message;
      return;
    }
    view.option = null;
    onSave(game);
    await revealLog();
    render();
  }

  async function revealLog() {
    const log = game.battle ? game.battle.log : [];
    view.revealing = true;
    render();
    while (view.shownLog < log.length) {
      appendLogLine(log[view.shownLog]);
      view.shownLog += 1;
      if (view.shownLog < log.length) await wait(LINE_MS);
    }
    view.revealing = false;
  }

  function appendLogLine(entry) {
    const item = el('li', 'battle-log-line');
    item.append(el('span', '', entry.text));
    if (entry.roll) item.append(el('span', 'battle-roll', rollLine(entry.roll)));
    logList.append(item);
    while (logList.children.length > 12) logList.firstChild.remove();
    item.scrollIntoView({ block: 'nearest' });
  }

  function render() {
    const battle = game.battle;
    const current = fight.currentCombatant(battle);
    const yourTurn = fight.isHeroTurn(game) && !view.revealing;

    header.replaceChildren(
      el('span', 'battle-round', `Round ${battle.round}`),
      el('span', 'battle-hp', `HP ${game.hp}/${maxHp(game.character)}`),
    );
    order.replaceChildren(
      ...battle.order.map((id) => {
        const c = fight.combatantById(battle, id);
        const down = c.side === 'enemy' ? c.hp <= 0 : battle.heroState !== 'up';
        const name = c.side === 'hero' ? 'You' : c.name;
        const label = !down && fight.isProne(battle, c.id) ? `${name} (Prone)` : name;
        const item = el('li', `battle-order-entry${c === current ? ' is-current' : ''}${down ? ' is-down' : ''}`, label);
        return item;
      }),
    );

    controls.replaceChildren();
    if (battle.outcome) {
      help.textContent = '';
      controls.append(outcomeCard(battle));
    } else if (yourTurn) {
      renderHeroControls();
    } else {
      help.textContent = view.revealing ? '' : `${current.side === 'hero' ? 'You' : current.name}…`;
    }
    canvas.setAttribute('aria-label', describeGrid());
    draw();
  }

  function renderHeroControls() {
    const battle = game.battle;
    const turn = battle.turnState;
    const prone = fight.isProne(battle, 'hero');
    help.textContent = view.option
      ? 'Choose a foe to attack: tap it on the grid or below.'
      : turn.athleteMove
        ? `Remarkable Athlete: tap a gold square to move up to ${turn.athleteMove} feet without provoking Opportunity Attacks, or carry on.`
        : prone
          ? `You're Prone: your attacks have Disadvantage, and foes beside you have Advantage. Stand up for ${fight.heroStandCost(game)} feet of movement, or crawl (${turn.movementLeft} feet left, each square costs double).`
          : `Your turn. Tap a lit square to move (${turn.movementLeft} feet left), or choose an action.`;

    const options = fight.heroAttackOptions(game);
    const attacks = el('div', 'battle-row');
    attacks.append(el('span', 'battle-row-label', turn.action ? 'Action (used)' : 'Attack'));
    for (const option of options) {
      const button = battleButton(option.name, () => {
        view.option = view.option === option.id ? null : option.id;
        render();
      });
      button.setAttribute('aria-pressed', String(view.option === option.id));
      // Action Surge's extra action can't cast a spell.
      button.disabled = turn.action || (turn.surged && option.source === 'spell');
      attacks.append(button);
    }
    controls.append(attacks);

    if (view.option) {
      const targets = el('div', 'battle-row');
      targets.append(el('span', 'battle-row-label', 'Target'));
      for (const foe of fight.enemies(battle).filter((c) => c.hp > 0)) {
        const preview = fight.attackPreview(game, view.option, foe.id);
        const label = preview.inRange
          ? `${foe.name}: ${Math.round(preview.chance * 100)}%${preview.mode !== 'normal' ? ` (${preview.mode})` : ''}`
          : `${foe.name}: out of range`;
        const button = battleButton(label, () => act(() => fight.heroAttack(game, view.option, foe.id)));
        button.disabled = !preview.inRange;
        button.title = [preview.describe, ...preview.advantage, ...preview.disadvantage].filter(Boolean).join(' · ');
        targets.append(button);
      }
      controls.append(targets);
    }

    // Standing up from Prone uses movement, not an action.
    if (prone) {
      const stand = el('div', 'battle-row');
      stand.append(el('span', 'battle-row-label', 'Movement'));
      const button = battleButton(`Stand up (${fight.heroStandCost(game)} feet)`, () => act(() => fight.heroStandUp(game)));
      button.disabled = !fight.heroCanStand(game);
      stand.append(button);
      controls.append(stand);
    }

    const other = el('div', 'battle-row');
    other.append(el('span', 'battle-row-label', 'Other'));
    for (const [label, run] of [
      ['Dash', fight.heroDash],
      ['Disengage', fight.heroDisengage],
      ['Dodge', fight.heroDodge],
    ]) {
      const button = battleButton(label, () => act(() => run(game)));
      button.disabled = turn.action;
      other.append(button);
    }
    // Fighters from level 2: Action Surge, once the turn's action is used.
    if (featureUsesMax(game.character, 'action-surge')) {
      const left = featureUsesLeft(game, 'action-surge');
      const surge = battleButton(left ? 'Action Surge' : 'Action Surge (spent)', () => act(() => fight.heroActionSurge(game)));
      surge.disabled = !fight.heroCanSurge(game);
      surge.title = 'One more action this turn (not a spell). Comes back after a rest.';
      other.append(surge);
    }
    controls.append(other);

    const bonuses = fight.heroBonusActions(game);
    if (bonuses.length) {
      const bonus = el('div', 'battle-row');
      bonus.append(el('span', 'battle-row-label', turn.bonus ? 'Bonus (used)' : 'Bonus'));
      if (bonuses.includes('second-wind')) bonus.append(disabledIf(turn.bonus, battleButton('Second Wind', () => act(() => fight.heroSecondWind(game)))));
      if (bonuses.includes('potion')) bonus.append(disabledIf(turn.bonus, battleButton('Drink a Potion of Healing', () => act(() => fight.heroDrinkPotion(game)))));
      controls.append(bonus);
    }

    const end = battleButton('End turn', () => act(() => fight.endHeroTurn(game)), 'is-primary');
    controls.append(end);
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
    const map = fight.battleMap(battle);
    const scale = pixelScale(map.width, panel);
    const ctx = sizeCanvas(canvas, map.width, map.height, scale);
    const size = TILE * scale;
    const frame = view.frame % 2;

    // Floor, walls and things on the floor.
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) drawCell(ctx, art, map, x, y, size);
    }

    // Where the hero can move, and who they can hit.
    if (fight.isHeroTurn(game) && !view.revealing) {
      // A pale wash with a bright edge, so it shows on wood and stone alike. Gold squares are
      // a free move (Remarkable Athlete).
      ctx.lineWidth = scale;
      if (!view.option) {
        for (const step of fight.heroReachable(game).values()) {
          if (step.cost === 0) continue;
          ctx.fillStyle = step.free ? 'rgba(240, 200, 90, 0.35)' : 'rgba(222, 238, 214, 0.32)';
          ctx.strokeStyle = step.free ? 'rgba(240, 200, 90, 0.9)' : 'rgba(222, 238, 214, 0.85)';
          const inset = 2 * scale;
          ctx.fillRect(step.pos.x * size + inset, step.pos.y * size + inset, size - 2 * inset, size - 2 * inset);
          ctx.strokeRect(step.pos.x * size + inset + scale / 2, step.pos.y * size + inset + scale / 2, size - 2 * inset - scale, size - 2 * inset - scale);
        }
      }
    }

    // Creatures: the fallen first, so the standing are drawn on top.
    const hero = fight.heroCombatant(battle);
    const foes = fight.enemies(battle).sort((a, b) => (a.hp > 0) - (b.hp > 0));
    for (const foe of foes) {
      const sprite = sprites[findMonsterSprite(foe)];
      // The fallen lie faded on their side; the Prone lie on their side.
      const standing = foe.hp > 0;
      drawTile(ctx, art, sprite, foe.pos.x, foe.pos.y, size, standing ? frame : 0, {
        alpha: standing ? 1 : 0.35,
        lying: !standing || fight.isProne(battle, foe.id),
      });
      if (foe.hp > 0) drawHealthBar(ctx, foe.pos, foe.hp / foe.maxHp, size, scale);
      if (view.option && foe.hp > 0) {
        const preview = fight.attackPreview(game, view.option, foe.id);
        if (preview && preview.inRange) frameSquare(ctx, foe.pos, size, scale, '#ff8a7a');
      }
    }
    const up = battle.heroState === 'up';
    blit(ctx, heroFrames[up ? frame : 0], 0, 0, hero.pos.x, hero.pos.y, size, { alpha: up ? 1 : 0.5, lying: !up || fight.isProne(battle, 'hero') });
    drawHealthBar(ctx, hero.pos, game.hp / maxHp(game.character), size, scale);

    const current = fight.currentCombatant(battle);
    if (!battle.outcome) frameSquare(ctx, current.pos, size, scale, '#f0c85a');
  }

  function describeGrid() {
    const battle = game.battle;
    const hero = fight.heroCombatant(battle);
    const foes = fight.enemies(battle).filter((c) => c.hp > 0).map((c) => `${c.name} ${squares(hero.pos, c.pos)} away`);
    return `Battle grid. ${foes.length ? foes.join(', ') : 'No foes standing'}.`;
  }

  // What already happened shows at once (after a reload, say); only new lines are paced.
  logList.replaceChildren();
  for (const entry of game.battle.log) appendLogLine(entry);
  view.shownLog = game.battle.log.length;
  render();
}

function findMonsterSprite(foe) {
  return fight.findMonster(foe.monsterId).sprite;
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
