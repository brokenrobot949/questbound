// Save slots in the browser's IndexedDB storage: database "questbound", one record per slot.
// Each save is written whole in a single transaction, so a save is never half-written.

const DB_VERSION = 1;
const STORE = 'slots';

export const SLOT_NUMBERS = [1, 2, 3];

// dbName is only changed by the tests, so they never touch real saves.
export function openSaveStore(dbName = 'questbound') {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error("This browser can't store saves (no IndexedDB)."));
      return;
    }
    const request = indexedDB.open(dbName, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
    };
    request.onsuccess = () => resolve(new SaveStore(request.result));
    request.onerror = () => reject(request.error);
  });
}

export function deleteSaveDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

class SaveStore {
  constructor(db) {
    this.db = db;
    // If a newer version of the game opens the database in another tab, let it upgrade.
    db.onversionchange = () => db.close();
  }

  // The save in one slot, or null if the slot is empty.
  read(slot) {
    return this.#request('readonly', (store) => store.get(slot)).then((record) => record || null);
  }

  // Every slot, as a Map from slot number to save (or null).
  async readAll() {
    const records = await this.#request('readonly', (store) => store.getAll());
    const slots = new Map(SLOT_NUMBERS.map((n) => [n, null]));
    for (const record of records) slots.set(record.slot, record);
    return slots;
  }

  // Resolves once the save is safely stored.
  write(record) {
    if (!SLOT_NUMBERS.includes(record.slot)) throw new Error(`There is no save slot ${record.slot}`);
    return this.#request('readwrite', (store) => store.put(record));
  }

  remove(slot) {
    return this.#request('readwrite', (store) => store.delete(slot));
  }

  close() {
    this.db.close();
  }

  // Runs one request in its own transaction and resolves when the transaction completes.
  #request(mode, makeRequest) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, mode);
      const request = makeRequest(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error || request.error);
      tx.onabort = () => reject(tx.error || new Error('The save was cancelled.'));
    });
  }
}
