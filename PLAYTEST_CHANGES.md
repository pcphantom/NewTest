# Browser playtest 0.3

## Intent

Keep the existing CRT/felt aesthetic and the parody identities. Fix discoverability, card readability, mobile access, health tracking and destructive navigation. Keep every deck at 28 cards and every player at 12 starting/max HP, as confirmed by the designer.

The d12 is a physical-style HP tracker with Health above it. Initiative is a d20 comparison, not a saving throw: highest goes first, only tied leaders reroll, and play then continues clockwise.

## Card-bound skills

The older character sheets describe powers separately from the 28-card lists. The designer clarified that skills belong on playable cards alongside their normal effects. These are playtest adaptations, not an assertion that the old sheets already specified these mappings.

| Card (copies unchanged) | Normal effect | Printed skill |
| --- | --- | --- |
| Back In My Day (2) | Draw 1; reduce target's next attack by 2, minimum 1 | Monochrome Lecture: deal 1 damage and require a DC 13 save; failure cancels that opponent's next Play Again action. |
| Grayscale Bomb (2) | Deal 2 damage to all opponents | Screen Burn-In: optionally deal 1 extra damage to one surviving opponent damaged by this card. |
| Aggressive Positioning (3) | Gain 1 shield (added for the combined card) | Threat Generation: force target's next attack toward you; draw 1 when they make it. The existing taunt/reward logic remains. |
| Inspiring Presence (1) | Heal 4, draw 2 | Second Wind: if at 4 HP or less before playing it, heal 2 extra (6 total). No automatic rescue without playing the card. |
| Judgment (2) | Deal 2 damage, draw 1 | Can Do Everything: optionally convert one of this card's attacks into Defense or Healing. Other cards cannot be converted. |
| Blatant Favoritism (2) | Deal 2 damage, gain 1 shield, heal 1, Play Again | Developer's Favorite: arm a rescue until your next turn. The first lethal hit sets HP to 6 instead. The rescue remains once per match. |

The low-health bonus preserves Malric's clutch recovery without a hidden passive. Patchadin still gets hybrid output and a comically favorable hotfix, but must actually play the card to earn protection. Grandpa's control and afterimage damage require the appropriate spells. Existing flavor text is preserved on every card and appears in previews and inspections.

These combinations follow the model described in the [official Dungeon Mayhem rules](https://media.wizards.com/2019/dnd/downloads/DnD_Mayhem.pdf): cards can combine symbols, and character-specific powers are resolved when their cards are played. The local reference deck notes are comparison material, not a replacement for this game's rules. Balance still needs playtesting; automated legality checks do not establish win-rate balance.

## Custom design retained

The project adds its own dice saves, taunts with rewards, shield-break effects, retaliation, damage reduction, timed buffs/debuffs, turn disruption, symbol conversion and Raid Paladin summons. Those mechanics remain. All Paladin Raid still summons three units that attack or heal; the tank/healer/DPS parody is intentional.

Equipment and constructed-deck formats are described in the source design material but are not part of the three current runtime decks. This UI pass does not silently add an equipment system or replace the current decks with the reference game's decks.

Source design files under `NewTest-repo/` and the supplied `NewTest-repo_v2zip/` are preserved unchanged. V2 corrects Patchadin's actual 28-card list; the browser runtime follows that list plus the designer's current card-bound skill clarification.

## V2 reconciliation

V2 changes five source files: the brief, index, Patchadin deck, recovered Godot architecture and conversation notes. Grandpa and Malric's deck documents are unchanged.

- Blatant Favoritism replaces Obvious Favoritism, with two copies. The printed base effects are 2 attack, 1 healing, 1 shield and 1 Play Again. Developer's Favorite is now attached here.
- Divine Intervention replaces the retired Paladins are OP at Everything. It sacrifices all active Defense cards, heals to maximum and grants Play Again. Sacrifice is not a damage-triggered shield break.
- Blessing of Kings drops from two copies to one; Wake of Ashes fills the remaining slot. Wake deals 1 damage to all opponents and cancels the selected opponent's next extra play.
- The card UI retains the original repeated symbols: four shields are four separate shield icons. Numeric overlays do not replace those symbols.
- The complete shared rules specify recycling the discard into an empty deck, drawing two when a mandatory play meets an empty hand, and resolving unavailable draws as far as possible. The earlier browser exception was incorrect and is removed.
- Zone of Influence restricts standard attacks with 5 or 6 living players to the nearest living seat on either side. Area effects and Mighty Powers are exempt; forced targets override normal selection. With four or fewer living players the restriction lifts. This living-seat interpretation is stated in the in-game help.

Optional equipment, ghosts, teams and constructed formats remain separate designs, not silently enabled game modes.

## Verification and remaining limits

Deterministic tests cover 84-card content integrity, 12 HP, healing cap, initiative and repeated highest ties, card-only skill activation, conversion legality, shields, target damage and skill durations.

Browser checks cover 2560x1440, 1440x900, 390x844, 360x640 and 844x390, plus six players, large hands, hover/tap/keyboard inspection, visible HP damage, public opponent cards, paused AI, resumable pending targets and confirmed quit.

The menu preserves a match in memory, not across reloads or closed browser tabs. Fullscreen availability depends on browser support. A bounded 12-seed simulation checks legal progress and HP bounds in three- and six-player matches. Some Malric mirror endgames last hundreds of turns under the current printed defenses; that is an unresolved balance issue. No unrequested defense nerf or sudden-death rule was introduced.
