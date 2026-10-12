// Chapter 2 · The Barrow Road, beats 4 and 5: the Old Ford, and the Bond's return
// (docs/STORY.md).
//
// The night after the stocks, the hero sleeps at the Tallow and Thistle, then takes the barrow
// road north. The old barrows along it stand open, their capstones gone. At dusk they reach the
// Old Ford, where the barrow road crosses the river and the realm's post road meets it: a stone
// watch-post on the north bank, held by Sergeant Brannock, Wat and Nell. For two nights the dead
// have come up out of the river carrying capstones from the barrows, and last night they came
// for the post.
//
// The ways it can go (Rob chose them, Oct 11, 2026):
//   Fen comes back if you sold him or left him (fen_sold, fen_left_behind): he slipped Gaunt's
//     ropes on the road north and reached the post last night, sour. He fights beside you
//     tonight (he joins, with low approval), and after the fight he decides to come along.
//   The fight (ford-dead): a Ghoul and six Zombies, Moderate for a level 3 party of three. The
//     three soldiers fight beside you as Guards, played by the game; keep them alive.
//     All three alive: the Regency's favour, and Varrow's watch holds the outer cairns in
//       Chapter 3 (ford_held, ford_watch_saved, regency_favour, varrow_holds_cairns).
//     One or two alive: the post holds, and Varrow will thank you (ford_held).
//     None, or you slip away and leave them to it: the post falls, and you carry the news back
//       to Bramblegate (ford_fell; ford_abandoned for walking away, Odda -1).
//   Losing the fight is Fate's Mercy: you come to at dawn, robbed by the river. Whoever of the
//     watch still stood dragged you into the tower; the dead went on north with their stones.
//   The clue, at dawn: a capstone dropped in the shallows is an oath-stone. The dead are
//     unsealing the old oath-graves one by one, and each was a ward (knows_oath_wards).
//   The Bond (Rob chose to build it here): the post's mailbag holds a letter from a Sibling
//     (the dead walked past them carrying stones) or a Mentor ("If you hear singers in grey,
//     run"); a Rival rides in at dawn chasing the reeve's bounty, and goes ahead to Cairnfield
//     alone (the Choir takes them: rescued in Chapter 3); for a Debt, a Free League factor who
//     sat out the siege under his wagon offers to square it for "anything shiny" from the barrow.
// Spells: Comprehend Languages reads the oath-stone.

=== ch2_old_ford ===
That night you sleep at the Tallow and Thistle, in a bed that smells of lavender and woodsmoke. Morwen packs you enough bread and cheese for a week, and won't hear a word about paying for it. #location:Bramblegate, the Tallow and Thistle #time:Night
~ long_rest()
* [Set out north at first light]
    -> road

