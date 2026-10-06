// The in-game Credits: shows CREDITS.md, so the wording (including the SRD attribution, which
// must stay word for word) lives in one place. Handles the little Markdown that file uses:
// # and ## headings, paragraphs, "- " lists, **bold**, `code` and web addresses.

import { actionButton } from './backup-panels.js';
import { el } from './dom.js';

const CREDITS_URL = new URL('../../../CREDITS.md', import.meta.url);

// onClose(): the player pressed Done.
export async function creditsPanel({ onClose }) {
  const panel = el('section', 'settings-panel credits-panel');
  panel.setAttribute('aria-label', 'Credits');
  try {
    const response = await fetch(CREDITS_URL);
    if (!response.ok) throw new Error(`status ${response.status}`);
    panel.append(...renderMarkdown(await response.text()));
  } catch (error) {
    panel.append(el('p', 'setting-hint', `The credits couldn't be loaded (${error.message}).`));
  }
  panel.append(actionButton('Done', onClose));
  return panel;
}

function renderMarkdown(text) {
  const blocks = [];
  let paragraph = [];
  let list = null;
  const endParagraph = () => {
    if (paragraph.length > 0) blocks.push(inline('p', paragraph.join(' ')));
    paragraph = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') {
      endParagraph();
      list = null;
    } else if (line.startsWith('## ')) {
      endParagraph();
      list = null;
      blocks.push(inline('h3', line.slice(3)));
    } else if (line.startsWith('# ')) {
      endParagraph();
      list = null;
      blocks.push(inline('h2', line.slice(2)));
    } else if (line.startsWith('- ')) {
      endParagraph();
      if (!list) {
        list = el('ul');
        blocks.push(list);
      }
      list.append(inline('li', line.slice(2)));
    } else {
      paragraph.push(line);
    }
  }
  endParagraph();
  return blocks;
}

// Builds one element from a line, turning **bold**, `code` and web addresses into markup.
// Text is always added as text, never as HTML.
function inline(tag, text) {
  const node = el(tag);
  let last = 0;
  for (const match of text.matchAll(/\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)]+/g)) {
    node.append(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      node.append(el('strong', null, token.slice(2, -2)));
    } else if (token.startsWith('`')) {
      node.append(el('code', null, token.slice(1, -1)));
    } else {
      const url = token.replace(/[.,;:]+$/, ''); // a full stop after an address isn't part of it
      const link = el('a', null, url);
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      node.append(link, token.slice(url.length));
    }
    last = match.index + token.length;
  }
  node.append(text.slice(last));
  return node;
}
