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

The d12 at each seat is labeled Health and tracks current HP; it is not rolled. Initiative has no success/failure. Saving throws use the DC printed on the card.

## Table controls

- Hover over Your hand to peek; move away to close. Click/tap pins it open or closes it.
- Hover a face-up card for a large preview. Click/tap to read its full rules and flavor text; choose Play to use a hand card.
- Card skills at each seat explains the cards carrying that character's special effects. Opponents' private hands are never exposed.
- Menu pauses the current match. Resume preserves hands, turns and pending choices. Ending a match requires confirmation.
- Full screen is available on supported browsers. The hand bar remains in the viewport on desktop and mobile; smaller screens can scroll the board and swipe opponent seats.

See [PLAYTEST_CHANGES.md](PLAYTEST_CHANGES.md) for the six card-bound skill mappings and preserved custom mechanics.

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

For interactive browser regression checks, install Playwright and Chrome, start the local server on port 8765, then run `node tests/browser.smoke.mjs`. Alternatively, set `TEST_URL`, `PLAYWRIGHT_MODULE` and `BROWSER_CHANNEL` for your environment. This checks desktop, portrait/landscape mobile, large hands, six-player seating, public-card reading, actual damage, pause/resume, full screen and explicit quit. Screenshots are generated in the system temporary directory.

An empty draw pile recycles its discard pile. If a mandatory play meets an empty hand, draw two and continue. With five or six living players, standard attacks target the nearest living neighbor on either side; area effects and Mighty Powers are exempt. See PLAYTEST_CHANGES.md for V2 deck corrections and remaining playtest limits.
