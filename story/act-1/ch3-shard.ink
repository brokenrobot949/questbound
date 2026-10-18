// Chapter 3 · The Kings' Barrow, beat 6: the first shard, and the way out (docs/STORY.md).
//
// Rob's choices, Oct 17, 2026:
//   The shard: as Cantor Vesk dies, he sings the hymn's last note, the sliver of gold on Dame
//     Aveline's breast breaks free, and it flies to the hero's hand: the Shard of Names, a quest
//     item in the pack (shard_names). It says the hero's whole name, the way their Bond says it,
//     and shows them a girl in a burning chamber and a crown breaking. The barrow shudders.
//   Its first use: hold it over the dead Cantor and ask him what the Sleeping King is
//     (asked_the_dead_cantor). Each use of a shard's power is a flag the Whisper will count.
//   The way out: the barrow shudders again, and the party climbs out the way it came, carrying
//     anyone who fell. One check, Athletics or Acrobatics (DC 12); a Dwarf feels where the stone
//     will hold. A failure is 2d6 bludgeoning from a falling stone, and it always gets you out;
//     three failed death saves are Fate's Mercy (escape_fates_mercy: carried out, robbed by the
//     hill).
//   At the gate, at dawn: Garrick, waiting, and whoever held the cairns, and his question, "Is
//     it done?", which beat 7 (ch3-homecoming.ink) answers on the way home.
//   Companions who fell in the barrow, and a wounded Rival, are carried out, home to
//     Bramblegate's temple. The great candle, if it isn't spent, is for beat 7.

=== ch3_shard ===
~ set_objective("See what Cantor Vesk was reaching for.")
* [Kneel beside him, and hear him out]
    -> kneel
* [Get to the gold before he does]
    -> to_the_gold
* [Stand back, and see what he does]
    -> stand_back

= kneel
{ companion_alive("odda"):
    ~ approve("odda", 1)
}
You kneel in the ash beside him. Up close he's only an old man in a filthy robe, with grave-dirt still under his nails.
"Forty years I dug graves," he whispers. "Put them all in the ground, and never once heard one of them say thank you." Something like a smile. "Then she showed me how to get them up again." #speaker:vesk
{ companion_alive("odda"):
    Odda kneels at his other side and murmurs the words her order says over the dying, whoever they are. If he hears her, he doesn't show it.
}
-> last_note

= to_the_gold
You step past him to the tomb, and reach for the gold.
-> last_note

= stand_back
You stand back and let him crawl. It takes him a long time to cross a yard of ash.
-> last_note

// Vesk's last note breaks the shard's seal, and it flies to the hero.
= last_note
Vesk stops reaching. He draws one long breath, and with the last of it he sings: one cracked note, the last of the hymn, the one he never got to.
{ has_flag("aveline_rested"):
    Under Dame Aveline's folded hands, something answers it, high and thin, like a bell struck under water.
- else:
    On Dame Aveline's breastplate, something answers it, high and thin, like a bell struck under water.
}
{ to_the_gold:
    The sliver of gold leaps the last inch into your hand by itself, and your fingers close on it before you can think.
- else:
    The sliver of gold tears itself free and comes flying across the ash: not to the Cantor, but to you. It smacks into your palm like a thrown coin, and your fingers close on it before you can think.
}
Cantor Vesk watches it go. "Oh," he says softly, as if somebody has told him a joke he doesn't understand. Then he's gone. #speaker:vesk
-> the_name

// The shard says the hero's name.
= the_name
It's warm as a living thing, and it hums against your palm. Then, without a sound, it speaks.
{
    - has_bond("sibling"):
        It says your name: {hero_name()}, all of it, the way {bond_name()} used to say it when you were small and in trouble.
    - has_bond("mentor"):
        It says your name: {hero_name()}, all of it, the way {bond_name()} said it at the end of every lesson you got wrong.
    - has_bond("rival"):
        It says your name: {hero_name()}, all of it, the way {bond_name()} says it, as if it's a joke only they get.
    - has_bond("debt"):
        It says your name: {hero_name()}, all of it, the way it's written in {bond_name()}'s ledger, at the head of everything you owe.
    - else:
        It says your name: {hero_name()}, all of it, the way nobody has said it since you left home.
}
{ has_bond("rival") && has_flag("rival_freed"):
    { has_flag("rival_wounded"):
        For a heartbeat you'd swear it was your rival. But {bond_name()} is lying in the ash, and hasn't said a word.
    - else:
        For a heartbeat you'd swear it was your rival. But {bond_name()} is across the hall, wiping their blade, and hasn't said a word.
    }
}
+ [Open your hand, and look at it]
    -> the_vision

