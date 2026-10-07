// Armor table (SRD 5.2.1).
//   baseAc       the AC the armour gives
//   dexCap       how much of the Dexterity modifier counts: null = all of it, 2 = at most +2, 0 = none
//   strength     Strength needed; below it, the wearer's Speed drops by 10 feet (0 = no requirement)
//   stealthDisadvantage   Disadvantage on Dexterity (Stealth) checks
//   weight in pounds, cost in GP
// A Shield adds its acBonus on top of armour.

export const armor = [
  { id: 'padded-armor', name: 'Padded Armor', category: 'light', baseAc: 11, dexCap: null, strength: 0, stealthDisadvantage: true, weight: 8, cost: 5, source: 'SRD 5.2.1' },
  { id: 'leather-armor', name: 'Leather Armor', category: 'light', baseAc: 11, dexCap: null, strength: 0, stealthDisadvantage: false, weight: 10, cost: 10, source: 'SRD 5.2.1' },
  { id: 'studded-leather-armor', name: 'Studded Leather Armor', category: 'light', baseAc: 12, dexCap: null, strength: 0, stealthDisadvantage: false, weight: 13, cost: 45, source: 'SRD 5.2.1' },
  { id: 'hide-armor', name: 'Hide Armor', category: 'medium', baseAc: 12, dexCap: 2, strength: 0, stealthDisadvantage: false, weight: 12, cost: 10, source: 'SRD 5.2.1' },
  { id: 'chain-shirt', name: 'Chain Shirt', category: 'medium', baseAc: 13, dexCap: 2, strength: 0, stealthDisadvantage: false, weight: 20, cost: 50, source: 'SRD 5.2.1' },
  { id: 'scale-mail', name: 'Scale Mail', category: 'medium', baseAc: 14, dexCap: 2, strength: 0, stealthDisadvantage: true, weight: 45, cost: 50, source: 'SRD 5.2.1' },
  { id: 'breastplate', name: 'Breastplate', category: 'medium', baseAc: 14, dexCap: 2, strength: 0, stealthDisadvantage: false, weight: 20, cost: 400, source: 'SRD 5.2.1' },
  { id: 'half-plate-armor', name: 'Half Plate Armor', category: 'medium', baseAc: 15, dexCap: 2, strength: 0, stealthDisadvantage: true, weight: 40, cost: 750, source: 'SRD 5.2.1' },
  { id: 'ring-mail', name: 'Ring Mail', category: 'heavy', baseAc: 14, dexCap: 0, strength: 0, stealthDisadvantage: true, weight: 40, cost: 30, source: 'SRD 5.2.1' },
  { id: 'chain-mail', name: 'Chain Mail', category: 'heavy', baseAc: 16, dexCap: 0, strength: 13, stealthDisadvantage: true, weight: 55, cost: 75, source: 'SRD 5.2.1' },
  { id: 'splint-armor', name: 'Splint Armor', category: 'heavy', baseAc: 17, dexCap: 0, strength: 15, stealthDisadvantage: true, weight: 60, cost: 200, source: 'SRD 5.2.1' },
  { id: 'plate-armor', name: 'Plate Armor', category: 'heavy', baseAc: 18, dexCap: 0, strength: 15, stealthDisadvantage: true, weight: 65, cost: 1500, source: 'SRD 5.2.1' },
];

export const shield = { id: 'shield', name: 'Shield', acBonus: 2, weight: 6, cost: 10, source: 'SRD 5.2.1' };

// With no armour: 10 plus the Dexterity modifier.
export const unarmoredBaseAc = 10;
