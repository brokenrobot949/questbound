// Chapter 2 · The Barrow Road, beats 1 and 2: the miller's missing daughter, and Odda
// Brasswick joining (docs/STORY.md).
//
// The morning after the lights on the hills, Lark Dunn is gone: her bed at the Tallow and
// Thistle hasn't been slept in, and her father's hatchet has gone with her. At Dunn's Mill you
// meet Odda Brasswick, a dwarf priest sent to look into the walking dead, who saw a girl with a
// lantern go into the cellar at first light. Odda joins you, and you go down together: a short
// delve on the dungeon map (the cellar, the old tunnel the dead dug clear, the bone niches the
// Choir emptied, and the ossuary).
// Two Ghouls keep Lark Paralyzed on a burial ledge. They've clawed her so often that the
// numbness has built up, and won't fade by itself for an hour: a story liberty Rob chose
// (Oct 10, 2026). In a fight, a Ghoul's Claw still lasts only until the end of the target's
// next turn. Win, and Lesser Restoration (the hero's, or Odda's from level 3) frees her at once,
// or you carry her out. Lose, and it's Fate's Mercy: Nettle's goblins (if they're camped at
// the mill) or Captain Varrow's watch come down with torches, and you wake in the temple.
// Odda's first approval moments: drawing the ghouls off Lark (+1, protecting the weak),
// robbing the opened coffins (-1), and Lark's question about her father (the truth +1, a
// comforting lie -1).
// Spells: Minor Illusion lures the ghouls away for a surprise attack; Lesser Restoration
// frees Lark.

=== ch2_morning ===
You sleep badly after that, and wake to grey light and rain on the shutters. Downstairs, the common room of the Tallow and Thistle smells of bacon. Morwen is standing at the foot of the stairs with a cup of tea gone cold in her hands. #location:Bramblegate, the Tallow and Thistle #time:Morning

"Have you seen Lark?" she says. "She's been sleeping in my back room since Garrick went. Her bed's not been touched. And her da's hatchet is gone off its hook, and my good lantern with it." #speaker:morwen

You can see her deciding not to cry in front of the breakfast customers. "She was on about the mill last night. Said she could hear digging under it, from the yard. I told her it was the brook." #speaker:morwen
~ start_quest("millers-daughter")
~ set_objective("Find Lark Dunn. She's gone to her father's mill.")

