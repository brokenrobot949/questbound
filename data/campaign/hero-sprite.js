// The hero sprite's parts, as 16 × 16 paint-by-numbers grids. Each letter is a colour role,
// filled in from the hero's look (hero-looks.js) when the sprite is drawn; '.' is see-through.
//
// The body, armour, shield, helmet, hood and robe are adapted from DawnLike's commissioned
// player template and its Warrior and Mage clothes (assets/dawnlike/Commissions, CC-BY 4.0,
// by DragonDePlatino with DawnBringer's palette; see CREDITS.md). The other hairstyles, the
// beard and the species features are original additions in the same style.
//
// Colour roles:
//   x o        outline (black, dark plum)
//   S s z Z    skin: highlight, main, shadow, deep shadow
//   H h        hair: highlight, main
//   e          eyes
//   C c v      outfit cloth: light, main, dark (shirt or robe)
//   T t        accent cloth: main, dark (tabard, sash)
//   P p q      trousers        K k j   boots
//   M m N n    armour: highlight, main, shade, dark (steel or leather, from the armour worn)
//   I i        ivory: light, shade (tusks, horn tips, robe trim)
//   U u        horn: light, dark
//   Y          dragon eyes     y   shield boss
//
// The second animation frame is drawn by bobbing the upper body down a pixel, as DawnLike's
// own heroes do. Small heroes leave out one body row and one leg row.

export const SPRITE_SIZE = 16;

// Rows above this one bob down a pixel in the second frame; the legs stay put.
export const BOB_ROWS = 12;

// Rows a Small hero leaves out, so they stand two pixels shorter.
export const SMALL_DROPPED_ROWS = [9, 13];

const blank = '................';
// A full 16-row grid from just the rows that have something in them: { row: 'pixels' }.
function grid(rows) {
  return Array.from({ length: SPRITE_SIZE }, (_, i) => rows[i] || blank);
}

export const body = grid({
  0: '......ooxx......',
  1: '.....osSSsx.....',
  2: '....ossssszx....',
  3: '....xssSSszx....',
  4: '....xsessezx....',
  5: '....oseSSezx....',
  6: '.....ozsszx.....',
  7: '....osoZZxsx....',
  8: '...oSccssccSx...',
  9: '...ocvccccvcx...',
  10: '..osoZsccsZxsx..',
  11: '..ozoPpppPpxzx..',
  12: '...xopqoopqxx...',
  13: '....oxxqqoxx....',
  14: '...oKkjxoKkjx...',
  15: '...xxxxxxxxxx...',
});

export const hairStyles = {
  tousled: grid({
    1: '......hHHh......',
    2: '.....hhhhhh.....',
    3: '.....h....h.....',
    4: '.....H....H.....',
    5: '.....H....H.....',
  }),
  cropped: grid({
    1: '......hHHh......',
    2: '.....hHhhHh.....',
  }),
  long: grid({
    1: '......hHHh......',
    2: '.....hhhhhh.....',
    3: '...xhh....hhx...',
    4: '...xhH....Hhx...',
    5: '...xhH....Hhx...',
    6: '...xhh....hhx...',
    7: '....xh....hx....',
  }),
  bald: grid({}),
};

export const beard = grid({
  5: '.....H....H.....',
  6: '.....hHHHHh.....',
  7: '......hHHh......',
  8: '.......hh.......',
});

export const features = {
  'pointed-ears': grid({
    3: '..x..........x..',
    4: '..xSs......sSx..',
    5: '...x........x...',
  }),
  tusks: grid({
    6: '......I..I......',
  }),
  horns: grid({
    0: '...u........u...',
    1: '....U......U....',
  }),
  'dragon-crest': grid({
    1: '....Z......Z....',
    2: '...Z........Z...',
    4: '......Y..Y......',
    5: '......YZZY......',
  }),
  'goliath-marks': grid({
    3: '.......Z........',
    8: '....Z......Z....',
  }),
};

// Worn over the body when the hero wears armour (from DawnLike's Warrior, without the shield).
export const armor = grid({
  6: '....xk....kx....',
  7: '.....xkkkkx.....',
  8: '....MmxxxxmM....',
  9: '....mnmMMmnm....',
  10: '...z.nNmmNn.z...',
  11: '...Z.TnNNnT.Z...',
  12: '.....TT..TT.....',
  14: '....Kkj..jkK....',
});

// The Warrior's round shield, on the hero's left arm.
export const shield = grid({
  7: '..........xooo..',
  8: '..........oMMno.',
  9: '..........MNNNnx',
  10: '..........MNINNx',
  11: '..........mNyNnx',
  12: '..........onNnx.',
  13: '...........xxx..',
});

// The Mage's robe, worn by classes in robes.
export const robe = grid({
  7: '....xvcCCcv.....',
  8: '....vIxxxxIv....',
  9: '..ovcIccccIcvo..',
  10: '...z.cITTIc.z...',
  11: '...Z.ccTTcv.Z...',
  12: '....vvvccccv....',
  13: '...oCcCCcvvCx...',
  14: '....vIIIIIIvx...',
  15: '....ovcCccvo....',
});

export const headgear = {
  none: grid({}),
  // The Warrior's horned helmet.
  helmet: grid({
    0: '..xIo......oIx..',
    1: '..xIi.mMmN.iIx..',
    2: '..xi.NmMmNn.ix..',
    3: '...x.Noooon.x...',
    4: '.....o.nn.o.....',
  }),
  // The Mage's hood, opened up so the hero's face shows.
  hood: grid({
    0: '.....o....x.....',
    1: '....ovcCCcvx....',
    2: '.....cCccCcx....',
    3: '.....cv..vc.....',
    4: '....xc....c.....',
    5: '....xc....c.....',
    6: '....xc....cx....',
  }),
};

// Classes that wear the robe instead of a shirt and trousers.
export const robedClasses = ['wizard'];
