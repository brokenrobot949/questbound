// Chapter 1 side quest, the wolf den on the north road (docs/STORY.md, "Chapter 1 side
// content"): the first contract on Bramblegate's notice board, written by hand for now (Rob,
// Oct 18, 2026; Phase 3's contract board can take it over).
//
// Warden Pike pays ten gold from the gate tolls to whoever clears the den in the Grey Teeth,
// an hour up the north road. The wolves are starving: the dead walking the barrow hills by
// night have driven the deer off (Survival on the road, or the she-wolf herself, by Speak with
// Animals, says so: wolves_starving, a note in The Missing Miller). At the den:
//   - come at it from downwind (Stealth 12): she never howls, so her mate, out hunting, doesn't
//     come (den_unseen), and a fight starts with a surprise attack;
//   - fight (wolf-den: the she-wolf, a Low fight for a level 1 hero, and her mate on round 3
//     unless the hero came unseen);
//   - or move them on: throw her your rations and lead her east, to where the deer went
//     (Animal Handling 12); drive her off with a torch (Intimidation 10) or bare-handed
//     (Intimidation 15); Fire Bolt or Minor Illusion; or ask her (Speak with Animals).
// Moving them on is worth the same XP as the fight (docs/DESIGN.md), and Pike pays either way:
// "Gone or dead, I'm not fussy." Losing the fight is Fate's Mercy: a shepherd carts you back to
// the gate, without your purse, and the wolves go east by themselves.
//
// A tunnel: Chapter 1's notice board and the last morning in Bramblegate (after the feast)
// both call it, and it returns to them.

=== side_wolves ===
~ start_quest("wolf-den")
{ has_flag("last_morning"):
    Warden Pike is on the north gate, as ever, with a mug of something hot. "Still at it," she says, before you've asked. "The dead are gone from the hills, but the deer haven't come back yet, and nobody's told the wolves. Another four sheep this week." #location:Bramblegate, north gate #speaker:pike
- else:
    Warden Pike is on the north gate, with a mug of something hot and the look of someone who's been up all night. "Wolves," she says. "Eleven sheep from the folds up the north road this week, and a shepherd's dog that went after them. Wolves never come this close to the walls in summer." #location:Bramblegate, north gate #speaker:pike
}

"The den's in the Grey Teeth, an hour up the road. Ten gold from the gate tolls to whoever clears it. Gone or dead, I'm not fussy." #speaker:pike
-> road

