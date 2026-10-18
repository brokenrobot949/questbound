// Chapter 2 side quest, The Hanging Tree (docs/STORY.md, "Chapter 2 side content"): Fen's.
//
// On the morning before the barrow (ch2_rally), Fen asks you to come with him to the old
// hanging tree at the crossroads outside the north gate, where the barrow road leaves the north
// road. Nobody's been hanged there in a hundred years, and nobody lingers there either, which is
// why the Ashen Choir's runners used it as a letter-drop: Fen ran letters for them, his second
// winter. He hates the place (he hates hangings).
//   - Tear the last stub of old rope from the gibbet ring (Fen +1, cut_the_hanging_rope).
//   - The drop: a knot-hole plugged with grey wax. Inside, a letter under the Precentor's own
//     seal, a crown cut in the wax (saw_precentor_seal: Fen's talk on the eve of the barrow
//     remembers it), and the next runner's wages, 8 gold.
//   - The cipher (Rob's choice, Oct 18, 2026: a check, keyed to the hymnal): hymn, verse and
//     word, from the hymnal taken at Brackenhollow, and Fen knows the method. Investigation 12
//     reads it all (read_choir_orders, 25 XP); a miss reads only the first lines
//     (read_choir_orders_part). Without the hymnal, Fen sings the hymns from memory while you
//     count words: Investigation 15. Asked about "my book", Fen dodges (fen_dodged_the_book):
//     on the eve, if he likes you, he owns up (it's the ledger he stole).
//   - Under the numbers, one line in the old court tongue of Highcrown, which only princes'
//     tutors teach now. Comprehend Languages can't decode a cipher (SRD 5.2.1: "This spell
//     doesn't decode symbols or secret messages"), but this line isn't one, so the spell reads
//     it; so does History 15 (read_precentor_postscript, 25 XP). A miss knows it for old
//     court-writing, and no more. It's the Precentor's: "He spoke to me again last night, in his
//     own voice. He is not dead. He is only sleeping. Sing him home." (Maelis, of her father:
//     a seed for Chapter 9.)
//   - Pocket the letter (choir-letter, took_choir_letter), or copy it out and put it back as it
//     was, so the Choir never knows it's been read (Fen +1, copied_choir_drop).
// Done: 50 XP, hanging_tree_done. On the last morning of Act I (last_morning) the Choir is
// broken, and nobody came for the letter; a few lines change.
//
// A tunnel: ch2_rally and the last morning (act1-last-morning.ink) call it, and it returns to
// them.

=== side_hanging_tree ===
~ start_quest("hanging-tree")
{ has_flag("last_morning"):
    Fen has been quiet all morning, which isn't like him. "One more thing before we go south," he says. "There's a tree I want to look at. Half a mile. I'll be quick." #speaker:fen
- else:
    Fen has been quiet all morning, which isn't like him. "Before we go north," he says, "there's a tree I want to look at. It's on the way. Half a mile." #speaker:fen
}
Where the barrow road leaves the north road, half a mile outside the gate, an old oak stands alone at the crossroads. One long, low branch reaches out over the road, worn smooth along the top, with an iron ring sunk into it and rusted fat. A grey stub of rope still hangs from the ring. #location:The crossroads outside Bramblegate
Nobody has been hanged here in a hundred years. Nobody has cut the tree down, either, and nobody stops here who doesn't have to. Fen stands with his back to it.
-> under_the_tree

= under_the_tree
* [Ask Fen what this place is]
    "The Choir's runners carry letters along every road in Caldmere," Fen says, "and they leave them in places like this, for the next runner to pick up. Nobody lingers at a hanging tree. Nobody looks too hard at what's tucked into one." #speaker:fen
    "I ran letters, my second winter. I put a few in this tree myself. Then one day I read one." He doesn't say what was in it. #speaker:fen
    -> under_the_tree
