import test from "node:test";
import assert from "node:assert/strict";

import {
    CHARACTER_IDS,
    DECISION_TYPES,
    EFFECT_IDS,
    PHASES,
    STARTING_HP,
} from "../src/Constants.js";
import { get_card_definitions_for_character } from "../src/CardData.js";
import { DeckHandler } from "../src/DeckHandler.js";
import { DiceHandler } from "../src/DiceHandler.js";
import { GameState } from "../src/GameState.js";
import { RulesEngine } from "../src/RulesEngine.js";
import { TurnHandler } from "../src/TurnHandler.js";

function fixed_random(value) {
    return () => value;
}

function create_game(player_configurations, random_value = 0.2) {
    const deck_handler = new DeckHandler(fixed_random(random_value));
    const dice_handler = new DiceHandler(fixed_random(random_value));
    const game_state = new GameState(deck_handler);
    const rules_engine = new RulesEngine(game_state, dice_handler);
    const turn_handler = new TurnHandler(game_state, rules_engine);
    turn_handler.start_match(player_configurations);
    return { deck_handler, game_state, rules_engine, turn_handler };
}

function move_definition_to_hand(player, definition_id) {
    const existing_hand_card = player.hand.find((card) => card.definition_id === definition_id);
    if (existing_hand_card !== undefined) {
        return existing_hand_card;
    }

    const deck_index = player.deck.findIndex((card) => card.definition_id === definition_id);
    assert.notEqual(deck_index, -1, `${definition_id} must exist in deck`);
    const moved_cards = player.deck.splice(deck_index, 1);
    const card = moved_cards[0];
    player.hand.push(card);
    return card;
}

function player_target(player_id) {
    return { type: "player", player_id };
}

test("every completed character deck totals exactly 28 cards", () => {
    for (const character_id of Object.values(CHARACTER_IDS)) {
        const definitions = get_card_definitions_for_character(character_id);
        const card_count = definitions.reduce((total, definition) => total + definition.copies, 0);
        assert.equal(card_count, 28, character_id);
    }
});

test("match setup gives every player 12 HP and a three-card opening hand", () => {
    const { game_state } = create_game([
        { name: "Grandpa", character_id: CHARACTER_IDS.GRANDPA },
        { name: "Malric", character_id: CHARACTER_IDS.MALRIC },
    ]);

    assert.equal(game_state.phase, PHASES.HANDOFF);
    for (const player of game_state.players) {
        assert.equal(player.hp, STARTING_HP);
        assert.equal(player.hand.length, 3);
        assert.equal(player.deck.length, 25);
    }
});

test("defense absorbs attack damage before HP and breaks cleanly", () => {
    const { game_state, rules_engine, turn_handler } = create_game([
        { name: "Malric", character_id: CHARACTER_IDS.MALRIC },
        { name: "Grandpa", character_id: CHARACTER_IDS.GRANDPA },
    ]);

    const malric = game_state.players[0];
    const grandpa = game_state.players[1];
    turn_handler.reveal_active_turn(malric.id);

    const defense = move_definition_to_hand(malric, "malric_defensive_stance");
    rules_engine.play_card(malric.id, defense.instance_id, null, null);
    assert.equal(malric.defenses.length, 1);
    assert.equal(malric.defenses[0].current_shields, 3);
    turn_handler.end_turn(malric.id);

    turn_handler.reveal_active_turn(grandpa.id);
    const attack = move_definition_to_hand(grandpa, "grandpa_dot_matrix_missile");
    rules_engine.play_card(grandpa.id, attack.instance_id, player_target(malric.id), null);

    assert.equal(malric.hp, STARTING_HP);
    assert.equal(malric.defenses.length, 0);
});

test("Developer's Favorite prevents Patchadin's first elimination only", () => {
    const { game_state, rules_engine } = create_game([
        { name: "Patchadin", character_id: CHARACTER_IDS.PATCHADIN },
        { name: "Grandpa", character_id: CHARACTER_IDS.GRANDPA },
    ]);

    const patchadin = game_state.players[0];
    const attacker = game_state.players[1];

    rules_engine.apply_damage_to_player(patchadin.id, 20, attacker.id, {
        is_attack: true,
        is_dice_attack: false,
        source_name: "Test hit",
    });
    assert.equal(patchadin.hp, 6);
    assert.equal(patchadin.developers_favorite_used, true);
    assert.equal(patchadin.eliminated, false);

    rules_engine.apply_damage_to_player(patchadin.id, 20, attacker.id, {
        is_attack: true,
        is_dice_attack: false,
        source_name: "Second test hit",
    });
    assert.equal(patchadin.eliminated, true);
});

