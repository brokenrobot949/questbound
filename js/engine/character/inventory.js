// Money and the hero's pack: what changes in play, so it lives on the game, not the character.
//
//   game.money       coins, counted in copper pieces (1 GP = 10 SP = 100 CP)
//   game.inventory   [{ id, quantity }]: item ids from data/srd/equipment.js and armor.js,
//                    Wondrous Items from data/srd/magic-items.js (a Cloak of Protection, see
//                    wornItems), magic weapons ("longsword-plus-1", see magicWeapon), and the
//                    story's own items in data/campaign/items.js
//
// Prices in the data are in coins ({ gp: 50 }); money is shown as gold, silver and copper.

import { equipment } from '../../../data/srd/equipment.js';
import { armor, shield } from '../../../data/srd/armor.js';
import { magicItems } from '../../../data/srd/magic-items.js';
import { items as storyItems } from '../../../data/campaign/items.js';
import { shards } from '../../../data/campaign/shards.js';
import { shops } from '../../../data/campaign/shops.js';
import { findBackground, findClass } from './sheet.js';

// Any item: armour, a Shield, other equipment, a Wondrous Item, a magic weapon, or one of the
// story's own items.
export function findItem(id) {
  if (id === shield.id) return { ...shield, category: 'shield' };
  const worn = armor.find((a) => a.id === id);
  if (worn) return { ...worn, category: 'armor', armorCategory: worn.category };
  return equipment.find((e) => e.id === id) || storyItems.find((e) => e.id === id) || wondrousItem(id) || magicWeapon(id);
}

// ---- Wondrous Items (SRD 5.2.1): a Cloak of Protection ----
// In the pack by their own id (data/srd/magic-items.js). Not for sale.
function wondrousItem(id) {
  const item = magicItems.find((m) => m.id === id && m.kind === 'wondrous');
  return item ? { ...item, category: 'wondrous' } : null;
}

// The magic items someone wears: every worn item in their pack (a Cloak of Protection), attuned
// as soon as they have it (data/srd/magic-items.js). game: the hero's, or a companion's
// (character/party.js, memberGame). Armor Class and saving throws add what each gives
// (character/sheet.js).
export function wornItems(game) {
  return (game.inventory || []).filter((entry) => entry.quantity > 0).map((entry) => findItem(entry.id)).filter((item) => item && item.worn);
}

// ---- Magic weapons (SRD 5.2.1, "Weapon, +1, +2, or +3") ----
// "longsword-plus-1" is a Longsword +1: the plain weapon (baseId, baseName), with magicBonus
// added to its attack rolls and damage rolls (combat/attacks.js), and the magic item's rarity
// and text (data/srd/magic-items.js). It isn't for sale.
const MAGIC_WEAPON = /^(.+)-plus-([1-3])$/;
function magicWeapon(id) {
  const match = typeof id === 'string' && id.match(MAGIC_WEAPON);
  const base = match && equipment.find((e) => e.id === match[1] && e.category === 'weapon');
  if (!base) return null;
  const bonus = Number(match[2]);
  const magic = magicItems.find((m) => m.id === 'weapon-plus');
  return { ...base, id, baseId: base.id, baseName: base.name, name: `${base.name} +${bonus}`, magicBonus: bonus, rarity: magic.rarity[bonus], text: magic.text, cost: null };
}

// The plain weapons in the pack that could be made magic, one id for each kind, in pack order.
export function plainWeapons(game) {
  return game.inventory.filter((entry) => entry.quantity > 0 && findItem(entry.id).category === 'weapon' && !findItem(entry.id).magicBonus).map((entry) => entry.id);
}

// One of a plain weapon in the pack becomes a magic one (+1, say). Returns the new item.
export function makeMagicWeapon(game, id, bonus = 1) {
  const item = findItem(id);
  if (!item || item.category !== 'weapon' || item.magicBonus) throw new Error(`${id} isn't a plain weapon`);
  const magicId = `${id}-plus-${bonus}`;
  removeItem(game.inventory, id, 1);
  addItem(game.inventory, magicId, 1);
  return findItem(magicId);
}

export const COPPER_PER = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

// A price ({ gp: 2 }, or a plain number of GP for armour) in copper pieces.
export function costInCopper(cost) {
  if (typeof cost === 'number') return cost * COPPER_PER.gp;
  return Object.entries(cost || {}).reduce((sum, [coin, amount]) => sum + COPPER_PER[coin] * amount, 0);
}

