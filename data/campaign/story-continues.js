// Where the story used to stop "for now", and where it carries on from since the next part was
// written (original). The end card promises "the tale picks up from this point in a later
// update": a hero saved at one of these old ends carries on at continueAt when the save is
// loaded, with the last page they read still on screen above it.
//
//   scene       the knot the story stopped in (a page's scene)
//   continueAt  the knot or stitch the story goes on from now
//
// Add a line whenever a slice turns a "-> END" into the next scene. A scene that still ends
// the story today must not be listed.

export const storyContinues = [
  // Chapter 1 ended with Lark's knock at the door; Chapter 2 begins the next morning.
  { scene: 'ch1_return', continueAt: 'ch2_morning', source: 'original' },
  // Chapter 2 stopped at Morwen's breakfast (or Odda laid before the altar flame).
  { scene: 'ch2_ossuary', continueAt: 'ch2_ossuary.out_to_the_square', source: 'original' },
  // Then at Fen's lead to Cairnfield.
  { scene: 'ch2_stocks', continueAt: 'ch2_old_ford', source: 'original' },
  // Then at the aim north from the Old Ford.
  { scene: 'ch2_old_ford', continueAt: 'ch2_cairnfield', source: 'original' },
];
