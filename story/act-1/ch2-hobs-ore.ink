// Chapter 2 side quest, Hob's ore (docs/STORY.md, "Chapter 2 side content"): a contract written
// by hand for now, like the wolf den (Rob, Oct 18, 2026; Phase 3's contract board can take it
// over).
//
// Hob's crate of star-iron (iron that fell out of the sky, dug up a spoonful at a time somewhere
// south of Highcrown) has sat in the Old Ford post's strongroom for a month: no carter will take
// the barrow road since the dead began walking, and now gnolls have come down out of the hills
// after the dead, the way crows follow a plough. His cousin Dabbin will fetch it with his cart
// and his pony, Parsnip, if someone rides with him (Rob's choices, Oct 18, 2026):
//   - On the morning before the barrow (ch2_rally), Hob asks at his forge. Saying yes
//     (hobs_ore_taken) makes the ride north the cart ride: Dabbin takes the party as far as the
//     Old Ford (the carter in ch2_eve), and the gnolls ambush the cart in the Gorse Cut, an hour
//     up the road.
//   - On the last morning of Act I, if it was missed, Dabbin went for the star-iron by himself
//     and is overdue: the gnolls have his cart pinned in the Gorse Cut on his way home.
// In the Gorse Cut, Parsnip stops dead. Read the gorse (Perception 13) and you see the gnolls
// before they rise (spotted_gnolls): strike first (a surprise attack), or pitch a sack of the
// cart's salt mutton into the gorse and drive Parsnip through while they fight over it (Animal
// Handling 13: the fight's full XP, Fen +1, gnolls_fed; a miss is the fight). Otherwise they
// rise round the cart. The fight (gorse-cut-gnolls: a Giant Hyena and four Gnoll Warriors,
// Moderate for a level 3 party of three) has Dabbin on the cart's tail-board, shooting, as an
// ally to keep alive. If he falls he's badly hurt, not killed (dabbin_hurt), and his thank-you
// of 10 gold goes to the surgeon instead.
// Hob's pay is the star-iron itself: he reworks one of the hero's weapons into a +1 magic weapon
// (hobs_reforge, SRD 5.2.1 "Weapon, +1"), the next time the hero is at his forge: the last
// morning of Act I. Quest XP 50 (hobs_ore_done). Losing is Fate's Mercy: Dabbin whips Parsnip
// out of the Cut with the party across the sacks, and the star-iron still gets home
// (hobs_ore_fates_mercy).
//
// Tunnels: ch2_rally and the last morning (act1-last-morning.ink) call them, and they return.

=== side_hobs_ore ===
{ has_flag("last_morning"):
    -> overdue
}
-> ride

// The morning before the barrow: the ride north, on Dabbin's cart.
= ride
Dabbin's cart is waiting outside the north gate: a long, low wagon with a canvas hood, loaded with sacks and crates for the Old Ford, and a stout brown pony in the shafts. #location:Bramblegate, north gate #time:Morning
Dabbin is Hob's cousin, and looks it: the same nose and the same beard, browner and twenty years younger, with a carter's whip in his belt and a hunting bow across his knees. "That's Parsnip," he says, nodding at the pony. "He bites. Not you, probably. Climb up." #speaker:dabbin
{ has_flag("ford_fell"):
    "Varrow's given me the key to the tower at the ford," he adds. "His riders barred it behind them. Hob's crate's in the strongroom, if the dead don't eat iron." #speaker:dabbin
}
You ride on the sacks with your boots dangling, and Bramblegate's walls drop away behind you.
-> cut

// The last morning: Dabbin went for the star-iron himself, and he's overdue.
= overdue
Hob is standing in the road outside his forge with his hammer in his hand, looking up the barrow road, which isn't like him. #location:Bramblegate, Hob's forge #time:Morning
"My cousin Dabbin went up to the Old Ford for my star-iron three days back, now the dead have gone quiet," he says. "He should have been home last night. Dabbin's never late. Parsnip's late. Dabbin isn't." #speaker:hob
As he says it, a shepherd's boy comes pelting down the barrow road and nearly falls over his own feet at the gate. "There's a cart stuck in the Gorse Cut," he gasps, "and something laughing in the bushes all round it!"
Hob goes white under the soot. "Gnolls," he says. "They came down after the dead, and nobody's told them the dead are finished." #speaker:hob
~ start_quest("hobs-ore")
* [Run for the Gorse Cut]
    -> cut