// "18 GP", "18 GP, 5 SP", "7 CP"; "no money" for nothing at all.
export function moneyText(copper) {
  if (!copper) return 'no money';
  const gp = Math.floor(copper / 100);
  const sp = Math.floor((copper % 100) / 10);
  const cp = copper % 10;
  return [gp && `${gp} GP`, sp && `${sp} SP`, cp && `${cp} CP`].filter(Boolean).join(', ');
}

// "Torch", or "Torch ×3".
export function itemText({ id, quantity }) {
  const item = findItem(id);
  const name = item ? item.name : id;
  return quantity > 1 ? `${name} ×${quantity}` : name;
}

// The pack and coins a new hero starts with, from the kits they chose at creation.
export function startingInventory(character) {
  const inventory = [];
  let money = 0;
  const kits = [
    [findClass(character.classId), 'startingEquipment', character.startingEquipment.class],
    [findBackground(character.backgroundId), 'equipment', character.startingEquipment.background],
  ];
  for (const [source, field, option] of kits) {
    const kit = source && source[field].find((o) => o.option === option);
    if (!kit) continue;
    money += kit.gold * COPPER_PER.gp;
    for (const { id, quantity } of kit.items) addItem(inventory, id, quantity);
  }
  return { inventory, money };
}

// Adds to a pack in place; the same item stacks.
export function addItem(inventory, id, quantity = 1) {
  if (!findItem(id)) throw new Error(`Unknown item: ${id}`);
  const held = inventory.find((entry) => entry.id === id);
  if (held) held.quantity += quantity;
  else inventory.push({ id, quantity });
}

// Takes from a pack in place; an item used up leaves the pack.
export function removeItem(inventory, id, quantity = 1) {
  const held = inventory.find((entry) => entry.id === id);
  if (!held || held.quantity < quantity) throw new Error(`The pack doesn't hold ${quantity} ${id}`);
  held.quantity -= quantity;
  if (held.quantity === 0) inventory.splice(inventory.indexOf(held), 1);
}

export function hasItem(game, id) {
  return game.inventory.some((entry) => entry.id === id && entry.quantity > 0);
}

// A shard of the crown (data/campaign/shards.js), by id ("names"). An unknown id is a story bug.
export function findShard(id) {
  const shard = shards.find((s) => s.id === id);
  if (!shard) throw new Error(`Unknown shard: ${id}`);
  return shard;
}

// True while the hero carries that shard: its item is in the pack.
export function hasShard(game, id) {
  return hasItem(game, findShard(id).item);
}

export function priceOf(id) {
  const item = findItem(id);
  if (!item || item.cost === null || item.cost === undefined) throw new Error(`${id} isn't for sale`);
  return costInCopper(item.cost);
}

// A shop (data/campaign/shops.js), by id. An unknown id is a story bug.
export function findShop(id) {
  const shop = shops.find((s) => s.id === id);
  if (!shop) throw new Error(`Unknown shop: ${id}`);
  return shop;
}

// The discounts a shop gives this hero now, by their story flags: [{ flag, percent, reason }].
export function shopDiscounts(game, shopId) {
  return findShop(shopId).discounts.filter((d) => (game.flags || []).includes(d.flag));
}

// What one of an item costs, in copper: its price, or in a shop (shopId), its price less any
// discount the hero has won there, rounded down to the copper.
export function priceAt(game, id, shopId = null) {
  const price = priceOf(id);
  if (!shopId) return price;
  const percent = Math.min(100, shopDiscounts(game, shopId).reduce((sum, d) => sum + d.percent, 0));
  return Math.floor((price * (100 - percent)) / 100);
}

export function canAfford(game, id, shopId = null) {
  return game.money >= priceAt(game, id, shopId);
}

// Pays for one of an item (in a shop, if shopId is given) and puts it in the pack. Returns the
// price paid, in copper.
export function buyItem(game, id, shopId = null) {
  const price = priceAt(game, id, shopId);
  if (game.money < price) throw new Error(`Not enough money for ${findItem(id).name}`);
  game.money -= price;
  addItem(game.inventory, id, 1);
  return price;
}

// Problems with a saved pack, for checking saves.
export function inventoryProblems(money, inventory) {
  const problems = [];
  if (!Number.isInteger(money) || money < 0) problems.push('money');
  const ok = Array.isArray(inventory) && inventory.every((e) => e && findItem(e.id) && Number.isInteger(e.quantity) && e.quantity >= 0);
  if (!ok) problems.push('inventory');
  return problems;
}
