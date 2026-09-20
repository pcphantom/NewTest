# Dungeons & Mayhem
## Game Design Document

Version: 0.3
Status: Browser playtest implementation

## 1. Game identity

Dungeons & Mayhem is the digital playtest version of Mini Multiplayer Offline RPG (MMORPG), a fast card battler for 2 to 6 players. The first playable expansion is Python's Quest for the Holy Kale.

The game combines three layers:

1. Retro 2D pixel-art self-awareness. Cards and characters know they are flat, rendered objects.
2. MMORPG parody. Threat, tanking, class balance, patch notes, cooldowns and group-finder jokes appear as mechanics and flavor.
3. TTRPG parody. Dice, saving throws, character archetypes and tabletop presentation are part of normal play.

The digital version is a balance-testing platform for the physical card game. The browser build therefore keeps gameplay data separate from visual assets so card balance can change without regenerating artwork.

## 2. Player promise

A player should understand the game by looking at the table.

The interface shows:

- who is playing
- whose turn it is
- each player's HP
- each player's draw pile and discard pile
- persistent Defense cards and summons
- the active player's hand
- the most recent card played by each player
- pending dice rolls and choices
- the current action count

The combat log exists as secondary information. It never replaces the table as the primary way to understand play.

## 3. Current playable scope

### Players

- 2 to 6 total participants
- Single Player: 1 human plus computer opponents
- Local Multiplayer: all participants are human and share one device
- Local Multiplayer uses pass-and-play hand privacy
- The completed source material currently provides three finished character decks. Games above three participants may repeat character decks.

### Completed characters

- Grandpa the Grayscale: Controller / Wizard
- Malric the Meat Shield: Tank / Sentinel
- Patchadin the Overpowered: Hybrid Tank / DPS / Healer

### Core fixed rules

- Starting HP: 12 for every character
- Deck size: 28 cards
- Opening hand: 3 cards
- Draw phase: draw 1 card
- Base actions: 1 mandatory card play
- Additional actions come from Play Again symbols
- Last living player wins
- Card text overrides the shared rules

The finalized design-principles document is authoritative when older source documents contain obsolete variable-HP rules.

## 4. Main menu

The title screen has three actions:

### Single Player

Starts a game with one human player and 1 to 5 computer opponents.

Setup options:

- player name
- player character
- total participant count from 2 to 6

Computer players receive available characters automatically. Distinct completed characters are used before repeats.

### Local Multiplayer

Starts a hotseat game with 2 to 6 human players.

Setup options:

- participant count
- name for every player
- character for every player

For two or three players, the setup should encourage unique completed characters. Four to six player games necessarily permit repeats while only three completed decks exist.

### How to Play

Opens an in-game rules summary containing:

- objective
- setup
- initiative
- turn phases
- five core symbols
- Defense persistence
- targeting
- saving throws
- victory condition

This is a concise play reference, not a copy of the full design documentation.

## 5. Match setup and initiative

After character selection:

1. Every deck is built and shuffled.
2. Every participant draws 3 cards.
3. Every participant rolls a d20 for initiative.
4. Highest roll takes the first turn.
5. A tie for the highest roll causes only the tied participants to reroll.
6. Turn order then proceeds clockwise from the initiative winner through the original seat order.

### Digital initiative presentation

The initiative screen resembles a dice tray.

Each participant has:

- character portrait
- name
- d20
- current roll result
- prior tied roll results when applicable

Human players press Roll d20 on their turn to roll. Computer players roll automatically after a short visible delay.

## 6. Table layout

The game screen is a tabletop card arena.

### Desktop

- Opponent seats occupy the upper and side edges of the table.
- The active human seat occupies the lower edge.
- The center contains a turn marker, dice tray and current-play presentation.
- Each seat has a compact playmat with the same zones.

### Narrow screens

- Opponent seats compress into a horizontal seat rail.
- The active player's playmat remains the large primary region.
- A bottom hand bar remains on screen. Hover peeks; click/tap pins or closes it. The open hand scrolls horizontally without overlapping card text.
- The center tray remains visible above the active playmat.
- No page-level horizontal scrolling is required. On short screens, the board scrolls inside the viewport while the hand bar remains reachable.

## 7. Player playmat

Every player seat contains:

### Character zone

Displays:

- character portrait
- player name
- character name
- HP shown as a d12-style tracker with Health directly above it, current/max HP and a health bar
- status effects

### Draw pile

