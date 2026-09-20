/* =====================================================================
   Constants
   Owns: fixed gameplay values and shared enum-like identifiers.
   Stays out of: mutable game state, rendering, card resolution.
   ===================================================================== */

export const GAME_TITLE = "Dungeons & Mayhem";
export const STARTING_HP = 12;
export const DECK_SIZE = 28;
export const OPENING_HAND_SIZE = 3;
export const CARDS_DRAWN_PER_TURN = 1;
export const EMPTY_HAND_DRAW_COUNT = 2;
export const BASE_ACTIONS_PER_TURN = 1;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const COMPLETED_CHARACTER_COUNT = 3;
export const MIN_DAMAGE_AFTER_REDUCTION = 1;
export const RAID_PALADIN_COUNT = 3;
export const RAID_PALADIN_HP = 2;
export const EVENT_LOG_LIMIT = 80;
export const INITIATIVE_DIE_SIDES = 20;
export const AI_ACTION_DELAY_MS = 650;
export const AI_INITIATIVE_DELAY_MS = 700;

export const GAME_MODES = Object.freeze({
    SINGLE_PLAYER: "single_player",
    LOCAL_MULTIPLAYER: "local_multiplayer",
});

export const PLAYER_TYPES = Object.freeze({
    HUMAN: "human",
    COMPUTER: "computer",
});

export const CARD_TYPES = Object.freeze({
    ATTACK: "Attack",
    DEFENSE: "Defense",
    DRAW: "Draw",
    HEALING: "Healing",
    MIGHTY_POWER: "Mighty Power",
    UTILITY: "Utility",
});

export const SYMBOL_NAMES = Object.freeze({
    ATTACK: "attack",
    DEFENSE: "defense",
    HEALING: "healing",
    DRAW: "draw",
    PLAY_AGAIN: "play_again",
});

export const SYMBOL_GLYPHS = Object.freeze({
    attack: "⚔️",
    defense: "🛡️",
    healing: "❤️",
    draw: "🃏",
    play_again: "⚡",
});

export const TARGET_MODES = Object.freeze({
    NONE: "none",
    OPPONENT: "opponent",
    ALL_OPPONENTS: "all_opponents",
    SELF: "self",
});

export const TARGET_TYPES = Object.freeze({
    PLAYER: "player",
    SUMMON: "summon",
});

export const PHASES = Object.freeze({
    SETUP: "setup",
    INITIATIVE: "initiative",
    HANDOFF: "handoff",
    PLAY: "play",
    GAME_OVER: "game_over",
});

export const MENU_SCREENS = Object.freeze({
    MAIN: "main",
    SINGLE_PLAYER_SETUP: "single_player_setup",
    LOCAL_MULTIPLAYER_SETUP: "local_multiplayer_setup",
    HOW_TO_PLAY: "how_to_play",
});

export const DECISION_TYPES = Object.freeze({
    DISCARD_CARDS: "discard_cards",
    LOVE_OR_HATE: "love_or_hate",
    RAID_PALADIN_ACTION: "raid_paladin_action",
    SCREEN_BURN_TARGET: "screen_burn_target",
    RECLAIM_DEFENSE: "reclaim_defense",
});

export const CHARACTER_IDS = Object.freeze({
    GRANDPA: "grandpa_the_grayscale",
    MALRIC: "malric_the_meat_shield",
    PATCHADIN: "patchadin_the_overpowered",
});

