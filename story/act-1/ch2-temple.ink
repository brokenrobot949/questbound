// Chapter 2 · The Barrow Road, beat 6: the temple's secret, and rallying help (docs/STORY.md).
//
// If the Old Ford held, the party comes back from Cairnfield to Bramblegate to rally help
// before the dark of the moon (ch2_homeward). If it fell, they're in Bramblegate already,
// carrying the news, before Cairnfield (Rob, Oct 11, 2026): Cairnfield's news_home runs the
// same parts. Either way: the temple at dusk (ch2_temple), a night at the Tallow and Thistle,
// and in the morning a round of the town (ch2_rally) before the road north.
//
// The temple (Rob's choices, Oct 12, 2026):
//   The fallen: a companion who died lies before the altar flame. Prior Crane gives the great
//     candle for them: once in its life it can call back someone who fell holding back the
//     dark, and it burns out doing it (flame_spent). Free, and "the least I owe", before
//     anyone knows he owes anything.
//   The missing map: Odda asks for the temple's old survey of the Kings' Barrow, and the map
//     case is empty. Crane lies. The truth comes out by pressing him (no roll if you've seen
//     his face at the Kings' Barrow before, Insight 12 if not), by Odda's right to see the
//     books, by Fen at his locked chest, or with Thieves' Tools 13 (a slip, and he breaks down
//     anyway). Leave it, and Crane brings the ledger to the inn himself.
//   The ledger: three hundred gold from "the Choir of Ash" for the survey, paid straight on to
//     the Free League's counting-house against the temple's debts (crane_secret_known,
//     50 XP). The survey's margin had the barrow's ward-word, and Crane never told the Choir.
//   What's to be done with him:
//     Take the ledger to the reeve (Justice): Crane goes to the cells without telling the
//       ward-word; 25 gold and the Regency's favour; Odda -1 ("He was ours to judge"), Fen -1.
//     Let Odda decide (Faith, Kinship): he confesses to the town at the evening service, and
//       gives the ward-word; Odda +2.
//     Blackmail (Wealth): fifty gold of the Choir's money, and the ward-word; Odda -2.
//     Help him make it right: the ward-word, and he writes to his order; Odda +1, Fen +1.
//   The ward-word is Ysolde, the first queen's name (knows_ward_word): Chapter 3's barrow gate.
// The rally, in the morning:
//   Captain Varrow, if the Old Ford held: if all three of its soldiers lived, his watch will
//     hold the outer cairns already; if not, Persuasion 12 talks him into it (15 if he was wary
//     of your goblin bargain) (varrow_holds_cairns, varrow_rallied).
//   Mother Nettle at the mill, if you spared her goblins: they'll come and make noise
//     (nettle_rallied). Promise her Brackenhollow back (promised_nettle_warren), or say honestly
//     that it isn't yours to promise (Odda +1).
//   Nan Burdock's stall, for potions. Then Lark sees you off at the north gate.
//   Chapter 2's side quests (Rob, Oct 18, 2026): Fen asks you out to the hanging tree
//     (side_hanging_tree, ch2-hanging-tree.ink), and at his forge Hob asks you to ride north
//     with his cousin Dabbin's cart and bring his star-iron home from the Old Ford (Hob's ore,
//     ch2-hobs-ore.ink). Saying yes (hobs_ore_taken) makes the ride north Dabbin's cart ride,
//     with the gnolls in the Gorse Cut on the way. Missed ones wait for the last morning of
//     Act I (act1-last-morning.ink).

// ---- The Old Ford held: back to Bramblegate from Cairnfield ----

=== ch2_homeward ===
~ set_objective("Go back to Bramblegate and rally help before the dark of the moon, three nights away.")
* [Go back down the barrow road to Bramblegate]
    -> walk_home

