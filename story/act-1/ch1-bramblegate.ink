// Chapter 1 · Bramblegate, beat 2: morning at the Tallow and Thistle, and the town opens up
// (docs/STORY.md). The square leads to the reeve's hall (the bounty, and the quest), the
// market (shopping), Hob's forge, the temple and the notice board. Every Drive gets a moment
// here to earn Heroic Inspiration. Once the hero has taken the bounty, Lark Dunn finds them,
// and the road to Dunn's Mill opens.

=== ch1_morning ===
Morning comes grey and dripping. Morwen sets down a breakfast big enough for two: eggs, black bread, a slab of ham, and tea strong enough to stand a spoon in. #location:Bramblegate, the Tallow and Thistle #time:Morning

"Goblins hit the mill last night," she says, sliding onto the bench across from you as if you'd asked. "Took half the flour and smashed the wheelhouse. And Garrick Dunn, the miller, is gone. Door broken in, and no Garrick."

{has_flag("saw_barrow_light"): You tell her about the lights on the hills. Her cheerfulness goes out like a pinched candle. "Then it's not only goblins," she says quietly. "And you'd best not say that too loud."}

"Reeve Corbin's offering good coin to whoever brings Garrick home. His hall's across the square." She pushes a little corked bottle across the table, red as a cherry. "And take this. On the house. Garrick's the only miller for twenty miles, and I'm not baking with gravel."
~ give_item("potion-of-healing")
-> bramblegate

