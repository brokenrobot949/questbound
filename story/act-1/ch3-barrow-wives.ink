// Chapter 3 side quest, The Barrow-Wives (docs/STORY.md, "Chapter 3 side content").
//
// The Three Wives are three lesser barrows in a ring on a knoll above the barrow road, an hour
// north of Bramblegate: oath-graves, like every little grave on the road, and like every one
// of them opened when the dead carried their capstones north. The night the Kings' Barrow
// shook (the shard waking, and something far below turning over in its sleep), what lay in
// these three rose, half-unmade: three of the first queen's sworn, each missing one of the
// three things the Unking unmakes. Shepherds call them the Barrow-Wives.
//
// Rob's choices, Oct 18, 2026:
//   - Seen on the walk home (ch3_homecoming.the_road, saw_the_barrow_wives): three grey women
//     keening on the barrows at dusk. Garrick begs to get home to Lark, so you walk on. Played
//     on the last morning of Act I (act1_last_morning), at level 5: Warden Pike asks.
//   - Each barrow-wife is a Specter, laid to rest by giving back what she lost (worth her
//     200 XP, like any fight avoided). A wrong step, or drawing steel (Odda −1, if it was the
//     first thing you tried), and she comes for you:
//     a fight with her alone, in her barrow (barrow-wife). Destroyed, she's gone, but not at
//     rest.
//   - What they lost: a name, an oath and a memory.
//       The east barrow (east_wife_*): her name. The Shard of Names finds it (named_sunniva, a
//         flag for the Whisper), or History 13 knows the heron on her bier from an old song,
//         or Odda says the old lists of the sworn while you watch for the one that stills her
//         (Insight 12). It's Sunniva, who kept the Heron Ford.
//       The west barrow (west_wife_*): her oath. Say it with her: no roll if you swore it
//         under the Kings' Barrow (swore_the_oath), or swear it now and mean it (a Glory
//         moment, swore_the_oath); or say the words as the faith keeps them (Religion 13, or
//         10 with Odda).
//       The north barrow (north_wife_*): her memory. A keepsake the dead dragged out with her
//         grave goods and dropped in the heather: a silver locket with a child's hair in it.
//         Perception 13, Survival 12 on the drag marks, Fen's eyes, or Detect Magic (the
//         oath-ward's glow is on everything that lay in an oath-grave).
//   - The reward: the last of them to lie down holds out her grey cloak: a Cloak of Protection
//     (SRD 5.2.1, uncommon). If the last barrow ended in a fight, the cloak lies folded on the
//     grass in the middle of the ring when you come out. With none of them at rest, there's no
//     cloak.
// Quest XP 50 (barrow_wives_done). Losing a fight is Fate's Mercy (barrow_wives_fates_mercy):
// someone drags you out into the sun, where she can't follow, and your purse stays in the dark;
// the quest ends there, with the Wives still keening. A companion who falls in a barrow
// (odda_fell_at_the_three_wives, fen_fell_at_the_three_wives) is carried home to the temple.
//
// A tunnel: the last morning calls it, and it returns there.

=== side_barrow_wives ===
~ start_quest("barrow-wives")
{ has_flag("saw_the_barrow_wives"):
    Warden Pike is on the north gate, looking up the barrow road with her arms folded. "You saw them," she says. "Coming home. Garrick's told half the town, and the other half's heard it from the first half." #location:Bramblegate, north gate #time:Morning #speaker:pike
- else:
    Warden Pike is on the north gate, nailing up a fresh notice: KEEP OFF THE THREE WIVES AFTER DARK. "Since the night the hill shook up north," she says, "there's been three grey women standing on the Three Wives every dusk, keening. That's the old barrows on the knoll, an hour up the barrow road." #location:Bramblegate, north gate #time:Morning #speaker:pike
}
"A shepherd went up with a lantern the second night, to see. He came down with his hair gone white over one ear and his arm dead to the elbow, and he won't say what touched him." She looks at you. "The reeve says ghosts aren't in his budget. I'd still be glad if somebody went up there. By daylight, if they've any sense." #speaker:pike
~ quest_note("barrow-wives", "Since the night the Kings' Barrow shook, three grey women have stood keening on the Three Wives every dusk. A shepherd who went up with a lantern came down white-haired, his arm dead to the elbow. Warden Pike would be glad if somebody went up, by daylight.")
-> knoll