= road
The barrow road leaves Bramblegate by the north gate and climbs into the hills, between dry-stone walls and thorn hedges heavy with sloes. By mid-morning the farms are behind you, and the barrows begin: long green mounds beside the road, older than the road itself. #location:The barrow road #time:Morning
{ companion_alive("fen"):
    "Cheerful country," Fen says, eyeing the mounds. "Nothing says welcome like a field full of dead kings." #speaker:fen
}
Every barrow you pass has been opened. Not dug into, the way grave-robbers go about it, but opened like a door: the great flat stone that sealed each one has been lifted off and carried away, and the dark mouths stand empty to the sky.
{ companion_alive("odda"):
    Odda stops at the first of them and stands looking into the dark for a long moment. She touches her holy symbol, and doesn't say anything at all.
}
* [Read the ground round the nearest barrow #check:survival:12]
    { check("survival", 12):
        The turf is churned with footprints, dozens of them, bare and shod, all sunk deep at the heel, as if every one of the walkers carried something heavy. They come out of the barrow, onto the road, and turn north. None of them come back.
        ~ set_flag("saw_capstone_tracks")
        ~ quest_note("missing-miller", "The old barrows along the barrow road have been opened, their capstones carried off north by walkers who left deep, heavy footprints.")
    - else:
        The ground is a mess of old cart ruts and sheep. Whatever lifted the stone, it didn't stop to leave you a note.
    }
    -> arrival
* [Walk on: you want the ford by nightfall]
    -> arrival

= arrival
By dusk the road drops out of the hills into a wide valley, and there is the river: broad and brown and loud, running fast between banks of willow. Where the barrow road meets it, the water spreads out thin over a bed of stones. That's the Old Ford. Here the realm's post road comes down from the north to cross it too. #location:The Old Ford #time:Dusk
On the far bank stands the watch-post: a squat stone tower with a signal brazier on top that nobody has lit, and a barricade of crates and stakes across the head of the ford. Somebody has been in a fight here. The stakes are splintered, and there are dark stains on the stones.
You wade across with the water cold to your knees. Halfway over, a spear-point comes up over the barricade.
"That's far enough. Say who you are, and say it quick." The woman behind the spear wears mail and a watch-sergeant's red sash, and looks as if she hasn't slept in two days. #speaker:brannock
You tell her. She looks you over, and lowers the spear an inch. "From Bramblegate? Then you've seen Varrow. Did Hendry get through to him? He went for help two days ago." #speaker:brannock
You haven't seen any Hendry. The sergeant takes that in without a word, then lowers the spear the rest of the way. "Sergeant Brannock," she says. "Come up, then. You're the best luck we've had all week." #speaker:brannock
{ has_flag("fen_sold") || has_flag("fen_left_behind"):
    -> fen_back
}
-> post_talk

// ---- Fen, sold or left behind, is here before you ----

= fen_back
Inside the barricade, sitting on the tower steps and eating the watch's bread, is a halfling with rope burns round both wrists and river-weed in his hair.
"Oh, look," says Fen Underbough. "It's you." #speaker:fen
{ has_flag("fen_sold"):
    "Ten gold," he says. "I've been doing sums all the way up the road, about what I'd have charged to sell me. It was a lot more than ten." #speaker:fen
- else:
    "You walked on," he says. "Never even told me your name. I've had to curse you as 'that one' for two days. It's not nearly as satisfying." #speaker:fen
}
"Gaunt's knots are like her manners," he goes on. "Tight, but not clever. I was out of them before the first milestone, and in the river before the second. Floated down here, more or less. Mostly less." #speaker:fen
"Came in last night half drowned, talking," Brannock says. "Hasn't stopped since." #speaker:brannock
"And tonight," Fen says, wiping his fingers, "the dead come back. They don't ask whose side you're on. So I'll take a spear and stand with you, for tonight. Tomorrow, we'll see." #speaker:fen
~ fen_rejoins()
* [Tell him you're sorry]
    "Sorry," Fen repeats, as if he's tasting a word in a foreign language. He looks at you for a long moment. "Huh," he says at last. "Well. That's something." #speaker:fen
    ~ approve("fen", 1)
* {has_flag("fen_sold") && can_pay(10)} [Give him Gaunt's ten gold #pay:10]
    ~ pay(10)
    Fen weighs the coins in his hand. "Blood money," he says. "Still spends." The coins vanish somewhere about his person. "It's a start." #speaker:fen
    ~ approve("fen", 1)
* [Tell him it was nothing personal]
    "It was quite personal," Fen says, "from where I was hanging." #speaker:fen
- -> post_talk

// ---- At the post: questions loop back here, not to the greeting ----

= post_talk
* [Ask what's been happening here]
    "Two nights back they came up out of the river," Brannock says. "Dead men. A dozen or more, each with a great flat stone on its back like a pedlar's pack. Wading up out of the ford as if it was a road." #speaker:brannock
    "They didn't so much as look at us. Just went past, north, up the road. Corporal Ashe went at them with a spear, and old Dunmore after him." She looks at the river. "The dead put down their stones to kill them. Then they picked them up again, and went on." #speaker:brannock
    -> post_talk
* [Ask where the stones come from]
    "Off the barrows," Brannock says. "The old graves along the road you came up. Capstones." She spits over the barricade. "My gran said nobody was ever to open the old graves on the barrow road. They hold things down, she said. I thought she meant ghosts." #speaker:brannock
    -> post_talk
* [Ask why the watch is still here]
    "Because the post holds the ford, and those are Captain Varrow's orders, and nobody's told me otherwise." Brannock rubs her eyes. "Last night they came back. Not for the road. For us. And there was one with them that wasn't carrying anything." #speaker:brannock
    "Fast, it was. Long arms. It got Rufus by the leg and dragged him into the water, and he went stiff as a board before he went under." #speaker:brannock
    { companion_alive("odda"):
        "A ghoul," Odda says quietly. #speaker:odda
    }
    -> post_talk
+ [Get ready for the night]
    -> ready

// ---- The night ----

= ready
The two soldiers left to Brannock are Wat, a gangling lad with a spear taller than he is, and Nell, a broad, freckled woman who hums under her breath while she sharpens hers. You help them shore up the barricade. Then you wait, while the light goes out of the sky. #time:Night
{ companion_alive("odda"):
    Odda goes round with a kettle of tea she brewed on the tower hearth, and makes everybody drink some, whether they want it or not.
}
It's past midnight when Nell stops humming. Out on the far bank, shapes are coming down to the water: dead men in rotted grave-clothes, each bent double under a slab of grey stone. They wade into the ford without a pause. And running ahead of them, low and fast and carrying nothing at all, is something with long arms.
"Here they come," Brannock says. "Spears up." #speaker:brannock
~ set_objective("Hold the Old Ford through the night, and keep Sergeant Brannock's watch alive.")
// Who goes into the fight on their feet, so the dawn knows who fell here.
{ companion_alive("odda"):
    ~ set_flag("odda_fought_at_the_ford")
}
{ companion_alive("fen"):
    ~ set_flag("fen_fought_at_the_ford")
}
* [Hold the ford with the watch #combat:ford-dead]
    -> fought
* [Slip away upriver in the dark, and leave the watch to it]
    -> abandoned

= fought
{ combat_won():
    -> held
- else:
    -> ford_mercy
}

= held
~ watch_fate()
~ add_deed("Held the Old Ford through the night against the dead coming up out of the river.")
The last of the dead goes down in the shallows, and the river closes over its stone. For a while there's no sound but the water, and somebody breathing hard.
{
    - has_flag("ford_watch_saved"):
        Brannock counts heads twice, as if she doesn't trust the first count. Three. "All of us," she says, and sits down hard on the tower step. "All of us." #speaker:brannock
        Wat is laughing and can't stop. Nell has started humming again.
    - has_flag("ford_held"):
        -> some_fell ->
    - else:
        You look round for the watch, and find them. Brannock, Wat and Nell all lie where they held the line, their spears still pointing at the river. The Old Ford's watch-post has nobody left to keep it.
}
-> the_fallen

// One or two of the watch lived. The sergeant speaks if she's one of them.
= some_fell
{ ally_standing("brannock"):
    { ally_standing("wat"):
        Brannock kneels a long while beside Nell at the barricade.
    - else:
        { ally_standing("nell"):
            Brannock kneels a long while beside Wat at the barricade.
        - else:
            Brannock kneels a long while at the barricade, between Wat and Nell.
        }
    }
    When she gets up, her face is set like a wall. "Hendry, Ashe, Dunmore, Rufus{ not ally_standing("wat"):, and Wat}{ not ally_standing("nell"):, and Nell}," she says. "But the post held." #speaker:brannock
- else:
    Sergeant Brannock lies at the head of the ford where she stood, her spear still pointing at the river.
    { ally_standing("nell"):
        Nell kneels beside her a while. When she gets up, she picks up the sergeant's red sash and ties it round her own arm. "The post held," she says. "She'd want that said." #speaker:nell
    - else:
        Wat kneels beside her a long while. When he gets up he's holding the sergeant's red sash, and he doesn't seem to know what to do with it. "The post held," he says at last. "Didn't it? It held." #speaker:wat
    }
}
->->

// ---- Fate's Mercy at the ford ----

= ford_mercy
~ lose_coins()
~ long_rest()
~ set_flag("ford_fates_mercy")
~ watch_fate()
~ add_deed("Was beaten by the dead at the Old Ford. They went on north with their stones, and the river took your purse.")
{ has_flag("ford_fell"):
    You come to in the reeds below the ford with the river tugging at your legs, in the grey light before sunrise. The dead left you where you fell, and went on north with their stones. Your purse is gone: torn loose in the struggle, and the river has it. #time:Dawn
    The watch-post is silent. You find the soldiers where they held the line.
- else:
    You come to on the floor of the watch-tower, in the grey light before sunrise, with a soldier's cloak over you. Somebody dragged you in here and barred the door. The dead went on north with their stones. Your purse is gone: torn loose in the struggle, and the river has it. #time:Dawn
    { ally_standing("brannock"):
        "You went down, and we dragged you in," Brannock says from the doorway. "They didn't follow. Didn't care, I reckon, once nobody was in their road." #speaker:brannock
    - else:
        { ally_standing("nell"):
            "We dragged you in," Nell says from the doorway. She has the sergeant's red sash tied round her arm. "Sergeant didn't make it. They didn't follow us. Didn't care, once nobody was in their road." #speaker:nell
        - else:
            "I dragged you in," Wat says from the doorway, holding the sergeant's red sash as if he doesn't know what to do with it. "The others didn't make it. They didn't follow. They didn't care." #speaker:wat
        }
    }
}
-> the_fallen

// ---- Walking away ----

= abandoned
~ set_flag("ford_abandoned")
~ set_flag("ford_fell")
~ approve("odda", -1)
~ add_deed("Slipped away from the Old Ford in the dark, and left its watch to the dead.")
You go back down off the barricade{ companion_alive("odda"):, with Odda staring at you as if she's never seen you before}, and follow the bank upriver in the dark until you find a place to cross. Behind you there's shouting for a while, and then there isn't.
At dawn you come back down the far bank to the ford. The dead have gone on north with their stones. The watch-post is silent, and you find the soldiers where they held the line without you. #time:Dawn
{ companion_alive("odda"):
    Odda kneels beside each of them in turn and says the words for the dead. She doesn't look at you once while she does it.
}
-> stone

// ---- Dawn ----

// Anyone in the party who fell in the fight lies in state until they can be raised.
= the_fallen
{ has_flag("odda_fought_at_the_ford") && not companion_alive("odda"):
    Odda lies at the water's edge where she fell, her mace still in her fist. You wrap her in a soldier's cloak, and her face looks no less stern for being still.
    ~ set_flag("odda_fell_at_the_ford")
}
{ has_flag("fen_fought_at_the_ford") && not companion_alive("fen"):
    Fen lies on the stones at the head of the ford, small and still. Somebody has to close his eyes. It turns out to be you.
    ~ set_flag("fen_fell_at_the_ford")
}
{ has_flag("odda_fell_at_the_ford") || has_flag("fen_fell_at_the_ford"):
    { has_flag("ford_fell"):
        You lay them on the watch's handcart, to bring down to Bramblegate with the news. The temple will keep them before the altar flame until they can be raised.
    - else:
        The watch's supply cart will carry them down to Bramblegate, to lie before the temple's altar flame until they can be raised.
    }
}
-> stone

// The clue: a capstone dropped in the shallows is an oath-stone.
= stone
The dead left something behind. One of the capstones lies in the shallows where its carrier fell: a slab of grey stone a yard across, green with old moss, and carved on its underside with a line of letters worn soft by the centuries. #time:Dawn
* [Read the carving #check:history:12]
    { check("history", 12):
        The letters are old, but the words are plain enough once you find the shape of them: HERE LIES TAMAR OAKHEART, SWORN TO THE CONCORD. WHILE THIS STONE LIES, THE OATH HOLDS.
        ~ set_flag("read_the_oath_stone")
    - else:
        The letters are too worn and too old. You make out SWORN, and CONCORD, and at the very end, HOLDS.
    }
    -> stone_meaning
* {can_cast("comprehend-languages")} [Read it with Comprehend Languages #spell:comprehend-languages]
    ~ cast("comprehend-languages")
    The worn letters swim and settle under the spell, and read as clearly as if they were cut yesterday: HERE LIES TAMAR OAKHEART, SWORN TO THE CONCORD. WHILE THIS STONE LIES, THE OATH HOLDS.
    ~ set_flag("read_the_oath_stone")
    -> stone_meaning

= stone_meaning
{ companion_alive("odda"):
    Odda crouches beside it and runs her thumb along the words. "An oath-grave," she says. "My order still keeps the old lists. When the Concord was sworn, the first queen's champions were buried with their oaths, and the stones laid on them to hold the oaths down." #speaker:odda
    "Every one of these is a seal," she says. "And somebody is lifting them, one by one." #speaker:odda
- else:
    You think of Brannock's gran: nobody was ever to open the old graves on the barrow road, because they hold things down. Not ghosts. Oaths. Every barrow you passed on the road was a seal, and somebody is lifting them, one by one.
}
The dead aren't robbing the old graves. They're unsealing them. And each one was a ward against something.
~ set_flag("knows_oath_wards")
~ give_xp(50)
~ quest_note("missing-miller", "At the Old Ford, a capstone the dead dropped turned out to be an oath-stone: 'While this stone lies, the oath holds.' The dead are unsealing the old oath-graves one by one, and each one was a ward.")
-> thanks

// What the watch does now, by how many of them lived.
= thanks
{
    - has_flag("ford_watch_saved"):
        Brannock sends Wat down the road to Bramblegate at sunrise with a report for Captain Varrow, and makes you stand there while she tells him what to put in it. "All of it," she tells him. "Every word. The captain'll want to know who held his ford for him. And so will the Regent's men, when they hear." #speaker:brannock
        ~ add_deed("Kept all three of the Old Ford's watch alive. Captain Varrow, and the Regency, will hear of it.")
    - has_flag("ford_held"):
        { ally_standing("brannock"):
            Brannock writes a report for Captain Varrow by the light of the tower fire, slowly, with her tongue between her teeth, and gives it to the supply cart when it comes. "He'll know who held his ford for him," she says. #speaker:brannock
        - else:
            {ally_standing("nell"):Nell|Wat} writes a report for Captain Varrow by the light of the tower fire, and gives it to the supply cart when it comes. Your name is in it.
        }
    - else:
        Somebody has to tell Bramblegate that the Old Ford has fallen, and that its watch died holding it. It may as well be you.
}
{ has_flag("fen_returned"):
    -> fen_decides
}
-> bond

// ---- Fen decides ----

= fen_decides
{ not companion_alive("fen"):
    -> bond
}
Fen finds you on the barricade, watching the river go by. "I've been thinking," he says, "which I know isn't like me." #speaker:fen
"The Choir wants me dead. Gaunt's still out there somewhere, one halfling short and in a temper about it. And you, it turns out, are very hard to kill." He sighs. "So I'm coming with you. Don't mistake it for friendship. It's arithmetic." #speaker:fen
* [Tell him you're glad]
    "Don't be," Fen says. But he doesn't go away, either. #speaker:fen
* [Tell him to suit himself]
    "I always do," Fen says. #speaker:fen
- -> bond

// ---- The Bond (Chapter 2, beat 4) ----

= bond
{
    - has_bond("sibling"):
        -> sibling
    - has_bond("mentor"):
        -> mentor
    - has_bond("rival"):
        -> rival
    - has_bond("debt"):
        -> debt
}
-> road_on

// The post road meets the barrow road here, and Bramblegate's mail waits at the post for the
// supply cart: a letter is waiting for the hero.
= mailbag
Before you go, you look into the tower. The post road meets the barrow road at the Old Ford, and the riders leave Bramblegate's mail here for the supply cart, which hasn't come up since the dead began walking. The mailbag hangs on its peg by the door. There's a letter in it for you.
->->

= sibling
-> mailbag ->
It's addressed to you, care of Bramblegate, in a hand you'd know anywhere: {bond_name()}'s.
"Three nights back the dead came down our lane," it says. "A whole line of them, walking slow, each one carrying a big flat stone on its back like a pedlar's pack. They didn't so much as look at us. They just went on down the road towards the hills, and in the morning there were footprints all the way, sunk deep."
"Everyone here says it's the old barrows. Mam says you're to come home. I say you're to find out what it is, because you'll do it anyway. Be careful. Write back. Your {bond_name()}."
~ set_flag("sibling_letter")
~ quest_note("missing-miller", "A letter from " + bond_name() + ": the dead walked past them at home too, each carrying a stone.")
-> road_on

= mentor
-> mailbag ->
It's sealed with a blob of plain wax pressed flat with a thumb, and addressed in a cramped, hurried hand you'd know anywhere: {bond_name()}'s.
"I hear the frontier is stirring, and that you've gone to it," it says. "So hear this from me. If you hear singers in grey, run. I mean it. Don't be brave, don't be clever, and don't ask them what they're singing."
"I knew some of them once, a long time ago. I'll tell you about it when I see you, which had better be soon. {bond_name()}."
You fold the letter up again. It's a little late for running.
~ set_flag("mentor_warned")
~ quest_note("missing-miller", "A letter from " + bond_name() + ": 'If you hear singers in grey, run.' They've known of the Choir a long time.")
-> road_on

// A Rival rides in at dawn, a step behind for once, after Reeve Corbin's bounty on the miller.
= rival
You're refilling your waterskin at the ford when a rider comes splashing across it from the Bramblegate side: a lean figure in road-stained leathers, on a horse that's been ridden hard. You know the set of those shoulders before you see the face. It's {bond_name()}.
"Well," says your rival, reining in. "Fancy that. Reeve Corbin's posting fifty gold for a missing miller, and who do I find at the first river? You." They look at the barricade, and the stones in the shallows. "You've been busy. Doesn't matter. I'll have him home before you've had breakfast." #speaker:rival
* [Offer to go after the miller together]
    Your rival laughs. "And split fifty gold? Not a chance." But they look at you a moment longer than they need to. "See you at Cairnfield. Try to keep up." #speaker:rival
    ~ set_flag("rival_offered_truce")
* [Warn them about the Choir]
    "Grey robes, sad songs, dead men with rocks," says your rival. "I read the notice." They turn the horse north. "I've handled worse." #speaker:rival
    ~ set_flag("rival_warned")
* [Tell them the miller's yours #drive:glory]
    ~ drive_moment("glory")
    "We'll see," says your rival, and grins the old grin, the one you've hated for years. "We always do." #speaker:rival
- They kick the horse on, up the north bank and away along the barrow road at a canter, without waiting for you.
~ set_flag("rival_went_ahead")
~ quest_note("missing-miller", "Your rival, " + bond_name() + ", is after the reeve's bounty on Garrick too, and rode on ahead to Cairnfield alone.")
-> road_on

// A Debt: a Free League factor offers to square it for something from the barrow.
= debt
In the post's yard stands a covered wagon with a merchant's mark on the canvas: a ship under a single star. Its owner crawls out from under it as the sun comes up, brushing straw off a good black coat. He's spent the night there, by the look of him, and the night before that.
"Ambrose Penhallow," he says, "factor to the Free League, and very much obliged to you. Those things wouldn't let me cross." He looks at you, and something in his eyes sharpens. "I know you, I think. Or I know your paper. You owe {bond_name()} a great deal of money." #speaker:penhallow
"The League does business with {bond_name()}. The League does business with everyone. So here's my offer: bring me anything shiny out of those barrows the Choir is digging, and I'll see your debt squared. Every copper of it." #speaker:penhallow
-> debt_offer

= debt_offer
* [Ask what the League really wants with barrow-gold #check:insight:12]
    { check("insight", 12):
        He smiles too easily. It isn't gold he wants. When you press him, he admits it: "Anything with a crown on it. Carvings, rings, a coin, a sliver of something. The Magister collects them." #speaker:penhallow
        ~ set_flag("league_wants_crowns")
    - else:
        "Curiosities, mostly," he says. "There's a market for old things." His smile doesn't move at all. #speaker:penhallow
    }
    -> debt_offer
* [Shake on it #drive:wealth]
    ~ drive_moment("wealth")
    ~ set_flag("league_deal")
    ~ approve("odda", -1)
    Penhallow's handshake is warm and dry and quick. "A pleasure," he says. "Find me through any League house. They'll know the name." #speaker:penhallow
    { companion_alive("odda"):
        Odda says nothing, very loudly.
    }
    -> debt_done
* [Turn him down: you don't rob the dead]
    ~ set_flag("league_refused")
    ~ approve("odda", 1)
    Penhallow only shrugs. "The offer stands," he says. "Debts keep. Any League house will know the name." #speaker:penhallow
    -> debt_done

= debt_done
~ set_flag("met_penhallow")
~ add_deed("Met Factor Penhallow of the Free League at the Old Ford, who knew all about your debt to " + bond_name() + ".")
-> road_on

// ---- On north (or back to Bramblegate, if the post fell) ----

= road_on
{ has_flag("ford_fell"):
    ~ set_objective("Carry word to Bramblegate that the Old Ford has fallen, then take the barrow road north to the Choir's camp at Cairnfield.")
- else:
    ~ set_objective("Cross the Old Ford and follow the barrow road north to the Choir's camp at Cairnfield.")
}
-> ch2_cairnfield

// The watch's fate, from how many of them came through the fight (Rob chose these, Oct 11,
// 2026): all three, the Regency's favour and Varrow's help in Chapter 3; one or two, the post
// held; none, the post fell.
=== function watch_fate() ===
{
    - allies_standing() == 3:
        ~ set_flag("ford_held")
        ~ set_flag("ford_watch_saved")
        ~ set_flag("regency_favour")
        ~ set_flag("varrow_holds_cairns")
    - allies_standing() > 0:
        ~ set_flag("ford_held")
    - else:
        ~ set_flag("ford_fell")
}

// Fen, sold or left behind, joins for the night's fight, liking you less than he did (Rob,
// Oct 11, 2026). There's always room: Odda is the only other companion so far.
=== function fen_rejoins() ===
~ set_flag("fen_returned")
{ not in_party("fen") && not party_full():
    ~ join_party("fen")
    ~ approve("fen", -1)
    { has_flag("fen_sold"):
        ~ approve("fen", -1)
    }
}
