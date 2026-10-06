// Phase 0 test scene: one Persuasion check at Bramblegate's north gate.
// Not campaign content; delete it once real scenes exist.
//
// A choice that makes a check carries a tag, e.g. #check:persuasion:15.
// The card then shows "Persuasion · Medium" and the player taps a d20 to roll.
// Keep the tag's skill and DC the same as the check() call underneath it.
//
// A #location tag on a line says where the hero is now; the save slot shows it.
// ~ set_flag("name") remembers that something happened, for later scenes to check.

=== gate_test ===
#location:Bramblegate, north gate
Rain needles down as you reach the north gate of Bramblegate. The bar is already across. A lantern swings above it, and under the lantern a gate warden in a dripping cloak watches you come.

"Gate shuts at sundown," she calls. "There's barrow-dead on the roads. Nobody comes in till dawn."

Past her shoulder you can see warm windows and smoke curling from an inn chimney. Out here, the wind is picking up.

* [Talk her into opening the gate #check:persuasion:15]
    You step into the lantern light, show her your empty hands, and tell her plainly who you are and why you've come.
    { check("persuasion", 15):
        -> gate_opens
    - else:
        -> gate_stays_shut
    }
* [Wait out the night under the gatehouse eaves]
    -> night_at_the_gate

= gate_opens
~ set_flag("warden_opened_gate")
The warden studies you for a long moment. Then she sighs, sets her shoulder to the bar and heaves it aside.

"Straight to the Tallow and Thistle, and stay off the walls," she says. "If anything follows you in, I'm telling the captain it was your idea."

The gate thuds shut behind you. Bramblegate smells of woodsmoke, wet stone and somebody's burnt supper. You're in. #location:Bramblegate
-> END

= gate_stays_shut
~ set_flag("saw_barrow_light")
She hears you out, then shakes her head. "Nice speech. Still no." She jerks her chin at the gatehouse. "There's a dry corner under the eaves. Better than the road."

You settle in with your back to the stone. Near midnight, a pale light moves on the hills to the east, where the barrows are. It sways like a lantern, but no lantern burns that colour.

At dawn the bar comes off and the warden waves you through. Her eyes keep drifting back to those hills. #location:Bramblegate
-> END

= night_at_the_gate
~ set_flag("saw_barrow_light")
You find a dry patch under the eaves and pull your cloak tight. The warden watches you for a while, then decides you're not worth worrying about.

Near midnight, a pale light moves on the hills to the east, where the barrows are. You watch it until it gutters out.

At dawn she lifts the bar. "Patient sort, aren't you?" she says. "Welcome to Bramblegate." #location:Bramblegate
-> END
