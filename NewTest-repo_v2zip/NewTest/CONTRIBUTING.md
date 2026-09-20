# Contributing

## Document conventions

- Markdown throughout. Filenames lowercase with hyphens.
- Design docs live in `docs/`, numbered by reading order.
- Character decks live in `decks/<expansion-slug>/<character-slug>.md`.
- Superseded drafts go to `docs/archive/` rather than being deleted — history is useful.

## Adding a character deck

1. Copy `templates/character-deck-template.md`.
2. Fill in **every** section. A partial deck doesn't get committed.
3. Card quantities must total exactly **28**. Max 3 copies of any card.
4. Starting HP is **12**. Always. Balance through abilities and distribution.
5. Include a distribution comparison against at least one existing character.
6. Add the character to `decks/README.md` and to the roster in `docs/04-expansions.md`.

## Design constraints

Before adding anything, check it against `docs/03-design-principles.md`. In short:

- 12 HP, 28 cards, five core symbols, card text overrides the rulebook
- Each character needs a mechanical identity nothing else has
- Parody comments on tropes and industry behavior, never copies a property
- Mechanics stay identical across expansions even when themes don't

## Monetization

`docs/05-monetization.md` is settled. All digital content is free permanently, with no passes,
loot boxes, energy systems, pay-to-win, or data harvesting. Don't propose designs that depend
on violating that.

## Working style

- One targeted change at a time.
- Don't refactor or rename things that weren't part of the request.
- Don't remove working content without being asked.
- Complete output — no truncation, no "rest omitted" placeholders.