// The night the crown broke, and the barrow shudders.
= the_vision
You open your hand. Then the ash is gone, and you're somewhere else.
A high chamber, hung with banners and full of candles. A man lies dying in a great bed with a crown half off his head, and another man, in a chain of office, is bent over him with both hands on it. In the doorway stands a girl of twelve or so in her nightgown, her mouth open in a scream you can't hear.
The crown breaks. There's no sound, only light: seven sparks fly out of it and through the walls as if the walls weren't there, and the bed-curtains go up in flame. The girl doesn't run from the fire. She stands quite still with her head on one side, listening to something. Then she looks straight at you.
You're on your knees in the ash, with the shard in your fist. Then the whole barrow shudders: a long, slow heave, deep down under everything, as if something very far away has turned over in its sleep. Ash sifts from the roof, and the pillars groan. Then it's still.
~ set_flag("shard_names")
{ not has_shard("names"):
    ~ give_item("shard-of-names")
}
~ add_deed("Caught a sliver of gold that flew from Dame Aveline's breast as Cantor Vesk died. It knows your name.")
{ companion_alive("odda"):
    Odda is staring at your fist. "That isn't Choir work," she says. "That's older than them. Older than anything in this hill but her." #speaker:odda
}
{ companion_alive("fen"):
    "Why'd it go to you?" Fen says, as if it's done it to annoy him personally. #speaker:fen
}
{ has_flag("rival_freed") && not has_flag("rival_wounded"):
    {bond_name()} looks at your hand, then at your face. "Of course," your rival says. "Of course it went to you." #speaker:rival
}
-> with_the_shard

