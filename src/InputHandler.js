/* =====================================================================
   InputHandler
   Owns: browser input, menu flow and human action translation.
   Stays out of: rule calculations and HTML composition.
   ===================================================================== */

import {
    AI_ACTION_DELAY_MS,
    AI_INITIATIVE_DELAY_MS,
    GAME_MODES,
    MENU_SCREENS,
    PHASES,
    PLAYER_TYPES,
} from "./Constants.js";
import { get_character_list } from "./CharacterData.js";
import { get_card_definition } from "./CardData.js";

export class InputHandler {
    constructor(game_state, rules_engine, turn_handler, ai_player_handler, ui_handler, window_reference) {
        this.game_state = game_state;
        this.rules_engine = rules_engine;
        this.turn_handler = turn_handler;
        this.ai_player_handler = ai_player_handler;
        this.ui_handler = ui_handler;
        this.window = window_reference;
        this.app_element = ui_handler.app_element;
        this.automatic_action_timer = null;

        const characters = get_character_list();
        this.view_state = {
            menu_screen: MENU_SCREENS.MAIN,
            single_player_name: "Player",
            single_player_character_id: characters[0].id,
            single_player_count: 2,
            local_player_count: 2,
            local_players: this.create_local_players(2),
            setup_error: null,
            interaction: null,
            private_decision_revealed: false,
            decision_error: null,
            pause_menu: false,
            confirm_quit: false,
            inspected_card: null,
            skills_player_id: null,
            hand_pinned: false,
        };
        this.hand_hovered = false;
        this.hand_hover_suppressed = false;
        this.focus_return_selector = null;
        this.hand_press = null;
        this.suppress_hand_click = false;
    }

    initialize() {
        this.app_element.addEventListener("click", (event) => this.handle_click(event));
        this.app_element.addEventListener("change", (event) => this.handle_change(event));
        this.app_element.addEventListener('pointerover', event => this.handle_pointer_over(event));
        this.app_element.addEventListener('pointerout', event => this.handle_pointer_out(event));
        this.app_element.addEventListener('keydown', event => this.handle_keydown(event));
        this.app_element.addEventListener('contextmenu', event => this.handle_card_context_menu(event));
        this.app_element.addEventListener('pointerdown', event => this.begin_hand_press(event));
        this.app_element.addEventListener('pointermove', event => this.move_hand_press(event));
        this.app_element.addEventListener('pointerup', () => this.cancel_hand_press());
        this.app_element.addEventListener('pointercancel', () => this.cancel_hand_press());
        this.window.document.addEventListener('fullscreenchange', () => this.update_fullscreen_buttons());
        this.render();
    }

    create_local_players(player_count) {
        const characters = get_character_list();
        const players = [];
        for (let player_index = 0; player_index < player_count; player_index += 1) {
            players.push({
                name: `Player ${player_index + 1}`,
                character_id: characters[player_index % characters.length].id,
            });
        }
        return players;
    }

