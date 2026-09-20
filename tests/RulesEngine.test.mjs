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
        assert.equal(player.hp, 12);
        assert.equal(player.max_hp, 12);
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

test("Developer's Favorite protects only after its card is played, once per match", () => {
    const game = create_game([
        human("Patchadin", CHARACTER_IDS.PATCHADIN),
        human("Grandpa", CHARACTER_IDS.GRANDPA),
    ]);
    const patchadin = game.game_state.players[0];
    const attacker = game.game_state.players[1];
    complete_two_player_initiative(game);
    game.turn_handler.reveal_active_turn(patchadin.id);
    const favoritism = move_definition_to_hand(patchadin, "patchadin_blatant_favoritism");
    game.rules_engine.play_card(patchadin.id, favoritism.instance_id, player_target(attacker.id), null);

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

test("Second Wind is a low-health bonus on Inspiring Presence, never a passive rescue", () => {
    for (const starting_hp of [4, 5]) {
        const game = create_game([human("Malric", CHARACTER_IDS.MALRIC), human("Grandpa", CHARACTER_IDS.GRANDPA)]);
        complete_two_player_initiative(game);
        const malric = game.game_state.get_active_player();
        game.turn_handler.reveal_active_turn(malric.id);
        malric.hp = starting_hp;
        const card = move_definition_to_hand(malric, "malric_inspiring_presence");
        const hand_before = malric.hand.length;
        game.rules_engine.play_card(malric.id, card.instance_id, null, null);
        assert.equal(malric.hp, starting_hp === 4 ? 10 : 9);
        assert.equal(malric.hand.length, hand_before - 1 + 2);
    }
});

test("taking damage never grants unplayed character skills", () => {
    for (const character_id of [CHARACTER_IDS.MALRIC, CHARACTER_IDS.PATCHADIN]) {
        const game = create_game([human("Target", character_id), human("Grandpa", CHARACTER_IDS.GRANDPA)]);
        const [target, attacker] = game.game_state.players;
        game.rules_engine.apply_damage_to_player(target.id, 9, attacker.id, {is_attack: true, is_dice_attack: false, source_name: "Hit"});
        assert.equal(target.hp, 3);
        assert.equal(target.hand.length, 3);
        game.rules_engine.apply_damage_to_player(target.id, 20, attacker.id, {is_attack: true, is_dice_attack: false, source_name: "Lethal hit"});
        assert.equal(target.hp, 0);
        assert.equal(target.eliminated, true);
    }
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

test("Can Do Everything changes only Judgment, preserving its other effects", () => {
    const game = create_game([human("Patchadin", CHARACTER_IDS.PATCHADIN), human("Grandpa", CHARACTER_IDS.GRANDPA)]);
    complete_two_player_initiative(game);
    const patchadin = game.game_state.get_active_player();
    const opponent = game.game_state.get_living_opponents(patchadin.id)[0];
    game.turn_handler.reveal_active_turn(patchadin.id);
    const flash = move_definition_to_hand(patchadin, "patchadin_flash_of_light");
    assert.deepEqual(game.rules_engine.get_available_symbol_conversions(patchadin.id, flash.instance_id), []);
    assert.throws(() => game.rules_engine.play_card(patchadin.id, flash.instance_id, null, {from: "healing", to: "defense"}), /only applies to the Judgment/);
    assert.equal(game.game_state.actions_remaining, 1);
    const judgment = move_definition_to_hand(patchadin, "patchadin_judgment");
    const hand_before = patchadin.hand.length;
    assert.equal(game.rules_engine.get_available_symbol_conversions(patchadin.id, judgment.instance_id).length, 2);
    game.rules_engine.play_card(patchadin.id, judgment.instance_id, player_target(opponent.id), {from: "attack", to: "defense"});
    assert.equal(opponent.hp, 11);
    assert.equal(patchadin.defenses[0].current_shields, 1);
    assert.equal(patchadin.hand.length, hand_before);
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

test("empty draw piles recycle discards; unavailable draws resolve as far as possible", () => {
    const deck_handler = new DeckHandler(fixed_random(.5));
    const cards = [{instance_id:"a"}, {instance_id:"b"}];
    const player = {name:"Tester", deck:[], hand:[], discard:[...cards], defenses:[]};
    assert.equal(deck_handler.draw_cards(player, 3).length, 2);
    assert.equal(player.deck_recycles, 1);
    assert.equal(player.discard.length, 0);
    assert.equal(new Set(player.hand.map(c => c.instance_id)).size, 2);
    assert.equal(deck_handler.draw_cards(player, 1).length, 0);
});


test("repeated highest ties exclude lower rolls and preserve clockwise seats", () => {
    const game = create_game([
        human("Grandpa", CHARACTER_IDS.GRANDPA), human("Malric", CHARACTER_IDS.MALRIC), human("Patchadin", CHARACTER_IDS.PATCHADIN)
    ], [.95, .95, .9, .1, .1, 0, .05]);
    for (let i = 0; i < 3; i++) game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);
    assert.deepEqual(game.game_state.initiative_candidate_player_ids, ["player_1", "player_2"]);
    for (let i = 0; i < 2; i++) game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);
    assert.equal(game.game_state.initiative_round, 3);
    for (let i = 0; i < 2; i++) game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);
    assert.deepEqual(game.game_state.players.map(p => p.name), ["Malric", "Patchadin", "Grandpa"]);
    assert.deepEqual(game.game_state.players.find(p => p.name === "Patchadin").initiative_history, [19]);
    assert.ok(game.game_state.event_log.filter(e => e.tone === "dice").every(e => !/succeed|fail/i.test(e.message)));
});

test("all six signature skills are printed on cards that also have normal effects", () => {
    const skills = [];
    for (const character_id of Object.values(CHARACTER_IDS)) {
        for (const card of get_card_definitions_for_character(character_id)) {
            if (card.skill === null) continue;
            skills.push(card.skill.id);
            assert.ok(Object.values(card.symbols).some(count => count > 0));
            assert.ok(card.skill.description.length > 30);
            assert.ok(card.flavor_text.length > 0);
        }
    }
    assert.deepEqual(skills.sort(), ["can_do_everything", "developers_favorite", "monochrome_lecture", "screen_burn_in", "second_wind", "threat_generation"]);
});

test("Monochrome Lecture resolves only with Back In My Day; save outcomes are explicit", () => {
    for (const [save, blocked] of [[0,1], [.55,1], [.6,0], [.95,0]]) {
        const game = create_game([human("Grandpa", CHARACTER_IDS.GRANDPA), human("Malric", CHARACTER_IDS.MALRIC)], [.95,.1,save]);
        complete_two_player_initiative(game);
        const [grandpa, malric] = game.game_state.players;
        game.turn_handler.reveal_active_turn(grandpa.id);
        assert.equal(malric.hp, 12);
        const card = move_definition_to_hand(grandpa, "grandpa_back_in_my_day");
        const hand_before = grandpa.hand.length;
        game.rules_engine.play_card(grandpa.id, card.instance_id, player_target(malric.id), null);
        assert.equal(malric.hp, 11);
        assert.equal(malric.skip_next_play_again_count, blocked);
        assert.equal(malric.outgoing_attack_reductions.length, 1);
        assert.equal(grandpa.hand.length, hand_before);
        assert.equal(game.game_state.actions_remaining, 0);
    }
});

test("Screen Burn-In belongs to Grayscale Bomb, not ordinary attacks", () => {
    const game = create_game([human("Grandpa", CHARACTER_IDS.GRANDPA), human("Malric", CHARACTER_IDS.MALRIC), human("Patchadin", CHARACTER_IDS.PATCHADIN)], [.95,.1,.2]);
    for (let i = 0; i < 3; i++) game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);
    const [grandpa, malric, patchadin] = game.game_state.players;
    game.turn_handler.reveal_active_turn(grandpa.id);
    const attack = move_definition_to_hand(grandpa, "grandpa_8_bit_blast");
    game.rules_engine.play_card(grandpa.id, attack.instance_id, player_target(malric.id), null);
    assert.equal(game.game_state.get_current_decision(), null);
    assert.equal(malric.hp, 10);
    game.game_state.actions_remaining = 1;
    const bomb = move_definition_to_hand(grandpa, "grandpa_grayscale_bomb");
    game.rules_engine.play_card(grandpa.id, bomb.instance_id, null, null);
    const decision = game.game_state.get_current_decision();
    assert.equal(decision.type, DECISION_TYPES.SCREEN_BURN_TARGET);
    assert.equal(malric.hp, 8);
    assert.equal(patchadin.hp, 10);
    game.rules_engine.resolve_decision(decision.id, grandpa.id, {target_player_id: patchadin.id});
    assert.equal(patchadin.hp, 9);
    assert.equal(game.game_state.get_current_decision(), null);
});

test("Aggressive Positioning grants a shield and card-bound Threat Generation", () => {
    const game = create_game([human("Malric", CHARACTER_IDS.MALRIC), human("Grandpa", CHARACTER_IDS.GRANDPA)]);
    complete_two_player_initiative(game);
    const [malric, grandpa] = game.game_state.players;
    game.turn_handler.reveal_active_turn(malric.id);
    assert.equal(grandpa.forced_attack_target_player_id, null);
    const card = move_definition_to_hand(malric, "malric_aggressive_positioning");
    game.rules_engine.play_card(malric.id, card.instance_id, player_target(grandpa.id), null);
    assert.equal(malric.defenses[0].current_shields, 1);
    assert.equal(grandpa.forced_attack_target_player_id, malric.id);
    const hand_before = malric.hand.length;
    game.turn_handler.end_turn(malric.id);
    game.turn_handler.reveal_active_turn(grandpa.id);
    const attack = move_definition_to_hand(grandpa, "grandpa_8_bit_blast");
    game.rules_engine.play_card(grandpa.id, attack.instance_id, player_target(malric.id), null);
    assert.equal(malric.hp, 11);
    assert.equal(malric.hand.length, hand_before + 1);
    assert.equal(grandpa.forced_attack_target_player_id, null);
});

test("Developer's Favorite expires at the next turn if unused", () => {
    const game = create_game([human("Patchadin", CHARACTER_IDS.PATCHADIN), human("Grandpa", CHARACTER_IDS.GRANDPA)]);
    complete_two_player_initiative(game);
    const [patchadin, grandpa] = game.game_state.players;
    game.turn_handler.reveal_active_turn(patchadin.id);
    const card = move_definition_to_hand(patchadin, "patchadin_blatant_favoritism");
    game.rules_engine.play_card(patchadin.id, card.instance_id, player_target(grandpa.id), null);
    assert.equal(patchadin.developers_favorite_activated_turn, 1);
    game.game_state.turn_number += 2;
    game.rules_engine.on_start_turn(patchadin.id);
    assert.equal(patchadin.developers_favorite_activated_turn, null);
    game.rules_engine.apply_damage_to_player(patchadin.id, 20, grandpa.id, {is_attack: true, is_dice_attack: false, source_name: "Hit"});
    assert.equal(patchadin.eliminated, true);
});

test("healing never exceeds twelve HP", () => {
    const game = create_game([human("Grandpa", CHARACTER_IDS.GRANDPA), human("Malric", CHARACTER_IDS.MALRIC)]);
    const player = game.game_state.players[0];
    player.hp = 8;
    game.rules_engine.heal_player(player.id, 100, "test");
    assert.equal(player.hp, 12);
});

test("v2 Patchadin includes its corrected 28-card list", () => {
    const cards = get_card_definitions_for_character(CHARACTER_IDS.PATCHADIN);
    const count = id => cards.find(card => card.id === id)?.copies ?? 0;
    assert.equal(count("patchadin_blatant_favoritism"), 2);
    assert.equal(count("patchadin_blessing_of_kings"), 1);
    assert.equal(count("patchadin_divine_intervention"), 1);
    assert.equal(count("patchadin_wake_of_ashes"), 1);
    assert.equal(count("patchadin_obvious_favoritism"), 0);
    assert.equal(count("patchadin_paladins_op_at_everything"), 0);
});

test("Blatant Favoritism performs all four normal effects and arms its printed skill", () => {
    const game = create_game([human("Patchadin", CHARACTER_IDS.PATCHADIN), human("Grandpa", CHARACTER_IDS.GRANDPA)]);
    complete_two_player_initiative(game);
    const [patchadin, grandpa] = game.game_state.players;
    game.turn_handler.reveal_active_turn(patchadin.id);
    patchadin.hp = 5;
    const card = move_definition_to_hand(patchadin, "patchadin_blatant_favoritism");
    const hand_before = patchadin.hand.length;
    game.rules_engine.play_card(patchadin.id, card.instance_id, player_target(grandpa.id), null);
    assert.equal(patchadin.hp, 6);
    assert.equal(grandpa.hp, 10);
    assert.equal(patchadin.defenses[0].current_shields, 1);
    assert.equal(patchadin.hand.length, hand_before - 1);
    assert.equal(game.game_state.actions_remaining, 1);
    assert.equal(patchadin.developers_favorite_activated_turn, 1);
});

test("Divine Intervention sacrifices even Bubble Hearth, heals to maximum, and grants another play", () => {
    const game = create_game([human("Patchadin", CHARACTER_IDS.PATCHADIN), human("Grandpa", CHARACTER_IDS.GRANDPA)]);
    complete_two_player_initiative(game);
    const patchadin = game.game_state.get_active_player();
    game.turn_handler.reveal_active_turn(patchadin.id);
    const bubble = move_definition_to_hand(patchadin, "patchadin_bubble_hearth");
    game.rules_engine.play_card(patchadin.id, bubble.instance_id, null, null);
    game.game_state.actions_remaining = 1;
    patchadin.hp = 1;
    const intervention = move_definition_to_hand(patchadin, "patchadin_divine_intervention");
    game.rules_engine.play_card(patchadin.id, intervention.instance_id, null, null);
    assert.equal(patchadin.hp, 12);
    assert.equal(patchadin.defenses.length, 0);
    assert.equal(patchadin.discard.some(card => card.instance_id === bubble.instance_id), true);
    assert.equal(game.game_state.actions_remaining, 1);
});

test("Wake of Ashes hits all opponents but cancels only the chosen opponent's next extra play", () => {
    const game = create_game([human("Patchadin", CHARACTER_IDS.PATCHADIN), human("Grandpa", CHARACTER_IDS.GRANDPA), human("Malric", CHARACTER_IDS.MALRIC)], [.95,.1,.2]);
    for (let i=0; i<3; i++) game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);
    const [patchadin, grandpa, malric] = game.game_state.players;
    game.turn_handler.reveal_active_turn(patchadin.id);
    const card = move_definition_to_hand(patchadin, "patchadin_wake_of_ashes");
    assert.equal(game.rules_engine.get_legal_targets(patchadin.id, card.instance_id, null).length, 2);
    game.rules_engine.play_card(patchadin.id, card.instance_id, player_target(grandpa.id), null);
    assert.equal(grandpa.hp, 11);
    assert.equal(malric.hp, 11);
    assert.equal(grandpa.skip_next_play_again_count, 1);
    assert.equal(malric.skip_next_play_again_count, 0);
});

test("an empty hand with mandatory plays draws two and cannot skip its actions", () => {
    const game = create_game([human("Grandpa", CHARACTER_IDS.GRANDPA), human("Malric", CHARACTER_IDS.MALRIC)]);
    complete_two_player_initiative(game);
    const player = game.game_state.get_active_player();
    game.turn_handler.reveal_active_turn(player.id);
    const refresh = move_definition_to_hand(player, "grandpa_refresh_rate");
    player.discard.push(...player.hand.filter(card => card.instance_id !== refresh.instance_id));
    player.hand = [refresh];
    game.rules_engine.play_card(player.id, refresh.instance_id, null, null);
    assert.equal(player.hand.length, 2);
    assert.equal(game.game_state.actions_remaining, 2);
    assert.equal(game.turn_handler.can_end_turn(), false);
});

test("five-player standard attacks obey adjacency while control and area effects remain unrestricted", () => {
    const game = create_game(Array.from({length:5}, (_,i) => human("Seat "+i, CHARACTER_IDS.GRANDPA)), [.95,.1,.2,.3,.4]);
    for (let i=0; i<5; i++) game.turn_handler.roll_initiative(game.game_state.get_next_initiative_player().id);
    const player = game.game_state.get_active_player();
    game.turn_handler.reveal_active_turn(player.id);
    const attack = move_definition_to_hand(player, "grandpa_8_bit_blast");
    assert.deepEqual(game.rules_engine.get_legal_targets(player.id, attack.instance_id, null).map(t => t.player_id), ["player_2","player_5"]);
    const control = move_definition_to_hand(player, "grandpa_back_in_my_day");
    assert.equal(game.rules_engine.get_legal_targets(player.id, control.instance_id, null).length, 4);
    player.forced_attack_target_player_id = "player_3";
    assert.deepEqual(game.rules_engine.get_legal_targets(player.id, attack.instance_id, null).map(t => t.player_id), ["player_3"]);
});

test("automated matches preserve turn progress and HP bounds with the revised decks", () => {
    for (let seed=1; seed<=12; seed++) {
        let state = seed;
        const random = () => {state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296;};
        const deck = new DeckHandler(random);
        const game_state = new GameState(deck);
        const rules = new RulesEngine(game_state, new DiceHandler(random));
        const turns = new TurnHandler(game_state, rules);
        const ai = new AIPlayerHandler(game_state, rules, turns);
        turns.start_match(Array.from({length:seed % 2 ? 3 : 6}, (_,i) => computer("CPU "+i, Object.values(CHARACTER_IDS)[i%3])), GAME_MODES.SINGLE_PLAYER);
        for (let guard=0; guard<1500 && game_state.phase !== PHASES.GAME_OVER; guard++) {
            if (game_state.phase === PHASES.INITIATIVE) turns.roll_initiative(game_state.get_next_initiative_player().id);
            else if (game_state.phase === PHASES.HANDOFF) turns.reveal_active_turn(game_state.get_active_player().id);
            else {
                const turn_before = game_state.turn_number;
                ai.take_active_turn();
                assert.ok(game_state.phase === PHASES.GAME_OVER || game_state.turn_number > turn_before, "CPU must complete its turn: seed "+seed);
            }
        }
        // Tank mirrors can outlast this bounded simulation; that is a balance finding,
        // not permission to alter printed defense rules or introduce sudden death.
        assert.ok(game_state.phase === PHASES.GAME_OVER || game_state.turn_number > 200);
        for (const player of game_state.players) assert.ok(player.hp >= 0 && player.hp <= 12);
    }
});