* [Ask Fen why he wants to look]
    { has_flag("last_morning"):
        "Because the Choir's finished up north, and nobody's come for whatever's in there," he says. "And I'd like to know what the Precentor had to say to her friends, before they all died." #speaker:fen
    - else:
        "Because they put a price on my head," Fen says, "and I'd like to know how much they're still paying, and who's asking. Letters go both ways." #speaker:fen
    }
    -> under_the_tree
* [Tear the last of the old rope from the ring]
    You reach up and pull. The stub of rope is so old it parts like wet bread, and you throw it in the ditch.
    Fen doesn't say anything. But he turns round after that, and looks at the tree, which he hasn't done since you got here.
    ~ set_flag("cut_the_hanging_rope")
    ~ approve("fen", 1)
    -> under_the_tree
* [Let Fen find the drop]
    -> drop

// The letter-drop, and what's in it.
= drop
Fen counts roots, then hand-spans up the trunk, then sighs. "Give me a leg up. It's always higher than you remember, at my size." #speaker:fen
You boost him up, and he digs a plug of old grey wax out of a knot-hole, reaches in up to the shoulder, and comes out with an oilcloth packet. Inside are a little purse and a folded letter, sealed with grey wax.
Fen turns the letter over, and goes very still. A crown is cut deep into the seal.
"That's not a Cantor's seal," he says quietly. "That's hers. The Precentor's own. Nobody below a Cantor ever sees one of those." #speaker:fen
~ set_flag("saw_precentor_seal")
{ has_flag("last_morning"):
    "Nobody came for it," he says. "Nobody's coming now." #speaker:fen
}
The purse holds eight gold pieces: the next runner's wages. Fen tips them into your hand. "My old pay," he says. "Or somebody's." #speaker:fen
~ give_coins(8)
-> cipher

