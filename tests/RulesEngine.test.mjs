import test from "node:test";
import assert from "node:assert/strict";

import {
    CHARACTER_IDS,
    DECISION_TYPES,
    EFFECT_IDS,
    GAME_MODES,
    PHASES,
    PLAYER_TYPES,
    STARTING_HP,
} from "../src/Constants.js";
import { get_card_definitions_for_character } from "../src/CardData.js";
import { AIPlayerHandler } from "../src/AIPlayerHandler.js";
import { DeckHandler } from "../src/DeckHandler.js";
import { DiceHandler } from "../src/DiceHandler.js";
import { GameState } from "../src/GameState.js";
import { RulesEngine } from "../src/RulesEngine.js";
import { TurnHandler } from "../src/TurnHandler.js";

function fixed_random(value) {
    return () => value;
}

function sequence_random(values) {
    let value_index = 0;
    return () => {
        if (value_index >= values.length) {
            return values[values.length - 1];
        }
        const value = values[value_index];
        value_index += 1;
        return value;
    };
}

function human(name, character_id) {
    return {
        name,
        character_id,
        player_type: PLAYER_TYPES.HUMAN,
    };
}

function computer(name, character_id) {
    return {
        name,
        character_id,
        player_type: PLAYER_TYPES.COMPUTER,
    };
}

function create_game(player_configurations, dice_values = [0.95, 0.1]) {
    const deck_handler = new DeckHandler(fixed_random(0.2));
    const dice_handler = new DiceHandler(sequence_random(dice_values));
    const game_state = new GameState(deck_handler);
    const rules_engine = new RulesEngine(game_state, dice_handler);
    const turn_handler = new TurnHandler(game_state, rules_engine);
    turn_handler.start_match(player_configurations, GAME_MODES.LOCAL_MULTIPLAYER);
    return { deck_handler, game_state, rules_engine, turn_handler };
}

function complete_two_player_initiative(game) {
    const first = game.game_state.get_next_initiative_player();
    game.turn_handler.roll_initiative(first.id);
    const second = game.game_state.get_next_initiative_player();
    game.turn_handler.roll_initiative(second.id);
    assert.equal(game.game_state.phase, PHASES.HANDOFF);
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
    const game = create_game([
        human("Grandpa", CHARACTER_IDS.GRANDPA),
        human("Malric", CHARACTER_IDS.MALRIC),
    ]);

    assert.equal(game.game_state.phase, PHASES.INITIATIVE);
    for (const player of game.game_state.players) {
        assert.equal(player.hp, STARTING_HP);
        assert.equal(player.hand.length, 3);
        assert.equal(player.deck.length, 25);
    }
});

test("initiative winner becomes first while clockwise order is preserved", () => {
    const game = create_game([
        human("Grandpa", CHARACTER_IDS.GRANDPA),
        human("Malric", CHARACTER_IDS.MALRIC),
    ], [0.1, 0.95]);

    const first = game.game_state.get_next_initiative_player();
    game.turn_handler.roll_initiative(first.id);
    const second = game.game_state.get_next_initiative_player();
    game.turn_handler.roll_initiative(second.id);

    assert.equal(game.game_state.phase, PHASES.HANDOFF);
    assert.equal(game.game_state.players[0].name, "Malric");
    assert.equal(game.game_state.players[1].name, "Grandpa");
});

test("highest initiative tie causes only tied players to reroll", () => {
    const game = create_game([
        human("Grandpa", CHARACTER_IDS.GRANDPA),
        human("Malric", CHARACTER_IDS.MALRIC),
    ], [0.5, 0.5, 0.8, 0.2]);

    game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);
    game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);

    assert.equal(game.game_state.phase, PHASES.INITIATIVE);
    assert.equal(game.game_state.initiative_round, 2);
    assert.equal(game.game_state.initiative_candidate_player_ids.length, 2);

    game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);
    game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);

    assert.equal(game.game_state.phase, PHASES.HANDOFF);
    assert.equal(game.game_state.players[0].name, "Grandpa");
});