    handle_click(event) {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest("button[data-action]");
        if (button === null) return;
        if (this.suppress_hand_click && button.classList.contains('hand-card')) {
            this.suppress_hand_click = false;
            event.preventDefault();
            return;
        }

        const action = button.dataset.action;
        if (typeof action !== "string") {
            throw new Error("Action button is missing data-action.");
        }

        switch (action) {
            case 'toggle-hand':
                this.view_state.hand_pinned = !this.view_state.hand_pinned;
                this.hand_hover_suppressed = !this.view_state.hand_pinned;
                this.update_hand_drawer();
                return;
            case 'inspect-card':
                this.inspect_card(button);
                return;
            case 'show-skills':
                this.clear_automatic_timer();
                this.view_state.skills_player_id = this.require_dataset_string(button, 'playerId');
                this.focus_return_selector = `[data-action="show-skills"][data-player-id="${button.dataset.playerId}"]`;
                this.render();
                return;
            case 'close-inspection':
                this.view_state.inspected_card = null;
                this.view_state.skills_player_id = null;
                this.render();
                this.restore_focus();
                return;
            case 'open-game-menu':
                this.clear_automatic_timer();
                this.focus_return_selector = '[data-action="open-game-menu"]';
                this.view_state.pause_menu = true;
                this.view_state.confirm_quit = false;
                this.render();
                return;
            case 'resume-game':
                this.view_state.pause_menu = false;
                this.view_state.confirm_quit = false;
                this.render();
                this.restore_focus();
                return;
            case 'request-quit':
                this.view_state.confirm_quit = true;
                this.render();
                return;
            case 'confirm-quit':
                this.return_to_main_menu();
                return;
            case 'toggle-fullscreen':
                this.toggle_fullscreen();
                return;
            case "open-single-player":
                this.view_state.menu_screen = MENU_SCREENS.SINGLE_PLAYER_SETUP;
                this.render();
                return;
            case "open-local-multiplayer":
                this.view_state.menu_screen = MENU_SCREENS.LOCAL_MULTIPLAYER_SETUP;
                this.render();
                return;
            case "open-how-to-play":
                this.view_state.menu_screen = MENU_SCREENS.HOW_TO_PLAY;
                this.render();
                return;
            case "back-to-main":
            case "return-to-main":
            case "new-match":
                this.return_to_main_menu();
                return;
            case "select-single-character":
                this.sync_single_setup_inputs();
                this.view_state.single_player_character_id = this.require_dataset_string(button, "characterId");
                this.render();
                return;
            case "start-single-player":
                this.start_single_player();
                return;
            case "start-local-multiplayer":
                this.start_local_multiplayer();
                return;
            case "roll-initiative":
                this.roll_human_initiative(button);
                return;
            case "reveal-turn":
                this.reveal_turn(button);
                return;
            case "select-card":
                this.select_card(button);
                return;
            case "choose-conversion":
                this.choose_conversion(button);
                return;
            case "choose-no-conversion":
                this.choose_no_conversion();
                return;
            case "choose-card-target":
                this.choose_card_target(button);
                return;
            case "cancel-interaction":
                this.view_state.interaction = null;
                this.render();
                return;
            case "end-turn":
                this.end_turn(button);
                return;
            case "reveal-private-decision":
                this.reveal_private_decision(button);
                return;
            case "resolve-discard":
                this.resolve_discard(button);
                return;
            case "resolve-reclaim":
                this.resolve_reclaim(button);
                return;
            case "resolve-love-hate":
                this.resolve_love_hate(button);
                return;
            case "resolve-screen-burn":
                this.resolve_screen_burn(button);
                return;
            case "skip-screen-burn":
                this.skip_screen_burn(button);
                return;
            case "resolve-raid":
                this.resolve_raid(button);
                return;
            case "reload-page":
                this.window.location.reload();
                return;
            default:
                throw new Error(`Unhandled UI action: ${action}`);
        }
    }

    handle_change(event) {
        if (!(event.target instanceof Element)) return;

        if (event.target.matches("[data-local-player-count]")) {
            if (!(event.target instanceof HTMLSelectElement)) {
                throw new Error("Local player count control must be a select.");
            }
            this.sync_local_setup_inputs();
            const player_count = Number(event.target.value);
            this.resize_local_players(player_count);
            this.view_state.local_player_count = player_count;
            this.render();
            return;
        }

        if (event.target.matches("[data-single-player-count]")) {
            if (!(event.target instanceof HTMLSelectElement)) {
                throw new Error("Single player count control must be a select.");
            }
            this.sync_single_setup_inputs();
            this.render();
            return;
        }

        if (event.target.matches("[data-single-character]")) {
            if (!(event.target instanceof HTMLSelectElement)) {
                throw new Error("Single character control must be a select.");
            }
            this.sync_single_setup_inputs();
            this.render();
        }
    }

    resize_local_players(player_count) {
        const characters = get_character_list();
        while (this.view_state.local_players.length < player_count) {
            const player_index = this.view_state.local_players.length;
            this.view_state.local_players.push({
                name: `Player ${player_index + 1}`,
                character_id: characters[player_index % characters.length].id,
            });
        }
        if (this.view_state.local_players.length > player_count) {
            this.view_state.local_players.splice(player_count);
        }
    }

