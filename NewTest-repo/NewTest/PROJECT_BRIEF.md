# Project Brief — Read This First

This file exists so that anyone (human or AI assistant) can pick up this project cold, with no access to prior conversations, chat memory, or external notes. Everything needed to work on the project is in this repository.

---

## What the project is

**Mini Multiplayer Offline RPG (MMORPG)** — a parody card game that blends TCG deck mechanics with TTRPG elements. Working project name: **Dungeons & Mayhem**.

It is developed in two parallel tracks:
1. **Physical card game** — individual character decks, sold cheaply and complete.
2. **Digital game** — Godot 4.5.1 / GDScript, mobile-first, also PC/Mac/Linux.

The digital version is not a spin-off. It is the **live balance-testing platform**: every expansion launches digitally first, gets tested at real-world scale, and only goes to print once the numbers settle. This eliminates misprints, errata, and ban lists, and doubles as free marketing.

---

## Core identity (do not drift from these)

**Three layers stacked on every card:**
1. **2D / retro pixel-art self-awareness** — cards know they are cards, and know they are flat. "Dimensionally challenged," "compressed for your convenience," CRT borders, 16-bit aesthetic.
2. **MMORPG parody** — tanking, threat, patch notes, developer favoritism, LFG, class balance salt.
3. **TTRPG parody** — dice, saving throws, initiative, character sheets, DM tropes.

**Parody must be transformative commentary, not imitation.** Names are puns that comment on the archetype ("Grandpa the Grayscale," "Malric the Meat Shield," "Patchadin the Overpowered," "Leggo Last," "Clout — Soldier for... Something"). The joke is always about the trope or the industry, never a copy of a specific protected character.

**Each expansion parodies a different genre.** The first is *Python's Quest for the Holy Kale* (absurdist comedy + modern tech culture). Planned others include *The Satire Strikes Back* (space opera), *Game of Throws* (medieval politics), *Isekai'd to the DMV* (reincarnation + bureaucracy), *The Walking Dad Jokes* (zombies + puns), *Eldritch IT Support* (cosmic horror + helpdesk).

---

## Hard rules established so far

| Rule | Value |
|---|---|
| Starting HP | **12 for every character, always** |
| HP tracker | A d12, turned to show current HP (not tokens on a card) |
| Shield tracker | A die, not damage tokens on the card |
| Deck size | **28 cards** per character |
| Max copies | 3 of any single card (deck-construction formats) |
| Signature mechanics | 3-5 per character |
| Dice | Used as **trackers first**, variable effects second. Most decks need no dice at all. Any deck that requires them says so on the packaging. |
| Balance lever | Abilities and card distribution — never HP variance |

**Five core symbols:** ⚔️ Attack · 🛡️ Defense · ❤️ Healing · 🃏 Draw · ⚡ Play Again.
**Card text always overrides the rulebook.**

---

## Business and monetization stance

This is settled and non-negotiable. Do not propose models that violate it.

**Digital:**
- All decks free. All expansions free. Permanently.
- No season passes. No battle passes. No loot boxes. No energy systems. No FOMO mechanics.
- No pay-to-win of any kind.
- No data harvesting, no selling data, no ad-tracking networks. Godot was chosen partly to avoid Unity's telemetry.

**Acceptable revenue:**
- Physical card sales (primary revenue)
- Cosmetics (card backs, avatars, card styles, emotes) — vanity only
- Optional ad-free purchase, *if* ads are ever added, and only non-tracking ads
- Paid alpha participation (early access to in-development content + feedback channel) — still under consideration
- Physical pre-orders with early shipping, at no upcharge
- Crowdfunding, including a high-tier "custom card themed after you"

**Pricing philosophy:** the Walmart effect. Individual deck $10-12, complete and competitive out of the box. Volume over margin.

**Guiding principle:** *"I'd rather be loved than be rich, but if you succeed at being loved, getting rich is a frequent benefit."* Every decision is filtered through whether players will resent it in five years.

**Everyone must have access to all decks** — otherwise paying players become the only testers, which defeats the entire live-beta model.

---

## Technical stance

- **Engine:** Godot 4.5.1, GDScript
- **Primary target:** mobile (portrait), plus PC/Mac/Linux exports
- **Networking:** peer-to-peer via WebRTC. Host acts as authority and validates all moves.
- **Matchmaking:** minimal — Firebase/Supabase free tier, lobby metadata only. No gameplay data passes through it.
- **NAT traversal:** free STUN (Google), community TURN fallback.
- **Infrastructure budget:** effectively $0/month at launch scale. The digital game must never become a financial burden on the card game.
- **Architecture:** modular, data-driven. Adding new content should require only new image files plus data-script updates — no engine changes.

---

## How to work on this project

- **Documentation must be complete.** No truncation, no placeholders, no "rest of the cards omitted." A character deck means all 28 cards, distribution analysis, matchup guide, tactical notes, combos, flavor text, and playtesting targets.
- **Match existing structure.** New character decks follow `templates/character-deck-template.md` and the structure of the existing decks in `decks/python-quest/`.
- **Don't refactor what isn't asked about.** One targeted change at a time.
- **Challenge bad premises directly.** Sycophancy is worse than useless here.
- The 12 decks in `decks/reference/` are **filler/reference data** carried over from the source inspiration. They are for balance comparison, not final content.

---

## Current state

**Complete character decks (Python's Quest):**
- Grandpa the Grayscale — wizard/controller, saving-throw mechanics
- Malric the Meat Shield — tank/sentinel, threat generation, WoW tanking parody
- Patchadin the Overpowered — hybrid, symbol-swapping, developer-favoritism parody

**Drafted but not built out:** Unladen Swallow, Sir Syntax Error, 404 — Karen Not Found, Tim the Enchanter, README.txt, Clout — Soldier for... Something, Leggo Last, Moot Groundsplatter.

**Open questions:**
- Deck-customization format (see `docs/07-deck-construction.md`) — leaning class-based
- Whether paid alpha access happens at all
- Whether ads exist in any form

---

## Repository map

See `README.md` for the full index.
