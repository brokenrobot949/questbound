// Chapter 2 · The Barrow Road, beat 3: Fen in the stocks (docs/STORY.md).
//
// The afternoon after Lark's rescue, Fen Underbough is in the stocks in Bramblegate's market
// square, caught with the reeve's purse: a day in the stocks, or a 10 gold fine. He knows where
// the Choir is taking Garrick Dunn, because he used to sing with them. A Rogue who read the
// chalk marks in Chapter 1 (read_cant_marks) knows him for the songbird with the bounty on him.
// Then Mercy Gaunt's bounty hunters ride in with a Choir writ: "Dead or alive. The Choir pays
// double for dead." He walks free at sundown, so they sit down to wait.
//
// The ways it can go (Rob chose them, Oct 11, 2026):
//   Pay his fine, or talk Captain Varrow round (a Justice moment): he's released by law, and
//     the hunters back off rather than fight in front of the watch-house.
//   Pick the padlock (Thieves' Tools; Fen +1 for cleverness) or cast Knock (very loud): he's
//     out, but not by law, so the hunters draw. Face them down (Intimidation) or fight.
//   Fight for him (a Freedom moment): Fen springs the lock himself with a nail he's worked at
//     all day, and fights beside you (stocks-hunters, Moderate for three).
//   Sell him: take Gaunt's 10 gold and walk on (a Wealth moment; Odda -1).
//   Leave him: the hunters take him at sundown. Nettle's goblins (if they're camped at the
//     mill) or Varrow give the lead instead.
// Any way of getting him clear of the hunters is worth their 500 XP (the fight gives its own).
// After a won fight, Varrow means to hang Gaunt: speak for her (Fen +1 for sparing people,
// Odda +1 for mercy), or let him (Fen -1: he hates hangings).
// Losing the fight is Fate's Mercy: the watch comes running, and the hunters drop Fen in the
// horse trough and run, with your purse.
// Sold or left behind, Fen escapes the hunters and turns up later, sour (fen_sold,
// fen_left_behind). That's the Old Ford's scene (beat 5), not written yet.
// Fen's lead: the Choir's camp at Cairnfield, past the Old Ford. They took Garrick because
// they need someone who knows water and wheels.
// Spells: Knock opens the padlock.

=== ch2_stocks ===
The rain has blown through by the afternoon, and Bramblegate's market square is full of people making up for a wet morning: hens in baskets, a knife-grinder's wheel, somebody's goat eating somebody else's cabbages. #location:Bramblegate, the market square #time:Afternoon

In the middle of it all stand the town stocks: a heavy oak board on two posts, with a padlock the size of a fist. Locked in it by the neck and wrists is a halfling with his hood down and his brown hair full of turnip peel. A slate hangs from the board: THIEF. THE REEVE'S PURSE. ONE DAY, OR TEN GOLD. Beside him, an old watchman dozes on an upturned bucket with his pike across his knees.

The halfling sees you, and his whole face lights up. "You! The one who went down the hole after the miller's girl. The whole town's talking about it." He jerks his chin, which is all he can jerk. "Come here a moment. Closer. I don't bite. I'm not in a position to." #speaker:fen

"I know where they're taking your miller," he says, low and fast. "I used to sing with them." #speaker:fen
-> talk

// Questions loop back here, not to the greeting.
= talk
* [Ask who he is]
    "Fen Underbough," he says. "Thief, liar and former choirboy, at your service, as soon as somebody gets this plank off my neck." #speaker:fen
    -> talk
* [Ask who he used to sing with]
    "The Choir. Grey robes, sad songs, digging up people's grandmothers." He isn't smiling now. "I sang for them two winters, before I worked out what the songs were for. Then I left. They don't let people leave. Not people who take things with them." #speaker:fen
    -> talk
* {has_flag("read_cant_marks")} [Tell him you read the chalk mark on the notice post]
    You tell him in the cant, with two fingers against the board: a bird with its beak tied shut, over a coin.
    Fen goes very still. "So you're one of us," he says. "Then you know what it means. Somebody's paying to have the songbird shut up for good, and they'll be along to collect." #speaker:fen
    ~ set_flag("knew_fen_songbird")
    -> talk
