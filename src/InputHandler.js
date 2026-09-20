/* =====================================================================
   InputHandler
   Owns: browser input events and translation into game actions.
   Stays out of: rule calculations and HTML composition.
   ===================================================================== */

import {
    COMPLETED_CHARACTER_COUNT,
    MAX_PLAYERS,
    MIN_PLAYERS,
    PHASES,
} from "./Constants.js";
import { get_character_list } from "./CharacterData.js";

export class InputHandler {
    constructor(game_state, rules_engine, turn_handler, ui_handler, window_reference) {
        if (typeof window_reference !== "object" || window_reference === null) {
            throw new TypeError("InputHandler requires a window reference.");
        }

        this.game_state = game_state;
        this.rules_engine = rules_engine;
        this.turn_handler = turn_handler;
        this.ui_handler = ui_handler;
        this.window = window_reference;
        this.app_element = ui_handler.app_element;

        this.view_state = {
            setup_players: this.create_default_setup_players(),
            setup_error: null,
            interaction: null,
            private_decision_revealed: false,
            decision_error: null,
        };
    }

    initialize() {
        this.app_element.addEventListener("click", (event) => this.handle_click(event));
        this.render();
    }

    create_default_setup_players() {
        const characters = get_character_list();
        if (characters.length < MIN_PLAYERS) {
            throw new Error(`At least ${MIN_PLAYERS} completed characters are required for setup.`);
        }

        return [
            { name: "Player 1", character_id: characters[0].id },
            { name: "Player 2", character_id: characters[1].id },
        ];
    }

    handle_click(event) {
        if (!(event.target instanceof Element)) {
            return;
        }

        const action_element = event.target.closest("button[data-action]");
        if (action_element === null) {
            return;
        }

        const action = action_element.dataset.action;
        if (typeof action !== "string") {
            throw new Error("Action button is missing data-action.");
        }

        switch (action) {
            case "add-player":
                this.add_setup_player();
                return;
            case "remove-player":
                this.remove_setup_player(action_element);
                return;
            case "start-match":
                this.start_match();
                return;
            case "reveal-turn":
                this.reveal_turn(action_element);
                return;
            case "select-card":
                this.select_card(action_element);
                return;
            case "choose-conversion":
                this.choose_conversion(action_element);
                return;
            case "choose-no-conversion":
                this.choose_no_conversion(action_element);
                return;
            case "choose-card-target":
                this.choose_card_target(action_element);
                return;
            case "select-ability":
                this.select_ability(action_element);
                return;
            case "choose-ability-target":
                this.choose_ability_target(action_element);
                return;
            case "cancel-interaction":
                this.cancel_interaction();
                return;
            case "end-turn":
                this.end_turn(action_element);
                return;
            case "reveal-private-decision":
                this.reveal_private_decision(action_element);
                return;
            case "resolve-discard":
                this.resolve_discard(action_element);
                return;
            case "resolve-reclaim":
                this.resolve_reclaim(action_element);
                return;
            case "resolve-love-hate":
                this.resolve_love_hate(action_element);
                return;
            case "resolve-screen-burn":
                this.resolve_screen_burn(action_element);
                return;
            case "skip-screen-burn":
                this.skip_screen_burn(action_element);
                return;
            case "resolve-raid":
                this.resolve_raid(action_element);
                return;
            case "new-match":
                this.new_match();
                return;
            case "reload-page":
                this.window.location.reload();
                return;
            default:
                throw new Error(`Unhandled UI action: ${action}`);
        }
    }

    sync_setup_inputs() {
        for (let player_index = 0; player_index < this.view_state.setup_players.length; player_index += 1) {
            const name_input = this.app_element.querySelector(`[data-setup-name="${player_index}"]`);
            const character_select = this.app_element.querySelector(`[data-setup-character="${player_index}"]`);
            if (!(name_input instanceof HTMLInputElement)) {
                throw new Error(`Missing setup name input for player ${player_index + 1}.`);
            }
            if (!(character_select instanceof HTMLSelectElement)) {
                throw new Error(`Missing character select for player ${player_index + 1}.`);
            }

            this.view_state.setup_players[player_index] = {
                name: name_input.value,
                character_id: character_select.value,
            };
        }
    }

    add_setup_player() {
        this.sync_setup_inputs();
        if (this.view_state.setup_players.length >= MAX_PLAYERS) {
            return;
        }

        const characters = get_character_list();
        const next_player_number = this.view_state.setup_players.length + 1;
        const character_index = (next_player_number - 1) % characters.length;
        this.view_state.setup_players.push({
            name: `Player ${next_player_number}`,
            character_id: characters[character_index].id,
        });
        this.view_state.setup_error = null;
        this.render();
    }

