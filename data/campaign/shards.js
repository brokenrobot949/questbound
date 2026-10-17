// The shards of the Concord Crown (original; docs/STORY.md, "The seven shards"). Only the
// shards the story has reached are here; the rest join them in Act II.
//
//   name    shown on a choice card that uses the shard's power (#shard:names)
//   item    the shard in the hero's pack (data/campaign/items.js): has_shard("names") is true
//           while they carry it
//   power   what it does, in a few words
//
// Using a power raises the Whisper. Until the Whisper is built (Phase 3), each scene that uses
// one sets a story flag of its own, listed in docs/DESIGN.md ("The Whisper").

export const shards = [
  {
    id: 'names',
    name: 'Shard of Names',
    item: 'shard-of-names',
    power: 'Speak with the dead, and learn any living creature’s name.',
    source: 'original',
  },
];
