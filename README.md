# Commander Cap and the Veggie Valley Caper

A retro platformer that mixes **Toad from Super Mario Bros. 2** (pull up veggies, lift baddies, throw them) with **Commander Keen** (raygun, pogo stick, candy points, key gems, EGA colours).

Open `index.html` in any browser. Works with keyboard, gamepad, or touch buttons on a tablet/phone.

| Key | Action |
| --- | --- |
| Arrows / WASD | Move |
| Space / Z / Up | Jump |
| Down | Pull up a veggie, or lift a baddie you're standing on |
| X | Zap with raygun (stuns) / throw what you're carrying |
| C | Pogo stick on/off (hold jump for big bounces) |
| P / Esc | Pause |
| M | Mute |

Three levels: Mushroom Meadow, Crystal Caves, and King Croak's Castle (boss: only thrown veggies hurt him).

---

# Captain Bear: Honey Tracker (3D)

`bear.html` is a 3D puzzle game in the style of Captain Toad: Treasure Tracker, starring a teddy bear who can't jump.

- The camera follows Bear and swings round to look the way he is walking (toggle with the "Camera" button; Q / E or drag to spin by hand).
- Climb stairs and ladders, hop down ledges, push crates into water to make bridges.
- Step on switches to swap red and blue blocks, hop through hollow stumps.
- Pick up pinecones and throw them at grumpy bees.
- Eat 5 treats per world (honey, salmon and berries), then grab the giant golden honeycomb. Undo (Z) and Restart (R) are always available.

On tablets: on-screen buttons, or tap a tile and the bear walks there.

Ten worlds, each about 17x11 tiles: Picnic Meadow, Bee Valley, Crate Canal, Switch Ruins, Stump Isles, Honey Hills, Salmon River, Bear Fortress, Pinecone Forest, King Bee's Hive. Every one is checked by the built-in solver (`solve()` in the script), which finds a full route that eats every treat.
