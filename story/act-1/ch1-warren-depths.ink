// Chapter 1 · Bramblegate, beat 5: Brackenhollow warren, rooms 5–6 (docs/STORY.md).
//
// The lower warren: three of the old dead dig at the far wall, keeping time with a hymn from
// somewhere ahead. Creep past (they're digging away from you), or fall on them while their
// backs are turned (a surprise attack). The breach: the warren breaks into a barrow crypt,
// where a Choir acolyte sings a Skeleton to its feet. Stop the hymn before a second one
// rises; catch him and he talks, or he flees and drops his hymnal. Either way you take the
// hymnal, the dead upstairs fall still, and you climb back to Nettle (or her empty hall).
// Losing a fight down here is Fate's Mercy: you come to where you fell, robbed.
// Spells: Disguise Self (walk up to the singer in a grey robe), Charm Person (on the caught
// acolyte, who saves), and Mending (the hymnal's torn map shows where the road goes).

=== ch1_warren_depths ===
The passage drops into the goblins' deep halls, where their stores were kept. Crates lie smashed, spilled grain has gone green, and a single small sandal sits in the middle of the floor. At the far wall, three figures are digging. #room:brackenhollow/lower #location:Brackenhollow warren, the lower warren

They were people once, a long time ago. Grave-cloth hangs off them in rags, and one still wears a bronze torc gone as green as the grain. They claw at the wall with bare hands and broken spades in a slow, patient rhythm, and they don't look round.

Under the scraping you can hear singing, somewhere ahead and below. The diggers are keeping time with it.
~ set_flag("heard_the_hymn")
~ set_objective("Find whoever is singing below the warren, and stop the song.")

