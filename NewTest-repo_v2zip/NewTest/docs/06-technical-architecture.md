# Technical Architecture

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Engine | **Godot 4.5.1** | Free forever, no per-install fees, no revenue cut, excellent 2D, no engine telemetry |
| Language | **GDScript** | Python-like, fast iteration for balance changes, card logic is straightforward |
| Primary target | **Mobile** (iOS/Android, portrait) | Where the audience is; 15-25 minute matches suit mobile |
| Secondary targets | PC / Mac / Linux | Free exports, no additional platform cost |
| Possible later | Web (HTML5), Switch, Steam Deck | Deferred |

Unity was ruled out for the runtime-fee tracking and built-in data collection. Godot being open source means the no-telemetry claim is verifiable rather than promised.

---

## Design constraints

**Modular and data-driven.** Adding a new character should require adding image files and updating data scripts — no engine changes, no new scenes hand-built per card. Many small focused modules over a few large ones.

**Offline-capable.** The game is called *Mini Multiplayer **Offline** RPG*. Pass-and-play and local WiFi must work with no connection at all.

---

## Networking: peer-to-peer, host-authoritative

The gameplay budget is the one that would kill this project if it ran through servers. It doesn't.

```
┌──────────────────────────────────────────┐
│  MATCHMAKING  (Firebase / Supabase)      │
│  lobby list · friend codes · player search│
│  Cost: $0 (free tier)                     │
└──────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│  P2P CONNECTION  (WebRTC)                 │
│  direct player-to-player, host = server   │
│  Cost: $0 (Google STUN for NAT traversal) │
└──────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│  GAMEPLAY                                 │
│  all state on host, players send actions, │
│  host validates and broadcasts            │
│  Cost: $0 (runs on players' devices)      │
└──────────────────────────────────────────┘
```

**Nothing about gameplay passes through infrastructure we pay for.** The matchmaking layer stores lobby metadata only — name, host ID, player count, timestamp. No game state, no card plays, no match results.

### NAT traversal
- Google STUN (`stun:stun.l.google.com:19302`) — free, unlimited
- Open Relay TURN as community fallback for the small percentage where STUN fails
- Optional $4/month signalling droplet if reliability demands it

### Anti-cheat
The host is authoritative and validates every action. Players cannot inject state; they submit intents. A cheating host only ruins their own lobby, which is acceptable pre-ranked-play. Replays and reports come later; for tournaments, a dedicated or trusted host runs the match.

---

## Cost projection

| Stage | Concurrent players | Monthly cost |
|---|---|---|
| Alpha (local only) | — | $0 |
| Closed beta (P2P + free signalling) | <500 | $0 |
| Open beta (P2P + Firebase lobbies) | 500-1,000 | $0 |
| Launch | 1,000-10,000 | $0-25 |
| Scale | 10,000+ | $100-200 |

At the point infrastructure costs anything meaningful, physical card revenue covers it many times over. **The digital game must never become a financial burden on the card game** — that constraint drove every choice above.

---

## Rollout phases

**Phase 1 — Local only.** Pass-and-play plus local WiFi. Zero infrastructure. Good enough for alpha testing, friends playing in person, and convention demos.

**Phase 2 — Online P2P.** WebRTC direct connections, friend codes (paste host ID). Free signalling.

**Phase 3 — Matchmaking.** Firebase/Supabase lobby list, quick play, friend lists.

**Phase 4 — Launch.** Same infrastructure, stabilized. Scale only as success demands, pay as you grow.

---

## Core systems sketch

```gdscript
class_name Card
var card_name: String
var card_type: String        # Attack, Defense, Utility, Equipment, Mighty Power
var symbols: Dictionary      # {attack: 2, play_again: 1}
var cost: int                # point-buy value for constructed formats
var rarity: String
var class_tag: String
var effects: Array[CardEffect]

class_name Player
var hp: int = 12
var deck: Array[Card]
var hand: Array[Card]
var discard: Array[Card]
var equipment: Array[Card]
var defense: Array[Card]
var character: Character

class_name GameManager
var players: Array[Player]
var active_player: Player

func execute_turn():
    active_player.draw_phase()
    active_player.play_phase()
    active_player.discard_phase()
    active_player.end_phase()
    next_player()
```

Host-side validation:

```gdscript
@rpc("any_peer", "call_remote")
func player_plays_card(card_id: int):
    if not is_multiplayer_authority():
        return
    var player = multiplayer.get_remote_sender_id()
    if not is_valid_move(player, card_id):
        kick_player(player, "Invalid move")
        return
    apply_card_play(player, card_id)
    rpc("update_game_state", game_state)
```

---

## Mobile UI layout

Portrait, thumb-reachable, opponent state on top and own state on bottom:

```
┌─────────────────┐
│   Opponent HP   │
│ [Equipment Row] │
│  [Defense Row]  │
├─────────────────┤
│   [Play Area]   │
├─────────────────┤
│  [Your Defense] │
│ [Your Equipment]│
│     Your HP     │
│ [Hand — swipe]  │
└─────────────────┘
```

Hosting drains more battery than joining, so hosting is a togglable setting. Mobile players can opt out entirely; desktop players are the natural hosts.

---

## Balance telemetry

Anonymous, minimal, existing only to tune the game.

**Tracked:** win rate per character, play rate per card, average turn length, average game length, combo frequency, turn-1 win rate, average damage and healing per turn.

**Automated flags:**

```gdscript
func check_balance_warnings():
    if character_winrate > 0.60:
        log_warning("Character too strong: " + character_name)
    if card_playrate > 0.80:
        log_warning("Card overplayed: " + card_name)
    if avg_game_length < 10:
        log_warning("Games too fast — increase HP or defense")
```

Targets: 45-55% win rate per character, 15-25 minute games, 30-60 second turns, 0% turn-1 wins.

---

## Digital-to-print pipeline

```
Digital beta (free, ~6 months)
  → balance data at real scale
  → balance pass (~2 months), card text locked
  → physical production (~3 months)
  → retail release
```

No misprints. No errata. No ban lists. The community has already played and approved every card before it's printed, which makes the physical release feel like the definitive edition rather than a gamble.
