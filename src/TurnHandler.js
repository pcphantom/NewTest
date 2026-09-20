/* =====================================================================
   TurnHandler
   Owns: initiative, draw phase, mandatory actions and turn rotation.
   Stays out of: card effect details and DOM rendering.
   ===================================================================== */

import {
    BASE_ACTIONS_PER_TURN,
    CARDS_DRAWN_PER_TURN,
    INITIATIVE_DIE_SIDES,
    OPENING_HAND_SIZE,
    PHASES,
} from "./Constants.js";

export class TurnHandler {
    constructor(game_state, rules_engine) {
        if (typeof game_state !== "object" || game_state === null) {
            throw new TypeError("TurnHandler requires a GameState instance.");
        }
        if (typeof rules_engine !== "object" || rules_engine === null) {
            throw new TypeError("TurnHandler requires a RulesEngine instance.");
        }

        this.game_state = game_state;
        this.rules_engine = rules_engine;
        this.deck_handler = game_state.deck_handler;
    }

    start_match(player_configurations, game_mode) {
        this.game_state.create_match(player_configurations, game_mode);

        for (const player of this.game_state.players) {
            this.deck_handler.draw_cards(player, OPENING_HAND_SIZE);
        }

        this.game_state.add_event(`Each player drew an opening hand of ${OPENING_HAND_SIZE} cards.`, "system");
    }

    roll_initiative(player_id) {
        if (this.game_state.phase !== PHASES.INITIATIVE) {
            throw new Error("Initiative can only be rolled during the initiative phase.");
        }

        const expected_player = this.game_state.get_next_initiative_player();
        if (expected_player === null) {
            throw new Error("No initiative participant is waiting to roll.");
        }
        if (expected_player.id !== player_id) {
            throw new Error(`${player_id} cannot roll initiative for ${expected_player.name}.`);
        }

        const roll = this.rules_engine.dice_handler.roll_die(INITIATIVE_DIE_SIDES);
        expected_player.initiative_roll = roll;
        expected_player.initiative_history.push(roll);
        this.game_state.add_event(`${expected_player.name} rolled ${roll} for initiative.`, "dice");
        this.game_state.initiative_candidate_index += 1;

        if (this.game_state.initiative_candidate_index < this.game_state.initiative_candidate_player_ids.length) {
            return {
                complete: false,
                tied: false,
                roll,
            };
        }

        const candidates = this.game_state.initiative_candidate_player_ids.map((candidate_id) =>
            this.game_state.get_player_by_id(candidate_id)
        );
        const highest_roll = Math.max(...candidates.map((candidate) => candidate.initiative_roll));
        const tied_players = candidates.filter((candidate) => candidate.initiative_roll === highest_roll);

        if (tied_players.length > 1) {
            this.game_state.initiative_round += 1;
            this.game_state.initiative_candidate_player_ids = tied_players.map((player) => player.id);
            this.game_state.initiative_candidate_index = 0;
            for (const player of tied_players) {
                player.initiative_roll = null;
            }
            this.game_state.add_event(
                `Initiative tie at ${highest_roll}. ${tied_players.map((player) => player.name).join(", ")} reroll.`,
                "dice"
            );
            return {
                complete: false,
                tied: true,
                roll,
            };
        }

        const winner = tied_players[0];
        this.game_state.initiative_winner_player_id = winner.id;
        this.game_state.rotate_players_to_first(winner.id);
        this.game_state.active_player_index = 0;
        this.game_state.turn_number = 1;
        this.game_state.round_number = 1;
        this.game_state.actions_remaining = 0;
        this.game_state.add_event(`${winner.name} won initiative and takes the first turn.`, "system");
        this.prepare_active_turn();

        return {
            complete: true,
            tied: false,
            roll,
            winner_player_id: winner.id,
        };
    }

    reveal_active_turn(player_id) {
        if (this.game_state.phase !== PHASES.HANDOFF) {
            throw new Error("A turn can only be revealed from the handoff state.");
        }

        const player = this.game_state.get_active_player();
        if (player.id !== player_id) {
            throw new Error(`${player_id} cannot reveal ${player.name}'s turn.`);
        }

        this.begin_active_turn();
    }

