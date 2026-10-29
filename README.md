# Bear games

Play online: **https://captain-bear.netlify.app** (Captain Bear 2). The earlier games are at `/captain-bear` and `/commander-cap`.

# Captain Bear 2: The Four Seasons (3D)

`captain-bear-2.html` is the sequel: a 3D diorama puzzle adventure in the spirit of Captain Toad, starring a teddy bear who can't jump. Winter is coming, so Bear travels from spring to winter gathering food, then climbs to his cozy den to hibernate.

- **12 worlds in 4 chapters** (Spring, Summer, Autumn, Night/Winter), each with its own look, weather and lighting.
- **New mechanics:** slippery ice (Bear and crates slide), tiles that crumble once you step off, bounce mushrooms that spring you 2 tiles, crates on gold/silver plates that raise matching bridges, honey keys and locked gates.
- **Returning mechanics:** stairs, ladders, ledge drops, crates into water, red/blue switch blocks, hollow-stump warps, pinecones to throw at bees.
- Each world has 4 treats, a **secret golden acorn**, and a **step challenge** badge.
- Every world is verified by the built-in solver (`solve()` / `solveExact()` in the script).
- Graphics: physically based lighting, baked ambient occlusion, rounded toy blocks, swaying grass, waterfalls, falling petals/leaves/snow, fireflies and a headlamp at night, intro flyover, bloom and tilt-shift. It lowers quality on slower devices.

Hosting: `netlify.toml` publishes the repo root as a static site with `/` serving `captain-bear-2.html`.

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

---

# OutRun 2027: Costa del Sol

`outrun.html` is an OutRun-style arcade racer starring a red rocket-thruster roadster, driving the coast from **Marbella to Tarifa**.

- 5 stages with checkpoints and a countdown timer: Marbella (Golden Mile) → Puerto Banús → Estepona → Sotogrande → Tarifa. The sky drifts from morning to sunset as you go.
- **Loops and corkscrews**: the roadster can only stay on the road upside down above 270 km/h, which is faster than it goes on wheels alone. Use the rocket boost to get there. Too slow and you fall off.
- **Thruster hop** uses the underside jets to jump over traffic.
- **Secret boat level**: at Sotogrande, look for the MARINA sign and drive off the left side onto the slipway. The roadster switches to boat mode for a run across the Bay of Gibraltar (buoys, yachts, golden rings, dolphins, wave jumps), then rejoins the road for Tarifa.
- Scenery: palms, white villages, holiday blocks, umbrella pines, beach bars, Osborne bulls, Puerto Banús yachts, the Sotogrande polo field, the Rock of Gibraltar, Tarifa wind farm and kitesurfers, Africa across the Strait, and Tarifa castle at the finish.
- Pick from three synth radio stations before the race (all music is generated live).

| Key | Action |
| --- | --- |
| ↑ / W | Accelerate |
| ↓ / S | Brake |
| ← → / A D | Steer |
| Space / X | Rocket boost |
| Shift / C | Thruster hop |
| P / Esc | Pause |
| M | Mute |
| R | Restart |

Gamepad and on-screen touch buttons also work.
