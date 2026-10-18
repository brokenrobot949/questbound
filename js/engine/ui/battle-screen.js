// The battle screen: the grid (drawn on a canvas with DawnLike tiles and sprites), the turn
// order, the hero's Hit Points, the action bar and the fight log.
//
// On the hero's turn, lit squares show where they can move: tap one to go there. Every action
// button says what it does, and every attack its chance to hit, damage and reach. Choose an
// attack, then a foe (on the grid or in the list) to attack it; each foe's button shows the
// chance to hit first. Spells have a button each: choose one, pick the spell slot to use (or
// a free cast), then aim it. An area spell shows the squares it would cover in orange (it
// starts aimed at the most foes it can catch without you); tap the grid to aim it elsewhere,
// then Cast. Misty Step lights the squares it can reach in purple. A spell that helps
// (healing, Mage Armor, Sanctuary) has a Cast button when you're alone; with companions it
// lists the party (you first) to choose who it goes on, greying out whoever it can't reach or
// wouldn't help, and you can tap them on the grid instead (framed in green). A spell for the
// whole party in range (Bless, Aid) says who it will catch. A Potion of Healing works the same
// way: drink it, or give it to a friend beside you. Allies who aren't in the party (the Old
// Ford's soldiers, framed in pale blue) are in those lists for healing, a potion and Lesser
// Restoration, after the party. With companions or allies, Help (under Other
// actions) lists the foes beside you to distract and the fallen friends beside you to give
// first aid; tap one there or on the grid. Other actions, Bonus Actions and
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
import { rollLine, signedNumber } from './roll-format.js';
import { skillBonus } from '../character/sheet.js';
import { findPerson, personSprite } from './speakers.js';
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
// The frame round whoever a spell that helps can go on.
const FRIEND_FRAME = '#7fd99a';
// A faint frame round an ally who isn't in the party (the Old Ford's soldiers).
const ALLY_FRAME = 'rgba(150, 190, 255, 0.55)';

// Washes over squares on the grid: an area spell's reach, and where Misty Step can go.
const AREA_WASH = ['rgba(240, 140, 60, 0.35)', 'rgba(240, 140, 60, 0.9)'];
const TELEPORT_WASH = ['rgba(180, 140, 230, 0.35)', 'rgba(180, 140, 230, 0.9)'];
const HIDING_WASH = ['rgba(60, 110, 235, 0.5)', 'rgba(120, 170, 255, 1)'];
// Spirit Guardians' reach round their caster.
const GUARDIAN_GLOW = 'rgba(255, 225, 120, 0.2)';
const GUARDIAN_EDGE = 'rgba(255, 236, 160, 0.95)';
// Tints under a creature with a condition, and words for the turn order.
const CONDITION_TINTS = {
  paralyzed: 'rgba(180, 140, 230, 0.45)',
  charmed: 'rgba(240, 150, 210, 0.45)', // Hypnotic Pattern
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
  ['charmed', 'Charmed'],
  ['turned', 'Turned'],
  ['blinded', 'Blinded'],
  ['grovel', 'Commanded: Grovel'],
  ['halt', 'Commanded: Halt'],
  ['baned', 'Baned'],
  ['poisoned', 'Poisoned'],
  ['outlined', 'Outlined'],
  ['guided', 'Glowing'],
  ['vexed', 'Vexed'],
  ['sapped', 'Sapped'],
  ['slowed', 'Slowed'],
  ['hidden', 'Hidden'],
  ['blessed', 'Blessed'],
  ['sanctuary', 'Sanctuary'],
  ['shield-of-faith', 'Shield of Faith'],
  ['resisting', 'Resistance'],
  ['helped', 'Distracted'],
];

// How someone in the party is doing at 0 Hit Points, in the turn order and the status line.
const STATE_WORDS = { down: 'down', stable: 'stable', dead: 'dead' };

// Log lines already played on screen during this visit, so nothing plays twice.
const played = new WeakSet();

