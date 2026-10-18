// Chapter 2 · The Barrow Road, beat 8: the eve of the barrow (docs/STORY.md).
//
// The night before the dark of the moon, in the ruined sheepfold an hour short of Cairnfield.
// If the Old Ford held, the party comes up from Bramblegate that day (from ch2_rally); if it
// fell, they've been lying low near Cairnfield since the camp (from ch2_cairnfield.road_back).
//
// The camp (Rob's choices, Oct 12, 2026):
//   Talks, one each everyone gets: Odda on what you did with Prior Crane; Fen on the Precentor,
//     who put the price on his head. A companion who was raised by the great candle can be asked
//     what being dead was like.
//   A second talk if they like you (likes_you: approval 3 or more, approvalBands in
//     data/campaign/companions.js): Odda's order was founded in Emberdeep's forges, and she means
//     to go there (odda_told_of_emberdeep, for Chapter 6); Fen stole the Precentor's ledger of
//     names (fen_told_of_ledger, for Chapter 11). If they dislike you (dislikes_you: -2 or less),
//     the first talk ends with them saying so (odda_means_to_go_home, fen_just_arithmetic).
//   Going over tomorrow all together: who's coming, the ward-word, Garrick, a Rival.
//   A quiet watch, no rolls: the dead walk in across the moor with the last stones, and the hymn
//     starts up under the hill.
//   The long rest, and a milestone: a hero short of level 4 is brought up to 2,700 XP.
// Approval stays hidden: the talks are where it shows.

=== ch2_eve ===
* {not has_flag("ford_fell")} [Follow the barrow road north, onto the moor]
    -> back_north
* {has_flag("ford_fell")} [Lie low near Cairnfield until the dark of the moon]
    -> lie_low

// The Old Ford held: up from Bramblegate in a day.
= back_north
{ has_flag("hobs_ore_taken"):
    You leave Dabbin at the Old Ford with his crate of star-iron, and cross the river on foot. #location:The barrow road #time:Midday
- else:
    A carter taking stores up to the Old Ford lets you ride on his sacks, and by noon you're across the river and walking. #location:The barrow road #time:Midday
}
{ has_flag("varrow_rallied"):
    Behind you on the road, Captain Varrow's watch comes marching north in a long file, spears on their shoulders. Varrow lifts a hand to you, once, and that's all.
}
{ has_flag("nettle_rallied"):
    Once, far off in the heather, you're almost sure you see a goblin wave at you. Then there's nothing there at all.
}
By nightfall you're back at the ruined sheepfold in its hollow, an hour short of Cairnfield. #location:A sheepfold on the high moor #time:Night
{ has_flag("cairnfield_won"):
    No juniper smoke goes up beyond the ridge tonight. The Choir's camp is ashes, and whatever's left of them is inside the hill.
- else:
    Beyond the ridge the Choir's juniper smoke still goes up into the dark.
}
-> camp

// The Old Ford fell: the party has been near Cairnfield since the camp.
= lie_low
For two days you lie low in the ruined sheepfold, an hour short of Cairnfield, and take turns up on the ridge, watching the barrow. #location:A sheepfold on the high moor
{ has_flag("cairnfield_won"):
    Nobody comes out of it. Whatever's left of the Choir is inside the hill now, with the Cantor.
- else:
    The Choir comes and goes from its grey tents, the dead work in the heather, and the black water runs out of the sluice and never stops.
}
On the second night the moon is no more than a paring. Tomorrow there won't be one at all. #time:Night
-> camp

// ---- The camp ----

= camp
{ companion_alive("odda"):
    Odda brews tea on a fire no bigger than her two hands, and hands it round without asking who wants any.
}
{ companion_alive("fen"):
    Fen sits with his back to the wall and his knife across his knees, cleaning nothing in particular with great care.
}
{ not companion_alive("odda") && not companion_alive("fen"):
    You make a cold camp behind the sheepfold wall, alone, and eat without tasting it. The moor is very big and very quiet, and tomorrow is very close.
}
{ has_flag("rival_taken"):
    Somewhere under that hill is {bond_name()}, in Choir chains. They'd hate to be rescued by you. They're going to be, all the same.
}
-> talk

// The talks loop back here, and sleep ends them.
= talk
* {companion_alive("odda")} [Ask Odda what she makes of what you did with the Prior]
    -> odda_prior
* {companion_alive("odda") && has_flag("odda_raised")} [Ask Odda what it was like, being dead]
    -> odda_dead
