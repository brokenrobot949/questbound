// Chapter 1 side content, Hob's bet (docs/STORY.md, "Chapter 1 side content").
//
// Hob bets a gold piece you can't put down the arm of Greta, his apprentice. An Athletics
// contest: Greta rolls, then you roll to beat her total (contest(), story/externals.ink); a
// tie, and neither arm moves, so you go again. Win, and Hob pays his gold and takes 10% off
// anything in his forge from then on (hob_discount: data/campaign/shops.js). Lose, and you
// stand the smithy a round at the Tallow and Thistle (1 gold). A Rogue can cheat with a palm
// greased from Hob's dinner (Sleight of Hand 13). Taking the bet is a Glory moment.
// Turning it down changes nothing: the offer stands.
//
// A tunnel: Hob's forge in Chapter 1 and on the last morning (after the feast) calls it.

=== side_hobs_bet ===
"Here's a bet for you," Hob says, wiping his hands on his apron. "My Greta's got the strongest arm north of the river. A gold piece says you can't put it down." #speaker:hob

Greta, a broad young woman with forearms like hams and a burn scar up one wrist, sets down her hammer, plants her elbow on the flat of the anvil, and waits. She doesn't say anything. She doesn't need to.

"Win, and I'll knock a tenth off anything in the forge, for as long as I'm in it," Hob says. "Lose, and you stand the smithy a round at Morwen's." #speaker:hob
{ companion_alive("fen"):
    "My money's on her," Fen says. #speaker:fen
}
-> grip

= grip
* [Grip her hand, and push #contest:athletics:Greta #drive:glory]
    ~ drive_moment("glory")
    You plant your elbow beside hers and take her hand. It's like gripping a warm anvil.
    -> wrestle
* {has_class("rogue")} [Grease your palm from Hob's dinner first, when nobody's looking #check:sleight-of-hand:13]
    Hob's dinner sits on the cooling bench: bread, an onion, and a slab of dripping. You lean on the bench for a moment, all innocence.
    { check("sleight-of-hand", 13):
        By the time you take Greta's hand, yours is slick as a fish. She bears down, and her grip slides off yours like a boot off ice, and her knuckles rap the anvil before she knows what's happened.
        She sniffs her fingers, and looks at you for a long moment. Then, very slightly, she grins. She doesn't say anything to Hob.
        ~ set_flag("cheated_hobs_bet")
        -> won
    - else:
        "Is that my dripping?" Hob says. He doesn't sound angry. He sounds delighted. "Greta, the hero's trying to cheat. That's a forfeit, that is. A round for the smithy!" #speaker:hob
        -> lost
    }
+ [Laugh it off, and keep your gold]
    "Coward's gold spends the same as anyone's," Hob says cheerfully. "The bet stands, whenever you're feeling brave." #speaker:hob
    ->->

// Greta rolls, then you do. A tie, and you go again.
= wrestle
~ temp result = contest("athletics", "Greta", 5)
{
- result > 0:
    -> won
- result < 0:
    -> lost
- else:
    -> tied
}

= tied
Neither arm moves an inch. The anvil creaks. Greta's face goes slowly red, and so, you suspect, does yours. Hob is laughing so hard he has to sit down on the coal bin.
+ [Go again #contest:athletics:Greta]
    -> wrestle

= won
Greta's arm goes down, slowly, then all at once, and her knuckles rap the anvil. She looks at her hand as if it has let her down personally. Then she grins and shakes yours properly. "Again tomorrow," she says. #speaker:greta

Hob slaps a gold piece down on the anvil. "A tenth off," he says, "and I'll hear no more about it." #speaker:hob
~ give_coins(1)
~ set_flag("hob_discount")
~ set_flag("won_hobs_bet")
~ add_deed("Put down the arm of Greta, Hob's apprentice, and won a tenth off at his forge.")
-> settled

= lost
Greta puts your arm down as gently as you'd set down a cup, and pats your hand. "Good try," she says, and means it. #speaker:greta
"A round for the smithy, then," says Hob happily. #speaker:hob
{ can_pay(1):
    ~ pay(1)
    You hand over a gold piece. Hob promises to see it spent properly, and from the look Greta gives him, it will be.
- else:
    You turn out your pockets, and Hob looks at what's in them, which is nothing. "On the slate at Morwen's, then," he sighs. "She keeps a long slate." #speaker:hob
}
~ set_flag("lost_hobs_bet")
~ add_deed("Arm-wrestled Greta, Hob's apprentice, and lost. The smithy drank to it.")
-> settled

= settled
~ set_flag("hobs_bet_done")
~ give_xp(25)
->->
