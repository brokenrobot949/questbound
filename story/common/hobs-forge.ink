// Hob's forge: the blades Hob sells (data/campaign/shops.js, "hobs-forge"). Prices are the
// weapons' own (data/srd/equipment.js), less 10% once the hero has won Hob's bet. A weapon in
// the pack is ready to fight with at once. Only what the hero can afford is offered.
//
// A tunnel: Bramblegate's forge in Chapter 1, and on the last morning of Act I, calls it.

=== hobs_wares ===
{ hobs_wares == 1:
    Hob waves his hammer at the racks along the back wall: daggers and spears, a mace or two, swords in a row, and one great two-handed blade he's very proud of. "All good iron," he says. "All honest prices. Mostly honest." #speaker:hob
- else:
    Hob's racks are as you left them, give or take a dagger.
}
{ has_flag("hob_discount"):
    "Less a tenth, for the arm that beat Greta," he adds, a little sourly. #speaker:hob
}
-> rack

= rack
+ {can_afford_at("hobs-forge", "dagger")} [Buy a dagger #buy:dagger #shop:hobs-forge]
    ~ buy_at("hobs-forge", "dagger")
    "Pointy end goes in the other fellow," Hob says, wrapping it in a rag. #speaker:hob
    -> rack
+ {can_afford_at("hobs-forge", "javelin")} [Buy a javelin #buy:javelin #shop:hobs-forge]
    ~ buy_at("hobs-forge", "javelin")
    A plain ash shaft with an iron head. "Throw it, then go and get it back," Hob advises. "That's the bit people forget." #speaker:hob
    -> rack
+ {can_afford_at("hobs-forge", "spear")} [Buy a spear #buy:spear #shop:hobs-forge]
    ~ buy_at("hobs-forge", "spear")
    "Keeps things at arm's length," Hob says. "And a bit further." #speaker:hob
    -> rack
+ {can_afford_at("hobs-forge", "mace")} [Buy a mace #buy:mace #shop:hobs-forge]
    ~ buy_at("hobs-forge", "mace")
    "For people who'd rather not think about edges," Hob says. "Very restful." #speaker:hob
    -> rack
+ {can_afford_at("hobs-forge", "shortsword")} [Buy a shortsword #buy:shortsword #shop:hobs-forge]
    ~ buy_at("hobs-forge", "shortsword")
    A short, plain blade, quick in the hand. Hob tests the edge on a hair from his eyebrow, which explains a great deal about his eyebrows.
    -> rack
+ {can_afford_at("hobs-forge", "flail")} [Buy a flail #buy:flail #shop:hobs-forge]
    ~ buy_at("hobs-forge", "flail")
    "Mind your own head with that," Hob says. "Everyone does it once." #speaker:hob
    -> rack
+ {can_afford_at("hobs-forge", "scimitar")} [Buy a scimitar #buy:scimitar #shop:hobs-forge]
    ~ buy_at("hobs-forge", "scimitar")
    A curved blade from somewhere warmer, with a twist of brass wire on the grip. "Came up the river in a trade," Hob says. "Never asked whose." #speaker:hob
    -> rack
* {can_afford_at("hobs-forge", "greatsword")} [Buy the greatsword #buy:greatsword #shop:hobs-forge]
    ~ buy_at("hobs-forge", "greatsword")
    Hob hands it over with both arms and a sniff. "Look after her," he says. "She's the best thing I've made this year." #speaker:hob
    -> rack
+ [That's all for now]
    ->->
