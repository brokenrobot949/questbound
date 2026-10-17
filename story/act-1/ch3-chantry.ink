// Chapter 3 · The Kings' Barrow, beat 5: the Chantry of Ash (docs/STORY.md).
//
// Below the flooded vault, Cantor Vesk sings at the Choir's altar, and the hymn has woken Dame
// Aveline, the first queen's champion, out of her tomb (Rob's choices, Oct 16, 2026).
//
// The way there (from the vault's choice):
//   Drained (vault_drained): the stair in the dry channel, the fast way. The Choir follows it
//     down behind the party: the fight's reinforcements, led by Sister Rhosyn if she lives.
//     Not warned (no vault_acolyte_fled): creep down the last steps (Stealth 13) for a surprise
//     attack, or charge. Warned: Vesk is waiting.
//   Flooded (vault_flooded): the long way round, the builders' old drain. A roof fall halfway:
//     squeeze past (Acrobatics 12) or shore it up (Athletics 12); a failure is 2d6 bludgeoning
//     (Fate's Mercy if it kills: you wake on the far side, hours later). You come out of the
//     drain behind the Choir: a surprise attack, but you're late, and a third Zombie is up.
// The fight (chantry, or chantry-late): Vesk (a Cultist Fanatic), Dame Aveline (a Wight) and
//   the dead. Unless the hymn is broken, another Zombie rises on round 3. A hero who read the
//   oath-wall (read_the_oath_wall) can call her by name, in the fight: she remembers her oath
//   and turns on Vesk (foe_turned("wight")). A Rival freed at the wheel fights beside you.
// Won: Aveline at rest (aveline_rested, the fight's 700 XP for her) or destroyed
//   (aveline_destroyed); Vesk lies dying at the altar. Lost (Fate's Mercy): at the last,
//   Aveline remembers by herself and strikes Vesk down; you wake in the ash, robbed.
// The scene ends with Vesk dying, reaching for the gold on Aveline's breast; beat 6, the
// first shard, follows (ch3_shard).

