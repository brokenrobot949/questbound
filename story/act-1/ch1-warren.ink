// Chapter 1 · Bramblegate, beat 5: Brackenhollow warren, rooms 1–4 (docs/STORY.md). Rooms 5–6
// are in ch1-warren-depths.ink.
//
// The slice's dungeon, explored room by room on the map (#room tags; #go choices light up
// a doorway to tap). The lookout at the quarry mouth (sneak, talk or fight); the hidden pit
// in the passage (the goblins' traps face inward: they fear something from below); the
// larder, with Dunn's flour and a frightened goblin child; and Mother Nettle's hall, where
// talk, single combat, or a hopeless fight with the whole band all end in the same place:
// the way down to the lower warren, where the dead are digging.
// Losing a fight here, or dying in the pit, is Fate's Mercy: you wake tied up before Nettle.
// Spells: Fog Cloud past the lookout, Spare the Dying for a beaten lookout (Nettle hears),
// Mage Hand on the pit, Comprehend Languages to read the warning marks, Dancing Lights for
// the goblin child, and Purify Food and Drink on the larder's spoiled flour (Nettle notices).

=== ch1_warren ===
{ has_flag("mill_goblins_talked"):
    -> guided_in
}
-> mouth

= mouth
* [Creep along the foot of the cliff to the door #check:stealth:10]
    You keep to the cliff's shadow, one careful step at a time, while the lookout scratches itself and squints at the road.
    { check("stealth", 10):
        You're under its ledge and into the dark of the doorway before it thinks to look down.
        ~ set_flag("warren_sneaked_in")
        -> past_lookout
    - else:
        A stone turns under your foot and goes clattering down the rubble. Up on the ledge, the lookout yelps, nocks an arrow, and screams for help that doesn't come.
        -> lookout_fight
    }
* [Call up to the lookout that you've come to talk #check:persuasion:15]
    You show your empty hands and call up that you're here to see Mother Nettle, not to fight.
    { check("persuasion", 15):
        The lookout chews on that for a long moment. Then it hops down from the ledge with its bow still half drawn. "Mother decides," it says. "Follow. Touch nothing." #speaker:lookout
        ~ set_flag("warren_lookout_talked")
        -> past_lookout
    - else:
        "Talk," the lookout sneers, "with arrows." It draws. #speaker:lookout
        -> lookout_fight
    }
* {can_cast("fog-cloud")} [Fill the quarry with fog, and walk in under it #spell:fog-cloud]
    ~ cast("fog-cloud")
    A bank of thick grey fog boils up out of the rubble and swallows the quarry floor. Up on its ledge, the lookout swears, squints, and shouts at the fog to go away. It doesn't. You walk straight through it to the door.
    ~ set_flag("warren_sneaked_in")
    -> past_lookout
* [Rush the lookout #combat:warren-lookout]
    -> lookout_fought

= guided_in
// The goblins you talked down at the mill ran ahead to say you were coming.
The lookout scrambles down from its ledge and bobs its head at you, nervous and very polite. "Mother says come," it says. "Mother says no stabbing. Follow." #speaker:lookout
~ set_flag("warren_lookout_talked")
-> past_lookout

= lookout_fight
* [Fight the lookout #combat:warren-lookout]
    -> lookout_fought

= lookout_fought
{ combat_won():
    The lookout tumbles off its ledge and lies among the rubble, breathing in small, wet gasps. Its screams echo into the warren and die away. Nobody answers them.
    -> lookout_down
- else:
    -> captured
}

= lookout_down
* {can_cast("spare-the-dying")} [Keep it from dying #spell:spare-the-dying]
    ~ cast("spare-the-dying")
    You kneel and lay a hand on its narrow chest, and will its heart to keep on beating. The gasping slows, then steadies. It'll live, and wake with a headache and a story.
    ~ set_flag("warren_lookout_spared")
    ~ add_deed("Beat the goblin lookout at Brackenhollow, then kept it from dying.")
    -> into_the_warren
* [Go on into the warren]
    Behind you, the gasping stops.
    ~ set_flag("warren_lookout_killed")
    -> into_the_warren

= past_lookout
// Getting past the lookout without a fight is worth the same as the fight.
~ give_xp(50)
-> into_the_warren

// ---- Room 2: the pit passage ----

= into_the_warren
The warren's door is a crack in the cliff, shored up with old quarry timbers. Beyond it a passage slopes down into the hill: low, narrow, dug by small hands, and turning back on itself as if it can't decide where it's going. Pale fungus on the walls gives just enough light to see by. #room:brackenhollow/pit #location:Brackenhollow warren, the passage
{ has_flag("warren_lookout_talked"):
    -> pit_shown
}
-> pit_choices

= pit_choices
* [Test the floor ahead as you go #check:investigation:15]
    You slow right down, tapping the floor ahead with your boot and watching the walls for anything that doesn't belong.
    { check("investigation", 15):
        -> pit_found
    - else:
        Nothing seems wrong, right up until it is.
        -> pit_fall
    }
* {can_cast("mage-hand")} [Send a Mage Hand ahead to test the floor #spell:mage-hand]
    ~ cast("mage-hand")
    A spectral hand floats ahead of you, patting the floor like a blind man's cane. Ten feet on, a square of floor tips under its touch and swings down on a hidden hinge.
    -> pit_found
* [Hurry on before anything else notices you]
    -> pit_fall

= pit_found
A square of floor sits a finger's width proud of the rest: a lid on a hinge, over a pit ten feet deep. You wedge it shut with a sliver of quarry stone, and it holds.
-> trap_marks

= pit_fall
The floor drops out from under you.
~ temp fall = take_damage("1d6", "bludgeoning")
{ fall == "dead":
    -> captured
}
{ fall == "woke":
    You come round at the bottom of a pit ten feet deep, with no idea how long you've lain there.
- else:
    You land hard at the bottom of a pit ten feet deep.
}
The walls are notched with handholds, small but enough, and you haul yourself out.
-> trap_marks

= pit_shown
Your goblin guide stops dead and points at a square of floor that looks like all the rest. "Lid," it says. "Pit under. Step where I step." You do. #speaker:lookout
-> trap_marks

= trap_marks
Scratched into the wall beside the pit are goblin warning marks, and they're on the wrong side. They face down the passage, to be read by someone coming up from the deep warren, not by anyone coming in.
These traps weren't dug to keep you out. They were dug to keep something in.
{ has_flag("warren_lookout_talked"):
    Your guide sees you looking. "Not for you," it mutters. "For them." It won't say who "them" is. Then it points on down the passage, and scuttles back towards the daylight before you can ask. #speaker:lookout
}
~ set_flag("traps_face_inward")
~ quest_note("missing-miller", "The goblins' traps face inward. Whatever they fear is coming up from below their warren.")
~ give_xp(25)
-> pit_onward

= pit_onward
* {can_cast("comprehend-languages")} [Read the warning marks #spell:comprehend-languages]
    ~ cast("comprehend-languages")
    You sit by the pit for a few quiet minutes, working the spell, until the scratches swim and settle into sense. They're warnings, written in a hurry by small hands: SING-DEAD COME UP. KEEP THEM DOWN.
    Under that, scratched deeper than the rest: MOTHER SAYS NOBODY GOES BELOW.
    ~ set_flag("read_goblin_marks")
    ~ quest_note("missing-miller", "The goblins' warning marks read: 'Sing-dead come up. Keep them down.' Their Mother forbids anyone to go below.")
    -> pit_onward
* [Go on, deeper #go:larder]
    -> larder

// ---- Room 3: the larder ----

= larder
The passage opens into a low chamber that smells of flour and old cheese. Shelves cut into the rock stand empty. The only food left is a heap of sacks against the wall, and every one is stamped DUNN'S MILL. #room:brackenhollow/larder #location:Brackenhollow warren, the larder

The goblins took the miller's flour, then. Nothing in here suggests they took the miller. The sacks nearest the back wall have gone grey and sour, as if something dead dragged itself past them.
~ quest_note("missing-miller", "Dunn's flour is in the goblins' larder, but there's no sign they ever had the miller himself.")
~ give_xp(50)

Behind the sacks, something sniffles. A goblin child, no bigger than a cat, is wedged in the gap with its arms over its head. "Not food!" it squeaks. "Not food! NOT FOOD!" #speaker:goblin-child

* [Crouch down and promise it you're not hungry #drive:justice]
    ~ drive_moment("justice")
    You sit down on the floor, slowly, and wait. After a long while the child lowers its arms.
    "Dead things came up," it whispers. "Through the floor, in the deep. Big people singing behind them. Mother says the singers make them walk." Then it squirms past you and is gone up the passage, shouting for Mother at the top of its lungs. #speaker:goblin-child
    ~ set_flag("larder_child_spared")
    ~ quest_note("missing-miller", "A goblin child says dead things came up through the floor of the deep warren, with singers behind them.")
    -> larder_on
* [Haul it out by the scruff and demand answers]
    You drag it out by the scruff. It shrieks, bites your thumb, and wriggles free, and is off up the passage wailing for Mother before you can ask a thing.
    ~ set_flag("larder_child_scared")
    -> larder_on
* {can_cast("dancing-lights")} [Send little lights dancing for it #spell:dancing-lights]
    ~ cast("dancing-lights")
    Four soft lights wink into being and bob through the gloom like fireflies. The child's arms come down. It reaches for one, misses, and lets out a squeak of a giggle.
    "Dead things came up," it whispers, watching the lights. "Through the floor, in the deep. Big people singing behind them. Mother says the singers make them walk." Then it squirms past you and is gone up the passage, a light still bobbing after it. #speaker:goblin-child
    ~ set_flag("larder_child_spared")
    ~ quest_note("missing-miller", "A goblin child says dead things came up through the floor of the deep warren, with singers behind them.")
    -> larder_on
* [Leave it be]
    You leave the child to its hiding place. Its eyes follow you all the way across the room.
    -> larder_on

= larder_on
* {can_cast("purify-food-and-drink")} [Take the rot out of the spoiled flour #spell:purify-food-and-drink]
    ~ cast("purify-food-and-drink")
    You murmur over the grey sacks, and the rot lifts out of the flour like mist off a pond. It's clean and white again, and smells of the mill.
    ~ set_flag("larder_purified")
    -> larder_on
* [Follow the passage towards the voices #go:hall]
    -> hall

// ---- Room 4: Nettle's hall ----

= hall
~ set_objective("Deal with Mother Nettle, with words or with steel.")
The passage opens into the biggest chamber yet. Furs and stolen blankets cover the floor. At the far end, on a throne built from quarry stone and three different stolen chairs, sits Mother Nettle. #room:brackenhollow/hall #location:Brackenhollow warren, Nettle's hall

She's old, and broad for a goblin, in a chain shirt too big for her and a headdress of crow feathers, with a scimitar across her knees. Three goblin warriors stand around her with arrows on the string. More goblins crowd the shadows behind them, small and thin and staring.

Nobody moves. Nobody breathes.
{
- has_flag("mill_goblins_fought") || has_flag("warren_lookout_killed"):
    "You killed my people," Nettle says. Her voice is very quiet. "You'd better have something to say." #speaker:nettle
- has_flag("larder_child_scared"):
    "You frightened my grandbabby," Nettle says. "That was stupid. Say something less stupid." #speaker:nettle
- has_flag("warren_lookout_spared"):
    "You beat my lookout, then sat with him so he didn't die," Nettle says. "Strange thing to do. Say why." #speaker:nettle
- has_flag("larder_child_spared") || has_flag("mill_goblins_talked"):
    "They say you're soft," Nettle says, and leans forward. "Are you soft?" #speaker:nettle
- else:
    "Well," Nettle says. "Look what walked into my hall." #speaker:nettle
}
-> hall_talk

= hall_talk
~ temp friendly = (has_flag("larder_child_spared") || has_flag("mill_goblins_talked") || has_flag("warren_lookout_talked") || has_flag("warren_lookout_spared")) and not (has_flag("mill_goblins_fought") || has_flag("warren_lookout_killed") || has_flag("larder_child_scared"))
* {friendly} [Tell her you're here for the miller, not for her people #check:persuasion:10]
    -> plead(10)
* {not friendly} [Tell her you're here for the miller, not for her people #check:persuasion:15]
    -> plead(15)
* [Ask what drove her people out of their deep warren #check:insight:15 #drive:knowledge]
    ~ drive_moment("knowledge")
    You watch her eyes, not her blade. Every time a sound comes up from below, they flick to the back of the hall.
    { check("insight", 15):
        "You're not angry at me," you say. "You're frightened, of something under your own floor."
        Nettle stares at you. Then she laughs, a short dry bark, and the arrows dip. "Clever. Sit down, clever." #speaker:nettle
        -> parley_won
    - else:
        You can't read her. She sees you trying, and doesn't like it.
        -> challenged
    }
* [Challenge her to single combat, here in front of her people #combat:nettle-duel #drive:glory]
    ~ drive_moment("glory")
    -> duel_fought
* [Draw steel on all of them #combat:nettle-band]
    -> band_fought

// Persuasion: easier (DC 10) if she's heard you were gentle with her people, and nobody died.
= plead(dc)
You tell her straight: you came for Garrick Dunn, and for the raids to stop. Goblin blood isn't the point.
{ check("persuasion", dc):
    Nettle weighs you for a long moment. Then she lowers the scimitar. "Huh," she says. "Sit." #speaker:nettle
    -> parley_won
- else:
    -> challenged
}

= challenged
"Words," Nettle says, and spits. "Anyone can make words. You want my ear? Earn it. You and me, in the ring, by the old law." #speaker:nettle
* [Accept her challenge #combat:nettle-duel]
    -> duel_fought
* [Refuse, and tell her you'll help her anyway]
    Nettle squints at you as if you've said something in a language she almost knows. "Help," she repeats. Then, grudgingly: "Prove it." #speaker:nettle
    -> the_bargain

= parley_won
// Talking Nettle round is worth the same as beating her in single combat.
~ give_xp(200)
-> the_bargain

= duel_fought
{ combat_won():
    Mother Nettle goes down on one knee, her scimitar in the dirt, and her people make a sound like the whole hall flinching. She looks up at you and waits. Under the old law, it's your choice now.
    * [Offer her your hand]
        Nettle looks at your hand for a long time. Then she takes it and hauls herself up. "Hah," she says. "Strong and soft. Rare." #speaker:nettle
        -> the_bargain
    * [Finish her, as Captain Varrow would want]
        -> nettle_slain
- else:
    -> beaten
}

= band_fought
{ combat_won():
    The last of Nettle's warriors goes down, and the rest of her band scatters, shrieking, into the tunnels. The hall is yours, and it's very quiet.
    ~ set_flag("goblins_slain")
    ~ set_objective("Find out what drove the goblins out of their own deep warren.")
    ~ add_deed("Fought Mother Nettle's whole band in Brackenhollow warren, and won.")
    ~ quest_note("missing-miller", "Mother Nettle's band is broken. The raids are over, one way or another.")
    -> lower_door
- else:
    -> beaten
}

= nettle_slain
You do what the captain would want. The hall goes silent, then erupts: goblins scatter in every direction, into side tunnels and cracks in the walls, wailing for Mother.
In a moment there's nobody left but you.
~ set_flag("goblins_slain")
~ set_objective("Find out what drove the goblins out of their own deep warren.")
~ add_deed("Beat Mother Nettle in single combat in Brackenhollow warren, and finished her.")
~ quest_note("missing-miller", "Mother Nettle is dead and her band has scattered. The raids are over.")
-> lower_door

= the_bargain
Nettle settles back on her throne. "Two nights ago," she says, "the dead came up through the floor of our deep warren. Dug up from the old stone underneath, where nobody's dug for a thousand years. We ran. Lost our stores, lost our deep halls." She spits. "So we took flour. We're not sorry." #speaker:nettle

"Then the singers came. Grey robes, singing, walking behind the dead like shepherds. Dragged a man along with them, through our tunnels and down. Big man. Floury beard." #speaker:nettle

Garrick Dunn.

"Clear the dead out of our lower warren," Nettle says, "and we stop raiding. Your farms keep their flour. Deal?" #speaker:nettle

* [Shake on it: nobody should be driven from their home #drive:freedom]
    ~ drive_moment("freedom")
    -> deal_made
* [Shake on it: they're your allies now #drive:kinship]
    ~ drive_moment("kinship")
    -> deal_made
* [Shake on it, if she throws in something from her hoard #drive:wealth]
    ~ drive_moment("wealth")
    Nettle stares at you, then cackles. "Greedy! Good." She fishes in a bag behind her throne and slaps a stoppered red bottle into your palm. #speaker:nettle
    ~ give_item("potion-of-healing")
    -> deal_made
* [Shake on it]
    -> deal_made

= deal_made
You shake. Her hand is small and dry, and her grip could crack walnuts.
{ has_flag("larder_purified"): "And somebody took the rot out of my flour," Nettle adds, sniffing at you. "Smells like the mill again. Hm. Good." #speaker:nettle}
~ set_flag("goblins_spared")
~ start_quest("goblin-bargain")
~ set_objective("Clear the dead out of Brackenhollow's lower warren, as you promised Nettle.")
~ add_deed("Struck a bargain with Mother Nettle of Brackenhollow: clear the dead from her deep warren, and the raids stop.")
~ quest_note("missing-miller", "Mother Nettle saw grey-robed singers drag a man with a floury beard down through her warren. Garrick Dunn is below.")
-> lower_door

// ---- Fate's Mercy in the warren ----

= beaten
You wake with your wrists tied, sitting against the wall of Nettle's hall. Your purse is gone. A small goblin is biting your coins one at a time to see if they're real. #room:brackenhollow/hall #location:Brackenhollow warren, Nettle's hall
~ lose_coins()
~ long_rest()

Nettle crouches in front of you. "You lasted," she says, grudging. "Most don't. So. You'll pay for your life the useful way." #speaker:nettle
~ set_flag("nettle_spared_you")
-> the_bargain

= captured
You wake with your wrists tied, in a hall full of goblins. Your purse is gone. A small goblin is biting your coins one at a time to see if they're real. #room:brackenhollow/hall #location:Brackenhollow warren, Nettle's hall
~ lose_coins()
~ long_rest()

On a throne built from quarry stone and three different stolen chairs sits an old goblin woman in a chain shirt and a headdress of crow feathers, with a scimitar across her knees: Mother Nettle. "Lookout says you came to stab," she says. "Pit says you're clumsy. What do you say?" #speaker:nettle
~ set_flag("warren_captured")
~ set_objective("Deal with Mother Nettle, with words or with steel.")
-> hall_talk

// ---- The way down ----

= lower_door
At the back of the hall, a barricade of crates and broken furniture blocks a passage that slopes steeply down into the dark. { has_flag("goblins_spared"): Two of Nettle's warriors drag it aside for you, and step well back. | You drag it aside yourself. }

From somewhere below comes a sound like spades in wet earth: slow, steady, and tireless.
* [Go down into the dark #go:lower]
    -> ch1_warren_depths
