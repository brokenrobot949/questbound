// Questbound's service worker. It keeps a copy of the game on the device so it plays offline
// and from the home screen, and lets the game say "Update ready — tap to reload" when a new
// version has been pushed.
//
// EVERY RELEASE: raise VERSION by one (questbound-v1, questbound-v2, ...). A changed VERSION is
// what tells players' phones that there is something new to download.
//
// It stays out of the way while building: on localhost (unless the address has ?sw), in debug
// mode (?debug) and on the test pages, every file comes straight from the server.

const VERSION = 'questbound-v9';

// Where the copy starts. Every module these import, every story file main.ink INCLUDEs and every
// url() in the stylesheet are found and copied too, so new code and scenes need no edits here.
const START_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './CREDITS.md',
  './css/style.css',
  './js/main.js',
  './story/main.ink',
  './assets/ui/icon-192.png',
  './assets/ui/icon-512.png',
  './assets/ui/icon-maskable-512.png',
  './assets/ui/apple-touch-icon.png',
  './assets/ui/favicon-32.png',
];

// Development folders: never copied, and pages in them always get fresh files.
const DEVELOPMENT_FOLDERS = ['tests/', 'tools/', 'docs/'];

const SCOPE = new URL(self.registration.scope);
const STORY_ROOT = new URL('./story/', SCOPE);
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

self.addEventListener('install', (event) => {
  event.waitUntil(copyGame());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(deleteOldCopies());
});

// The page sends this when the player taps "Update ready".
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(SCOPE.href)) return; // not ours: leave alone
  if (inDevelopmentFolder(url)) return;
  event.respondWith(respond(event, request));
});

// The device's copy first; anything not in it comes from the server and is kept for next time.
async function respond(event, request) {
  if (await fromDevelopmentPage(event, request)) return fetch(request);
  const cache = await caches.open(VERSION);
  const copy = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
  if (copy) return copy;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
  return response;
}

// Debug mode, the test pages, and localhost without ?sw always get fresh files.
async function fromDevelopmentPage(event, request) {
  let pageUrl = new URL(request.url);
  if (request.mode !== 'navigate' && event.clientId) {
    const client = await self.clients.get(event.clientId);
    if (client) pageUrl = new URL(client.url);
  }
  if (pageUrl.searchParams.has('debug') || inDevelopmentFolder(pageUrl)) return true;
  return LOCAL_HOSTS.includes(SCOPE.hostname) && !pageUrl.searchParams.has('sw');
}

function inDevelopmentFolder(url) {
  return DEVELOPMENT_FOLDERS.some((folder) => url.href.startsWith(new URL(folder, SCOPE).href));
}

// Copies the whole game into this version's cache, following imports, INCLUDEs and url()s.
// If a start file can't be fetched the install fails, and the browser tries again later.
async function copyGame() {
  const cache = await caches.open(VERSION);
  const startHrefs = START_FILES.map((file) => new URL(file, SCOPE).href);
  const queue = [...startHrefs];
  const seen = new Set();
  while (queue.length > 0) {
    const href = queue.shift();
    if (seen.has(href)) continue;
    seen.add(href);
    const response = await fetch(href, { cache: 'reload' });
    if (!response.ok) {
      if (startHrefs.includes(href)) throw new Error(`Couldn't copy ${href} (${response.status})`);
      console.warn(`Skipped ${href} (${response.status})`);
      continue;
    }
    await cache.put(href, response.clone());
    if (/\.(js|ink|css)$/.test(new URL(href).pathname)) {
      queue.push(...filesUsedBy(href, await response.text()));
    }
  }
}

// The files a file refers to: imports and asset paths in JavaScript, INCLUDEs in Ink,
// url()s in CSS.
function filesUsedBy(href, text) {
  const path = new URL(href).pathname;
  const found = [];
  if (path.endsWith('.js')) {
    const staticImports = /(?:^|[;}\s])(?:import|export)\s*(?:[\w*{}\s,$]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
    const dynamicImports = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const match of text.matchAll(staticImports)) found.push(new URL(match[1], href).href);
    for (const match of text.matchAll(dynamicImports)) found.push(new URL(match[1], href).href);
    // Pictures named in data files, such as 'assets/dawnlike/Characters/Player0.png'.
    for (const match of text.matchAll(/['"](assets\/[^'"]+\.png)['"]/g)) found.push(new URL(match[1], SCOPE).href);
  } else if (path.endsWith('.ink')) {
    for (const match of text.matchAll(/^[ \t]*INCLUDE[ \t]+(.+?)[ \t]*$/gm)) found.push(new URL(match[1], STORY_ROOT).href);
  } else if (path.endsWith('.css')) {
    for (const match of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      if (!match[1].startsWith('data:')) found.push(new URL(match[1], href).href);
    }
  }
  return found.filter((u) => u.startsWith(SCOPE.href) && !inDevelopmentFolder(new URL(u)));
}

// Removes copies from older versions. Only Questbound's caches are touched: Rob's other games
// share this web address and storage.
async function deleteOldCopies() {
  for (const name of await caches.keys()) {
    if (name.startsWith('questbound-') && name !== VERSION) await caches.delete(name);
  }
}