    sync_single_setup_inputs() {
        const name_input = this.app_element.querySelector("[data-single-name]");
        const character_select = this.app_element.querySelector("[data-single-character]");
        const count_select = this.app_element.querySelector("[data-single-player-count]");

        if (!(name_input instanceof HTMLInputElement)) throw new Error("Single player name input is missing.");
        if (!(character_select instanceof HTMLSelectElement)) throw new Error("Single player character select is missing.");
        if (!(count_select instanceof HTMLSelectElement)) throw new Error("Single player count select is missing.");

        this.view_state.single_player_name = name_input.value;
        this.view_state.single_player_character_id = character_select.value;
        this.view_state.single_player_count = Number(count_select.value);
    }

    sync_local_setup_inputs() {
        for (let player_index = 0; player_index < this.view_state.local_players.length; player_index += 1) {
            const name_input = this.app_element.querySelector(`[data-local-name="${player_index}"]`);
            const character_select = this.app_element.querySelector(`[data-local-character="${player_index}"]`);
            if (!(name_input instanceof HTMLInputElement) || !(character_select instanceof HTMLSelectElement)) {
                continue;
            }
            this.view_state.local_players[player_index] = {
                name: name_input.value,
                character_id: character_select.value,
            };
        }
    }

    start_single_player() {
        this.sync_single_setup_inputs();
        if (this.view_state.single_player_name.trim().length === 0) {
            this.view_state.setup_error = "Player name is required.";
            this.render();
            return;
        }

        const characters = get_character_list();
        const configurations = [{
            name: this.view_state.single_player_name.trim(),
            character_id: this.view_state.single_player_character_id,
            player_type: PLAYER_TYPES.HUMAN,
        }];

        const computer_characters = characters.filter(
            (character) => character.id !== this.view_state.single_player_character_id
        );
        if (computer_characters.length === 0) {
            throw new Error("No computer character deck is available.");
        }

        for (let computer_index = 0; computer_index < this.view_state.single_player_count - 1; computer_index += 1) {
            const character = computer_characters[computer_index % computer_characters.length];
            configurations.push({
                name: `CPU ${computer_index + 1}`,
                character_id: character.id,
                player_type: PLAYER_TYPES.COMPUTER,
            });
        }

        this.begin_match(configurations, GAME_MODES.SINGLE_PLAYER);
    }

    start_local_multiplayer() {
        this.sync_local_setup_inputs();

        for (let player_index = 0; player_index < this.view_state.local_players.length; player_index += 1) {
            if (this.view_state.local_players[player_index].name.trim().length === 0) {
                this.view_state.setup_error = `Player ${player_index + 1} requires a name.`;
                this.render();
                return;
            }
        }

        const configurations = this.view_state.local_players.map((player) => ({
            name: player.name.trim(),
            character_id: player.character_id,
            player_type: PLAYER_TYPES.HUMAN,
        }));

        this.begin_match(configurations, GAME_MODES.LOCAL_MULTIPLAYER);
    }

    begin_match(configurations, game_mode) {
        this.clear_automatic_timer();
        this.view_state.setup_error = null;
        this.view_state.interaction = null;
        this.view_state.private_decision_revealed = false;
        this.view_state.decision_error = null;
        this.turn_handler.start_match(configurations, game_mode);
        this.render();
    }

    roll_human_initiative(button) {
        const player_id = this.require_dataset_string(button, "playerId");
        this.turn_handler.roll_initiative(player_id);
        this.render();
    }

    reveal_turn(button) {
        const player_id = this.require_dataset_string(button, "playerId");
        this.turn_handler.reveal_active_turn(player_id);
        this.after_mutation();
    }

