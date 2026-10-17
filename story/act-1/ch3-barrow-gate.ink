// Chapter 3 · The Kings' Barrow, beats 1 and 2: under the dark moon, and the barrow gate
// (docs/STORY.md).
//
// The day after the eve of the barrow (ch2-eve.ink), the party waits out the day in the
// sheepfold and goes down to the Kings' Barrow at nightfall, under the dark of the moon.
//
// Beat 1, the allies turn up (Rob's choices, Oct 12, 2026):
//   Captain Varrow's watch (varrow_rallied) takes the outer cairns, the ring of opened barrows
//     round the bowl, and holds back the last of the dead coming in off the moor. Without the
//     watch, two Zombies come up behind the party on round 3 of the fight at the gate (the
//     barrow-gate encounter's reinforcements).
//   Mother Nettle's goblins (nettle_rallied) make a din at the Choir's low door, on the far side
//     of the barrow. If Vesk was warned (vesk_warned), he has a lookout on the barrow's crown,
//     who wakes the gate's guardians when the party comes, unless the goblins draw him off.
//     Unseen, the party reaches the gate with the guardians asleep (gate_unseen); seen, they're
//     awake and waiting (gate_guardians_woken).
//   The ward-word (knows_ward_word) is for the gate.
//   A Rival (rival_taken) is still the Choir's prisoner, chained at the sluice wheel beside
//     Garrick in the flooded vault (beat 4).
//
// Beat 2, the great gate (kings-barrow/forecourt): two suits of animated armour, the first
// queen's guardians, stand either side of the sealing stone. They wake for anyone who tries to
// force the stone, or speaks to them. Ways past:
//   Speak the ward-word, Ysolde: they kneel.
//   Religion 13 (10 with Odda prompting the old forms of her order) or History 13: they kneel.
//     A failure is the fight, without surprise.
//   A Dwarf hero sees the sealing stone is dwarf-cut, and pivots: opened the way its makers
//     meant, it was never forced, and the guardians never wake. (Only while they sleep.)
//   Strike before they wake (a surprise attack, while they sleep), or fight them awake.
// Getting past them without a fight earns the fight's 400 XP. Once they kneel, they open the
// stone; once they fall, it opens by itself.
// Losing is Fate's Mercy: the guardians lay the party out at the edge of the forecourt (they keep
// the door; they don't kill), and somebody goes through your pockets. When you come back, they
// kneel: whatever test the first queen set at her door, getting up again seems to count.
// Through the open gate, beat 3: the Hall of Champions (ch3-hall.ink).

=== ch3_dark_moon ===
~ set_objective("Go down into the Kings' Barrow tonight, under the dark of the moon.")
* [Wait out the day, and go down to the barrow at nightfall]
    -> nightfall

= nightfall
{
    - companion_alive("odda") && companion_alive("fen"):
        It's the longest day you can remember. Odda goes over everyone's buckles and straps twice, whether they like it or not, and Fen sleeps through the whole of it in the lee of the wall, the way only cats and thieves can. #location:A sheepfold on the high moor #time:Midday
    - companion_alive("odda"):
        It's the longest day you can remember. Odda goes over every buckle and strap you own twice, whether you like it or not, humming hymns under her breath. #location:A sheepfold on the high moor #time:Midday
    - companion_alive("fen"):
        It's the longest day you can remember. Fen sleeps through the whole of it in the lee of the wall, the way only cats and thieves can, and you envy him every minute. #location:A sheepfold on the high moor #time:Midday
    - else:
        It's the longest day you can remember, and you spend it alone, listening to the wind and the singing under the hill. #location:A sheepfold on the high moor #time:Midday
}
The sun goes down red over the moor, and no moon comes up after it. When it's full dark, you go up onto the ridge and look down on Cairnfield. #location:Cairnfield #time:Night
{ has_flag("cairnfield_won"):
    Below you the Choir's camp is ashes and trampled canvas. But the singing under the hill hasn't stopped all day, and up here, in the dark, you can hear it plainly.
- else:
    Below you the Choir's fire is out and its grey tents stand empty. Every singer they have has gone inside the hill tonight, and up here, in the dark, you can hear them plainly.
}
{ has_flag("varrow_rallied"):
    -> the_watch ->
- else:
    Out on the moor behind you, something is still moving: the last of the dead, slow stragglers with the last of the stones, coming in from every side. Nobody holds the cairns tonight. Whatever comes in off the moor will come in behind you.
}
{ has_flag("knows_miller_at_sluices"):
    Black water still runs from the sluice in the barrow's flank. Garrick is alive in there, turning his wheels.
}
{ has_flag("rival_taken"):
    Somewhere behind the Choir's low door, in the barrow's flank, is {bond_name()}, in Choir chains.
}
-> the_gate_it_is

