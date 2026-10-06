// Reads the Ink tags the UI uses, so the UI never has to parse choice text.
//
// Tags on a choice:
//   #check:persuasion:15   the choice makes this check; the card shows "Persuasion · Medium"

export function parseChoiceTags(tags) {
  const parsed = { check: null };
  for (const tag of tags || []) {
    const [key, ...rest] = tag.trim().split(':').map((part) => part.trim());
    if (key === 'check') {
      const [testId, dc] = rest;
      parsed.check = { testId, dc: Number(dc) };
    }
  }
  return parsed;
}
