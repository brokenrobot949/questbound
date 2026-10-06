// Reads the Ink tags the UI uses, so the UI never has to parse story text.
//
// Tags on a choice:
//   #check:persuasion:15          the choice makes this check; the card shows "Persuasion · Medium"
// Tags on a line of text:
//   #location:Bramblegate, north gate   where the hero is now; shown on the save slot

export function parseTags(tags) {
  const parsed = { check: null, location: null };
  for (const tag of tags || []) {
    const colon = tag.indexOf(':');
    const key = (colon < 0 ? tag : tag.slice(0, colon)).trim();
    const value = colon < 0 ? '' : tag.slice(colon + 1).trim();
    if (key === 'check') {
      const [testId, dc] = value.split(':').map((part) => part.trim());
      parsed.check = { testId, dc: Number(dc) };
    } else if (key === 'location') {
      parsed.location = value;
    }
  }
  return parsed;
}