= walk_home
It's a night and a day back to Bramblegate. You come down off the moor in the dark, and at the Old Ford the watch hear you out and put you on their supply cart going south. #location:The barrow road #time:Night
You sleep in the back of it among the empty water-casks, and wake at dusk with the wheels rattling in under Bramblegate's north gate. Warden Pike looks you over from the wall. #location:Bramblegate, north gate #time:Dusk
"Alive, then," she says. "Good. We could do with some of that." #speaker:pike
-> ch2_temple ->
That night you sleep at the Tallow and Thistle. Morwen brings up hot water and a heel of bread, and doesn't ask a single question. #location:Bramblegate, the Tallow and Thistle #time:Night
~ long_rest()
* [Go out into the town at first light]
    -> ch2_rally

// ---- Beat 6: the temple's secret ----

// A tunnel: ch2_homeward and Cairnfield's news_home both come here, and go on to the inn.
=== ch2_temple ===
{
    - lies_in_state("odda") || lies_in_state("fen"):
        There's one more place you have to go before you can sleep.
    - companion_alive("odda"):
        "The temple, before anything else," Odda says. "There's something there we'll be needing." #speaker:odda
    - else:
        You go to the temple before anything else. It's the oldest building in Bramblegate, and if anyone has an old map of the Kings' Barrow, it's the Prior.
}
The Temple of the Steadfast Flame is cool and dim, and smells of candle wax and old stone. #location:Bramblegate, the temple
{ lies_in_state("odda") || lies_in_state("fen"):
    -> vigil ->
- else:
    Prior Crane is trimming the great candle's wick. He gives you his small, tired smile, then sees your faces, and puts the snuffer down.
}
-> the_map

// A companion who died lies before the altar flame, and Crane gives the great candle for them.
= vigil
{
    - lies_in_state("odda") && lies_in_state("fen"):
        Before the altar, under clean white linen, Odda and Fen lie side by side. Prior Crane sits on the step beside them, keeping the vigil.
    - lies_in_state("odda"):
        Before the altar, under clean white linen, lies Odda Brasswick. Prior Crane sits on the step beside her, keeping the vigil.
    - else:
        Before the altar, under clean white linen, lies Fen Underbough, looking smaller than ever. Prior Crane sits on the step beside him, keeping the vigil.
}
"Raising the dead takes a priest far stronger than me," Crane says, without looking up. "That's true. But it isn't the only way." #speaker:crane
He gets up, stiffly, and lifts the great candle down from its iron stand: the Flame itself, that never quite goes out. "The first priests of our order lit this from a fire that held back the dark. Once in its life, it can be given to call back someone who fell doing the same. Then it's spent, and the temple sends to the mother-house for a new light, and waits a very long time." #speaker:crane
"Let me," he says. "It's the least I owe." #speaker:crane
* [Let him]
    -> the_rite

= the_rite
~ temp odda_rises = lies_in_state("odda")
~ temp fen_rises = lies_in_state("fen")
He holds the candle over them and says the old words, and the Flame roars up white, and the whole tall candle burns down to a stub in the space of a breath. Then it goes out. For a moment the temple is completely dark.
~ set_flag("flame_spent")
{ odda_rises:
    ~ raise_companion("odda")
    ~ set_flag("odda_raised")
}
{ fen_rises:
    ~ raise_companion("fen")
    ~ set_flag("fen_raised")
}
{ odda_rises:
    In the dark, somebody coughs. Then a voice you know says, crossly:
    "Who put out the Flame?" #speaker:odda
}
{ fen_rises:
    Something sits up under the linen with a gasp, and pats itself all over.
    "Who's got my purse?" Fen says. "Somebody's always got my purse." #speaker:fen
}
Prior Crane lights a taper with shaking hands. He doesn't say what he meant by owing.
->->

// The old survey of the Kings' Barrow, which ought to be here.
= the_map
{ companion_alive("odda"):
    { has_flag("odda_raised"):
        Odda, who was dead until a few minutes ago, wastes no time at all.
    - else:
        Odda wastes no time.
    }
    "Prior. The old lists of my order say this temple keeps the survey of the Kings' Barrow, drawn when the barrow was sealed. We're going in there, and I'd like to know the way." #speaker:odda
- else:
    You ask the Prior whether a temple as old as this one keeps any old map of the Kings' Barrow. You'll be going in there, and you'd rather not go in blind.
}
"Lost," Crane says. "Long before my time. The damp gets into everything up here." He nods at an iron-bound map case in the corner, with its lid propped open. #speaker:crane
The case is empty. But there's no dust in it, not a speck, and the dust lies thick on everything else in that corner. Under the Prior's writing desk sits a squat iron chest with a good lock on it.
-> press

