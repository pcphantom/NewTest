/* =====================================================================
   GameState
   Owns: mutable match state, player lookup, event history, decision queue.
   Stays out of: rule execution, random dice, DOM rendering.
   ===================================================================== */

import {
    BASE_ACTIONS_PER_TURN,
    EVENT_LOG_LIMIT,
    GAME_MODES,
    MAX_PLAYERS,
    MIN_PLAYERS,
    PHASES,
    PLAYER_TYPES,
    STARTING_HP,
} from "./Constants.js";
import { get_character_definition } from "./CharacterData.js";

export class GameState {
    constructor(deck_handler) {
        if (typeof deck_handler !== "object" || deck_handler === null) {
            throw new TypeError("GameState requires a DeckHandler instance.");
        }

        this.deck_handler = deck_handler;
        this.reset_to_setup();
    }

    reset_to_setup() {
        this.players = [];
        this.game_mode = null;
        this.active_player_index = 0;
        this.turn_number = 0;
        this.round_number = 0;
        this.phase = PHASES.SETUP;
        this.actions_remaining = 0;
        this.pending_decisions = [];
        this.event_log = [];
        this.winner_player_id = null;
        this.active_turn_must_end_after_decisions = false;
        this.next_summon_number = 1;
        this.next_decision_number = 1;
        this.next_group_number = 1;
        this.love_hate_hate_counts = new Map();
        this.initiative_candidate_player_ids = [];
        this.initiative_candidate_index = 0;
        this.initiative_round = 1;
        this.initiative_winner_player_id = null;
    }

    create_match(player_configurations, game_mode) {
        if (!Array.isArray(player_configurations)) {
            throw new TypeError("Player configurations must be an array.");
        }

        if (player_configurations.length < MIN_PLAYERS || player_configurations.length > MAX_PLAYERS) {
            throw new RangeError(`Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`);
        }

        if (!Object.values(GAME_MODES).includes(game_mode)) {
            throw new Error(`Unknown game mode: ${game_mode}`);
        }

        this.reset_to_setup();
        this.game_mode = game_mode;

        for (let player_index = 0; player_index < player_configurations.length; player_index += 1) {
            const configuration = player_configurations[player_index];
            if (typeof configuration.name !== "string" || configuration.name.trim().length === 0) {
                throw new Error(`Player ${player_index + 1} requires a name.`);
            }

            const character = get_character_definition(configuration.character_id);
            if (!Object.values(PLAYER_TYPES).includes(configuration.player_type)) {
                throw new Error(`Player ${player_index + 1} has an invalid player type.`);
            }

            const player = this.create_player(
                player_index + 1,
                configuration.name.trim(),
                character.id,
                configuration.player_type
            );
            this.players.push(player);
        }

        this.phase = PHASES.INITIATIVE;
        this.initiative_candidate_player_ids = this.players.map((player) => player.id);
        this.initiative_candidate_index = 0;
        this.initiative_round = 1;
        this.add_event("Initiative begins. Every participant rolls a d20.", "system");
    }

    create_player(player_number, player_name, character_id, player_type) {
        const deck = this.deck_handler.build_character_deck(character_id);

        return {
            id: `player_${player_number}`,
            name: player_name,
            character_id,
            player_type,
            hp: STARTING_HP,
            max_hp: STARTING_HP,
            deck,
            hand: [],
            discard: [],
            defenses: [],
            summons: [],
            eliminated: false,
            initiative_roll: null,
            initiative_history: [],
            last_played_card_definition_id: null,
            outgoing_attack_reductions: [],
            incoming_attack_reductions: [],
            forced_attack_target_player_id: null,
            forced_attack_draw_reward_source_player_id: null,
            skip_next_turn_after_draw: false,
            skip_next_play_again_count: 0,
            phosphor_burn_source_player_ids: [],
            start_turn_damage_effects: [],
            tank_specs_activated_turn: null,
            blessing_of_kings_activated_turn: null,
            vengeance_activated_turn: null,
            second_wind_used: false,
            developers_favorite_used: false,
            monochrome_lecture_used_this_turn: false,
            threat_generation_used_this_turn: false,
            can_do_everything_used_this_turn: false,
            cards_played_this_turn: 0,
        };
    }

    get_active_player() {
        if (this.players.length === 0) {
            throw new Error("No active player exists before a match is created.");
        }

        return this.players[this.active_player_index];
    }

    get_player_by_id(player_id) {
        const player = this.players.find((candidate) => candidate.id === player_id);
        if (player === undefined) {
            throw new Error(`Unknown player id: ${player_id}`);
        }

        return player;
    }

    get_living_players() {
        return this.players.filter((player) => !player.eliminated);
    }

    get_living_opponents(player_id) {
        return this.players.filter((player) => player.id !== player_id && !player.eliminated);
    }

    get_next_initiative_player() {
        if (this.phase !== PHASES.INITIATIVE) {
            throw new Error("Initiative player requested outside the initiative phase.");
        }

        if (this.initiative_candidate_index >= this.initiative_candidate_player_ids.length) {
            return null;
        }

        const player_id = this.initiative_candidate_player_ids[this.initiative_candidate_index];
        return this.get_player_by_id(player_id);
    }

    rotate_players_to_first(first_player_id) {
        const first_player_index = this.players.findIndex((player) => player.id === first_player_id);
        if (first_player_index === -1) {
            throw new Error(`Cannot rotate turn order to unknown player ${first_player_id}.`);
        }

        if (first_player_index === 0) {
            return;
        }

        const leading_players = this.players.slice(0, first_player_index);
        const trailing_players = this.players.slice(first_player_index);
        this.players = trailing_players.concat(leading_players);
        this.active_player_index = 0;
    }

    add_event(message, tone) {
        if (typeof message !== "string" || message.length === 0) {
            throw new Error("Event messages must contain text.");
        }

        this.event_log.push({
            turn_number: this.turn_number,
            message,
            tone,
        });

        if (this.event_log.length > EVENT_LOG_LIMIT) {
            this.event_log.splice(0, this.event_log.length - EVENT_LOG_LIMIT);
        }
    }

    enqueue_decision(decision) {
        const decision_with_id = {
            ...decision,
            id: `decision_${this.next_decision_number}`,
        };
        this.next_decision_number += 1;
        this.pending_decisions.push(decision_with_id);
        return decision_with_id;
    }

    get_current_decision() {
        if (this.pending_decisions.length === 0) {
            return null;
        }

        return this.pending_decisions[0];
    }

    complete_current_decision(decision_id) {
        const current_decision = this.get_current_decision();
        if (current_decision === null) {
            throw new Error("There is no pending decision to complete.");
        }

        if (current_decision.id !== decision_id) {
            throw new Error(`Decision ${decision_id} is out of order; expected ${current_decision.id}.`);
        }

        this.pending_decisions.shift();
    }

    create_group_id(prefix) {
        const group_id = `${prefix}_${this.next_group_number}`;
        this.next_group_number += 1;
        return group_id;
    }

    create_summon(owner_player_id, name, hit_points) {
        const owner = this.get_player_by_id(owner_player_id);
        const summon = {
            id: `summon_${this.next_summon_number}`,
            name,
            hp: hit_points,
            max_hp: hit_points,
        };
        this.next_summon_number += 1;
        owner.summons.push(summon);
        return summon;
    }

    get_summon(owner_player_id, summon_id) {
        const owner = this.get_player_by_id(owner_player_id);
        const summon = owner.summons.find((candidate) => candidate.id === summon_id);
        if (summon === undefined) {
            throw new Error(`Unknown summon ${summon_id} for ${owner.name}.`);
        }

        return summon;
    }
}
