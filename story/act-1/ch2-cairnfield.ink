// Chapter 2 · The Barrow Road, beat 7: the camp at Cairnfield (docs/STORY.md).
//
// From the Old Ford the barrow road climbs onto the high moor. If the post fell (ford_fell),
// the party carries the news down to Bramblegate first, then comes back north. Beat 6, the
// temple's secret (ch2-temple.ink), happens on that visit; if the post held, the party goes
// back to Bramblegate for it after Cairnfield (ch2_homeward). A night in a ruined sheepfold
// (a long rest, with a word from Odda or Fen), then a day watching from the ridge, and at dusk
// the camp: the Ashen Choir's grey tents among the opened barrows, at the foot of the Kings'
// Barrow, where black water runs out of a sluice in the barrow's flank. A Rival who rode on
// ahead (rival_went_ahead) is marched in chains into the barrow.
//
// The ways in (Rob chose them, Oct 11, 2026):
//   Sneak in: Stealth 12, down the gully Fen knows, or 15 without him.
//   Invisibility: the hero walks into the camp alone, unseen.
//   Sing with Fen: borrowed grey robes, and Performance 13 to sing along (10 with the Choir's
//     hymnal from Brackenhollow: you've read the words).
//   Attack.
// A quiet way in, done well, overhears the plan: Cantor Vesk opens the crown vault at the dark
// of the moon, three nights away, and the miller is alive, turning the sluices that drain the
// flooded lower vault (knows_dark_of_moon, knows_miller_at_sluices, 50 XP). Then slip away
// (the fight's full 650 XP; Sister Rhosyn lives) or strike with surprise. Failing either way
// in is the fight, without surprise.
// The fight (cairnfield-camp): Sister Rhosyn (a Cultist Fanatic), four acolytes and two
//   Zombies, Moderate for a level 3 party of three. Unless the hymn is broken, a third Zombie
//   rises on round 3. An acolyte who runs makes for the barrow, and Vesk hears you're coming
//   (vesk_warned).
// After a won fight, Tobin Reed, the youngest acolyte (Fen knew him in the Choir), yields and
//   tells what he knows: let him go home, send him down to Captain Varrow, or leave him tied
//   for the Choir to find.
// Losing is Fate's Mercy: the Choir throws the party into an opened barrow, to be sung up
//   later with the dead, and robs them; Tobin lets down a rope at dawn.
// Spells: Invisibility.

=== ch2_cairnfield ===
* {has_flag("ford_fell")} [Carry the news down to Bramblegate]
    -> news_home
* {not has_flag("ford_fell")} [Follow the barrow road north]
    -> road_north

// ---- The Old Ford fell: the news goes down to Bramblegate first ----

= news_home
It's a long day's walk back down the barrow road with nothing to carry but bad news. Captain Varrow hears it out in the watch-house, standing, with his hands flat on the table. #location:Bramblegate, the watch-house #time:Dusk
"Brannock," he says at last. "Wat. Nell." He says each name as if he's setting it down somewhere careful. "Hendry never reached me. Now I know why." #speaker:varrow
He sends two riders north that same hour, to bury his people and hold the ford if it can be held. Then he looks at you. "Cairnfield, you said. Go and see what the Choir are digging for, and come back and tell me. I can't spare you a single spear." #speaker:varrow
-> ch2_temple ->
That night you sleep at the Tallow and Thistle. Morwen asks no questions at all, which is how you know she's heard. #location:Bramblegate, the Tallow and Thistle #time:Night
~ long_rest()
// In the morning, a round of the town (ch2-temple.ink), and then the road north.
* [Go out into the town at first light]
    -> ch2_rally

// ---- Up onto the high moor ----

= road_north
{ has_flag("ford_fell"):
    You pass the Old Ford at noon. Varrow's riders have been and gone: there are fresh graves on the north bank, and the tower door is shut and barred. #location:The barrow road #time:Midday
- else:
    North of the Old Ford the barrow road climbs out of the valley and onto the high moor. #location:The barrow road #time:Morning
}
The moor is wide and bare and brown, all heather and bog-cotton and sky, and the barrows on it grow bigger and older the farther north you go. Every one stands open. The tracks of the dead run north between them, sunk deep, and once you find a capstone lying in the heather where its carrier simply stopped, and left it.
{ companion_alive("fen"):
    "There," Fen says, pointing. Far off, a thread of smoke goes up from behind a long ridge. "Cairnfield. I'd know that smoke anywhere. They burn juniper, for the smell." #speaker:fen
}
By nightfall the ridge is close. You find a ruined sheepfold in a hollow of the moor, out of the wind and out of sight, an hour short of the smoke. #location:A sheepfold on the high moor #time:Night
{ companion_alive("odda"):
    Odda brews tea on a fire no bigger than her two hands, and shields it with her cloak so the glow won't show.
}
-> fold_talk

