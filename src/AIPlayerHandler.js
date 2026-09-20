/* =====================================================================
   AIPlayerHandler
   Owns: computer-player choices through public gameplay interfaces.
   Stays out of: direct rule mutation, rendering, human input.
   ===================================================================== */

import {
    CARD_TYPES,
    DECISION_TYPES,
    PHASES,
    PLAYER_TYPES,
    SYMBOL_NAMES,
} from "./Constants.js";
import { get_card_definition } from "./CardData.js";

export class AIPlayerHandler {
    constructor(game_state, rules_engine, turn_handler) {
        if (typeof game_state !== "object" || game_state === null) {
            throw new TypeError("AIPlayerHandler requires a GameState instance.");
        }
        if (typeof rules_engine !== "object" || rules_engine === null) {
            throw new TypeError("AIPlayerHandler requires a RulesEngine instance.");
        }
        if (typeof turn_handler !== "object" || turn_handler === null) {
            throw new TypeError("AIPlayerHandler requires a TurnHandler instance.");
        }

        this.game_state = game_state;
        this.rules_engine = rules_engine;
        this.turn_handler = turn_handler;
    }

    is_computer_player(player_id) {
        return this.game_state.get_player_by_id(player_id).player_type === PLAYER_TYPES.COMPUTER;
    }

    resolve_computer_decisions() {
        let decision = this.game_state.get_current_decision();

        while (decision !== null) {
            const player = this.game_state.get_player_by_id(decision.player_id);
            if (player.player_type !== PLAYER_TYPES.COMPUTER) {
                return false;
            }

            const resolution = this.choose_decision_resolution(player, decision);
            this.rules_engine.resolve_decision(decision.id, player.id, resolution);

            if (this.game_state.phase === PHASES.GAME_OVER) {
                return true;
            }

            decision = this.game_state.get_current_decision();
        }

        return true;
    }

    take_active_turn() {
        if (this.game_state.phase !== PHASES.PLAY) {
            throw new Error("Computer turn requested outside the Play phase.");
        }

        const player = this.game_state.get_active_player();
        if (player.player_type !== PLAYER_TYPES.COMPUTER) {
            throw new Error(`${player.name} is not a computer player.`);
        }

        let action_guard = 0;
        while (this.game_state.phase === PHASES.PLAY && !player.eliminated) {
            action_guard += 1;
            if (action_guard > 32) {
                throw new Error(`${player.name} exceeded the computer turn action guard.`);
            }

            if (!this.resolve_computer_decisions()) {
                return;
            }

            this.rules_engine.refill_empty_active_hand();
            if (this.game_state.actions_remaining < 1 || player.hand.length === 0) {
                break;
            }

            const selected_card = this.choose_card(player);
            const conversion = this.choose_symbol_conversion(player, selected_card);
            const targets = this.rules_engine.get_legal_targets(player.id, selected_card.instance_id, conversion);
            const target = this.choose_target(player, selected_card, targets);

            this.rules_engine.play_card(
                player.id,
                selected_card.instance_id,
                target,
                conversion
            );
        }

        if (!this.resolve_computer_decisions()) {
            return;
        }

        if (this.game_state.phase === PHASES.PLAY && this.turn_handler.can_end_turn()) {
            this.turn_handler.end_turn(player.id);
        }
    }

