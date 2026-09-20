# Design Principles

The rules that govern every character, card, and expansion. Read before designing anything.

---

## 1. Standardized health

**Every character starts at 12 HP. No exceptions.**

Earlier drafts varied HP by archetype (d8 for glass cannons, d20 for tanks). That was dropped. Variable HP made balance harder to reason about and made some characters feel strictly worse before a single card was played.

Balance comes from **ability design and card distribution**, not from a bigger health pool.

The d12 is a **tracker**, not a randomizer — turn the die to show current HP. This replaces the cardboard-tracker-plus-tokens approach and is the single most obvious physical improvement over comparable games. Shields are tracked the same way: a die on the Defense card, not damage tokens.

Paper and pencil remain completely valid. Dice are a convenience, not a requirement.

---

## 2. The five core symbols

Every card is built from these. They are the shared language across all expansions, which is what makes cross-expansion play possible.

| Symbol | Meaning | Notes |
|---|---|---|
| ⚔️ | Attack | 1 damage each. Hits Defense first, spills to HP. |
| 🛡️ | Defense | Persists in play. Absorbs 1 damage each. |
| ❤️ | Healing | Restores 1 HP each. Cannot exceed 12. |
| 🃏 | Draw | Draw 1 card each. |
| ⚡ | Play Again | 1 extra action each. **Mandatory** — prevents turtling. |

Anything a card does beyond these is written as text, and **card text always overrides the rulebook**.

---

## 3. Every character needs one mechanical identity

A character is not a theme with generic cards attached. Each one owns 3-5 signature mechanics that no other character has, and the whole 28-card deck is built to support them.

Examples from completed decks:
- **Malric** — threat generation. Forces opponents to attack him, then profits from being hit.
- **Patchadin** — symbol conversion. Changes one symbol per turn, so no card is ever dead.
- **Grandpa** — saving throws. Opponents roll to resist his effects.

If two characters would play the same way, one of them needs to be redesigned.

---

## 4. Balance is a distribution problem

Character power is expressed as percentages of the 28-card deck. A character's identity should be visible in the distribution alone.

| Character | Attack | Defense | Healing | Utility | Mighty |
|---|---|---|---|---|---|
| Malric (tank) | 25% | 21% | — | 39% | 14% |
| Patchadin (hybrid) | 39% | 11% | 11% | 25% | 14% |
| Sutha (aggro, reference) | 46% | 4% | — | 14% | — |

**Malric's lesson:** low offensive output is acceptable — even interesting — when compensated by near-invincibility that only pays off with skilled piloting. Weak-looking numbers are fine if the skill ceiling is high.

**Patchadin's lesson:** a character can be deliberately, openly overpowered as a *joke* and still be balanced, because breadth without depth means never being the best at any one thing.

Target win rates: 45-55% overall for every character. Anything outside that band gets adjusted digitally before print.

---

## 5. Parody must be transformative

The rule: **comment on the trope, don't copy the property.**

Good:
- Names that are puns commenting on an archetype — "Malric the Meat Shield," "Patchadin the Overpowered," "Grandpa the Grayscale," "Leggo Last," "Clout — Soldier for... Something"
- Jokes aimed at *industry behavior* — patch notes, developer favoritism, class balance forums, DLC pricing
- Jokes aimed at *genre conventions* — the brooding ranger, the amnesiac protagonist with an oversized sword, the elf who arrives late
- Generic fantasy building blocks, which are public domain — elves, dwarves, wizards, paladins, dungeons

Avoid:
- Actual protected character names, distinctive visual designs, exact quotes, or specific ability names lifted wholesale
- Anything where a reasonable person would think it's an official product of someone else

The 4th-wall-breaking, self-aware framing is itself a transformation layer — a character who openly comments on being a card in a parody game is obviously commentary, not imitation.

---

## 6. Cross-expansion compatibility

Themes vary wildly between expansions. Mechanics do not.

Every expansion uses:
- 28-card decks
- 12 starting HP
- the same five symbols
- the same Equipment slots and rules
- the same turn structure

This means a Monty-Python-flavored deck and a space-opera deck can sit at the same table without a conversion chart. It's the whole reason the cross-genre premise works.

---

## 7. Aggression over turtling

Design bias, stated plainly:
- Actions are **mandatory**. You must play if you can.
- Defense persists but does not accumulate infinitely.
- Games should run 15-25 minutes.
- High variance from dice is acceptable — it's a comedy game, chaos is a feature.
- Reward clever combinations over incremental value.

---

## 8. Digital-first iteration

Nothing goes to print until the digital version has stress-tested it.

Automated balance flags to watch:
- Character win rate outside 45-55%
- Any card played in >80% of games it's drawn in
- Average game length under 10 minutes or over 35
- Turn-1 win rate above 0%
- Average turn length over 60 seconds

Physical production only begins after the numbers hold across a full testing window.

---

## 9. Player respect as a design constraint

This isn't just a business stance — it changes design decisions:
- No card is ever gated behind payment, so every card must be balanced for everyone, not tuned to sell packs.
- No ban list, so cards get fixed *before* printing rather than errata'd after.
- No rarity-driven power, so "rare" can only ever mean "prints less often," never "hits harder."

---

## 10. Documentation completeness

A character deck is not done until it contains:
- Character card with signature abilities
- Full 28-card list with quantities
- Card-by-card mechanics and flavor text
- Distribution analysis with comparisons to existing characters
- Tactical notes — strengths, weaknesses, best against, vulnerable to
- Phase-by-phase strategy
- Equipment synergies
- Advanced combos
- Character quotes and personality
- Playtesting targets with numeric goals
- Matchup guide
- Expansion potential and alternate builds
- Lore and relationships

Partial decks don't get committed. Use `templates/character-deck-template.md`.
