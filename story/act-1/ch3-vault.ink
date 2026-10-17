// Chapter 3 · The Kings' Barrow, beat 4: the flooded vault (docs/STORY.md).
//
// The stair from the oath-wall comes down into the deep barrow (deep-barrow on the dungeon
// map), onto a landing above a vault half full of black water. The Choir has Garrick Dunn
// chained to a great sluice wheel, draining it: somebody flooded the vault long ago, over a
// stair that goes straight down to the Chantry of Ash. Meanwhile the Choir comes and goes by
// the crawl their dead dug from the low door.
//
// The fight (Rob's choices, Oct 16, 2026): vault-wheel, an Ogre Zombie in the shallows, a
//   Ghoul on the gantry and five acolytes (Moderate). The acolyte at the wheel sings: unless the
//   hymn is broken, a Zombie climbs out of the black water on round 3. Creep down (Stealth 12)
//   or make a splash at the far end (Minor Illusion) for a surprise attack; or attack from the
//   landing. Acolytes who run reach the Cantor (vault_acolyte_fled).
// Losing is Fate's Mercy: you wake chained to the wheel, robbed; the Choir has gone down to
//   its rite with its dead. Fen slips his chains and frees everyone, or Garrick's loose pin does.
// Garrick (and the Rival, if the Choir took them) are freed either way (garrick_freed,
//   rival_freed). Lark's news, by what you told her in Chapter 2. The Rival comes with you to
//   settle with Vesk, and fights beside you in the chantry (beat 5).
// Then the choice (Rob's choice: fast or safe): drain the vault (vault_drained), and a stair in
//   the channel is the quick way down, but the Choir's crawl from the low door opens on it too,
//   so their reinforcements can follow; or flood it back (vault_flooded), which fills the
//   Choir's crawl (no reinforcements), but you take the long way round, the builders' old drain,
//   and arrive later. Both are for the chantry to use. Garrick goes up to wait at the gate.
// The story stops there for now; beat 5, the Chantry of Ash, comes next.

=== ch3_vault ===
~ set_objective("Go down into the deep barrow, find Garrick at the sluices, and stop the Choir's hymn.")
* [Go down the stair into the deep barrow]
    -> landing

= landing
// Who goes into a fight on their feet, so afterwards the scene knows who fell here.
{ companion_alive("odda"):
    ~ set_flag("odda_at_the_vault")
}
{ companion_alive("fen"):
    ~ set_flag("fen_at_the_vault")
}
The stair winds down a long way, and the air grows colder and wetter with every step, until the walls fall away and you come out on a landing of wet stone above a great vault, half full of black water. #room:deep-barrow/vault #location:The Kings' Barrow, the flooded vault
A deep channel runs down the middle of it, with shallows either side and a stone gantry across. At the far end, where the channel stops, a wheel taller than three men turns slowly in the water, lifting it bucket by bucket and tipping it away through an iron sluice gate.
Chained to the wheel's frame, walking it round like a donkey at a well, is a big man still white with old flour: Garrick Dunn.{has_flag("rival_taken"): On the far side of the wheel, in the same chains, walks {bond_name()}, looking furious about it.}
Five acolytes in grey keep them at it, and one of them sings beside the wheel, slow and deep: the hymn you've heard all night. A Ghoul crouches on the gantry, licking its fingers. And in the shallows, waist-deep in the black water, wades something that was an ogre once, trailing a broken chain.
{ companion_alive("fen"):
    "That's the raising hymn," Fen breathes. "Whatever they're draining this for, they mean to wake it." #speaker:fen
}
{ companion_alive("odda"):
    "Garrick," Odda whispers. "Alive. Thank the Flame." #speaker:odda
}
-> approach