A face-down card stack showing the number of remaining cards.

The pile sits on the left side of the playmat.

### Discard pile

A face-up stack showing the most recently discarded card and discard count.

The pile sits beside the draw pile. The visible top card makes recent play readable directly from the table.

### Active Defense zone

Persistent Defense cards remain face-up on the playmat. Each card shows remaining shields.

### Summon zone

Summoned units such as Raid Paladins occupy a dedicated row.

### Last play

The most recently played card is shown as a small face-up card until another card replaces it. This gives immediate visual context even when that card has already moved to the discard pile.

## 8. Hand interaction

The active human player's hand is shown as a fan of real card-shaped objects.

A card contains:

- frame
- artwork window
- card name
- card type
- five-symbol output
- rules text
- flavor text

Card artwork contains no gameplay data. Names, symbols, text and numbers are rendered by the card frame layer.

### Interaction

- Hover shows a large, viewport-bounded preview outside the hand's clipping container.
- Click/tap opens a readable card reference, including skill rules and flavor text. An explicit Play button commits the selection.
- Own hand cards and all face-up public cards can be inspected. Opponent hands remain private.
- Targeted cards show named legal choices and the card's complete effect text.
- Only Judgment offers Can Do Everything symbol conversion before target selection.
- Card play resolves and updates health, persistent zones and the combat log.
- Defense cards remain in the active Defense zone.
- Other resolved cards move to the discard pile.

Keyboard controls, click and tap are sufficient. Escape closes optional overlays and the hand. Menu pauses automated play and preserves pending choices; Resume returns to the same match. Ending a match requires explicit confirmation. Full screen toggles through the browser API, with a visible unsupported state where unavailable.

## 9. Card art pipeline

Card illustration assets are independent files.

Recommended path:

`assets/card-art/<card_definition_id>.png`

Recommended source size:

- 1024 x 768 art canvas
- landscape composition designed to crop safely into the card art window
- no border
- no card frame
- no card name
- no symbols
- no numbers
- no rules text
- no flavor text
- no watermark

The runtime card renderer owns all gameplay information.

`card_prompts.md` contains the generation prompt for every completed unique card.

## 10. Core turn flow

### Draw phase

Draw 1 card.

### Play phase

The active player must play at least one card if able.

Play Again grants additional mandatory actions.

### Resolution

The card resolves through the rules engine:

- damage
- Defense
- healing
- draw
- Play Again
- card-specific text
- saving throws
- skills printed on the played card
- persistent effects

### End phase

End-of-turn effects resolve. Control moves clockwise to the next living participant.

## 11. Core symbols

### Attack

Each Attack symbol deals 1 damage.

Damage hits Defense first. Excess damage spills into HP.

### Defense

Each Defense symbol creates 1 shield.

Defense cards remain in play until destroyed or removed by their own duration or effect.

### Healing

Each Healing symbol restores 1 HP up to the fixed maximum of 12.

### Draw

Each Draw symbol draws 1 card.

### Play Again

Each Play Again value grants that many additional mandatory actions. A forced play with an empty hand draws two cards before continuing.

Digital cards display a single icon per effect with its value overlaid in bold outlined numerals, following the V2 brief. The repeated symbols in deck documents are design notation.

With 5 or 6 living participants, standard attacks follow Zone of Influence: nearest living neighbor on either side. Area effects and Mighty Powers are exempt, and explicit forced targets override normal selection.

## 12. Dice

Dice are a visible part of the digital game.

### d20

Used for:

- initiative
- saving throws

Natural 20 always succeeds on a saving throw.
Natural 1 always fails on a saving throw. Initiative has no success/failure: compare rolls, reroll only tied leaders until one wins, then continue clockwise.

### d6

Used by completed content such as Lay on Hands.

### Presentation

Dice rolls use the center dice tray. The roll result remains visible long enough to understand the outcome and is also recorded in the combat log.

## 13. Character identity

### Grandpa the Grayscale

Core play pattern:

- saving throws
- disruption
- hand pressure
- turn manipulation
- repeated chip damage

Signature abilities:

- Monochrome Lecture
- Screen Burn-In

### Malric the Meat Shield

Core play pattern:

- persistent Defense
- taunts
- damage reduction
- retaliation
- survival at low HP

Signature abilities:

- Threat Generation
- Second Wind

### Patchadin the Overpowered

Core play pattern:

