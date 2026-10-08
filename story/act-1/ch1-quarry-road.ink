// Chapter 1 · Bramblegate, beat 4: the quarry road (docs/STORY.md).
//
// A short walk south to the old quarry. A starving Wolf is tearing at a dead goblin in the
// road. Fight it (a Low fight), calm it (Animal Handling), scare it off (Intimidation, or a
// cantrip), or throw it some food. Every way past it is worth the same XP. Then the body:
// the long gouges down its back were made by human fingers, with grave dirt in them.
// Losing the fight is Fate's Mercy: Odda Brasswick finds you and carts you home.

=== ch1_quarry_road ===
The south road climbs out of the brook valley through gorse and rust-brown bracken. Cart ruts, worn deep by quarry wagons that stopped running before you were born, still score the dirt. Ahead, the hillside has been cut open into a grey stone face: the old quarry. #location:The quarry road #time:Midday

Halfway up, the wind brings you a smell you know. Blood, and not fresh. Round the next bend a grey wolf stands in the road with its forelegs braced, tugging at something small and limp.

A goblin. A very dead one.

The wolf lifts its head and looks at you. Its lips peel back from red teeth, but it doesn't run. You can count its ribs through its coat. It has been hungry for a long time, and it isn't giving up a meal.

* [Fight it #combat:quarry-wolf]
    -> fought
* [Talk low and steady, and ease it off its meal #check:animal-handling:15]
    You crouch, keep your eyes soft, and murmur the way you would to a frightened dog: nonsense, mostly, but calm nonsense.
    { check("animal-handling", 15):
        The wolf's hackles settle a little. It backs off one slow step at a time, then turns and trots into the bracken, looking back at you once.
        ~ add_deed("Talked a starving wolf off its meal on the quarry road.")
        -> wolf_gone
    - else:
        The wolf's ears go flat. It isn't frightened, it's starving, and you've just told it you're no threat. It comes for you.
        -> forced_fight
    }
* [Make yourself big and loud #check:intimidation:15]
    You throw your arms wide, stamp, and roar like something no wolf would want to fight.
    { check("intimidation", 15):
        The wolf flinches, wheels, and bolts into the bracken with its tail low.
        ~ add_deed("Roared a starving wolf off the quarry road.")
        -> wolf_gone
    - else:
        The wolf flinches, then lowers its head and growls right back. Hunger is louder than you are.
        -> forced_fight
    }
* {has_spell("fire-bolt")} [Scorch the road at its feet #spell:fire-bolt]
    A mote of fire cracks against the road between the wolf's paws and bursts into sparks. Every wild thing knows fire. The wolf yelps, wheels, and is gone into the bracken.
    ~ add_deed("Scared a starving wolf off the quarry road with a flash of fire.")
    -> wolf_gone
* {has_spell("minor-illusion")} [Conjure the roar of something bigger #spell:minor-illusion]
    From the bracken behind the wolf comes a roar: deep, close, and very large. The wolf doesn't wait to see what made it. It's gone up the slope in three long bounds.
    ~ add_deed("Fooled a starving wolf off the quarry road with the roar of a beast that wasn't there.")
    -> wolf_gone
* {has_item("rations") || has_item("dungeoneers-pack")} [Throw it some of your food]
    { has_item("rations"):
        ~ take_item("rations")
    }
    You dig out a twist of dried meat and toss it well wide of the body. The wolf looks at you, at the meat, at you again. Then it snatches the meat and lopes off into the bracken to eat in peace.
    ~ add_deed("Fed a starving wolf on the quarry road, and it let you pass.")
    -> wolf_gone

= forced_fight
* [Fight it #combat:quarry-wolf]
    -> fought

= fought
{ combat_won():
    -> wolf_dead
- else:
    -> fates_mercy
}

= wolf_dead
The wolf goes down and stays down. Up close it's nothing but bone and grey fur. Whatever drove the deer off these hills left it nothing else to eat.
~ set_flag("quarry_wolf_killed")
~ add_deed("Killed a starving wolf on the quarry road.")
-> the_body

= wolf_gone
// Getting past the wolf without a fight is worth the same as the fight (docs/DESIGN.md).
~ set_flag("quarry_wolf_spared")
~ give_xp(50)
-> the_body

= fates_mercy
// Fate's Mercy: Odda Brasswick, a priest of the Steadfast Flame, finds you on the road.
You wake to the creak of cart wheels and the smell of pine resin. You're lying in the back of a wagon of firewood, wrapped in a blanket that isn't yours. A broad dwarf woman in a priest's grey walks beside the ox, singing under her breath. #location:The quarry road #time:Dusk

"Ah. Awake," she says. "Odda Brasswick, of the Steadfast Flame. I found that wolf standing over you and gave it a crack with my staff, and it remembered its manners. Somebody had been through your pockets before I got there, mind. Little bare footprints all round you." She clicks her tongue at the ox. "Goblins. Hungry ones. Everything's hungry this year."

She takes you back to the temple in Bramblegate, sees you fed, and won't hear a word of thanks. #location:Bramblegate, the temple #time:Night
~ lose_coins()
~ long_rest()
~ set_flag("quarry_fates_mercy")
~ set_flag("met_odda")
~ add_deed("Was mauled by a wolf on the quarry road, and carted home by Odda Brasswick.")

In the morning you walk the south road again. The wolf is gone. The goblin is still there. #location:The quarry road #time:Morning
-> the_body

= the_body
The goblin lies on its back in the cart ruts. It carried nothing: no sack, no flour, not even a knife. #location:The quarry road
-> body_search

= body_search
* [Look at its wounds #check:medicine:10]
    { check("medicine", 10):
        The wolf did some of this, but not the long gouges down its back. Four of them, side by side, ragged at the edges. You lay your own hand beside them, and they fit. Fingers. Human fingers, gripping hard enough to tear, with grave dirt packed into the wounds.
        Something dead got hold of this goblin, and it ran a long way before it fell.
        ~ set_flag("saw_dead_hands")
        ~ quest_note("missing-miller", "A goblin dead on the quarry road, its back torn by human fingers with grave dirt in the wounds.")
        ~ give_xp(25)
    - else:
        The wolf has made a mess of it. Whatever killed the goblin, the wolf's teeth have written over it.
    }
    -> body_search
* [Read the ground around it #check:survival:10]
    { check("survival", 10):
        Its tracks come down the road from the quarry: bare feet, far apart, the toes dug deep. It was running flat out, away from home, with nothing in its hands. Nothing followed it. It just stopped.
        ~ set_flag("goblin_fled_quarry")
        ~ quest_note("missing-miller", "The dead goblin was running away from the quarry, not towards it.")
    - else:
        Wolf tracks, goblin tracks and your own boots, all trampled together in the ruts.
    }
    -> body_search
* {has_spell("detect-magic")} [Search it for magic #spell:detect-magic]
    You read the ritual from your spellbook, slowly, and let the spell settle over the road. Most of the goblin is just a dead goblin. But the gouges on its back glow, faintly and sickly, with the cold aura of necromancy.
    Dead hands, then. Hands that something made move.
    ~ set_flag("saw_necromancy")
    -> body_search
* [Go on to the quarry]
    -> quarry_mouth

= quarry_mouth
// Finding the goblins' home is a milestone for the reeve's bounty (and worth XP).
The road ends where the hill was cut away. The quarry is a deep grey bite out of the slope, its floor choked with rubble and thorn. At the foot of the cliff, half hidden behind a screen of brambles, a low black opening leads into the rock. Someone has daubed the stone around it with dozens of crude nettle leaves. #location:Brackenhollow, the quarry mouth #room:brackenhollow/mouth

{ has_flag("mill_goblins_talked"):
    On a ledge above the entrance, a goblin lookout stands up and waves both arms at you. Then, after some thought, it waves again, less certainly. You're expected.
- else:
    On a ledge above the entrance, a goblin lookout squats with a bow across its knees, squinting at the road. It hasn't seen you yet.
}
~ quest_note("missing-miller", "Reached the old quarry: the goblins of Brackenhollow live in a warren under the cliff.")
~ give_xp(50)
-> ch1_warren