* [Watch his face while he talks #check:insight:12]
    { check("insight", 12):
        He's lying about plenty: the purse, for a start, which he swears fell into his hand. But not about the Choir. When he says the word, his voice goes flat, like someone walking past a grave.
        ~ set_flag("fen_read_true")
    - else:
        He talks the way water runs downhill, easily and in every direction. You can't tell what's true in it, and you suspect he can't either.
    }
    -> talk
* [Ask where they're taking the miller]
    "Ah, no." He wags a finger, as far as the stocks allow, which is about a knuckle. "That's the bit that gets me out of here. Plank first, secrets after." #speaker:fen
    -> talk
+ [Decide what to do about him]
    -> hunters

= hunters
You're still deciding when hooves clatter in under the north gate. Three riders come up the street at a walk, and the market gets out of their way without being asked.

The one in front is a lean woman in a long oiled coat, with a crossbow slung across her back and a face like a hatchet left out in the rain. The two behind her are big men with the look of people who are paid by the day and by the bruise.

She reins in beside the stocks and looks down at Fen the way a cat looks at a mousehole. "Fen Underbough," she says pleasantly. "Mercy Gaunt. We've not met, but I've been reading about you." She unrolls a paper sealed in grey wax, stamped with a staff of music notes. "Wanted, for theft from the Choir of Ash." She smiles. "Dead or alive. The Choir pays double for dead." #speaker:gaunt

The watchman wakes with a snort. "He's the town's till sundown," he says. "Or till somebody pays his fine. Captain's orders." #speaker:tibb

"Sundown, then." Gaunt swings down, sits on a crate beside the stocks and starts to wind her crossbow, click by click. Her men wander off to the cider stall, where they can lean on something and still see the stocks. Then she notices you watching. "Friend of yours? No? Then walk on, and here's ten gold for your trouble. Saves everybody a scene." #speaker:gaunt

Fen looks at the sky, which is already going gold at the edges, and then at you. "Please," he says. #speaker:fen
{ companion_alive("odda"):
    "Choir money," Odda says under her breath, "buying a dead man in a town square." She looks at you. "Well?" #speaker:odda
}
~ set_objective("Decide what to do about Fen Underbough before sundown, when Mercy Gaunt's bounty hunters take him.")
-> choice

// Every way of getting him out. A failed try comes back here, without that way.
= choice
* {can_pay(10)} [Pay his fine #pay:10]
    ~ pay(10)
    -> fine_paid
* {has_flag("varrow_approves")} [Fetch Captain Varrow from the watch-house, and talk him round #check:persuasion:10 #drive:justice]
    -> varrow(10)
* {has_flag("varrow_wary")} [Fetch Captain Varrow from the watch-house, and talk him round #check:persuasion:15 #drive:justice]
    -> varrow(15)
* {not has_flag("varrow_approves") && not has_flag("varrow_wary")} [Fetch Captain Varrow from the watch-house, and talk him round #check:persuasion:13 #drive:justice]
    -> varrow(13)
* {has_item("thieves-tools")} [Pick the padlock while Gaunt winds her crossbow #check:thieves-tools:13]
    -> pick_lock
* {can_cast("knock")} [Knock the padlock open #spell:knock]
    ~ cast("knock")
    -> knocked
* [Tell Gaunt that if she wants him, she'll come through you #drive:freedom]
    -> break_out
* [Take Gaunt's ten gold, and walk on #drive:wealth]
    -> sold
* [Leave him to it: he's a thief, and it's none of yours]
    -> left

// ---- Freed by law: the hunters back off ----

= fine_paid
You count ten gold into the watchman's hand. He bites a coin, shrugs and finds the key on his belt. The padlock opens with a clank, and Fen comes out of the stocks like a cork out of a bottle, rubbing his neck.
~ free_fen()
~ add_deed("Paid Fen Underbough's fine, and walked him out of the stocks under a bounty hunter's nose.")
Gaunt stands. For a long moment she looks at you, and at{ companion_alive("odda"): Odda's mace, and at} the watch-house windows across the square, where somebody is watching. Then she shrugs and slings her crossbow. "Bought and paid for," she says. "Shame. Roads are long, halfling." #speaker:gaunt
-> backed_off

// Talking Captain Varrow round is easier if he liked how you dealt with the goblins.
= varrow(dc)
~ drive_moment("justice")
You cross the square to the watch-house. Captain Varrow is at his desk with a cold pie, and doesn't look pleased to see anyone. He listens, though, while you tell him the halfling knows where Garrick Dunn was taken, and that the woman on the crate is waving a writ from a choir, not a court.
{ check("persuasion", dc):
    -> varrow_agrees
- else:
    -> varrow_refuses
}

= varrow_agrees
Varrow puts down the pie. "The Choir of Ash," he says. "The same Choir that's digging up the barrow hills, and dragged a miller off his own floor?" He takes his key ring off its nail. "Come on, then."
He unlocks the stocks himself, hauls Fen out by the collar and sets him on his feet. "Released into the reeve's hire," he says, loud enough for the whole square. "If he steals so much as a spoon, I'm hanging the pair of you." #speaker:varrow
~ free_fen()
~ set_flag("varrow_freed_fen")
~ add_deed("Talked Captain Varrow into releasing Fen Underbough from the stocks, and sent the Choir's bounty hunters packing.")
Then he turns to Gaunt. "And you. That paper's from a choir, not a court, and this is Bramblegate. Be gone by sundown." #speaker:varrow
Gaunt looks at him, and at the two watchmen behind him with crossbows of their own. She shrugs and slings hers. "Roads are long, halfling," she says. #speaker:gaunt
-> backed_off

= varrow_refuses
Varrow hears you out, and goes back to his pie. "He stole from the reeve," he says. "He sits till sundown, like the slate says. What happens to him after that is no business of the town's, and none of yours." #speaker:varrow
You walk back across the square. Fen sees your face, and doesn't need telling.
-> choice

= backed_off
The three of them mount up and ride out under the north gate the way they came, unhurried. Gaunt doesn't look back once, and somehow that's worse than if she had.
~ set_flag("hunters_backed_off")
// The hunters' XP: getting Fen clear without a fight is worth the same.
~ give_xp(500)
-> fen_joins

// ---- Out, but not by law: the hunters draw ----

= pick_lock
You lean on the stocks beside Fen as if you've come to jeer at him, and slide your picks into the padlock under cover of your cloak.
{ check("thieves-tools", 13):
    It's a big lock, and a stupid one. Three pins and a twist, and it falls open in your palm.
    "Oh, lovely work," Fen breathes, and he's out from under the board before the watchman can blink. #speaker:fen
    ~ free_fen()
    ~ approve("fen", 1)
    ~ set_flag("picked_the_stocks")
    -> not_by_law
- else:
    A pick slips and scrapes loud across the iron. The watchman's eyes snap open. "Oi," he says. "Hands off the town's property." #speaker:tibb
    On her crate, Gaunt has stopped winding her crossbow. She smiles at you, and starts again.
    -> choice
}

= knocked
You point at the padlock and speak one hard word. The lock doesn't so much open as go off: a knock like a battering ram on a gate, loud enough to rattle every shutter round the square. Pigeons go up from all the roofs at once. The padlock springs open and drops onto the cobbles.
Fen is out from under the board before it lands.
~ free_fen()
~ set_flag("knocked_the_stocks")
-> not_by_law

= not_by_law
"Oi!" the watchman shouts, waving his pike. "That's the town's thief!" #speaker:tibb
Gaunt is already on her feet with her crossbow wound and loaded. "Well, now," she says. "Now he's an escaped thief, and nobody minds what happens to those." Her men come away from the cider stall, drawing their blades. #speaker:gaunt
-> stand_off

= stand_off
* [Face them down #check:intimidation:13]
    You step in front of Fen{ companion_alive("odda"): with Odda at your shoulder}, and tell Gaunt exactly what will happen to the first of them who comes at you.
    { check("intimidation", 13):
        Gaunt looks at you for a long moment over the crossbow. Then she lowers it. "Not for double," she says. "Not for triple." She whistles her men back to their horses. "Roads are long, halfling." #speaker:gaunt
        ~ set_flag("hunters_faced_down")
        ~ add_deed("Got Fen Underbough out of the stocks, and stared down the Choir's bounty hunters in the market square.")
        -> backed_off
    - else:
        Gaunt laughs. "That's a good speech," she says, and raises the crossbow. "Shame." #speaker:gaunt
        -> fight
    }
* [Fight them #combat:stocks-hunters]
    -> fought

// ---- Fighting for him ----

= break_out
~ drive_moment("freedom")
"He's not for sale," you say, loud enough for the whole square. "Not to the Choir. If you want him, you'll come through me."
Gaunt sighs, and stands. Her men put down their cups and come away from the cider stall, drawing their blades.
Behind you there's a click and a clank. You look round. The padlock is hanging open, and Fen is wriggling out from under the board with a bent nail between his teeth. "Been at it since breakfast," he says. "You bought me the last minute I needed." #speaker:fen
~ free_fen()
-> fight

= fight
* [Fight! #combat:stocks-hunters]
    -> fought

= fought
{ combat_won():
    -> hunters_beaten
- else:
    -> stocks_mercy
}

= hunters_beaten
~ set_flag("hunters_beaten")
~ add_deed("Fought off the Choir's bounty hunters in Bramblegate's market square, for Fen Underbough's sake.")
The last of the hunters goes down on the cobbles and stays there. Gaunt sits slumped against the stocks, groaning, her crossbow in pieces beside her. Her men aren't going anywhere either.
{ companion_alive("fen"):
    Fen fishes Gaunt's writ out of a puddle, reads it and tears it in half. "Double for dead," he says. "And look at me. Not even single." #speaker:fen
- else:
    Fen lies where he fell beside the stocks. You check, and keep checking, but he's gone.
    ~ set_flag("fen_fell_at_the_stocks")
}
By now the watch is spilling out of the watch-house with Captain Varrow at the front. He looks at the hunters, and the blood on the cobbles, and at you.
"Drawing steel in my square," he says. "On the reeve's hire, in broad day." He nudges Gaunt with his boot. "That's a hanging, that is." #speaker:varrow
-> gaunt_fate

= gaunt_fate
* [Speak for her: there's been enough blood for one day]
    "Lock them up, take their horses, and run them out of town," you say. "That's enough."
    Varrow chews on it. "Their horses," he says at last, "and their coin, for the reeve's trouble. And if I ever see her face again, she hangs twice." #speaker:varrow
    ~ set_flag("gaunt_spared")
    ~ approve("fen", 1)
    ~ approve("odda", 1)
    { companion_alive("fen"):
        Fen gives you a long, odd look, as if you'd done a card trick he can't work out.
    }
* [Leave her to the captain's law]
    You shrug. It's the captain's town, and the captain's rope.
    ~ set_flag("gaunt_hanged")
    ~ approve("fen", -1)
    { companion_alive("fen"):
        Fen watches the watch drag her away, and doesn't say anything for a while. When he does, it's about the weather.
    }
- -> fen_joins

// ---- Fate's Mercy in the square ----

= stocks_mercy
// The watch comes running, and the hunters run: with your purse, but without Fen.
You come to on a narrow cot that smells of candle wax: the Temple of the Steadfast Flame{ has_flag("ossuary_fates_mercy") || has_flag("mill_fates_mercy") || has_flag("quarry_fates_mercy"):, again}. #location:Bramblegate, the temple #time:Morning
Captain Varrow sits on the bench across the room. "The whole square saw it," he says. "Three hired blades in my town, on the reeve's hire. My lads came running, and the hunters ran." He scowls. "With your purse." #speaker:varrow
~ lose_coins()
~ long_rest()
~ set_flag("hunters_fled")
~ set_flag("stocks_fates_mercy")
~ add_deed("Was beaten by the Choir's bounty hunters in Bramblegate's market square. They ran when the watch came, with your purse, and without Fen.")
{ companion_alive("fen"):
    "Didn't get me, though," says a voice from the end of your cot. Fen is sitting there eating your grapes, and he smells strongly of horse trough. "They had me over a saddle when the watch came. Dropped me in the trough and ran. Very undignified. I'd do it again." #speaker:fen
}
{ companion_alive("odda"):
    On the next cot, Odda sits up, feels her ribs one at a time, and says a word priests aren't supposed to know.
}
-> fen_joins

// ---- Fen joins ----

= fen_joins
{ not companion_alive("fen"):
    -> fen_lost
}
Later, over a pie at the Tallow and Thistle that Morwen won't let anyone pay for, Fen tells you the rest. #location:Bramblegate, the Tallow and Thistle
"Cairnfield," he says, with his mouth full. "Past the Old Ford, where the barrow road crosses the river. The Choir's camp is up there among the opened barrows. They took your miller because they need somebody who knows water and wheels. There's something under the Kings' Barrow that floods. That's all they told us choirboys." #speaker:fen
{ has_flag("hymnal_mended"):
    You unfold the hymnal's mended map. Cairnfield is the place ringed twice in red.
}
"And I'm coming with you," he says. "Don't look like that. The Choir wants me dead, and you seem to be the people who kill Choir. The safest place in Caldmere is right behind you." #speaker:fen
{ companion_alive("odda"):
    "A thief and a choirboy," Odda says into her tea. "Well, the Flame's had worse. Keep your hands where I can see them." #speaker:odda
    "Everybody says that," Fen says happily. #speaker:fen
}
~ quest_note("missing-miller", "Fen Underbough says the Choir's camp is at Cairnfield, past the Old Ford. They took Garrick because they need someone who knows water and wheels.")
-> road_north

// Fen died in the fight. He stays with the party, fallen, until he can be raised. The lead
// comes from the hunters' writ instead.
= fen_lost
Prior Crane has Fen carried to the temple and laid before the altar flame. "Thief or not, we'll keep him here under the Flame until he can be brought back," he says. "It can be done, at a price, by priests stronger than me." #speaker:crane
Gaunt's torn writ is still lying by the stocks. On the back, in a neat clerk's hand, it says: Deliver him, or proof of him, to the Choir of Ash at Cairnfield. Past the Old Ford, where the barrow road crosses the river.
~ quest_note("missing-miller", "The bounty hunters' writ says to deliver Fen to the Choir of Ash at Cairnfield, past the Old Ford.")
-> road_north

// ---- Without Fen: sold, or left behind ----

= sold
~ drive_moment("wealth")
You walk over to the crate. Gaunt counts ten gold into your palm without looking up from her crossbow.
~ give_coins(10)
~ set_flag("fen_sold")
~ approve("odda", -1)
~ add_deed("Took ten gold from a bounty hunter to leave Fen Underbough in the stocks.")
"Sensible," she says. And, because you asked: "Cairnfield. The Choir's camp past the Old Ford, where the barrow road crosses the river. They've got a big floury fellow up there working their sluices. Saw him myself." #speaker:gaunt
~ quest_note("missing-miller", "Mercy Gaunt, the bounty hunter, says the Choir's camp is at Cairnfield, past the Old Ford, and that she saw a big floury man working their sluices there.")
Behind you, Fen has gone quiet. When you look back, he's watching you with no expression at all. "I'll remember your face," he says. It doesn't sound like a threat. It sounds like a promise he's making to himself. #speaker:fen
{ companion_alive("odda"):
    Odda walks away from you across the square, and doesn't say a word to you for the rest of the day.
}
-> sundown

= left
You turn your back on the stocks and walk on.
"Wait!" Fen calls after you. "At least tell me your name, so I can curse it properly!" #speaker:fen
~ set_flag("fen_left_behind")
-> sundown

= sundown
At sundown, from the window of the Tallow and Thistle, you watch Gaunt's riders go out under the north gate. There's a small shape slung over the last saddle, and it's still kicking. #location:Bramblegate, the Tallow and Thistle #time:Dusk
{ has_flag("fen_sold"):
    -> road_north
}
{ has_flag("goblins_at_mill"):
    After dark, a goblin knocks at the inn's back door, and won't come in. "Mother Nettle sends," it says. "Singers took floury man north. Past the river crossing, to the place of broken hills. Cairnfield." It holds out a grubby hand. "Mother Nettle says: now you owe her." #speaker:goblin
    ~ set_flag("owe_nettle")
    ~ quest_note("missing-miller", "Nettle's goblins say the Choir took Garrick north, past the Old Ford, to Cairnfield. Now you owe Mother Nettle a favour.")
- else:
    Captain Varrow is drinking alone at the end of the bar. "Those hunters showed my gate their writ on the way out," he says, without looking round. "Deliver to the Choir of Ash, at Cairnfield, past the Old Ford." He drinks. "If your miller's anywhere, he's there." #speaker:varrow
    ~ quest_note("missing-miller", "The bounty hunters' writ said to deliver Fen to the Choir of Ash at Cairnfield, past the Old Ford. If Garrick is anywhere, Varrow thinks he's there.")
}
-> road_north

// ---- On to Chapter 2's next beats ----

= road_north
~ set_flag("heard_of_cairnfield")
~ set_objective("Take the barrow road north, past the Old Ford, to the Choir's camp at Cairnfield. (The rest of Chapter 2 is still being written.)")
-> END

// Fen is out of the stocks. He joins the party if there's room (there always is in the story:
// Odda is the only other companion so far).
=== function free_fen() ===
~ set_flag("fen_freed")
{ not in_party("fen") && not party_full():
    ~ join_party("fen")
}