// container: where to draw. onSave(game) after every action, before it plays out.
// onShown(): an action has finished playing out (the status line can catch up).
// onDone(): the player has seen the end of the fight and wants to carry on with the story.
export async function showBattle({ container, game, onSave, onShown = () => {}, onDone }) {
  const art = await loadArt();
  const look = heroSprite(game.character);
  const heroFrames = look.frames.map((rows) => spriteImage(look, rows));
  // A companion's two frames, drawn from their sheet once.
  const companionArt = new Map();
  const companionFrames = (c) => {
    if (!companionArt.has(c.id)) {
      const sprite = heroSprite(fight.actorGame(game, c).character);
      companionArt.set(c.id, sprite.frames.map((rows) => spriteImage(sprite, rows)));
    }
    return companionArt.get(c.id);
  };
  // People watching from the side who aren't in the fight (Lark on her ledge), drawn as they
  // look in scenes, unless they aren't there this time (battle.absentOnlookers).
  const absent = game.battle.absentOnlookers || [];
  const people = (fight.findEncounter(game.battle.encounterId).onlookers || [])
    .filter((o, i) => o.person && !absent.includes(i))
    .map((o) => {
      const sprite = personSprite(findPerson(o.person));
      return { pos: o.pos, lying: Boolean(o.lying), image: spriteImage(sprite, sprite.frames[0]) };
    });
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // option: the attack or spell chosen, waiting to be aimed; aim: where an area spell is aimed
  // ({ direction } or { at }); potion: a Potion of Healing chosen, waiting for whom to give it
  // to (with companions); help: the Help action chosen, waiting for whom to help with.
  // replaying: lines are playing out, and scene is what the grid
  // shows meanwhile (null: the fight as it stands). walkers: creatures part-way between
  // squares. popups: damage and healing numbers over creatures. flash: squares a spell just
  // covered. caption: the line playing now; lastCaption: the last thing that happened, shown
  // between turns.
  const view = {
    option: null,
    aim: null,
    potion: false,
    help: false,
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
    // A spell that helps, or a potion: tap the friend it's for.
    // Help: tap a foe beside you, or a fallen friend.
    if (view.help) {
      const choice = fight.helpTargets(game).find(({ c }) => c.pos.x === pos.x && c.pos.y === pos.y);
      if (!choice) return;
      if (choice.problem) {
        help.textContent = choice.problem;
        return;
      }
      return act(() => fight.heroHelp(game, choice.c.id));
    }
    if (aiming === 'friend' || view.potion) {
      const friend = fight.friendTargets(game, view.potion ? 'potion' : chosen.id).find(({ c }) => c.pos.x === pos.x && c.pos.y === pos.y);
      if (!friend) return;
      if (friend.problem) {
        help.textContent = friend.problem;
        return;
      }
      return act(() => (view.potion ? fight.heroDrinkPotion(game, friend.c.id) : fight.heroCastOn(game, chosen.id, friend.c.id)));
    }
    if (aiming === 'self' || aiming === 'nearest' || aiming === 'party' || aiming === 'dispel') return;
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
    view.potion = false;
    view.help = false;
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
    // Each companion's Hit Points, or how they're doing at 0.
    for (const c of fight.companionCombatants(battle)) {
      const unit = scene.units.find((u) => u.id === c.id);
      const max = fight.maxHpOf(game, c);
      notes.push(unit.state === 'up' ? `${c.name} ${unit.hp}/${max}` : `${c.name} ${STATE_WORDS[unit.state]}`);
      if (unit.concentrating) notes.push(`${c.name} concentrating on ${unit.concentrating}`);
    }
    if (scene.concentration) notes.push(`Concentrating on ${scene.concentration}`);
    if (heroConditions.includes('held')) notes.push('Held by Hold Person: you can’t move or act, until a Wisdom save at the end of your turn breaks it');
    else if (heroConditions.includes('paralyzed')) notes.push('Paralyzed: you can’t move or act');
    if (heroConditions.includes('grovel')) notes.push('Commanded: on your turn you’ll grovel, and the turn ends');
    if (heroConditions.includes('halt')) notes.push('Commanded: on your turn you’ll halt, and do nothing');
    if (heroConditions.includes('blessed')) notes.push('Blessed: +1d4 to attacks and saves');
    if (heroConditions.includes('sanctuary')) notes.push('Sanctuary: foes must save to attack you');
    if (heroConditions.includes('shield')) notes.push('Shield up: +5 AC');
    if (heroConditions.includes('shield-of-faith')) notes.push('Shield of Faith: +2 AC');
    if (heroConditions.includes('resisting')) {
      // (While a turn plays out, the scene can be a moment behind the fight itself.)
      const ward = battle.effects.find((e) => e.target === 'hero' && e.kind === 'resisting');
      notes.push(ward ? `Resistance: 1d4 less ${ward.damageType} damage once a turn` : 'Resistance');
    }
    if ((scene.weapons || []).some((w) => w.by === 'hero')) notes.push('Spiritual Weapon: strikes as a Bonus Action');
    const guardians = (scene.auras || []).find((a) => a.by === 'hero');
    if (guardians) notes.push(`Spirit Guardians: foes within ${guardians.radius} feet of you are slowed and burned`);
    for (const unit of scene.units.filter((u) => u.clinging === 'hero')) {
      notes.push(`${fight.combatantById(battle, unit.id).name} is clinging to you, drinking each turn: pull it off (an action), or kill it`);
    }
    if (heroConditions.includes('charmed')) notes.push('Charmed: you can’t move or act until you’re hurt or shaken out of it');
    if (heroConditions.includes('outlined')) notes.push('Outlined: attacks on you have Advantage');
    if (heroConditions.includes('dodging')) notes.push('Dodging');
    if (hero.temp) notes.push(`${hero.temp} Temporary Hit Points`);
    if (yourTurn && battle.turnState.aimed) notes.push('Steady Aim: Advantage on your next attack');
    if (heroConditions.includes('hidden')) notes.push('Hidden: your attacks have Advantage until you attack or cast a spell');
    if (game.inspiration) notes.push('★ Heroic Inspiration');
    status.textContent = notes.join(' · ');
    objective.textContent = fight.objectiveText(battle);
    order.replaceChildren(
      ...battle.order
        .map((id) => scene.units.find((u) => u.id === id))
        .filter(Boolean)
        .map((unit) => {
          const c = fight.combatantById(battle, unit.id);
          const down = c.side === 'enemy' ? unit.hp <= 0 : unit.state !== 'up';
          const name = fight.isHero(c) ? 'You' : c.name;
          const conditions = unit.conditions || [];
          const tags = [];
          if (unit.escaped) tags.push('fled');
          else if (c.side === 'hero' && down) tags.push(STATE_WORDS[unit.state]);
          else if (!down) {
            // Paralyzed by Hold Person shows as Held.
            for (const [kind, word] of CONDITION_WORDS) if (conditions.includes(kind)) tags.push(kind === 'paralyzed' && conditions.includes('held') ? 'Held' : word);
            if (unit.prone && !conditions.includes('asleep')) tags.push('Prone');
            // What a foe is concentrating on (hurting it may end it).
            if (c.side === 'enemy' && unit.concentrating) tags.push(`concentrating on ${unit.concentrating}`);
            // A Stirge clinging on, and to whom.
            if (unit.clinging) tags.push(`clinging to ${unit.clinging === 'hero' ? 'you' : fight.combatantById(battle, unit.clinging).name}`);
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
      help.textContent = `${fight.isHero(current) ? 'You' : current.name}…`;
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
      : view.help
        ? 'Help: distract a foe beside you, so a friend’s next attack on it has Advantage, or give a fallen friend beside you first aid. Tap them on the grid, or below.'
        : view.potion
        ? 'Potion of Healing: drink it, or give it to a friend beside you. Tap them on the grid, or below.'
        : turn.athleteMove
        ? `${turn.freeMoveFrom || 'Remarkable Athlete'}: tap a gold square to move up to ${turn.athleteMove} feet without provoking Opportunity Attacks, or carry on.`
        : prone
          ? `You're Prone: your attacks have Disadvantage, and foes beside you have Advantage. Stand up for ${fight.heroStandCost(game)} feet of movement, or crawl (${turn.movementLeft} feet left, each square costs double).`
          : `Your turn. Tap a lit square to move (${turn.movementLeft} feet left), or choose an action.${hidingSquares() ? ' Blue squares are out of every foe’s sight.' : ''}`;
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
        view.potion = false;
        view.help = false;
        render();
      });
      card.setAttribute('aria-pressed', String(pressed));
      const why = fight.heroCantUse(game, option.id);
      card.disabled = Boolean(why);
      if (why) card.title = why;
      return card;
    };

    // Weapons, and the Light property's extra attack when Nick makes it part of the Attack
    // action (otherwise it's under Bonus Action).
    const weapons = options.filter((o) => o.source === 'weapon' && !o.bonusAction);
    if (weapons.length) {
      // Extra Attack: the Attack action's second attack is still to come.
      const more = turn.attacksLeft || 0;
      const label = more > 0 ? `Attack (${more} more: Extra Attack)` : turn.action ? 'Attack (action used)' : 'Attack';
      const attacks = actionGroup(label);
      for (const option of weapons) attacks.list.append(choiceCard(option));
      controls.append(attacks.group);
      if (chosen && chosen.source === 'weapon' && !chosen.bonusAction) controls.append(aimPanel(chosen, options));
      // A Rogue's Cunning Strike switch (level 5): it changes their next hit with Sneak Attack.
      if (fight.hasCunningStrike(game)) controls.append(cunningRow());
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
    other.list.append(hideCard({ bonus: false }));
    // With companions: Help, to set up a friend's attack or give a fallen friend first aid.
    if (company()) {
      const why = fight.heroHelpProblem(game);
      const card = actionCard('Help', 'Distract a foe beside you: a friend’s next attack on it has Advantage. Or first aid for a fallen friend beside you (DC 10 Medicine)', () => {
        view.help = !view.help;
        view.option = null;
        view.aim = null;
        view.potion = false;
        render();
      });
      card.setAttribute('aria-pressed', String(view.help));
      card.disabled = Boolean(why);
      if (why) card.title = why;
      other.list.append(card);
    }
    // A Stirge clinging to you, or to a friend beside you: pull it off.
    for (const { foe, host } of fight.pullOffTargets(game)) {
      const off = fight.isHero(host) ? `Pull ${foe.name} off you` : `Pull ${foe.name} off ${host.name}`;
      const card = actionCard(off, 'It stops drinking, but it’s free to strike again on its turn', () => act(() => fight.heroPullOff(game, foe.id)));
      card.disabled = turn.action;
      other.list.append(card);
    }
    // Calling a foe by its true name, if the story taught it (Dame Aveline, in the chantry).
    const call = fight.nameCall(game);
    if (call) {
      const card = actionCard(call.action, call.what, () => act(() => fight.heroCallByName(game)));
      card.disabled = Boolean(call.problem);
      if (call.problem) card.title = call.problem;
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
    if (view.help && !turn.action) controls.append(helpPanel());

    const bonuses = fight.heroBonusActions(game);
    const bonusSpells = firstOfEach(options.filter((o) => o.source === 'spell' && o.bonusAction));
    const bonusWeapons = options.filter((o) => o.source === 'weapon' && o.bonusAction);
    if (bonuses.length || bonusSpells.length || bonusWeapons.length) {
      const bonus = actionGroup(turn.bonus ? 'Bonus Action (used)' : 'Bonus Action');
      if (bonuses.includes('second-wind')) {
        const level = game.character.level;
        const what = `Regain 1d10 + ${level} Hit Points (${averageText(5.5 + level)} on average) · ${featureUsesLeft(game, 'second-wind')} left until you rest`;
        bonus.list.append(disabledIf(turn.bonus, actionCard('Second Wind', what, () => act(() => fight.heroSecondWind(game)))));
      }
      if (bonuses.includes('potion')) {
        // Alone, drink it straight away; with companions, choose who it's for.
        const potions = game.inventory.find((e) => e.id === 'potion-of-healing').quantity;
        if (company()) {
          const what = `2d4 + 2 Hit Points (7 on average): drink it, or give it to a friend beside you · ${potions} in your pack`;
          const card = actionCard('Potion of Healing', what, () => {
            view.potion = !view.potion;
            view.option = null;
            view.aim = null;
            view.help = false;
            render();
          });
          card.setAttribute('aria-pressed', String(view.potion));
          bonus.list.append(disabledIf(turn.bonus, card));
        } else {
          const what = `Regain 2d4 + 2 Hit Points (7 on average) · ${potions} in your pack`;
          const card = actionCard('Drink a Potion of Healing', what, () => act(() => fight.heroDrinkPotion(game)));
          const why = turn.bonus ? null : fight.friendTargets(game, 'potion')[0].problem;
          if (why) card.title = why;
          bonus.list.append(disabledIf(turn.bonus || Boolean(why), card));
        }
      }
      // A Rogue's Cunning Action (level 2) and Steady Aim (level 3).
      if (bonuses.includes('cunning-action')) {
        bonus.list.append(disabledIf(turn.bonus, actionCard('Dash (Cunning Action)', 'More movement this turn: as much again as your Speed', () => act(() => fight.heroDash(game, { bonus: true })))));
        bonus.list.append(disabledIf(turn.bonus, actionCard('Disengage (Cunning Action)', 'Move away this turn without Opportunity Attacks', () => act(() => fight.heroDisengage(game, { bonus: true })))));
        bonus.list.append(hideCard({ bonus: true }));
      }
      if (bonuses.includes('steady-aim')) {
        const why = turn.moved ? ' (you’ve moved this turn)' : '';
        const aim = actionCard('Steady Aim', `Advantage on your next attack this turn, but you can’t move again this turn. Only before you move${why}`, () => act(() => fight.heroSteadyAim(game)));
        aim.disabled = !fight.heroCanSteadyAim(game);
        bonus.list.append(aim);
      }
      for (const option of [...bonusWeapons, ...bonusSpells]) bonus.list.append(choiceCard(option));
      controls.append(bonus.group);
      if (chosen && chosen.bonusAction) controls.append(aimPanel(chosen, options));
      if (view.potion && !turn.bonus) controls.append(potionPanel());
    }

    // A fight well under the party's strength can be played out at once.
    if (canResolve(game)) {
      const what = company()
        ? 'Well under your party’s strength: play the fight out at once, with real rolls. You use weapons and cantrips only, no spell slots or features; it stops if anyone drops below half their Hit Points.'
        : 'Well under your strength: play the fight out at once, with real rolls. Weapons and cantrips only, no spell slots or features; it stops if you drop below half your Hit Points.';
      controls.append(actionCard('Resolve', what, () => act(() => resolveFight(game), { instant: true })));
    }
    controls.append(actionCard('End turn', 'Your foes take their turns', () => act(() => fight.endHeroTurn(game)), 'is-primary'));
  }

  // The Cunning Strike switch: None, Trip or Withdraw. It stays as set (for this fight) until
  // changed, and works on the next hit that gets Sneak Attack.
  function cunningRow() {
    const group = actionGroup('Cunning Strike (your next Sneak Attack)');
    const now = game.battle.cunningStrike || null;
    const dc = fight.cunningStrikeDc(game.character);
    const choices = [
      [null, 'None', 'Keep every Sneak Attack die'],
      ['trip', 'Trip', `It makes a DC ${dc} Dex save or falls Prone (Large or smaller)`],
      ['withdraw', 'Withdraw', 'Then move half your Speed without Opportunity Attacks'],
    ];
    for (const [kind, name, what] of choices) {
      const card = actionCard(name, what, () => {
        fight.setCunningStrike(game, kind);
        onSave(game);
        render();
      });
      card.dataset.key = `cunning-${kind || 'none'}`;
      card.setAttribute('aria-pressed', String(now === kind));
      group.list.append(card);
    }
    return group.group;
  }

  // True if the hero can move somewhere out of every foe's sight this turn.
  function hidingSquares() {
    return [...fight.heroReachable(game).values()].some((step) => step.cost > 0 && !step.free && !fight.foesWatching(game, step.pos).length);
  }

  // Hide: an action for anyone, or a Bonus Action with a Rogue's Cunning Action. Greyed out
  // while a foe can see you, saying who.
  function hideCard({ bonus }) {
    const stealth = signedNumber(skillBonus(game.character, 'stealth').value);
    const what = `DC ${fight.HIDE_DC} Stealth (you have ${stealth}), out of every foe’s sight: walls and obstacles hide you. Hidden, your attacks have Advantage, and foes must find you first`;
    const why = fight.heroHideProblem(game, { bonus });
    const seen = why && why.includes('can see you');
    const card = actionCard(bonus ? 'Hide (Cunning Action)' : 'Hide', seen ? `${what}. ${why}` : what, () => act(() => fight.heroHide(game, { bonus })));
    card.disabled = Boolean(why);
    if (why) card.title = why;
    return card;
  }

  // What to do next with the chosen attack or spell.
  function aimHelp(option) {
    const name = spellName(option);
    if (option.targeting === 'direction') return `${name}: tap the grid on the side you want it to go. The orange squares are what it covers.`;
    if (option.targeting === 'point') return `${name}: tap the square to centre it on, up to ${option.range[1]} feet away. The orange squares are what it covers.`;
    if (option.how === 'turn') return `${name}: every Undead within 30 feet of you.`;
    if (option.how === 'aura') return `${name}: spirits wheel round you, ${option.radius} feet out, while you concentrate. Foes inside are slowed, and burned when they come in or end a turn there.`;
    if (option.how === 'dispel') return `${name}: choose the foe’s spell to end, below.`;
    if (option.targeting === 'nearest') return `${name}: the nearest ${option.targets} foes within ${option.range[1]} feet.`;
    if (option.targeting === 'self' || ((option.targeting === 'friend' || option.targeting === 'party') && !company())) return `${name}: on yourself.`;
    if (option.how === 'preserve') return `${name}: the Bloodied of your party within ${option.range[1]} feet, you included.`;
    if (option.targeting === 'party') return `${name}: you and your companions within ${option.range[1]} feet.`;
    if (option.targeting === 'friend') return `${name}: choose who. Tap them on the grid, or below.`;
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
      const caught = area ? area.caught.map((c) => (fight.isHero(c) ? 'you' : c.name)) : [];
      const what = !area ? 'Tap the grid to aim it first' : caught.length ? `Catches ${caught.join(', ')}` : 'Catches nobody';
      const friends = area ? area.caught.filter((c) => c.side === 'hero') : [];
      if (friends.length) box.append(el('p', 'battle-warning', `Careful: it catches ${friends.map((c) => (fight.isHero(c) ? 'you' : c.name)).join(' and ')} too.`));
      const cast = actionCard(`Cast ${spellName(chosen)}`, what, () => act(() => fight.heroCastArea(game, chosen.id, view.aim)), 'is-primary');
      cast.disabled = !area;
      box.append(cast);
    } else if (targeting === 'self' || ((targeting === 'friend' || targeting === 'party') && !company())) {
      box.append(actionCard(`Cast ${spellName(chosen)}`, '', () => act(() => fight.heroCastSelf(game, chosen.id)), 'is-primary'));
    } else if (targeting === 'friend') {
      box.append(friendList(`Who for ${spellName(chosen)}?`, fight.friendTargets(game, chosen.id), (c) => act(() => fight.heroCastOn(game, chosen.id, c.id)), chosen));
    } else if (targeting === 'party') {
      const caught = fight.partyTargets(game, chosen);
      const missed = fight.friendTargets(game, chosen.id).filter(({ c }) => !caught.includes(c));
      const what = caught.length ? `On ${caught.map((c) => (fight.isHero(c) ? 'you' : c.name)).join(', ')}` : 'Nobody it can help is in range';
      const cast = actionCard(`Cast ${spellName(chosen)}`, what, () => act(() => fight.heroCastSelf(game, chosen.id)), 'is-primary');
      cast.disabled = !caught.length;
      box.append(cast);
      for (const { problem } of missed) if (problem) box.append(el('p', 'battle-help', problem));
    } else if (targeting === 'dispel') {
      // Dispel Magic: a foe's Hold Person on a friend, or a foe's Spiritual Weapon.
      const targets = actionGroup(`What to end with ${spellName(chosen)}`);
      for (const target of fight.dispelTargets(game, chosen)) {
        const card = actionCard(target.name, target.problem || `Ends ${target.what}`, () => act(() => fight.heroDispel(game, chosen.id, target.key)));
        card.disabled = Boolean(target.problem);
        targets.list.append(card);
      }
      box.append(targets.group);
    } else if (targeting === 'nearest') {
      const targets = fight.nearestTargets(game, chosen);
      const what = targets.length ? `On ${targets.map((c) => c.name).join(', ')}` : `No foes within ${chosen.range[1]} feet`;
      const cast = actionCard(`Cast ${spellName(chosen)}`, what, () => act(() => fight.heroCastMulti(game, chosen.id)), 'is-primary');
      cast.disabled = !targets.length;
      box.append(cast);
    }
    return box;
  }

  // True if the hero has companions in this fight (alive or not), or allies (the Old Ford's
  // soldiers) to set up, heal or give a potion to.
  function company() {
    return fight.companionCombatants(game.battle).length > 0 || fight.allyCombatants(game.battle).length > 0;
  }

  // A list of the party to choose from: a button for each, saying how they are (Hit Points, and
  // for Lesser Restoration the conditions it can end), greyed out with the reason when the
  // spell or potion can't go on them.
  function friendList(label, friends, onPick, option = null) {
    const group = actionGroup(label);
    for (const { c, problem } of friends) {
      const unit = fight.battleScene(game).units.find((u) => u.id === c.id);
      const max = fight.maxHpOf(game, c);
      let state = unit.state === 'up' ? `${unit.hp} of ${max} Hit Points` : `${STATE_WORDS[unit.state]} at 0 Hit Points`;
      if (option && option.how === 'restore') {
        const words = CONDITION_WORDS.filter(([kind]) => option.ends.includes(kind) && unit.conditions.includes(kind)).map(([, word]) => word);
        if (words.length) state = `${words.join(', ')} · ${state}`;
      }
      const card = actionCard(fight.isHero(c) ? 'You' : c.name, problem || state, () => onPick(c));
      card.disabled = Boolean(problem);
      group.list.append(card);
    }
    return group.group;
  }

  // Under Help: the foes beside you to distract, and the fallen friends beside you to patch up.
  function helpPanel() {
    const box = el('div', 'battle-aim');
    const group = actionGroup('Help whom?');
    const medicine = signedNumber(skillBonus(game.character, 'medicine').value);
    for (const { c, kind, problem } of fight.helpTargets(game)) {
      const what = problem || (kind === 'distract' ? 'Distract it: a friend’s next attack on it has Advantage' : `First aid: DC 10 Medicine (you have ${medicine}) to make them Stable`);
      const card = actionCard(fight.isHero(c) ? 'You' : c.name, what, () => act(() => fight.heroHelp(game, c.id)));
      card.disabled = Boolean(problem);
      group.list.append(card);
    }
    box.append(group.group);
    return box;
  }

  // Under the Potion of Healing: who drinks it.
  function potionPanel() {
    const box = el('div', 'battle-aim');
    box.append(friendList('Who drinks it?', fight.friendTargets(game, 'potion'), (c) => act(() => fight.heroDrinkPotion(game, c.id))));
    return box;
  }

  function outcomeCard(battle) {
    const card = el('div', 'battle-outcome');
    const won = battle.outcome === 'victory';
    card.append(el('p', 'battle-outcome-title', won ? 'Victory!' : 'You have fallen…'));
    let after = won ? `You gain ${battle.xp} XP.` : 'But this isn’t the end of your story.';
    if (battle.practice) after = 'A practice fight (debug): it doesn’t count, so no XP, and everyone will be back as they were.';
    card.append(el('p', 'battle-help', after));
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
    for (const person of people) blit(ctx, person.image, 0, 0, person.pos.x, person.pos.y, size, { lying: person.lying });

    // Where the hero can move. A pale wash with a bright edge, so it shows on wood and stone
    // alike; gold squares are a free move (Remarkable Athlete).
    // Blue squares are out of every foe's sight: somewhere to Hide.
    if (fight.isHeroTurn(game) && !view.replaying && !view.option && !view.potion && !view.help) {
      for (const step of fight.heroReachable(game).values()) {
        if (step.cost === 0) continue;
        const unseen = !fight.foesWatching(game, step.pos).length;
        const colours = step.free ? ['rgba(240, 200, 90, 0.35)', 'rgba(240, 200, 90, 0.9)'] : unseen ? HIDING_WASH : ['rgba(222, 238, 214, 0.32)', 'rgba(222, 238, 214, 0.85)'];
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
    // Spirit Guardians: a faint gold glow over every square within their reach of the caster.
    for (const aura of scene.auras || []) {
      const unit = scene.units.find((u) => u.id === aura.by);
      if (!unit) continue;
      const centre = at(unit);
      const reach = Math.round(aura.radius / 5);
      ctx.fillStyle = GUARDIAN_GLOW;
      for (let y = Math.round(centre.y) - reach; y <= Math.round(centre.y) + reach; y++) {
        for (let x = Math.round(centre.x) - reach; x <= Math.round(centre.x) + reach; x++) {
          const inside = x >= 0 && y >= 0 && x < map.width && y < map.height && map.cells[y][x].terrain !== 'wall';
          if (inside && (x !== Math.round(centre.x) || y !== Math.round(centre.y))) ctx.fillRect(x * size, y * size, size, size);
        }
      }
      // A dashed gold edge round the whole of it, so it reads on any floor.
      const left = Math.max(0, Math.round(centre.x) - reach);
      const top = Math.max(0, Math.round(centre.y) - reach);
      const right = Math.min(map.width - 1, Math.round(centre.x) + reach);
      const bottom = Math.min(map.height - 1, Math.round(centre.y) + reach);
      ctx.save();
      ctx.strokeStyle = GUARDIAN_EDGE;
      ctx.lineWidth = scale;
      ctx.setLineDash([3 * scale, 2 * scale]);
      ctx.strokeRect(left * size + scale, top * size + scale, (right - left + 1) * size - 2 * scale, (bottom - top + 1) * size - 2 * scale);
      ctx.restore();
    }
    for (const pos of (aimed && aimed.squares) || view.flash || []) washSquare(ctx, pos, size, scale, AREA_WASH);
    if (chosen && chosen.targeting === 'square') for (const pos of fight.teleportSquares(game, chosen.id)) washSquare(ctx, pos, size, scale, TELEPORT_WASH);
    // Who a spell that helps (or a potion) can go on, or who a party spell will catch.
    const helping = !view.replaying && fight.isHeroTurn(game) && company();
    let friends = [];
    if (helping && view.potion) friends = fight.friendTargets(game, 'potion').filter((f) => !f.problem).map((f) => f.c);
    else if (helping && chosen && chosen.targeting === 'friend') friends = fight.friendTargets(game, chosen.id).filter((f) => !f.problem).map((f) => f.c);
    else if (helping && chosen && chosen.targeting === 'party') friends = fight.partyTargets(game, chosen);
    else if (helping && view.help) friends = fight.helpTargets(game).filter((h) => !h.problem).map((h) => h.c);

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
    // their side; the Prone lie on their side. Foes and allies (the Old Ford's soldiers) come
    // from the DawnLike sheets; an ally has a pale frame, to tell friend from foe.
    const foes = scene.units.filter((u) => !fight.isPartyMember(fight.combatantById(battle, u.id)) && !u.escaped).sort((a, b) => (a.hp > 0) - (b.hp > 0));
    // Companions: drawn as heroes are, faded and lying down at 0 Hit Points.
    for (const c of fight.companionCombatants(battle)) {
      const unit = scene.units.find((u) => u.id === c.id);
      const pos = at(unit);
      const standing = unit.state === 'up';
      // A hidden companion is drawn faint, as a hidden hero is.
      const hiddenAlpha = (unit.conditions || []).includes('hidden') ? 0.55 : 1;
      blit(ctx, companionFrames(c)[standing ? frame : 0], 0, 0, pos.x, pos.y, size, { alpha: standing ? hiddenAlpha : unit.state === 'dead' ? 0.3 : 0.5, lying: !standing || unit.prone });
      if (unit.state !== 'dead') drawHealthBar(ctx, pos, unit.hp / fight.maxHpOf(game, c), size, scale);
    }
    for (const unit of foes) {
      const c = fight.combatantById(battle, unit.id);
      const standing = unit.hp > 0;
      const pos = at(unit);
      drawTile(ctx, art, sprites[fight.findMonster(c.monsterId).sprite], pos.x, pos.y, size, standing ? frame : 0, {
        alpha: standing ? 1 : 0.35,
        lying: !standing || unit.prone,
      });
      if (standing) drawHealthBar(ctx, pos, unit.hp / c.maxHp, size, scale);
      if (standing && c.ally) frameSquare(ctx, pos, size, scale, ALLY_FRAME);
      // Who the chosen attack can reach.
      if (view.option && standing && !view.replaying && c.side === 'enemy') {
        const preview = fight.attackPreview(game, view.option, unit.id);
        if (preview && preview.inRange) frameSquare(ctx, pos, size, scale, '#ff8a7a');
      }
    }
    const hero = scene.units.find((u) => u.id === 'hero');
    const up = scene.heroState === 'up';
    const heroAt = at(hero);
    // A hidden hero is drawn faint.
    const faint = (hero.conditions || []).includes('hidden') ? 0.55 : 1;
    blit(ctx, heroFrames[up ? frame : 0], 0, 0, heroAt.x, heroAt.y, size, { alpha: up ? faint : 0.5, lying: !up || hero.prone });
    drawHealthBar(ctx, heroAt, hero.hp / heroMaxHp(game), size, scale);

    // Spiritual Weapon, hovering where it last struck: the party's of light, a foe's of ash.
    for (const weapon of scene.weapons || []) drawPixels(ctx, weapon.foe ? ASH_BLADE : SPECTRAL_WEAPON, weapon.pos, size, scale);

    // Sleepers snore; whoever an aimed area would catch is framed in orange.
    for (const unit of scene.units) {
      const conditions = unit.conditions || [];
      if (unit.hp > 0 && (conditions.includes('asleep') || conditions.includes('drowsy'))) {
        drawBadge(ctx, conditions.includes('asleep') ? 'Zz' : 'z', at(unit), size, scale);
      }
    }
    if (aimed) for (const c of aimed.caught) frameSquare(ctx, c.pos, size, scale, AREA_WASH[1]);
    for (const c of friends) frameSquare(ctx, at(scene.units.find((u) => u.id === c.id)), size, scale, FRIEND_FRAME);

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
      .filter((u) => fight.combatantById(game.battle, u.id).side === 'enemy' && u.hp > 0)
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

// A foe's Spiritual Weapon (the Choir's Fanatics): a blade of grey ash with an ember glow, so
// it can't be mistaken for one of yours.
const ASH_BLADE = {
  rows: [
    '................',
    '.............LL.',
    '............LWWL',
    '...........LWWL.',
    '..........LWWL..',
    '.........LWWL...',
    '........LWWL....',
    '.......LWWL.....',
    '......LWWL......',
    '..L..LWWL.......',
    '..LLLWWL........',
    '...LGGL.........',
    '..LGGL..........',
    '.LGGL...........',
    '.LL.............',
    '................',
  ],
  colors: { L: 'rgba(230, 80, 50, 0.8)', W: '#bdb6ad', G: '#5c4b44' },
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
  return [chance, ...preview.advantage.map((r) => `Advantage: ${r}`), ...preview.disadvantage.map((r) => `Disadvantage: ${r}`), ...(preview.sneak ? [`Sneak Attack +${preview.sneak}${preview.cunning ? ` and ${preview.cunning}` : ''} on a hit`] : [])].join(' · ');
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
