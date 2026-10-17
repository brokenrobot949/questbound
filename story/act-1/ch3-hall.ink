// Chapter 3 · The Kings' Barrow, beat 3: the Hall of Champions (docs/STORY.md).
//
// Through the great gate lies the rest of the upper barrow (kings-barrow on the dungeon map):
// the stair and the crowned passage (the dart corridor), the Hall of Champions, and the
// oath-wall. The Choir came in by their own low door, into the deep barrow, and never got the
// great gate open, so nobody has walked these rooms since the first queen's day: the trap is
// still set, and the graves are still full.
//
// The darts (Rob's choice, Oct 16, 2026): the SRD's Poisoned Darts (data/srd/traps.js). Search
//   first (Perception 15) and you find the plates and step round them; a Mage Hand sent ahead
//   sets them off harmlessly. Walk on, or miss them, and one goes off under you: a Dexterity
//   save (DC 13), or 1d3 darts of 1d6 Poison each. Only the hero is struck. Three failed death
//   saves are Fate's Mercy: you wake hours later, back on the stair.
// The hall: five of the first queen's seven champions lie in it. Detect Magic (the hero's, or
//   Odda's from level 4) shows the oath-wards' glow: every tomb is a ward, and the oath-wall
//   glows brightest, which makes it easier to read (Rob's choice). The temptation: take the
//   grave goods (50 gold, a Wealth moment). Odda -1, the wards go out, and it will count toward
//   the Whisper in Act II (looted_the_champions; Rob's choice).
// The oath-wall: the seven champions' names and oaths (Rob's choice): Dame Aveline, first of
//   them; Tamar Oakheart, whose capstone was in the shallows at the Old Ford; Ingrith
//   Hammerfall of Emberdeep; Sirelle of the Glass Court; Gethin of the Old Circle; Sir
//   Leofric; and Dame Maud Hawkridge, whose tomb is by the door. Reading them takes History or
//   Arcana 13, or 10 for a Sage or in the wards' glow; Comprehend Languages reads it all. The
//   oath they all swore is carved plain underneath, so anyone can speak it and open the way:
//   only a good reading learns the names (read_the_oath_wall), and Aveline's is the one that
//   matters in the Chantry of Ash (beat 5).
// Through the wall, a stair goes down to the deep barrow: beat 4, the flooded vault
// (ch3-vault.ink).

