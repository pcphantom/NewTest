# Dungeons & Mayhem

**Mini Multiplayer Offline RPG (MMORPG)** — a parody card game where TCG mechanics meet TTRPG dice, wrapped in 2D pixel-art heroes who know they're cards and are fine with it.

> *"No depth? No problem."*

This repository is the **single source of truth** for the project. Design docs, rules, character decks, technical direction, and business stance all live here. Nothing is stored anywhere else.

**New here? Read [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) first.** It contains everything needed to work on the project cold.

---

## Index

### Core documents
| File | What it covers |
|---|---|
| [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) | Project context, hard rules, stances. **Start here.** |
| [`docs/01-game-concept.md`](docs/01-game-concept.md) | Full game concept — design philosophy, systems, expansions, business model |
| [`docs/02-rules.md`](docs/02-rules.md) | Complete rule set, turn structure, symbols, equipment, dice |
| [`docs/03-design-principles.md`](docs/03-design-principles.md) | Balance rules, parody approach, character-design constraints |
| [`docs/04-expansions.md`](docs/04-expansions.md) | Expansion universes, themes, character rosters |
| [`docs/05-monetization.md`](docs/05-monetization.md) | Pricing, ethics stance, revenue model, crowdfunding |
| [`docs/06-technical-architecture.md`](docs/06-technical-architecture.md) | Godot stack, P2P networking, matchmaking, infrastructure cost |
| [`docs/07-deck-construction.md`](docs/07-deck-construction.md) | TCG customization formats and how to keep them balanced |
| [`docs/08-godot-architecture.md`](docs/08-godot-architecture.md) | Client project layout — directory structure, 50+ modules, data-driven content, icon system, input |
| [`docs/09-conversation-notes.md`](docs/09-conversation-notes.md) | Decision log — rationale, rejected ideas, name and card banks, open questions |

### Character decks
| File | Character | Archetype | Status |
|---|---|---|---|
| [`decks/python-quest/grandpa-the-grayscale.md`](decks/python-quest/grandpa-the-grayscale.md) | Grandpa the Grayscale | Wizard / Controller | v1.0 |
| [`decks/python-quest/malric-the-meat-shield.md`](decks/python-quest/malric-the-meat-shield.md) | Malric the Meat Shield | Tank / Sentinel | v1.0 |
| [`decks/python-quest/patchadin-the-overpowered.md`](decks/python-quest/patchadin-the-overpowered.md) | Patchadin the Overpowered | Hybrid | v1.0 |

See [`decks/README.md`](decks/README.md) for the full roster including planned characters.

### Reference material
- [`decks/reference/`](decks/reference/) — 12 filler decks carried over from the source inspiration. **Reference only**, used for balance comparison. Not final content.
- [`docs/archive/`](docs/archive/) — superseded drafts kept for history.
- [`templates/character-deck-template.md`](templates/character-deck-template.md) — the required structure for any new character deck.

---

## The short version

**Setup:** every player takes a 28-card character deck. Everyone starts at **12 HP**, tracked on a d12. Draw 3.

**Turn:** draw one, play at least one, discard, pass.

**Symbols:**
- ⚔️ **Attack** — one damage per sword
- 🛡️ **Defense** — stays in play, absorbs damage
- ❤️ **Healing** — restore HP, never above 12
- 🃏 **Draw** — one card per symbol
- ⚡ **Play Again** — one extra action, mandatory

**Win:** be the last pixel standing.

**What makes it different:** dice as trackers instead of cardboard tokens, persistent Equipment cards, saving throws, summons, and characters built entirely out of jokes about MMORPGs, tabletop RPGs, and being two-dimensional.

---

## Development model

Digital first, physical second.

```
Digital beta (free, everyone)  →  balance data at real scale
        →  balance pass  →  card text locked
        →  physical print run  →  no errata, no bans
```

New expansions ship digitally for free, get played by thousands, and only go to print once the win rates settle. Nobody ever buys a card that later gets banned.

---

## Status

Concept and rules are drafted. Three character decks are complete. The Godot client has not been started. Nothing is final — this is a living design repo and the documents are expected to change.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for document conventions and the rules for adding a new character deck.
