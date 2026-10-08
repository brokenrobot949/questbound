// Reads the Ink tags the UI uses, so the UI never has to parse story text.
//
// Tags on a choice:
//   #check:persuasion:15          the choice makes this check; the card shows "Persuasion · Medium"
//   #spell:light                  the choice uses this spell; the card shows "Spell · Light"
//   #drive:wealth                 the choice fits that Drive; the card says so if it's the hero's
//   #buy:torch                    the choice buys that item; the card shows the price
//   #combat:mill-scavengers       the choice starts that fight; its content runs after it
//   #surprise                     with #combat: the hero strikes first, unseen; the foes roll
//                                 Initiative with Disadvantage
//   #go:larder                    the choice walks to that room of the dungeon you're in; the
//                                 card says so, and its doorway lights up on the map to tap
// Tags on a line of text:
//   #location:Bramblegate, north gate   where the hero is now; shown on the save slot
//   #time:Dusk                    the time of day now; shown in the status line
//   #room:brackenhollow/mouth     the hero is in this room of this dungeon (data/campaign/
//                                 dungeons.js); the map shows it. #room:none leaves the dungeon.

export function parseTags(tags) {
  const parsed = { check: null, spell: null, location: null, time: null, drive: null, buy: null, combat: null, surprise: false, go: null, room: null };
  for (const tag of tags || []) {
    const colon = tag.indexOf(':');
    const key = (colon < 0 ? tag : tag.slice(0, colon)).trim();
    const value = colon < 0 ? '' : tag.slice(colon + 1).trim();
    if (key === 'check') {
      const [testId, dc] = value.split(':').map((part) => part.trim());
      parsed.check = { testId, dc: Number(dc) };
    } else if (key === 'spell') {
      parsed.spell = value;
    } else if (key === 'location') {
      parsed.location = value;
    } else if (key === 'time') {
      parsed.time = value;
    } else if (key === 'drive') {
      parsed.drive = value;
    } else if (key === 'buy') {
      parsed.buy = value;
    } else if (key === 'combat') {
      parsed.combat = value;
    } else if (key === 'surprise') {
      parsed.surprise = true;
    } else if (key === 'go') {
      parsed.go = value;
    } else if (key === 'room') {
      parsed.room = value;
    }
  }
  return parsed;
}