test("defense absorbs attack damage before HP and breaks cleanly", () => {
    const game = create_game([
        human("Malric", CHARACTER_IDS.MALRIC),
        human("Grandpa", CHARACTER_IDS.GRANDPA),
    ]);
    complete_two_player_initiative(game);

    const malric = game.game_state.players[0];
    const grandpa = game.game_state.players[1];
    game.turn_handler.reveal_active_turn(malric.id);

    const defense = move_definition_to_hand(malric, "malric_defensive_stance");
    game.rules_engine.play_card(malric.id, defense.instance_id, null, null);
    assert.equal(malric.defenses.length, 1);
    game.turn_handler.end_turn(malric.id);

    game.turn_handler.reveal_active_turn(grandpa.id);
    const attack = move_definition_to_hand(grandpa, "grandpa_dot_matrix_missile");
    game.rules_engine.play_card(grandpa.id, attack.instance_id, player_target(malric.id), null);

    assert.equal(malric.hp, STARTING_HP);
    assert.equal(malric.defenses.length, 0);
});

test("played card definition is retained for table presentation", () => {
    const game = create_game([
        human("Grandpa", CHARACTER_IDS.GRANDPA),
        human("Malric", CHARACTER_IDS.MALRIC),
    ]);
    complete_two_player_initiative(game);
    const grandpa = game.game_state.get_active_player();
    game.turn_handler.reveal_active_turn(grandpa.id);

    const attack = move_definition_to_hand(grandpa, "grandpa_8_bit_blast");
    const malric = game.game_state.get_living_opponents(grandpa.id)[0];
    game.rules_engine.play_card(grandpa.id, attack.instance_id, player_target(malric.id), null);

    assert.equal(grandpa.last_played_card_definition_id, "grandpa_8_bit_blast");
});

test("Developer's Favorite prevents Patchadin's first elimination only", () => {
    const game = create_game([
        human("Patchadin", CHARACTER_IDS.PATCHADIN),
        human("Grandpa", CHARACTER_IDS.GRANDPA),
    ]);
    const patchadin = game.game_state.players[0];
    const attacker = game.game_state.players[1];

    game.rules_engine.apply_damage_to_player(patchadin.id, 20, attacker.id, {
        is_attack: true,
        is_dice_attack: false,
        source_name: "Test hit",
    });
    assert.equal(patchadin.hp, 6);
    assert.equal(patchadin.eliminated, false);

    game.rules_engine.apply_damage_to_player(patchadin.id, 20, attacker.id, {
        is_attack: true,
        is_dice_attack: false,
        source_name: "Second test hit",
    });
    assert.equal(patchadin.eliminated, true);
});

test("Second Wind triggers once when Malric reaches four HP or less", () => {
    const game = create_game([
        human("Malric", CHARACTER_IDS.MALRIC),
        human("Grandpa", CHARACTER_IDS.GRANDPA),
    ]);
    const malric = game.game_state.players[0];
    const attacker = game.game_state.players[1];
    const hand_before = malric.hand.length;

    game.rules_engine.apply_damage_to_player(malric.id, 8, attacker.id, {
        is_attack: true,
        is_dice_attack: false,
        source_name: "Test hit",
    });

    assert.equal(malric.hp, 10);
    assert.equal(malric.second_wind_used, true);
    assert.equal(malric.hand.length, hand_before + 2);
});

test("Play Again creates mandatory actions", () => {
    const game = create_game([
        human("Grandpa", CHARACTER_IDS.GRANDPA),
        human("Malric", CHARACTER_IDS.MALRIC),
    ]);
    complete_two_player_initiative(game);
    const grandpa = game.game_state.get_active_player();
    game.turn_handler.reveal_active_turn(grandpa.id);
    const refresh_rate = move_definition_to_hand(grandpa, "grandpa_refresh_rate");
    game.rules_engine.play_card(grandpa.id, refresh_rate.instance_id, null, null);

    assert.equal(game.game_state.actions_remaining, 2);
    assert.equal(game.turn_handler.can_end_turn(), false);
});

