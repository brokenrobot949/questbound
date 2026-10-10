// Chapter 1 · Bramblegate, beat 1: the north gate (docs/STORY.md).
//
// Rain at dusk. The gate is barred, and Warden Tamsin Pike won't open it till dawn. Every way
// in works out: talk, bluster or a lie (each a check), a soldier's token, a pilgrim's right of
// sanctuary, a climb over the wall, a cantrip (Light, Prestidigitation, Thaumaturgy), Charm
// Person (Pike saves; she remembers it later), or simply waiting. Failing or waiting means a
// night under the eaves, and pale lights on the barrow hills (flag saw_barrow_light).

=== ch1_arrival ===
// The opening line ties to the hero's Drive.
{has_drive("glory"): You came north for glory. Nobody ever wrote a song about someone who stayed home.}
{has_drive("faith"): You came north for your faith. If the dead are walking, someone has to lay them back down.}
{has_drive("wealth"): You came north for coin. Frontier towns pay well for the jobs nobody else wants.}
{has_drive("knowledge"): You came north for answers. Barrows don't empty themselves, and you want to know why these ones are.}
{has_drive("justice"): You came north to set things right. A town is being bled dry, and nobody important seems to care.}
{has_drive("freedom"): You came north because nobody could stop you. The road goes wherever you point it.}
{has_drive("kinship"): You came north for the people who need you. A town under siege needs every friend it can get.}

The reeve of Bramblegate sent word down every road: the dead are walking out of the barrows, goblins are raiding the farms, and capable folk will be paid. You answered. Three days' walk later, the town's walls rise out of the rain. #location:The north road #time:Dusk

Rain needles down as you reach the north gate. The bar is already across. A lantern swings above it, and under the lantern a gate warden in a dripping cloak watches you come. #location:Bramblegate, north gate

"Gate shuts at sundown," she calls. "Pike, gate warden, and I don't care who you are. There's barrow-dead on the roads. Nobody comes in till dawn." #speaker:pike

Past her shoulder you can see warm windows and smoke curling from an inn chimney. Out here, the wind is picking up.
~ set_objective("Get through Bramblegate's north gate, or find somewhere dry to wait for morning.")

* [Talk her into opening the gate #check:persuasion:15]
    You step into the lantern light, show her your empty hands, and tell her plainly who you are and why you've come.
    { check("persuasion", 15):
        -> gate_opens
    - else:
        -> gate_stays_shut
    }
* [Tell her the town needs you more than she needs her rules #check:intimidation:15]
    You plant your feet in the mud and raise your voice over the rain. The reeve called for help. Help is standing in a puddle. Does she want to explain to him why it's still out here?
    { check("intimidation", 15):
        -> gate_opens_grudging
    - else:
        -> gate_stays_shut
    }
* [Say the reeve sent for you by name #check:deception:15]
    "Reeve Corbin is expecting me tonight," you call up, with all the confidence of someone who has never met Reeve Corbin. "He'll want to know who kept me waiting."
    { check("deception", 15):
        -> gate_opens
    - else:
        -> gate_sees_through
    }
* {has_background("soldier")} [Show her your old regiment's token]
    -> soldier_token
* {has_background("acolyte")} [Ask for sanctuary, as temple law allows]
    -> sanctuary
* {has_background("criminal")} [Find a dark stretch of wall and climb it #check:athletics:15]
    -> climb
* {can_cast("light")} [Show her you're no barrow-thing #spell:light]
    ~ cast("light")
    You touch the clasp of your cloak and speak a word. It blazes with clean white light, bright enough to show the warden your face, your empty hands and nothing of the barrow about you.
    -> cantrip_trick
* {can_cast("prestidigitation")} [Make her lantern flame dance #spell:prestidigitation]
    ~ cast("prestidigitation")
    You flick your fingers at the lantern. Its flame stretches, curtsies, and spins into a tiny dancing figure that bows to the warden before it settles back down.
    -> cantrip_trick
* {can_cast("thaumaturgy")} [Speak with a voice like the temple bell #spell:thaumaturgy]
    ~ cast("thaumaturgy")
    You let the old words settle on your tongue, and when you speak, your voice booms off the wall like a struck bell. The lantern flame leaps with every word, and the gate's iron bands hum.
    -> gate_opens_grudging
* {can_cast("charm-person")} [Charm the warden #spell:charm-person]
    You meet her eyes through the rain, say something warm and ordinary, and let the spell ride in on the words.
    { cast_on("charm-person", "Warden Pike", "wisdom", 1):
        -> gate_charmed
    - else:
        -> gate_feels_the_spell
    }
* [Wait out the night under the gatehouse eaves]
    -> night_at_the_gate

= gate_opens
~ set_flag("warden_opened_gate")
~ add_deed("Talked Warden Pike into opening the north gate after sundown.")
The warden studies you for a long moment. Then she sighs, sets her shoulder to the bar and heaves it aside.

"Straight to the Tallow and Thistle, and stay off the walls," she says. "If anything follows you in, I'm telling the captain it was your idea." #speaker:pike
-> into_town

= gate_opens_grudging
~ set_flag("warden_opened_gate")
~ add_deed("Shouted the north gate open. Warden Pike hasn't forgiven it.")
"Fine," the warden snaps. "Fine! Come in and drip on somebody else." She hauls the bar aside hard enough to rattle the hinges. #speaker:pike

"You'll be at the Tallow and Thistle," she adds as you pass. It isn't a question. "I'll know where to find you." #speaker:pike
-> into_town

= gate_sees_through
She laughs, which is worse than shouting. "The reeve's expecting nobody. The reeve's asleep." She leans on the parapet. "Nice try, though. There's a dry corner under the eaves." #speaker:pike
-> night_at_the_gate

= gate_stays_shut
She hears you out, then shakes her head. "Nice speech. Still no." She jerks her chin at the gatehouse. "There's a dry corner under the eaves. Better than the road." #speaker:pike
-> night_at_the_gate

= soldier_token
You dig the brass token out from under your collar: your old regiment's badge, worn smooth by your thumb on long nights.

The warden squints at it, then at you. "My brother wore one of those." The bar is off before you've tucked the token away. "Welcome to Bramblegate, soldier. The Tallow and Thistle's the warm one." #speaker:pike
~ set_flag("warden_opened_gate")
~ add_deed("Showed an old regiment's token at the north gate. Warden Pike let a fellow soldier in.")
-> into_town

= sanctuary
"I ask for sanctuary," you call up, "as temple law allows any pilgrim, in any town, after dark."

There's a long pause. Somewhere above, the warden swears quietly. "Prior Crane would have my hide if I turned away a holy traveller," she grumbles, and the bar scrapes aside. "Temple's past the square. Inn's closer. Pick one and stay in it." #speaker:pike
~ set_flag("warden_opened_gate")
~ add_deed("Claimed a pilgrim's right of sanctuary at the north gate after dark.")
-> into_town

= climb
You thank the warden, wander off into the rain, and follow the wall round until her lantern is a smudge behind you. Here the stones are old and badly pointed. Plenty of handholds.
{ check("athletics", 15):
    -> climb_over
- else:
    -> climb_fall
}

= climb_over
You go up and over like it's an old habit, which it is, and drop into a dark alley that smells of wet cabbage. Nobody shouts. Somewhere ahead, an inn sign creaks in the wind.
~ set_flag("climbed_the_wall")
~ add_deed("Climbed Bramblegate's wall in the dark rather than wait for morning.")
-> into_town

= climb_fall
Halfway up, a stone shifts under your boot and you land in the ditch with a splash that echoes off the wall. A lantern bobs towards you along the parapet.

"Thought so," says the warden, peering down. "Dry corner under the eaves. Don't make me tell the captain." #speaker:pike
-> night_at_the_gate

= gate_charmed
// Charm Person lasts an hour, and when it ends she knows she was charmed (charmed_pike).
~ set_flag("warden_opened_gate")
~ set_flag("charmed_pike")
~ add_deed("Charmed Warden Pike into opening the north gate after sundown. She'll know, when it wears off.")
The warden's frown melts into a smile, as if you were an old friend come home. "Well, why didn't you say it was you?" She hauls the bar aside herself. "Get in out of the wet. Mind the step." #speaker:pike

In an hour the charm will fade, and she'll know exactly what you did. But that's an hour away, and the inn is right there.
-> into_town

= gate_feels_the_spell
Something flickers behind the warden's eyes, and her hand goes to her cudgel. "Was that a spell? At my gate?" She leans out over the parapet and glares at you. "There's a dry corner under the eaves. Keep your fingers still in it." #speaker:pike
-> night_at_the_gate

= cantrip_trick
~ set_flag("warden_opened_gate")
~ add_deed("Charmed the north gate open with a little magic.")
The warden stares, then laughs despite herself. "Well, the dead don't do tricks." She sets her shoulder to the bar and heaves it aside. "In you come, before you set the gatehouse alight." #speaker:pike
-> into_town

= night_at_the_gate
~ set_flag("saw_barrow_light")
You find a dry patch under the eaves and pull your cloak tight. The warden watches you for a while, then decides you're not worth worrying about.

Near midnight, a pale light moves on the hills to the east, where the barrows are. It sways like a lantern, but no lantern burns that colour. You watch it until it gutters out.
~ add_deed("Spent a cold night under the north gate's eaves, and saw pale lights on the barrow hills.")
~ long_rest()

At dawn the bar comes off. "Patient sort, aren't you?" says the warden, though her eyes keep drifting back to those hills. "The Tallow and Thistle's across the square. Tell Morwen I sent you and she'll feed you twice." #location:Bramblegate #time:Dawn #speaker:pike
-> ch1_morning

= into_town
The Tallow and Thistle is still lit. Inside it smells of woodsmoke and stew, and a broad woman with flour to the elbows takes one look at you dripping on her floor and puts a bowl in your hands before you've said a word. #location:Bramblegate, the Tallow and Thistle #time:Night

"Morwen Tallow," she says. "Room's at the top of the stairs, breakfast's at dawn. Nobody's out there tonight but the dead, and they don't pay." #speaker:morwen
~ long_rest()
-> ch1_morning
