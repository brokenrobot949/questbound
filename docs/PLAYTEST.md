# How to playtest Act I

Phase 2's gate (DESIGN.md, "Build Phases") is **"Act I plays in about 6 hours"**. Phase 1's still
matters too: it should be fun in 10-minute sessions on a phone. This note says how to run the
playtest and what to bring back from it.

## Before you start

1. Commit and push with GitHub Desktop, and give GitHub Pages a minute or two to update.
2. On your phone, open Questbound at its usual address (on github.io, ending in `/questbound/`).
   If "Update ready — tap to reload" shows, tap it. Adding it to your home screen is fine.
3. **Optional, for clean numbers:** open the game once with `?debug` on the end of the address,
   tap the **Debug** button, scroll to **Playtest log**, and tap **Clear the log**, then **Clear**. That clears only
   the timings, not your saves. Then open the game again *without* `?debug`.
4. Start a **new game** in an empty slot (or one you don't mind losing). Make whatever hero you
   like, or take a Quick Start hero.

## While you play

- Play normally, without `?debug`, in sessions as long or as short as suit you. Stop whenever you
  like: the game saves after every choice.
- **The clock only counts play.** It stops while the game is off screen, and a gap of more than
  5 minutes between taps counts as 5 minutes (you probably put the phone down).
- **Keep notes** as you go, anywhere you like: where you were, and what felt slow, confusing, too
  hard, too easy, or wrong. A screenshot is the quickest note when something looks broken.
- Every 10 sessions the game reminds you to back up. Do it: if the phone clears the browser's
  storage, the save and the timings go with it.

## At the end

- When the story reaches the road south, the **End of Act I** card sums up your act: your hero,
  the days it took, how many sessions, the time played, the quests you finished (of Act I's
  eight), who came with you, and the shard.
- Then open the game with `?debug` on the end of the address, tap the **Debug** button and scroll to
  **Playtest log**. It shows:
  - how many sessions, their average and the longest;
  - how many scene visits, and their average;
  - the highest level reached, and **deaths** (every lost fight, or death outside a fight: each
    one was a Fate's Mercy);
  - **By game:** each game's total time played, then its time in each part of the act: Chapter 1
    (from the north gate), Chapter 2 (from the morning Lark goes missing), Chapter 3 (from the
    dawn before the Kings' Barrow) and the last morning in Bramblegate. STORY.md plans about 2
    hours for each chapter;
  - a table of every scene, with how often you were in it and the average time each visit.
- Take screenshots of the Playtest log (or copy the lines out), and bring them and your notes to
  a new Claude Code session: "Here are my Act I playtest notes. Fix what I found." The next slice
  fixes what you found, before Phase 3 begins.

## Good to know

- The timings live in that phone's browser only. Playing the same save on another device (by
  backing it up and restoring it there) splits the times between the two.
- Deaths are counted from this update on. A game started before it shows none from earlier.
- Debug mode turns off the offline copy while it's on, so every file comes fresh. That's fine
  for reading the log; just play without it.