=== ch3_hall ===
~ set_objective("Go down into the Kings' Barrow, find Garrick, and stop the Choir's hymn.")
* [Go down the stair into the dark #go:corridor]
    -> passage

// ---- The crowned passage, and its darts ----

= passage
The stair goes down further than seems right, its steps worn into hollows by feet that stopped coming here a very long time ago. The air is cold and dry, and smells of stone. #room:kings-barrow/corridor #location:The Kings' Barrow, the crowned passage
At the bottom a passage runs straight on into the dark, two strides wide. Its walls are carved from floor to roof with little crowns, hundreds of them in rows, like the pattern on a cloth. Under your feet, through the stone, the hymn goes on.
Halfway along, a skeleton lies on its face in a heap of rotted leather, one arm still reaching on down the passage, an empty sack beside it. Something small and dark sticks out between its ribs.
{ companion_alive("fen"):
    "Tomb robber," Fen murmurs. "You can always tell. They die facing the treasure." #speaker:fen
}
-> passage_ways

= passage_ways
* [Search the floor and walls before you go on #check:perception:15]
    You go down on one knee beside the skeleton and look properly: at the flagstones, at the walls, at the crowns.
    { check("perception", 15):
        -> darts_found
    - else:
        You find nothing out of place, so you go on carefully, a step at a time. It isn't careful enough.
        -> darts_sprung
    }
* {can_cast("mage-hand")} [Send a Mage Hand down the passage ahead of you #spell:mage-hand]
    ~ cast("mage-hand")
    A spectral hand floats off down the passage, patting the floor ahead of it like a blind man's cane. Just past the skeleton a flagstone sinks under it with a click, and darts hiss out of the crowns on both walls and rattle off the stone where you would have been standing.
    -> darts_found
* [Walk on down the passage]
    You step past the skeleton, and walk on.
    -> darts_sprung

// Found: by searching, or by the Mage Hand setting them off.
= darts_found
~ set_flag("darts_spotted")
~ give_xp(50)
Now you see them: three flagstones that sit a hair proud of the rest, one after another down the passage. And in the carved crowns on both walls, the dark heart of every third crown is a hole no wider than a finger.
{ companion_alive("odda") || companion_alive("fen"):
    You step from safe stone to safe stone, and the others come after you, setting their feet exactly where you set yours.
- else:
    You step from safe stone to safe stone, and nothing so much as clicks.
}
-> passage_end

// Sprung: a plate goes off under the hero.
= darts_sprung
~ set_flag("darts_sprung")
Just past the skeleton, a flagstone sinks under your boot with a click, and darts hiss out of the crowns on both walls.
~ temp darts = spring_trap("poisoned-darts")
{ darts == "dead":
    -> darts_mercy
}
{
    - darts == "safe":
        You throw yourself flat, and they rattle off the stone above you and skitter away down the passage.
    - darts == "woke":
        You come round on the cold flagstones, sick and shaking, with no idea how long you've lain there. The poison has burned itself out, and left you as weak as a kitten.
        { companion_alive("odda"):
            "There you are," Odda says, sitting back on her heels. "You gave us a fright." #speaker:odda
        }
    - else:
        They sting like hornets, and burn worse once they're out. You pull them free with shaking fingers.
}
-> plates_seen

= plates_seen
Now you know to look, you can see the rest: two more flagstones that sit a hair proud of the others, and in the carved crowns, the dark heart of every third crown is a hole no wider than a finger. You step round the plates, and nothing else clicks.
-> passage_end

// Fate's Mercy: struck down by the darts, and three failed death saves.
= darts_mercy
~ long_rest()
~ set_flag("darts_fates_mercy")
~ add_deed("Was struck down by poisoned darts in the Kings' Barrow, and got up again.")
{
    - companion_alive("odda") && companion_alive("fen"):
        You come to on the stair, flat on your back. Somebody dragged you back up the passage by your collar, and Odda has been praying over you, and Fen swearing at you, by turns, for what they both swear was hours.
    - companion_alive("odda"):
        You come to on the stair, flat on your back. Odda dragged you back up the passage by your collar, and has been praying over you for what she swears was hours.
    - companion_alive("fen"):
        You come to on the stair, flat on your back. Fen dragged you back up the passage by your collar, and has been swearing at you for what he swears was hours.
    - else:
        You come to on the cold flagstones, alone, with the darts still in you. You lay there long enough for the poison to burn itself out, and very nearly long enough for it to burn you out with it.
}
{ companion_alive("odda"):
    "Don't do that again," Odda says. #speaker:odda
}
Hours have gone. But it's still dark outside, and the hymn under the floor hasn't stopped.
-> plates_seen

= passage_end
At the end of the passage a doorway opens on a great dark hall, and the hymn comes through it louder.
* [Go on into the hall #go:hall]
    -> hall

// ---- The Hall of Champions ----

= hall
You come out into a long hall, pillared like a temple. Along both walls, between the pillars, lie stone tombs, and on each lid a champion lies carved in old-fashioned armour, with a sword on their breast and their hands folded on the hilt. There are five of them. Dust lies thick on everything, and no feet have marked it. #room:kings-barrow/hall #location:The Kings' Barrow, the Hall of Champions
Nobody has been in here since the first queen's day. The Choir never got the great gate open, so these graves are still full: gold glints on every tomb. A torc on a stone throat, rings on stone fingers, a silver circlet laid at a stone champion's feet.
At the far end of the hall, the whole wall is carved with writing, from the floor to the roof.
{ companion_alive("odda"):
    { has_flag("knows_oath_wards"):
        "The first queen's champions," Odda says, very quietly, the way you'd speak in a temple. "Laid here with their oaths, like the graves on the barrow road. Every one of them a seal." #speaker:odda
    - else:
        "The first queen's champions," Odda says, very quietly, the way you'd speak in a temple. "Laid to rest with their oaths, the old lists of my order say." #speaker:odda
    }
}
{ companion_alive("fen"):
    Fen looks at the gold. Then, carefully, he looks at the ceiling, and the floor, and the walls. "I'm only looking," he says. #speaker:fen
}
-> hall_ways

= hall_ways
* {can_cast("detect-magic") && not has_flag("saw_oath_wards")} [Look at the tombs with Detect Magic #spell:detect-magic]
    ~ cast("detect-magic")
    -> wards_glow
* {not can_cast("detect-magic") && companion_can_cast("odda", "detect-magic") && not has_flag("saw_oath_wards")} [Ask Odda to look at the tombs with Detect Magic #spell:detect-magic #by:odda]
    ~ companion_cast("odda", "detect-magic")
    -> wards_glow
* [Take the grave goods: the champions won't miss them #drive:wealth]
    -> loot
* [Go to the carved wall at the end of the hall #go:oath-wall]
    -> oath_wall

// Detect Magic: the oath-wards' glow.
= wards_glow
~ set_flag("saw_oath_wards")
{ has_flag("looted_the_champions"):
    The spell shows you the magic in the hall, and there's less of it than there was. The tombs are dark. Whatever wards they held went out when you lifted their gold, the way a candle goes out when somebody opens the door.
    Only the carved wall at the end of the hall still glows, a slow, steady gold, every letter on it lit from within. In that light you could read it, however old it is.
- else:
    The spell shows you the magic in the hall. Every tomb glows a slow, steady gold, like embers under ash: wards, worked into the stone and the grave goods alike, holding something down.
    And the carved wall at the end of the hall blazes brightest of all, every letter on it lit from within. In that light you could read it, however old it is.
}
{ companion_alive("odda"):
    "Warding," Odda breathes. "After all this time, the oaths are still holding." #speaker:odda
}
-> hall_ways

// The temptation: rob the champions' graves.
= loot
~ drive_moment("wealth")
~ set_flag("looted_the_champions")
You go from tomb to tomb: the torc off a stone throat, the rings off stone fingers, the circlet from a stone champion's feet. It's old gold, soft and heavy, and every piece is stamped with a little crown.
~ give_coins(50)
As you lift the last ring, the hymn under the floor swells, just for a breath, as if something down there heard.
{ has_flag("saw_oath_wards"):
    One by one, the glow on the tombs gutters and goes out, like candles when somebody opens the door.
}
{ companion_alive("odda"):
    ~ approve("odda", -1)
    "Those were the queen's own champions," Odda says. She doesn't raise her voice. She doesn't have to. "Sworn to her, and laid here to keep their oath. And you've picked their pockets." #speaker:odda
}
{ companion_alive("fen"):
    Fen watches you do it, and for once he doesn't make a joke.
}
-> hall_ways

// ---- The oath-wall ----

= oath_wall
The hall ends in a wall of grey stone, carved from the floor to the roof. At the top is a crown, and under it seven names, each with lines of writing beneath it in an old court hand, small and worn. Under them all, cut deep and large across the whole wall, are a few plain lines that any child could spell out. #room:kings-barrow/oath-wall #location:The Kings' Barrow, the oath-wall
In the middle of the wall, under the names, a tall panel is framed in tarnished gilt, like a door. But it has no handle, no keyhole and no hinge. The hymn comes through it, and the air that seeps round its edges is cold and wet, and smells of deep water. The way down is behind it.
{ has_flag("saw_oath_wards"):
    In the spell's light, every letter of it glows.
}
-> wall_ways

= wall_ways
* {can_cast("comprehend-languages")} [Read the wall with Comprehend Languages #spell:comprehend-languages]
    ~ cast("comprehend-languages")
    The old letters swim and settle under the spell, and read as plainly as if they were cut yesterday.
    -> names_read
* {oath_wall_easy()} [Read the names and oaths, from what you know of the old court #check:history:10 #drive:knowledge]
    ~ drive_moment("knowledge")
    -> reading ->
    { check("history", 10):
        -> names_read
    - else:
        -> names_lost
    }
* {not oath_wall_easy()} [Read the names and oaths, from what you know of the old court #check:history:13 #drive:knowledge]
    ~ drive_moment("knowledge")
    -> reading ->
    { check("history", 13):
        -> names_read
    - else:
        -> names_lost
    }
* {oath_wall_easy()} [Read the names and oaths by the wards worked into the words #check:arcana:10 #drive:knowledge]
    ~ drive_moment("knowledge")
    -> reading ->
    { check("arcana", 10):
        -> names_read
    - else:
        -> names_lost
    }
* {not oath_wall_easy()} [Read the names and oaths by the wards worked into the words #check:arcana:13 #drive:knowledge]
    ~ drive_moment("knowledge")
    -> reading ->
    { check("arcana", 13):
        -> names_read
    - else:
        -> names_lost
    }

// What helps with the reading, said before the roll.
= reading
{
    - has_flag("saw_oath_wards"):
        You hardly need a light to read by: in the spell's glow, every letter stands out like gold thread.
    - has_background("sage"):
        You hold your light up to the wall. Old court hands were half of your schooling, and these letters have an old friend's look.
    - else:
        You hold your light up to the wall, and squint.
}
->->

// Read: the champions' names, and Aveline's above them all.
= names_read
~ set_flag("read_the_oath_wall")
~ give_xp(100)
At the top, under the crown, the first name: AVELINE, FIRST OF THE SWORN. And under it, her oath: I KEEP THE QUEEN'S PEACE UPON MY BREAST, AND I WILL KEEP IT BELOW UNTIL I AM CALLED BY NAME.
Then the others, one by one. TAMAR OAKHEART, WHO HELD THE ROAD.{has_flag("read_the_oath_stone"): You know that name. It was carved on the capstone in the shallows at the Old Ford.} INGRITH HAMMERFALL OF EMBERDEEP, SWORN TO KEEP THE FIRE. SIRELLE OF THE GLASS COURT, WHO WORE NO MASK. GETHIN OF THE OLD CIRCLE, WHO KEPT THE OLD WAYS. SIR LEOFRIC, WHO NEVER YIELDED. DAME MAUD HAWKRIDGE, WHO WATCHED THE DOOR, and whose tomb lies beside it still.
{ has_flag("read_the_oath_stone"):
    Five tombs in the hall, then, for seven names. Tamar Oakheart lay out on the barrow road, until the dead lifted the stone. And Aveline, first of them all, lies somewhere below.
- else:
    Five tombs in the hall, then, for seven names. And Aveline, first of them all, lies somewhere below.
}
~ quest_note("missing-miller", "The oath-wall in the Hall of Champions names the first queen's seven champions. The first is Dame Aveline, who lies somewhere below: 'I keep the queen's peace upon my breast, and I will keep it below until I am called by name.'")
{ companion_alive("odda"):
    ~ set_flag("odda_saw_ingriths_oath")
    "Sworn to keep the fire," Odda says under her breath. "That's how the oldest prayer of my order begins. We never knew whose words they were." #speaker:odda
}
-> the_oath

// Not read: the names stay a mystery, but the oath underneath is plain.
= names_lost
The old court hand beats you. The names are worn half away, and the letters are shapes you've never seen. You make out the crown at the top, and a word here and there, and nothing more.
-> the_oath

= the_oath
The lines cut deep at the foot of the wall are another matter: plain words, meant for whoever came after. WE ARE SWORN TO THE CONCORD. WHILE WE LIE STILL, THE OATH HOLDS. SPEAK IT, SWORN, AND PASS.
And under that, the oath itself: BY CROWN AND CONCORD I AM SWORN, TO KEEP THE PEACE AND HOLD THE DOOR.
* [Swear it, and mean it #drive:glory]
    ~ drive_moment("glory")
    ~ set_flag("swore_the_oath")
    You put your hand flat on the cold stone. "By crown and Concord I am sworn," you say, "to keep the peace and hold the door." And you find you mean every word.
    -> wall_opens
* [Say the words]
    "By crown and Concord I am sworn," you say, "to keep the peace and hold the door."
    -> wall_opens

// The way down opens.
= wall_opens
~ set_flag("oath_wall_opened")
The words go into the stone the way water goes into sand. Then, with a long, dry sigh, the gilt-framed panel folds back into the wall, stone sliding over stone, and opens on a stair going down.
Cold air comes up it, wet and smelling of deep water, and with it the hymn, plainer than it's been all night. Somewhere far below, something creaks and splashes, slow and steady, like a great wheel turning.
{ companion_alive("fen"):
    "Down," Fen says. "It's always down." #speaker:fen
}
{ companion_alive("odda"):
    Odda touches the carved names as she passes them, the way she touched the crowns on the gate's lintel.
}
~ quest_note("missing-miller", "The oath-wall opened on a stair down into the deep barrow. Something below creaks like a great wheel turning.")
-> ch3_vault

// The oath-wall is easier to read for a Sage, or in Detect Magic's glow.
=== function oath_wall_easy() ===
~ return has_background("sage") || has_flag("saw_oath_wards")
