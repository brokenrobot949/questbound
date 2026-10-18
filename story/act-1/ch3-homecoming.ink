// Chapter 3 · The Kings' Barrow, beat 7: Bramblegate's thanks, and the end of Act I
// (docs/STORY.md).
//
// Rob's choices, Oct 17, 2026:
//   Knight-Captain Beatrix Marchbank "requests" the shard for the Lord Regent. Agree, refuse or
//     put her off (marchbank_agreed, marchbank_refused, marchbank_put_off); or hold it out to
//     her, and it's back in your palm (marchbank_saw_it_return). She rides south with you in
//     Chapter 4 whatever you say. If you go up to bed without hearing her out, she stops you on
//     the stair.
//   Hesper Wildmoor, the old woman with the owl: go over, and she says a few words and is gone
//     (met_hesper). Or turn the shard on her to learn her name, its second use (named_hesper, a
//     flag for the Whisper), and she tells you not to do it again.
//   An Odda who dislikes you stays anyway, for the shard (odda_stays_for_the_shard).
// The rest:
//   The walk home with Garrick, and Lark at the north gate (garrick_home). If Lark was to ask
//     again when her father was home, she asks at the feast (lark_apprentice, lark_stays_home).
//   The temple, if anyone lies dead or the Rival is wounded: the great candle raises the dead if
//     it isn't spent (flame_spent, odda_raised, fen_raised); if it is, they wait for Act II's
//     temples. With Crane in the cells, Varrow brings him up to light it. The wounded Rival goes
//     to the temple's surgeon.
//   The feast at the Tallow and Thistle: the reeve pays the other 25 gold, and The Missing Miller
//     is done (200 XP). A Free League courier slips you a letter (league-letter in the pack).
//   The Rival asks to hold the shard (rival_held_the_shard, rival_refused_the_shard), and is gone
//     by morning (rival_left_bramblegate): in Act II they've joined the Choir.
//   That night the shard says your name again, and you reach level 5 (xp_milestone(5)). In the
//     morning it pulls south. Then one last morning in Bramblegate, for any side quests still
//     undone, and the End of Act I (act1-last-morning.ink: act1_last_morning, act1_end).

// ---- The great gate, at dawn: Garrick asks "Is it done?" ----