test("failed Boring Story save creates an explicit discard decision", () => {
    const game = create_game([
        human("Grandpa", CHARACTER_IDS.GRANDPA),
        human("Malric", CHARACTER_IDS.MALRIC),
    ], [0.95, 0.1, 0]);
    complete_two_player_initiative(game);

    const grandpa = game.game_state.get_active_player();
    const malric = game.game_state.get_living_opponents(grandpa.id)[0];
    game.turn_handler.reveal_active_turn(grandpa.id);
    const boring_story = move_definition_to_hand(grandpa, "grandpa_boring_story");
    game.rules_engine.play_card(grandpa.id, boring_story.instance_id, player_target(malric.id), null);

    const decision = game.game_state.get_current_decision();
    assert.notEqual(decision, null);
    assert.equal(decision.type, DECISION_TYPES.DISCARD_CARDS);
    assert.equal(decision.player_id, malric.id);

    const selected_ids = malric.hand.slice(0, decision.count).map((card) => card.instance_id);
    game.rules_engine.resolve_decision(decision.id, malric.id, { card_instance_ids: selected_ids });
    assert.equal(game.game_state.get_current_decision(), null);
});

test("Patchadin can convert a Healing symbol into Defense once per turn", () => {
    const game = create_game([
        human("Patchadin", CHARACTER_IDS.PATCHADIN),
        human("Grandpa", CHARACTER_IDS.GRANDPA),
    ]);
    complete_two_player_initiative(game);
    const patchadin = game.game_state.get_active_player();
    patchadin.hp = 5;
    game.turn_handler.reveal_active_turn(patchadin.id);
    const flash = move_definition_to_hand(patchadin, "patchadin_flash_of_light");
    game.rules_engine.play_card(patchadin.id, flash.instance_id, null, { from: "healing", to: "defense" });

    assert.equal(patchadin.hp, 7);
    assert.equal(patchadin.defenses.length, 1);
    assert.equal(patchadin.defenses[0].current_shields, 1);
});

test("Screen Saver returns to hand when its shield breaks", () => {
    const game = create_game([
        human("Grandpa", CHARACTER_IDS.GRANDPA),
        human("Malric", CHARACTER_IDS.MALRIC),
    ]);

    const grandpa = game.game_state.players[0];
    const attacker = game.game_state.players[1];
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

    game.rules_engine.apply_damage_to_player(grandpa.id, 4, attacker.id, {
        is_attack: true,
        is_dice_attack: false,
        source_name: "Test hit",
    });

    assert.equal(grandpa.defenses.length, 0);
    assert.equal(grandpa.hand.some((card) => card.instance_id === screen_saver.instance_id), true);
});

test("computer player completes a legal Malric turn", () => {
    const deck_handler = new DeckHandler(fixed_random(0.2));
    const dice_handler = new DiceHandler(sequence_random([0.95, 0.1]));
    const game_state = new GameState(deck_handler);
    const rules_engine = new RulesEngine(game_state, dice_handler);
    const turn_handler = new TurnHandler(game_state, rules_engine);
    const ai_handler = new AIPlayerHandler(game_state, rules_engine, turn_handler);

    turn_handler.start_match([
        computer("CPU", CHARACTER_IDS.MALRIC),
        human("Human", CHARACTER_IDS.GRANDPA),
    ], GAME_MODES.SINGLE_PLAYER);

    turn_handler.roll_initiative(game_state.get_next_initiative_player().id);
    turn_handler.roll_initiative(game_state.get_next_initiative_player().id);
    assert.equal(game_state.get_active_player().player_type, PLAYER_TYPES.COMPUTER);

    turn_handler.reveal_active_turn(game_state.get_active_player().id);
    ai_handler.take_active_turn();

    assert.equal(game_state.phase, PHASES.HANDOFF);
    assert.equal(game_state.get_active_player().player_type, PLAYER_TYPES.HUMAN);
});

test("deck exhaustion fails visibly because no reshuffle rule exists", () => {
    const deck_handler = new DeckHandler(fixed_random(0.5));
    const player = { name: "Tester", deck: [], hand: [] };
    assert.throws(
        () => deck_handler.draw_cards(player, 1),
        /draw pile is empty and the project rules do not define a reshuffle rule/
    );
});