* [Slip past them while they dig #check:stealth:10]
    You keep to the far wall and move only when their spades bite.
    { check("stealth", 10):
        They never turn. You're past them and into the dark beyond before the next verse.
        ~ set_flag("crept_past_the_dead")
        // Getting past the dead without a fight is worth the same as the fight.
        ~ give_xp(150)
        -> to_the_breach
    - else:
        Rubble shifts under your boot. The digging stops. All three turn at once, slowly, the way a flower turns to the sun.
        -> the_dead_turn
    }
* [Fall on them while their backs are turned #combat:lower-dead #surprise]
    -> dead_fought

= the_dead_turn
* [Fight the dead #combat:lower-dead]
    -> dead_fought

= dead_fought
{ combat_won():
    The last of the dead comes apart like an old sack. The deep halls are quiet now, apart from the singing, which is louder here, coming from where the goblins' tunnel breaks into older stone.
    ~ set_flag("lower_dead_destroyed")
    -> to_the_breach
- else:
    -> depths_mercy
}

= depths_mercy
// Fate's Mercy in the lower warren.
You come to with your face in the dirt. The dead have gone back to their wall and are digging as if you'd never been there. Somebody has been through your pockets while you lay there. #room:brackenhollow/lower
~ lose_coins()
~ long_rest()
{ has_flag("goblins_spared"):
    A goblin warrior crouches beside you, keeping well clear of the diggers. "Mother says don't die yet," it whispers. "Deal's not done." It shows you a crawl-way along the wall, behind the dead, and scurries back up the passage. #speaker:goblin-warrior
- else:
    You lie still for a long time. When you can move, you crawl along the wall behind the diggers, and they never turn.
}
-> to_the_breach

= to_the_breach
* [Follow the singing #go:breach]
    -> breach

// ---- Room 6: the breach ----

= breach
The goblins' tunnel ends in a wall of fitted stone, smashed open from the far side. Beyond the hole is a crypt: dressed stone, niches full of old bones, and carved along the lintel, a row of little crowns. #room:brackenhollow/breach #location:Brackenhollow warren, the breach

A man in a grey robe stands beside a stone bier with a book held high, singing. His voice is beautiful. In front of him a skeleton is pulling itself together, bone by clattering bone, and in the heap of bones beside it something else has begun to stir.

* [Charge him before the hymn ends #combat:breach-hymn]
    -> breach_fought
* [Creep close and strike before he sees you #check:stealth:15]
    You edge along the wall from niche to niche while he sings with his eyes closed.
    { check("stealth", 15):
        You're close enough to hear him breathe between verses, and he hasn't opened his eyes.
        -> breach_unseen
    - else:
        A bone cracks under your heel. The singing doesn't stop, but his eyes snap open, and the skeleton turns its empty face towards you.
        -> breach_seen
    }
* {can_cast("disguise-self")} [Look like one of his own, and walk right up to him #spell:disguise-self]
    ~ cast("disguise-self")
    -> breach_disguised

= breach_disguised
You take on a grey robe, a shaved head and a hymnal of your own, and walk up the crypt humming along. The skeleton turns its empty face towards you, and away again. The singer doesn't even open his eyes. Why would he?
-> breach_unseen

= breach_unseen
* [Strike! #combat:breach-hymn #surprise]
    -> breach_fought

= breach_seen
* [Fight #combat:breach-hymn]
    -> breach_fought

= breach_fought
{ combat_won():
    { foe_escaped("cultist"):
        -> acolyte_fled
    - else:
        -> acolyte_caught
    }
- else:
    -> breach_mercy
}

= acolyte_caught
The acolyte lies at the foot of the bier, alive, bleeding, and still humming under his breath.
* [Make him talk #check:intimidation:15]
    You haul him up by his robe until his face is an inch from yours.
    { check("intimidation", 15):
        -> acolyte_talks
    - else:
        -> acolyte_silent
    }
* [Ask him, quietly, who he sings for #check:persuasion:15]
    You crouch beside him and ask, as gently as you can, who he's singing for.
    { check("persuasion", 15):
        -> acolyte_talks
    - else:
        -> acolyte_silent
    }
* {can_cast("charm-person")} [Charm him into talking #spell:charm-person]
    You crouch beside him, speak softly, and let the spell slip in under the words.
    { cast_on("charm-person", "The acolyte", "wisdom", 2):
        His eyes go soft and grateful, as if yours were the first kind face he's seen in years.
        -> acolyte_talks
    - else:
        He flinches away from you. "Witch-tongue," he spits, and starts to sing again, louder. #speaker:acolyte
        -> acolyte_silent
    }

= acolyte_talks
"The Precentor will wake the Sleeping King," he whispers, smiling with bloody teeth. "And the miller works the gates. You're late. You're all of you so late." #speaker:acolyte
~ set_flag("acolyte_talked")
~ quest_note("missing-miller", "The Choir's acolyte says the miller 'works the gates' for someone called the Precentor, who will 'wake the Sleeping King'.")
-> acolyte_taken

= acolyte_silent
He only sings, softly, staring past you, until his eyes roll back and he faints.
-> acolyte_taken

= acolyte_taken
You turn away for a moment to pick up the book he dropped. When you turn back, he's gone. There's a smear on the flagstones leading to the crypt's far door, as if something dragged him into the dark of the barrow tunnels. Something down there didn't want him talking any more.
~ set_flag("acolyte_caught")
-> the_hymnal

= acolyte_fled
He runs, still singing, through the crypt's far door and into the dark of the barrow tunnels. The singing fades into the distance. In his hurry he's left his book on the bier.
~ set_flag("acolyte_escaped")
-> the_hymnal

= breach_mercy
// Fate's Mercy at the breach.
You come to on the cold crypt floor. The hymn is over, the acolyte is gone, and the bones in the niches lie still. He took your purse before he ran, but in his hurry he left his book on the bier. #room:brackenhollow/breach
~ lose_coins()
~ long_rest()
~ set_flag("acolyte_escaped")
-> the_hymnal

= the_hymnal
~ give_item("choir-hymnal")
The book is a hymnal, bound in grey. Inside are old coronation hymns, written out again and again in a careful hand, and a rough map of a road running north into the barrow hills. Burned into the cover is a staff wound with music notes{ has_flag("saw_choir_sigil"): , the same sigil you saw scorched into the floor of Dunn's Mill}.
~ set_flag("found_hymnal")
~ set_objective("Climb out of the warren, and take what you've learned back to Reeve Corbin in Bramblegate.")
~ quest_note("missing-miller", "Took a hymnal from the Choir at the breach: coronation hymns, a map of the barrow road, and their sigil, a staff wound with music notes.")
~ give_xp(25)

The map's last page has been torn across, its two halves still caught in the binding. The road runs north off the edge of the tear.

The crypt's far door leads on into the barrow tunnels, but a few yards in, the roof has come down. Whoever came this way brought it down behind them.
{ not has_flag("lower_dead_destroyed"):
    Back up the passage, the scraping has stopped. Without the hymn, the dead diggers have fallen where they stood.
    ~ set_flag("lower_dead_stilled")
}
-> hymnal_onward

= hymnal_onward
* {can_cast("mending")} [Mend the torn map #spell:mending]
    ~ cast("mending")
    You hold the two halves together and murmur the spell. The tear knits shut without a seam, and the road runs on: north past a crossing marked THE OLD FORD, to a cluster of little drawn mounds labelled CAIRNFIELD. Someone has ringed Cairnfield twice in red.
    ~ set_flag("hymnal_mended")
    ~ quest_note("missing-miller", "The hymnal's mended map: the barrow road runs north past the Old Ford to Cairnfield, ringed twice in red.")
    -> hymnal_onward
* [Climb back up through the warren #go:lower]
    -> back_up

// ---- Back up to Nettle, and out ----

= back_up
{ has_flag("goblins_spared"):
    -> nettle_pays
- else:
    -> empty_hall
}

= nettle_pays
Word has gone ahead of you. When you climb into Nettle's hall, the whole band is waiting, and nobody's holding a bow. #room:brackenhollow/hall #location:Brackenhollow warren, Nettle's hall

"The digging stopped," Nettle says. "Deep halls are ours again." She digs in the bag behind her throne and presses two things into your hand: a stoppered red bottle, and a string of small sharp teeth knotted with a nettle leaf. "Potion. And that's so my people know you. Don't lose it." #speaker:nettle
~ give_item("potion-of-healing")
~ give_item("goblin-tooth-charm")
~ finish_quest("goblin-bargain")
~ add_deed("Kept the bargain with Mother Nettle: the dead are gone from Brackenhollow's deep halls.")
~ give_xp(100)
-> leave_warren

= empty_hall
Nettle's hall is empty, apart from the furs and the throne. Behind the throne you find the band's hoard: shiny junk, mostly, and among it a stoppered red bottle and a string of small sharp teeth knotted with a nettle leaf. #room:brackenhollow/hall #location:Brackenhollow warren, Nettle's hall
~ give_item("potion-of-healing")
~ give_item("goblin-tooth-charm")
-> leave_warren

= leave_warren
* [Climb out into the evening air]
    You climb up past the larder and the pit and out through the crack in the cliff. It's evening, and the quarry is full of long shadows. #room:none #location:The quarry road #time:Dusk
    -> ch1_return