// The cipher: hymn, verse and word, keyed to the Choir's hymnal.
= cipher
The letter is numbers, in threes, line after line of them in a neat, quick hand.
"Hymn, verse, word," Fen says. "Every acolyte learns it in their first week. You need the hymnal it's keyed to." #speaker:fen
{ has_item("choir-hymnal"):
    He looks at your pack. "And somebody here robbed one off a choirboy at Brackenhollow." #speaker:fen
}
* {has_item("choir-hymnal")} [Work through the numbers against the hymnal, with Fen finding the hymns #check:investigation:12]
    You sit in the ditch with the hymnal on your knees, and Fen calls out hymn numbers like a man calling a dance.
    { check("investigation", 12):
        -> orders
    - else:
        -> orders_part
    }
* {not has_item("choir-hymnal")} [Count out the words while Fen sings the hymns from memory #check:investigation:15]
    Fen sings under his breath, verse after verse, in a high, sweet voice you'd never have guessed he had, while you count words on your fingers.
    { check("investigation", 15):
        -> orders
    - else:
        -> orders_part
    }

= orders
It takes the best part of an hour. Word by word, it comes:
"To the runners of the barrow road. The little graves first, then Cairnfield, then the Kings' Barrow when the moon is right. Let the old dead carry the stones: they remember the way. The songbird has flown, and taken my book. The book matters more than the bird. Double for the bird dead. Treble for the book whole."
~ set_flag("read_choir_orders")
~ give_xp(25)
~ quest_note("hanging-tree", "The letter, decoded: the Precentor's orders to the runners of the barrow road. The little graves first, then Cairnfield, then the Kings’ Barrow when the moon is right; the old dead carry the stones. The songbird (Fen) has flown with her book: double for the bird dead, treble for the book whole.")
-> the_book

= orders_part
You get the first lines out: "To the runners of the barrow road. The little graves first, then Cairnfield." Something about a songbird. Then a verse number goes wrong somewhere, and every word after it comes out as nonsense: lamb, lantern, lantern, lamb.
"It's the songbird bit I wanted," Fen says sourly. #speaker:fen
~ set_flag("read_choir_orders_part")
~ quest_note("hanging-tree", "The letter is the Precentor's orders to the runners of the barrow road: the little graves first, then Cairnfield. There's something about a songbird. The rest of the cipher came out as nonsense.")
-> postscript

= the_book
"'The book matters more than the bird,'" Fen reads again. "That's almost flattering." #speaker:fen
* [Ask him what book]
    "No idea," Fen says. "Never read a book in my life." It isn't a good lie, and from his face, he knows it. #speaker:fen
    ~ set_flag("fen_dodged_the_book")
    -> postscript
* [Let it lie]
    -> postscript

// One line in the old court tongue of Highcrown: the Precentor's own.
= postscript
Under the numbers there's one more line, and it isn't in the cipher at all. It's in another hand, quicker and older-fashioned: tall looped letters, all joined, like the writing on an old charter. You can't read a word of it.
"I've never seen that before," Fen says. "Not in any letter I ran." #speaker:fen
* {can_cast("comprehend-languages")} [Read the line, with Comprehend Languages #spell:comprehend-languages]
    ~ cast("comprehend-languages")
    No spell can break a cipher, but this line isn't one. With your fingertips on the paper, the looped letters settle into words: the old court tongue of Highcrown, from before the crown was broken.
    -> postscript_read
* [Puzzle out the old letters #check:history:15]
    { check("history", 15):
        It's the old court tongue of Highcrown, from before the crown was broken: the writing on old charters and kings' tombs. Nobody writes it now but very old priests and princes' tutors. Slowly, letter by letter, you make it out.
        -> postscript_read
    - else:
        It's the old court-writing of Highcrown, the kind on charters and kings' tombs: you know that much. The words won't come.
        ~ quest_note("hanging-tree", "Under the cipher is one line in the old court-writing of Highcrown, in another hand. You couldn't read it.")
        -> keep_or_return
    }
* [Leave it]
    -> keep_or_return

= postscript_read
"He spoke to me again last night, in his own voice. He is not dead. He is only sleeping. Sing him home."
~ set_flag("read_precentor_postscript")
~ give_xp(25)
~ quest_note("hanging-tree", "Under the cipher, one line in the old court tongue of Highcrown, in the Precentor's own hand: He spoke to me again last night, in his own voice. He is not dead. He is only sleeping. Sing him home.")
Fen reads it twice over your shoulder. "'He,'" he says. "The Sleeping King. They all sing about him. But I never heard anyone talk about him like that. Like someone who's met him." #speaker:fen
{ companion_alive("odda"):
    Odda frowns at the looped letters, though she can't read them either. "Whoever wrote that was taught by somebody expensive," she says. #speaker:odda
}
-> keep_or_return

// The letter: keep it, or put it back as if it had never been read.
= keep_or_return
* [Pocket the letter]
    ~ give_item("choir-letter")
    ~ set_flag("took_choir_letter")
    { has_flag("last_morning"):
        "Nobody's coming for it now," Fen says. "Might as well be us that has it." #speaker:fen
    - else:
        "Let them wonder where it went," Fen says. #speaker:fen
    }
    -> done
* [Copy it out, press the seal back down, and put it back where it was]
    You copy every number into the back of your journal. Then you warm the wax in your hands until the crown takes again, and Fen pushes the letter back into the knot-hole and plugs it with its grey wax.
    { has_flag("last_morning"):
        "Somebody might come for it one day," Fen says. "Let them, and let them never know." #speaker:fen
    - else:
        "If anyone comes for it, they'll never know it's been read," Fen says, delighted. "Oh, that's nasty. I like it." #speaker:fen
    }
    ~ set_flag("copied_choir_drop")
    ~ approve("fen", 1)
    -> done

= done
~ set_flag("hanging_tree_done")
~ finish_quest("hanging-tree")
~ give_xp(50)
~ add_deed("Opened the Ashen Choir's letter-drop in the hanging tree with Fen, and found a letter under the Precentor's own seal.")
->->
