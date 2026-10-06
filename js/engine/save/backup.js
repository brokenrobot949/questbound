// Backups: a save as a downloadable .json file or a copyable text code, and reading either back.
//
// File:  readable JSON: { "format": "questbound-save", "exportedAt": ..., "save": { ... } }
// Code:  "QB1." followed by the same JSON, gzip-compressed and written in URL-safe base64.
//        Spaces and line breaks are ignored when reading, so a code that a messaging app
//        wrapped onto several lines still works. gzip's own checksum catches damaged codes.

import { migrateSave, validateSave } from './save-format.js';

export const BACKUP_FORMAT = 'questbound-save';
const CODE_PREFIX = 'QB1.';

// The backup reminder shows every this-many sessions since the save was last backed up.
export const BACKUP_REMINDER_SESSIONS = 10;

export function isBackupDue(sessionCount, lastBackupSession) {
  const since = sessionCount - lastBackupSession;
  return since > 0 && since % BACKUP_REMINDER_SESSIONS === 0;
}

// "questbound-wren-ashdown-session-3.json"
export function backupFileName(save) {
  const name = save.game.character.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `questbound-${name || 'hero'}-session-${save.sessionCount}.json`;
}

export function backupFileText(save, now = new Date()) {
  return JSON.stringify(wrap(save, now), null, 2);
}

export async function backupCode(save, now = new Date()) {
  const bytes = await gzip(JSON.stringify(wrap(save, now)));
  return CODE_PREFIX + toBase64Url(bytes);
}

// Reads a backup file's text or a save code. Returns the save, upgraded to the current
// version and checked. If it can't be used, throws an Error with a plain reason.
export async function readBackup(text) {
  const raw = String(text || '');
  const compact = raw.replace(/\s+/g, '');
  let json;
  if (compact.startsWith(CODE_PREFIX)) {
    try {
      json = await gunzip(fromBase64Url(compact.slice(CODE_PREFIX.length)));
    } catch {
      throw new Error('This save code is incomplete or damaged. Copy the whole code and try again.');
    }
  } else if (raw.trim().startsWith('{')) {
    json = raw;
  } else {
    throw new Error("That isn't a Questbound save file or save code.");
  }

  let wrapper;
  try {
    wrapper = JSON.parse(json);
  } catch {
    throw new Error('This save file is damaged: it has been cut short or edited.');
  }
  if (!wrapper || wrapper.format !== BACKUP_FORMAT || typeof wrapper.save !== 'object') {
    throw new Error("That isn't a Questbound save file or save code.");
  }
  return validateSave(migrateSave(wrapper.save));
}

function wrap(save, now) {
  return { format: BACKUP_FORMAT, exportedAt: now.toISOString(), save };
}

async function gzip(text) {
  if (typeof CompressionStream === 'undefined') {
    throw new Error("This browser can't make save codes. Use the save file instead.");
  }
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error('Unexpected characters in the code');
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
