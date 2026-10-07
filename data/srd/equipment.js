// Equipment (SRD 5.2.1), other than armour (see armor.js). Only what the current phase needs:
// the items in the Fighter, Wizard and background starting kits, and what Bramblegate's
// market sells. The full tables, and the weapons' damage, properties and mastery, arrive
// with combat.
//
//   category   'weapon', 'ammunition', 'tool', 'pack', 'gear' or 'potion'
//   text       what the item does, shown on the character sheet
//   weaponType 'simple-melee', 'simple-ranged', 'martial-melee' or 'martial-ranged'
//   weight     pounds (0 = "—" in the SRD, too light to count)
//   cost       in coins: { gp: 2 } is 2 GP, { sp: 5 } is 5 SP; null = not sold
//   bundle     for ammunition, how many come together for that weight and cost

export const equipment = [
  // Weapons
  { id: 'dagger', name: 'Dagger', category: 'weapon', weaponType: 'simple-melee', weight: 1, cost: { gp: 2 }, source: 'SRD 5.2.1' },
  { id: 'javelin', name: 'Javelin', category: 'weapon', weaponType: 'simple-melee', weight: 2, cost: { sp: 5 }, source: 'SRD 5.2.1' },
  { id: 'quarterstaff', name: 'Quarterstaff', category: 'weapon', weaponType: 'simple-melee', weight: 4, cost: { sp: 2 }, source: 'SRD 5.2.1' },
  { id: 'spear', name: 'Spear', category: 'weapon', weaponType: 'simple-melee', weight: 3, cost: { gp: 1 }, source: 'SRD 5.2.1' },
  { id: 'shortbow', name: 'Shortbow', category: 'weapon', weaponType: 'simple-ranged', weight: 2, cost: { gp: 25 }, source: 'SRD 5.2.1' },
  { id: 'flail', name: 'Flail', category: 'weapon', weaponType: 'martial-melee', weight: 2, cost: { gp: 10 }, source: 'SRD 5.2.1' },
  { id: 'greatsword', name: 'Greatsword', category: 'weapon', weaponType: 'martial-melee', weight: 6, cost: { gp: 50 }, source: 'SRD 5.2.1' },
  { id: 'scimitar', name: 'Scimitar', category: 'weapon', weaponType: 'martial-melee', weight: 3, cost: { gp: 25 }, source: 'SRD 5.2.1' },
  { id: 'shortsword', name: 'Shortsword', category: 'weapon', weaponType: 'martial-melee', weight: 2, cost: { gp: 10 }, source: 'SRD 5.2.1' },
  { id: 'longbow', name: 'Longbow', category: 'weapon', weaponType: 'martial-ranged', weight: 2, cost: { gp: 50 }, source: 'SRD 5.2.1' },

  // Ammunition
  { id: 'arrow', name: 'Arrow', category: 'ammunition', bundle: 20, weight: 1, cost: { gp: 1 }, source: 'SRD 5.2.1' },

  // Tools
  { id: 'calligraphers-supplies', name: 'Calligrapher’s Supplies', category: 'tool', weight: 5, cost: { gp: 10 }, source: 'SRD 5.2.1' },
  // The SRD lets the player pick dice, dragonchess, playing cards or three-dragon ante.
  { id: 'gaming-set', name: 'Gaming Set (dice)', category: 'tool', weight: 0, cost: { sp: 1 }, source: 'SRD 5.2.1' },
  { id: 'thieves-tools', name: 'Thieves’ Tools', category: 'tool', weight: 1, cost: { gp: 25 }, source: 'SRD 5.2.1' },

  // Packs
  {
    id: 'dungeoneers-pack',
    name: 'Dungeoneer’s Pack',
    category: 'pack',
    weight: 55,
    cost: { gp: 12 },
    contents: 'Backpack, Caltrops, Crowbar, 2 Flasks of Oil, 10 days of Rations, Rope, Tinderbox, 10 Torches, and Waterskin',
    source: 'SRD 5.2.1',
  },
  {
    id: 'scholars-pack',
    name: 'Scholar’s Pack',
    category: 'pack',
    weight: 22,
    cost: { gp: 40 },
    contents: 'Backpack, Book, Ink, Ink Pen, Lamp, 10 Flasks of Oil, 10 sheets of Parchment, and Tinderbox',
    source: 'SRD 5.2.1',
  },

  // Adventuring gear
  { id: 'book-history', name: 'Book (history)', category: 'gear', weight: 5, cost: { gp: 25 }, source: 'SRD 5.2.1' },
  { id: 'book-prayers', name: 'Book (prayers)', category: 'gear', weight: 5, cost: { gp: 25 }, source: 'SRD 5.2.1' },
  { id: 'crowbar', name: 'Crowbar', category: 'gear', weight: 5, cost: { gp: 2 }, source: 'SRD 5.2.1' },
  { id: 'healers-kit', name: 'Healer’s Kit', category: 'gear', weight: 3, cost: { gp: 5 }, source: 'SRD 5.2.1' },
  { id: 'holy-symbol', name: 'Holy Symbol (amulet)', category: 'gear', weight: 1, cost: { gp: 5 }, source: 'SRD 5.2.1' },
  { id: 'parchment', name: 'Parchment', category: 'gear', weight: 0, cost: { sp: 1 }, source: 'SRD 5.2.1' },
  { id: 'pouch', name: 'Pouch', category: 'gear', weight: 1, cost: { sp: 5 }, source: 'SRD 5.2.1' },
  { id: 'quiver', name: 'Quiver', category: 'gear', weight: 1, cost: { gp: 1 }, source: 'SRD 5.2.1' },
  { id: 'robe', name: 'Robe', category: 'gear', weight: 4, cost: { gp: 1 }, source: 'SRD 5.2.1' },
  // A Wizard's spellbook is made during their apprenticeship, so it has no shop price.
  { id: 'spellbook', name: 'Spellbook', category: 'gear', weight: 3, cost: null, source: 'SRD 5.2.1' },
  { id: 'travelers-clothes', name: 'Traveler’s Clothes', category: 'gear', weight: 4, cost: { gp: 2 }, source: 'SRD 5.2.1' },

  // Sold in Bramblegate's market
  {
    id: 'oil',
    name: 'Flask of Oil',
    category: 'gear',
    weight: 1,
    cost: { sp: 1 },
    text: 'You can douse a creature, object, or space with Oil, or use it as fuel, such as in a lamp.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'rations',
    name: 'Rations',
    category: 'gear',
    weight: 2,
    cost: { sp: 5 },
    text: 'Rations consist of travel-ready food, including jerky, dried fruit, hardtack, and nuts.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'rope',
    name: 'Rope',
    category: 'gear',
    weight: 5,
    cost: { gp: 1 },
    text: 'As a Utilize action, you can tie a knot with Rope if you succeed on a DC 10 Dexterity (Sleight of Hand) check. The Rope can be burst with a successful DC 20 Strength (Athletics) check.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'torch',
    name: 'Torch',
    category: 'gear',
    weight: 1,
    cost: { cp: 1 },
    text: 'A Torch burns for 1 hour, casting Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. When you take the Attack action, you can attack with the Torch, using it as a Simple Melee weapon. On a hit, the target takes 1 Fire damage.',
    source: 'SRD 5.2.1',
  },

  // Potions
  {
    id: 'potion-of-healing',
    name: 'Potion of Healing',
    category: 'potion',
    weight: 0.5,
    cost: { gp: 50 },
    text: 'This potion is a magic item. As a Bonus Action, you can drink it or administer it to another creature within 5 feet of yourself. The creature that drinks the magical red fluid in this vial regains 2d4 + 2 Hit Points.',
    source: 'SRD 5.2.1',
  },
];
