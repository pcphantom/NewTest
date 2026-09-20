# Godot Project Architecture

Recovered from the "Concept Game in Godot" design session. This is the actual client architecture — `06-technical-architecture.md` covers the stack, networking, and costs; this covers how the project is laid out.

**Design brief that produced it:** Godot 4.5.1, mobile-first with PC/Mac/Linux, maximally modular ("more modules but smaller modules is better"), intuitive script names, data-driven so that adding a card requires no changes to existing scripts, and a single input layer serving both touch and mouse/keyboard.

---

## The core goal: three-step content addition

**Step 1.** Drop `new_card.png` into `assets/images/cards/<expansion>/<character>/`

**Step 2.** Add the card entry to `data/cards/<expansion>/<Character>Cards.gd`

**Step 3.** Done. The card loads automatically, the image path resolves automatically, and the effects are handled by existing modules. No existing script is touched.

This constraint drove every other decision below.

---

## Directory structure

```
MMORPG_CardGame/
│
├── project.godot
├── README.md
├── export_presets.cfg
│
├── assets/
│   ├── images/
│   │   ├── icons/
│   │   │   ├── attack_icon.png
│   │   │   ├── defense_icon.png
│   │   │   ├── healing_icon.png
│   │   │   ├── draw_icon.png
│   │   │   ├── play_again_icon.png
│   │   │   └── equipment_icon.png
│   │   │
│   │   ├── cards/
│   │   │   └── <expansion>/<character>/<card_name>.png
│   │   │
│   │   ├── characters/
│   │   │   ├── portraits/
│   │   │   └── full_art/
│   │   │
│   │   ├── ui/
│   │   │   ├── backgrounds/
│   │   │   ├── buttons/
│   │   │   ├── frames/
│   │   │   └── effects/
│   │   │
│   │   ├── equipment/
│   │   │   ├── weapons/
│   │   │   ├── armor/
│   │   │   ├── accessories/
│   │   │   └── consumables/
│   │   │
│   │   └── dice/
│   │       └── d4.png … d20.png
│   │
│   ├── audio/
│   │   ├── music/
│   │   ├── sfx/
│   │   └── voice/
│   │
│   └── fonts/
│       ├── retro_pixel.ttf
│       ├── card_text.ttf
│       └── damage_numbers.ttf
│
├── data/
│   ├── cards/
│   │   ├── CardDatabase.gd
│   │   └── <expansion>/<Character>Cards.gd
│   │
│   ├── characters/
│   │   ├── CharacterDatabase.gd
│   │   └── <expansion>/<Character>Character.gd
│   │
│   ├── equipment/
│   │   ├── EquipmentDatabase.gd
│   │   ├── WeaponsData.gd
│   │   ├── ArmorData.gd
│   │   ├── AccessoriesData.gd
│   │   └── ConsumablesData.gd
│   │
│   └── game_constants/
│       ├── GameConstants.gd
│       ├── CardTypes.gd
│       ├── EffectTypes.gd
│       └── DiceTypes.gd
│
├── modules/
│   ├── core/
│   ├── combat/
│   ├── cards/
│   ├── health/
│   ├── shields/
│   ├── equipment/
│   ├── dice/
│   ├── abilities/
│   ├── effects/
│   ├── summons/
│   ├── forms/
│   ├── multiplayer/
│   └── ai/
│
├── scenes/
│   ├── main/
│   ├── game/
│   ├── ui/
│   │   ├── components/
│   │   ├── overlays/
│   │   └── hud/
│   └── vfx/
│
├── scripts/
│   ├── autoload/
│   ├── utilities/
│   └── networking/
│
└── tests/
    ├── unit/
    └── integration/
```

> **Note:** the original design used the reference-game expansion folders (`base_game`, `monster_madness`, `baldurs_gate`) alongside `pythons_quest`, because the reference decks were being used as the working data set. For the real game those folders should be renamed to the actual expansions.

---

## Modules

