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

# Marbella Run

`marbella-run/` is an arcade racer: a rocket-thruster supercar on a 41 km grand tour from **Marbella** along the Costa del Sol to **Tarifa**, up the Algarve to **Lisbon**, and back inland via Seville and Ronda to **Marbella**.

It is a self-contained folder: the 3D engine (three.js r128), its bloom post-processing and the fonts are bundled, so it works offline. Served over the web it is also an installable app (Add to Home Screen / Install). To publish on itch.io, upload `downloads/marbella-run.zip` as an HTML game (it is the folder's contents, with `index.html` at the top).

- **8 stages**: Marbella · Puerto Banús · Estepona · Sotogrande · Tarifa · Algarve · Lisboa · Home Run. The time of day runs from morning through sunset and a starry night over the Algarve to sunrise on the way home.
- **3 cars** in the garage: *Rocket Roadster* (all-rounder), *Sol Spider* (80s open-top with two passengers, best grip, biggest rocket tank) and *Aero-X* (long-tail hypercar, fastest but twitchy and thirsty).
- **Forks**: keep right after Puerto Banús to take the **AP-7 toll motorway** (a viaduct inland with no traffic and a 38% higher top speed), or keep left at Sotogrande for the **marina road** round the quay.
- **Loops and corkscrews** need 270 km/h: use the rockets.
- **Secret boat level**: on the Sotogrande marina road, drive off the left side onto the slipway.
- Landmarks: La Concha, the Rock of Gibraltar, Africa across the Strait, Tarifa castle, a Guadiana-style cable-stayed bridge into Portugal, Algarve sea stacks, Cabo de São Vicente, windmills, Sintra's Pena Palace, Lisbon's red suspension bridge and Cristo Rei, the Giralda in Seville, Ronda.
- **Graphics setting** in Settings: LOW (older phones), MEDIUM (real shadows) or HIGH (shadows, glow, colour grading and speed blur). Animated water, textured ground, headlight beams at night.
- **Menus**: Play, How to play, Records (best time and score per car), Settings (graphics, music and effects volume, km/h or mph, camera, auto-accelerate, vibration), Credits, plus a pause menu and medals on the results screen.
- **App Store / Google Play**: the native project is in `marbella-run-app/` (Capacitor). See `marbella-run-app/README.md` to build, and `marbella-run-app/store/listing.md` and `marbella-run-app/store/screenshots/` for the store listing. The privacy policy is `marbella-run/privacy.html`.

| Key | Action |
| --- | --- |
| ↑ / W | Accelerate |
| ↓ / S | Brake |
| ← → / A D | Steer (and choose a car in the garage) |
| Space / X | Rocket boost |
| Shift / C | Thruster hop |
| P / Esc | Pause |
| M | Mute |
| R | Restart |

Gamepad and on-screen touch buttons also work.