    remove_setup_player(action_element) {
        this.sync_setup_inputs();
        if (this.view_state.setup_players.length <= MIN_PLAYERS) {
            return;
        }

        const player_index = Number(action_element.dataset.playerIndex);
        if (!Number.isInteger(player_index) || player_index < 0 || player_index >= this.view_state.setup_players.length) {
            throw new Error(`Invalid setup player index: ${action_element.dataset.playerIndex}`);
        }

        this.view_state.setup_players.splice(player_index, 1);
        this.view_state.setup_error = null;
        this.render();
    }

    start_match() {
        this.sync_setup_inputs();
        const validation_error = this.validate_setup();
        if (validation_error !== null) {
            this.view_state.setup_error = validation_error;
            this.render();
            return;
        }

        this.view_state.setup_error = null;
        this.view_state.interaction = null;
        this.view_state.private_decision_revealed = false;
        this.view_state.decision_error = null;
        this.turn_handler.start_match(this.view_state.setup_players);
        this.render();
    }

    validate_setup() {
        for (let player_index = 0; player_index < this.view_state.setup_players.length; player_index += 1) {
            if (this.view_state.setup_players[player_index].name.trim().length === 0) {
                return `Player ${player_index + 1} requires a name.`;
            }
        }

        if (this.view_state.setup_players.length <= COMPLETED_CHARACTER_COUNT) {
            const character_ids = this.view_state.setup_players.map((player) => player.character_id);
            const unique_character_ids = new Set(character_ids);
            if (unique_character_ids.size !== character_ids.length) {
                return "Completed character decks must be unique while enough distinct decks are available.";
            }
        }

        return null;
    }

    reveal_turn(action_element) {
        const player_id = this.require_dataset_string(action_element, "playerId");
        this.turn_handler.reveal_active_turn(player_id);
        this.after_mutation();
    }

    select_card(action_element) {
        const player = this.game_state.get_active_player();
        const card_instance_id = this.require_dataset_string(action_element, "cardInstanceId");
        const conversion_options = this.rules_engine.get_available_symbol_conversions(player.id, card_instance_id);

        if (conversion_options.length > 0) {
            this.view_state.interaction = {
                type: "symbol_conversion",
                player_id: player.id,
                card_instance_id,
                options: conversion_options,
            };
            this.render();
            return;
        }

        this.continue_card_selection(player.id, card_instance_id, null);
    }

    choose_conversion(action_element) {
        const interaction = this.require_interaction_type("symbol_conversion");
        const option_index = Number(action_element.dataset.optionIndex);
        if (!Number.isInteger(option_index) || option_index < 0 || option_index >= interaction.options.length) {
            throw new Error(`Invalid symbol conversion option: ${action_element.dataset.optionIndex}`);
        }

        const conversion = interaction.options[option_index];
        this.continue_card_selection(interaction.player_id, interaction.card_instance_id, conversion);
    }

    choose_no_conversion() {
        const interaction = this.require_interaction_type("symbol_conversion");
        this.continue_card_selection(interaction.player_id, interaction.card_instance_id, null);
    }

    continue_card_selection(player_id, card_instance_id, symbol_conversion) {
        const targets = this.rules_engine.get_legal_targets(player_id, card_instance_id, symbol_conversion);
        if (targets.length > 0) {
            this.view_state.interaction = {
                type: "card_target",
                player_id,
                card_instance_id,
                symbol_conversion,
                targets,
            };
            this.render();
            return;
        }

        this.view_state.interaction = null;
        this.rules_engine.play_card(player_id, card_instance_id, null, symbol_conversion);
        this.after_mutation();
    }

    choose_card_target(action_element) {
        const interaction = this.require_interaction_type("card_target");
        const target_index = Number(action_element.dataset.targetIndex);
        if (!Number.isInteger(target_index) || target_index < 0 || target_index >= interaction.targets.length) {
            throw new Error(`Invalid card target index: ${action_element.dataset.targetIndex}`);
        }

        const target = interaction.targets[target_index];
        this.view_state.interaction = null;
        this.rules_engine.play_card(
            interaction.player_id,
            interaction.card_instance_id,
            target,
            interaction.symbol_conversion
        );
        this.after_mutation();
    }

    select_ability(action_element) {
        const player = this.game_state.get_active_player();
        const ability_id = this.require_dataset_string(action_element, "abilityId");
        const target_player_ids = this.game_state.get_living_opponents(player.id).map((opponent) => opponent.id);
        if (target_player_ids.length === 0) {
            throw new Error("No living opponent is available for this ability.");
        }

        this.view_state.interaction = {
            type: "ability_target",
            player_id: player.id,
            ability_id,
            target_player_ids,
        };
        this.render();
    }

    choose_ability_target(action_element) {
        const interaction = this.require_interaction_type("ability_target");
        const target_player_id = this.require_dataset_string(action_element, "targetPlayerId");
        if (!interaction.target_player_ids.includes(target_player_id)) {
            throw new Error("Selected ability target is not legal.");
        }

        this.view_state.interaction = null;
        this.rules_engine.use_character_ability(interaction.player_id, interaction.ability_id, target_player_id);
        this.after_mutation();
    }