* {odda_prior > 0 && likes_you("odda")} [Sit with Odda while the fire burns down]
    -> odda_emberdeep
* {companion_alive("fen")} [Ask Fen about the Precentor]
    -> fen_precentor
* {companion_alive("fen") && has_flag("fen_raised")} [Ask Fen what it was like, being dead]
    -> fen_dead
* {fen_precentor > 0 && likes_you("fen")} [Ask Fen what he left out]
    -> fen_ledger
* {companion_alive("odda") || companion_alive("fen")} [Go over tomorrow, all together]
    -> tomorrow
+ [Get some sleep]
    -> watch

= odda_prior
{
    - has_flag("crane_confessed"):
        "I keep hearing Morwen," Odda says. "'Well. The roof is better.'" She laughs into her tea, despite herself. #speaker:odda
        "He'll do, the Prior. Abbess Hulda is fierce, but she's fair. Fairer than I'd have been, at his age." #speaker:odda
    - has_flag("crane_made_amends"):
        "You were gentler with him than I'd have been," Odda says. "I've been turning it over all the way up the road, deciding whether that was wise or soft." #speaker:odda
        She sips her tea. "Wise, I think. Don't let it go to your head." #speaker:odda
    - has_flag("crane_exposed"):
        "He's in a cell because his roof fell in," Odda says. "I know what he did. I know. But the Flame forgives what the reeve's law can't, and you never gave it the chance." #speaker:odda
    - has_flag("crane_blackmailed"):
        Odda doesn't answer for a long time. "I'll not talk about the Prior," she says at last. "Not tonight. Maybe not ever." She hands you your tea without looking at you. #speaker:odda
    - else:
        "The Prior?" Odda shakes her head. "Let the Flame sort him out. We've the barrow to think of." #speaker:odda
}
-> odda_feels

// How Odda feels about the hero shows at the end of her first talk.
= odda_feels
{
    - likes_you("odda"):
        She's quiet a while. Then: "There's something I've not told anyone up here," she says. "Ask me later, when the fire's down." #speaker:odda
    - dislikes_you("odda"):
        "I'll see this barrow through with you," she says. "I owe Garrick that, and Lark. After that, I think I'll go home to my order." She says it kindly, which is somehow worse. #speaker:odda
        ~ set_flag("odda_means_to_go_home")
}
-> talk

= odda_dead
"Quiet," Odda says. "Like the moment before the kettle sings. I don't remember anything else, and I've decided I'm glad of it." #speaker:odda
She turns her cup in her hands. "Don't tell the Prior the Flame felt warm. He'll weep, and then I'll have to be kind to him." #speaker:odda
-> talk

// Odda likes the hero: her order's roots (Chapter 6, Emberdeep).
= odda_emberdeep
~ set_flag("odda_told_of_emberdeep")
"My order wasn't founded in a temple," Odda says, when the fire's no more than a red eye in the dark. "It was founded in a forge. Emberdeep, under the mountains, where my grandmother's grandmother kept the great fires." #speaker:odda
"The first Flame was carried out of Emberdeep in a lantern, by a smith who'd sworn to keep something burning. The old lists don't say what for. Only that the forge-fire and the Flame are the same fire." #speaker:odda
"{has_flag("flame_spent"):The Prior said it was lit from a fire that held back the dark|The lists say it was lit from a fire that held back the dark}." She looks at the black bulk of the Kings' Barrow against the stars. "When we're out of that hole, I mean to go to Emberdeep and ask them what dark. You could come, if you like." #speaker:odda
-> talk

= fen_precentor
"The Precentor." Fen doesn't look up from his knife. "She's the one who put the price on my head, since you ask. Double for dead." #speaker:fen
"Nobody sees her face. She sings from behind a screen of grey gauze, and when she stops, the whole Choir holds its breath till she starts again. Vesk would die for her.{has_flag("rhosyn_dead"): Rhosyn did, in a way.| So would Rhosyn.}" #speaker:fen
"I stood close enough once to see her hands. Younger than you'd think. Rings on every finger, and one of them a signet with a crown cut in it." He shrugs. "Odd thing for a hymn-singer to wear." #speaker:fen
~ set_flag("heard_of_precentor_signet")
{ has_flag("saw_precentor_seal"):
    You think of the grey wax on the letter in the hanging tree, and the crown cut deep into it.
}
-> fen_feels

