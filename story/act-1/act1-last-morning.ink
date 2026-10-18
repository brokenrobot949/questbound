// The end of Act I: one last morning in Bramblegate, then the road south (docs/STORY.md,
// Chapter 3, beat 7, and "Side content").
//
// Each of Act I's side quests is offered at its own chapter's town visit, and any the hero
// missed can still be done here, before the road south (Rob, Oct 18, 2026). So far that's
// Chapter 1's: Too Many Cats (side_cats), the wolf den on the north road (side_wolves) and
// Hob's bet (side_hobs_bet, at Hob's forge, where his blades are for sale too). The flag
// last_morning tells those scenes it's a fortnight later, with the dead stilled.
// Then the ride south, and the End of Act I title card (act1_end).
//
// ch3_night.morning goes on to here. Saves that stopped at that old end carry on here
// (data/campaign/story-continues.js).

=== act1_last_morning ===
~ set_flag("last_morning")
{ act1_last_morning == 1:
    Marchbank has letters for Highcrown to finish before she rides, and says so twice, so the road south will keep until noon. The morning is yours. #location:Bramblegate, the square #time:Morning

    Bramblegate's square is full of people sweeping up after the feast, and every one of them waves at you.{side_quests_left(): A few loose ends are still flapping about the town, if you want to tie them.}
- else:
    {&The square is still busy with brooms and sore heads.|Somebody has hung the feast's bunting back up, crooked.|A child runs past, singing a song about you that is mostly wrong.} #location:Bramblegate, the square
}
-> about

= about
+ {not has_flag("cats_done")} [Ask Morwen whether her cats ever came home]
    -> side_cats -> act1_last_morning
+ {not has_flag("wolf_den_done")} [Read Warden Pike's notice about the wolves on the north road]
    -> side_wolves -> act1_last_morning
+ [Call in at Hob's forge]
    -> smithy -> act1_last_morning
+ [Ride south with the shard]
    -> act1_end

// Hob's forge, on the last morning: his bet, if it's still to win, and his blades.
= smithy
{ smithy == 1:
    Hob's forge is clanging away as if there had never been a feast, though Hob himself is wearing a pair of smoked-glass spectacles and wincing at his own hammer. "The hero!" he says, too loudly, and winces again. #location:Bramblegate, Hob's forge #speaker:hob
- else:
    Hob waves his hammer at you, gently. #location:Bramblegate, Hob's forge
}
-> smithy_talk

= smithy_talk
+ {not has_flag("hobs_bet_done")} [Take Hob's bet: arm-wrestle his apprentice]
    -> side_hobs_bet -> smithy_talk
+ [Look over Hob's blades]
    -> hobs_wares -> smithy_talk
+ [Back to the square]
    ->->

// True while any of Act I's side quests is still undone. Add each new one here.
=== function side_quests_left() ===
~ return not has_flag("cats_done") || not has_flag("wolf_den_done") || not has_flag("hobs_bet_done")

// The road south: the end of Act I.
=== act1_end ===
You take the south road out of Bramblegate a little after noon, with Marchbank's horse clopping along beside you and the shard warm in your pocket, pointing the way. #location:The south road #time:Afternoon
{ companion_alive("odda") && companion_alive("fen"):
    Behind you, Odda and Fen are arguing about whether a breakfast you've already eaten can be counted as provisions.
}
At the top of the first hill you look back. Bramblegate is small from here: smoke from Morwen's chimney, the temple's roof, and somebody up on the town wall who might be Lark, waving.
~ set_flag("act_1_complete")
End of Act I · The Barrow Dead #heading
~ set_objective("Follow the shard south. (Act II is still being written.)")
-> END
