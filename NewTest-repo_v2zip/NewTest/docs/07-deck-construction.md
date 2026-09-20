# Deck Construction & TCG Customization

**Status: open design question.** Class-based is the current front-runner. Nothing here is locked.

The goal is to allow deck customization — including cross-class mixing — without letting players assemble a "best cards from everywhere" deck that invalidates the pre-constructed experience.

---

## Two play modes

**Pre-constructed (casual / default).** You take a character deck as printed, 28 cards, and play. This is the full intended experience and it stays competitive forever. Nobody ever *needs* to build a deck.

**Constructed (advanced / competitive).** You build within a format's restrictions. Optional, additive, and never required to be viable.

---

## Baseline constructed rules

- 28-card minimum (30 for advanced formats)
- 1 character card, which defines HP, signature abilities, and restrictions
- Maximum 3 copies of any single card
- Maximum 6 Equipment cards
- Optional 5-card sideboard to swap between games

---

## Option 1 — Class-based (recommended)

**How it works:** every character carries a Class tag (Warrior, Rogue, Mage, Tech, Chaos, Support, Tank…). Cards are either class-locked or Neutral. You build from your character's class pool plus Neutral cards.

```
Character card (defines your class)      1
Cards from your character's signature set  8-12
Cards from the wider class pool          10-15
Neutral cards (basic attacks, Equipment)  5-8
```

**Why it holds up:**
- Each class has a mechanical identity — Speed owns ⚡, Tank owns 🛡️, and so on
- Neutral cards are deliberately basic, so a Neutral-heavy deck is weak by design
- Powerful cards are class-locked, so cross-class combo abuse is impossible by construction
- Each class can be balance-tested in isolation
- The concept is familiar from other TCGs, so it teaches itself

**Why it's the front-runner:** it preserves character identity, which is the entire appeal. A customized Malric still plays like Malric.

---

## Option 2 — Multiclass / hybrid

Choose a **Primary Class** (full pool access) and a **Secondary Class** (restricted to Common and Uncommon). A point-buy budget prevents stacking the best of both.

```
Primary: Speed   — full access
Secondary: Control — Uncommon/Common only
Deck budget: 80-100 points
Legendary cards cost more points
```

Workable as an *advanced* format layered on top of Option 1, once the base class pools are proven.

---

## Option 3 — Modular characters

Characters are fully separated from decks. You pick a character for its abilities and restrictions, then build 28 cards from an open pool.

```
Character: Unladen Swallow
  Grants: Velocity Debate
  Requires: 6+ Speed cards
  Equipment bonus: +1 to first attack each turn

Deck: 10-15 attacks · 3-6 defense · 2-4 healing · max 3 copies
```

Maximum flexibility, highest balance risk. Character requirements are the only guardrail, and guardrails made of requirements tend to get optimized around.

---

## Option 4 — Faction / expansion mixing

Cards belong to expansions. Mixing is allowed, but purity is rewarded.

| Build | Rule | Trade-off |
|---|---|---|
| Pure (1 expansion) | Draw 1 extra card at game start | Most consistent |
| Mixed (2 expansions) | Equal amounts from each, no bonus | More options, less consistent |
| Rainbow (3+) | Deck size increases to 30 | Maximum flexibility, hardest to draw combos |

This is the natural fit for the cross-genre premise and could layer on top of any other option.

---

## Option 5 — Draft

Players open boosters and draft one card at a time, then build from what they drafted. Self-balancing — nobody assembles a broken combo because nobody has access to all the pieces. Best as an event format rather than the primary constructed mode.

---

## Balance mechanisms available

Any of these can be combined with any format above:

**Point buy.** Each card has a value (1-5); decks must total within a budget. Powerful cards cost more, forcing genuine trade-offs.

**Rarity limits.** Max 4 Legendary, 8 Rare, 12 Uncommon, rest Common.

**Role limits.** Max 15 Attack, 8 Defense, 10 Utility, 6 Equipment. Forces balanced decks structurally rather than by judgment.

**Digital pre-testing.** Any new constructed format ships digitally first. If a combo breaks it, that's found before anything is printed. This is the real safety net — the others are just the first line.

---

## Recommended path

1. **Ship pre-constructed only.** Prove the base game is fun and balanced.
2. **Add class-based constructed** once class pools exist and have digital play data.
3. **Add draft** as an event format.
4. **Consider multiclass or faction mixing** as advanced formats, only after 1-3 are stable.

Don't build the customization system before the base game is proven. It's the fastest way to make balance intractable.

---

## Open questions

- Where do class boundaries fall? Are Tank and Support separate classes or one Defense class?
- Are Neutral cards a shared pool, or does each expansion print its own Neutrals?
- Do boosters exist at all, or only fixed-contents decks? Boosters raise randomized-purchase concerns that sit awkwardly with the monetization stance.
- Can a character be played in constructed without their own signature cards, or is a minimum required?
