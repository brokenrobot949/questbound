// Chapter 1 side quest, Too Many Cats (docs/STORY.md, "Chapter 1 side content").
//
// The Tallow and Thistle's cats keep vanishing. Morwen thinks there are wasps in the hayloft
// over the stable, and has a smudge pot for them. It's a nest of Stirges. Look at the stable
// first (Investigation) and work out what they are (Nature), or ask the old cob (Speak with
// Animals). Smoke the nest before going up and only the two hunting Stirges are awake: a Low
// fight for a level 1 hero (loft-stirges). Otherwise a third wakes in the nest on round 3. Creep
// across the boards (Stealth) to strike first.
// After the fight the cats are found up on the highest beam, alive and furious: they weren't
// vanishing, they were besieged. The nest gives a good first loot (a Potion of Healing and some
// old coins), and Morwen gives free breakfasts for life. Losing is Fate's Mercy: Morwen finishes
// the job with a poker, and Nan Burdock takes her fee from your purse.
//
// A tunnel: Chapter 1's notice board and the last morning in Bramblegate (after the feast)
// both call it, and it returns to them. On the last morning (last_morning) the text knows
// it's been a fortnight, and Odda and Fen may be along.

=== side_cats ===
~ start_quest("too-many-cats")
{ has_flag("last_morning"):
    Morwen is clearing up after the feast, with her sleeves rolled to the elbow, and her face falls when you mention the cat. "Biscuit? Still gone. And Pudding since, and the kitchen tom nobody ever named. A fortnight, and not a whisker." #location:Bramblegate, the Tallow and Thistle #speaker:morwen
- else:
    Morwen is scrubbing the breakfast pans, and her face lights up when you hold out the notice. "Biscuit! Oh, bless you. She's the third this week. First Pudding went, then the kitchen tom nobody ever named, and now my Biscuit." #location:Bramblegate, the Tallow and Thistle #speaker:morwen
}

"Cats don't leave an inn," she says. "An inn is a cat's idea of heaven. Warm, and full of dropped sausage." She lowers her voice. "And there's something in the hayloft over the stable. It whines like a kettle up there of a night. Wasps, I think. I've a smudge pot for wasps, if you're going up." #speaker:morwen
-> yard