* [Promise Morwen you'll bring her back #drive:kinship]
    ~ drive_moment("kinship")
    "I'll bring her back," you say. Morwen nods hard, twice, and pushes a heel of bread with bacon in it into your hand. "Then eat that on the way," she says. #speaker:morwen
    -> ch2_mill
* [Run for the mill]
    You're out of the door before she's finished. Behind you, Morwen shouts something about breakfast.
    -> ch2_mill

=== ch2_mill ===
Dunn's Mill sits where the brook bends, its great wheel still. The door you last saw hanging off one hinge has been propped shut with a plank. #location:Dunn's Mill
{ has_flag("goblins_at_mill"):
    Nettle's goblins are camped in the yard under their lean-to of flour sacks. Half of them are asleep in a heap. The other half are watching a dwarf woman by the millstone, as if she might go off like a firework.
- else:
    The yard is empty, apart from a handcart, a little fire, and a dwarf woman sitting on the old millstone beside it.
}
She's broad and grey-robed, with auburn braids pinned up out of the way, a mace at her belt, and a tin kettle steaming at her feet. She's watching the mill door the way you'd watch a dog that might bite.
{ has_flag("met_odda"):
    "Well, if it isn't the wolf-bait," she says. "You've more colour in you than last time I saw you. Good. You'll need it." #speaker:odda
- else:
    "You'll be the one the reeve hired," she says, getting up. "Odda Brasswick, of the Steadfast Flame. My order sent me up from the mother-house to find out why the dead round here won't stay buried." #speaker:odda
}
"A girl went in there at first light," she says. "A lantern in one hand, and in the other a hatchet near as long as her arm. I shouted after her. She didn't stop. Then I put my ear to the floor and heard digging, a long way down." She kicks the kettle off the fire. "I'll not go down a hole after the dead on my own. I'm not daft. So I waited for whoever came running." #speaker:odda
{ has_flag("goblins_at_mill"):
    "Girl went down the hole," one of the goblins offers. "We not follow. Things down there eat goblins." It thinks about it. "Eat everybody." #speaker:goblin
}
"And here you are," Odda says. "Running." #speaker:odda
-> join

= join
* [Tell her you're glad of the company]
    "Glad of it," you say, and she grunts, as if that settles something.
    -> joined
* [Tell her you work alone]
    "Then you'll work alone with me a step behind you," Odda says, and takes up her mace. "That girl needs the two of us, and I think you know it." #speaker:odda
    -> joined

= joined
{ not in_party("odda"):
    ~ join_party("odda")
}
~ add_deed("Went down under Dunn's Mill after Lark Dunn, with Odda Brasswick of the Steadfast Flame.")
~ set_objective("Follow Lark down the old tunnel under the mill, with Odda.")
-> ch2_ossuary

=== ch2_ossuary ===
The cellar stairs creak under the two of you. The flour is still ankle-deep down here, but the hole in the corner, choked with rubble when you last saw it, has been dug clear. The rubble lies heaped on the boards, and no spade did that. Hands did. #room:mill-ossuary/cellar #location:Dunn's Mill, the cellar

A line of small boot prints runs through the flour, straight to the hole and down.
-> cellar

= cellar
* [Read the prints around the hole #check:survival:12]
    You crouch at the edge of the hole and look properly.
    { check("survival", 12):
        Lark's prints go down, an hour old at most. But over them are others: bare feet with long, hooked nails, two sets. They came up as far as the flour, turned round in it, and went back down after her.
        "Ghouls," Odda says behind you, very quietly. #speaker:odda
        ~ set_flag("saw_ghoul_tracks")
        ~ give_xp(25)
    - else:
        Lark's boots, the goblins' bare feet, your own old prints from the fight down here: the flour holds a dozen stories, and none of them clearly.
    }
    -> cellar
* [Climb down into the tunnel #go:tunnel]
    -> tunnel

// ---- Room 2: the old tunnel ----

= tunnel
The tunnel under the mill is old work: fitted stone, close-jointed, sloping steeply down into the dark. Last time you saw it, it was choked with rubble. Now it's been dug out, and the walls are scored where fingers clawed the stones loose and passed them back. #room:mill-ossuary/tunnel #location:Under Dunn's Mill, the old tunnel

Halfway down, Morwen's lantern lies on its side, still burning, its glass cracked. Beside it, four long scratches are gouged into the stone, at about the height of a girl's ankle.

Odda picks up the lantern and holds it high. "Ghouls," she says{ has_flag("saw_ghoul_tracks"):, again}. "Dead that eat the dead, and aren't fussy which. Their claws leave you stiff as a board for a few breaths. So keep moving, and don't let them rake you." #speaker:odda
{ companion_can_cast("odda", "lesser-restoration"):
    She taps the holy symbol at her neck. "And if one does, I'll have you loose before it bites." #speaker:odda
- else:
    "And if one does, shout. I'll come running." #speaker:odda
}
-> tunnel_on

= tunnel_on
* [Listen down the tunnel #check:perception:13]
    You hold your breath and listen.
    { check("perception", 13):
        Far below: a wet, patient gnawing, like a dog with a bone. And under it, quick and shallow and very close to panic, someone breathing. She's alive. And now you know just where they are.
        ~ set_flag("heard_lark")
    - else:
        Only water dripping somewhere, and Odda's breathing, and your own heart.
    }
    -> tunnel_on
* [Hurry on down #go:niches]
    -> niches

// ---- Room 3: the bone niches ----

= niches
The tunnel opens into a long, low gallery. Its walls are cut with niches, row on row, each one long enough to hold a body. They were full once. Now the coffins have been dragged out and pried open, and the bones of whoever lay in them are scattered across the floor. #room:mill-ossuary/niches #location:Under Dunn's Mill, the bone niches

Carved over every niche is a little crown, the same mark you saw on the lintel at the breach under Brackenhollow.

Among the bones lie the things the dead were buried with, flung aside: bronze rings gone green, a clay cup, a silver cloak pin shaped like a leaf. Whoever opened these coffins wanted what was in them, and it wasn't the silver.

Odda stands in the middle of it all for a long moment and says nothing. Then: "They took the dead to dig for them," she says, "and threw the rest away like peelings." #speaker:odda
-> niches_on

= niches_on
* [Read the carvings over the niches #check:history:12]
    You hold the lantern up to the nearest lintel.
    { check("history", 12):
        The work is older than Bramblegate, older than the road. The crowns are the old kings' mark: whoever was buried here served the Kings' Barrow, and was laid to rest near their masters. If this place belongs to the barrow, then the barrow's old ways run under half the valley.
        ~ set_flag("ossuary_history")
        ~ quest_note("missing-miller", "The bone niches under Dunn's Mill carry the crown mark of the Kings' Barrow. The barrow's old tunnels may run under half the valley.")
    - else:
        Crowns, and names worn down to nothing. Whoever these people were, they've been dead a very long time.
    }
    -> niches_on
* [Pocket the silver pin: the dead won't miss it #drive:wealth]
    ~ drive_moment("wealth")
    You pick up the leaf-shaped pin and turn it to the light. It's good work, and heavy: worth a few gold in any town.
    ~ give_coins(5)
    ~ approve("odda", -1)
    ~ set_flag("robbed_the_niches")
    Odda watches you put it away. She doesn't say anything at all, which is worse.
    -> niches_on
* [Go on, towards the gnawing #go:ossuary]
    -> ossuary

// ---- Room 4: the ossuary ----

= ossuary
~ set_objective("Get Lark away from the ghouls.")
The gallery ends in a vault where the old bones went when the niches were full: skulls stacked in neat walls up to the roof, and thigh bones packed like firewood. The lantern makes a hundred empty eyes glitter. #room:mill-ossuary/ossuary #location:Under Dunn's Mill, the ossuary

High in the far wall, in a burial niche, lies Lark Dunn. She's rigid, her eyes wide open, and her father's hatchet is still clenched in her fist.

Below her crouch two ghouls: grey, long-limbed things that were people once, with too many teeth. One gnaws at an old bone. The other watches Lark, and every time her fingers so much as twitch, it springs up the wall, rakes her ankle with its claws, and drops back down. She goes stiff again.

"They've been at that all morning, by the look of her," Odda breathes. "A ghoul's numbness fades in a few breaths, but rake a body often enough and it soaks right in. She'll not move by herself for an hour." #speaker:odda
-> approach

= approach
* {has_flag("heard_lark")} [Creep in while they're busy with her #check:stealth:10]
    -> creep(10)
* {not has_flag("heard_lark")} [Creep in while they're busy with her #check:stealth:12]
    -> creep(12)
* {can_cast("minor-illusion")} [Make a sound on the far side of the vault #spell:minor-illusion]
    ~ cast("minor-illusion")
    You flick your fingers, and from the darkest corner of the vault comes a whimper, small and frightened, exactly like a child's. It isn't real, but the ghouls don't know that. Both of them scuttle off to look, and turn their backs on you.
    -> ghouls_unseen
* [Shout to draw them away from her]
    ~ approve("odda", 1)
    You shout, loud enough to bring dust down off the skulls. Both ghouls' heads snap round, and Lark is forgotten. They drop to all fours and come for you, fast and low.
    "Good," Odda says, hefting her mace. "Better us than her." #speaker:odda
    -> ghouls_come

// Sneaking in: easier if you heard just where they were from the tunnel.
= creep(dc)
You edge in along the wall of skulls with Odda a step behind, both of you keeping to the shadows while the ghouls watch their prize.
{ check("stealth", dc):
    -> ghouls_unseen
- else:
    A skull slides out of the wall under your hand and goes clattering across the floor. Both ghouls turn at once, and come for you, low and fast.
    -> ghouls_come
}

= ghouls_unseen
You're three strides from them before either one looks round.
* [Strike! #combat:ossuary-ghouls #surprise]
    -> ghouls_fought

= ghouls_come
* [Fight them #combat:ossuary-ghouls]
    -> ghouls_fought

= ghouls_fought
{ combat_won():
    ~ set_flag("ossuary_ghouls_destroyed")
    -> ghouls_beaten
- else:
    -> ossuary_mercy
}

= ghouls_beaten
The last ghoul folds up among the bones, and this time it stays down. The vault is very quiet.
{ companion_alive("odda"):
    Odda leans on her mace, breathing hard. "Well," she says. "That's them told." #speaker:odda
- else:
    Odda lies where she fell among the skulls. You check, and keep checking, but she's gone.
    ~ set_flag("odda_fell_in_ossuary")
}
Up in her niche, Lark hasn't moved. Her eyes follow you, wide and wet, and that's all they can do.
~ set_objective("Free Lark, and get her out of here.")
-> free_lark

= free_lark
* {can_cast("lesser-restoration")} [Free her with Lesser Restoration #spell:lesser-restoration]
    ~ cast("lesser-restoration")
    You reach up and lay your hand over the scratches on her ankle, and speak the words. Warmth floods back into her after them, like blood into a numb hand.
    -> lark_moves
* {companion_can_cast("odda", "lesser-restoration")} [Ask Odda to free her #spell:lesser-restoration #by:odda]
    ~ companion_cast("odda", "lesser-restoration")
    Odda reaches up, lays two thick fingers on Lark's ankle, and murmurs a prayer to the Flame. Warmth floods back into the girl after it, like blood into a numb hand.
    -> lark_moves
* [Lift her down and carry her out]
    -> lark_carried

= lark_moves
~ set_flag("lark_rescued")
~ set_flag("lark_restored")
Lark draws one huge, shuddering breath and sits bolt upright. "I couldn't move," she says. "I could hear everything, and I couldn't—" Then she's down off the ledge with her arms round your neck, hatchet and all. #speaker:lark
-> lark_found

= lark_carried
~ set_flag("lark_rescued")
~ set_flag("lark_carried_out")
You reach up and lift her out of the niche. She's light, and stiff as a plank, and cold all through. You carry her back through the gallery and up the long tunnel{ companion_alive("odda"):, with Odda ahead of you holding the lantern high}.
Halfway up, her fingers start to twitch. By the cellar she can turn her head. By the time you lay her down on the millstone in the yard, in the grey daylight, she's crying, which you decide is a very good sign. #room:none #location:Dunn's Mill
-> lark_found

// ---- Fate's Mercy under the mill ----

= ossuary_mercy
// Help comes down with torches: Nettle's goblins, if they're camped at the mill; otherwise
// Captain Varrow's watch, which Morwen roused. Either way, Lark comes up alive.
You come to on a narrow cot that smells of candle wax: the Temple of the Steadfast Flame{ has_flag("mill_fates_mercy") || has_flag("quarry_fates_mercy"):, again}. Lark Dunn is asleep in a chair by the door, her father's hatchet across her knees. #room:none #location:Bramblegate, the temple #time:Morning
{ has_flag("goblins_at_mill"):
    "Goblins brought you in," Prior Crane says from the doorway. "A dozen of them, at dusk, with the three of you piled on a handcart. They said the mill people are theirs now, and the dead don't get to eat them." He shakes his head. "Warden Pike nearly had a fit." #speaker:crane
- else:
    Captain Varrow sits on a bench across the room, scraping grave-muck off a spear. "Morwen raised the whole watch when the girl went missing," he says. "We went down with torches. Those things don't like fire. They ran, down into the dark." He looks at you. "You were breathing. Just." #speaker:varrow
}
~ lose_coins()
~ long_rest()
~ set_flag("ossuary_ghouls_fled")
~ set_flag("lark_rescued")
~ set_flag("ossuary_fates_mercy")
~ add_deed("Was beaten by ghouls under Dunn's Mill. Lark Dunn was carried out alive.")
Your purse is somewhere down among the bones, and nobody is going back for it.
{ companion_alive("odda"):
    On the next cot, Odda sits up, grey-faced, and feels her ribs one at a time. "Next time," she says, "we bring more friends." #speaker:odda
}
-> lark_found

// ---- Lark ----

= lark_found
{ has_flag("ossuary_fates_mercy"):
    Lark wakes when you sit up, and comes to perch on the end of your cot. She's pale and stiff, but she can move. In her fist is a red neckerchief, gone white with flour at the folds.
- else:
    When she can talk properly, Lark opens her other fist. In it is a red neckerchief, gone white with flour at the folds.
}
"It's Da's," she says. "It was knotted on a nail in the room with all the skulls, by an old door they've filled up with rubble. He ties knots like that, doubled, so they don't slip." She wipes her nose on her sleeve. "They brought him down that way, and he was leaving a trail." #speaker:lark
~ set_flag("found_garrick_neckerchief")
~ quest_note("missing-miller", "Lark found her father's neckerchief knotted on a nail by a rubble-choked door in the ossuary under the mill. Garrick was taken that way alive, and he was leaving a trail.")
Then she looks up at you, and her jaw sets the way it did in the market square. "Is he alive?" she says. "Don't tell me he's fine. Tell me true." #speaker:lark
* [Tell her the truth: you don't know, but they need him alive]
    "I don't know," you say. "But they didn't kill him at the mill, and they didn't kill him down there. They took him for a reason, and whatever it is, they need him alive for it."
    Lark takes that in. Then she nods, slowly, the way you'd nod at a hard sum that comes out right. "Then there's time," she says. #speaker:lark
    { companion_alive("odda"):
        Odda gives you a long look, and the smallest nod.
        ~ approve("odda", 1)
    }
* [Tell her he's alive, and he's fine]
    "He's alive," you say. "He's fine. I'm sure of it."
    Lark wants to believe you so badly that she does. Her shoulders come down for the first time since you found her.
    { companion_alive("odda"):
        Behind her, Odda frowns at you, and says nothing.
        ~ approve("odda", -1)
    }
* [Promise her you'll bring him home #drive:kinship]
    ~ drive_moment("kinship")
    "I'll bring him home," you say. "Whatever it takes."
    Lark looks at you for a long moment. "You'd better," she says. #speaker:lark
- -> apprentice

= apprentice
"Teach me," Lark says. "How to fight like that. How to go down holes and come back up. I'll be your apprentice. I'm strong, I'm not scared of anything, I can carry things—" She considers. "I'm not scared of most things." #speaker:lark
* [Tell her to ask you again when her father's home]
    "Ask me again when your da's home," you say, "and he says yes."
    Lark opens her mouth to argue, and shuts it again. "He'll say yes," she says. "I'll make him." #speaker:lark
    ~ set_flag("lark_apprentice_later")
* [Tell her she already is one]
    "You went down a hole after ghouls, alone, with a hatchet," you say. "You're already as daft as the rest of us."
    Lark grins at you: the first grin you've seen on her. "Right," she says. "Right. What do I do first?" #speaker:lark
    ~ set_flag("lark_apprentice")
* [Tell her no: she's to stay home, and stay alive]
    "No," you say. "You stay home, and you stay alive. That's the job."
    Lark scowls at you, but she doesn't argue, and from Lark, that's something.
    ~ set_flag("lark_stays_home")
- -> climb_out

= climb_out
{ has_flag("lark_restored"):
    -> up_and_out
}
-> home

= up_and_out
* [Climb back up to the daylight]
    You climb back up through the gallery and the long tunnel, Lark in the middle where it's safest{ companion_alive("odda"): and Odda at the back, humming a hymn to keep the dark in its place}. Then the cellar, the stairs, and the yard and the grey morning, which has never looked so good. #room:none #location:Dunn's Mill
    -> home

// ---- Home ----

= home
{ has_flag("ossuary_fates_mercy"):
    You walk Lark across the square to the Tallow and Thistle. #location:Bramblegate
- else:
    You walk Lark back up the brook road to Bramblegate{ companion_alive("odda"):, Odda pushing her handcart behind with the kettle rattling in it}. #location:The brook road
}
Morwen sees you from the inn door and comes across the square at a run, apron and all. She grabs Lark, holds her at arm's length, shakes her, hugs her, shakes her again, and then bursts into tears, which sets Lark off too. #location:Bramblegate, the Tallow and Thistle #time:Midday

"Breakfast," Morwen says at last, wiping her face. "All of you. Now. I don't care what time it is." #speaker:morwen
~ finish_quest("millers-daughter")
~ give_xp(100)
~ add_deed("Brought Lark Dunn up alive from the ossuary under her father's mill.")
{ companion_alive("odda"):
    -> odda_stays
}
-> odda_lost

= odda_stays
Odda eats like someone who's been on the road a week, then sits back with a pot of tea she brewed herself, because she doesn't trust anyone else's.

"I came up here to find out why the dead won't lie down," she says. "Seems to me you're going the same way, and you're handy in a hole. So I'll come along, if it's all the same to you. Somebody has to keep you breathing." #speaker:odda

"I'm lodging at the temple, for my sins," she adds. "Your Prior keeps his ledgers locked and his face shut. In my experience, that means debts." She sniffs her tea. "Not my business. Yet." #speaker:odda
~ set_objective("Find out where the Choir took Garrick Dunn, with Odda beside you. (The rest of Chapter 2 is still being written.)")
-> END

// Odda died in the ossuary fight. She stays with the party, fallen, until she can be raised.
= odda_lost
Prior Crane takes Odda Brasswick in at the temple, and lays her before the altar flame. "She was one of ours," he says quietly. "We'll keep her here under the Flame until she can be brought back. It can be done, at a price, by priests stronger than me." #speaker:crane
~ set_objective("Find out where the Choir took Garrick Dunn. (The rest of Chapter 2 is still being written.)")
-> END