// The Three Wives, in the morning sun.
= knoll
// Who's with you and on their feet, so the scene knows who fell here (the_fallen).
{ companion_alive("odda"):
    ~ set_flag("odda_at_the_three_wives")
}
{ companion_alive("fen"):
    ~ set_flag("fen_at_the_three_wives")
}
An hour up the barrow road a green knoll rises out of the heather, with three barrows on its crown in a ring, their doors facing in. Every one stands open, its capstone gone like every other grave on the road. In the morning sun there's nothing here but larks and a cold you can feel through your boots. #location:The Three Wives #time:Morning
Whatever keens here at dusk keeps to the dark by day. The three low doorways look back at you.
{ companion_alive("odda"):
    "The little graves," Odda says. "Seals, I said once. When the barrow shook, something under all of them turned over in its sleep, and these three had no stones on them to keep it out." #speaker:odda
}
{ companion_alive("fen"):
    "Lovely," Fen says. "Which one first? I vote none of them, but I can see I'm outnumbered." #speaker:fen
}
-> ring

// The ring of barrows: each once, in any order.
= ring
{ wife_done("east") && wife_done("west") && wife_done("north"):
    -> farewell
}
{ ring > 1:
    You come back out into the sun on the knoll, blinking.
}
* [Go into the east barrow, where a bird is cut in the stone over the door]
    -> east_barrow
* [Go into the west barrow, the biggest of the three]
    -> west_barrow
* [Go into the north barrow, its mouth half-choked with heather]
    -> north_barrow

// ---- The east barrow: the wife who lost her name ----