### `modules/core/`
| Script | Responsibility |
|---|---|
| `GameManager.gd` | Central game state. Coordinates all major systems. Init, pause, resume, end. Manages game mode (PvP, PvE, tutorial). |
| `TurnManager.gd` | Turn order and phase progression — Draw, Play, Discard, End. Enforces mandatory actions. Tracks current player and turn number. |
| `PlayerManager.gd` | All player instances. Player count, elimination status, per-player data. Manages adjacency for Zone of Influence. |
| `InputManager.gd` | Unified touch and mouse/keyboard handling. Card drag-and-drop, tap/click detection, input-method detection. |
| `SaveLoadManager.gd` | Save/load state, player preferences, deck configurations, future cloud save. |

### `modules/combat/`
| Script | Responsibility |
|---|---|
| `AttackModule.gd` | Processes attacks. Base damage plus equipment bonuses, targeting, animation triggers. |
| `DefenseModule.gd` | Defense card placement, active shields on field, absorption, shield-break triggers. |
| `HealingModule.gd` | Heal amount plus equipment bonuses, max-HP cap enforcement, dice-based healing. |
| `DamageCalculator.gd` | Central damage math. All modifiers, reduction/amplification, spillover, immunity/resistance. |
| `TargetingModule.gd` | Target selection UI. Enforces adjacency and Zone of Influence, validates legal targets, touch and mouse selection. |
| `CombatResolver.gd` | Complex interactions — simultaneous effects, timing/priority, conflicting effects. |

### `modules/cards/`
| Script | Responsibility |
|---|---|
| `CardManager.gd` | High-level coordinator. Card lifecycle: draw → hand → play → discard. |
| `DeckManager.gd` | Draw pile, shuffling, empty-deck reshuffle rule, deck count, deck loading from data. |
| `HandManager.gd` | Hand arrangement/display, selection and highlighting, fan-out animations. |
| `DiscardPileManager.gd` | Discard tracking, graveyard interactions, retrieve-from-discard effects. |
| `PlayCardModule.gd` | Play legality, cost deduction, effect resolution trigger, ⚡ Play Again handling, mandatory-action enforcement. |
| `DrawCardModule.gd` | Draw symbols 🃏, empty-hand rule (draw 2 if forced to play with an empty hand), draw animations. |
| `CardEffectResolver.gd` | Interprets card data into game actions. Handles effect chains and the "card text overrides rules" principle. |

### `modules/health/`
| Script | Responsibility |
|---|---|
| `HealthModule.gd` | Current/max HP for all players. HP bounds (0 min, 12 max). HP change events. |
| `HPTracker.gd` | Visual HP display, bar animations, damage/heal numbers. |
| `EliminationHandler.gd` | Elimination triggers, optional equipment drop, Vengeful Ghost transition, announcements. |
| `ReviveModule.gd` | Revival effects such as "Not Quite Dead". One-time revival tracking. |

### `modules/shields/`
| Script | Responsibility |
|---|---|
| `ShieldModule.gd` | All active shields, persistence, stacking. |
| `ShieldTracker.gd` | Per-shield damage, remaining capacity. |
| `ShieldBreakHandler.gd` | Destruction, on-break effects, spillover to HP, shield discard. |
| `DamageAbsorption.gd` | Damage distribution across shields, armor bonuses, special rules (immunity to 1-damage attacks etc.). |

### `modules/equipment/`
| Script | Responsibility |
|---|---|
| `EquipmentManager.gd` | All equipment in play, slot limits, ownership. |
| `WeaponModule.gd` | Weapon damage bonuses and weapon-specific effects. |
| `ArmorModule.gd` | Armor shield bonuses applied to Defense cards. |
| `AccessoryModule.gd` | Passive abilities, special triggers, accessory slot limits (2). |
| `ConsumableModule.gd` | One-time-use effects and destruction after use. |
| `EquipmentSlotManager.gd` | Slot system, limits, optional overload rule, placement validation. |
| `EquipmentBonusCalculator.gd` | Aggregates all active equipment into total modifiers for combat modules. |