= with_the_shard
* [Lay it back on Dame Aveline's breast]
    -> lay_it_back
* {has_shard("names")} [Hold the shard over the dead Cantor, and make him answer #shard:names]
    -> ask_vesk
+ [Get everyone out of here]
    -> the_way_out

// It won't stay.
= lay_it_back
~ set_flag("tried_to_return_the_shard")
{ companion_alive("odda"):
    ~ approve("odda", 1)
}
{ has_flag("aveline_rested"):
    You lay the sliver of gold back under Dame Aveline's folded hands, where it was.
- else:
    You lay the sliver of gold back on Dame Aveline's breastplate, where it was.
}
The moment your fingers leave it, it's back in your palm, warm, as if it had never gone. You try again, and it's the same.
{ companion_alive("odda"):
    "Well," Odda says heavily. "You tried. That's more than most would." She doesn't look happy about it. "It's chosen, then. The Flame help us." #speaker:odda
- else:
    It isn't going to stay. Whatever it is, it has chosen.
}
-> with_the_shard

// The shard's first use: speaking with the dead.
= ask_vesk
~ set_flag("asked_the_dead_cantor")
~ add_deed("Held the Shard of Names over dead Cantor Vesk, and made him answer.")
You hold the shard over the dead man and say his name.
The shard goes cold as a stone in a stream. The Cantor's eyes stay shut, but his mouth opens, and a voice comes out of it like wind through a keyhole. "Who calls?" #speaker:vesk
{ companion_alive("odda"):
    Odda takes a step back, and her hand closes on her holy symbol.
}
-> vesk_answers

= vesk_answers
* (sleeping_king) [Ask him what the Sleeping King is]
    "The king who was," says the dead man. "He went to sleep with the crown on his head, and it broke, and he can't wake until it's whole again. She hears him. Every night, she hears him." #speaker:vesk
    -> vesk_answers
* {sleeping_king} [Ask him who "she" is]
    "The Precentor. She was there when he went to sleep. She saw the crown break. She remembers his voice." #speaker:vesk
    -> vesk_answers
* [Ask him what the Choir was digging for]
    "The pieces. Seven of them, flown to where the oaths were sworn. The old dead remember where. So we sang them up, and they dug." #speaker:vesk
    -> vesk_answers
* [Let him rest]
    -> vesk_rests

= vesk_rests
The shard warms in your hand again, and the Cantor's mouth closes. He's only a dead man in a filthy robe.
{ vesk_answers.sleeping_king:
    ~ quest_note("missing-miller", "Dead Cantor Vesk said the Sleeping King is the king who was: he went to sleep with the crown on his head, and it broke. The Precentor, who leads the Choir, was there, and hears him every night.")
}
{ companion_alive("fen"):
    "Useful," Fen says, a little too brightly. "Horrible. But useful." #speaker:fen
}
{ companion_alive("odda"):
    "Don't make a habit of that," Odda says. #speaker:odda
}
-> with_the_shard

// ---- The way out ----

= the_way_out
~ set_objective("Get out of the Kings' Barrow.")
You're turning for the {has_flag("vault_flooded"):drain|stair} when the barrow shudders again, harder, and this time it doesn't stop. A pillar splits from top to bottom with a crack like a felled oak. Ash pours from the roof like grey snow, and somewhere deep in the hill, stone grinds on stone.
{ companion_alive("odda"):
    "Out," Odda says. "Now." #speaker:odda
}
-> carrying ->
{ has_flag("vault_flooded"):
    -> drain_out
- else:
    -> stair_out
}

// Nobody who fell in the chantry is left in the ash.
= carrying
{
    - has_flag("odda_fell_in_the_chantry") && has_flag("fen_fell_in_the_chantry"):
        You won't leave either of them in the ash. You get Odda across your shoulders, all iron and stubbornness, and Fen under your arm. He weighs next to nothing, which is somehow the worst of it.
    - has_flag("odda_fell_in_the_chantry") && companion_alive("fen"):
        Odda is heavier than she looks, all iron and stubbornness, and it takes you and Fen together to lift her.
    - has_flag("odda_fell_in_the_chantry"):
        Odda is heavier than she looks, all iron and stubbornness. You get her across your shoulders anyway.
    - has_flag("fen_fell_in_the_chantry"):
        You lift Fen out of the ash. He weighs next to nothing, which is somehow the worst of it.
}
{ has_flag("rival_wounded"):
    {bond_name()} comes round as you haul them up, swears at you weakly, and leans on your shoulder.
}
->->

// The fast way, back up the stair from the drained vault.
= stair_out
The stair up out of the chantry is running with silt and loose stones, with more coming down it every moment.
* [Haul everyone up the stair before it goes #check:athletics:12]
    { check("athletics", 12):
        You go up it like a mule up a mountain, hauling and shoving whoever needs it, and you're all out on the floor of the dry vault when the stair behind you fills with stone.
        -> climb
    - else:
        -> struck
    }
* [Dodge up the stair between the falling stones #check:acrobatics:12]
    { check("acrobatics", 12):
        You go up it like a goat, weaving between the stones as they bounce down past you, and you're all out on the floor of the dry vault when the stair behind you fills with stone.
        -> climb
    - else:
        -> struck
    }
* {has_species("dwarf")} [Feel where the stone will hold, and go up there]
    -> dwarf_way

// The long way round, back through the builders' old drain.
= drain_out
The builders' old drain is the only way out, and the roof fall you passed coming in is coming down for good now: stones sliding, and the gap at the top closing as you watch.
* [Heave the stones aside, and hold up the roof while everyone crawls through #check:athletics:12]
    { check("athletics", 12):
        You get your back under the worst of it and hold it, shaking, while everyone crawls past, and you're through yourself a breath before the roof comes down for good.
        -> climb
    - else:
        -> struck
    }
* [Squeeze through ahead of the fall, and drag the others after you #check:acrobatics:12]
    { check("acrobatics", 12):
        You go through the gap like an eel and drag the others after you, packs and all, and you're through a breath before the roof comes down for good.
        -> climb
    - else:
        -> struck
    }
* {has_species("dwarf")} [Feel where the stone will hold, and go through there]
    -> dwarf_way

// A Dwarf hero: no roll.
= dwarf_way
You can feel it through your boots: which stones are going and which will hold, the way your people have listened to stone since before there were kings. You go where it's sound, and the falls come down beside you, never on you.
-> climb

// A failed check: struck by a falling stone, which always gets you out.
= struck
A stone the size of a bread oven comes bouncing down and catches you full in the back.
~ temp hurt = take_damage("2d6", "bludgeoning")
{ hurt == "dead":
    -> escape_mercy
}
{ hurt == "woke":
    You come round with your face in the grit and no idea how long you've lain there. Long enough for the worst of it to stop: you dig yourself out, and get everyone out after you.
- else:
    You get up anyway, because there's no other way to go, and get everyone out after you.
}
-> climb

// Fate's Mercy: crushed on the way out, and three failed death saves.
= escape_mercy
~ lose_coins()
~ long_rest()
~ set_flag("escape_fates_mercy")
~ add_deed("Was struck down by falling stone, climbing out of the Kings' Barrow, and carried out.")
{
    - companion_alive("odda") || companion_alive("fen"):
        You come to in the heather at the edge of the forecourt, under the open sky. Somebody carried you up out of the barrow, every step of the way, and they look as if they'd like a word about it. #room:kings-barrow/forecourt #location:The Kings' Barrow, the great gate
    - has_flag("rival_freed") && not has_flag("rival_wounded"):
        You come to in the heather at the edge of the forecourt, under the open sky. {bond_name()} is sitting beside you. "I carried you," your rival says. "All the way up. I'll be mentioning it for the rest of your life." #speaker:rival #room:kings-barrow/forecourt #location:The Kings' Barrow, the great gate
    - else:
        You come to in the heather at the edge of the forecourt, under the open sky. Garrick Dunn is sitting beside you, filthy to the eyebrows. "Hill shook," he says. "So I came down to look. Found you under half a stair, and the rest of them behind you." #speaker:garrick #room:kings-barrow/forecourt #location:The Kings' Barrow, the great gate
}
Somewhere under the hill your purse came loose, and it lies there now with the Choir's dead.
-> at_the_gate

// Up through the barrow, the way you came down.
= climb
{ has_flag("vault_flooded"):
    You come out of the drain onto the landing above the flooded vault. The black water heaves in the dark below you, slapping at the walls with every shudder. #room:deep-barrow/vault #location:The Kings' Barrow, the flooded vault
- else:
    The vault is silt and puddles now, and the great wheel stands still. You cross it to the landing, with the hill groaning around you. #room:deep-barrow/vault #location:The Kings' Barrow, the flooded vault
}
{ has_flag("odda_fell_in_the_vault") || has_flag("fen_fell_in_the_vault"):
    On the landing you stop for the fallen you left there under a cloak, and take them with you. Nobody is staying in this hill.
}
Then it's the long stair up, until the open oath-wall lets you out among the champions. #room:kings-barrow/hall #location:The Kings' Barrow, the Hall of Champions
{ has_flag("looted_the_champions"):
    The Hall of Champions is shaking like the rest of the hill. Dust comes down from the roof in sheets onto the five robbed tombs, and you don't look at them as you go by.
- else:
    Here, the shaking stops. The five tombs glow faintly under the dust, every carved champion with their hands folded on their sword, and the hall stands as steady as the day it was built. The oaths are still holding.
    { companion_alive("odda"):
        "Thank you," Odda says to the tombs as she passes, and means it. #speaker:odda
    }
}
+ [Go on up, through the crowned passage, and out]
    -> into_the_air

= into_the_air
You go through the crowned passage without needing to look where the plates are, and climb the last stair into the open air. #room:kings-barrow/forecourt #location:The Kings' Barrow, the great gate
-> at_the_gate

// The great gate, at dawn.
= at_the_gate
The sky over the moor has gone the colour of pewter, and the hymn under the hill is silent at last. It's dawn. #time:Dawn
{ has_flag("gate_guardians_destroyed"):
    The old guardians lie in pieces on the forecourt where they fell.
- else:
    The two old guardians stand on their plinths either side of the open gate, as still as they were before you came.
}
{ escape_mercy:
    Garrick Dunn looks at you, and at the barrow, and back at you. "Is it done?" #speaker:garrick
- else:
    Garrick Dunn is sitting at the edge of the forecourt with his chin on his fists, exactly where he said he'd wait. He gets up when he sees you, slowly, like a man who has been sitting on cold stone all night. "Is it done?" #speaker:garrick
}
{ has_flag("varrow_rallied"):
    Up on the cairns, Varrow's watch are putting out their torches. One of them waves a spear at you: nothing that came in off the moor last night is still walking.
}
{ has_flag("nettle_rallied"):
    From the far side of the barrow comes a ragged goblin cheer, and a great deal of pot-banging, which may or may not be for you.
}
// Varrow's watch carried home anyone who fell at the gate, if they held the cairns.
~ temp left_at_the_gate = (has_flag("odda_fell_at_the_gate") || has_flag("fen_fell_at_the_gate")) && not has_flag("varrow_rallied")
{ left_at_the_gate:
    At the edge of the forecourt, the cloak lies where you left it, over the one who fell here.
}
{ left_at_the_gate || has_flag("odda_fell_in_the_vault") || has_flag("odda_fell_in_the_chantry") || has_flag("fen_fell_in_the_vault") || has_flag("fen_fell_in_the_chantry"):
    You'll carry the fallen home to Bramblegate's temple, to lie before the altar flame.
}
{ has_flag("rival_freed"):
    { has_flag("rival_wounded"):
        {bond_name()} sits down hard on the paving, grey in the face. "I'm fine," your rival says. They are not fine. They need a bed and a surgeon, and the temple has both. #speaker:rival
    - else:
        {bond_name()} stretches until their back cracks. "Breakfast," your rival says. "Then I'm going to sleep for a week." #speaker:rival
    }
}
In your pocket, the shard is warm as a hand, and quiet. For now.
~ quest_note("missing-miller", "Garrick Dunn is free, and out of the Kings' Barrow. Take him home to Lark.")
// Beat 7, Bramblegate's thanks (ch3-homecoming.ink), begins with the answer to Garrick.
-> ch3_homecoming