test("Second Wind triggers once when Malric reaches four HP or less", () => {
    const { game_state, rules_engine } = create_game([
        { name: "Malric", character_id: CHARACTER_IDS.MALRIC },
        { name: "Grandpa", character_id: CHARACTER_IDS.GRANDPA },
    ]);

    const malric = game_state.players[0];
    const attacker = game_state.players[1];
    const hand_before = malric.hand.length;

    rules_engine.apply_damage_to_player(malric.id, 8, attacker.id, {
        is_attack: true,
        is_dice_attack: false,
        source_name: "Test hit",
    });

    assert.equal(malric.hp, 10);
    assert.equal(malric.second_wind_used, true);
    assert.equal(malric.hand.length, hand_before + 2);
});

test("Play Again creates mandatory actions", () => {
    const { game_state, rules_engine, turn_handler } = create_game([
        { name: "Grandpa", character_id: CHARACTER_IDS.GRANDPA },
        { name: "Malric", character_id: CHARACTER_IDS.MALRIC },
    ]);

    const grandpa = game_state.players[0];
    turn_handler.reveal_active_turn(grandpa.id);
    const refresh_rate = move_definition_to_hand(grandpa, "grandpa_refresh_rate");
    rules_engine.play_card(grandpa.id, refresh_rate.instance_id, null, null);

    assert.equal(game_state.actions_remaining, 2);
    assert.equal(turn_handler.can_end_turn(), false);
});

test("failed Boring Story save creates an explicit discard decision", () => {
    const { game_state, rules_engine, turn_handler } = create_game([
        { name: "Grandpa", character_id: CHARACTER_IDS.GRANDPA },
        { name: "Malric", character_id: CHARACTER_IDS.MALRIC },
    ], 0);

    const grandpa = game_state.players[0];
    const malric = game_state.players[1];
    turn_handler.reveal_active_turn(grandpa.id);
    const boring_story = move_definition_to_hand(grandpa, "grandpa_boring_story");
    rules_engine.play_card(grandpa.id, boring_story.instance_id, player_target(malric.id), null);

    const decision = game_state.get_current_decision();
    assert.notEqual(decision, null);
    assert.equal(decision.type, DECISION_TYPES.DISCARD_CARDS);
    assert.equal(decision.player_id, malric.id);
    assert.equal(decision.count, 2);

    const selected_ids = malric.hand.slice(0, 2).map((card) => card.instance_id);
    const discard_before = malric.discard.length;
    rules_engine.resolve_decision(decision.id, malric.id, { card_instance_ids: selected_ids });
    assert.equal(malric.discard.length, discard_before + 2);
});

test("Patchadin can convert a Healing symbol into Defense once per turn", () => {
    const { game_state, rules_engine, turn_handler } = create_game([
        { name: "Patchadin", character_id: CHARACTER_IDS.PATCHADIN },
        { name: "Grandpa", character_id: CHARACTER_IDS.GRANDPA },
    ]);

    const patchadin = game_state.players[0];
    patchadin.hp = 5;
    turn_handler.reveal_active_turn(patchadin.id);
    const flash = move_definition_to_hand(patchadin, "patchadin_flash_of_light");
    rules_engine.play_card(patchadin.id, flash.instance_id, null, { from: "healing", to: "defense" });

    assert.equal(patchadin.hp, 7);
    assert.equal(patchadin.defenses.length, 1);
    assert.equal(patchadin.defenses[0].current_shields, 1);
    assert.equal(patchadin.can_do_everything_used_this_turn, true);
});

test("Screen Saver returns to hand when its shield breaks", () => {
    const { game_state, rules_engine } = create_game([
        { name: "Grandpa", character_id: CHARACTER_IDS.GRANDPA },
        { name: "Malric", character_id: CHARACTER_IDS.MALRIC },
    ]);

    const grandpa = game_state.players[0];
    const attacker = game_state.players[1];
    const screen_saver = move_definition_to_hand(grandpa, "grandpa_screen_saver");
    const hand_index = grandpa.hand.findIndex((card) => card.instance_id === screen_saver.instance_id);
    grandpa.hand.splice(hand_index, 1);
    grandpa.defenses.push({
        card: screen_saver,
        effect_id: EFFECT_IDS.SCREEN_SAVER,
        name: "Screen Saver",
        current_shields: 4,
        max_shields: 4,
        played_turn_number: 1,
    });

    rules_engine.apply_damage_to_player(grandpa.id, 4, attacker.id, {
        is_attack: true,
        is_dice_attack: false,
        source_name: "Test hit",
    });

    assert.equal(grandpa.defenses.length, 0);
    assert.equal(grandpa.hand.some((card) => card.instance_id === screen_saver.instance_id), true);
    assert.equal(grandpa.discard.some((card) => card.instance_id === screen_saver.instance_id), false);
});

test("deck exhaustion fails visibly because no reshuffle rule exists", () => {
    const deck_handler = new DeckHandler(fixed_random(0.5));
    const player = { name: "Tester", deck: [], hand: [] };
    assert.throws(
        () => deck_handler.draw_cards(player, 1),
        /draw pile is empty and the project rules do not define a reshuffle rule/
    );
});