    inspect_card(button) {
        this.cancel_hand_press();
        this.clear_automatic_timer();
        this.focus_return_selector = button.hasAttribute('data-card-instance-id')
            ? `.hand-card[data-card-instance-id="${button.dataset.cardInstanceId}"]`
            : `[data-action="inspect-card"][data-card-definition-id="${button.dataset.cardDefinitionId}"]`;
        this.view_state.inspected_card = {
            definition_id: this.require_dataset_string(button, 'cardDefinitionId'),
            instance_id: button.hasAttribute('data-card-instance-id') ? button.dataset.cardInstanceId : null,
        };
        this.render();
    }

    handle_card_context_menu(event) {
        if (!(event.target instanceof Element)) return;
        const card = event.target.closest('.hand-card');
        if (card === null || this.app_element.querySelector('.modal-overlay') !== null) return;
        event.preventDefault();
        this.suppress_hand_click = true;
        this.inspect_card(card);
    }

    begin_hand_press(event) {
        this.cancel_hand_press();
        this.suppress_hand_click = false;
        if (event.pointerType !== 'touch' || !(event.target instanceof Element)) return;
        const card = event.target.closest('.hand-card');
        if (card === null || this.app_element.querySelector('.modal-overlay') !== null) return;
        this.hand_press = {
            x: event.clientX, y: event.clientY,
            timer: this.window.setTimeout(() => {
                this.suppress_hand_click = true;
                this.inspect_card(card);
            }, 550),
        };
    }

    move_hand_press(event) {
        if (this.hand_press !== null && Math.hypot(event.clientX - this.hand_press.x, event.clientY - this.hand_press.y) > 10) {
            this.cancel_hand_press();
        }
    }

    cancel_hand_press() {
        if (this.hand_press === null) return;
        this.window.clearTimeout(this.hand_press.timer);
        this.hand_press = null;
    }