// Captain Varrow's watch takes the outer cairns.
= the_watch
Torches move along the rim of the bowl, from cairn to cairn: Captain Varrow's watch, taking the ring of opened barrows. By full dark there's a spear at every cairn. Out on the moor the last stragglers of the dead come in with their stones, find the spears waiting, and go no farther.
->->

// The great gate, not the Choir's low door.
= the_gate_it_is
{ companion_alive("fen"):
    "The low door's theirs," Fen murmurs. "They'll be thick as fleas behind it. I'd sooner knock at the front." #speaker:fen
}
{ companion_alive("odda"):
    { has_flag("knows_ward_word"):
        "The great gate, then," Odda says. "The Choir never got it open. And it's the door the ward-word was made for." #speaker:odda
    - else:
        "The great gate, then," Odda says. "The Choir never got it open. Let's see if we can do better." #speaker:odda
    }
}
{ not companion_alive("odda") && not companion_alive("fen"):
    The low door in the barrow's flank is the Choir's way in, and they'll be thick behind it. The great gate is shut, and has been for longer than anyone remembers. That's your door.
}
{ has_flag("vesk_warned"):
    High on the barrow's crown, against the stars, a lantern burns. Someone up there is watching the bowl. Cantor Vesk knew you were coming.
}
{ has_flag("nettle_rallied"):
    -> the_din ->
}
* [Go down into the bowl, to the great gate]
    -> ch3_gate

// Mother Nettle's goblins arrive at the Choir's low door.
= the_din
Then, from the far side of the Kings' Barrow, comes the most dreadful noise you have ever heard: drums, pot lids, horns, and a great many goblins shrieking at the tops of their voices. Mother Nettle has come to the Choir's low door. Noise is goblins' best thing.
{ has_flag("vesk_warned"):
    Up on the barrow's crown the lantern swings round, hesitates, and goes bobbing away over the top towards the din.
}
{ companion_alive("fen"):
    "Oh, I like her," Fen says. #speaker:fen
}
->->

// ---- Beat 2: the great gate ----

=== ch3_gate ===
{ has_flag("vesk_warned") && not has_flag("nettle_rallied"):
    ~ set_flag("gate_guardians_woken")
- else:
    ~ set_flag("gate_unseen")
}
// Who goes into a fight on their feet, so afterwards the scene knows who fell here.
{ companion_alive("odda"):
    ~ set_flag("odda_at_the_gate")
}
{ companion_alive("fen"):
    ~ set_flag("fen_at_the_gate")
}
{ has_flag("gate_guardians_woken"):
    There's no crossing the bowl unseen with that lantern up there. Halfway across, it stops moving. Somebody on the barrow's crown gives a shout and runs, and a moment later, down at the great gate ahead of you, a hammer rings on stone: once, twice, three times, like a great cracked bell.
- else:
    You go down off the ridge and across the bowl in the dark, between the opened barrows{has_flag("nettle_rallied"):, while the goblins hold every eye in the Choir}, and nobody sees you go.
}
The great gate of the Kings' Barrow is a slab of grey stone taller than two men, set into the barrow's face under a lintel carved with crowns. Before it lies a forecourt of old paving, strewn with bones: the dead the Choir sent against this gate, smashed to pieces and left where they fell. #room:kings-barrow/forecourt #location:The Kings' Barrow, the great gate
On either side of the stone, on a low plinth, stands a suit of old plate armour, green with age, with a sword in its fist and a battered shield on its arm. There's nothing behind either visor but dark.
{ has_flag("gate_guardians_woken"):
    -> awake
- else:
    -> asleep
}

= asleep
Neither of them stirs. The Choir's dead lie thickest at the foot of the stone, and its face is scored and chipped where they tried to lever it open. Whatever happened to them happened when they laid hands on it.
{ companion_alive("odda"):
    "The first queen's guardians," Odda breathes. "Made to keep her door. Mind how you go." #speaker:odda
- else:
    { companion_alive("fen"):
        Fen looks at the bones, and then at the guardians. "Remind me to be polite," he whispers. #speaker:fen
    }
}
-> ways