= east_barrow
You duck under the lintel into a short stone passage, and then a round chamber, with the daylight thin behind you. Old bones lie scattered on the floor. At the far side a woman's skeleton lies on a stone bier under the rags of a grey cloak, and over the bier something is carved in the wall. #location:The Three Wives, the east barrow
The grey shape rises out of the bones as you watch: a woman, thin as smoke, hooded, swaying. Where her face should be there's nothing at all, smooth as a thumbprint rubbed out of wet clay. She turns it towards you and holds out one hand, slowly, as if she's asking you something.
The carving over the bier is a name. You're sure it's a name. But when you look at it, the letters slide away from your eyes like fish in a stream.
{ companion_alive("odda"):
    "Somebody's taken her name," Odda says, very quietly. "Not off the stone. Out of the world." #speaker:odda
}
* {has_shard("names")} [Hold up the shard, and ask it her name #shard:names]
    ~ set_flag("named_sunniva")
    You hold the Shard of Names up in the dark, and ask it.
    It goes cold in your fist, colder than the barrow, and a name comes up out of somewhere very deep, like a bubble rising through black water: Sunniva.
    { companion_alive("odda"):
        { has_flag("named_hesper") || has_flag("asked_the_dead_cantor"):
            "Again," Odda says, not quite to you. #speaker:odda
        }
    }
    -> east_named
* [Look at the bier for some sign of who she was #check:history:13 #drive:knowledge]
    ~ drive_moment("knowledge")
    The side of the bier is carved with a heron standing in reeds, a sword held crosswise in its beak.
    { check("history", 13):
        You know that heron. There's an old song on the barrow road, sung in inns when the night gets late and maudlin: "Sunniva at the Heron Ford", about one of the first queen's sworn who held a river crossing alone against something that came up out of the water, and never told anyone what it was.
        -> east_named
    - else:
        A heron. A sword. It ought to mean something, and it doesn't, and she's coming closer. You guess at a name, any name, an old one.
        -> east_wrong
    }
* {companion_alive("odda")} [Ask Odda to say the old lists of the sworn, and watch the grey woman for the name that stills her #check:insight:12]
    "My order keeps the old lists," Odda says. "Every one of the queen's sworn, by the roads they kept. If she's one of them, she's in there." She shuts her eyes and begins, under her breath, name after name, in her order's slow sing-song.
    { check("insight", 12):
        On the eleventh name the grey woman's hand stops in the air, and her blank face turns to Odda, and stays there. Odda says it again, louder. "Sunniva. Sunniva of the Heron Ford."
        -> east_named
    - else:
        The names go by like water. Did her hand move then, on the fourth, or was it the draught from the door? You stop Odda, and say it, and as soon as it's out of your mouth you know it was the wrong one.
        -> east_wrong
    }
* [Draw steel before she reaches you #combat:barrow-wife]
    -> fought("east", true)

// Given her name back.
= east_named
"Sunniva," you say.
Her face comes back the way a reflection settles on water when the wind drops: a strong-jawed woman of forty or so, with laughter-lines and a broken nose, looking at you in some surprise. Her lips move round her own name. Over the bier the carving stops sliding, and reads SUNNIVA, WHO KEPT THE HERON FORD.
She nods to you once, the way a soldier does, and lies down on her bier, and the grey of her goes into the bones like mist into the ground.
~ quest_note("barrow-wives", "The east barrow: the barrow-wife had lost her name. It was Sunniva, who kept the Heron Ford. Given it back, she lay down at rest.")
-> at_rest("east")

// A wrong name, or none: she comes for you.
= east_wrong
The barrow-wife's blank face splits open on a sound like tearing silk, and her hand closes into a claw, and she comes for you.
* [Fight #combat:barrow-wife]
    -> fought("east", false)

// ---- The west barrow: the wife who lost her oath ----

= west_barrow
The west barrow is the biggest of the three, and the coldest. Its chamber is high enough to stand in, and the bier at its far side is empty but for a scatter of bones and a rusted sword. #location:The Three Wives, the west barrow
She is standing in the middle of the floor, waiting for you: a tall grey woman, thin as smoke, with her right hand raised and the palm turned out, the way the champions stand carved on the oath-wall under the Kings' Barrow. Her lips move, and move, and nothing comes.
Over the bier, where you'd expect words, there's only a long bare scar in the stone. Whatever was written there was cut on her capstone too, and the dead carried it north.
{ companion_alive("odda"):
    "That's how the sworn stood to swear," Odda says. "She's trying to say it, and it won't come." #speaker:odda
}
{ companion_alive("fen"):
    "She's forgotten her lines," Fen murmurs. "I know that face. I've worn it." #speaker:fen
}
* {has_flag("swore_the_oath")} [Raise your hand with hers, and say the oath you swore under the Kings' Barrow]
    You raise your right hand, palm out, facing her, and say it the way you said it to the oath-wall, and you find you still mean it. "By crown and Concord I am sworn..."
    -> west_sworn
* {not has_flag("swore_the_oath")} [Raise your hand with hers, and swear the oath of the sworn, and mean it #drive:glory]
    ~ drive_moment("glory")
    ~ set_flag("swore_the_oath")
    Under the Kings' Barrow you only said the words. You raise your right hand, palm out, facing her, and this time you swear it. "By crown and Concord I am sworn..."
    -> west_sworn
* {companion_alive("odda")} [Say the words of the oath with her, as the faith keeps them, with Odda a half-breath ahead of you #check:religion:10 #drive:faith]
    ~ drive_moment("faith")
    Odda murmurs the old forms of her order a half-breath ahead of you, and you follow, the way you'd follow a hymn in a strange chapel.
    { check("religion", 10):
        -> west_sworn
    - else:
        -> west_wrong
    }
* {not companion_alive("odda")} [Say the words of the oath with her, as the faith keeps them #check:religion:13 #drive:faith]
    ~ drive_moment("faith")
    You say the words of the oath in the old forms of the faith, slow and careful, the way the temple says its prayers.
    { check("religion", 13):
        -> west_sworn
    - else:
        -> west_wrong
    }
* [Draw steel before she can come at you #combat:barrow-wife]
    -> fought("west", true)

// She has her oath again.
= west_sworn
"...to keep the peace and hold the door."
On the last words her voice comes in under yours, faint as wind through a keyhole: the first sound she's made. "Hold the door," she says, and lowers her hand.
She looks at you a moment longer, as if she's taking your measure for the post, and seems to find it will do. Then she lies down on the empty bier among her own bones, and is gone into them.
~ quest_note("barrow-wives", "The west barrow: the barrow-wife had lost her oath. You said it with her, and she lay down at rest.")
-> at_rest("west")

// The wrong words, or the right ones said wrong: she knows.
= west_wrong
You stumble on the old forms, and lose your place, and start again. Her raised hand slowly closes. She knows the shape of what you said, and it isn't hers. She comes for you.
* [Fight #combat:barrow-wife]
    -> fought("west", false)

// ---- The north barrow: the wife who lost her memory ----

= north_barrow
You push through the heather choking the north barrow's mouth. Inside, the chamber has been stripped: the dead who lifted the stone dragged everything out with it, and the bier is bare stone. #location:The Three Wives, the north barrow
She doesn't look at you at all. She drifts round and round the chamber, a grey woman thin as smoke, touching the walls, the floor, the empty bier, with her hands cupped together in front of her, holding nothing.
On the bier, where her hands would have been folded, there's a small hollow worn in the stone, the shape of something held there for a very long time.
{ companion_alive("odda"):
    "She's lost something," Odda says. "And she doesn't know what. That's worse." #speaker:odda
}
You remember the heather outside the door, trampled flat where the dead dragged her grave goods out, and the scraps of old things lying in it.
* [Go back out, and search the heather by the barrow's mouth #check:perception:13]
    You go back out into the sun and down on your knees in the heather, parting it a handful at a time.
    { check("perception", 13):
        -> north_found
    - else:
        -> north_lost
    }
* [Follow the drag marks the dead left, out through the heather #check:survival:12]
    The dead dragged her things out and dropped what they didn't want: you follow the long scars in the heather, step by step, the way you'd follow a wounded deer.
    { check("survival", 12):
        -> north_found
    - else:
        -> north_lost
    }
* {companion_alive("fen")} [Ask Fen to look. He finds things for a living]
    "Small, valuable, and lost," Fen says, cracking his knuckles. "My three favourite words." He's gone out into the heather for less time than it takes you to say it, and comes back with his hand closed.
    ~ approve("fen", 1)
    -> north_found
* {can_cast("detect-magic")} [Look for it with Detect Magic #spell:detect-magic]
    ~ cast("detect-magic")
    Everything that lay in an oath-grave carries a little of the ward's light. Out in the heather, among the broken pots and buckles, one small thing glows like a coal.
    -> north_found
* {not can_cast("detect-magic") && companion_can_cast("odda", "detect-magic")} [Ask Odda to look for it with Detect Magic #spell:detect-magic #by:odda]
    ~ companion_cast("odda", "detect-magic")
    "Everything that lay in an oath-grave carries a little of the ward's light," Odda says, and turns slowly on the knoll with her eyes half-shut. "There." Out in the heather, among the broken pots and buckles, one small thing glows like a coal.
    -> north_found
* [Draw steel, while she isn't looking #combat:barrow-wife]
    -> fought("north", true)

// The keepsake.
= north_found
It's a silver locket on a broken chain, no bigger than your thumbnail and black with age. It opens on a curl of a child's fair hair, tied with a thread, and inside the lid, scratched so small you have to squint, two words: COME HOME.
You take it in to her, and hold it out on your palm.
She stops. For a long moment she looks at it. Then her cupped hands close round it, and she holds it to her breast, and for the first time she has a face: a young woman's, crying and laughing at once, the way people do at a door when somebody's come home.
She lies down on the bare bier with the locket in her hands, in the hollow it wore there, and is still.
~ quest_note("barrow-wives", "The north barrow: the barrow-wife had lost her memory, in a silver locket the dead dropped in the heather: a child's hair, and COME HOME scratched in the lid. She lay down at rest with it in her hands.")
-> at_rest("north")

// Not found: she knows you've come back empty-handed.
= north_lost
You search until the sun is high, and find potsherds, a green copper buckle, a sheep's jaw, and nothing that could be anyone's heart's desire.
When you go back in empty-handed, she stops drifting for the first time, and looks at you, and she knows. Her cupped hands open into claws.
* [Fight #combat:barrow-wife]
    -> fought("north", false)

// ---- Laid to rest, or fought ----

// A barrow-wife given back what was taken: her XP, as for a fight avoided. The last of them to
// lie down gives you her cloak.
= at_rest(which)
~ set_flag(which + "_wife_rested")
~ give_xp(200)
{ wife_done("east") && wife_done("west") && wife_done("north"):
    Before the last of her is gone, a grey hand comes back out of the dark, holding out a cloak: real cloth, old grey wool as soft as moss, fastened with a silver pin shaped like a closed eye. You take it, and the hand is gone. The cloak weighs almost nothing at all.
    ~ set_flag("given_the_grey_cloak")
    ~ give_item("cloak-of-protection")
}
-> ring

// A fight with one of them, in her barrow. first: you drew steel before trying anything else,
// and Odda minds.
= fought(which, first)
{ combat_won():
    ~ set_flag(which + "_wife_destroyed")
    The barrow-wife comes apart like smoke in a draught from the door, and doesn't come back together. The barrow is very quiet, and only a barrow.
    { companion_alive("odda"):
        { first:
            ~ approve("odda", -1)
            "She was only asking," Odda says. "Whatever it was she wanted, she was asking." #speaker:odda
        - else:
            "She's gone," Odda says. "I don't know that she's at rest. I'd have liked to know that." #speaker:odda
        }
    }
    -> the_fallen ->
    -> ring
- else:
    -> mercy
}

// Anyone in the party who fell in a barrow is carried home, to lie before the altar flame in
// Bramblegate's temple until they can be raised.
= the_fallen
{ has_flag("odda_at_the_three_wives") && not companion_alive("odda") && not has_flag("odda_fell_at_the_three_wives"):
    ~ set_flag("odda_fell_at_the_three_wives")
    Odda lies on the barrow floor with her mace still in her fist, grey to the lips, and cold.
    You carry her out into the sun, and later home to Bramblegate's temple, to lie before the altar flame until she can be raised.
}
{ has_flag("fen_at_the_three_wives") && not companion_alive("fen") && not has_flag("fen_fell_at_the_three_wives"):
    ~ set_flag("fen_fell_at_the_three_wives")
    Fen lies small and still in the bones, his knife still in his hand, grey to the lips.
    You carry him out into the sun, and later home to Bramblegate's temple, to lie before the altar flame until he can be raised.
}
->->

// Fate's Mercy: someone drags you out into the sun, where she can't follow.
= mercy
You come to on the grass of the knoll, in the sun, cold to the bone, with the sky going round. Somebody dragged you out of the dark by the collar, or you crawled; you'll never be sure which. The barrow-wife stands just inside the doorway, where the sunlight stops, and doesn't come one step further.
Somewhere in the dark behind her, your purse lies among the bones, and nobody is going back in for it.
~ lose_coins()
~ set_flag("barrow_wives_fates_mercy")
-> the_fallen ->
You get yourselves home somehow, and sleep the clock round at the Tallow and Thistle. Knight-Captain Marchbank, it turns out, can wait another day, and says so, twice. #location:Bramblegate, the Tallow and Thistle
~ long_rest()
~ set_flag("barrow_wives_done")
~ quest_note("barrow-wives", "The barrow-wives beat you, and you never went back. At dusk they still keen on the Three Wives.")
~ finish_quest("barrow-wives")
~ add_deed("Went into the Barrow-Wives' barrows on the Three Wives, and was carried out again.")
->->

// All three barrows done.
= farewell
~ temp rested = 0
{ has_flag("east_wife_rested"):
    ~ rested++
}
{ has_flag("west_wife_rested"):
    ~ rested++
}
{ has_flag("north_wife_rested"):
    ~ rested++
}
You come out of the last barrow into the sun. The knoll is only a knoll now, with larks going up off it, and the cold has gone out of the ground.
{ rested > 0 && not has_flag("given_the_grey_cloak"):
    In the middle of the ring, on the grass, lies a grey cloak folded square, with a silver pin on it shaped like a closed eye. It wasn't there when you went in, and the dew all round it hasn't been touched.
    ~ set_flag("given_the_grey_cloak")
    ~ give_item("cloak-of-protection")
}
{
    - rested == 3:
        { companion_alive("odda"):
            ~ approve("odda", 1)
            "Name, oath and memory," Odda says. "You gave them back everything that was taken. I didn't know that could be done." She looks south, towards where the shard is pulling you. "I'll remember it was." #speaker:odda
        }
        ~ add_deed("Gave the three Barrow-Wives back their name, their oath and their memory, and laid them to rest on the Three Wives.")
    - rested > 0:
        { companion_alive("odda"):
            "Some of them, at least," Odda says. "Some's better than none." #speaker:odda
        }
        ~ add_deed("Went into the Barrow-Wives' barrows on the Three Wives, and laid some of them to rest.")
    - else:
        { companion_alive("odda"):
            "They'll not keen any more," Odda says. "That's something. It's not much." #speaker:odda
        }
        ~ add_deed("Destroyed the three Barrow-Wives in their barrows on the Three Wives.")
}
{ companion_alive("fen") && rested > 0:
    "I'd tell you that was the strangest morning of my life," Fen says, "but I've been travelling with you." #speaker:fen
}
~ set_flag("barrow_wives_done")
~ finish_quest("barrow-wives")
~ give_xp(50)
->->

// True once a barrow-wife has been laid to rest or destroyed ("east", "west" or "north").
=== function wife_done(which) ===
~ return has_flag(which + "_wife_rested") || has_flag(which + "_wife_destroyed")
