// Money and the hero's pack: what changes in play, so it lives on the game, not the character.
//
//   game.money       coins, counted in copper pieces (1 GP = 10 SP = 100 CP)
//   game.inventory   [{ id, quantity }]: item ids from data/srd/equipment.js and armor.js,
//                    and the story's own items in data/campaign/items.js
//
// Prices in the data are in coins ({ gp: 50 }); money is shown as gold, silver and copper.

import { equipment } from '../../../data/srd/equipment.js';
import { armor, shield } from '../../../data/srd/armor.js';
import { items as storyItems } from '../../../data/campaign/items.js';
import { findBackground, findClass } from './sheet.js';

// Any item: armour, a Shield, other equipment, or one of the story's own items.
export function findItem(id) {
  if (id === shield.id) return { ...shield, category: 'shield' };
  const worn = armor.find((a) => a.id === id);
  if (worn) return { ...worn, category: 'armor', armorCategory: worn.category };
  return equipment.find((e) => e.id === id) || storyItems.find((e) => e.id === id) || null;
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

export function priceOf(id) {
  const item = findItem(id);
  if (!item || item.cost === null || item.cost === undefined) throw new Error(`${id} isn't for sale`);
  return costInCopper(item.cost);
}

export function canAfford(game, id) {
  return game.money >= priceOf(id);
}

// Pays for one of an item and puts it in the pack. Returns the price paid, in copper.
export function buyItem(game, id) {
  const price = priceOf(id);
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
