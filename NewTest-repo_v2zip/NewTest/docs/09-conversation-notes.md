# Conversation Notes & Decision Log

Design details, rationale, and loose ideas recovered from the project's conversations. The other docs describe *what the game is*. This one records *how it got there, why, and what was said along the way* — including ideas that were raised but never built out.

Source conversations: the original concept thread, "Grandpa the Grayscale," "Malric the tank character," "Paladin" (Patchadin), "Concept Game in Godot," and the reference-deck compendium thread.

---

## 1. Where the idea started

The starting point was an existing free-for-all card battler used as a structural reference — 28-card character decks, symbol-based cards, last player standing. The intent was never to reskin it. The stated direction:

- Move from "everyone uses the same generic fantasy art" to **2D pixel-art RPG characters** that look like they came out of a late-80s/early-90s PC RPG (Pool of Radiance era).
- Lean harder into the **TTRPG** side — actual dice at the table, saving throws, variable damage.
- Make the characters **funny, unique, and self-aware**.

The name is the joke: **Mini Multiplayer Offline RPG**. An MMORPG that is deliberately neither massively multiplayer nor online.

---

## 2. The three humor layers

Every card is supposed to carry these simultaneously. This was stated early and has held across every character since.

1. **2D self-awareness** — cards know they're cards and know they're flat
2. **MMORPG parody** — tanking, threat, patch notes, LFG, class balance forums
3. **TTRPG parody** — dice, saving throws, DM tropes, character sheets

Phrasings that came up for the 2D angle and are worth keeping as a tone reference:

- "dimensionally challenged"
- "really thin"
- "compressed for your convenience"
- "no depth? no problem"
- "the Amish version of a retro video game" — floated as a good angle for an in-fiction advertisement

**Worked example of all four layers at once — "404 Error — Card Not Found":** the mechanic removes a card from play; the genre joke is bureaucratic absurdism; the modern joke is the HTTP error; the 4th-wall joke is that the card announces it can't be found while being a card.

---

## 3. Why dice are in the game

This is frequently misunderstood, so stating it plainly:

**The dice are primarily trackers, not randomizers.**

The original motivation was replacing the reference game's "absurd cardboard tracker with tokens on it." Instead:
- A **d12 shows current HP** — turn the die, read the number
- A **die on a Defense card shows remaining shields** — instead of piling damage tokens on printed hearts

Variable-damage and saving-throw effects came second, and deliberately stayed uncommon. Most decks need no dice at all. Any deck that genuinely requires them says so on the packaging. Pencil and paper remain fully valid.

This matters commercially too: it keeps dice an optional cheap accessory rather than a barrier to entry, and most TTRPG players already own them.

---

## 4. HP: the decision and the reversal

Early drafts had HP vary by archetype — d8 glass cannons, d12 standard, d20 tanks — and a "roll for starting HP" option.

**All of that was cut.** Every character starts at **12 HP**, always.

Reason: variable HP made balance harder to reason about and made some characters feel worse before a card was played. Balance now comes from ability design and card distribution only. The d12 remains, but as a tracker.

---

## 5. Character naming approach

The target was described as "parody-ish, a mix of 4th-wall break + TTRPG + MMORPG. Not necessarily too wild."

The pattern that works: **a pun that comments on the archetype**, not a copy of a specific character.

Named so far:
- **Malric the Meat Shield** — the original example. Tank with sentinel abilities. The specific card idea given was a shield that can't be broken by attacks dealing less than 2 damage, making the character immune to 1-damage chip attacks until it breaks.
- **Grandpa the Grayscale** — chosen over an earlier suggestion because it's further from the source, adds an aging-wizard joke on top, and "grayscale" doubles as a limited-palette pixel-art joke. *"I used to be Grandpa the White, but we ran out of pixels."*
- **Patchadin the Overpowered** — WoW Paladin favoritism
- **Clout — Soldier for... Something** — JRPG protagonist who knows he's a soldier but can't remember which megacorporation he fought for. The amnesia is the joke.
- **Leggo Last** — elf archer, perpetually late
- **Unladen Swallow** — was considered as either a character or a card before becoming a character
- **Moot Groundsplatter** — flagged at the time as "maybe needs work but you get the idea"

Name bank raised but not assigned:
Borrow'd (halfling thief) · Grimly McBrooding (ranger) · Muscles McMeathead (barbarian) · Father Timetax (cleric, 15% tithe on healing) · Stabitha (rogue) · Gimlet Lockbane (dwarf tank) · Spikehair McBelts (47 belts, none holding up pants) · Gothicus the Perpetually Brooding · Lady Bloodmoon Darksorrow Nightshade · Cultivator #10,847 · Investigator McSanity-Loss · Truck-kun's Victim · the Villainess Who Read the Script

---

## 6. Card ideas raised in conversation

Given verbatim or near-verbatim, most not yet built into any deck.

