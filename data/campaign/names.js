// Name tables (original), one per species, for the "Roll a name" buttons at character
// creation. A rolled name is one given name and one family (or clan) name.
// Safe to edit: add, remove or change names freely. Avoid names already used by the
// cast in docs/STORY.md or by the Quick Start heroes and their Bonds (and names a letter
// away from them, or that rhyme with them), so a hero isn't mistaken for someone in the story.

export const nameTables = {
  dragonborn: {
    given: ['Arvesh', 'Korvash', 'Sathra', 'Vyrek', 'Ildra', 'Thovan', 'Zeshka', 'Moraxi', 'Tarrek', 'Nyrrha', 'Drevakh', 'Essira'],
    family: ['Ashscale', 'Vorrathi', 'Kethrenn', 'Emberclaw', 'Durnmaw', 'Sarrath', 'Goldspire', 'Halvorth'],
  },
  dwarf: {
    given: ['Dagny', 'Durra', 'Torvik', 'Magda', 'Orsk', 'Hakon', 'Ylva', 'Grimma', 'Haldor', 'Ragna', 'Rurik', 'Bodil'],
    family: ['Stonebrow', 'Ironhewer', 'Deepdelve', 'Coalbeard', 'Anvilborn', 'Granitefist', 'Copperhelm', 'Flintwhistle'],
  },
  elf: {
    given: ['Caerwyn', 'Ilvanne', 'Mirethil', 'Thaliren', 'Taeral', 'Meliandra', 'Faelar', 'Ysmere', 'Nimriel', 'Calethor', 'Ellisande', 'Lethiel'],
    family: ['Moonwhisper', 'Silverbough', 'Dawnleaf', 'Starfall', 'Willowmere', 'Leafsong', 'Mistral', 'Riverwind'],
  },
  gnome: {
    given: ['Pip', 'Bodkin', 'Gimble', 'Fizzwick', 'Marla', 'Pockle', 'Quenby', 'Wendle', 'Sprig', 'Tock', 'Nissa', 'Dabble'],
    family: ['Thistlewick', 'Copperpot', 'Brightgear', 'Puddlefoot', 'Ditherby', 'Quickfuse', 'Nackleberry', 'Sprocket'],
  },
  goliath: {
    given: ['Haldrun', 'Skarra', 'Veshtu', 'Oronak', 'Bruvha', 'Kelloth', 'Ankra', 'Thessu', 'Margok', 'Ivela', 'Thalgar', 'Ruthka'],
    family: ['Stonestride', 'Peakcaller', 'Cloudhewer', 'Ridgewalker', 'Frostmantle', 'Thunderstep', 'Longreach', 'Skybreaker'],
  },
  halfling: {
    given: ['Tansy', 'Bramwell', 'Clover', 'Wilber', 'Corra', 'Dunstan', 'Hazel', 'Arlo', 'Rosie', 'Alder', 'Milla', 'Barnaby'],
    family: ['Goodbarrel', 'Applewhistle', 'Tealeaf', 'Plumtree', 'Brambleby', 'Puddingfoot', 'Honeydew', 'Greenbottle'],
  },
  human: {
    given: ['Aldric', 'Bryony', 'Cassian', 'Bastian', 'Imogen', 'Jory', 'Linnea', 'Rowan', 'Talia', 'Elsabeth', 'Godwin', 'Agnes'],
    family: ['Fairbrook', 'Marlowe', 'Thorne', 'Haldane', 'Greaves', 'Whitlock', 'Coldwell', 'Linden'],
  },
  orc: {
    given: ['Dravga', 'Urzog', 'Thokka', 'Garash', 'Volka', 'Rukh', 'Shagra', 'Kordo', 'Ashka', 'Murg', 'Zathra', 'Hrolk'],
    family: ['Ironjaw', 'Stonetusk', 'Blackhand', 'Redhollow', 'Grimtooth', 'Stormhide', 'Wolfrunner', 'Hollowstep'],
  },
  tiefling: {
    given: ['Nocturne', 'Ashvael', 'Kesriel', 'Malenna', 'Zevrin', 'Orphea', 'Ember', 'Solace', 'Riven', 'Dusk', 'Calyx', 'Seraphine'],
    family: ['Blackthorn', 'Ashgrave', 'Coalbrook', 'Sablewood', 'Nightwell', 'Cinderly', 'Duskmere', 'Hollowell'],
  },
};