    choose_card(player) {
        const scored_cards = player.hand.map((card) => ({
            card,
            score: this.score_card(player, get_card_definition(card.definition_id)),
        }));

        scored_cards.sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            return left.card.instance_id.localeCompare(right.card.instance_id);
        });

        return scored_cards[0].card;
    }

    score_card(player, definition) {
        let score = 10;
        const total_shields = player.defenses.reduce(
            (total, defense) => total + defense.current_shields,
            0
        );

        score += definition.symbols.attack * 5;
        score += definition.symbols.draw * 4;
        score += definition.symbols.play_again * 5;

        if (definition.type === CARD_TYPES.MIGHTY_POWER) {
            score += 7;
        }

        if (definition.symbols.healing > 0) {
            const missing_hp = player.max_hp - player.hp;
            score += Math.min(missing_hp, definition.symbols.healing) * 7;
            if (missing_hp === 0) {
                score -= 12;
            }
        }

        if (definition.symbols.defense > 0) {
            score += definition.symbols.defense * 4;
            if (total_shields === 0) {
                score += 8;
            }
            if (player.hp <= 6) {
                score += 6;
            }
        }

        if (player.hp <= 4 && definition.symbols.healing > 0) {
            score += 18;
        }

        if (definition.type === CARD_TYPES.UTILITY || definition.type === CARD_TYPES.DRAW) {
            score += 3;
        }

        return score;
    }

    choose_symbol_conversion(player, card) {
        const options = this.rules_engine.get_available_symbol_conversions(player.id, card.instance_id);
        if (options.length === 0) {
            return null;
        }

        const definition = get_card_definition(card.definition_id);
        const missing_hp = player.max_hp - player.hp;
        const total_shields = player.defenses.reduce(
            (total, defense) => total + defense.current_shields,
            0
        );

        if (missing_hp >= 4) {
            const healing_option = options.find((option) =>
                option.to === SYMBOL_NAMES.HEALING &&
                definition.symbols[option.from] > 0
            );
            if (healing_option !== undefined) {
                return healing_option;
            }
        }

        if (total_shields === 0 && player.hp <= 8) {
            const defense_option = options.find((option) =>
                option.to === SYMBOL_NAMES.DEFENSE &&
                definition.symbols[option.from] > 0
            );
            if (defense_option !== undefined) {
                return defense_option;
            }
        }

        return null;
    }

    choose_target(player, card, targets) {
        if (targets.length === 0) {
            return null;
        }

        const player_targets = targets.filter((target) => target.type === "player");
        if (player_targets.length > 0) {
            const legal_players = player_targets.map((target) => ({
                target,
                player: this.game_state.get_player_by_id(target.player_id),
            }));

            legal_players.sort((left, right) => {
                if (left.player.hp !== right.player.hp) {
                    return left.player.hp - right.player.hp;
                }
                return left.player.name.localeCompare(right.player.name);
            });

            return legal_players[0].target;
        }

        return targets[0];
    }

    choose_decision_resolution(player, decision) {
        if (decision.type === DECISION_TYPES.DISCARD_CARDS) {
            const scored_cards = player.hand.map((card) => ({
                card,
                score: this.score_card(player, get_card_definition(card.definition_id)),
            }));
            scored_cards.sort((left, right) => left.score - right.score);
            return {
                card_instance_ids: scored_cards
                    .slice(0, decision.count)
                    .map((entry) => entry.card.instance_id),
            };
        }

        if (decision.type === DECISION_TYPES.RECLAIM_DEFENSE) {
            return {
                card_instance_id: decision.card_instance_ids[0],
            };
        }

        if (decision.type === DECISION_TYPES.LOVE_OR_HATE) {
            return {
                choice: player.hp <= 4 ? "love" : "hate",
            };
        }

        if (decision.type === DECISION_TYPES.SCREEN_BURN_TARGET) {
            const targets = decision.target_player_ids.map((player_id) =>
                this.game_state.get_player_by_id(player_id)
            );
            const target = this.choose_lowest_hp_player(targets);
            return {
                target_player_id: target.id,
            };
        }

        if (decision.type === DECISION_TYPES.RAID_PALADIN_ACTION) {
            if (player.hp <= 7) {
                return {
                    action: "heal",
                };
            }

            const targets = decision.target_player_ids.map((player_id) =>
                this.game_state.get_player_by_id(player_id)
            ).filter(target => !target.eliminated);
            if (targets.length === 0) return {action: "heal"};
            const target = this.choose_lowest_hp_player(targets);
            return {
                action: "attack",
                target_player_id: target.id,
            };
        }

        throw new Error(`Computer player cannot resolve decision type: ${decision.type}`);
    }

    choose_lowest_hp_player(players) {
        if (players.length === 0) {
            throw new Error("Computer player has no legal opponent to evaluate.");
        }

        const sorted_players = [...players].sort((left, right) => {
            if (left.hp !== right.hp) {
                return left.hp - right.hp;
            }
            return left.name.localeCompare(right.name);
        });

        return sorted_players[0];
    }
}