// How Fen feels about the hero shows at the end of his first talk.
= fen_feels
{
    - likes_you("fen"):
        He turns the knife over, and over again. "There's a bit I left out," he says. "Later, when I've worked out how to say it." #speaker:fen
    - dislikes_you("fen"):
        "Don't go getting the idea we're friends," Fen says. "The Choir wants me dead, and you're very hard to kill. It's arithmetic. That's all this is." #speaker:fen
        ~ set_flag("fen_just_arithmetic")
}
-> talk

= fen_dead
"Dark," Fen says. "Very dark, and very quiet, and nobody had a hand in my purse, which made a change." #speaker:fen
He's quiet a moment. "I didn't care for it. I mean not to do it again for a good long while." #speaker:fen
-> talk

// Fen likes the hero: the ledger he stole from the Choir (Chapter 11).
= fen_ledger
~ set_flag("fen_told_of_ledger")
{ companion_alive("odda"):
    Fen waits until Odda is snoring, a sound like a small, contented bear.
}
{ has_flag("fen_dodged_the_book"):
    "That book in the letter at the hanging tree. I told you I'd never read one. I lied." #speaker:fen
}
"I didn't just walk out of the Choir," he says, very low. "I took something with me. The Precentor's ledger: who pays them, who they've bought, and what they bought them with. Every name." #speaker:fen
"They think I burned it. I didn't. It's sewn into the lining of a coat, somewhere I'm not telling even you." He grins, a little sickly, in the firelight. "That's why it's double for dead. They want me quiet. Some of the names in that book wear chains of office." #speaker:fen
-> talk

// The night before: who's coming, and what's waiting.
= tomorrow
You go over it all once more by the fire, the way soldiers do on the night before.
{ has_flag("varrow_rallied"):
    Captain Varrow's watch will hold the outer cairns, so whatever comes out of the barrow doesn't reach the road.
}
{ has_flag("nettle_rallied"):
    Somewhere out in the dark, Nettle's goblins are getting ready to be extremely loud.
}
{ has_flag("knows_ward_word"):
    At the barrow's gate, a name its guardians were made to obey: Ysolde.
}
{ has_flag("knows_miller_at_sluices"):
    Garrick, at his sluice wheels in the flooded lower vault.
}
{ has_flag("rival_taken"):
    {bond_name()}, somewhere in the dark under the hill.
}
{ has_flag("vesk_warned"):
    And Cantor Vesk, waiting. He knows you're coming.
}
{ not has_flag("varrow_rallied") && not has_flag("nettle_rallied"):
    Nobody else is coming. It'll be you and the people round this fire, and that's all.
}
{ companion_alive("fen"):
    "I've had worse odds," Fen says. "I've had worse company, too, though not lately." #speaker:fen
}
{ companion_alive("odda"):
    { has_flag("knows_ward_word"):
        "Say the name like you mean it, at the gate," Odda says. "Old things can tell." #speaker:odda
    - else:
        "We go in, we bring Garrick out, and we stop that hymn," Odda says. "In that order, if it'll let us." #speaker:odda
    }
}
-> talk

// ---- The watch, and the dark of the moon ----

= watch
{
    - companion_alive("odda") && companion_alive("fen"):
        Odda takes the first watch, Fen the second, and you the last, in the coldest hour before dawn.
    - companion_alive("odda"):
        Odda takes the first watch, and you the second, in the coldest hour before dawn.
    - companion_alive("fen"):
        Fen takes the first watch, and you the second, in the coldest hour before dawn.
    - else:
        You sleep in snatches, and wake for good in the coldest hour before dawn.
}
Far off across the moor, something moves. The dead: a long, slow line of them, walking in out of the dark from every side towards the Kings' Barrow, each with a stone in its arms. Nobody sings them on. They know the way now.
They pass the sheepfold a long bowshot off, and never turn their heads. When the last of them has gone in at the low door in the barrow's flank, the singing starts up under the hill, so deep and slow that you feel it in the ground more than hear it.
{ companion_alive("odda") || companion_alive("fen"):
    Behind you, someone stirs, and listens, and lies down again. Nobody says a word.
}
~ long_rest()
// STORY.md: you reach level 4 here. Most heroes already have.
~ xp_milestone(4)
Dawn comes grey and cold over the moor. Tonight, there will be no moon at all. #time:Dawn
// Chapter 3 begins (ch3-barrow-gate.ink), and sets the aim: into the barrow tonight.
-> ch3_dark_moon