export const EFFECT_IDS = Object.freeze({
    STANDARD: "standard",
    BACK_IN_MY_DAY: "back_in_my_day",
    BORING_STORY: "boring_story",
    CRT_SCREEN_FLICKER: "crt_screen_flicker",
    FLOPPY_DISK_OF_POWER: "floppy_disk_of_power",
    GRAYSCALE_BOMB: "grayscale_bomb",
    LOADING_PLEASE_WAIT: "loading_please_wait",
    MONOCHROME_SHIELD: "monochrome_shield",
    PHOSPHOR_BURN: "phosphor_burn",
    SCREEN_SAVER: "screen_saver",
    THE_OLDEN_DAYS: "the_olden_days",
    AGGRESSIVE_POSITIONING: "aggressive_positioning",
    BLOCK_THIS: "block_this",
    COOLDOWN_READY: "cooldown_ready",
    FACE_TANK: "face_tank",
    IGNORE_PAIN: "ignore_pain",
    INSPIRING_PRESENCE: "inspiring_presence",
    LOOKING_FOR_GROUP: "looking_for_group",
    MOCKING_BLOW: "mocking_blow",
    SHIELD_BASH: "shield_bash",
    SHIELD_WALL: "shield_wall",
    STAND_YOUR_GROUND: "stand_your_ground",
    TANK_SPECS: "tank_specs",
    VENGEANCE: "vengeance",
    ALL_PALADIN_RAID: "all_paladin_raid",
    BLESSING_OF_KINGS: "blessing_of_kings",
    BUBBLE_HEARTH: "bubble_hearth",
    DIVINE_SHIELD: "divine_shield",
    DIVINE_STORM: "divine_storm",
    DIVINE_INTERVENTION: "divine_intervention",
    WAKE_OF_ASHES: "wake_of_ashes",
    HAND_OF_PROTECTION: "hand_of_protection",
    LAY_ON_HANDS: "lay_on_hands",
    LOVE_ME_OR_HATE_ME: "love_me_or_hate_me",
    NERF_INCOMING: "nerf_incoming",
});

export const CHARACTER_ABILITY_IDS = Object.freeze({
    MONOCHROME_LECTURE: "monochrome_lecture",
    THREAT_GENERATION: "threat_generation",
});

export const MONOCHROME_LECTURE_DC = 13;
export const MONOCHROME_LECTURE_DAMAGE = 1;
export const SCREEN_BURN_DAMAGE = 1;
export const BORING_STORY_DC = 12;
export const BORING_STORY_DISCARD_COUNT = 2;
export const BACK_IN_MY_DAY_ATTACK_REDUCTION = 2;
export const FLOPPY_DISK_DISCARD_COUNT = 1;
export const AGGRESSIVE_POSITIONING_DRAW_COUNT = 1;
export const IGNORE_PAIN_ATTACK_REDUCTION = 3;
export const SHIELD_BASH_BONUS_DAMAGE = 1;
export const TANK_SPECS_BONUS_SHIELDS = 1;
export const VENGEANCE_REFLECT_DAMAGE = 1;
export const SECOND_WIND_TRIGGER_HP = 4;
export const SECOND_WIND_HEALING = 6;
export const SECOND_WIND_DRAW_COUNT = 2;
export const DEVELOPERS_FAVORITE_HP = 6;
export const CHIP_DAMAGE_IMMUNITY_THRESHOLD = 3;
export const CRT_SCREEN_FLICKER_DAMAGE = 1;
export const BLOCK_THIS_DAMAGE = 2;
export const FACE_TANK_HEALING = 3;
export const DIVINE_SHIELD_HEALING = 1;
export const LOOKING_FOR_GROUP_SELF_DRAW = 2;
export const LOOKING_FOR_GROUP_OPPONENT_DRAW = 1;
export const BLESSING_OF_KINGS_ATTACK_BONUS = 2;
export const BLESSING_OF_KINGS_SHIELD_BONUS = 2;
export const BUBBLE_HEARTH_END_HP = 10;
export const LOVE_ME_OR_HATE_ME_HEALING = 2;
export const LOVE_ME_OR_HATE_ME_DAMAGE = 2;
export const NERF_INCOMING_ATTACK_REDUCTION = 3;
export const NERF_INCOMING_START_TURN_DAMAGE = 1;
export const RAID_PALADIN_ATTACK_DAMAGE = 1;
export const RAID_PALADIN_HEALING = 1;
