// Chapter 1 · Bramblegate, beats 6 and 7: back to Bramblegate, and the lights on the hills
// (docs/STORY.md). The end of the Phase 1 vertical slice.
//
// Report to Reeve Corbin (half the bounty now, half when the miller's home), with Captain
// Varrow approving or not of how you dealt with the goblins; show Morwen and Prior Crane the
// hymnal; then sleep at the Tallow and Thistle (the raids are over: level 3 for most heroes).
// In the night, lanterns move on the barrow hills, and Lark knocks at your door.

=== ch1_return ===
It's full dark by the time you reach Bramblegate. Warden Pike takes one look at the state of you and lifts the bar without a word. #location:Bramblegate, north gate #time:Night
{ has_flag("charmed_pike"):
    She does give you one long, flat look as you pass. "You put a spell on me," she says. "Do it again, and I'll leave you out here for the dead." #speaker:pike
}
{ has_flag("goblins_spared"):
    On the way in you passed Dunn's Mill, and there were cookfires in the yard: a dozen goblins under a lean-to of flour sacks, waving at you. Nettle's band has moved in to keep an eye on the place.
    ~ set_flag("goblins_at_mill")
}
-> town

= town
+ {not has_flag("reported_to_reeve")} [Report to Reeve Corbin]
    -> reeve
+ {has_item("choir-hymnal") && not has_flag("showed_morwen")} [Show Morwen the hymnal]
    -> morwen
+ {has_item("choir-hymnal") && not has_flag("showed_crane")} [Take the hymnal to Prior Crane]
    -> crane
+ {has_flag("reported_to_reeve")} [Turn in for the night at the Tallow and Thistle]
    -> the_inn

= reeve
The reeve's hall still has a lamp lit. Reeve Corbin listens to all of it with his fingers steepled, and when you've finished he's quiet for a long time. #location:Bramblegate, the reeve's hall
{
- has_flag("goblins_slain"):
    "So the goblins are finished," he says. "Good. Good." #speaker:corbin
- has_flag("goblins_spared"):
    "A bargain," he says. "With goblins." He rubs his eyes. "Well. If the raids stop, the raids stop." #speaker:corbin
}
He counts twenty-five gold onto the desk. "Half, for the raids. The other half when Garrick Dunn is home." #speaker:corbin
~ give_coins(25)
~ quest_note("missing-miller", "Reeve Corbin paid 25 gold for ending the goblin raids. The other 25 when Garrick Dunn is home.")

Captain Varrow has been leaning in the doorway the whole time.
{
- has_flag("goblins_slain"):
    "Clean work," he says, and nods to you, once. From Varrow, that's a medal. #speaker:varrow
    ~ set_flag("varrow_approves")
- else:
    "You shook hands with goblins," he says flatly. "I'll be watching that camp." Then, grudging: "Still. You got further down that hole than my watch ever did." #speaker:varrow
    ~ set_flag("varrow_wary")
}
~ set_flag("reported_to_reeve")
~ set_objective("Get some sleep at the Tallow and Thistle. Morwen and Prior Crane might make something of the hymnal first.")
-> town

= morwen
Morwen wipes her hands on her apron, takes the hymnal, turns three pages and goes very quiet. #location:Bramblegate, the Tallow and Thistle

"The Ashen Choir," she says at last. "They sing at funerals that aren't theirs. My gran used to say: if you see grey singers at a burying, keep walking and don't look back." She closes the book as if it might bite. "Garrick never did have the sense to keep walking." #speaker:morwen
~ set_flag("showed_morwen")
~ quest_note("missing-miller", "Morwen knows the sigil: the Ashen Choir, who sing at funerals that aren't theirs.")
-> town

= crane
The temple is dark apart from the altar flame. Prior Crane takes the hymnal from you, opens it to the map, and the colour drains out of his face. #location:Bramblegate, the temple
"Where did you get this?" he says. Then, too quickly: "Grave-robbers. Nasty business. Leave it with me, and I'll see it's—" He stops, and hands it back. "No. No, you'd better keep it." #speaker:crane
* [Watch his face as he looks at the map #check:insight:15]
    { check("insight", 15):
        He isn't frightened of the book. He's frightened that he knows the map. He's seen it before, or something very like it.
        ~ set_flag("crane_knows_the_map")
        ~ quest_note("missing-miller", "Prior Crane recognised the barrow map in the Choir's hymnal, and tried to hide it.")
    - else:
        He's an old man who's had a shock, and he wants you gone. That's all you can tell.
    }
    ~ set_flag("showed_crane")
    -> town
* [Thank him and go]
    ~ set_flag("showed_crane")
    -> town

= the_inn
Morwen won't take a copper from you tonight. She puts a bowl of stew in your hands, steers you up the stairs, and shuts the door on you herself. You're asleep before your boots are off. #location:Bramblegate, the Tallow and Thistle
// The raids are over: a milestone for the bounty, enough to reach level 3 for most heroes.
~ give_xp(150)
~ long_rest()
* [Wake in the dark]
    -> lights

= lights
// Beat 7: the end of the slice, and a natural stopping point.
Sometime past midnight you wake and don't know why. Through the little window, out over the rooftops, pale lights are moving on the barrow hills: a long, slow line of lanterns, winding north. #time:Night

Someone knocks at your door, very softly.

It's Lark Dunn, in a cloak too big for her and boots full of mud. "They're digging toward the Kings' Barrow," she whispers. "I followed the lanterns as far as the standing stones. That's where they've taken him. I know it." #speaker:lark
~ quest_note("missing-miller", "Lanterns on the barrow hills at night, heading north. Lark followed them to the standing stones: she's sure the Choir is digging toward the Kings' Barrow.")
~ add_deed("Came back from Brackenhollow with the Choir's hymnal, and saw their lanterns moving on the barrow hills.")
~ set_objective("Follow the lanterns north to the Kings' Barrow, and bring Garrick Dunn home. (Chapter 2 is still being written.)")
-> END
