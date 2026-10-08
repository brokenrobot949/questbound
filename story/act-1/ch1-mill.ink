// Chapter 1 · Bramblegate, beat 3: Dunn's Mill (docs/STORY.md).
//
// The hero searches the wrecked mill (Investigation, Perception, and a clue only a Fighter,
// a Wizard or a Dwarf finds), discovers the cellar broken open from below, and then two
// starving goblins come back for more flour: the combat tutorial. Fight them, talk them
// down (which leads straight to Mother Nettle later), or let them run and follow the trail.
// Losing the fight is Fate's Mercy: you wake in the temple, robbed, and the story goes on.

=== ch1_mill ===
Dunn's Mill sits where the brook bends, its great wheel still and silent. The door hangs off one hinge. Flour drifts across the step like snow. #location:Dunn's Mill
-> search

= search
* [Read the tracks in the flour #check:investigation:15]
    { check("investigation", 15):
        Goblin feet, dozens of them, small and splay-toed. But under them are boots: big ones, a man's, and next to them two long furrows where something heavy was dragged. Heels, you realise. Someone was dragged out of here.
        ~ quest_note("missing-miller", "Boot prints at the mill, and drag marks: someone carried Garrick Dunn off, and goblins didn't do the carrying.")
    - else:
        Goblin feet everywhere, scuffed and smeared. Whatever else passed through here, the goblins trampled it.
    }
    -> search
* [Look over the wrecked room #check:perception:15]
    { check("perception", 15):
        There's ash on the floor by the hearth, but the hearth is cold and swept. This ash is grey and fine, and it smells of earth: grave dirt, mixed in. Nobody lit a fire here.
        ~ set_flag("mill_grave_ash")
        ~ quest_note("missing-miller", "Cold grey ash at the mill, mixed with grave dirt.")
    - else:
        Smashed crates, slashed sacks, a broken chair. The goblins were thorough, if not tidy.
    }
    -> search
* {has_class("fighter")} [Look at how the door broke]
    You've broken down enough doors to know how they fall. This one was barred from the inside, and the bar snapped outward. Nobody broke in here. Someone broke out, or was carried out.
    ~ quest_note("missing-miller", "The mill door was barred from inside and broken outward.")
    -> search
* {has_class("wizard")} [Study the scorch marks by the hearth]
    The soot isn't random. Someone burned a sigil into the floorboards, then scuffed it: a staff with music notes climbing it like ivy. You don't know whose mark it is, but you know a ritual circle when you see one.
    ~ set_flag("saw_choir_sigil")
    ~ quest_note("missing-miller", "A sigil burned at the mill: a staff wound with music notes.")
    -> search
* {has_species("dwarf")} [Listen to the floor]
    You stamp once, and your heel tells you what your eyes can't: the floor over the cellar rings hollow, and under the boards there's old dressed stone. Someone built down there, long before any mill.
    -> search
* [Go down to the cellar]
    -> cellar

= cellar
The cellar stairs creak under you. Down here the sacks are slashed open and the flour is ankle-deep. In the far corner the floor has been broken through from below: a ragged hole into an old tunnel of fitted stone, choked now with rubble. #location:Dunn's Mill, the cellar

Whatever took Garrick Dunn didn't come in by the door. It came up from underneath.
~ set_flag("found_mill_tunnel")
~ quest_note("missing-miller", "The mill's cellar floor was broken open from below, into an old stone tunnel.")
~ give_xp(25)

Above you, the door creaks. Two goblins in flour-whitened rags slip inside with empty sacks over their shoulders, bickering in whispers. They come down the stairs, see you, and freeze. #location:Dunn's Mill

They're thin. You can count their ribs. Their knives are out anyway.

* [Fight them #combat:mill-scavengers]
    -> fought
* [Tell them you're not here for them #check:persuasion:15]
    You lower your hands and keep your voice easy. You're looking for the miller, not for goblins. Are they hungry? They look hungry.
    { check("persuasion", 15):
        -> talked_down
    - else:
        -> they_bolt
    }
* [Roar at them to drop the sacks and run #check:intimidation:15]
    You draw yourself up and bellow loud enough to shake flour from the rafters.
    { check("intimidation", 15):
        -> they_bolt
    - else:
        The goblins flinch, then look at each other, then at the flour. Hunger wins. They come at you with knives out.
        -> forced_fight
    }

= forced_fight
* [Fight them #combat:mill-scavengers]
    -> fought

= fought
{ combat_won():
    -> won
- else:
    -> fates_mercy
}

= won
The second goblin goes down in a puff of flour, and the mill is quiet again. In their pockets you find a stub of candle, a crust of bread, and a scrap of cloth painted with a crude nettle leaf. They were sent.
~ set_flag("mill_goblins_fought")
~ add_deed("Fought off two goblin scavengers in the cellar of Dunn's Mill.")
~ quest_note("missing-miller", "The goblins at the mill wore a nettle-leaf token. Someone sent them for flour.")
-> to_the_quarry

= talked_down
The goblins stare at you. Then the smaller one bursts into tears, which neither of you expected.

"Mother Nettle sent us," the other one says, wiping its nose on its arm. "No food. Dead things in the deep warren, digging and digging. Took our stores. We only take flour. We never took no miller. Sorry. Sorry." It points a shaking finger south. "Old quarry. Mother will talk. Maybe."
~ set_flag("mill_goblins_talked")
~ add_deed("Talked two starving goblins down in the cellar of Dunn's Mill.")
~ quest_note("missing-miller", "The mill goblins say Mother Nettle sent them for flour. Something dead is digging in their deep warren, and they swear they never took the miller.")
~ give_xp(50)
-> to_the_quarry

= they_bolt
The goblins don't wait to hear the rest. They scramble back up the stairs, sacks and all, and are gone through the broken door in a cloud of flour.

They leave a trail, though. Flour, spilling from a split sack, all the way down the south road.
~ set_flag("mill_goblins_fled")
~ add_deed("Sent two goblin scavengers running from Dunn's Mill.")
~ give_xp(50)
-> to_the_quarry

= fates_mercy
// Fate's Mercy: losing the fight isn't the end. The story goes on, at a cost.
You wake on a narrow cot that smells of candle wax. The Temple of the Steadfast Flame. Prior Crane is sitting beside you, and Lark Dunn is asleep in a chair by the door, her father's hatchet across her knees. #location:Bramblegate, the temple #time:Morning

"She found you in the mill cellar," the Prior says softly. "Dragged you halfway to the gate before the watch saw her. The goblins took your purse, I'm afraid, and a good deal of flour."
~ lose_coins()
~ long_rest()
~ set_flag("mill_fates_mercy")
~ add_deed("Was beaten by goblin scavengers at Dunn's Mill, and carried home by Lark Dunn.")
~ quest_note("missing-miller", "The goblins who beat you at the mill fled south with the flour, towards the old quarry.")

"They went south," Lark says, without opening her eyes. "Towards the old quarry. I followed the flour." #location:Bramblegate
-> to_the_quarry

= to_the_quarry
{
- has_flag("mill_fates_mercy"):
    Lark walks you back out past the mill and points down the south road. "Bring him home," she says, and doesn't wait for an answer.
- has_flag("mill_goblins_talked"):
    The goblins scurry off ahead of you to tell Mother Nettle you're coming. You follow at your own pace.
- has_flag("mill_goblins_fled"):
    You follow the trail of spilled flour out of the yard and onto the south road.
- else:
    The goblins' bare footprints came up the south road, and that's the way they lead back.
}
~ set_objective("Follow the goblins south to the old quarry, where they make their home.")
-> ch1_quarry_road