// The square: the hub of the town. Places stay open to visit as often as the player likes.
=== bramblegate ===
{has_flag("took_bounty") and not has_flag("met_lark"): -> lark}
{ bramblegate == 1:
    Bramblegate's square is all mud, market awnings and people talking in low voices. The reeve's hall stands on one side with its flag hanging limp. Hob's forge clangs away on another, and the Temple of the Steadfast Flame keeps watch over the rest. A notice board leans by the well, half-covered in damp paper. #location:Bramblegate, the square
- else:
    {&You're back in the square.|The square is as muddy as you left it.|A cart rattles past the well. The square carries on without you.} #location:Bramblegate, the square
}
+ {not has_flag("took_bounty")} [Go to the reeve's hall]
    -> reeve_hall
+ [Browse the market]
    -> market
+ [Call in at Hob's forge]
    -> forge
+ [Look in at the temple]
    -> temple
+ [Read the notice board]
    -> notice_board
+ {has_flag("took_bounty")} [Set out for Dunn's Mill]
    -> ch1_to_the_mill

=== reeve_hall ===
Reeve Ansel Corbin's hall is a long room full of ledgers and worried people. The reeve himself is a thin man with ink on his cuffs and the look of someone who hasn't slept since the goblins came. Behind him, Captain Holt Varrow of the watch leans against the wall with his arms folded, scarred and unimpressed. #location:Bramblegate, the reeve's hall

"You answered the call," Corbin says, faintly surprised that anybody did. "Then here's the job. Find Garrick Dunn and bring him home. Put a stop to the goblin raids. Fifty gold when it's done."

"And ten silver a goblin ear," Varrow adds. "Bring me ears."

* [Take the job. Fifty gold is fifty gold. #drive:wealth]
    ~ drive_moment("wealth")
    "Fifty gold," you say. "Half up front would be friendlier." Corbin's face says that it would not. Still, you shake on it.
* [Take the job. Nobody should vanish without someone looking for them. #drive:justice]
    ~ drive_moment("justice")
    "A man's gone missing from his own home," you say. "Somebody ought to look. It might as well be me." Corbin blinks, as if he'd forgotten people said things like that, and shakes your hand.
* [Take the job. Bramblegate will remember who brought its miller home. #drive:glory]
    ~ drive_moment("glory")
    "When this is done," you say, "they'll be telling the story in every tavern on the north road." Varrow snorts. Corbin just looks relieved that somebody is confident about something.
* [Take the job, and ask the captain what he makes of it]
    "I'll do it," you say. "Captain, what do you make of all this?" Varrow pushes off the wall. "Goblins," he says. "Vermin with knives. Burn the warren and the raids stop." Corbin winces, but he doesn't argue.

- "Dunn's Mill is down the brook road, south of town," Corbin says. "Start there. And please, hurry."
~ set_flag("took_bounty")
~ start_quest("missing-miller")
~ add_deed("Took Reeve Corbin's bounty: find Garrick Dunn and end the goblin raids.")
{has_flag("saw_barrow_light"):
    ~ quest_note("missing-miller", "Pale lights moved on the barrow hills the night you reached Bramblegate.")
}
{has_flag("heard_goblins_fled"):
    ~ note_goblins_fled()
}
-> bramblegate

=== market ===
{ market == 1:
    The market is six damp stalls and a great many opinions. A grocer sells rations, rope and lamp oil from the back of a cart. Beside him, under a patched awning, the apothecary Nan Burdock keeps a shelf of little red bottles behind a sign that says DO NOT TOUCH, underlined twice. #location:Bramblegate, the market
- else:
    The grocer waves. Nan Burdock watches your hands. #location:Bramblegate, the market
}
{not can_afford("potion-of-healing"): A Potion of Healing costs fifty gold. "Come back when the reeve's paid you," Nan says, not unkindly.}
-> stall

= stall
+ {can_afford("potion-of-healing")} [Buy a Potion of Healing #buy:potion-of-healing]
    ~ buy("potion-of-healing")
    Nan wraps the bottle in straw and makes you count the coins twice.
    -> stall
+ {can_afford("torch")} [Buy a torch #buy:torch]
    ~ buy("torch")
    The grocer hands over a torch, pitch-dipped and ready. "Mind the thatch."
    -> stall
+ {can_afford("rations")} [Buy a day's rations #buy:rations]
    ~ buy("rations")
    Hard biscuit, dried apple and a twist of smoked sausage, wrapped in a cloth. It'll keep. That's the best that can be said for it.
    -> stall
+ {can_afford("rope")} [Buy a coil of rope #buy:rope]
    ~ buy("rope")
    Fifty feet of good hemp. The grocer swears it's never been used to hang anyone, which is a strange thing to swear.
    -> stall
+ {can_afford("oil")} [Buy a flask of oil #buy:oil]
    ~ buy("oil")
    A stoppered clay flask of lamp oil. It smells like every long night you've ever had.
    -> stall
+ [Back to the square]
    -> bramblegate

=== forge ===
{ forge == 1:
    Hob's forge is hot, loud and cheerful, much like Hob: a gnome with singed eyebrows and a leather apron three sizes too big. "Blades! Buckles! Rumours, free with any purchase, or without one!" #location:Bramblegate, Hob's forge

    "Here's one," Hob says, leaning in. "A week back, my cousin's boy saw goblins running down off the barrow hills. Running away from them, mind, not towards them. Now what's a goblin scared of?"
    ~ set_flag("heard_goblins_fled")
    {has_flag("took_bounty"):
        ~ note_goblins_fled()
    }
- else:
    Hob looks up from his anvil and waves his hammer at you. "Back again! Nobody ever comes back. It's the noise." #location:Bramblegate, Hob's forge
}
* [Ask Hob everything he knows about the barrows #drive:knowledge]
    ~ drive_moment("knowledge")
    Hob is delighted to be asked. Kings were buried up there in the old days, he says, with their swords and their crowns and their grudges. "Nobody's dug in those hills for a hundred years. Bad luck. Worse drainage."

    "The big one's the Kings' Barrow," he adds, quieter. "Folk say it's never been opened. Folk say a lot of things."
    -> forge
+ [Back to the square]
    -> bramblegate

=== temple ===
{ temple == 1:
    The Temple of the Steadfast Flame is cool and dim, lit by one great candle that never quite goes out. Prior Jessamy Crane is trimming its wick: a soft-spoken man with ink on his fingers and a nervous smile. #location:Bramblegate, the temple

    "All are welcome at the Flame," he says. "Even at this hour. Especially at this hour."
- else:
    Prior Crane looks up from the great candle and nods. #location:Bramblegate, the temple
}
* [Pray for the missing miller #drive:faith]
    ~ drive_moment("faith")
    You kneel before the Flame and pray for Garrick Dunn, wherever he is. After a moment the Prior kneels beside you. Neither of you says anything. It helps more than you expected.
    -> temple
* [Ask the Prior about the barrows #check:insight:15]
    "The barrows?" He talks easily enough about old kings and sacred rest and the Flame's duty to the dead.
    { check("insight", 15):
        ~ set_flag("crane_hiding_something")
        But his hand shakes on the candle snuffer every time you say "Kings' Barrow", and he never quite meets your eyes. He's hiding something.
    - else:
        He seems like a kind man having a bad week. Who isn't, in Bramblegate?
    }
    -> temple
+ [Back to the square]
    -> bramblegate

=== notice_board ===
The notice board is a slab of oak by the well, pocked with old nail holes. #location:Bramblegate, the square

CAPABLE FOLK WANTED. The dead walk and goblins raid. Apply to Reeve Corbin. Payment on results.

TEN SILVER PER GOBLIN EAR, paid at the watch-house. By order of Captain H. Varrow.

LOST: one grey cat, answers to Biscuit, does not answer to anything else. Ask at the Tallow and Thistle.

{not has_flag("tore_down_notice"): WANTED: runaway bond-servant Tobin Reed, aged fourteen. Reward for his return from Master Fulke, tanner.}

* [Tear down the notice about the runaway #drive:freedom]
    ~ drive_moment("freedom")
    ~ set_flag("tore_down_notice")
    You tear it down, fold it small and drop it down the well. Nobody stops you. An old woman drawing water gives you a nod that says she'd have done it herself, if her knees were younger.
    -> notice_board
+ [Back to the square]
    -> bramblegate

=== lark ===
You've barely stepped back into the square when a girl of about fourteen plants herself in your path. She has flour in her hair, a hatchet in her belt that's far too big for her, and a stubborn jaw. #location:Bramblegate, the square

"You're the one the reeve hired," she says. "I'm Lark. Lark Dunn. Garrick's my da." She glances towards the watch-house and drops her voice. "Everyone says goblins. But goblins don't take people. They take flour and chickens, and they run. Something else took my da."

* [Promise her you'll bring him home #drive:kinship]
    ~ drive_moment("kinship")
    "I'll bring him home," you say. She looks at you hard, the way people do when they've been promised things before. Then she nods, once.
* [Ask what makes her so sure]
    "Because I know goblins," she says. "They've squabbled over our hens for years. They never took anybody. Not once."
* [Tell her to go home and leave it to you]
    "Home's where it happened," she says flatly, and for a moment she looks every bit of fourteen. Then the jaw comes back. "Just find him."

- She's gone before you can say anything else, darting off between the market stalls.
~ set_flag("met_lark")
~ quest_note("missing-miller", "Lark Dunn, the miller's daughter, says goblins don't take people. Something else took her father.")
-> bramblegate

=== ch1_to_the_mill ===
You take the brook road south, out past the last cottages and the drowned turnip fields. The rain has stopped, but everything still drips. #location:The brook road
-> ch1_mill

=== function note_goblins_fled() ===
~ quest_note("missing-miller", "Hob says goblins were seen running down off the barrow hills a week before the raid, as if something had scared them.")
