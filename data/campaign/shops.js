// Shops (original): places in the story that sell things, and the discounts the story can win
// there. What each shop stocks is in its scene (story/common/), as choices tagged
// #buy:item #shop:id; prices come from the item's own data (data/srd/equipment.js).
//
//   discounts  [{ flag, percent, reason }]: while the story flag is set, everything in the shop
//              costs that much less (rounded down to the copper), and the price on the card
//              says why. Safe to edit the numbers and the words.

export const shops = [
  {
    id: 'hobs-forge',
    name: 'Hob’s forge',
    discounts: [{ flag: 'hob_discount', percent: 10, reason: 'Hob’s bet' }],
    source: 'original',
  },
];