= awake
They're awake. As you come up into the forecourt, both empty helms turn towards you with a grinding of old iron. The guardians step down off their plinths together, lift their swords, and stand between you and the stone.
Up on the barrow's crown somebody laughs, and the lantern goes bobbing away over the top towards the low door.
{ companion_alive("odda"):
    { has_flag("knows_ward_word"):
        "Steady," Odda says. "They're the first queen's. They'll know her name, if nothing else." #speaker:odda
    - else:
        "Steady," Odda says. "They're the first queen's, made to keep her door. Speak to them before you swing at them." #speaker:odda
    }
}
-> ways

// The ways past the guardians. A failed word is the fight, without surprise.
= ways
* {has_flag("knows_ward_word")} [Speak the ward-word: "Ysolde"]
    -> speak_up ->
    -> ward_word
* {companion_alive("odda")} [Greet them in the old forms of the faith, with Odda prompting you #check:religion:10 #drive:faith]
    ~ drive_moment("faith")
    -> speak_up ->
    { check("religion", 10):
        -> old_forms
    - else:
        -> no_kneel
    }
* {not companion_alive("odda")} [Greet them in the old forms of the faith #check:religion:13 #drive:faith]
    ~ drive_moment("faith")
    -> speak_up ->
    { check("religion", 13):
        -> old_forms
    - else:
        -> no_kneel
    }
* [Give them the old court's words of passage #check:history:13 #drive:knowledge]
    ~ drive_moment("knowledge")
    -> speak_up ->
    { check("history", 13):
        -> words_of_passage
    - else:
        -> no_kneel
    }
* {has_species("dwarf") && not has_flag("gate_guardians_woken")} [Look at how the sealing stone is cut]
    -> pivot
* {not has_flag("gate_guardians_woken")} [Strike before they wake #combat:barrow-gate #surprise]
    -> fought
* {has_flag("gate_guardians_woken")} [Fight them #combat:barrow-gate]
    -> fought

// Speaking to them wakes them, if they weren't awake already.
= speak_up
{ has_flag("gate_guardians_woken"):
    You stand your ground in front of them, and speak.
- else:
    You step up to the stone, between the two guardians. At once both helms come up with a grinding of old iron and turn towards you, and the swords lift.
}
->->

= ward_word
~ set_flag("gate_ward_word")
"Ysolde," you say, as if you mean it.
The name goes out across the forecourt and keeps on going, down into the stone under your feet.
-> kneel

= old_forms
~ set_flag("gate_old_forms")
{ companion_alive("odda"):
    Odda murmurs the old forms of her order half a breath ahead of you, and you say each line after her: the blessing on the threshold, the names of the watchers, and the promise that whoever passes comes in peace, to the honoured dead.
- else:
    You give them the old forms of the faith, as they're said at a temple door: the blessing on the threshold, the names of the watchers, and the promise that whoever passes comes in peace, to the honoured dead.
}
-> kneel

= words_of_passage
~ set_flag("gate_words_of_passage")
You give them the words of passage the old court spoke at a royal tomb, from the oldest histories you know: who you are, whose peace you keep, and that you come to the dead with open hands.
-> kneel

= no_kneel
The words come out wrong, or in the wrong order, or they simply aren't old enough. The guardians don't kneel. Their swords come up, and they come for you.
* [Fight #combat:barrow-gate]
    -> fought

// They kneel, and open the stone: the fight's full XP.
= kneel
~ set_flag("gate_guardians_knelt")
~ give_xp(400)
~ add_deed("Spoke to the first queen's guardians at the great gate of the Kings' Barrow, and they knelt.")
The guardians go still. Then, slowly, with a sound like a smithy falling downstairs, they go down on one knee before you and bow their empty helms.
{ has_flag("gate_ward_word") && companion_alive("odda"):
    "You said it like you meant it," Odda breathes. "Good." #speaker:odda
}
-> guardians_open

= guardians_open
They rise together, turn, and set their gauntlets to the sealing stone. It swings round on a hidden pivot, slow and silent, and the guardians step back onto their plinths and are still.
-> into_the_dark

// A Dwarf hero: the stone is dwarf work, and opened the way its makers meant, it was never
// forced. The guardians never wake.
= pivot
~ set_flag("gate_pivoted")
~ give_xp(400)
~ add_deed("Opened the great gate of the Kings' Barrow the way its dwarf masons meant, and never woke its guardians.")
Then you see it, the way you'd see a crooked picture on a wall. The joints are too fine and the edges too true: this sealing stone is dwarf-cut. It pivots.
The Choir's dead never knew it. They tried to force the stone, so the guardians woke. Open it the way its makers meant, and there's nothing to wake them for.
You find the balance point low on the stone's edge, set your shoulder to it, and push. Slow and silent, the great stone swings round on its hidden pin. On their plinths, the guardians never stir.
{ companion_alive("odda"):
    "Dwarf-cut," Odda breathes, running her hand down the joint as you slip past. "I should have seen that myself. My grandmother would have boxed my ears." #speaker:odda
}
-> into_the_dark

// ---- The fight ----

= fought
{ combat_won():
    -> won
- else:
    -> gate_mercy
}

= won
~ set_flag("gate_guardians_destroyed")
~ add_deed("Broke the first queen's guardians at the great gate of the Kings' Barrow.")
The last guardian goes down with a crash like a dropped armoury, and its pieces lie still among the bones of the Choir's dead.
{ companion_alive("odda"):
    "I'd sooner they'd knelt," Odda says, leaning on her mace. "They were only doing what they were made for." #speaker:odda
}
-> the_fallen ->
With its guardians fallen, the sealing stone shudders in its frame. Then it swings slowly round on a hidden pivot, without a sound, as if it had only ever been waiting for leave.
-> into_the_dark

// Anyone in the party who fell in the fight is carried out, to go home to the temple.
= the_fallen
{ has_flag("odda_at_the_gate") && not companion_alive("odda"):
    Odda didn't get up from the fight. She lies among the Choir's broken dead with her mace still in her fist, and her face looks no less stern for being still.
    ~ set_flag("odda_fell_at_the_gate")
}
{ has_flag("fen_at_the_gate") && not companion_alive("fen"):
    Fen lies small and still on the old paving, his knife still in his hand.
    ~ set_flag("fen_fell_at_the_gate")
}
{ has_flag("odda_fell_at_the_gate") || has_flag("fen_fell_at_the_gate"):
    { has_flag("varrow_rallied"):
        Two of Varrow's watch come down from the cairns with a hurdle, to carry the fallen back to the road, and home to Bramblegate's temple to lie before the altar flame.
    - else:
        You lay the fallen at the edge of the forecourt, under a cloak. When this is done, you'll carry them home to Bramblegate's temple, to lie before the altar flame.
    }
}
->->

// ---- Fate's Mercy: laid out at the edge of the forecourt ----

= gate_mercy
~ lose_coins()
~ long_rest()
~ set_flag("gate_fates_mercy")
~ add_deed("Was beaten by the first queen's guardians at the great gate of the Kings' Barrow, and got up again.")
You come to on your back in the heather at the edge of the forecourt, with the stars wheeling overhead and no moon among them. The guardians laid you here. They keep the door, it seems, and don't trouble to kill.
{
    - companion_alive("odda") && companion_alive("fen"):
        Odda and Fen lie beside you, battered, but breathing.
    - companion_alive("odda"):
        Odda lies beside you, battered, but breathing.
    - companion_alive("fen"):
        Fen lies beside you, battered, but breathing.
}
Somebody has been through your pockets while you lay here, and your purse is gone.{has_flag("nettle_rallied"): Somewhere out in the dark a goblin giggles, and coins jingle, going away.}
The night has worn on. But it's still dark, and the singing under the hill hasn't stopped, so whatever Vesk means to do tonight, he hasn't done it yet.
-> the_fallen ->
When you can stand, you go back into the forecourt. The guardians stand on their plinths again as if nothing had happened, though their plate is dented now, and one of them has lost its shield.
As you come between them, both empty helms turn towards you. Then, slowly, with a sound like a smithy falling downstairs, they go down on one knee. Whatever test the first queen set at her door, it seems getting up again counts.
~ set_flag("gate_guardians_knelt")
-> guardians_open

// ---- Through the gate ----

= into_the_dark
~ set_flag("gate_opened")
~ quest_note("missing-miller", "The great gate of the Kings' Barrow stands open. Garrick is somewhere below, at the sluices.")
Beyond the stone a stair goes down into the dark, and the singing comes up it to meet you, slow and deep.
{ companion_alive("fen"):
    Fen peers down the stair. "After you," he says. "No, really. I insist." #speaker:fen
}
{ companion_alive("odda"):
    Odda touches the carved crowns on the lintel as she passes under them, the way you'd touch a shrine.
}
-> ch3_hall
