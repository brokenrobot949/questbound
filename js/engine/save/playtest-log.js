// The playtest log: how long sessions and scenes take, the levels reached and deaths, kept on
// this device so Rob can see averages in debug mode. It is never sent anywhere.
// Stored in localStorage under "questbound:playtest-log".
//
// Only active time counts: the clock stops while the game is off screen, and a gap of more
// than IDLE_LIMIT_MS between actions counts as that limit (the phone was probably put down).
// A "scene" is an Ink knot, such as ch1_arrival. Deaths are read from the game (game.deaths,
// which counts lost fights and deaths outside them): a session's are the ones since it began.

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
      // An entry from before deaths were read from the game.
      if (!Number.isInteger(latest.deathsBefore)) latest.deathsBefore = (game.deaths || 0) - latest.deaths;
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
        deathsBefore: game.deaths || 0, // the game's count when the session began
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
    // (An undo can take a death back, so it's worked out afresh each time.)
    this.current.deaths = Math.max(0, (game.deaths || 0) - this.current.deathsBefore);
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

  // How long this game has been played on this device, in ms (every session the log holds).
  playedMs(game) {
    const gameId = `${game.slot}:${game.createdAt}`;
    return this.log.sessions.filter((s) => s.gameId === gameId).reduce((sum, s) => sum + s.activeMs, 0);
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
    this.log.scenes.push({ scene: open.scene, ms: open.ms, slot: this.current.slot, session: this.current.session, gameId: this.current.gameId });
    trim(this.log.scenes, SCENE_LIMIT);
    this.current.openScene = null;
  }

  // A page that closed mid-scene leaves its scene open; file it now.
  #closeDanglingScenes() {
    for (const session of this.log.sessions) {
      if (!session.openScene) continue;
      this.log.scenes.push({ scene: session.openScene.scene, ms: session.openScene.ms, slot: session.slot, session: session.session, gameId: session.gameId });
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

// Averages for the debug panel. chapterStarts: [{ chapter, scene }], the scene each chapter
// begins in (js/engine/story/act-summary.js), to add up each game's time per chapter.
export function summarizeLog(log, chapterStarts = []) {
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
    const entry = byGame.get(s.gameId) || { hero: s.hero, slot: s.slot, sessions: 0, playedMs: 0, highestLevel: 0, deaths: 0, chapters: [] };
    entry.sessions += 1;
    entry.playedMs += s.activeMs;
    entry.highestLevel = Math.max(entry.highestLevel, s.levelEnd);
    entry.deaths += s.deaths;
    byGame.set(s.gameId, entry);
  }
  for (const [gameId, entry] of byGame) entry.chapters = timeByChapter(log.scenes.filter((v) => v.gameId === gameId), chapterStarts);

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

// One game's scene visits, in the order they were played, added up by chapter: a visit to a
// chapter's first scene starts it, and everything after counts to it until the next chapter
// starts. Scenes before any start count to the first chapter. [{ chapter, ms }], in the order
// the chapters were reached. (Visits recorded before scenes carried their game aren't counted.)
function timeByChapter(visits, chapterStarts) {
  if (!chapterStarts.length) return [];
  const totals = new Map();
  let chapter = chapterStarts[0].chapter;
  for (const visit of visits) {
    const start = chapterStarts.find((c) => c.scene === visit.scene);
    if (start) chapter = start.chapter;
    totals.set(chapter, (totals.get(chapter) || 0) + visit.ms);
  }
  return [...totals].map(([name, ms]) => ({ chapter: name, ms }));
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
