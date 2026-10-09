# Orbit Dodge

A small browser arcade game: pilot a ship in orbit around a planet, dodge drifting asteroids, and snag glowing orbs for bonus points.

**Play:** open `index.html` in any modern browser — no build step or dependencies.

## Controls

| Input | Action |
| --- | --- |
| `←` `→` or `A` `D` | Change orbit direction |
| `Space` / `↑` | Boost outward (then fall back) |
| `↓` | Pull inward |
| `P` / `Esc` | Pause / resume |

Skim past asteroids for **near-miss bonuses**. Chain near-misses and orb pickups within a couple of seconds to build a **combo multiplier**. Watch for green ringed **shield orbs**: a shield absorbs one asteroid hit, then gives you a brief blink of invulnerability.

## Features

- Canvas-rendered dark space aesthetic with a glowing planet, stars, and particle bursts
- Glowing ship engine trail (warms up when boosting) and screen shake on near misses / crashes
- Asteroid shatter shards when rocks hit the planet or leave the playfield
- Survival-time scoring plus collectible bonus orbs
- Shield power-up orbs with a glowing bubble, HUD badge, and post-hit grace period
- Near-miss scoring with floating popups, ship glow, and combo multiplier
- Pulsing edge warnings show where each asteroid is about to fly in
- Rising difficulty as asteroids spawn faster
- Game over screen with score, high score, and near-miss count (high score persisted in `localStorage`)
- Start / restart / pause UI overlays (the game auto-pauses if you switch tabs or windows)

## Files

- `index.html` — page shell and UI panels
- `style.css` — layout and neon space styling
- `game.js` — game loop, physics, rendering, and input

## License

MIT
