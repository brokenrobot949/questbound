// The playtest log: how long sessions and scenes take, the levels reached and deaths, kept on
// this device so Rob can see averages in debug mode. It is never sent anywhere.
// Stored in localStorage under "questbound:playtest-log".
//
// Only active time counts: the clock stops while the game is off screen, and a gap of more
// than IDLE_LIMIT_MS between actions counts as that limit (the phone was probably put down).
// A "scene" is an Ink knot, such as gate_test.

const KEY = 'questbound:playtest-log';
export const IDLE_LIMIT_MS = 5 * 60 * 1000;
const SESSION_LIMIT = 300;
const SCENE_LIMIT = 2000;

export function emptyLog() {
  return { version: 1, sessions: [], scenes: [] };
}

export class PlaytestTracker {
  // storage and now are only swapped out by the tests.
  constructor({ storage = globalThis.localStorage, now = () => Date.now() } = {}) {
    this.storage = storage;
    this.now = now;
    this.log = this.#load();
    this.current = null; // the session being tracked
    this.active = false; // false on the title screen
    this.visible = true;
    this.lastActive = null;
    this.#closeDanglingScenes();
  }

  // A game opened. Picks the session up again if it's the one already being tracked (back to
  // the title screen and straight back in, or a reload for an update), otherwise starts a new entry.
  startSession(game) {
    const gameId = `${game.slot}:${game.createdAt}`;
    const latest = this.current || this.log.sessions[this.log.sessions.length - 1];
    const sameSession = latest && latest.gameId === gameId && latest.session === game.sessionCount;
    if (sameSession) {
      this.current = latest;
    } else {
      this.endSession();
      this.current = {
        gameId,
        slot: game.slot,
        session: game.sessionCount,
        hero: game.character.name,
        startedAt: new Date(this.now()).toISOString(),
        activeMs: 0,
        levelStart: game.character.level,
        levelEnd: game.character.level,
        scenesVisited: 0,
        deaths: 0,
        openScene: null,
      };
      this.log.sessions.push(this.current);
      trim(this.log.sessions, SESSION_LIMIT);
    }
    this.active = true;
    this.lastActive = this.now();
    this.#save();
  }

  // After every player action: counts the time since the last one, notes the scene and level.
  update(game) {
    if (!this.current || !this.active) return;
    this.#tick();
    const scene = (game.page && game.page.scene) || 'unknown';
    if (!this.current.openScene || this.current.openScene.scene !== scene) {
      this.#closeScene();
      this.current.openScene = { scene, ms: 0 };
      this.current.scenesVisited += 1;
    }
    this.current.levelEnd = game.character.level;
    this.#save();
  }

  // The game went off screen (another app, a locked phone) or came back.
  pause() {
    this.#tick();
    this.visible = false;
    this.#save();
  }

  resume() {
    this.visible = true;
    this.lastActive = this.now();
  }

  // Back to the title screen: the open scene ends.
  endSession() {
    if (!this.current || !this.active) return;
    this.#tick();
    this.#closeScene();
    this.active = false;
    this.#save();
  }

  // For later phases: call when the hero dies.
  recordDeath() {
    if (!this.current) return;
    this.current.deaths += 1;
    this.#save();
  }

  clear() {
    this.log = emptyLog();
    this.current = null;
    this.active = false;
    this.#save();
  }

  #tick() {
    const now = this.now();
    if (this.current && this.active && this.visible && this.lastActive !== null) {
      const ms = Math.min(Math.max(0, now - this.lastActive), IDLE_LIMIT_MS);
      this.current.activeMs += ms;
      if (this.current.openScene) this.current.openScene.ms += ms;
    }
    this.lastActive = now;
  }

  #closeScene() {
    const open = this.current && this.current.openScene;
    if (!open) return;
    this.log.scenes.push({ scene: open.scene, ms: open.ms, slot: this.current.slot, session: this.current.session });
    trim(this.log.scenes, SCENE_LIMIT);
    this.current.openScene = null;
  }

  // A page that closed mid-scene leaves its scene open; file it now.
  #closeDanglingScenes() {
    for (const session of this.log.sessions) {
      if (!session.openScene) continue;
      this.log.scenes.push({ scene: session.openScene.scene, ms: session.openScene.ms, slot: session.slot, session: session.session });
      session.openScene = null;
    }
    trim(this.log.scenes, SCENE_LIMIT);
  }

  #load() {
    try {
      const log = JSON.parse(this.storage.getItem(KEY));
      if (log && log.version === 1 && Array.isArray(log.sessions) && Array.isArray(log.scenes)) return log;
    } catch {
      // Missing or unreadable: start a fresh log.
    }
    return emptyLog();
  }

  #save() {
    try {
      this.storage.setItem(KEY, JSON.stringify(this.log));
    } catch {
      // Storage full or blocked: the log keeps working in memory for this visit.
    }
  }
}

// Averages for the debug panel.
export function summarizeLog(log) {
  const sessions = log.sessions;
  const sessionMs = sessions.map((s) => s.activeMs);

  const byScene = new Map();
  for (const visit of log.scenes) {
    const entry = byScene.get(visit.scene) || { scene: visit.scene, visits: 0, totalMs: 0 };
    entry.visits += 1;
    entry.totalMs += visit.ms;
    byScene.set(visit.scene, entry);
  }
  const scenes = [...byScene.values()]
    .map((s) => ({ scene: s.scene, visits: s.visits, averageMs: s.totalMs / s.visits }))
    .sort((a, b) => b.visits - a.visits || a.scene.localeCompare(b.scene));

  const byGame = new Map();
  for (const s of sessions) {
    const entry = byGame.get(s.gameId) || { hero: s.hero, slot: s.slot, sessions: 0, highestLevel: 0, deaths: 0 };
    entry.sessions += 1;
    entry.highestLevel = Math.max(entry.highestLevel, s.levelEnd);
    entry.deaths += s.deaths;
    byGame.set(s.gameId, entry);
  }

  const deaths = sessions.reduce((sum, s) => sum + s.deaths, 0);
  const sceneMs = log.scenes.map((v) => v.ms);
  return {
    sessionCount: sessions.length,
    averageSessionMs: average(sessionMs),
    longestSessionMs: sessionMs.length ? Math.max(...sessionMs) : 0,
    sceneVisits: log.scenes.length,
    averageSceneMs: average(sceneMs),
    scenes,
    games: [...byGame.values()],
    highestLevel: sessions.length ? Math.max(...sessions.map((s) => s.levelEnd)) : 0,
    deaths,
    deathsPerSession: sessions.length ? deaths / sessions.length : 0,
  };
}

// "4m 05s", "1h 02m" or "38s".
export function formatDuration(ms) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function average(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function trim(list, limit) {
  if (list.length > limit) list.splice(0, list.length - limit);
}
