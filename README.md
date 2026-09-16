# Tater’s Trucks

Arcade off-road racing in the spirit of Super Off Road. Championship dirt loops, a 3D test track, and a shop yard with barns and a silo.

## Play

```bash
npm install
npm run dev
```

Open the app, pick a truck, then race or hop into **Test Track** / **Shops**.

- **W / S** throttle and brake
- **A / D** steer (A is left)
- **Space** nitro

## Your truck

The player 3D truck lives at `public/game/3dobjects/player-truck.glb`.

`TatersTruck.blend` is the Blender file to edit it:

- `Body_Scan` — body
- `Wheel_FL` / `Wheel_FR` / `Wheel_RL` / `Wheel_RR` — tires (already separate objects)
- Front of the truck faces **-Y**

In Blender: Object Mode → click a wheel in the Outliner (top right) → **G** then **X** to slide it off the body → **Tab** for Edit Mode.

Export back to glTF (`.glb`) when you are ready to drop it in the game.

Kenney / Quaternius scenery models in `public/game/models/` are CC0.