    select_card(button) {
        this.view_state.inspected_card = null;
        const player = this.game_state.get_active_player();
        if (player.player_type !== PLAYER_TYPES.HUMAN) {
            throw new Error("Human input cannot select a computer player's card.");
        }

        const card_instance_id = this.require_dataset_string(button, "cardInstanceId");
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

    choose_conversion(button) {
        const interaction = this.require_interaction_type("symbol_conversion");
        const option_index = Number(button.dataset.optionIndex);
        if (!Number.isInteger(option_index) || option_index < 0 || option_index >= interaction.options.length) {
            throw new Error("Invalid symbol conversion option.");
        }
        this.continue_card_selection(
            interaction.player_id,
            interaction.card_instance_id,
            interaction.options[option_index]
        );
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

    choose_card_target(button) {
        const interaction = this.require_interaction_type("card_target");
        const target_index = Number(button.dataset.targetIndex);
        if (!Number.isInteger(target_index) || target_index < 0 || target_index >= interaction.targets.length) {
            throw new Error("Invalid card target.");
        }

        this.view_state.interaction = null;
        this.rules_engine.play_card(
            interaction.player_id,
            interaction.card_instance_id,
            interaction.targets[target_index],
            interaction.symbol_conversion
        );
        this.after_mutation();
    }


    end_turn(button) {
        this.turn_handler.end_turn(this.require_dataset_string(button, "playerId"));
        this.after_mutation();
    }

    reveal_private_decision(button) {
        const decision = this.game_state.get_current_decision();
        if (decision === null || decision.id !== this.require_dataset_string(button, "decisionId")) {
            throw new Error("Private decision is no longer current.");
        }
        this.view_state.private_decision_revealed = true;
        this.view_state.decision_error = null;
        this.render();
    }

    resolve_discard(button) {
        const required_count = Number(button.dataset.requiredCount);
        const selected_inputs = this.app_element.querySelectorAll("input[data-discard-card]:checked");
        const card_instance_ids = Array.from(selected_inputs).map((input) => {
            if (!(input instanceof HTMLInputElement)) throw new Error("Discard choice must be an input.");
            return this.require_dataset_string(input, "discardCard");
        });

        if (card_instance_ids.length !== required_count) {
            this.view_state.decision_error = `Select exactly ${required_count} card(s).`;
            this.render();
            return;
        }

        this.rules_engine.resolve_decision(
            this.require_dataset_string(button, "decisionId"),
            this.require_dataset_string(button, "playerId"),
            { card_instance_ids }
        );
        this.after_decision();
    }

    resolve_reclaim(button) {
        this.rules_engine.resolve_decision(
            this.require_dataset_string(button, "decisionId"),
            this.require_dataset_string(button, "playerId"),
            { card_instance_id: this.require_dataset_string(button, "cardInstanceId") }
        );
        this.after_decision();
    }

    resolve_love_hate(button) {
        this.rules_engine.resolve_decision(
            this.require_dataset_string(button, "decisionId"),
            this.require_dataset_string(button, "playerId"),
            { choice: this.require_dataset_string(button, "choice") }
        );
        this.after_decision();
    }

    resolve_screen_burn(button) {
        this.rules_engine.resolve_decision(
            this.require_dataset_string(button, "decisionId"),
            this.require_dataset_string(button, "playerId"),
            { target_player_id: this.require_dataset_string(button, "targetPlayerId") }
        );
        this.after_decision();
    }

    skip_screen_burn(button) {
        this.rules_engine.resolve_decision(
            this.require_dataset_string(button, "decisionId"),
            this.require_dataset_string(button, "playerId"),
            { skip: true }
        );
        this.after_decision();
    }

    resolve_raid(button) {
        const action = this.require_dataset_string(button, "raidAction");
        const resolution = { action };
        if (action === "attack") {
            resolution.target_player_id = this.require_dataset_string(button, "targetPlayerId");
        }
        this.rules_engine.resolve_decision(
            this.require_dataset_string(button, "decisionId"),
            this.require_dataset_string(button, "playerId"),
            resolution
        );
        this.after_decision();
    }

    after_decision() {
        this.view_state.private_decision_revealed = false;
        this.view_state.decision_error = null;
        this.after_mutation();
    }

    after_mutation() {
        this.view_state.interaction = null;

        if (this.game_state.phase === PHASES.PLAY) {
            const active_player = this.game_state.get_active_player();
            if (active_player.eliminated && this.game_state.get_current_decision() === null) {
                this.turn_handler.finish_active_turn();
            } else {
                this.turn_handler.end_skipped_turn_if_ready();
            }
        }

        this.render();
    }

    schedule_automatic_flow() {
        if (this.view_state.pause_menu || this.view_state.inspected_card !== null || this.view_state.skills_player_id !== null) return;
        if (this.automatic_action_timer !== null) return;

        if (this.game_state.phase === PHASES.INITIATIVE) {
            const next_player = this.game_state.get_next_initiative_player();
            if (next_player !== null && next_player.player_type === PLAYER_TYPES.COMPUTER) {
                this.automatic_action_timer = this.window.setTimeout(() => {
                    this.automatic_action_timer = null;
                    this.turn_handler.roll_initiative(next_player.id);
                    this.render();
                }, AI_INITIATIVE_DELAY_MS);
            }
            return;
        }

        if (this.game_state.phase !== PHASES.PLAY) return;

        const decision = this.game_state.get_current_decision();
        if (decision !== null) {
            const decision_player = this.game_state.get_player_by_id(decision.player_id);
            if (decision_player.player_type === PLAYER_TYPES.COMPUTER) {
                this.automatic_action_timer = this.window.setTimeout(() => {
                    this.automatic_action_timer = null;
                    this.ai_player_handler.take_next_action();
                    this.after_mutation();
                }, AI_ACTION_DELAY_MS);
            }
            return;
        }

        const active_player = this.game_state.get_active_player();
        if (active_player.player_type === PLAYER_TYPES.COMPUTER) {
            this.automatic_action_timer = this.window.setTimeout(() => {
                this.automatic_action_timer = null;
                this.ai_player_handler.take_next_action();
                this.after_mutation();
            }, AI_ACTION_DELAY_MS);
        }
    }

    return_to_main_menu() {
        this.cancel_hand_press();
        this.clear_automatic_timer();
        this.game_state.reset_to_setup();
        this.view_state.menu_screen = MENU_SCREENS.MAIN;
        this.view_state.setup_error = null;
        this.view_state.interaction = null;
        this.view_state.private_decision_revealed = false;
        this.view_state.decision_error = null;
        this.view_state.pause_menu = false;
        this.view_state.confirm_quit = false;
        this.view_state.inspected_card = null;
        this.view_state.skills_player_id = null;
        this.view_state.hand_pinned = false;
        this.render();
    }

    clear_automatic_timer() {
        if (this.automatic_action_timer !== null) {
            this.window.clearTimeout(this.automatic_action_timer);
            this.automatic_action_timer = null;
        }
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
        // A handoff is a pending turn-start, never a privacy gate in a CPU match.
        if (this.game_state.phase === PHASES.HANDOFF && !this.game_state.is_hotseat()) {
            this.turn_handler.reveal_active_turn(this.game_state.get_active_player().id);
        }
        const same_turn = this.game_state.phase === PHASES.PLAY && this.rendered_turn_number === this.game_state.turn_number;
        const single_player = this.game_state.players.length > 0 && !this.game_state.is_hotseat();
        const scroll_positions = (same_turn || (single_player && this.game_state.phase === PHASES.PLAY)) ? ['.game-table', '.opponent-rail', '.hand-fan'].map(selector => {
            const node = this.app_element.querySelector(selector);
            return {selector, x: node?.scrollLeft ?? 0, y: node?.scrollTop ?? 0};
        }) : [];
        if (this.game_state.phase !== PHASES.PLAY) {
            this.view_state.hand_pinned = false;
        } else if (single_player && !same_turn) {
            // A new turn must not pin the drawer over the board. Only the player pins it.
            this.view_state.hand_pinned = false;
            this.hand_hover_suppressed = this.game_state.get_active_player().player_type === PLAYER_TYPES.COMPUTER;
        }
        this.hand_hovered = false;
        this.ui_handler.render(this.game_state, this.rules_engine, this.turn_handler, this.view_state);
        this.rendered_turn_number = this.game_state.phase === PHASES.PLAY ? this.game_state.turn_number : null;
        for (const position of scroll_positions) {
            const node = this.app_element.querySelector(position.selector);
            if (node !== null) node.scrollTo(position.x, position.y);
        }
        this.update_fullscreen_buttons();
        const overlays = this.app_element.querySelectorAll('.modal-overlay');
        if (overlays.length > 0) {
            const first_control = overlays[overlays.length - 1].querySelector('button:not(:disabled), input, summary');
            if (first_control !== null) first_control.focus({preventScroll: true});
        }
        this.schedule_automatic_flow();
    }

    update_hand_drawer() {
        const dock = this.app_element.querySelector('.hand-dock');
        if (dock === null) return;
        const open = this.view_state.hand_pinned || (this.hand_hovered && !this.hand_hover_suppressed);
        dock.classList.toggle('hand-open', open);
        dock.querySelector('#hand-panel').inert = !open;
        dock.querySelector('[data-action="toggle-hand"]').setAttribute('aria-expanded', String(open));
        dock.querySelector('[data-hand-hint]').textContent = this.view_state.hand_pinned
            ? 'Close'
            : open ? 'Click to keep open' : 'Hover or tap to open';
    }

    handle_pointer_over(event) {
        if (!(event.target instanceof Element) || event.pointerType === 'touch') return;
        if (this.app_element.querySelector('.modal-overlay') !== null) return;
        const dock = event.target.closest('.hand-dock');
        if (dock !== null) {
            this.hand_hovered = true;
            this.update_hand_drawer();
        }
        const card = event.target.closest('[data-action="inspect-card"]');
        if (card === null || card.contains(event.relatedTarget) || this.app_element.querySelector('.modal-overlay') !== null) return;
        // Hand cards use their original in-place lift, not a second floating card.
        if (card.classList.contains('hand-card')) return;
        const definition = get_card_definition(card.dataset.cardDefinitionId);
        const preview = this.app_element.querySelector('#card-hover-preview');
        preview.innerHTML = `<div class="game-card inspection-face ${this.ui_handler.card_renderer.get_theme_class(definition.character_id)} ${this.ui_handler.card_renderer.get_type_class(definition.type)}">${this.ui_handler.card_renderer.render_card_face(definition)}</div>`;
        preview.hidden = false;
        preview.style.transform = '';
        const bounds = card.getBoundingClientRect();
        const scale = Math.min(1, (this.window.innerHeight - 16) / preview.offsetHeight);
        preview.style.transform = `scale(${scale})`;
        const preview_width = preview.offsetWidth * scale;
        const preview_height = preview.offsetHeight * scale;
        let left = bounds.right + 12;
        if (left + preview_width > this.window.innerWidth - 8) left = bounds.left - preview_width - 12;
        left = Math.max(8, Math.min(left, this.window.innerWidth - preview_width - 8));
        const top = Math.max(8, Math.min(bounds.top, this.window.innerHeight - preview_height - 8));
        preview.style.left = `${left}px`;
        preview.style.top = `${top}px`;
    }

    handle_pointer_out(event) {
        if (!(event.target instanceof Element)) return;
        const dock = event.target.closest('.hand-dock');
        if (dock !== null && !dock.contains(event.relatedTarget)) {
            this.hand_hovered = false;
            this.hand_hover_suppressed = false;
            this.update_hand_drawer();
        }
        const card = event.target.closest('[data-action="inspect-card"]');
        if (card !== null && !card.contains(event.relatedTarget)) {
            const preview = this.app_element.querySelector('#card-hover-preview');
            if (preview !== null) preview.hidden = true;
        }
    }

    handle_keydown(event) {
        if (event.key.toLowerCase() === 'i' && event.target instanceof Element) {
            const card = event.target.closest('.hand-card');
            if (card !== null && this.app_element.querySelector('.modal-overlay') === null) {
                event.preventDefault();
                this.inspect_card(card);
                return;
            }
        }
        if (event.key === 'Escape') {
            if (this.view_state.pause_menu) {
                this.view_state.pause_menu = false;
                this.view_state.confirm_quit = false;
            } else if (this.view_state.inspected_card !== null || this.view_state.skills_player_id !== null) {
                this.view_state.inspected_card = null;
                this.view_state.skills_player_id = null;
            } else if (this.view_state.interaction !== null) {
                this.view_state.interaction = null;
            } else {
                this.view_state.hand_pinned = false;
                this.hand_hover_suppressed = true;
            }
            this.render();
            this.restore_focus();
        }
        if (event.key !== 'Tab') return;
        const overlays = this.app_element.querySelectorAll('.modal-overlay');
        if (overlays.length === 0) return;
        const controls = Array.from(overlays[overlays.length - 1].querySelectorAll('button:not(:disabled), input, summary')).filter(control => control.getClientRects().length > 0);
        if (controls.length === 0) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && this.window.document.activeElement === first) {event.preventDefault(); last.focus();}
        if (!event.shiftKey && this.window.document.activeElement === last) {event.preventDefault(); first.focus();}
    }

    restore_focus() {
        if (this.focus_return_selector === null) return;
        const control = this.app_element.querySelector(this.focus_return_selector);
        if (control !== null && !control.closest('[inert]')) control.focus({preventScroll: true});
        this.focus_return_selector = null;
    }

    async toggle_fullscreen() {
        const document_reference = this.window.document;
        if (!document_reference.fullscreenEnabled) return;
        try {
            if (document_reference.fullscreenElement === null) await document_reference.documentElement.requestFullscreen();
            else await document_reference.exitFullscreen();
        } catch (error) {
            const button = this.app_element.querySelector('[data-action="toggle-fullscreen"]');
            button.textContent = `Full screen unavailable: ${error.message}`;
        }
    }

    update_fullscreen_buttons() {
        for (const button of this.app_element.querySelectorAll('[data-action="toggle-fullscreen"]')) {
            button.disabled = !this.window.document.fullscreenEnabled;
            button.textContent = this.window.document.fullscreenEnabled ? (this.window.document.fullscreenElement === null ? 'Full screen' : 'Exit full screen') : 'Full screen unsupported';
        }
    }
}
