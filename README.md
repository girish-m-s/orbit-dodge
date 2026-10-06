# Orbit Dodge

A small browser arcade game: pilot a ship in orbit around a planet, dodge drifting asteroids, and snag glowing orbs for bonus points.

**Play:** open `index.html` in any modern browser — no build step or dependencies.

## Controls

| Input | Action |
| --- | --- |
| `←` `→` or `A` `D` | Change orbit direction |
| `Space` / `↑` | Boost outward (then fall back) |
| `↓` | Pull inward |

## Features

- Canvas-rendered dark space aesthetic with a glowing planet, stars, and particle bursts
- Survival-time scoring plus collectible bonus orbs
- Rising difficulty as asteroids spawn faster
- Game over screen with score and high score (persisted in `localStorage`)
- Start / restart UI overlays

## Files

- `index.html` — page shell and UI panels
- `style.css` — layout and neon space styling
- `game.js` — game loop, physics, rendering, and input

## License

MIT