// Getting at the truth: every way gets there in the end, and leaving it brings him to you.
= press
* {has_flag("crane_knows_the_map") || has_flag("crane_hiding_something")} [Tell him you've seen his face whenever the Kings' Barrow comes up]
    { has_flag("crane_knows_the_map"):
        "You knew that map the moment you saw it in the Choir's hymnal," you tell him. "I watched you."
    - else:
        "Your hands shake every time somebody says 'Kings' Barrow'," you tell him. "They're shaking now."
    }
    -> crumbles
* {not has_flag("crane_knows_the_map") && not has_flag("crane_hiding_something")} [Watch his face as he says it #check:insight:12]
    { check("insight", 12):
        He's lying, and he's bad at it: a kind man who's never had much practice. You tell him so, as gently as you can.
        -> crumbles
    - else:
        If he's lying, he's better at it than you'd ever have guessed. He meets your eye, and smiles his small, tired smile.
        -> press
    }
* {companion_alive("odda")} [Let Odda ask to see the temple's books]
    "By the rule of the Flame," Odda says, "any sister of the order may see the books of any house. Any sister, Prior. At any hour." #speaker:odda
    Crane looks at her for a long moment. Then he takes a key from round his neck, and unlocks the iron chest with hands that won't keep still.
    -> ledger
* {companion_alive("fen")} [Catch Fen's eye, and nod at the iron chest]
    Fen drifts over to the Prior's desk while everyone else is looking at the map case. "This one's locked," he says. And then, a moment later: "Oh. No, it isn't." #speaker:fen
    ~ approve("fen", 1)
    -> ledger
* {not companion_alive("fen") && has_item("thieves-tools")} [Pick the iron chest's lock while he's looking at the map case #check:thieves-tools:13]
    { check("thieves-tools", 13):
        The lock is old and simple, and opens with a click like a dropped pin.
        -> ledger
    - else:
        The lock is old and stiff, and your pick slips with a clack that rings round the whole temple. Crane turns, and sees what you're doing.
        -> crumbles
    }
* [Leave it, for now]
    -> leave_it

= crumbles
Crane sits down on the altar step as if his legs have given way. For a while he doesn't say anything at all. Then he takes a key from round his neck, holds it out, and nods at the iron chest.
-> ledger

= leave_it
You let it go, for now. Crane sees you to the door, talking about the weather.
You haven't got your boots off at the Tallow and Thistle when there's a knock at your door. It's Prior Crane, with a ledger under his arm and the look of a man who has walked round the square a dozen times trying not to come here. #location:Bramblegate, the Tallow and Thistle
"I can't," he says. "Not with you going down there. Not with the dead walking. Here." #speaker:crane
-> ledger

// What the Prior did.
= ledger
~ set_flag("crane_secret_known")
~ give_xp(50)
The ledger holds the temple's accounts, in the Prior's small, careful hand: candles, lamp oil, the roof-mender, the roof-mender again. And in the spring, one line written smaller than the rest: "Received of the Choir of Ash, for the old survey of the Kings' Barrow: three hundred gold."
Under it, the same day: "Paid to the Free League's counting-house, against the temple's debt: three hundred gold. Paid in full."
{ has_flag("met_penhallow"):
    You think of Factor Penhallow at the Old Ford. Any League house will know the name, he said.
}
"The roof was coming down," Crane says. "The League's men came every quarter-day, and every quarter-day the debt was bigger. Then in the spring a man in grey came asking whether we had any old papers about the barrows. For the history, he said. Three hundred gold, for a map nobody had unrolled in two hundred years." #speaker:crane
"I told myself it was only paper." {has_flag("flame_spent"):He looks at the cold stub of the great candle on the altar.|He looks up at the great candle.} "Then the dead began to walk." #speaker:crane
"There's one thing more. The survey had a word written in its margin, in a hand much older than mine: the word the barrow's guardians were made to obey. The man in grey never asked about it, and I never told him. It's the only thing I kept back." #speaker:crane
{ companion_alive("odda"):
    Odda hasn't said a word. When she does, her voice is very quiet, which is worse than if she'd shouted.
    "My order sent me north to find out why the dead won't lie down," she says. "And the answer was here all along. In my own house, in the Prior's own hand." #speaker:odda
}
{ companion_alive("fen"):
    Fen whistles, very softly. "Three hundred," he says. "The Choir never paid me three hundred anything." #speaker:fen
}
"What will you do?" Crane asks. #speaker:crane
-> judgement

= judgement
* [Take the ledger to Reeve Corbin #drive:justice]
    ~ drive_moment("justice")
    -> exposed
* {companion_alive("odda")} [Let Odda decide what's to be done #drive:faith #drive:kinship]
    ~ drive_moment("faith")
    ~ drive_moment("kinship")
    -> confession
* [Tell him his secret's safe with you, for a price #drive:wealth]
    ~ drive_moment("wealth")
    -> blackmail
* [Help him make it right]
    -> amends

= exposed
~ set_flag("crane_exposed")
~ set_flag("regency_favour")
~ approve("odda", -1)
~ approve("fen", -1)
~ add_deed("Took Prior Crane's ledger to the reeve: he sold the Kings' Barrow's old map to the Choir.")
Reeve Corbin reads the page three times by lamplight. Then he sends for the watch. #location:Bramblegate, the reeve's hall #time:Night
Crane goes with them without a word, and doesn't look at you once. Nobody thinks to ask him for the word in the margin until the cell door is shut, and by then he won't say it.
"Selling the realm's old secrets to that Choir," Corbin says. "The Regent's men will want to hear of this. They pay for news of the Choir, and they'll hear your name with it." He counts twenty-five gold onto the desk. #speaker:corbin
~ give_coins(25)
{ companion_alive("odda"):
    Outside, in the dark, Odda stops you with a hand on your arm. "He was ours to judge," she says. "The Flame has its own ways with its own. You might have asked me." #speaker:odda
}
{ companion_alive("fen"):
    "One more for the cells," Fen says, to nobody in particular. He doesn't sound pleased about it. #speaker:fen
}
->->

= confession
~ set_flag("crane_confessed")
~ approve("odda", 2)
~ add_deed("Stood with Odda while Prior Crane told all Bramblegate that he sold the Kings' Barrow's old map to the Choir.")
You look at Odda. She looks at the Prior for a long time.
"You'll stand up at the evening service and tell them," she says. "All of it: the debt, the map, the man in grey. Then you'll write to Abbess Hulda at the mother-house, in your own hand, and take whatever penance she sets you. And you'll give us the word in that margin, because we're the ones going down there to clean up what you sold." #speaker:odda
The bell rings for the evening service. Half of Bramblegate comes, because word has got round that something's happening at the temple, which in Bramblegate is as good as an invitation. #location:Bramblegate, the temple #time:Night
Crane stands up in front of them all and tells it, every word, with his hands shaking. When he's done, nobody says anything for a long, long time.
Then Morwen Tallow says, loudly, from the back: "Well. The roof is better." Somebody laughs, and then everybody does, and it breaks like a fever. Nobody throws anything. Several people put coins in the box for the roof, which Crane will have to live with. #speaker:morwen
Afterwards, in the empty temple, Crane gives you the word.
-> ward_word ->
Odda doesn't quite smile. But she sat through the whole service beside you, and on the steps outside she says, "Thank you for letting it be mine." #speaker:odda
->->

= blackmail
~ set_flag("crane_blackmailed")
~ approve("odda", -2)
~ add_deed("Took fifty gold from Prior Crane to keep his secret.")
"Nobody needs to know," you say. "For a price."
Crane closes his eyes. Then he reaches into the back of the chest and brings out a small, heavy purse. "Fifty gold," he says. "The last of the Choir's money. I never could bring myself to spend it." #speaker:crane
~ give_coins(50)
"And the word in the margin," you say. He'd have given you that for nothing. You both know it.
-> ward_word ->
{ companion_alive("odda"):
    Odda says nothing at all. She picks up her pack, walks out of the temple, and waits for you outside in the cold with her back to the door, which says it better than words.
}
{ companion_alive("fen"):
    "Well," Fen murmurs. "That's one way to take the collection." #speaker:fen
}
->->

= amends
~ set_flag("crane_made_amends")
~ approve("odda", 1)
~ approve("fen", 1)
~ add_deed("Helped Prior Crane begin to make amends for selling the Kings' Barrow's old map to the Choir.")
"You can't unsell it," you tell him. "But you can help us take back what they bought with it. Start with the word in the margin."
-> ward_word ->
Crane writes to his order that same night, every word of it, and lets you read the letter before he seals it. He doesn't ask you to keep his secret, and you don't promise to.
{ companion_alive("odda"):
    "Mercy," Odda says on the steps outside. "Well. The Flame has managed on less." From Odda, it's very nearly a blessing. #speaker:odda
}
->->

// The barrow's ward-word, from the margin of the old survey: Chapter 3's barrow gate.
= ward_word
"It's a name," Crane says. "Ysolde. I don't know whose." #speaker:crane
{ companion_alive("odda"):
    "The first queen's," Odda says. "The old lists of my order call her Ysolde the Binder, though they never say what she bound." #speaker:odda
}
~ set_flag("knows_ward_word")
~ quest_note("missing-miller", "The Kings' Barrow's ward-word, from the margin of the temple's old survey: Ysolde. The barrow's guardians were made to obey it.")
->->

// A companion who travels with the hero but fell (died), and lies before the altar flame.
=== function lies_in_state(id) ===
~ return in_party(id) && not companion_alive(id)

// ---- The next morning: rallying help, and the road north ----

=== ch2_rally ===
{ has_flag("ford_fell"):
    In the morning Bramblegate is grey and quiet, and the barrow road is waiting. #location:Bramblegate, the square #time:Morning
- else:
    In the morning Bramblegate is grey and quiet. The dark of the moon is tomorrow night, and it's two days' walk to the Kings' Barrow. If anyone in this town is going to stand with you there, now's the time to ask. #location:Bramblegate, the square #time:Morning
}
-> about

= about
* {not has_flag("ford_fell")} [Ask Captain Varrow for the watch]
    -> varrow
* {has_flag("goblins_at_mill")} [Go out to Dunn's Mill, and ask Mother Nettle for help]
    -> nettle
+ [Call in at Hob's forge]
    -> forge_call
+ [Visit Nan Burdock's stall]
    -> nans_stall
* {companion_alive("fen")} [Go with Fen to the old hanging tree at the crossroads]
    -> side_hanging_tree ->
    -> about
+ {has_flag("ford_fell") && not has_flag("hobs_ore_taken")} [Take the barrow road north again]
    -> farewell ->
    -> ch2_cairnfield.road_north
+ {has_flag("ford_fell") && has_flag("hobs_ore_taken")} [Ride north on Dabbin's cart]
    -> farewell ->
    -> side_hobs_ore ->
    -> ch2_cairnfield.road_north
+ {not has_flag("ford_fell") && not has_flag("hobs_ore_taken")} [Take the barrow road north, to the Kings' Barrow]
    -> farewell ->
    -> north_for_now
+ {not has_flag("ford_fell") && has_flag("hobs_ore_taken")} [Ride north on Dabbin's cart, to the Kings' Barrow]
    -> farewell ->
    -> by_cart

// Hob's forge: his blades, and his star-iron (Hob's ore, ch2-hobs-ore.ink).
= forge_call
{ forge_call == 1:
    Hob's forge is quiet for once. Hob is sitting on his anvil with his chin in his hands, and he brightens when he sees you. "The heroes! Off up the barrow road again, they say." #location:Bramblegate, Hob's forge #speaker:hob
    "Here's a thing, then, since you're going that way. There's a crate of mine sitting in the strongroom at the Old Ford post: star-iron, all the way up from the south, paid for a month back. {has_flag("ford_fell"):The post's fallen, and no carter|No carter} will take the barrow road since the dead got up, and now there's gnolls on it too, come down from the hills after the dead." #speaker:hob
    "My cousin Dabbin says he'll take his cart up and fetch it, if somebody rides with him. Bring my star-iron home, and I'll work it into whatever you carry. You've never held anything like it." #speaker:hob
- else:
    Hob waves his hammer at you. #location:Bramblegate, Hob's forge
}
-> forge_talk

= forge_talk
+ {not has_flag("hobs_ore_taken")} [Say you'll ride north with Dabbin and his cart]
    ~ set_flag("hobs_ore_taken")
    ~ start_quest("hobs-ore")
    "Good!" Hob says, and claps you on the arm, which is as high as he can reach. "He'll be at the north gate with Parsnip when you're ready. Don't let Parsnip bite you. He bites." #speaker:hob
    -> forge_talk
+ [Look over Hob's blades]
    -> hobs_wares ->
    -> forge_talk
+ [Back to the square]
    -> about

// Captain Varrow, if the Old Ford held. (If it fell, he already said he can't spare a spear.)
= varrow
Captain Varrow is in the watch-house yard, watching his people drill: fewer of them than there ought to be. #location:Bramblegate, the watch-house
{ has_flag("tobin_to_varrow"):
    "The boy you sent me is in the cells," he says, before you can open your mouth. "He's told us everything twice, and cried both times. I'll not hang a child for singing hymns." #speaker:varrow
    { companion_alive("fen"):
        Fen lets out a breath he seems to have been holding since Cairnfield.
    }
}
{ has_flag("crane_exposed"):
    "And the Prior's in the cell next door," Varrow says. "This town." #speaker:varrow
}
{ has_flag("varrow_holds_cairns"):
    -> varrow_ready
}
You tell him what you heard at Cairnfield: the crown vault, the dark of the moon, tomorrow night.
"And you want my watch up on the moor," Varrow says. "I lost people at that ford, holding a river for the Regent. Now you want the rest of them under the Kings' Barrow." #speaker:varrow
-> varrow_ask

= varrow_ready
"Brannock's report came down on the supply cart," he says. "All three of mine alive, and the ford held. The Regent's men will hear who held it." #speaker:varrow
"So here it is. At the dark of the moon I'll take every spear I can spare up to the outer cairns. Whatever comes out of that barrow, it doesn't get past us to the road." #speaker:varrow
~ set_flag("varrow_rallied")
~ quest_note("missing-miller", "Captain Varrow will hold the outer cairns round the Kings' Barrow with the watch at the dark of the moon.")
-> about

= varrow_ask
* {has_flag("varrow_approves")} [Ask him to hold the outer cairns, so nothing gets past to the road #check:persuasion:12]
    { check("persuasion", 12):
        -> varrow_agrees
    - else:
        -> varrow_refuses
    }
* {not has_flag("varrow_approves")} [Ask him to hold the outer cairns, so nothing gets past to the road #check:persuasion:15]
    { check("persuasion", 15):
        -> varrow_agrees
    - else:
        -> varrow_refuses
    }
* [Leave him to his drill]
    -> about

= varrow_agrees
Varrow looks at you for a long time. "The outer cairns," he says at last. "At the dark of the moon. Nothing gets past us to the road. And then I'm bringing my people home, every one of them." #speaker:varrow
~ set_flag("varrow_holds_cairns")
~ set_flag("varrow_rallied")
~ quest_note("missing-miller", "Captain Varrow will hold the outer cairns round the Kings' Barrow with the watch at the dark of the moon.")
-> about

= varrow_refuses
"No," Varrow says. "Not with what I've got left. Somebody has to hold this town if you don't come back." #speaker:varrow
But he walks you to the gate of the yard himself, which from Varrow is something.
-> about

// Mother Nettle, if you spared her goblins: they're camped at the mill.
= nettle
Dunn's Mill has never been so busy. Nettle's goblins have made a camp of the yard: cookfires, lean-tos of flour sacks, washing hung on the millrace rails, and a goblin child riding the mill-wheel round and round, shrieking. #location:Dunn's Mill
Mother Nettle holds court from an upturned flour barrel. "Big one," she says. "Still alive. Good. Nettle likes the ones who come back." #speaker:nettle
{ has_flag("ford_fell"):
    You tell her about the dead on the barrow road, and the Choir's camp at Cairnfield, and that you're going there next.
- else:
    You tell her about Cairnfield: the Choir's camp, the Kings' Barrow, and the crown vault opening at the dark of the moon.
}
"Singers took our warren," Nettle says. "Dead dug through our larder. So yes. Goblins come. Goblins make noise. Noise is goblins' best thing." She shows a great many teeth. "But after, the old warren is ours again, and nobody's watch comes to burn it. You say so." #speaker:nettle
{ has_flag("owe_nettle"):
    "And you still owe Nettle for the songbird's message," she adds. "Nettle does not forget." #speaker:nettle
}
* [Promise her Brackenhollow is hers again, after]
    ~ set_flag("promised_nettle_warren")
    "Done," says Nettle. She spits in her palm and holds it out, and you shake it. #speaker:nettle
* [Tell her it isn't yours to promise, but you'll speak for her]
    ~ approve("odda", 1)
    Nettle squints at you for a long moment. "Honest," she says at last, as if it's a disease. "Fine. Goblins come anyway. For goblins." #speaker:nettle
- (rallied)
~ set_flag("nettle_rallied")
{ has_flag("ford_fell"):
    "When the singers go into the big barrow, goblins will know," she says. "Goblins hear singing a long way off." #speaker:nettle
- else:
    "Dark of the moon," she says. "Good. Goblins like the dark." #speaker:nettle
}
~ quest_note("missing-miller", "Mother Nettle's goblins will come to the Kings' Barrow and make a diversion.")
-> about

// Nan Burdock's stall: potions before the barrow.
= nans_stall
{ nans_stall == 1:
    Nan Burdock's little red bottles are still behind their sign. "Going into the barrows, are you," she says, before you've said a word. "Then you'll want these more than I do." #location:Bramblegate, the market #speaker:nan
- else:
    Nan Burdock watches your hands. #location:Bramblegate, the market
}
{not can_afford("potion-of-healing"): A Potion of Healing costs fifty gold.}
-> stall

= stall
+ {can_afford("potion-of-healing")} [Buy a Potion of Healing #buy:potion-of-healing]
    ~ buy("potion-of-healing")
    Nan wraps the bottle in straw and makes you count the coins twice.
    -> stall
+ {can_afford("rations")} [Buy a day's rations #buy:rations]
    ~ buy("rations")
    Hard biscuit, dried apple and smoked sausage, from the grocer's cart beside her.
    -> stall
+ {can_afford("torch")} [Buy a torch #buy:torch]
    ~ buy("torch")
    The grocer hands over a torch, pitch-dipped and ready. "For the dark bits," he says.
    -> stall
+ [Back to the square]
    -> about

// Lark sees you off.
= farewell
Lark Dunn is waiting at the north gate, sitting on the mounting block with her father's hatchet across her knees. #location:Bramblegate, north gate
{ has_flag("lark_apprentice"):
    She has a pack on her back. You take it off her, and she lets you, which is how you know she's frightened.
}
"Bring him home," she says. That's all. She doesn't need to say anything else. #speaker:lark
->->

// The Old Ford held: north to the Kings' Barrow, and beat 8, the eve of the barrow (ch2-eve.ink).
= north_for_now
~ set_objective("Take the barrow road north, make camp near Cairnfield, and go down into the Kings' Barrow at the dark of the moon.")
You go out through the north gate, with Bramblegate behind you and the barrow road ahead.
-> ch2_eve

// The same, on Dabbin's cart as far as the Old Ford, with the gnolls on the way (Hob's ore).
= by_cart
~ set_objective("Take the barrow road north, make camp near Cairnfield, and go down into the Kings' Barrow at the dark of the moon.")
-> side_hobs_ore ->
-> ch2_eve