    cancel_interaction() {
        this.view_state.interaction = null;
        this.render();
    }

    end_turn(action_element) {
        const player_id = this.require_dataset_string(action_element, "playerId");
        this.turn_handler.end_turn(player_id);
        this.after_mutation();
    }

    reveal_private_decision(action_element) {
        const decision = this.game_state.get_current_decision();
        if (decision === null) {
            throw new Error("No private decision is pending.");
        }
        const decision_id = this.require_dataset_string(action_element, "decisionId");
        if (decision.id !== decision_id) {
            throw new Error(`Expected decision ${decision.id}, received ${decision_id}.`);
        }

        this.view_state.private_decision_revealed = true;
        this.view_state.decision_error = null;
        this.render();
    }

    resolve_discard(action_element) {
        const decision_id = this.require_dataset_string(action_element, "decisionId");
        const player_id = this.require_dataset_string(action_element, "playerId");
        const required_count = Number(action_element.dataset.requiredCount);
        const checked_inputs = this.app_element.querySelectorAll("input[data-discard-card]:checked");
        const card_instance_ids = [];

        for (const input of checked_inputs) {
            if (!(input instanceof HTMLInputElement)) {
                throw new Error("Discard selection contained a non-input element.");
            }
            card_instance_ids.push(this.require_dataset_string(input, "discardCard"));
        }

        if (card_instance_ids.length !== required_count) {
            this.view_state.decision_error = `Select exactly ${required_count} card(s).`;
            this.render();
            return;
        }

        this.view_state.private_decision_revealed = false;
        this.view_state.decision_error = null;
        this.rules_engine.resolve_decision(decision_id, player_id, { card_instance_ids });
        this.after_mutation();
    }

    resolve_reclaim(action_element) {
        const decision_id = this.require_dataset_string(action_element, "decisionId");
        const player_id = this.require_dataset_string(action_element, "playerId");
        const card_instance_id = this.require_dataset_string(action_element, "cardInstanceId");
        this.rules_engine.resolve_decision(decision_id, player_id, { card_instance_id });
        this.after_mutation();
    }

    resolve_love_hate(action_element) {
        const decision_id = this.require_dataset_string(action_element, "decisionId");
        const player_id = this.require_dataset_string(action_element, "playerId");
        const choice = this.require_dataset_string(action_element, "choice");
        this.rules_engine.resolve_decision(decision_id, player_id, { choice });
        this.after_mutation();
    }

    resolve_screen_burn(action_element) {
        const decision_id = this.require_dataset_string(action_element, "decisionId");
        const player_id = this.require_dataset_string(action_element, "playerId");
        const target_player_id = this.require_dataset_string(action_element, "targetPlayerId");
        this.rules_engine.resolve_decision(decision_id, player_id, { target_player_id });
        this.after_mutation();
    }

    skip_screen_burn(action_element) {
        const decision_id = this.require_dataset_string(action_element, "decisionId");
        const player_id = this.require_dataset_string(action_element, "playerId");
        this.rules_engine.resolve_decision(decision_id, player_id, { skip: true });
        this.after_mutation();
    }

    resolve_raid(action_element) {
        const decision_id = this.require_dataset_string(action_element, "decisionId");
        const player_id = this.require_dataset_string(action_element, "playerId");
        const raid_action = this.require_dataset_string(action_element, "raidAction");
        const resolution = { action: raid_action };

        if (raid_action === "attack") {
            resolution.target_player_id = this.require_dataset_string(action_element, "targetPlayerId");
        }

        this.rules_engine.resolve_decision(decision_id, player_id, resolution);
        this.after_mutation();
    }

    after_mutation() {
        this.view_state.interaction = null;
        this.view_state.decision_error = null;

        if (this.game_state.phase === PHASES.PLAY) {
            const active_player = this.game_state.get_active_player();
            if (active_player.eliminated && this.game_state.get_current_decision() === null) {
                this.turn_handler.finish_active_turn();
            } else {
                this.turn_handler.end_skipped_turn_if_ready();
            }
        }

        if (this.game_state.get_current_decision() !== null) {
            this.view_state.private_decision_revealed = false;
        }

        this.render();
    }

    new_match() {
        this.game_state.reset_to_setup();
        this.view_state.setup_error = null;
        this.view_state.interaction = null;
        this.view_state.private_decision_revealed = false;
        this.view_state.decision_error = null;
        this.render();
    }

    require_interaction_type(expected_type) {
        const interaction = this.view_state.interaction;
        if (interaction === null || interaction.type !== expected_type) {
            throw new Error(`Expected ${expected_type} interaction.`);
        }
        return interaction;
    }

    require_dataset_string(element, property_name) {
        const value = element.dataset[property_name];
        if (typeof value !== "string" || value.length === 0) {
            throw new Error(`Missing data-${property_name} value.`);
        }
        return value;
    }

    render() {
        this.ui_handler.render(this.game_state, this.rules_engine, this.turn_handler, this.view_state);
    }
}