= road
The north road climbs out past the last walled fields into rough sheep country: grey rock, gorse, and grass bitten down to felt. #location:The north road
* [Read the ground as you go #check:survival:10]
    { check("survival", 10):
        Wolf tracks, two sets, coming and going along the sheep paths. And no deer tracks at all, old or new, where there should be dozens.
        { has_flag("last_morning"):
            Higher up, by a standing stone, the turf is still pressed flat in a broad track, weeks old, where something heavy and barefoot walked by night. The deer fled from it, and haven't come back.
        - else:
            Higher up, by a standing stone, the turf is trampled flat by bare feet, heavy and shuffling, all going one way in the night. Whatever walked here, the deer fled from it.
        }
        ~ wolves_starving()
    - else:
        Sheep tracks, sheep droppings, and more sheep tracks. If there's a story in the ground, the sheep have walked all over it.
    }
    -> den
* [Keep to the road, and go straight up to the den]
    -> den

= den
The Grey Teeth are a jumble of grey rocks on the hillside, like a giant's broken grin. Under the biggest is a dark hollow, and old bones lie scattered in the grass below it. Sheep, mostly.
* [Circle round, and come at the den from downwind #check:stealth:12]
    { check("stealth", 12):
        You circle wide with the wind in your face, and crawl the last of the way through the bracken. A grey she-wolf lies at the den's mouth, so thin her hips stand up like a cow's. There's no sign of her mate. She hasn't scented you.
        ~ set_flag("den_unseen")
    - else:
        A stone turns under your boot and rattles down the slope. At the den's mouth a grey she-wolf leaps up, all ribs and teeth. She throws back her head and howls, and from somewhere over the ridge, an answer comes.
    }
    -> face_her
* [Walk straight up to it]
    A grey she-wolf leaps up from the den's mouth at the sight of you, all ribs and teeth. She throws back her head and howls, and from somewhere over the ridge, an answer comes.
    -> face_her

// Face to face. Every way of clearing the den counts.
= face_her
{ companion_alive("fen"):
    "Look at her," Fen says quietly. "That's not a killer. That's an empty belly." #speaker:fen
}
* {has_flag("den_unseen")} [Strike before she knows you're there #combat:wolf-den #surprise]
    -> fought
* {not has_flag("den_unseen")} [Fight her #combat:wolf-den]
    -> fought
* {has_item("rations") || has_item("dungeoneers-pack")} [Throw her your food, and lead her off east #check:animal-handling:12]
    { has_item("rations"):
        ~ take_item("rations")
    }
    You toss the food well wide of her. She stares at you, then at the meat, then she's on it, bolting it in great gulps.
    { check("animal-handling", 12):
        When she looks up again you're walking away, slowly, east along the hillside, dropping a crust every so often and never looking back. She follows at a distance, and her mate comes in over the ridge to follow too.
        You lead them a long, slow mile, to where the hills fall away into the Fallow Woods. Down there, among the trees, a deer lifts its head and bolts. The wolves are gone after it before you can blink.
        ~ wolves_starving()
        -> moved_on
    - else:
        She bolts the lot and comes looking for more, and you're the only thing left on the hill that smells of it.
        -> forced
    }
* {has_item("torch")} [Light a torch, and drive her off with fire #check:intimidation:10]
    You strike a light and thrust the torch at her, roaring, and come on step after step.
    { check("intimidation", 10):
        She backs into the rocks, snarling, then breaks and runs. By the time your torch gutters out, the den is empty, and two grey shapes are loping away east across the hills.
        -> moved_on
    - else:
        The flame is pale in the daylight, and she's too hungry to care. She comes for you.
        -> forced
    }
* [Make yourself big and loud, and drive her off #check:intimidation:15]
    You throw your arms wide, stamp, and roar like something no wolf would want to fight.
    { check("intimidation", 15):
        She flinches, and then she's gone, a grey streak up through the rocks and over the ridge, and you hear her mate's howl moving away east.
        -> moved_on
    - else:
        She flinches, then lowers her head and growls right back. Hunger is louder than you are.
        -> forced
    }
* {can_cast("fire-bolt")} [Scorch the rocks at her feet #spell:fire-bolt]
    ~ cast("fire-bolt")
    A mote of fire bursts against the rock beside her in a spray of sparks. Every wild thing knows fire. She's gone over the ridge in three long bounds, and by the time you reach the top, two grey shapes are dwindling away east.
    -> moved_on
* {can_cast("minor-illusion")} [Conjure the roar of something far bigger #spell:minor-illusion]
    ~ cast("minor-illusion")
    From the rocks behind the den comes a roar: deep, close, and very large. The she-wolf doesn't wait to see what made it. She's away over the ridge, and you hear her mate's howl going with her, east.
    -> moved_on
* {can_cast("speak-with-animals")} [Ask her, in her own tongue, why they've come down to the sheep #spell:speak-with-animals]
    ~ cast("speak-with-animals")
    The spell takes its time. She watches you work it, hackles up, and when it settles her growl comes to you as words: short, hungry ones.
    { has_flag("last_morning"):
        "Dead things walked the high hills. The deer ran from them, east, to the trees. The dead are gone now. The deer are not back." Her lip curls at the folds below. "Sheep are slow." #speaker:wolf
    - else:
        "Dead things walk the high hills, in the dark. They smell like the ground. The deer ran from them, east, to the trees." Her lip curls at the folds below. "Sheep are slow." #speaker:wolf
    }
    You tell her where the deer went, and that the next thing to come up this hill for her will have a spear. She thinks about that for a long moment. Then she calls her mate, and they go east together.
    ~ wolves_starving()
    -> moved_on

= forced
* [Fight her #combat:wolf-den]
    -> fought

= fought
{ combat_won():
    The fight's over. Up close a starving wolf is nothing but bone and grey fur. Whatever drove the deer off these hills left the wolves nothing to eat but sheep.
    ~ set_flag("wolves_killed")
    ~ add_deed("Cleared the wolf den in the Grey Teeth, up the north road.")
    -> back_to_pike
- else:
    -> mercy
}

// Moving the wolves on is worth the same XP as the fight: the she-wolf, and her mate too if he
// answered her howl.
= moved_on
~ set_flag("wolves_moved_on")
~ approve("odda", 1)
{ has_flag("den_unseen"):
    ~ give_xp(50)
- else:
    ~ give_xp(100)
}
~ add_deed("Moved the starving wolves out of the Grey Teeth without killing them.")
-> back_to_pike

= back_to_pike
Back at the north gate, Pike hears you out and counts ten gold into your hand from the toll box. #location:Bramblegate, north gate
{ has_flag("wolves_killed"):
    "Shame," she says. "Hungry's no crime. Still. Sheep." #speaker:pike
- else:
    "Gone's as good as dead, as far as sheep are concerned," she says. "And it's less to bury." #speaker:pike
}
~ give_coins(10)
~ set_flag("wolf_den_done")
~ finish_quest("wolf-den")
~ give_xp(50)
->->

// Fate's Mercy: a shepherd finds you, and the wolves go east by themselves.
= mercy
You come to in the back of a shepherd's cart, jolting down the north road, with a sheepdog licking your ear and a sheepish shepherd at the reins. "Found you in the bracken," he says. "Wolves stood over you a good while, then went off east together. I'd not go back up for your purse, if I were you." #location:The north road #speaker:shepherd
~ lose_coins()
~ long_rest()
~ set_flag("wolf_den_fates_mercy")
~ set_flag("wolves_moved_on")
~ add_deed("Was mauled at the wolf den in the Grey Teeth. The wolves went east by themselves.")
Pike puts you to bed in the gatehouse, and in the morning she pays you anyway. "The den's empty," she says. "That's what I paid for. Don't make a habit of it." #location:Bramblegate, north gate #speaker:pike
-> back_to_pike_paid

= back_to_pike_paid
~ give_coins(10)
~ set_flag("wolf_den_done")
~ finish_quest("wolf-den")
~ give_xp(50)
->->

// What the wolves' hunger says about the hills: the dead have driven off the deer (25 XP, once).
=== function wolves_starving() ===
{ not has_flag("wolves_starving"):
    ~ set_flag("wolves_starving")
    ~ give_xp(25)
    { has_flag("took_bounty") && not has_flag("garrick_home"):
        ~ quest_note("missing-miller", "The deer have gone from the hills north of Bramblegate. Something walks there by night, and they fled from it: the wolves came down to the sheep because they're starving.")
    }
}