### `modules/dice/`
| Script | Responsibility |
|---|---|
| `DiceRoller.gd` | d4/d6/d8/d10/d12/d20, RNG, roll animations, multi-dice rolls (2d6 etc.). |
| `SavingThrowModule.gd` | d20 vs DC, success/failure, advantage/disadvantage, natural 20 / natural 1. |
| `CriticalModule.gd` | Critical success and failure outcomes. Equipment that modifies crit range. |
| `AdvantageDisadvantageModule.gd` | Roll twice take higher/lower. Tracks sources. |

### `modules/abilities/`
| Script | Responsibility |
|---|---|
| `AbilityManager.gd` | Coordinates character abilities, cooldowns, usage tracking, activation validation. |
| `MightyPowerModule.gd` | Mighty Power card effects — unique, powerful, character-defining. |
| `SignatureAbilityModule.gd` | Character signature abilities (e.g. Grandpa's Monochrome Lecture). |
| `PassiveAbilityModule.gd` | Always-active passives — equipment bonuses, form bonuses. |
| `TriggeredAbilityModule.gd` | "When X happens, do Y" — on shield break, on draw, etc. |

### `modules/effects/`
| Script | Responsibility |
|---|---|
| `EffectManager.gd` | All active effects, timing, duration, cleanup of expired effects. |
| `BuffModule.gd` | Positive effects, duration, stacking. |
| `DebuffModule.gd` | Negative effects, duration, saving throws to remove. |
| `StatusEffectModule.gd` | Ongoing conditions, status icons, per-turn processing. |
| `TemporaryEffectModule.gd` | "Until your next turn" effects and automatic expiry. |
| `PersistentEffectModule.gd` | Permanent changes — Form cards, continuous abilities. |

### `modules/summons/`
| Script | Responsibility |
|---|---|
| `SummonManager.gd` | All summons, ownership, lifecycle, targeting. |
| `MinionModule.gd` | Individual minion behavior, HP, damage, attack patterns. |
| `SummonAIModule.gd` | Automated summon decisions and targeting each turn. |
| `SummonHealthModule.gd` | Summon HP, elimination, healing. |

### `modules/forms/`
| Script | Responsibility |
|---|---|
| `FormManager.gd` | Form/stance system, switching, "only one form at a time" enforcement. |
| `BearFormModule.gd` | Defensive form mechanics. |
| `WolfFormModule.gd` | Offensive form mechanics. |
| `FormBonusCalculator.gd` | Which cards gain bonuses in the current form, and applies modifiers. |

### `modules/multiplayer/`
| Script | Responsibility |
|---|---|
| `ZoneOfInfluenceModule.gd` | 5-6 player adjacency targeting restriction. Exempts area effects and Mighty Powers. |
| `TeamManager.gd` | Team play (2v2, 3v3), membership, friendly-fire prevention, team victory. |
| `VengefulGhostModule.gd` | Eliminated players deal 1 damage per turn, cannot eliminate, duration limits. |
| `MultiplayerRulesModule.gd` | Turn order with many players, simultaneous elimination, variant formats. |

### `modules/ai/`
| Script | Responsibility |
|---|---|
| `AIController.gd` | AI player controller. Simulates human actions, executes AI turns. |
| `AIDecisionModule.gd` | Evaluates game state, chooses cards and abilities, implements strategy archetypes. |
| `AITargetingModule.gd` | Threat-based target prioritization using HP, shields, position. |
| `AIDifficultyModule.gd` | Easy (suboptimal), Medium (good with mistakes), Hard (optimal). |

---

## Scenes

```
scenes/main/       MainMenu · CharacterSelect · GameSetup
scenes/game/       BattleScene · PlayerArea · OpponentArea
scenes/ui/components/
                   Card · HealthBar · ShieldDisplay · EquipmentSlot
                   DiceRollDisplay · DamageNumber · IconWithNumber
scenes/ui/overlays/
                   CardDetails · TargetSelector · ConfirmationDialog
scenes/ui/hud/     GameHUD · TurnIndicator · EndTurnButton
scenes/vfx/        AttackEffect · HealEffect · ShieldBreakEffect
                   CardGlowEffect · DiceRollAnimation
```

Each `.tscn` has a matching `.gd` of the same name.

---

## The icon system

**This is a significant design decision and it contradicts how the deck documents currently notate cards.**

Cards do **not** display repeated small symbols. Instead each card shows a **large icon with a bold outlined number inside it**, so a player reads the value at a glance without counting pips.

- Icon at 64×64 or larger
- Number overlaid, bold, with a thick black outline for legibility
- Scales cleanly on mobile
- ⚔️ with a bold "3" = 3 damage · 🛡️ with "5" = 5 shields · ❤️ with "2" = 2 healing

```gdscript
extends Control
class_name IconWithNumber

@onready var icon_sprite = $IconSprite
@onready var number_label = $NumberLabel

func set_icon(icon_type: String):
	var icon_path = "res://assets/images/icons/" + icon_type + "_icon.png"
	icon_sprite.texture = load(icon_path)

func set_number(value: int):
	number_label.text = str(value)
	number_label.visible = (value > 0)

func setup(icon_type: String, value: int):
	set_icon(icon_type)
	set_number(value)
```

---

## Data-driven content

### Card data

```gdscript
extends Node
class_name GrandpaGrayscaleCards

# Card naming convention matches image files in
# assets/images/cards/pythons_quest/grandpa_grayscale/

static func get_cards() -> Array:
	return [
		{
			"id": "grandpa_eight_bit_blast",
			"name": "8-Bit Blast",
			"type": CardTypes.ATTACK,
			"character": "grandpa_grayscale",
			"expansion": "pythons_quest",
			"quantity": 4,
			"effects": [
				{"type": EffectTypes.DAMAGE, "value": 2}
			],
			"flavor_text": "256 shades of gray? That's 255 more than I need!",
			"image_path": "eight_bit_blast.png",
			"rarity": "common"
		},
		{
			"id": "grandpa_floppy_disk_power",
			"name": "Floppy Disk of Power",
			"type": CardTypes.MIGHTY_POWER,
			"character": "grandpa_grayscale",
			"expansion": "pythons_quest",
			"quantity": 1,
			"effects": [
				{"type": EffectTypes.DRAW, "value": 3},
				{"type": EffectTypes.FORCE_DISCARD, "value": 1, "target": "all_opponents"},
				{"type": EffectTypes.PLAY_AGAIN, "value": 1}
			],
			"flavor_text": "5.25 inches of pure storage capacity!",
			"image_path": "floppy_disk_of_power.png",
			"rarity": "legendary"
		},
		{
			"id": "grandpa_boring_story",
			"name": "Boring Story",
			"type": CardTypes.UTILITY,
			"character": "grandpa_grayscale",
			"expansion": "pythons_quest",
			"quantity": 3,
			"effects": [
				{
					"type": EffectTypes.SAVING_THROW,
					"dc": 12,
					"on_fail": {"type": EffectTypes.DISCARD, "value": 2}
				}
			],
			"flavor_text": "It all started in 1982, when I purchased my first computer...",
			"image_path": "boring_story.png",
			"rarity": "common"
		},
		{
			"id": "grandpa_crt_flicker",
			"name": "CRT Screen Flicker",
			"type": CardTypes.DEFENSE,
			"character": "grandpa_grayscale",
			"expansion": "pythons_quest",
			"quantity": 2,
			"effects": [
				{"type": EffectTypes.SHIELD, "value": 3},
				{"type": EffectTypes.ON_BREAK, "action": {"type": EffectTypes.DAMAGE, "value": 1, "target": "attacker"}}
			],
			"flavor_text": "The static electricity will get you.",
			"image_path": "crt_screen_flicker.png",
			"rarity": "uncommon"
		}
	]
```

### Character data

```gdscript
extends Node
class_name GrandpaGrayscaleCharacter

static func get_character_data() -> Dictionary:
	return {
		"id": "grandpa_grayscale",
		"name": "Grandpa the Grayscale",
		"title": "Wizard",
		"expansion": "pythons_quest",
		"archetype": "Controller",
		"starting_hp": 12,
		"hp_die": "d12",

		"portrait": "grandpa_grayscale_portrait.png",
		"full_art": "grandpa_grayscale_full.png",

		"signature_abilities": [
			{
				"name": "Monochrome Lecture",
				"description": "Once per turn, force target opponent to make DC 13 save or skip their next Play Again action. They take 1 damage from boredom either way.",
				"type": "active",
				"cooldown": "once_per_turn"
			},
			{
				"name": "Screen Burn-In",
				"description": "When you play a spell that deals damage, you may deal 1 additional damage to the same target.",
				"type": "passive"
			}
		],

		"equipment_focus": ["accessories"],
		"deck_cards": "GrandpaGrayscaleCards",
		"flavor_quote": "Back in my day, we didn't need COLOR to cast spells!",

		"strategy_tips": [
			"Focus on card advantage early with Memory Leak",
			"Use Boring Story to disrupt opponent setup",
			"The Olden Days can reset the game if you're behind",
			"Screen Saver provides reusable defense"
		],

		"counters": ["fast_aggro", "simple_beatdown"],
		"strong_against": ["combo_decks", "control_decks"]
	}
```

### Database with automatic image resolution

```gdscript
extends Node
class_name CardDatabase

var all_cards: Dictionary = {}

func _ready():
	_load_all_cards()

func _load_all_cards():
	_load_expansion_cards("pythons_quest", [
		GrandpaGrayscaleCards,
		MalricMeatShieldCards,
		PatchadinCards,
		UnladenSwallowCards,
		SirSyntaxErrorCards,
		KarenNotFoundCards,
		TimEnchanterCards,
		ReadmeTxtCards
	])

func _load_expansion_cards(expansion: String, card_classes: Array):
	for card_class in card_classes:
		var cards = card_class.get_cards()
		for card in cards:
			card["full_image_path"] = _resolve_image_path(card)
			all_cards[card["id"]] = card

func _resolve_image_path(card: Dictionary) -> String:
	var base_path = "res://assets/images/cards/"
	return base_path + card["expansion"] + "/" + card["character"] + "/" + card["image_path"]

func get_card(card_id: String) -> Dictionary:
	return all_cards.get(card_id, {})

func get_cards_by_character(character_id: String) -> Array:
	var result = []
	for card in all_cards.values():
		if card["character"] == character_id:
			result.append(card)
	return result

func get_cards_by_expansion(expansion: String) -> Array:
	var result = []
	for card in all_cards.values():
		if card["expansion"] == expansion:
			result.append(card)
	return result
```

---

## Unified input

One code path serves touch and mouse. Mouse handlers delegate to the touch handlers so behavior can't diverge.

```gdscript
extends Node
class_name InputManager

signal card_selected(card: Node)
signal card_dragged(card: Node, position: Vector2)
signal card_dropped(card: Node, target: Node)
signal target_selected(target: Node)
signal cancel_action()

enum InputMethod { TOUCH, MOUSE_KEYBOARD }

var current_input_method: InputMethod = InputMethod.MOUSE_KEYBOARD
var is_dragging: bool = false
var drag_card: Node = null
var drag_start_position: Vector2

func _ready():
	_detect_input_method()

func _detect_input_method():
	if OS.has_feature("mobile") or OS.has_feature("web_android") or OS.has_feature("web_ios"):
		current_input_method = InputMethod.TOUCH
	else:
		current_input_method = InputMethod.MOUSE_KEYBOARD

func _input(event):
	match current_input_method:
		InputMethod.TOUCH:
			_handle_touch_input(event)
		InputMethod.MOUSE_KEYBOARD:
			_handle_mouse_input(event)

func _handle_touch_input(event):
	if event is InputEventScreenTouch:
		if event.pressed:
			_on_touch_start(event.position)
		else:
			_on_touch_end(event.position)
	elif event is InputEventScreenDrag:
		_on_touch_drag(event.position)

func _handle_mouse_input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_on_touch_start(event.position)
			else:
				_on_touch_end(event.position)
	elif event is InputEventMouseMotion:
		if event.button_mask & MOUSE_BUTTON_MASK_LEFT:
			_on_touch_drag(event.position)

func _on_touch_start(position: Vector2):
	var card = _get_card_at_position(position)
	if card:
		is_dragging = true
		drag_card = card
		drag_start_position = position
		card_selected.emit(card)

func _on_touch_drag(position: Vector2):
	if is_dragging and drag_card:
		card_dragged.emit(drag_card, position)

func _on_touch_end(position: Vector2):
	if is_dragging and drag_card:
		var target = _get_drop_target_at_position(position)
		card_dropped.emit(drag_card, target)
		is_dragging = false
		drag_card = null

func _get_card_at_position(position: Vector2) -> Node:
	var space_state = get_viewport().world_2d.direct_space_state
	var query = PhysicsPointQueryParameters2D.new()
	query.position = position
	var result = space_state.intersect_point(query)
	for hit in result:
		if hit.collider.is_in_group("cards"):
			return hit.collider
	return null

func _get_drop_target_at_position(position: Vector2) -> Node:
	var space_state = get_viewport().world_2d.direct_space_state
	var query = PhysicsPointQueryParameters2D.new()
	query.position = position
	var result = space_state.intersect_point(query)
	for hit in result:
		if hit.collider.is_in_group("drop_targets"):
			return hit.collider
	return null
```

---

## Constants and enums

```gdscript
extends Node
class_name CardTypes

enum Type {
	ATTACK, DEFENSE, HEALING, DRAW, UTILITY,
	MIGHTY_POWER, EQUIPMENT, SUMMON, FORM, REACTION, CURSE
}
```

```gdscript
extends Node
class_name EffectTypes

enum Effect {
	DAMAGE, SHIELD, HEAL, DRAW, PLAY_AGAIN,
	DISCARD, FORCE_DISCARD, SAVING_THROW,
	APPLY_STATUS, REMOVE_STATUS, DESTROY_EQUIPMENT,
	SUMMON_CREATURE, CHANGE_FORM, SKIP_TURN,
	STEAL_CARD, RETURN_TO_HAND, SHUFFLE_INTO_DECK
	# extend as cards require
}
```

```gdscript
extends Node
class_name DiceTypes

enum Die { D4, D6, D8, D10, D12, D20 }

static func roll(die: Die) -> int:
	match die:
		D4: return randi_range(1, 4)
		D6: return randi_range(1, 6)
		D8: return randi_range(1, 8)
		D10: return randi_range(1, 10)
		D12: return randi_range(1, 12)
		D20: return randi_range(1, 20)
	return 0
```

---

## Autoloads

```ini
[autoload]

Global="*res://scripts/autoload/Global.gd"
Events="*res://scripts/autoload/Events.gd"
AudioManager="*res://scripts/autoload/AudioManager.gd"
UIManager="*res://scripts/autoload/UIManager.gd"
CardDatabase="*res://data/cards/CardDatabase.gd"
CharacterDatabase="*res://data/characters/CharacterDatabase.gd"
EquipmentDatabase="*res://data/equipment/EquipmentDatabase.gd"
GameConstants="*res://data/game_constants/GameConstants.gd"
```

---

## Architectural rules

**Separation of concerns.** One responsibility per module. Modules never reach into each other's internal state — communication goes through signals and defined interfaces.

**Data-driven.** Cards, characters, and equipment are data. No card effect is ever hardcoded in a script.

**Scalability.** A new expansion is new folders plus new data files. Existing modules handle the new content without modification.

**Maintainability.** Function names describe what they do. Modules stay small so they stay debuggable.

**Cross-platform.** One input system, scaling UI, performance tuned for mobile.