= approach
* [Creep down off the landing while they're busy at the wheel #check:stealth:12]
    You go down off the landing low and slow, keeping to the shadows at the water's edge.
    { check("stealth", 12):
        -> unseen
    - else:
        -> seen
    }
* {can_cast("minor-illusion")} [Make a great splash at the far end of the vault #spell:minor-illusion]
    ~ cast("minor-illusion")
    You flick your fingers, and at the far end of the vault something huge seems to fall into the water, with a splash that booms round the walls. Every head at the wheel turns towards it.
    -> unseen
* [Attack them from the landing #combat:vault-wheel]
    -> fought

= unseen
Nobody looks up. The singer sings on, the wheel creaks round, and you're down off the landing and into the shallows before anyone at the wheel knows you're there.
* [Strike before they see you #combat:vault-wheel #surprise]
    -> fought

= seen
A loose stone skids out from under your boot and plops into the channel. The singing doesn't stop, but every other head turns. "Down there! On the landing!"
* [Fight #combat:vault-wheel]
    -> fought

// ---- The fight ----

= fought
{ combat_won():
    -> won
- else:
    -> vault_mercy
}

= won
~ set_flag("vault_won")
~ add_deed("Broke the Choir's hold on the flooded vault under the Kings' Barrow, and freed Garrick Dunn from their wheel.")
The Ogre Zombie goes over backwards into the channel with a splash that soaks everyone on the gantry, and doesn't come up. With nobody left to drive it, the great wheel creaks, slows, and stops.
{ foe_escaped("cultist"):
    ~ set_flag("vault_acolyte_fled")
    In the far corner, a lantern goes bobbing away down the Choir's own passage, and running feet go with it. Somebody is going to tell the Cantor you're coming.
}
-> the_fallen ->
-> unchained

// Anyone in the party who fell in the fight is laid on the landing, to carry home after.
= the_fallen
{ has_flag("odda_at_the_vault") && not companion_alive("odda"):
    Odda didn't get up from the fight. She lies in the shallows with her mace still in her fist, and the black water laps at her braids.
    ~ set_flag("odda_fell_in_the_vault")
}
{ has_flag("fen_at_the_vault") && not companion_alive("fen"):
    Fen lies on the gantry, small and still, his knife still in his hand.
    ~ set_flag("fen_fell_in_the_vault")
}
{ has_flag("odda_fell_in_the_vault") || has_flag("fen_fell_in_the_vault"):
    You carry the fallen up onto the landing and lay them under a cloak. When this is done, you'll bring them home to Bramblegate's temple, to lie before the altar flame.
}
->->

// ---- Fate's Mercy: chained to the wheel ----

= vault_mercy
~ lose_coins()
~ long_rest()
~ set_flag("vault_fates_mercy")
~ add_deed("Was beaten in the flooded vault under the Kings' Barrow and chained to the Choir's wheel, and got loose again.")
You come to walking. Your wrists are chained to the great wheel's frame, and your legs are moving because the wheel is: stop, and it drags you. Somebody has been through your pockets, and your purse is gone.
{
    - companion_alive("odda") && companion_alive("fen"):
        Odda and Fen walk the wheel behind you in the same chains, battered, but breathing.
    - companion_alive("odda"):
        Odda walks the wheel behind you in the same chains, battered, but breathing.
    - companion_alive("fen"):
        Fen walks the wheel behind you in the same chains, battered, but breathing.
}
"They've gone down to their rite," says the big floury man chained beside you: Garrick Dunn. "Took their dead with them. Said they'd be back for us after." #speaker:garrick
{ companion_alive("fen"):
    Fen sighs, does something to his left thumb that makes Garrick wince, and slides his hand out of its manacle. A minute later, with a pin from somewhere about his person, he has every lock open. "Never let them chain you with the cheap stuff," he says. #speaker:fen
- else:
    "There's a pin in this frame that's been working loose since the day they chained me," Garrick says. "I've been saving it. Give it a kick. There." #speaker:garrick
    You kick. The pin goes, the frame sags, and your chains slide off the end of it.
}
The night has worn on, but the hymn still comes up from somewhere below. Whatever the Cantor means to do tonight, he hasn't done it yet.
-> the_fallen ->
-> unchained

// ---- Garrick, free ----

= unchained
~ set_flag("garrick_freed")
{ not has_flag("vault_fates_mercy"):
    The key to the chains hangs on the singer's belt. Garrick holds out his wrists for you, and his big hands are shaking.
}
"Lark," he says. "My girl. Is she..." #speaker:garrick
{
    - has_flag("lark_apprentice"):
        "She's safe in Bramblegate," you tell him, "and she's decided she's my apprentice." Garrick stares at you. Then he laughs, a big cracked laugh that booms round the vault. "Course she has," he says. "Course she has." #speaker:garrick
    - has_flag("lark_stays_home"):
        "She's safe at Morwen's," you tell him, "and she's promised me she'll stay there." Garrick wipes his eyes with the back of a floury hand. "Then she's grown up a deal since I saw her," he says. #speaker:garrick
    - else:
        "She's safe in Bramblegate," you tell him. "She came down after you herself, with your hatchet, and she wants to be an adventurer, if you say yes." Garrick opens his mouth to say "Over my dead body", hears himself, and laughs until he has to sit down. #speaker:garrick
}
{ has_flag("found_garrick_neckerchief"):
    "She found your neckerchief," you say, "on a nail by the old door under the mill." Garrick nods. "I tied it there," he says. "I knew somebody would come looking. I hoped it wouldn't be her." #speaker:garrick
}
{ has_flag("rival_taken"):
    -> rival_free ->
}
-> the_water

// The Rival, chained at the wheel beside Garrick since Cairnfield.
= rival_free
~ set_flag("rival_freed")
{bond_name()} rubs their wrists where the chains were, and looks at you for a long moment.
{
    - has_flag("rival_offered_truce"):
        "You offered, at the ford," your rival says. "Together. I should have said yes." #speaker:rival
    - has_flag("rival_warned"):
        "Grey robes, sad songs," your rival says. "You did warn me. Don't say it." #speaker:rival
    - else:
        "The miller was yours, you said." Your rival nods at Garrick. "Have him. I'm not here for the bounty any more." #speaker:rival
}
"Three days that Cantor kept me walking his wheel," they say. "I'm coming down there with you, and I'm going to have a word with him." #speaker:rival
~ quest_note("missing-miller", bond_name() + " is free, and means to settle with Cantor Vesk beside you.")
->->

// ---- Drain it, or flood it back ----

= the_water
Garrick looks at the wheel the way you'd look at a dog that bit you. "There's a stair under that water," he says. "Old work. Somebody flooded this vault on purpose, long ago, over a stair that goes straight down to where the Cantor sings. They've had me draining it since the day they took me. Another hour, and it would have been dry." #speaker:garrick
"Meanwhile they go round by the crawl their dead dug, down from the low door." He jerks his chin at the passage in the far corner. "And there's an older way round still: a drain the builders left, up off the landing there. Long, and tight, and it comes out somewhere below. Nobody's been down it in a thousand years." #speaker:garrick
"I know these sluices like my own mill now. I can finish draining her in a quarter of an hour. Or I can open her up the other way and fill her to the roof, and their crawl with her." #speaker:garrick
{ companion_alive("fen"):
    "Drain it, and we're down there before he's done singing," Fen says. "Of course, so is anyone who comes down behind us." #speaker:fen
}
{ companion_alive("odda"):
    "Flood it, and nobody comes at our backs," Odda says. "It's a long way round, mind, and that hymn won't wait for us." #speaker:odda
}
* [Drain the vault, and take the quick way down]
    -> drained
* [Flood it back, cut the Choir off, and take the long way round]
    -> flooded

= drained
~ set_flag("vault_drained")
Garrick hauls on a lever as long as he is tall, and the sluice gate grinds up. The black water roars out through it, and the channel empties as fast as a bath with the plug pulled, down to the silt.
At the bottom, where the water was deepest, a stair cut in the rock goes down into the dark, and the hymn comes up it, close now. In the far corner, the Choir's crawl opens onto the dry channel too. Whoever comes down from the low door after you will come this way, the quick way.
-> garrick_goes

= flooded
~ set_flag("vault_flooded")
Garrick knocks a wedge out from under the wheel, and it runs backwards with a groan. The sluice gate slams, and the black water comes up over the shallows, over the gantry, over the wheel's platform, and pours into the Choir's crawl with a roar until it's full to the roof. Nobody is coming down from the low door now.
Up on the landing, Garrick shows you a slab that swings aside on a pin. Behind it, the builders' old drain goes off into the dark: the long way round.
-> garrick_goes

= garrick_goes
{ has_flag("varrow_rallied"):
    "Go up to the great gate," you tell Garrick. "Captain Varrow's watch is out on the cairns. They'll see you safe."
- else:
    "Go up to the great gate, and wait," you tell Garrick. "If we're not back by dawn, go home to Lark."
}
"You bring yourselves back," Garrick says. "Lark'll never forgive me otherwise." And he climbs away up the stair, still white with flour, until the dark takes him. #speaker:garrick
~ quest_note("missing-miller", "Garrick Dunn is free, and waiting at the great gate of the Kings' Barrow.")
~ set_objective("Go down to the Chantry of Ash, and stop Cantor Vesk's hymn. (The rest of Act I is still being written.)")
-> END