- flexible offense, Defense and healing
- symbol conversion
- strong multi-role cards
- survival after lethal damage

Signature abilities:

- Can Do Everything
- Developer's Favorite

The six signature skills are attached to specific playable cards, not free buttons or permanent character passives. See [PLAYTEST_CHANGES.md](PLAYTEST_CHANGES.md) for exact mappings, timing and design rationale. Other printed deck mechanics remain intact.

## 14. Computer player

Single Player uses a deterministic heuristic computer player.

The first implementation makes decisions from visible game state and its own hand. It does not inspect hidden human hands.

Priority model:

1. prevent immediate elimination
2. use card-bound skills at useful targets; no free character-power activation
3. heal when damaged
4. establish Defense when exposed
5. use high-value draw and utility cards
6. attack vulnerable opponents
7. satisfy mandatory Play Again actions

Targeting priorities:

- lethal target when available
- lowest-HP opponent
- exposed opponent before shielded opponent
- forced taunt target when rules require it

Choice handling:

- resolves its own saving-throw follow-up choices
- chooses forced discards from its own hand
- controls Raid Paladins
- resolves Love or Hate
- handles Patchadin symbol conversion

The computer controller calls the same public rules-engine interfaces as human input. It does not mutate game state around validation.

## 15. Information visibility

### Public

- HP
- deck count
- discard count
- discard top card
- active Defense
- summons
- statuses
- initiative results
- played cards
- dice results

### Private

- cards in another human player's hand
- cards in the draw pile
- hidden computer hand contents

Hotseat mode hides the previous player's hand during device handoff.

## 16. Visual direction

The digital table should feel like a physical parody card game interpreted through a late-1990s PC RPG.

### Table

- dark green or charcoal felt
- worn wood edge
- pixel-grid accents
- restrained CRT texture

### Cards

- physical card proportions
- distinct frame treatment by card type
- large illustration window
- readable symbol row
- concise rules area
- visible rarity or type treatment only when backed by game data

### Character palettes

Grandpa:
- grayscale
- phosphor green
- faded CRT amber

Malric:
- iron gray
- leather brown
- muted red
- shield blue

Patchadin:
- warm gold
- ivory
- royal blue
- restrained holy glow

## 17. Technical architecture

Static GitHub Pages deployment.

No framework is required.

Modules:

- `Constants.js`: fixed values and enum-like identifiers
- `CardData.js`: immutable card gameplay data
- `CharacterData.js`: immutable character gameplay data
- `CardRenderer.js`: card and card-art presentation
- `DeckHandler.js`: deck construction and card movement
- `DiceHandler.js`: random dice boundary
- `GameState.js`: mutable match state
- `RulesEngine.js`: validated gameplay resolution
- `TurnHandler.js`: turn and initiative progression
- `AIPlayerHandler.js`: computer decisions through public gameplay interfaces
- `UIHandler.js`: screen and table rendering
- `InputHandler.js`: human browser input
- `GameBootstrap.js`: dependency wiring

The rules engine stays independent of the DOM.

## 18. Data and art separation

A card definition owns gameplay data.

Artwork owns visual illustration only.

The renderer combines both at runtime.

This allows:

- balance changes without art regeneration
- card-frame redesign without art regeneration
- alternate card frames using the same artwork
- localization without image edits
- automated playtesting using card data with no graphics dependency

## 19. Failure behavior

Missing required gameplay data is a fatal error.

The game does not silently invent:

- cards
- rule values
- reshuffle behavior
- missing characters
- missing targets

The complete shared rules define discard-pile recycling on an empty draw pile and a two-card refill when a mandatory play meets an empty hand. If no cards remain available, resolve as much as possible. The browser implements these rules.

## 20. Testing requirements

Before a browser build is considered ready:

- every completed deck contains exactly 28 cards
- all card IDs are unique
- every effect ID is implemented
- initiative handles unique highs and ties
- single-player AI can complete legal turns
- hotseat handoff hides private hands
- Defense absorbs and spills damage correctly
- Developer's Favorite requires its card, expires at the next turn and rescues only once per match
- mandatory Play Again actions cannot be skipped
- all decision queues resolve in order
- static entry files load from GitHub Pages paths
- zero em dash characters in public project files
- no swallowed gameplay failure

## 21. Current content limitation

The first implementation has three finished decks because those are the three complete Python's Quest decks in the repository.

Draft character names in the source documentation are design targets. They are excluded from live play until their full 28-card decks exist.