// The Gorse Cut: Parsnip won't go on.
= cut
// Who's with you and on their feet, so the scene knows who fell here (the_fallen).
{ companion_alive("odda"):
    ~ set_flag("odda_in_the_gorse_cut")
}
{ companion_alive("fen"):
    ~ set_flag("fen_in_the_gorse_cut")
}
{ has_flag("last_morning"):
    It's an hour up the barrow road at a run. The road drops into the Gorse Cut, a deep cutting between two banks of gorse higher than a cart, yellow with flowers and loud with bees. Dabbin's cart stands halfway along it, Parsnip in the shafts with his ears flat, and Dabbin up on the tail-board with an arrow on the string. He sees you and nearly weeps. #location:The Gorse Cut
- else:
    An hour up the road, the barrow road drops into the Gorse Cut, a deep cutting between two banks of gorse higher than the cart, yellow with flowers and loud with bees. Halfway along it, Parsnip stops dead, ears flat, and won't go on. #location:The Gorse Cut
    "He's never done that," Dabbin says. "He's done most things. Not that." #speaker:dabbin
}
* [Read the gorse on the banks #check:perception:13]
    { check("perception", 13):
        Then you see them: hunched shapes lying flat among the gorse roots on the west bank, and more on the road ahead, still as stones. Spotted hides, long jaws, bone bows across their backs. Gnolls. Beside one of them lies a hyena the size of a pony. None of them knows you've seen them.
        ~ set_flag("spotted_gnolls")
        -> spotted
    - else:
        The gorse shivers in the wind, yellow and empty. Then the wind drops, and the gorse goes on shivering.
        -> ambush
    }
* [Get Parsnip moving, and drive on through]
    -> ambush

// You've seen them before they rise.
= spotted
{ companion_alive("fen"):
    "Gnolls," Fen breathes. "They follow the dead about for what's left over. I'd hoped that was a story." #speaker:fen
}
* [Strike before they rise #combat:gorse-cut-gnolls #surprise]
    -> fought
* [Pitch a sack of the cart's salt mutton into the gorse, and drive Parsnip through while they fight over it #check:animal-handling:13]
    You haul a sack of salt mutton off the cart and heave it high over the west bank. It bursts in the gorse, and the whole hillside comes alive with laughter.
    { check("animal-handling", 13):
        -> fed
    - else:
        Parsnip rears in the shafts, screaming, and won't go another step. The gnolls come up out of the gorse, and not all of them are interested in mutton.
        -> forced
    }

= ambush
Out of the gorse on the west bank and the road ahead, the gnolls rise: spotted, hunched and long-jawed, with bone bows and filthy claws, and among them a hyena the size of a pony. They laugh as they come. It's the worst sound you've ever heard.
{ has_flag("last_morning"):
    "Not the pony!" Dabbin yells, and looses an arrow. #speaker:dabbin
- else:
    Dabbin scrambles back onto the tail-board with his bow. "Not the pony!" he yells. #speaker:dabbin
}
* [Fight #combat:gorse-cut-gnolls]
    -> fought

= forced
* [Fight #combat:gorse-cut-gnolls]
    -> fought

= fought
{ combat_won():
    The last gnoll goes down in the gorse, still laughing, and then there's only the bees.
    ~ set_flag("gnolls_killed")
    { ally_standing("dabbin"):
        Dabbin climbs down off the tail-board, nocks another arrow out of habit, then puts it away. "Well," he says, a bit high. "Rabbits never did that." #speaker:dabbin
    - else:
        ~ set_flag("dabbin_hurt")
        Dabbin lies across the tail-board with a gnoll's claw-marks down his chest, white as milk.
        { companion_alive("odda"):
            Odda is beside him before you are, with her kit open and a short, firm prayer, and the bleeding slows and stops. "He'll mend," she says. "Slowly, and complaining." #speaker:odda
        - else:
            You bind him up as well as you can, and the bleeding slows and stops. He'll mend, slowly.
        }
    }
    ~ add_deed("Fought off a gnoll pack in the Gorse Cut, on the barrow road, to bring Hob's star-iron home.")
    -> the_fallen ->
    -> after
- else:
    -> mercy
}

// Anyone in the party who fell in the fight goes home on Dabbin's cart, to lie before the altar
// flame in Bramblegate's temple until they can be raised.
= the_fallen
{ has_flag("odda_in_the_gorse_cut") && not companion_alive("odda"):
    Odda didn't get up. She lies in the road with her mace still in her fist, and the gnolls never got past her.
    ~ set_flag("odda_fell_in_the_gorse_cut")
}
{ has_flag("fen_in_the_gorse_cut") && not companion_alive("fen"):
    Fen lies small and still in the gorse, his knife still in his hand.
    ~ set_flag("fen_fell_in_the_gorse_cut")
}
{ has_flag("odda_fell_in_the_gorse_cut") || has_flag("fen_fell_in_the_gorse_cut"):
    { has_flag("last_morning"):
        You lay them on Dabbin's cart, under a blanket, and take them home to Bramblegate's temple, to lie before the altar flame until they can be raised.
    - else:
        Dabbin will take them home on his cart when he goes back with the star-iron, to lie before the altar flame in Bramblegate's temple until they can be raised.
        "Gently," he promises. "Parsnip too." #speaker:dabbin
    }
}
->->

// Fed them, and drove through: the fight's XP.
= fed
Parsnip bolts. The cart bucks and slews through the Cut with the gorse whipping past on both sides, and behind you the gnolls are fighting each other over the mutton, laughing and screaming. Dabbin stands on the board, cracking his whip and whooping.
{ companion_alive("fen"):
    "Feed the dog and steal the dinner," Fen says, clinging to a crate. "Oldest trick there is." #speaker:fen
}
~ set_flag("gnolls_fed")
~ give_xp(600)
~ approve("fen", 1)
~ add_deed("Fed a gnoll pack a sack of mutton in the Gorse Cut, and drove Hob's cart through while they fought over it.")
-> after

// Fate's Mercy: Dabbin whips Parsnip out of the Cut, with the party across the sacks.
= mercy
You come to on the sacks, jolting, with the sky going past overhead. Dabbin is standing up on the board whipping Parsnip on, and behind you the Gorse Cut is full of laughter. "Hold on!" he yells. "Or don't! You're past holding!" #speaker:dabbin
~ lose_coins()
~ long_rest()
~ set_flag("hobs_ore_fates_mercy")
{ has_flag("last_morning"):
    He doesn't stop till Bramblegate's gate. Somewhere on the way your purse went over the side, or into a gnoll. Nan Burdock patches you up in the gatehouse, and you sleep the clock round. #location:Bramblegate, north gate
    ~ add_deed("Was beaten by gnolls in the Gorse Cut. Dabbin got the cart, the star-iron and you home anyway.")
    -> the_fallen ->
    -> home
- else:
    He doesn't stop till the Old Ford. Somewhere on the way your purse went over the side, or into a gnoll. You wake in the tower among the crates as the light goes, having slept the afternoon away, stiff and sore, but whole. #location:The Old Ford
    ~ add_deed("Was beaten by gnolls in the Gorse Cut. Dabbin got the cart, the star-iron and you to the Old Ford anyway.")
    -> the_fallen ->
    -> after
}

// On to the Old Ford (the morning before the barrow), or home (the last morning).
= after
{ has_flag("last_morning"):
    -> home
}
{ not has_flag("hobs_ore_fates_mercy"):
    By noon the cart rattles down to the Old Ford. #location:The Old Ford #time:Midday
}
{ has_flag("ford_fell"):
    The post is quiet, with fresh graves on the north bank. Dabbin unbars the tower with Varrow's key, and down in the strongroom, behind the mail sacks, sits a little crate wrapped in oilcloth with HOB painted on it in letters a foot high.
- else:
    The watch at the post wave the cart in like long-lost family, and fall on the sacks. Down in the strongroom, behind the mail, sits a little crate wrapped in oilcloth with HOB painted on it in letters a foot high.
}
It takes two of you to lift it. Dabbin lashes it down in the middle of the cart with three ropes and a blanket over it, like a sleeping child.
{
    - has_flag("hobs_ore_fates_mercy"):
        "Hob'll pay you in star-iron, next time you're at the forge," Dabbin says. "I'd pay you myself, but my purse went over the side the same way as yours." #speaker:dabbin
    - has_flag("dabbin_hurt"):
        "I'll wait here for the next cart home, and lie down a lot," he says. "Hob'll pay you in star-iron, next time you're at the forge. I'd pay you too, but I think it's going on the surgeon." #speaker:dabbin
    - else:
        "Hob'll pay you in star-iron, next time you're at the forge," Dabbin says. "This is from me." He presses ten gold into your hand and won't take it back. #speaker:dabbin
        ~ give_coins(10)
}
-> paid

// The last morning: home with the cart, and Hob's pay at once.
= home
{ not has_flag("hobs_ore_fates_mercy"):
    You walk the cart home the last hour, with Parsnip biting at your sleeve whenever he thinks you aren't looking. #location:Bramblegate, north gate
}
Hob is waiting at the gate. He hugs Dabbin, then the crate, then Parsnip, who bites him. #location:Bramblegate, north gate
{ not has_flag("dabbin_hurt") && not has_flag("hobs_ore_fates_mercy"):
    "This is from me," Dabbin says, and presses ten gold into your hand, and won't take it back. #speaker:dabbin
    ~ give_coins(10)
}
-> paid

= paid
~ set_flag("hobs_ore_done")
~ finish_quest("hobs-ore")
~ give_xp(50)
{ has_flag("last_morning"):
    -> hobs_reforge ->
}
->->

// Hob's pay: one of the hero's weapons, reworked with his star-iron into a +1 magic weapon (SRD
// 5.2.1, "Weapon, +1"). At his forge on the last morning of Act I, once the star-iron is home.
=== hobs_reforge ===
Hob pries the lid off the crate. Inside, packed in straw, lie a dozen little ingots of dark metal that seem to drink the light, with a shimmer down in them like frost on a window at night. #location:Bramblegate, Hob's forge
"Star-iron," he says, in the voice other people keep for temples. "Fell out of the sky, a hundred years back, somewhere south of Highcrown. They dig it up a spoonful at a time. I said I'd pay you in it, and I will. Give me something with an edge, or a weight to it, and an hour." #speaker:hob
-> pick

// The hero's first four kinds of plain weapon. (Story commands can't be called inside a
// choice's text, so the names are worked out first.)
= pick
~ temp first = plain_weapon(1)
~ temp second = plain_weapon(2)
~ temp third = plain_weapon(3)
~ temp fourth = plain_weapon(4)
~ temp first_name = item_name(first)
~ temp second_name = item_name(second)
~ temp third_name = item_name(third)
~ temp fourth_name = item_name(fourth)
+ {first != ""} [Your {first_name}]
    -> rework(first)
+ {second != ""} [Your {second_name}]
    -> rework(second)
+ {third != ""} [Your {third_name}]
    -> rework(third)
+ {fourth != ""} [Your {fourth_name}]
    -> rework(fourth)
+ {first == ""} [Show him your empty hands]
    "No weapon at all?" Hob says, scandalised. "Then you'll have the gold it would have cost me, and I'll keep the star-iron for when you've learned sense." #speaker:hob
    ~ give_coins(25)
    -> reworked

= rework(weapon)
Hob takes your {item_name(weapon)} into the forge. For an hour there's nothing but the roar of the bellows, Greta's grunting, and Hob's hammer, quick and light, folding the star-iron in, and in, and in.
When he plunges it into the trough, the steam comes off it silver. It looks almost the same as it did. But it sits lighter in your hand than it should, and when you move it, it hums, very faintly, like a bell struck a long way off.
~ make_weapon_magic(weapon)
"There," Hob says, and wipes his eyes, which he says is the smoke. "Best thing I've made in my life. Don't lose it in a gnoll." #speaker:hob
-> reworked

= reworked
~ set_flag("hob_reforged")
~ add_deed("Hob worked his star-iron into a weapon for you: the best thing he's made in his life, he says.")
->->

// True once Dabbin has brought the star-iron home, until Hob has paid in it.
=== function hob_owes_star_iron() ===
~ return has_flag("hobs_ore_done") && not has_flag("hob_reforged")