// A word by the fire: the questions loop back here, and sleep ends it.
= fold_talk
* {companion_alive("fen")} [Ask Fen what the Choir is like, from the inside]
    Fen is quiet a while. "Warm," he says at last. "That's the trick of it. You come in off the road half starved, and they feed you, and nobody hits you, and in the evening everyone sings." #speaker:fen
    "I had the best high notes they'd heard in years. Sister Rhosyn said I sang like a lost child." He picks at the heather. "I know every hymn they've got, word for word. It turned out the words were instructions." #speaker:fen
    -> fold_talk
* {companion_alive("odda")} [Ask Odda what she thinks is under the Kings' Barrow]
    "Kings, if the name's honest," Odda says. "But the old lists of my order say it's older than any king. The first queen buried her champions there, with their oaths on them, like the stones on the road." #speaker:odda
    She blows on her tea. "If the little graves were seals, that one's the lock on the door." #speaker:odda
    -> fold_talk
+ [Get some sleep]
    -> sleep

= sleep
You sleep in turns behind the sheepfold wall, and nothing comes for you in the night but the wind.
~ long_rest()
* [Go up to the ridge, and look down on Cairnfield]
    -> overlook

// ---- The camp ----

= overlook
You lie in the heather on the ridge all the next day, and watch. #location:Cairnfield #time:Dusk
Below you the moor drops into a wide, shallow bowl ringed with barrows, every one of them opened. In the middle of the bowl rises a mound bigger than all the rest put together, its sides too regular to be a hill: the Kings' Barrow. Its great stone doors are still shut. But a timber channel runs out of a low opening in its flank, and black water spills down it, steady as a mill-race. Something inside is being drained.
At the barrow's foot stands the Choir's camp: a dozen grey tents round a fire. Acolytes in grey come and go. At the edge of the camp, the dead sit in a long row in the heather like labourers at the end of a shift, their stones laid down beside them.
As the light goes, a tall woman in a red mantle over her grey walks out to the fire, and the acolytes gather to her. She lifts her hands, and they begin to sing.
{ companion_alive("fen"):
    Fen goes very still beside you. "Sister Rhosyn," he breathes. "She did the hiring, when I joined. And the firing, when people tried to leave." #speaker:fen
}
{ has_flag("mentor_warned"):
    You think of {bond_name()}'s letter: if you hear singers in grey, run. It's a little late for that.
}
{ has_flag("rival_went_ahead"):
    -> rival_taken ->
}
// Who goes into a fight on their feet, so afterwards the scene knows who fell here.
{ companion_alive("odda"):
    ~ set_flag("odda_at_cairnfield")
}
{ companion_alive("fen"):
    ~ set_flag("fen_at_cairnfield")
}
-> approach

// A Rival who rode on ahead is the Choir's prisoner now: rescued in Chapter 3.
= rival_taken
Two acolytes come out of the camp with a prisoner between them, hands bound, stumbling: a lean figure in road-stained leathers who still manages to walk as if the whole thing was their own idea. It's {bond_name()}.
They march your rival to the low door in the barrow's flank and through it, and the door swings shut behind them. You couldn't have reached it from up here if you'd run.
~ set_flag("rival_taken")
~ quest_note("missing-miller", "The Choir took " + bond_name() + " prisoner at Cairnfield, and led them into the Kings' Barrow.")
->->

= approach
* {companion_alive("fen")} [Follow Fen down the gully the sentries never watch #check:stealth:12]
    ~ set_flag("cairnfield_sneaked")
    { check("stealth", 12):
        -> listening
    - else:
        -> spotted_sneaking
    }
* {not companion_alive("fen")} [Creep down through the heather after dark #check:stealth:15]
    ~ set_flag("cairnfield_sneaked")
    { check("stealth", 15):
        -> listening
    - else:
        -> spotted_sneaking
    }
* {can_cast("invisibility")} [Cast Invisibility, and walk into the camp alone #spell:invisibility]
    ~ cast("invisibility")
    ~ set_flag("cairnfield_invisible")
    -> unseen
* {companion_alive("fen") && has_item("choir-hymnal")} [Put on grey and sing with Fen: you know the words from the hymnal #check:performance:10]
    ~ set_flag("cairnfield_sang")
    { check("performance", 10):
        -> singing
    - else:
        -> spotted_singing
    }
* {companion_alive("fen") && not has_item("choir-hymnal")} [Put on grey and sing with Fen #check:performance:13]
    ~ set_flag("cairnfield_sang")
    { check("performance", 13):
        -> singing
    - else:
        -> spotted_singing
    }
* [Attack the camp #combat:cairnfield-camp]
    ~ set_flag("cairnfield_attacked")
    -> fought

// ---- Quiet ways in ----

= listening
{ companion_alive("fen"):
    Fen leads you down a gully choked with bracken and round the back of the tents, where no sentry stands.
    "Nobody watches the back," he whispers. "Nobody comes to Cairnfield on purpose." #speaker:fen
- else:
    You go down off the ridge after dark, a step at a time, and work your way through the heather to the back of the tents.
}
You lie flat behind the last tent, close enough to feel the fire on your face. The hymn is over. Sister Rhosyn stands talking with a young acolyte, her voice low and even. #time:Night
-> the_plan ->
-> strike_or_slip

= unseen
{ companion_alive("odda") || companion_alive("fen"):
    You leave the others in the heather, speak the words, and watch your own hands fade to nothing.
- else:
    You speak the words, and watch your own hands fade to nothing.
}
You walk down off the ridge and into the Choir's camp between two sentries, close enough to smell the juniper smoke on their robes. Nobody looks at you, because there's nothing to look at. You stand at Sister Rhosyn's elbow while she talks with a young acolyte by the fire. #time:Night
-> the_plan ->
-> strike_or_slip

= singing
Fen lifts two grey robes off a drying line at the edge of the camp as if he does it every evening, and the two of you walk into the back row of the Choir with your hoods up.
{ companion_alive("odda"):
    Odda stays in the heather. "I'll not sing their songs," she said, "not even to save my neck." She is, you suspect, praying very hard instead.
}
The hymn is slow and old and beautiful, and you know it the way you know a dream. Beside you Fen sings the high part like a lost child. Across the fire, the dead stir in their row, and lift their heads to listen.
When it ends, Sister Rhosyn speaks to her choir. #time:Night
"Three nights, my children. At the dark of the moon the Cantor opens the crown vault, and the first of the oaths comes home to the Sleeping King." #speaker:rhosyn
"Until then we dig, and we sing, and the miller turns his wheels until the lower vault runs dry. Garrick knows what happens to those who stop working. He has seen them join our choir." #speaker:rhosyn
The acolyte at Fen's other elbow, a boy with a cobbler's hands, is staring at him. "Fen?" he breathes. "They said you were dead." #speaker:tobin
"Not yet," Fen murmurs. "Sing, Tobin." #speaker:fen
~ set_flag("tobin_saw_fen")
-> learn_plan ->
-> strike_or_slip

// What the Choir means to do, overheard by the fire.
= the_plan
"Three nights," Rhosyn says. "At the dark of the moon the Cantor opens the crown vault, and the first of the oaths comes home to the Sleeping King." #speaker:rhosyn
"And the lower vault, Sister? The water's still waist-deep on the stair." #speaker:tobin
"Then the miller turns his wheels faster." Rhosyn smiles. "Garrick knows what happens to those who stop working. He has seen them join our choir." #speaker:rhosyn
-> learn_plan ->
->->

// What the party knows now.
= learn_plan
~ set_flag("knows_dark_of_moon")
~ set_flag("knows_miller_at_sluices")
~ give_xp(50)
~ quest_note("missing-miller", "Garrick is alive, inside the Kings' Barrow at Cairnfield, turning the sluice wheels that drain its flooded lower vault. Cantor Vesk means to open the barrow's crown vault at the dark of the moon, three nights away.")
->->

= strike_or_slip
* [Slip away the way you came, with what you know]
    -> slipped
* {companion_alive("odda") || companion_alive("fen")} [Fetch the others, and strike while the camp doesn't know you're here #combat:cairnfield-camp #surprise]
    ~ set_flag("cairnfield_struck_first")
    -> fought
* {not companion_alive("odda") && not companion_alive("fen")} [Strike while the camp doesn't know you're here #combat:cairnfield-camp #surprise]
    ~ set_flag("cairnfield_struck_first")
    -> fought

= slipped
~ set_flag("cairnfield_slipped_away")
~ set_flag("rhosyn_lives")
~ give_xp(650)
~ approve("fen", 1)
~ add_deed("Got into the Choir's camp at Cairnfield, learned what they're planning, and got out again unseen.")
You leave the way you came{has_flag("cairnfield_invisible"):, and the spell holds until you're back out in the heather}. Behind you the fire burns on, and nobody in the camp knows you were ever there.
{ companion_alive("fen"):
    "Well," Fen whispers, once you're over the ridge. "That was clever. I do like clever." #speaker:fen
}
-> road_back

// ---- Spotted: the fight, without surprise ----

= spotted_sneaking
Halfway down, a stone turns under your boot and goes clattering away down the gully. Up by the tents a lantern swings round. "There!" somebody shouts. "In the heather!" #time:Night
{ companion_alive("fen"):
    Fen says a word they don't teach in the Choir.
}
-> spotted

= spotted_singing
Fen lifts two grey robes off a drying line at the edge of the camp, and the two of you walk into the back row of the Choir with your hoods up. #time:Night
But the hymn climbs, and climbs again, and your voice cracks on the high note like a dropped plate. Every hooded head turns.
Sister Rhosyn stops singing. "That," she says, "is not one of mine." #speaker:rhosyn
{ companion_alive("odda"):
    Up on the ridge, Odda is already on her feet, and coming down at a run with her mace in her fist.
}
-> spotted

= spotted
~ set_flag("cairnfield_spotted")
The acolytes snatch up their sickles. Down by the barrows the dead climb out of the heather and turn their empty faces your way, and Sister Rhosyn begins, very calmly, to sing.
* [Fight #combat:cairnfield-camp]
    -> fought

// ---- The fight ----

= fought
{ combat_won():
    -> won
- else:
    -> camp_mercy
}

= won
~ set_flag("cairnfield_won")
~ set_flag("rhosyn_dead")
~ add_deed("Broke the Ashen Choir's camp at Cairnfield, under the walls of the Kings' Barrow.")
Sister Rhosyn goes down by the fire still singing, and the last note goes out of the air like a snuffed candle. All across the bowl, the dead in their long row lie down in the heather and are still. #time:Night
{ foe_escaped("cultist"):
    -> word_gets_out ->
}
-> the_fallen ->
-> tobin

// An acolyte who ran made it to the barrow.
= word_gets_out
Out on the dark moor someone is running: an acolyte who got away, making for the low door in the barrow's flank. It booms shut behind them. Cantor Vesk will know you're coming.
~ set_flag("vesk_warned")
->->

// Anyone in the party who fell in the fight goes home to lie in state until they can be raised.
= the_fallen
{ has_flag("odda_at_cairnfield") && not companion_alive("odda"):
    Odda didn't get up from the fight. You find her by the fire, her mace still in her fist, and her face looks no less stern for being still.
    ~ set_flag("odda_fell_at_cairnfield")
}
{ has_flag("fen_at_cairnfield") && not companion_alive("fen"):
    Fen lies small and still in the heather, his knife still in his hand.
    ~ set_flag("fen_fell_at_cairnfield")
}
{ has_flag("odda_fell_at_cairnfield") || has_flag("fen_fell_at_cairnfield"):
    In the morning you carry them down to the barrow road, where the reeve's carts run, and send them home to Bramblegate's temple, to lie before the altar flame until they can be raised.
}
->->

// ---- Tobin Reed, the youngest acolyte ----

= tobin
Behind the tents you find the last of them: a boy of sixteen or so in a grey robe too big for him, who threw down his sickle at the first blow and has been hiding behind a water barrel ever since. He comes out with his hands up, shaking.
{ companion_alive("fen"):
    "Tobin Reed," Fen says. "You were supposed to be mending boots in Ashby." #speaker:fen
    "You were supposed to be dead," Tobin says. #speaker:tobin
}
{ has_flag("knows_dark_of_moon"):
    He tells you everything he knows, which is mostly what you know already: three nights, the dark of the moon, the crown vault. And one thing more. The Cantor himself sleeps in the barrow now, down where the singing never stops.
- else:
    He tells you everything he knows, all in a rush, as if he's been waiting a long time for somebody to ask.
    -> tobin_tells ->
}
-> tobin_fate

// What Tobin knows, if the party didn't hear it by the fire.
= tobin_tells
"Three nights," he says. "At the dark of the moon the Cantor opens the crown vault. Sister Rhosyn says the first of the oaths comes home to the Sleeping King, and then he'll wake." #speaker:tobin
"There's a miller inside, a big floury man called Garrick. They make him work the sluice wheels, to drain the lower vault. He's alive. He hums while he works. I don't think he knows he does it." #speaker:tobin
-> learn_plan ->
->->

= tobin_fate
"What happens to me now?" Tobin asks. #speaker:tobin
* [Let him go home to Ashby]
    ~ set_flag("tobin_freed")
    ~ approve("fen", 1)
    ~ approve("odda", 1)
    You tell him to go home, mend boots, and tell his mother he's done with singing. He runs before you can change your mind.
    { companion_alive("odda"):
        "That," says Odda, "was well done." #speaker:odda
    }
* [Send him down to Captain Varrow, to answer for the Choir #drive:justice]
    ~ drive_moment("justice")
    ~ set_flag("tobin_to_varrow")
    ~ approve("fen", -1)
    You tie his hands and set him on the road south, with a note for Captain Varrow pinned to his robe. He goes, because there's nowhere else to go.
    { companion_alive("fen"):
        "Varrow hangs people," Fen says quietly. "You know that." #speaker:fen
    }
* [Leave him tied by the fire for the Choir to find]
    ~ set_flag("tobin_left")
    ~ approve("odda", -1)
    ~ approve("fen", -1)
    You tie him to a tent-pole by the dying fire, and leave him there. The Choir won't be kind to a boy who talked, and everyone knows it.
- -> road_back

// ---- Fate's Mercy: thrown into an opened barrow, to be sung up later ----

= camp_mercy
~ lose_coins()
~ long_rest()
~ set_flag("cairnfield_fates_mercy")
~ set_flag("rhosyn_lives")
~ set_flag("vesk_warned")
~ add_deed("Was beaten by the Ashen Choir at Cairnfield, thrown into an opened barrow, and climbed out again.")
You come to in the dark, on your back, on a bed of old bones. Above you is a square of grey dawn sky: the mouth of an opened barrow. The Choir threw you in with the dead, to be sung up later with the rest, and took your purse before they did. #time:Dawn
{
    - companion_alive("odda") && companion_alive("fen"):
        Odda and Fen lie beside you, battered, but breathing.
    - companion_alive("odda"):
        Odda lies beside you, battered, but breathing.
    - companion_alive("fen"):
        Fen lies beside you, battered, but breathing.
}
A rope comes snaking down out of the light, and a frightened face looks over the edge: a boy in a grey robe too big for him. "Quick," he whispers. "Before they come back to sing." #speaker:tobin
You climb. At the top the boy sits down in the heather as if his legs have given out. His name is Tobin Reed, and he's decided, he says, that he doesn't want to be in the Choir any more.
{ companion_alive("fen"):
    "Tobin Reed," Fen says, hauling himself over the edge. "You were supposed to be mending boots in Ashby." #speaker:fen
}
{ not has_flag("knows_dark_of_moon"):
    -> tobin_tells ->
}
-> the_fallen ->
-> tobin_fate

// ---- The aim, now ----

// The Old Ford held: back to Bramblegate to rally help (ch2-temple.ink). It fell: the party has
// been to Bramblegate already, and the eve of the barrow comes next.
= road_back
{ has_flag("ford_fell"):
    ~ set_objective("Make camp near Cairnfield, and go down into the Kings' Barrow before the dark of the moon. (The rest of Chapter 2 is still being written.)")
    -> END
}
-> ch2_homeward
