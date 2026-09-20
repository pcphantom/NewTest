# Dungeons & Mayhem Browser Build

This repository now contains a static browser implementation of the completed Python's Quest playtest content from `NewTest-repo/NewTest/`.

## Play

Open `index.html` through a web server. No build step and no external JavaScript dependencies are required.

For GitHub Pages, use repository **Settings > Pages** and set **Source** to **Deploy from a branch**, with **main** and **/(root)** selected. The repository includes `.nojekyll` so GitHub Pages serves the static files directly.

For local development:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Current playable content

- Grandpa the Grayscale
- Malric the Meat Shield
- Patchadin the Overpowered
- 28 cards per character
- 12 starting HP per character
- 2 to 6 local pass-and-play players

The source material currently contains three completed decks. For 4 to 6 player browser testing, duplicate characters are allowed by the setup screen.

## Code map

- `index.html`: static entry point
- `Styles.css`: responsive retro interface
- `src/Constants.js`: shared gameplay constants and identifiers
- `src/CardData.js`: card definitions and deck quantities
- `src/CharacterData.js`: character metadata and signature abilities
- `src/DeckHandler.js`: deck construction, shuffling, drawing, discard movement
- `src/DiceHandler.js`: deterministic dice boundary
- `src/GameState.js`: mutable match state and decisions
- `src/RulesEngine.js`: card resolution, damage, shields, abilities, dice effects
- `src/TurnHandler.js`: turn phases, handoff, mandatory actions, rotation
- `src/UIHandler.js`: rendering only
- `src/InputHandler.js`: browser input only
- `src/GameBootstrap.js`: dependency wiring
- `tests/`: deterministic rule and data tests

## Tests

```bash
npm test
```

The browser build intentionally fails when a draw is requested from an empty draw pile. The current project rules do not define a reshuffle rule, so the implementation does not invent one.
