// Name tables (original), one per species, for the "Roll a name" buttons at character
// creation. A rolled name is one given name and one family (or clan) name.
// Safe to edit: add, remove or change names freely. Avoid names already used by the
// cast in docs/STORY.md, so a hero isn't mistaken for someone in the story.

export const nameTables = {
  dragonborn: {
    given: ['Arvesh', 'Korrin', 'Sathra', 'Vyrek', 'Ildra', 'Thovan', 'Zeshka', 'Moraxi', 'Tarrek', 'Quilla', 'Drevakh', 'Essira'],
    family: ['Ashscale', 'Vorrathi', 'Kethrenn', 'Emberclaw', 'Durnmaw', 'Sarrath', 'Goldspire', 'Halvorth'],
  },
  dwarf: {
    given: ['Brannoc', 'Durra', 'Torvik', 'Magda', 'Orsk', 'Berrin', 'Ylva', 'Grimma', 'Haldor', 'Kettla', 'Rurik', 'Senna'],
    family: ['Stonebrow', 'Ironhewer', 'Deepdelve', 'Coalbeard', 'Anvilborn', 'Granitefist', 'Copperhelm', 'Flintwhistle'],
  },
  elf: {
    given: ['Caerwyn', 'Ilvanne', 'Sorael', 'Thaliren', 'Evrin', 'Meliandra', 'Faelar', 'Ysmere', 'Nimriel', 'Varion', 'Ellisande', 'Lethiel'],
    family: ['Moonwhisper', 'Silverbough', 'Dawnleaf', 'Starfall', 'Willowmere', 'Thornvale', 'Mistral', 'Brightwater'],
  },
  gnome: {
    given: ['Pip', 'Bodkin', 'Tibbet', 'Fizzwick', 'Marla', 'Orrin', 'Quenby', 'Wendle', 'Juniper', 'Tock', 'Nissa', 'Dabble'],
    family: ['Thistlewick', 'Copperpot', 'Brightgear', 'Puddlefoot', 'Mossbottom', 'Quickfuse', 'Tinderbell', 'Sprocket'],
  },
  goliath: {
    given: ['Haldrun', 'Skarra', 'Veshtu', 'Oronak', 'Bruvha', 'Kelloth', 'Ankra', 'Thessu', 'Margok', 'Ivela', 'Dunmar', 'Ruthka'],
    family: ['Stonestride', 'Peakcaller', 'Cloudhewer', 'Ridgewalker', 'Frostmantle', 'Thunderstep', 'Longreach', 'Skybreaker'],
  },
  halfling: {
    given: ['Tansy', 'Bramwell', 'Posy', 'Wilber', 'Corra', 'Dunstan', 'Hazel', 'Tobin', 'Rosie', 'Alder', 'Milla', 'Barnaby'],
    family: ['Goodbarrel', 'Applewhistle', 'Tealeaf', 'Hearthstone', 'Brambleby', 'Puddingfoot', 'Honeydew', 'Greenbottle'],
  },
  human: {
    given: ['Aldric', 'Bryony', 'Cassian', 'Garret', 'Isolde', 'Jory', 'Maren', 'Rowan', 'Talia', 'Elsabeth', 'Kester', 'Nell'],
    family: ['Fairbrook', 'Marlowe', 'Thorne', 'Haldane', 'Greaves', 'Penhallow', 'Coldwell', 'Ashby'],
  },
  orc: {
    given: ['Dravga', 'Urzog', 'Thokka', 'Garash', 'Volka', 'Rukh', 'Shagra', 'Kordo', 'Ashka', 'Murg', 'Zathra', 'Hrolk'],
    family: ['Ironjaw', 'Stonetusk', 'Blackhand', 'Redhollow', 'Grimtooth', 'Ashborn', 'Wolfrunner', 'Hollowstep'],
  },
  tiefling: {
    given: ['Vesper', 'Ashvael', 'Kesriel', 'Malenna', 'Zevrin', 'Orphea', 'Ember', 'Solace', 'Riven', 'Dusk', 'Calyx', 'Seraphine'],
    family: ['Blackthorn', 'Ashgrave', 'Coalbrook', 'Sablewood', 'Nightwell', 'Cinderly', 'Duskmere', 'Hollowell'],
  },
};
