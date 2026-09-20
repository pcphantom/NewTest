# Monetization & Business Model

## The stance

> *"I'd rather be loved than be rich, but acknowledge that if you succeed at being loved, getting rich is a frequent benefit."*

Every pricing decision gets filtered through one question: **will players resent this in five years?**

Games have gotten expensive and manipulative enough that being reasonable is itself a competitive advantage. The bet is the Walmart effect — price low, sell to far more people, and let positive sentiment do the marketing that an ad budget can't.

---

## Digital: free, permanently

**All decks. All expansions. All game modes. Free.**

This isn't generosity, it's structural. The digital version is the live balance-testing platform. If any content sits behind a paywall, paying players become the only testers, the sample is biased, and the entire digital-first pipeline stops working.

### Explicitly rejected

| Model | Why it's out |
|---|---|
| Season / battle passes | Manufactured FOMO |
| Loot boxes | Gambling |
| Energy / stamina systems | Artificial time gates |
| Card packs for gameplay content | Pay-to-win, biases the test pool |
| Rotating free decks with paid unlock | Splits the tester base |
| Data harvesting or resale | Hard ethical line |
| Ad networks that track users | Same line |

### Acceptable

- **Cosmetics** ($1-3) — card backs, card styles (8-bit / 16-bit / 32-bit / holographic / animated), avatars, emotes. Vanity only, zero gameplay effect.
- **Ad-free purchase** ($5-10 one-time) — *only if* ads are ever added, and only with non-tracking ad networks. Under consideration, not committed.
- **Paid alpha participation** ($15-20) — early access to in-development content plus a real feedback channel. Under consideration. Not a content gate: everything alphas see ships free to everyone weeks later.
- **Physical pre-orders with early shipping** — ship before retail, at no upcharge.
- **Crowdfunding** — see below.

---

## Physical: the primary revenue

Priced against a market where being competitive routinely costs hundreds.

| Product | Price | Contents |
|---|---|---|
| Character deck | $10-12 | 28 cards, character reference, rulebook. Complete and competitive out of the box. |
| Expansion box | $50-60 | 6 decks, better per-deck value, storage box |
| Booster pack | $4 | 10 cards, for constructed formats. Optional, never required. |
| Dice set | $12 | Optional accessory |
| Playmat | $25 | Optional accessory |
| Deck box | $8 | Optional accessory |

### Market comparison

| Product | Price | Playable as-is? |
|---|---|---|
| Typical TCG precon | $40-50 | Often not |
| Typical starter deck | $15-20 | Needs boosters |
| Typical structure deck | $10-15 | Needs 3 copies plus extras |
| **Ours** | **$10-12** | **Yes, immediately** |

### Dice are an accessory, not a requirement

The d12 is a **tracker** — turn it to show HP. Convenient, not mandatory. Pencil and paper work fine. Most TTRPG players already own dice. Any deck that genuinely requires dice for variable effects says so on the packaging.

---

## Crowdfunding

Used to fund the first physical print run, not ongoing operations.

| Tier | Reward |
|---|---|
| $5 | Name in credits, digital thank-you |
| $15 | + exclusive card back, supporter avatar frame, early access to next expansion |
| $25 | + 2 physical decks of your choice, shipped before retail |
| $50 | + full 6-deck expansion box, exclusive physical card back |
| $100 | + design flavor text for one card |
| $250 | + all Year 1 physical expansions, dice set, playmat, art book PDF |
| $500 | + **custom card themed after you** — limited to 20 backers |
| $1000+ | + help design a character concept, voice in major design decisions |

### The custom card tier

Process: backer submits a concept → artist creates the portrait with backer input → abilities designed with backer input → backer approves → card enters the game credited to them → they receive a signed framed copy plus 10 playable copies.

Constraints: must fit the existing class system, must be balanced (design has final say), can't be an overpowered vanity card. It can absolutely have personality, flavor, and jokes.

Capped at 20 so it stays meaningful, and released gradually rather than all at once.

### Stretch goal ideas
$10k voice acting · $25k animated card effects · $50k additional expansion · $75k controller support · $100k tournament prize pool

---

## The flywheel

```
Free digital game
   → players try it at zero risk
   → discover everything is actually free
   → tell people (the marketing budget)
   → community grows
   → want physical cards to collect and to support
   → buy decks at $10-12
   → revenue funds the next expansion
   → more content retains players
   → repeat
```

The digital game is not a revenue center. It's the best marketing asset the project has, and it costs almost nothing to run (see `06-technical-architecture.md`).

---

## Physical / digital integration

- Every physical product includes a digital code. The code doesn't unlock gameplay — that's already free. It unlocks an exclusive cosmetic and flags the buyer as a supporter.
- Pre-order buyers get cards roughly two months before retail, at the same price.
- No double-dipping. Buying one never means needing to buy the other.

---

## Privacy commitment

Part of why Godot was chosen over Unity: no engine-level telemetry, open source, verifiable.

**Collected:** anonymous balance data (character played, win/loss, game length), and crash reports only if the player opts in.

**Not collected:** personal information, location, contacts, browsing history, device IDs, advertising IDs.

**Never:** sold, shared with third parties, or used for ad targeting.

Analytics exist to balance the game, and for nothing else.

---

## Why this works commercially

The competition is overpriced, predatory, or both, and players are visibly exhausted by it. A fair product in that market gets defended by its own community, reviewed well without review-bombing, and covered by creators who *want* to promote something that isn't exploitative.

Precedent for "loved first, rich later": Stardew Valley, Terraria, Hollow Knight, Deep Rock Galactic — all cheap, all fair, all enormously profitable.

Precedent for the opposite: several high-profile titles that made money fast, destroyed their reputation, and lost the long game.