=== ch3_homecoming ===
~ set_objective("Take Garrick home to Bramblegate.")
* [Tell him it's done]
    "It's done," you tell him.
    Garrick lets his breath out slowly, and looks past you at the open gate as if something might still come up out of it. Nothing does. "Then I'd like to go home," he says, "if it's all the same to you. I've a girl to see." #speaker:garrick
* [Show him what flew to your hand]
    You take the shard out and show him. Garrick looks at the sliver of gold in your palm for a long time, and doesn't touch it.
    "That's what all the singing was for?" he says. "Put it away. I've had enough of things from under hills to last me." #speaker:garrick
* [Tell him the singing's over, but you don't think it's done]
    "The singing's over," you tell him. "I don't think it's done."
    Garrick nods slowly, as if that's about what he expected. "Nothing ever is," he says. "I'd like to go home anyway, if it's all the same to you. I've a girl to see." #speaker:garrick
- -> the_road

// Two days down the barrow road, carrying the fallen.
= the_road
You go home the way you came: down off the moor, past {has_flag("cairnfield_won"):the cold ashes of the Choir's camp|the Choir's empty tents} at Cairnfield, and south along the barrow road. It's two days' walk, and Garrick talks about Lark for most of it. #room:none #location:The barrow road #time:Morning
{ carried("odda") || carried("fen"):
    { has_flag("varrow_rallied"):
        Varrow's watch carry the fallen on a litter of spears and cloaks, and take their turns at it without being asked.
    - else:
        You carry the fallen on a litter of hazel poles and cloaks, and Garrick takes the heavy end without being asked.
    }
}
{ has_flag("rival_wounded"):
    {bond_name()} leans on your shoulder the whole way, and says it's for your benefit.
}
{ has_flag("nettle_rallied"):
    Nettle's goblins melt away into the heather on the first morning, shrieking happily, in the direction of Dunn's Mill. You have a feeling you'll see them again.
}
{ has_flag("ford_fell"):
    At the Old Ford, the new graves on the north bank have a green haze of grass on them already. You don't stop. #location:The Old Ford
- else:
    At the Old Ford the watch-post turns out to cheer you over the river, and puts you all on its supply cart for the rest of the way. #location:The Old Ford
}
On the second evening Bramblegate's roofs come up out of the dusk, with the smoke of every chimney going straight up into a still sky. Somebody is sitting on the mounting block by the north gate. #location:Bramblegate, north gate #time:Dusk
+ [Walk the last of the way]
    -> lark_at_the_gate

// Lark, at the north gate.
= lark_at_the_gate
It's Lark. She sees you first, and stands up. Then she sees who's walking beside you, and she's off the block and running, and her father's hatchet lies in the road behind her where she dropped it.
Garrick goes down on his knees in the road and catches her, and for a long time neither of them says anything at all.
"You went down after me," Garrick says at last, into her hair. "Down a hole. With my hatchet." #speaker:garrick
"Somebody had to," says Lark. #speaker:lark
Up on the wall, Warden Pike has found something very interesting to look at in the other direction.
~ set_flag("garrick_home")
~ add_deed("Brought Garrick Dunn home to Bramblegate, and to Lark.")
{
    - has_flag("lark_apprentice"):
        Garrick looks at you over Lark's head. "Apprentice, is it," he says. "Then you bring her back in one piece. Every time." #speaker:garrick
    - has_flag("lark_stays_home"):
        "I stayed home," Lark tells you fiercely, over her father's shoulder. "And I stayed alive. Like you said." #speaker:lark
}
+ {lies_in_state("odda") || lies_in_state("fen") || has_flag("rival_wounded")} [Go up to the temple first]
    -> up_to_the_temple
+ {not (lies_in_state("odda") || lies_in_state("fen") || has_flag("rival_wounded"))} [Go to the Tallow and Thistle]
    -> ch3_feast

// The temple: the great candle, the fallen, and the wounded Rival.
= up_to_the_temple
The Temple of the Steadfast Flame is cool and dim, and smells of candle wax and old stone, as it always does. #location:Bramblegate, the temple
{
    - has_flag("crane_exposed"):
        With Prior Crane in Captain Varrow's cells, two lay sisters have kept the temple, and the town's goodwill has kept them. They take one look at you, and send a boy running for the captain.
    - has_flag("crane_blackmailed"):
        Prior Crane is at the altar. He sees you, and his face does something complicated, and then he comes to help anyway.
    - has_flag("crane_confessed"):
        Prior Crane is at the altar, with a letter from the mother-house open on the step beside him. His penance, it seems, is to stay, and keep the Flame, and be looked at. He gets up the moment he sees you.
    - else:
        Prior Crane is at the altar, and gets up the moment he sees you.
}
{ carried("odda") || carried("fen"):
    You lay the fallen before the altar flame, under clean white linen.
}
{ lies_in_state("odda") || lies_in_state("fen"):
    { has_flag("flame_spent"):
        -> waiting ->
    - else:
        -> candle ->
    }
}
{ has_flag("rival_wounded"):
    -> surgeon ->
}
+ [Go down to the Tallow and Thistle]
    -> ch3_feast

// The great candle, unspent: it calls back anyone lying before the altar.
= candle
{ has_flag("crane_exposed"):
    Captain Varrow comes in a quarter of an hour later, with Prior Crane beside him in irons. "He asked," Varrow says shortly. "Every day since you went: if anyone came home dead, he'd be the one. I said I'd think about it." He looks at the linen before the altar. "I've thought." #speaker:varrow
}
Prior Crane lifts the great candle down from its iron stand{has_flag("crane_exposed"):, awkwardly, in his irons}. "Once in its life," he says. "For someone who fell holding back the dark. I can't think of anyone it was made for more." #speaker:crane
He holds it over them and says the old words. The Flame roars up white, and the whole tall candle burns down to a stub in the space of a breath, and goes out.
~ set_flag("flame_spent")
~ temp odda_rises = lies_in_state("odda")
~ temp fen_rises = lies_in_state("fen")
{ odda_rises:
    ~ raise_companion("odda")
    ~ set_flag("odda_raised")
}
{ fen_rises:
    ~ raise_companion("fen")
    ~ set_flag("fen_raised")
}
{ odda_rises:
    In the dark, Odda opens her eyes, and sees the cold stub in the Prior's hands. "Oh, Jessamy," she says. "Not the great candle. Not for me." #speaker:odda
}
{ fen_rises:
    Fen sits up with a gasp, and pats himself all over. "Did we win?" he says. "Tell me we won. I'd hate to have died for a draw." #speaker:fen
}
"It was the least I owed," says Prior Crane, and this time everybody knows what he means. #speaker:crane
->->

// The great candle was spent in Chapter 2: the fallen wait for Act II's temples.
= waiting
{
    - lies_in_state("odda") && lies_in_state("fen"):
        Odda and Fen lie side by side before the altar flame, under clean white linen.
    - lies_in_state("odda"):
        Odda lies before the altar flame, under clean white linen.
    - else:
        Fen lies before the altar flame, under clean white linen, looking smaller than ever.
}
{ has_flag("crane_exposed"):
    The great candle was spent long since, the sisters tell you. But the Prior has written to the mother-house from his cell, and there are priests there who can do what the candle did. It may be a long while.
- else:
    "The great candle's spent," Prior Crane says. "But I've written to the mother-house. There are priests there who can do what it did, and they'll come, or send. It may be a long while." #speaker:crane
}
Until then, they'll lie here before the Flame, and nobody in Bramblegate will forget them.
->->

// A wounded Rival goes to the temple's surgeon.
= surgeon
The temple's surgeon, a brisk lay sister with forearms like a smith's, takes one look at {bond_name()} and puts them to bed in the infirmary behind the altar.
"I'll be at the feast," your rival calls after you. #speaker:rival
They won't be.
->->

// A companion who fell in the barrow, and was carried home: not one who fell at the gate while
// Varrow's watch held the cairns (the watch carried them home that night), nor one already lying
// in the temple from before.
=== function carried(id) ===
~ return lies_in_state(id) && ((has_flag(id + "_fell_at_the_gate") && not has_flag("varrow_rallied")) || has_flag(id + "_fell_in_the_vault") || has_flag(id + "_fell_in_the_chantry"))

// A companion the great candle called back this evening.
=== function raised_tonight(id) ===
~ return ch3_homecoming.candle && has_flag(id + "_raised")

// ---- The feast at the Tallow and Thistle ----

=== ch3_feast ===
Morwen Tallow has been cooking since word ran ahead of you down the barrow road, and it shows. The Tallow and Thistle is lit from cellar to rafters, every table in the house is pushed into one long one, and all Bramblegate is crammed in round it: the watch, the market, Nan Burdock, and Hob from the forge, telling a version of your story that has a dragon in it. #location:Bramblegate, the Tallow and Thistle #time:Night
{ has_flag("goblins_at_mill"):
    The back door is propped open for Nettle's goblins, who have formed an orderly queue for pie, and are by some distance the best-behaved guests in the house.
}
"Sit," Morwen says, and puts a plate in front of you the size of a cartwheel. "Eat. Then tell it. They've all heard it already, mind, but they want it from you." #speaker:morwen
+ [Eat, and then tell it]
    -> the_tale

= the_tale
You tell it: the gate and its guardians, the champions in their hall, the black water and the wheel, and the Cantor singing in the ash. When you get to the gold that flew to your hand, the whole room goes quiet, and everybody tries very hard not to look at your pocket.
{ has_flag("varrow_rallied"):
    When you're done, Varrow's watch bang their cups on the table by the fire until Morwen threatens them with a ladle.
}
Then Reeve Corbin climbs up on a bench, and the room goes quiet for a different reason. "Fifty gold, I said, to whoever brought Garrick Dunn home and put a stop to the raids," he says. "Twenty-five I paid. Here's the rest of it, and the thanks of Bramblegate, which are worth more, though I'll grant you they don't spend." #speaker:corbin
~ give_coins(25)
~ give_xp(200)
~ finish_quest("missing-miller")
{ has_flag("escape_fates_mercy"):
    It's the first coin in your purse since the hill took the last of it.
}
Garrick Dunn stands up beside him, with Lark under his arm. "To the ones who came looking," he says. #speaker:garrick
+ [Drink to it]
    -> faces

= faces
All Bramblegate drinks to it. But not everyone is cheering. By the fire, a tall woman in plate armour and the Regent's blue watches you over a cup she hasn't touched. And on the bench by the door sits an old woman with an owl on her shoulder. Nobody else seems to notice the owl, which is odd, because it's enormous, and it's looking straight at you.
-> about

// The feast: each of these once, and bed ends it.
= about
* {not marchbank} [See what the knight in the Regent's blue wants]
    -> marchbank
* {has_item("league-letter")} [Read the letter]
    -> letter
* {not hesper_named} [Go over to the old woman with the owl]
    -> owl_woman
* {has_shard("names") && not owl_woman} [Hold the shard, and ask it the old woman's name #shard:names]
    -> hesper_named
* {has_flag("lark_apprentice_later")} [Answer the question Lark has been working up to all evening]
    -> lark_asks
* {companion_alive("odda")} [Sit with Odda for a while]
    -> with_odda
* {companion_alive("fen")} [Find out what Fen is up to]
    -> with_fen
* {has_flag("rival_freed") && not has_flag("rival_wounded")} [Take a cup over to your rival, alone in the corner]
    -> with_rival
* {has_flag("rival_wounded")} [Slip out to the temple, to see your rival]
    -> with_rival
+ [Go up to bed]
    -> bedtime

// Knight-Captain Beatrix Marchbank, and the Lord Regent's "request".
= marchbank
The knight doesn't get up when you come over. She's the kind who lets you come to her.
-> marchbank_meets ->
-> marchbank_answer

// Bed, without hearing her out: she won't be put off that easily.
= marchbank_at_the_stair
You're at the foot of the stairs when a hand in a steel gauntlet comes down on the newel post in front of you. It's the knight in the Regent's blue.
-> marchbank_meets ->
-> marchbank_answer

= marchbank_meets
~ set_flag("met_marchbank")
Close to, she's older than you thought, with cropped grey hair, a soldier's weathered face, and the Regent's silver badge on her breastplate.
"Knight-Captain Beatrix Marchbank, of the Lord Regent's household," she says. "I came north on reports of the dead walking, and found I'd come a day too late for the fighting. Not too late for what came out of that hill, though. Half this town says it flew to your hand." #speaker:marchbank
{ has_flag("regency_favour"):
    "Your name's come up in reports to the Regent's office," she adds. "Twice, and both times kindly. I'd like to keep it that way." #speaker:marchbank
}
"The Lord Regent has waited twenty years for news like that. He requests that you bring it to Highcrown, to be kept safe until the crown is mended." She says "requests" the way some people say "orders", and others say "please". #speaker:marchbank
->->

= marchbank_answer
* [Tell her you'll bring it to Highcrown #drive:glory]
    ~ drive_moment("glory")
    ~ set_flag("marchbank_agreed")
    "Good," says Marchbank, and for the first time she drinks. "We ride when you're ready, and not before. I'm told you've earned a night's sleep." #speaker:marchbank
    { companion_alive("fen"):
        Behind her back, Fen mouths something at you that would get him hanged in Highcrown.
    }
* [Tell her it isn't the Regent's to ask for #drive:freedom]
    ~ drive_moment("freedom")
    ~ set_flag("marchbank_refused")
    ~ approve("fen", 1)
    Marchbank doesn't blink. "Noted," she says. "I'll be riding south with you anyway, when you go. The roads are dangerous, and the Lord Regent would hate to lose you. Or it." #speaker:marchbank
    { companion_alive("fen"):
        Fen raises his cup to you behind her back.
    }
* [Tell her you'll think about it]
    ~ set_flag("marchbank_put_off")
    "Think, then," says Marchbank. "I'll ask again in the morning. I'm very good at asking again." #speaker:marchbank
* {not hold_it_out} [Hold the shard out to her, and let her take it]
    -> hold_it_out
- -> courier

// It won't go to her, any more than it would stay with Dame Aveline.
= hold_it_out
~ set_flag("marchbank_saw_it_return")
You take the shard out and put it in her gauntleted hand. Before her fingers can close on it, it's back in your palm, warm, as if it had never left.
Marchbank looks at her empty hand for a long moment. Then she looks at you. "Well," she says. "That's going in my report." #speaker:marchbank
-> marchbank_answer

// The Free League's letter, slipped into your hand straight after.
= courier
Marchbank goes back to her cup by the fire. You've hardly turned round when somebody bumps you in the crush.
"Beg pardon," says a quick young man in a black-and-yellow cloak, and he's gone, out of the door into the dark. #speaker:courier
There's a folded letter in your hand that wasn't there before.
~ give_item("league-letter")
{ marchbank_at_the_stair:
    -> ch3_night
}
-> about

= letter
You break the seal: black wax, pressed with a little gold ship. The hand inside is quick and elegant.
"The Free League would be glad to make you an offer for what you carried out of the Kings' Barrow, or for your company, or both. The Regent will want it for nothing. We pay. When you come south, and you will, ask for Silas Dray at any League house." It's signed with a flourish: O. Kettering, Magister.
{ has_flag("league_deal"):
    Folded inside is a second note, in Factor Penhallow's square hand: "Our arrangement stands. Anything with a crown on it."
    { has_flag("looted_the_champions"):
        You think of the old gold you took from the champions' tombs. Every coin of it was stamped with a crown.
    }
}
{ has_flag("league_refused"):
    Underneath, in the same quick hand: "Factor Penhallow tells us you turned him down at the Old Ford. We admire anyone who knows their own price. Let us find it together."
}
{ has_bond("debt"):
    And at the very bottom, smaller: "P.S. We have taken an interest in what you owe {bond_name()}."
}
{ companion_alive("fen"):
    "The League," Fen says, reading over your shoulder. "The only people in Caldmere who'll put a price on a thing in writing. I almost respect it." #speaker:fen
}
-> about

// The old woman with the owl (Hesper Wildmoor of the Old Circle), unnamed.
= owl_woman
~ set_flag("met_hesper")
The old woman doesn't look up as you sit down beside her. Close to, the owl is even bigger, and smells faintly of mice.
{ has_flag("tried_to_return_the_shard"):
    "You tried to put it back," she says. It isn't a question. "Good. Remember that you tried. You'll want to, later." #speaker:owl-woman
- else:
    "Things like that always choose badly," she says, "because they choose for themselves." #speaker:owl-woman
}
"If it speaks to you tonight, don't answer it." #speaker:owl-woman
Somebody jostles your elbow, and you look round. When you look back the bench is empty, and there's a single grey feather on it, still warm.
-> about

// The shard's second use: learning a living creature's name.
= hesper_named
~ set_flag("named_hesper")
~ set_flag("met_hesper")
~ add_deed("Turned the Shard of Names on an old woman at the feast in Bramblegate, and learned her name: Hesper Wildmoor.")
You close your hand round the shard under the table, and look at the old woman, and ask.
The shard goes cold in your fist, and a name rises in your mind like a fish coming up through dark water: Hesper Wildmoor.
Across the room, the old woman's head snaps round as if you'd shouted it. She comes through the crowd to you with the owl riding her shoulder, and nobody so much as glances at it.
"Don't do that again," she says quietly. "Not to me, and not to anyone, if you've the sense you were born with. Every time you use it, it learns you a little better." #speaker:hesper
Then the crowd closes round her, and she's gone.
{ companion_alive("odda"):
    { has_flag("asked_the_dead_cantor"):
        "That's twice now," Odda says, watching the door. #speaker:odda
    - else:
        "What did you just do?" Odda says, watching the door. #speaker:odda
    }
}
-> about

// Lark asked to be your apprentice in Chapter 2, and was told to ask again when her father
// was home.
= lark_asks
Lark has been sitting beside you all evening, working up to it. "He's home," she says at last. "You said to ask again when he was. So I'm asking." #speaker:lark
Across the table, Garrick puts down his cup. "She'll go whatever we say," he says. "Better she goes with someone who comes back." #speaker:garrick
* [Take her on as your apprentice]
    ~ set_flag("lark_apprentice")
    "Right," says Lark, as if she'd never had a doubt in her life. "What do I do first?" #speaker:lark
    "Sleep," says her father. "Then eat. Then we'll see." #speaker:garrick
* [Tell her the mill needs her more, for now]
    ~ set_flag("lark_stays_home")
    Lark scowls at you. Then she looks at her father, and the scowl goes out of her. "For now," she says. #speaker:lark
- -> about

= with_odda
{ raised_tonight("odda"):
    Odda, who was dead this afternoon, is on her third helping of Morwen's pie. She doesn't want to talk about it, so you don't.
- else:
    Odda has found the one quiet corner in the house, with a pot of tea and her boots off.
}
{
    - dislikes_you("odda"):
        { has_flag("odda_means_to_go_home"):
            "I said I'd go home to my order after the barrow," she says, before you've sat down. "I meant it." #speaker:odda
        - else:
            "I'll say this once," she says, before you've sat down. #speaker:odda
        }
        "But I've seen what's in your pocket, and I'll not leave it alone with you. So I'm staying. Don't take it for forgiveness." #speaker:odda
        ~ set_flag("odda_stays_for_the_shard")
    - has_flag("odda_means_to_go_home"):
        "I said I'd go home to my order after the barrow," she says. "I've thought better of it. And of you, a little. Don't let it go to your head." #speaker:odda
    - likes_you("odda") && has_flag("odda_told_of_emberdeep"):
        "Emberdeep," she says, "when you're ready. I've not forgotten. And I've a feeling that thing in your pocket won't let you sit still for long." #speaker:odda
    - else:
        "A good night's work," she says, and pours you a cup. "Several nights' work. Sit down before you fall down." #speaker:odda
}
-> about

= with_fen
{ raised_tonight("fen"):
    Fen, who was dead this afternoon, has won four silver off the watch at knucklebones. He says dying has done wonders for his luck.
- else:
    Fen has won four silver off the watch at knucklebones, and given three of it back, which for Fen is very nearly a speech.
}
{
    - dislikes_you("fen"):
        "Arithmetic," he says, when you sit down. "Everyone in Caldmere is going to want what's in your pocket. So the safest place to stand is right beside it. Until it isn't." #speaker:fen
    - likes_you("fen") && has_flag("fen_told_of_ledger"):
        "The ledger's still sewn up safe," he says, very low, when you sit down. "When we go south, I know a few of the names in it. I'd like to see their faces." #speaker:fen
    - else:
        "Don't look now," he says, when you sit down, "but every pickpocket in this room is looking at your pocket. I know, because I'm one of them." He grins. "Relax. Professional courtesy." #speaker:fen
}
-> about

// The Rival wants to hold the shard, just once.
= with_rival
{ has_flag("rival_wounded"):
    You slip out into the cold and up the hill to the temple. In the infirmary behind the altar, {bond_name()} is propped up on pillows with their ribs strapped, wide awake. #location:Bramblegate, the temple
- else:
    {bond_name()} is sitting alone in the corner with a jug, watching the room the way you'd watch a play you'd been left out of.
}
"Let me hold it," your rival says. "Just for a moment. I want to know what it feels like. I want to know why it was you." #speaker:rival
* [Put it in their hand]
    ~ set_flag("rival_held_the_shard")
    You put the shard in their palm. Before their fingers can close on it, it's back in yours, warm, as if it had never gone.
    {bond_name()} looks at their empty hand for a long time. Then they laugh, and it isn't a good laugh. "Of course," they say. "Of course." #speaker:rival
* [Tell them no]
    ~ set_flag("rival_refused_the_shard")
    "No," you say.
    Your rival looks at you for a long moment. "No," they agree. "Why would you." And they don't say anything else. #speaker:rival
- (back)
{ has_flag("rival_wounded"):
    You walk back down the hill to the feast alone. #location:Bramblegate, the Tallow and Thistle
}
-> about

= bedtime
{ not marchbank:
    -> marchbank_at_the_stair
}
-> ch3_night

// ---- That night, and the morning: the end of Act I ----

=== ch3_night ===
It's very late when you climb the stairs. Morwen has put a hot brick in your bed and a candle on the sill, and the noise of the feast comes up through the floorboards like the sea. #location:Bramblegate, the Tallow and Thistle
~ add_deed("Came home to Bramblegate with Garrick Dunn and the Shard of Names, and was feasted at the Tallow and Thistle.")
You lie in the dark with the shard in your hand. It's warm, and very quiet. Then, just as you're falling asleep, it says your name again.
{
    - has_bond("sibling"):
        It's {bond_name()}'s voice, the way they used to call you in for supper.
    - has_bond("mentor"):
        It's {bond_name()}'s voice, the way they'd say it when you'd done well, which wasn't often.
    - has_bond("rival"):
        It's {bond_name()}'s voice, and it sounds as if it's laughing at you, or nearly.
    - has_bond("debt"):
        It says it the way {bond_name()} does, as if it's adding you up.
    - else:
        It says it the way nobody has since you left home.
}
Under the voice, very far down, so far that you're never sure afterwards that you heard it at all, something else is listening.
{ ch3_feast.owl_woman:
    You remember the old woman's words, and you don't answer. It's harder than it ought to be.
- else:
    In the morning, you can't remember whether you answered.
}
~ long_rest()
// STORY.md: you reach level 5 here, at the end of Act I. Most heroes are there already.
~ xp_milestone(5)
+ [Wake, and go down into the morning]
    -> morning

= morning
Morning comes grey and clean over Bramblegate's roofs, and smells of Morwen's breakfast, which is enormous. #time:Morning
{ has_flag("rival_freed"):
    ~ set_flag("rival_left_bramblegate")
    { has_flag("rival_wounded"):
        Up at the temple, your rival's bed is empty, with the blankets folded square.
    - else:
        Your rival's place at the long table is empty, and their horse is gone from Morwen's yard.
    }
    They've left you a note, folded small: "It went to you. It always goes to you. Don't come after me." It's signed {bond_name()}.
}
{
    - has_flag("marchbank_agreed"):
        Out in the yard, Knight-Captain Marchbank is checking her horse's girth. "Whenever you're ready," she says. "Highcrown isn't going anywhere." #speaker:marchbank
    - has_flag("marchbank_refused"):
        Out in the yard, Knight-Captain Marchbank is checking her horse's girth. "Good morning," she says. "I'm still riding south with you. I thought you'd want to know." #speaker:marchbank
    - else:
        Out in the yard, Knight-Captain Marchbank is checking her horse's girth. "Good morning," she says. "Have you thought?" #speaker:marchbank
}
{ companion_alive("odda") && companion_alive("fen"):
    In the kitchen, Odda is packing, and Fen is eating Odda's breakfast.
}
In your pocket, the shard has turned by itself, the way a compass needle settles. It's pointing south.
+ [Go out into Bramblegate, one last time]
    -> act1_last_morning
