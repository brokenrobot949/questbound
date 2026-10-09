// The bar along the bottom during play: Adventure, Sheet, Journal and Menu. One tab shows at
// a time; the story stays exactly where it was underneath. (Map joins when travel arrives.)

import { journalPanel } from './journal-panel.js';
import { sheetPanel } from './sheet-panel.js';

const TABS = ['adventure', 'sheet', 'journal', 'menu'];

// getGame(): the active game. onOpenMenu(): fills the Menu tab when it opens.
// onJournalRead(game): the player has seen the journal's new entries (save the game).
export function setupPlayTabs({ root, getGame, onOpenMenu, onJournalRead }) {
  const nav = root.getElementById('bottom-nav');
  const buttons = [...nav.querySelectorAll('[data-tab]')];
  let current = 'adventure';
  // How far down each tab was scrolled when the player left it.
  const scrolls = {};

  // fresh: a game is starting, so every tab starts from the top.
  function show(tab, { fresh = false } = {}) {
    if (!TABS.includes(tab)) throw new Error(`Unknown tab: ${tab}`);
    if (fresh) for (const name of TABS) delete scrolls[name];
    else scrolls[current] = window.scrollY;
    current = tab;
    const game = getGame();
    for (const name of TABS) root.getElementById(`tab-${name}`).hidden = name !== tab;
    for (const button of buttons) {
      if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    if (tab === 'sheet' && game) root.getElementById('tab-sheet').replaceChildren(sheetPanel(game));
    if (tab === 'journal' && game) {
      root.getElementById('tab-journal').replaceChildren(journalPanel(game));
      if (game.journal.unread) {
        game.journal.unread = false;
        onJournalRead(game);
      }
    }
    if (tab === 'menu') onOpenMenu();
    refresh();
    // The Adventure tab comes back to where the player left it, at the latest events. The
    // other tabs are built afresh each time, so they open at the top.
    window.scrollTo(0, tab === 'adventure' ? scrolls.adventure || 0 : 0);
  }

  // Marks the Journal tab when something new has been written in it.
  function refresh() {
    const game = getGame();
    const journal = buttons.find((b) => b.dataset.tab === 'journal');
    const news = Boolean(game && game.journal.unread && current !== 'journal');
    journal.classList.toggle('has-news', news);
    journal.setAttribute('aria-label', news ? 'Journal (new entries)' : 'Journal');
  }

  for (const button of buttons) button.addEventListener('click', () => show(button.dataset.tab));
  return { show, refresh, current: () => current };
}
