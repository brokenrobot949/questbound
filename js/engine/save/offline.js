// Home-screen install and offline play: starts the service worker (service-worker.js), and
// tells the game when a new version is ready.
//
// While building: on localhost the service worker is switched off, and any earlier copy is
// removed, so a reload always shows the latest files. Add ?sw to the address to test offline
// play locally. Debug mode never starts it either.

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function isLocalHost(hostname) {
  return LOCAL_HOSTS.includes(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.test');
}

// onUpdateReady(apply): a new version has downloaded. Call apply() to switch to it (the page reloads).
// Returns 'on', 'off-local', 'off-debug' or 'unsupported'.
export async function setupOffline({ debug, onUpdateReady }) {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const params = new URLSearchParams(window.location.search);

  if (isLocalHost(window.location.hostname) && !params.has('sw')) {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) {
      if (name.startsWith('questbound-')) await caches.delete(name);
    }
    return 'off-local';
  }
  if (debug) return 'off-debug';

  const registration = await navigator.serviceWorker.register('./service-worker.js');
  const offer = (worker) =>
    onUpdateReady(() => {
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      worker.postMessage({ type: 'skip-waiting' });
    });

  // Only an update needs offering: the very first install just starts working.
  if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
    });
  });

  // Phones keep the game open for days, so look for a new version whenever it comes back on screen.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) registration.update().catch(() => {});
  });
  return 'on';
}

// For the debug panel: which offline copy exists, how many files it holds, and any file this
// page loaded that the copy is missing (those wouldn't work offline).
export async function offlineReport() {
  if (!('caches' in window)) return { names: [], files: 0, missing: [] };
  const names = (await caches.keys()).filter((name) => name.startsWith('questbound-'));
  if (names.length === 0) return { names, files: 0, missing: [] };

  const cache = await caches.open(names[names.length - 1]);
  const stored = new Set((await cache.keys()).map((request) => request.url));
  const scope = new URL('./', document.baseURI).href;
  const loaded = performance
    .getEntriesByType('resource')
    .map((entry) => entry.name.split('#')[0].split('?')[0])
    .filter((url) => url.startsWith(scope) && !url.includes('/tests/'));
  const missing = [...new Set(loaded)].filter((url) => !stored.has(url)).map((url) => url.slice(scope.length));
  return { names, files: stored.size, missing };
}