**Class fantasies wanted:**
- Necromancer — return cards from your own discard pile
- Necromancer "Graverobber" — return a card from *someone else's* discard pile
- Warlock — summon with 1-2 shields as its life that attacks for 1 damage per turn
- Thief — steal a card from an opponent's hand and play it immediately

**Specific cards:**
- **The favorite-colour question** — ask an opponent their favorite color. Whatever they say is wrong. They fall off a California hill and take 3 damage.
- **Syntax Error** — this card does nothing. (However, you may hurl it at a small furry animal for 4 damage.)
- **404 Error — Card Not Found** — remove another player's card from play, or force a reshuffle and redraw of the same number, or skip a turn
- **Vengeful spirit** — saving throw to resist
- A specialty attack dealing 1d4

---

## 7. Equipment

Equipment came in as a user proposal partway through and stuck. The founding examples:

- **"0.3mm Shield +1"** — armor, thickness joke
- **"Paper Cutter +1"** — a scissor sword
- General principle: an Equipment card can raise the damage of *all other cards* by +1

Built out from there:
- **Weapons** — "2D6 of Doom," "Pixel Blade"
- **Armor** — "Laminated Armor" (ignores weak attacks)
- **Accessories** — "Save State Gem" (extra life), "4th Wall Breaker" (ignore Mighty Powers), "Rendering Engine"
- **Consumables** — "Resolution Increase" (double damage for a turn)

Joke items worth keeping:
- **"Depth Perception Training"** — does nothing, you're 2D
- **"Premium Currency"** — pay $5 real money... just kidding

Character concepts built around Equipment:
- **The Pixelsmith** — artificer, wants all the gear
- **The Minimalist Monk** — gets bonuses for having *no* Equipment

The contrast between those two was called out as a good design pairing.

---

## 8. The icon system — unresolved conflict

From the Godot architecture session:

> Instead of cards having multiple icons for each element, we'll have a bigger easier-to-read icon with a bold outlined number inside it so the player knows how many of each there are just by looking, without counting.

**This contradicts how every deck document is currently written.** All the decks notate effects as repeated symbols (⚔️⚔️⚔️). The digital client is specified to render one large icon with a bold outlined number.

Either the deck docs adopt numeric notation, or the two notations are formally declared as "design notation vs. display rendering." It's worth deciding explicitly, because it also affects how the physical cards are printed — the same readability argument applies to cardboard.

---

## 9. Malric — design lessons

The tank was hard, and the reasoning is worth preserving because it'll recur for every defensive character.

**The problems with tanks in a free-for-all:**
- No allies to protect — the core tank fantasy doesn't exist
- Low damage means very slow wins
- Defensive cards are inherently reactive
- Taunts are much weaker with more than two players

**The solutions used:**
- Taunts force *suboptimal* opponent plays rather than protecting anyone
- Self-healing that triggers from being hit maintains pressure
- Counter-damage on shield break punishes attacking him
- Card advantage generated by surviving
- Damage reflection as the real win condition

**Accepted trade-off:** Malric has the lowest damage output in the game and is expected to sit at 45-50% win rate, weaker in free-for-all (40%) than 1v1 (55%). That's fine. The deck is explicitly labelled as not for players who want to kill things quickly.

**Rejected variant:** "Aggro Malric" (swap defense for attacks) was written up and dismissed — still too slow, and it destroys the character's identity.

---

## 10. Patchadin — design lessons

The parody target is Blizzard's history of buffing Paladins, and the design intentionally makes the joke mechanical rather than only textual.

**Can Do Everything** — once per turn, after playing a card, change one symbol to a different symbol (⚔️ ↔ 🛡️ ↔ ❤️). This is the mechanical embodiment of "why pick a role." It means no card is ever dead.

**Developer's Favorite** — the first time each game you'd hit 0 HP, you go to 6 instead. *"Emergency hotfix deployed!"*

**Why it's balanced despite being an openly overpowered joke:** breadth without depth. Second-best at everything, best at nothing. High skill floor and a very high skill ceiling, because extracting value from symbol conversion requires reading the board correctly.

**Design guidance given during the session:** "All Paladin Raid" should be a Mighty Power, and "Paladins are OP at Everything" should be a Mighty Power doing 3 damage / 3 shields / 3 health. **Love Me or Hate Me** was specified as: all players decide whether Paladins are the GOAT — Love heals the Paladin 2, Hate deals them 2 damage.

**Two favoritism cards, deliberately distinct:**
- *Obvious Favoritism* — "we're trying to pretend this is balanced" — damage, draw, play again
- *Blatant Favoritism* — "we've given up pretending" — damage, heal, shield, play again