=== ch3_chantry ===
~ set_objective("Go down to the Chantry of Ash, and stop Cantor Vesk's hymn.")
* {not has_flag("vault_flooded")} [Go down the stair in the drained vault #go:chantry]
    -> the_stair
* {has_flag("vault_flooded")} [Take the long way round, through the builders' old drain]
    -> the_drain

// ---- The fast way: down the stair in the drained vault ----

= the_stair
-> going_in ->
The stair goes down out of the dry channel, steep and slick with silt, and the hymn comes up it louder with every step, until it's all around you. Then the stair ends, and you're standing above the Chantry of Ash. #room:deep-barrow/chantry #location:The Kings' Barrow, the Chantry of Ash
-> chantry_seen

// ---- The long way round: the builders' old drain ----

= the_drain
The builders' old drain is a stone pipe barely wide enough for one at a time, and it goes on, and down, and round, for longer than you'd believe. Halfway along, the roof has started to come in: a slope of fallen stones, with a gap at the top you might just get through.
* [Squeeze through the gap at the top #check:acrobatics:12]
    { check("acrobatics", 12):
        You go through it like a ferret down a rabbit hole, and the others pass the packs through after you.
        -> drain_through
    - else:
        -> drain_falls
    }
* [Shift the fallen stones, and shore up the roof #check:athletics:12]
    { check("athletics", 12):
        You heave the worst of the stones aside and wedge a long one up under the roof, and it holds while everyone crawls past.
        -> drain_through
    - else:
        -> drain_falls
    }

= drain_falls
A stone shifts above you with a grinding sigh, and the roof comes down on your back.
~ temp hurt = take_damage("2d6", "bludgeoning")
{ hurt == "dead":
    -> drain_mercy
}
{ hurt == "woke":
    You come round under the stones with no idea how long you've lain there, and dig yourself out one handful at a time.
- else:
    You drag yourself out from under it, bruised and bleeding, and crawl on.
}
-> drain_through

// Fate's Mercy: crushed in the drain, and three failed death saves.
= drain_mercy
~ long_rest()
~ set_flag("drain_fates_mercy")
~ add_deed("Was buried by a roof fall in the old drain under the Kings' Barrow, and dug out again.")
{ companion_alive("odda") || companion_alive("fen"):
    You come to on the far side of the fall, flat on your back in the drain. Somebody dug you out and dragged you through, and it took them a long time: your nails are torn, and theirs are worse.
- else:
    You come to under the stones, alone, and dig yourself out a handful at a time. It takes a long time. Long enough that, by the end, you're not sure you're the same person who went in.
}
The hymn hasn't stopped. Whatever Vesk means to do tonight, he hasn't finished doing it.
-> drain_through

= drain_through
-> going_in ->
At last the drain ends at a grating high in the wall of a long, dark hall, and the hymn is right there, all around you. You've come out behind the Choir's backs, but you're late. #room:deep-barrow/chantry #location:The Kings' Barrow, the Chantry of Ash
-> chantry_seen

// Who goes into the fight on their feet, so afterwards the scene knows who fell here.
= going_in
{ companion_alive("odda"):
    ~ set_flag("odda_at_the_chantry")
}
{ companion_alive("fen"):
    ~ set_flag("fen_at_the_chantry")
}
->->

// ---- The Chantry of Ash ----

= chantry_seen
The Chantry of Ash is a long hall of pillars, and its floor is grey with ash, ankle-deep, drifted against the bones of the dead the Choir woke and wore out. At the far end, before an altar of black stone, stands Cantor Vesk: a big, stooped man in a grey robe gone black at the hem, with a gravedigger's hands, singing with his eyes shut.
{ has_flag("vault_flooded"):
    The hymn is nearly at its end. Three of the dead already stand in the ash between you and the altar, swaying in time.
- else:
    Two of the dead stand in the ash between you and the altar, swaying in time.
}
Behind the altar the lid of a great tomb lies broken on the floor. As the hymn swells, something sits up in it: a knight in old blue-and-gold armour, with nothing in her helm but dark. She stands, and draws her sword. On her breastplate, something small catches the light, like a sliver of gold.
{ has_flag("read_the_oath_wall"):
    You know her. AVELINE, FIRST OF THE SWORN. I KEEP THE QUEEN'S PEACE UPON MY BREAST, AND I WILL KEEP IT BELOW UNTIL I AM CALLED BY NAME.
}
{ companion_alive("odda"):
    "That's no Choir dead," Odda breathes. "That's one of the queen's own." #speaker:odda
}
{ has_flag("rival_freed"):
    {bond_name()} draws steel beside you. "The singer's mine," your rival says. #speaker:rival
}
{
    - has_flag("vault_flooded"):
        -> from_the_drain
    - has_flag("vault_acolyte_fled"):
        -> expected
    - else:
        -> unexpected
}

// The long way round: out of the drain behind them, for a surprise attack.
= from_the_drain
Nobody is looking at the drain. Every face in the hall is turned to the stair, where the Choir expects company.
{ companion_alive("fen"):
    "Well," Fen whispers. "That's the first good thing that's happened all night." #speaker:fen
}
* [Drop down from the drain and strike before they turn #combat:chantry-late #surprise]
    -> fought

// The fast way, warned by the acolyte who ran from the vault.
= expected
At the foot of the stair, the acolyte who ran from the vault kneels in the ash at the Cantor's feet. Vesk opens his eyes, and looks up the stair at you.
"There you are," he says, almost kindly. "Too late, I'm afraid. She's mine now. They all are." #speaker:vesk
* [Fight #combat:chantry]
    -> fought

// The fast way, unwarned.
= unexpected
Vesk hasn't seen you. Nobody has: the dead are watching the altar, and the Cantor's eyes are shut.
* [Creep down the last steps while he sings #check:stealth:13]
    You go down into the ash, slow and low, one step at a time.
    { check("stealth", 13):
        -> crept_down
    - else:
        -> heard_coming
    }
* [Charge down into the ash #combat:chantry]
    -> fought

= crept_down
You're at the foot of the stair before anyone turns.
* [Strike before they see you #combat:chantry #surprise]
    -> fought

= heard_coming
The ash crunches under your boot like snow. Vesk's eyes open. "Ah," he says. "Company." #speaker:vesk
* [Fight #combat:chantry]
    -> fought

// ---- The fight ----

= fought
{ combat_won():
    -> won
- else:
    -> chantry_mercy
}

= won
~ set_flag("chantry_won")
~ add_deed("Broke Cantor Vesk's hymn in the Chantry of Ash, under the Kings' Barrow.")
{ foe_turned("wight"):
    -> aveline_rests ->
- else:
    -> aveline_falls ->
}
-> the_fallen ->
-> vesk_dying

// Called by name, she remembered: she lies down again, at rest.
= aveline_rests
~ set_flag("aveline_rested")
~ give_xp(700)
~ add_deed("Called Dame Aveline, the first queen's champion, by her name, and she remembered her oath.")
When it's over, Dame Aveline lowers her sword. She turns her empty helm towards you for a long moment.
"Called," she says, in a voice like wind through a keyhole. "By name." #speaker:aveline
{ has_flag("swore_the_oath"):
    Her helm tilts, as if she sees something on you that the others can't. "Sworn," she says. "Hold the door." #speaker:aveline
}
Then she walks back to her tomb, lies down in it with her sword on her breast, and is still. The little sliver of gold lies under her folded hands.
->->

// Not called: she fought to the end.
= aveline_falls
~ set_flag("aveline_destroyed")
Dame Aveline goes down in the ash at last, and the dark goes out of her helm like a candle snuffed. The sliver of gold on her breastplate goes on glinting.
{ companion_alive("odda"):
    "She was one of the queen's own," Odda says quietly. "She deserved better than him." #speaker:odda
}
->->

// The party's fallen, and the Rival's.
= the_fallen
{ has_flag("odda_at_the_chantry") && not companion_alive("odda"):
    Odda didn't get up from the fight. She lies in the ash with her mace still in her fist, as stern as ever.
    ~ set_flag("odda_fell_in_the_chantry")
}
{ has_flag("fen_at_the_chantry") && not companion_alive("fen"):
    Fen lies small and still in the ash, his knife still in his hand.
    ~ set_flag("fen_fell_in_the_chantry")
}
{ has_flag("rival_freed"):
    {
        - ally_standing("rival") && has_flag("chantry_fates_mercy"):
            {bond_name()} sits against a pillar with a hand pressed to a cut, staring at the tomb. "She did it," your rival says. "Not us. Remember that, when they sing about tonight." #speaker:rival
        - ally_standing("rival"):
            {bond_name()} wipes their blade on a Choir robe. "Well," your rival says. "That's that settled." #speaker:rival
        - else:
            ~ set_flag("rival_wounded")
            {bond_name()} lies in the ash where the Choir cut them down. You kneel, and find a pulse: faint, but there. Your rival will live, if you get them out of here.
    }
}
->->

// Vesk dying at the altar; beat 6, the first shard, follows (ch3-shard.ink).
= vesk_dying
Cantor Vesk lies on the altar steps with his hymn-book open under his cheek. He's still breathing, just.
"You don't understand," he whispers. "The Sleeping King. He's waiting. He only needs..." His big gravedigger's hand crawls across the ash, towards Aveline's tomb and the gold on her breast.
~ quest_note("missing-miller", "Cantor Vesk lies dying at the altar of the Chantry of Ash, reaching for the sliver of gold on Dame Aveline's breast.")
-> ch3_shard

// ---- Fate's Mercy: Aveline remembers by herself ----

= chantry_mercy
~ lose_coins()
~ long_rest()
~ set_flag("chantry_fates_mercy")
~ set_flag("aveline_rested")
~ add_deed("Was beaten in the Chantry of Ash, and saw Dame Aveline remember her oath.")
The last thing you see, lying in the ash, is the knight standing over you with her sword raised, and the last thing you hear is the hymn reaching its end.
Then the sword doesn't fall. Something moves behind the dark of her helm, slow as a memory. She turns, and the sword comes down on the Cantor instead.
You come to in the ash, hours later. Somebody has been through your pockets on their way out, the last of the Choir running for the low door with your purse. The hall is silent. Dame Aveline lies in her tomb with her sword on her breast and the sliver of gold under her folded hands, and whatever the first queen set in her champions, it didn't let them serve a Cantor for long.
-> the_fallen ->
-> vesk_dying