// The stable yard, under the hayloft. Looking around first is worth it.
= yard
* [Have a look round the stable first #check:investigation:10]
    The old cob in the end stall stands with its head hung low, as if it hasn't slept in days.
    { check("investigation", 10):
        Down its neck runs a line of small round wounds, a dozen of them, neat as if a cobbler had gone at it with an awl. Wasps don't do that. In the straw under the hayloft's hatch you find a scrap of wing, thin as paper and veined like a bat's.
        ~ set_flag("saw_stirge_bites")
    - else:
        The cob looks tired, and the straw smells of horse. Whatever's up in the loft, the stable isn't telling.
    }
    -> yard
* {has_flag("saw_stirge_bites")} [Work out what's been biting the cob #check:nature:10]
    { check("nature", 10):
        Stirges. Bloodsuckers the size of a fist, with bat's wings and a nose like a darning needle. They nest in dark eaves, drink from anything warm, and sleep like the dead in smoke. A smudge pot won't kill them, but it'll keep the nest asleep.
        ~ set_flag("knows_stirges")
    - else:
        Something that flies, and bites, and drinks. Beyond that, you'd only be guessing.
    }
    -> yard
* {can_cast("speak-with-animals")} [Ask the old cob what's been at its neck #spell:speak-with-animals]
    ~ cast("speak-with-animals")
    The cob takes its time about answering, as old horses do. Little birds, it says, with knives for noses. They come down from the loft in the night and drink, and drink, until they're too fat to fly straight.
    The cats went up the ladder after them, it adds, chewing. The cats have not come down.
    ~ set_flag("saw_stirge_bites")
    -> yard
* [Take Morwen's smudge pot up the ladder]
    Morwen fills an old iron pot with coals from the kitchen fire and packs it with wet straw. It smokes like a bad conscience.
    You climb the ladder one-handed, ease the hatch up a crack, and push the pot through. Up in the dark, the whining goes slow and sleepy, and then mostly stops. Not all of it.
    ~ set_flag("smoked_the_nest")
    -> loft
* [Climb straight up the ladder]
    -> loft

// The hayloft: the fight.
= loft
You push the hatch up and climb into the hayloft. It's dim and close under the thatch, and it smells of old hay and something coppery. {has_flag("smoked_the_nest"): Smoke curls along the rafters.}
{
- companion_alive("fen") && companion_alive("odda"):
    Fen comes up the ladder behind you, sees what's hanging from the rafters, and says a word that Odda pretends not to hear.
- companion_alive("fen"):
    Fen comes up the ladder behind you, sees what's hanging from the rafters, and says a word you didn't know he knew.
}
Two leathery things the size of your fist hang from a beam like rotten plums, wings folded, long thin noses tucked against their chests. Under the eaves is a nest of straw and stolen hair{has_flag("smoked_the_nest"):, still and smoking| that rustles, as if something in it is dreaming}. As you watch, one of the plums unfolds its wings, and turns its needle nose toward you.
* [Fight them #combat:loft-stirges]
    -> fought
* [Creep across the boards, and strike first #check:stealth:10]
    { check("stealth", 10):
        You ease off the ladder and cross the boards between the hay bales, keeping to the joists where they won't creak. You're right under the beam before either of them knows it.
        -> first_strike
    - else:
        A board groans under your boot like a door in a ghost story. Both of them drop off the beam at once, whining.
        -> forced
    }

= first_strike
* [Strike #combat:loft-stirges #surprise]
    -> fought

= forced
* [Fight them #combat:loft-stirges]
    -> fought

= fought
{ combat_won():
    -> cats
- else:
    -> mercy
}

// The cats, the nest, and Morwen.
= cats
The last stirge drops into the hay and stays there. In the quiet you hear something else: a low, outraged yowl, from very high up.

On the highest cross-beam, puffed up to twice their proper size, sit the inn's cats: a ginger, a black, and a small grey one glaring down at you with the fury of a queen kept waiting. Biscuit. They weren't vanishing. They were besieged.
* [Coax them down #check:animal-handling:10]
    { check("animal-handling", 10):
        You talk soft nonsense and hold up a hand, and after a long, considering minute Biscuit comes down the beam, the rafter and the hay bale, and onto your shoulder, where she settles as if she's always lived there. The others follow her like a royal procession.
    - else:
        Biscuit looks at you the way cats look at people who have said something stupid. In the end Morwen comes up the ladder with a fish, and the cats come down for that.
    }
* [Leave the hatch open, and let them come down when they're ready]
    You leave the hatch open and go down. By the time you're back in the kitchen, three cats are in front of the fire, washing as if nothing ever happened.
- Then the nest. Pulled apart, it's straw and horsehair and a great deal of stolen cat fur, woven round a hole in the thatch where somebody, long ago, hid a little purse of old coins and a corked red bottle. The bottle is still good.
~ give_coins(8)
~ give_item("potion-of-healing")
-> paid

= paid
Morwen weeps into Biscuit's fur, which Biscuit permits, and declares that you'll never pay for a breakfast in the Tallow and Thistle again. "Within reason," she adds, looking at you. "I've seen you eat." #speaker:morwen
{ companion_alive("odda"):
    Odda puts the kettle on, which is how she says well done.
}
~ set_flag("cats_done")
~ set_flag("morwen_free_breakfasts")
~ finish_quest("too-many-cats")
~ give_xp(50)
~ add_deed("Cleared a nest of Stirges out of the Tallow and Thistle's hayloft, and brought the inn's cats down.")
->->

// Fate's Mercy: Morwen finishes the job, and Nan Burdock takes her fee from your purse.
= mercy
You come to on Morwen's kitchen floor with a cold cloth on your forehead and Nan Burdock's long face over you. The potboy heard you go down and hauled you out by the ankles. Morwen went up after the stirges with a hot poker and the wrath of a woman whose cats have been interfered with, and there are no stirges in her loft now. #location:Bramblegate, the Tallow and Thistle

"I've taken my fee," Nan says, and hands you back your purse, which is empty. "Bleeding. Leeches would have been cheaper." #speaker:nan
~ lose_coins()
~ long_rest()
~ set_flag("cats_fates_mercy")
You sleep the clock round in Morwen's best bed, and wake to the weight of a small grey cat asleep on your chest. Biscuit came down by herself, and the others with her.
~ set_flag("cats_done")
~ set_flag("morwen_free_breakfasts")
~ finish_quest("too-many-cats")
~ give_xp(50)
~ add_deed("Went up into the Tallow and Thistle's hayloft after a nest of Stirges, and was carried down again. Morwen finished them off with a poker.")
->->
