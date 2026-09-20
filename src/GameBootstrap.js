/* =====================================================================
   GameBootstrap
   Owns: browser startup and module wiring.
   Stays out of: gameplay logic and presentation details.
   ===================================================================== */

import { AIPlayerHandler } from "./AIPlayerHandler.js";
import { CardRenderer } from "./CardRenderer.js";
import { DeckHandler } from "./DeckHandler.js";
import { DiceHandler } from "./DiceHandler.js";
import { GameState } from "./GameState.js";
import { RulesEngine } from "./RulesEngine.js";
import { TurnHandler } from "./TurnHandler.js";
import { UIHandler } from "./UIHandler.js";
import { InputHandler } from "./InputHandler.js";

const deck_handler = new DeckHandler(Math.random);
const dice_handler = new DiceHandler(Math.random);
const game_state = new GameState(deck_handler);
const rules_engine = new RulesEngine(game_state, dice_handler);
const turn_handler = new TurnHandler(game_state, rules_engine);
const ai_player_handler = new AIPlayerHandler(game_state, rules_engine, turn_handler);
const card_renderer = new CardRenderer();
const ui_handler = new UIHandler(document, card_renderer);
const input_handler = new InputHandler(
    game_state,
    rules_engine,
    turn_handler,
    ai_player_handler,
    ui_handler,
    window
);

window.addEventListener("error", (event) => {
    if (event.error instanceof Error) {
        ui_handler.render_fatal_error(event.error);
        return;
    }

    ui_handler.render_fatal_error(new Error(event.message));
});

window.addEventListener("unhandledrejection", (event) => {
    if (event.reason instanceof Error) {
        ui_handler.render_fatal_error(event.reason);
        return;
    }

    ui_handler.render_fatal_error(new Error(String(event.reason)));
});

input_handler.initialize();
