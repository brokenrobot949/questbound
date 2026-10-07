// Reads the Ink tags the UI uses, so the UI never has to parse story text.
//
// Tags on a choice:
//   #check:persuasion:15          the choice makes this check; the card shows "Persuasion · Medium"
//   #spell:light                  the choice uses this spell; the card shows "Spell · Light"
//   #drive:wealth                 the choice fits that Drive; the card says so if it's the hero's
//   #buy:torch                    the choice buys that item; the card shows the price
// Tags on a line of text:
//   #location:Bramblegate, north gate   where the hero is now; shown on the save slot
//   #time:Dusk                    the time of day now; shown in the status line

export function parseTags(tags) {
  const parsed = { check: null, spell: null, location: null, time: null, drive: null, buy: null };
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
    }
  }
  return parsed;
}