    prepare_active_turn() {
        if (this.game_state.is_hotseat()) {
            this.game_state.phase = PHASES.HANDOFF;
        } else {
            this.begin_active_turn();
        }
    }

    begin_active_turn() {
        const player = this.game_state.get_active_player();

        this.game_state.phase = PHASES.PLAY;
        this.game_state.actions_remaining = BASE_ACTIONS_PER_TURN;
        this.game_state.active_turn_must_end_after_decisions = false;
        this.rules_engine.on_start_turn(player.id);

        if (this.game_state.phase === PHASES.GAME_OVER) {
            return;
        }

        if (player.eliminated) {
            this.advance_to_next_player();
            return;
        }

        this.deck_handler.draw_cards(player, CARDS_DRAWN_PER_TURN);
        this.game_state.add_event(`${player.name} drew ${CARDS_DRAWN_PER_TURN} card for the turn.`, "draw");

        if (player.skip_next_turn_after_draw) {
            player.skip_next_turn_after_draw = false;
            this.game_state.actions_remaining = 0;
            this.game_state.active_turn_must_end_after_decisions = true;
            this.game_state.add_event(
                `${player.name}'s turn ends after drawing because of Loading... Please Wait.`,
                "status"
            );
            this.end_skipped_turn_if_ready();
        }
    }

    end_skipped_turn_if_ready() {
        if (!this.game_state.active_turn_must_end_after_decisions) {
            return false;
        }
        if (this.game_state.get_current_decision() !== null) {
            return false;
        }
        if (this.game_state.phase === PHASES.GAME_OVER) {
            return true;
        }

        this.finish_active_turn();
        return true;
    }

    can_end_turn() {
        if (this.game_state.phase !== PHASES.PLAY) {
            return false;
        }
        if (this.game_state.get_current_decision() !== null) {
            return false;
        }
        if (this.game_state.active_turn_must_end_after_decisions) {
            return true;
        }

        const player = this.game_state.get_active_player();
        return this.game_state.actions_remaining === 0 || (player.hand.length === 0 && player.deck.length === 0 && player.discard.length === 0);
    }

    end_turn(player_id) {
        if (this.game_state.phase !== PHASES.PLAY) {
            throw new Error("A turn can only end during the Play phase.");
        }

        const player = this.game_state.get_active_player();
        if (player.id !== player_id) {
            throw new Error(`${player_id} cannot end ${player.name}'s turn.`);
        }
        if (this.game_state.get_current_decision() !== null) {
            throw new Error("Resolve the pending decision before ending the turn.");
        }
        if (!this.can_end_turn()) {
            throw new Error(`${player.name} must use the remaining action because playable cards remain in hand.`);
        }

        this.finish_active_turn();
    }

    finish_active_turn() {
        const player = this.game_state.get_active_player();
        this.rules_engine.on_end_turn(player.id);
        this.game_state.active_turn_must_end_after_decisions = false;

        if (this.game_state.phase === PHASES.GAME_OVER) {
            return;
        }

        this.advance_to_next_player();
    }

    advance_to_next_player() {
        const current_index = this.game_state.active_player_index;
        let next_index = current_index;
        let inspected_players = 0;

        while (inspected_players < this.game_state.players.length) {
            next_index += 1;
            if (next_index >= this.game_state.players.length) {
                next_index = 0;
            }
            inspected_players += 1;

            if (!this.game_state.players[next_index].eliminated) {
                break;
            }
        }

        if (inspected_players === this.game_state.players.length && this.game_state.players[next_index].eliminated) {
            throw new Error("No living player is available for the next turn.");
        }

        if (next_index <= current_index) {
            this.game_state.round_number += 1;
        }

        this.game_state.active_player_index = next_index;
        this.game_state.turn_number += 1;
        this.game_state.actions_remaining = 0;
        this.game_state.add_event(`Turn passes to ${this.game_state.get_active_player().name}.`, "system");
        this.prepare_active_turn();
    }
}
