// The Back up and Restore panels, used on the title screen and by the backup reminder.

import { backupCode, backupFileName, backupFileText, readBackup } from '../save/backup.js';
import { el } from './dom.js';

// Back up: download the save as a file, or copy it as a text code.
// save: the save to back up. onBackedUp() runs the first time the player downloads or copies it.
export function backupPanel({ save, onBackedUp }) {
  const panel = el('div', 'backup-panel');
  let recorded = false;
  const record = () => {
    if (recorded) return;
    recorded = true;
    onBackedUp();
  };

  panel.append(
    el(
      'p',
      'backup-intro',
      'Keep a copy somewhere safe, like your files or a message to yourself. ' +
        'You can restore it into any slot, on any device.',
    ),
  );

  const status = el('p', 'backup-status');
  status.setAttribute('role', 'status');

  const download = actionButton('Download save file', () => {
    downloadText(backupFileName(save), backupFileText(save));
    status.textContent = 'Save file downloaded.';
    record();
  });

  const code = el('textarea', 'backup-code');
  code.readOnly = true;
  code.rows = 3;
  code.value = 'Making the code…';
  code.setAttribute('aria-label', 'Save code');
  code.addEventListener('focus', () => code.select());
  code.addEventListener('copy', () => {
    status.textContent = 'Code copied.';
    record();
  });

  const copy = actionButton('Copy save code', async () => {
    try {
      await navigator.clipboard.writeText(code.value);
      status.textContent = 'Code copied. Paste it somewhere safe.';
      record();
    } catch {
      code.focus();
      status.textContent = 'Select the code above and copy it.';
    }
  });
  copy.disabled = true;

  backupCode(save)
    .then((value) => {
      code.value = value;
      copy.disabled = false;
    })
    .catch((error) => {
      code.value = error.message;
    });

  panel.append(download, el('p', 'backup-or', 'Or copy this save code:'), code, copy, status);
  return panel;
}

// Restore: read a save file or a pasted code, check it, then hand it to onRestore(save).
// replacing: what is in the slot now, e.g. "Wren Ashdown's save", or null if it's empty.
export function restorePanel({ slot, replacing, onRestore }) {
  const panel = el('div', 'backup-panel');
  panel.append(el('p', 'backup-intro', `Restore a backup into slot ${slot}.`));

  const status = el('p', 'backup-status');
  status.setAttribute('role', 'status');
  const confirmArea = el('div', 'slot-confirm');

  const fileLabel = el('label', 'slot-button file-button', 'Choose save file');
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.className = 'visually-hidden';
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (file) await tryRestore(await file.text());
  });
  fileLabel.append(fileInput);

  const code = el('textarea', 'backup-code');
  code.rows = 3;
  code.placeholder = 'Paste a save code here';
  code.setAttribute('aria-label', 'Save code to restore');

  const fromCode = actionButton('Restore from code', () => tryRestore(code.value));

  panel.append(fileLabel, el('p', 'backup-or', 'Or paste a save code:'), code, fromCode, status, confirmArea);
  return panel;

  async function tryRestore(text) {
    status.classList.remove('is-problem');
    status.textContent = 'Checking…';
    confirmArea.replaceChildren();
    let save;
    try {
      save = await readBackup(text);
    } catch (error) {
      status.classList.add('is-problem');
      status.textContent = error.message;
      return;
    }
    const hero = save.game.character;
    const who = `${hero.name} (level ${hero.level}, session ${save.sessionCount})`;
    if (!replacing) {
      status.textContent = '';
      onRestore(save);
      return;
    }
    status.textContent = '';
    confirmArea.append(
      el('p', 'slot-warning', `Replace ${replacing} with ${who}? This can't be undone.`),
      actionButton('Replace', () => onRestore(save), 'is-danger'),
      actionButton('Cancel', () => confirmArea.replaceChildren()),
    );
  }
}

export function actionButton(label, onClick, extraClass) {
  const b = el('button', `slot-button${extraClass ? ` ${extraClass}` : ''}`, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function downloadText(fileName, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = el('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
