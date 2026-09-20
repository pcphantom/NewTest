# Dungeons & Mayhem Browser Build

This repository contains a static browser implementation of the completed Python's Quest playtest content from `NewTest-repo/NewTest/`.

## Play

Open `index.html` through a web server.

For GitHub Pages, use repository **Settings > Pages** and set **Source** to **Deploy from a branch**, with **main** and **/(root)** selected. The repository includes `.nojekyll` so GitHub Pages serves the static files directly.

For local development:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Game modes

- Single Player: one human plus computer-controlled opponents
- Local Multiplayer: 2 to 6 human players using hotseat play

Every match begins with a visible d20 initiative roll. Highest roll takes the first turn. Highest ties reroll.

## Current playable content

- Grandpa the Grayscale
- Malric the Meat Shield
- Patchadin the Overpowered
- 28 cards per completed character
- 12 starting HP per character
- 2 to 6 total participants

The source material currently contains three completed decks. Games with more than three participants may repeat completed characters.

## Design documentation

- `GDD.md`: browser-game design, screen flow, table layout, AI behavior and asset pipeline
- `card_prompts.md`: illustration-only generation prompts for every unique completed card, character portraits and the expansion card back

Card illustrations are separate from card gameplay data. The runtime card renderer owns names, symbols, values, rules text and flavor text.

## Code map

- `index.html`: static entry point
- `Styles.css`: table, menu, cards and responsive visual presentation
- `src/Constants.js`: shared gameplay constants and identifiers
- `src/CardData.js`: immutable card definitions and deck quantities
- `src/CharacterData.js`: character metadata and signature abilities
- `src/CardRenderer.js`: card frames, card backs and illustration-window rendering
- `src/DeckHandler.js`: deck construction, shuffling, drawing and discard movement
- `src/DiceHandler.js`: deterministic dice boundary
- `src/GameState.js`: mutable match, initiative and table state
- `src/RulesEngine.js`: card resolution, damage, shields, abilities and dice effects
- `src/TurnHandler.js`: initiative, turn phases and rotation
- `src/AIPlayerHandler.js`: computer-player decisions through rules-engine interfaces
- `src/UIHandler.js`: menu, initiative, table and modal rendering
- `src/InputHandler.js`: browser input and automatic computer flow
- `src/GameBootstrap.js`: dependency wiring
- `tests/`: deterministic rule, data, initiative and computer-player tests

## Tests

```bash
npm test
```

The validation workflow also syntax-checks every JavaScript module.

The browser build intentionally fails when a draw is requested from an empty draw pile. The current project rules do not define a reshuffle rule, so the implementation does not invent one.
