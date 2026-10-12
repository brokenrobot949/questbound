// Where the story used to stop "for now", and where it carries on from since the next part was
// written (original). The end card promises "the tale picks up from this point in a later
// update": a hero saved at one of these old ends carries on at continueAt when the save is
// loaded, with the last page they read still on screen above it.
//
//   scene       the knot the story stopped in (a page's scene)
//   continueAt  the knot or stitch the story goes on from now
//   unlessFlag  (optional) a hero with this story flag stays put: their path through the
//               scene still ends the story today
//
// Add a line whenever a slice turns a "-> END" into the next scene. A scene that still ends
// the story today must not be listed, unless unlessFlag picks out the path that does.

export const storyContinues = [
  // Chapter 1 ended with Lark's knock at the door; Chapter 2 begins the next morning.
  { scene: 'ch1_return', continueAt: 'ch2_morning', source: 'original' },
  // Chapter 2 stopped at Morwen's breakfast (or Odda laid before the altar flame).
  { scene: 'ch2_ossuary', continueAt: 'ch2_ossuary.out_to_the_square', source: 'original' },
  // Then at Fen's lead to Cairnfield.
  { scene: 'ch2_stocks', continueAt: 'ch2_old_ford', source: 'original' },
  // Then at the aim north from the Old Ford.
  { scene: 'ch2_old_ford', continueAt: 'ch2_cairnfield', source: 'original' },
  // Then at the aim back to Bramblegate after Cairnfield. If the Old Ford fell, the party went
  // to Bramblegate before Cairnfield, and that path still stops there (the eve of the barrow).
  { scene: 'ch2_cairnfield', continueAt: 'ch2_homeward', unlessFlag: 'ford_fell', source: 'original' },
  // Then at the eve of the barrow: at Bramblegate's north gate (the Old Ford held), or after
  // Cairnfield (it fell: the line above skips those saves, so they take this one).
  { scene: 'ch2_rally', continueAt: 'ch2_eve', source: 'original' },
  { scene: 'ch2_cairnfield', continueAt: 'ch2_eve', source: 'original' },
  // Then at dawn after the eve of the barrow; Chapter 3 begins that day.
  { scene: 'ch2_eve', continueAt: 'ch3_dark_moon', source: 'original' },
];
