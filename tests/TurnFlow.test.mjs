import test from "node:test";
import assert from "node:assert/strict";
import { AI_ACTION_DELAY_MS, CHARACTER_IDS, DECISION_TYPES, GAME_MODES, PHASES, PLAYER_TYPES } from "../src/Constants.js";
import { DeckHandler } from "../src/DeckHandler.js";
import { DiceHandler } from "../src/DiceHandler.js";
import { GameState } from "../src/GameState.js";
import { RulesEngine } from "../src/RulesEngine.js";
import { TurnHandler } from "../src/TurnHandler.js";
import { AIPlayerHandler } from "../src/AIPlayerHandler.js";
import { InputHandler } from "../src/InputHandler.js";
import { UIHandler } from "../src/UIHandler.js";
import { CardRenderer } from "../src/CardRenderer.js";

function game(mode = GAME_MODES.SINGLE_PLAYER, cpu_first = false) {
    const state = new GameState(new DeckHandler(() => .2));
    const rolls = cpu_first ? [.1, .95] : [.95, .1];
    const rules = new RulesEngine(state, new DiceHandler(() => rolls.shift() ?? .5));
    const turns = new TurnHandler(state, rules);
    const ai = new AIPlayerHandler(state, rules, turns);
    turns.start_match([
        { name: "Human", character_id: CHARACTER_IDS.GRANDPA, player_type: PLAYER_TYPES.HUMAN },
        { name: "Opponent", character_id: CHARACTER_IDS.MALRIC, player_type: mode === GAME_MODES.SINGLE_PLAYER ? PLAYER_TYPES.COMPUTER : PLAYER_TYPES.HUMAN },
    ], mode);
    while (state.phase === PHASES.INITIATIVE) turns.roll_initiative(state.get_next_initiative_player().id);
    const human = state.get_player_by_id("player_1");
    const cpu = state.get_player_by_id("player_2");
    return { state, rules, turns, ai, human, cpu };
}

function input_harness(g) {
    const timers = new Map();
    const frames = [];
    let next_id = 1;
    const app = { querySelector: () => null, querySelectorAll: () => [] };
    const ui = {
        app_element: app,
        render: (state, rules, turns, view) => frames.push({ turn: state.turn_number, phase: state.phase, hand_open: view.hand_pinned, last_play: state.last_play }),
    };
    const window = {
        document: {},
        setTimeout: (callback, delay) => { const id = next_id++; timers.set(id, { callback, delay }); return id; },
        clearTimeout: id => timers.delete(id),
    };
    const input = new InputHandler(g.state, g.rules, g.turns, g.ai, ui, window);
    const tick = () => {
        assert.equal(timers.size, 1, "only one automatic step is scheduled");
        const [id, timer] = timers.entries().next().value;
        assert.equal(timer.delay, AI_ACTION_DELAY_MS);
        timers.delete(id);
        timer.callback();
    };
    return { input, timers, frames, tick };
}

function ui_harness() {
    const app = { innerHTML: "", insertAdjacentHTML: (where, html) => { app.innerHTML += html; } };
    const ui = new UIHandler({ getElementById: () => app, fullscreenElement: null }, new CardRenderer());
    const view = { hand_pinned: true, interaction: null, private_decision_revealed: false, decision_error: null };
    return { app, ui, view };
}

test("single-player starts and rotates directly into Play, drawing exactly once per turn", () => {
    const g = game();
    assert.equal(g.state.phase, PHASES.PLAY);
    assert.equal(g.human.hand.length, 4);
    assert.equal(g.cpu.hand.length, 3);
    g.state.actions_remaining = 0;
    g.turns.end_turn(g.human.id);
    assert.equal(g.state.phase, PHASES.PLAY);
    assert.equal(g.cpu.hand.length, 4);
    g.state.actions_remaining = 0;
    g.turns.end_turn(g.cpu.id);
    assert.equal(g.state.phase, PHASES.PLAY);
    assert.equal(g.human.hand.length, 5);
    assert.throws(() => g.turns.reveal_active_turn(g.human.id), /handoff/);
});

test("a computer initiative winner also starts without a handoff", () => {
    const g = game(GAME_MODES.SINGLE_PLAYER, true);
    assert.equal(g.state.phase, PHASES.PLAY);
    assert.equal(g.state.get_active_player(), g.cpu);
    assert.equal(g.cpu.hand.length, 4);
});

test("hotseat preserves handoff and waits to draw until that player reveals", () => {
    const g = game(GAME_MODES.LOCAL_MULTIPLAYER);
    assert.equal(g.state.phase, PHASES.HANDOFF);
    assert.equal(g.human.hand.length, 3);
    g.turns.reveal_active_turn(g.human.id);
    assert.equal(g.human.hand.length, 4);
    g.state.actions_remaining = 0;
    g.turns.end_turn(g.human.id);
    assert.equal(g.state.phase, PHASES.HANDOFF);
    assert.equal(g.cpu.hand.length, 3);
    const { ui, app } = ui_harness();
    ui.render_handoff(g.state);
    assert.match(app.innerHTML, /Reveal My Hand/);
    assert.match(app.innerHTML, /Pass to Opponent/);
});