The final printed deck kept **Blatant Favoritism** (the user's card) and dropped Obvious Favoritism. Both writeups exist; if a second one is ever wanted, Obvious Favoritism is a ready-made card.

**Nostalgia cards added late:** Wake of Ashes (AoE plus a stun that cancels an opponent's next ⚡) and Divine Intervention (sacrifice all shields, heal to full).

---

## 11. Grandpa — mechanical shape

Built to be balanced against a reference mage character, themed on retro-computing nostalgia and "back in my day" humor.

**Signature abilities:**
- *Monochrome Lecture* — once per turn, force a DC 13 save or the target skips their next Play Again. They take 1 damage from boredom either way.
- *Screen Burn-In* — when you play a damage spell, you may deal 1 extra damage to the same target.

**Archetype:** controller. Wins through disruption and card advantage rather than damage. Strong into combo and control, weak into fast aggro and simple beatdown.

Card names worth noting for tone: 8-Bit Blast, Dot Matrix Missile, Grayscale Bomb, Floppy Disk of Power, Phosphor Burn, Screen Saver, The Olden Days, Boring Story, Back In My Day, Loading... Please Wait, Refresh Rate, Memory Leak, CRT Screen Flicker, Monochrome Shield.

---

## 12. Expansions as the growth engine

The structural insight: **each expansion parodies a different genre, but the mechanics never change.** That's what makes a Monty-Python-flavored deck able to sit at the same table as a space-opera deck with no conversion chart.

Expansion names floated: *Python's Quest for the Holy Kale*, *The Satire Strikes Back*, *Game of Throws*, *Isekai'd to the DMV*, *The Walking Dad Jokes*, *Eldritch IT Support*.

**Python's Quest premise, as stated:** sentient computer programs seeking the source of Karen power, the Holy Kale.

The cross-generational appeal was called out explicitly — older players get the Python references, younger players get the tech and meme references, and the mechanics carry everyone.

---

## 13. TCG customization — the open question

The ask: allow deck customization, possibly cross-class, without letting anyone build something broken.

Five approaches were laid out. **Class-based** is the front-runner: cards are class-locked or Neutral, you build from your character's class pool plus Neutrals, Neutrals are deliberately basic, and powerful cards are class-locked so cross-class abuse is impossible by construction.

The real safety net is the digital-first pipeline — any new constructed format gets played at scale before anything is printed.

**Unresolved:** where class boundaries fall, whether Neutrals are shared or per-expansion, and whether boosters should exist at all (randomized purchases sit awkwardly against the monetization stance).

---

## 14. Why digital-first

The reasoning as stated: hiring playtesters gives mixed results, whereas thousands of real players generate real data. Launching each expansion digitally first means:

- No misprinted decks that later need errata
- No ban lists to cover design mistakes
- No confusion from cards that changed after printing
- The digital game becomes the insider source for fans on upcoming expansions — which is itself free marketing

The irony was noted at the time and is worth keeping as marketing copy: *a game that parodies being offline, made online first, so the offline version is better.*

---

## 15. Business philosophy, in the original words

> "I want to be fair to players, respect them, and while yes, obviously any business is to make money, I never want it to be predatory. I want players to love my game and be playing it long after I'm gone, not resent it because of bitterness over how I exploited them or how much money they had to spend just to play."

> "I'd rather be loved than be rich, but acknowledge that if you succeed at being loved, getting rich is a frequent benefit."

The Walmart-effect bet: price low enough that everyone flocks to it, earn more through volume, and let positive sentiment do the marketing.

**Hard positions:**
- All decks free, period. No seasonal passes.
- Everyone must have access to all decks — otherwise paying players become the only testers and the live-beta model collapses.
- Skeptical of ads specifically because of data harvesting; open to non-tracking ads with a paid ad-free option.
- Godot over Unity partly because Unity isn't trusted for customer monitoring.
- Paid alpha participation is *considered but not committed*.

---

## 16. Infrastructure constraint

Stated plainly: the video game must not become a burden on the card game. If servers could get expensive relative to revenue, that's a problem.

The resolution is P2P with host authority, a free-tier matchmaking layer holding lobby metadata only, and free STUN for NAT traversal. Nothing about gameplay touches paid infrastructure. Full detail in `06-technical-architecture.md`.

---

## 17. Working expectations

Recorded because they were stated as corrections during the project, usually after something fell short.

- **Consistency is mandatory.** New character decks must match the format of existing ones exactly. Format drift between decks was called out directly as a failure.
- **Deliverables are files.** Long-form work goes in an actual file, not just a chat response.
- **Requested content gets included.** If specific cards are supplied, they appear in the deck. Substituting your own version of someone's idea is not acceptable.
- **No truncation, no placeholders.** Complete output every time.
- **One targeted change at a time.** Don't refactor or rename things that weren't part of the request, and don't remove working content without being asked.
- **Challenge bad premises directly** rather than accepting them.

---

## 18. Known gaps and things to decide

- **Icon notation conflict** (§8) — deck docs vs. client rendering
- **Expansion folder names** in the Godot architecture still reference the source game's expansions and need renaming
- **Class boundaries** for the constructed format
- **Whether boosters exist** at all
- **Whether ads exist** in any form
- **Whether paid alpha access** happens
- Only 3 of 9 Python's Quest characters are built out; the other 6 exist as concepts with some cards drafted
- `LICENSE.md` is a placeholder
