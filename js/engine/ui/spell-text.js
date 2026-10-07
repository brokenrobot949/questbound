// Words for showing a spell: a one-line summary and the full description.

// "Level 1 Evocation · Action · 120 feet", plus Concentration and Ritual when they apply.
export function spellMeta(spell) {
  const parts = [spell.level === 0 ? `${spell.school} cantrip` : `Level ${spell.level} ${spell.school}`];
  parts.push(spell.castingTime.split(',')[0]); // "Reaction, which you take when…" → "Reaction"
  parts.push(spell.range);
  if (spell.concentration) parts.push('Concentration');
  if (spell.ritual) parts.push('Ritual');
  return parts.join(' · ');
}

// Casting time, components, duration, the description, and how it grows.
export function spellDetails(spell) {
  const lines = [
    `Casting time: ${spell.castingTime}${spell.ritual ? ' or Ritual' : ''}`,
    `Range: ${spell.range} · Components: ${spell.components}`,
    `Duration: ${spell.duration}`,
    '',
    spell.text,
  ];
  if (spell.upgrade) lines.push('', `${spell.level === 0 ? 'Cantrip Upgrade' : 'Using a Higher-Level Spell Slot'}. ${spell.upgrade}`);
  return lines.join('\n');
}