test("computer combo cards render separately and stay visible before its turn ends", () => {
    const g = game(GAME_MODES.SINGLE_PLAYER, true);
    g.cpu.hand = [
        { instance_id: "combo", definition_id: "malric_shield_bash" },
        { instance_id: "shield", definition_id: "malric_defensive_stance" },
    ];
    g.ai.choose_card = player => player.hand[0];
    const h = input_harness(g);
    h.input.render();
    h.tick();
    assert.equal(g.cpu.cards_played_this_turn, 1);
    assert.equal(g.state.turn_number, 1);
    assert.equal(h.frames.at(-1).last_play.definition_id, "malric_shield_bash");
    h.tick();
    assert.equal(g.cpu.cards_played_this_turn, 2);
    assert.equal(g.state.turn_number, 1);
    assert.equal(h.frames.at(-1).last_play.definition_id, "malric_defensive_stance");
    h.tick();
    assert.equal(g.state.get_active_player(), g.human);
    assert.equal(g.state.phase, PHASES.PLAY);
    assert.equal(h.frames.at(-1).hand_open, true);
    assert.equal(h.frames.at(-1).last_play.definition_id, "malric_defensive_stance");
    assert.equal(h.timers.size, 0);
});

test("computer decisions do not consume the rest of a turn in one scheduled step", () => {
    const g = game(GAME_MODES.SINGLE_PLAYER, true);
    g.state.enqueue_decision({ type: DECISION_TYPES.DISCARD_CARDS, player_id: g.cpu.id, count: 1, source_name: "Boring Story" });
    const h = input_harness(g);
    h.input.render();
    h.tick();
    assert.equal(g.state.get_current_decision(), null);
    assert.equal(g.cpu.cards_played_this_turn, 0);
    assert.equal(h.timers.size, 1);
});

test("human discard choices pause CPU flow and only hotseat asks to reveal", () => {
    for (const mode of Object.values(GAME_MODES)) {
        const g = game(mode, true);
        if (mode === GAME_MODES.LOCAL_MULTIPLAYER) g.turns.reveal_active_turn(g.cpu.id);
        const decision = g.state.enqueue_decision({ type: DECISION_TYPES.DISCARD_CARDS, player_id: g.human.id, count: 1, source_name: "Boring Story" });
        const h = input_harness(g);
        h.input.render();
        assert.equal(h.timers.size, 0);
        const { ui, view } = ui_harness();
        const html = ui.render_decision_overlay(g.state, decision, view);
        assert.match(html, /role="dialog"/);
        if (mode === GAME_MODES.SINGLE_PLAYER) {
            assert.doesNotMatch(html, /Reveal Hand|Pass the device/);
            assert.match(html, /Discard Selected/);
        } else {
            assert.match(html, /Reveal Hand/);
        }
    }
});

test("single-player keeps the human hand and seat during CPU turns without allowing a play", () => {
    const g = game(GAME_MODES.SINGLE_PLAYER, true);
    const { ui, app, view } = ui_harness();
    ui.render_table(g.state, g.rules, g.turns, view);
    const bottom = app.innerHTML.split('<div class="active-playmat">')[1];
    assert.match(bottom, /data-player-id="player_1"/);
    const hand = app.innerHTML.split('<div class="hand-fan">')[1].split('</div>')[0];
    assert.match(hand, /data-card-instance-id=/);
    for (const card of g.cpu.hand) assert.ok(!app.innerHTML.includes(`data-card-instance-id="${card.instance_id}"`));
    const inspection = ui.render_card_inspection(g.state, g.human.hand[0]);
    assert.doesNotMatch(inspection, /data-action="select-card"/);
    assert.doesNotMatch(app.innerHTML, /Reveal My Hand|Pass to /);
});

test("computer decisions do not cover the board with a privacy overlay", () => {
    const g = game(GAME_MODES.SINGLE_PLAYER, true);
    const decision = g.state.enqueue_decision({ type: DECISION_TYPES.DISCARD_CARDS, player_id: g.cpu.id, count: 1 });
    const { ui, view } = ui_harness();
    assert.equal(ui.render_decision_overlay(g.state, decision, view), "");
});

test("hand auto-opens only on a new human turn; pause and inspection stop the CPU timer", () => {
    const g = game();
    const h = input_harness(g);
    h.input.render();
    assert.equal(h.frames.at(-1).hand_open, true);
    h.input.view_state.hand_pinned = false;
    h.input.render();
    assert.equal(h.frames.at(-1).hand_open, false, "manual closing persists during the same turn");
    g.state.actions_remaining = 0;
    g.turns.end_turn(g.human.id);
    h.input.render();
    assert.equal(h.frames.at(-1).hand_open, false);
    assert.equal(h.input.hand_hover_suppressed, true, "a cursor left over End Turn must not reopen the hand over CPU plays");
    for (const field of ["pause_menu", "inspected_card", "skills_player_id"]) {
        h.input.clear_automatic_timer();
        h.input.view_state[field] = field === "pause_menu" ? true : "test";
        h.input.render();
        assert.equal(h.timers.size, 0);
        h.input.view_state[field] = field === "pause_menu" ? false : null;
    }
    h.input.render();
    assert.equal(h.timers.size, 1);
});
