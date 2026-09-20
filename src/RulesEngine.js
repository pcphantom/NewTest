/* =====================================================================
   RulesEngine
   Owns: card legality, damage, healing, card effects, signature abilities.
   Stays out of: turn rotation, DOM rendering, setup form behavior.
   ===================================================================== */

import {
    AGGRESSIVE_POSITIONING_DRAW_COUNT,
    BACK_IN_MY_DAY_ATTACK_REDUCTION,
    BLESSING_OF_KINGS_ATTACK_BONUS,
    BLESSING_OF_KINGS_SHIELD_BONUS,
    BLOCK_THIS_DAMAGE,
    BORING_STORY_DC,
    BORING_STORY_DISCARD_COUNT,
    BUBBLE_HEARTH_END_HP,
    CARD_TYPES,
    CHIP_DAMAGE_IMMUNITY_THRESHOLD,
    CRT_SCREEN_FLICKER_DAMAGE,
    DECISION_TYPES,
    DEVELOPERS_FAVORITE_HP,
    DIVINE_SHIELD_HEALING,
    EFFECT_IDS,
    EMPTY_HAND_DRAW_COUNT,
    FACE_TANK_HEALING,
    FLOPPY_DISK_DISCARD_COUNT,
    IGNORE_PAIN_ATTACK_REDUCTION,
    LOOKING_FOR_GROUP_OPPONENT_DRAW,
    LOOKING_FOR_GROUP_SELF_DRAW,
    LOVE_ME_OR_HATE_ME_DAMAGE,
    LOVE_ME_OR_HATE_ME_HEALING,
    MIN_DAMAGE_AFTER_REDUCTION,
    MONOCHROME_LECTURE_DAMAGE,
    MONOCHROME_LECTURE_DC,
    NERF_INCOMING_ATTACK_REDUCTION,
    NERF_INCOMING_START_TURN_DAMAGE,
    PHASES,
    RAID_PALADIN_ATTACK_DAMAGE,
    RAID_PALADIN_COUNT,
    RAID_PALADIN_HEALING,
    RAID_PALADIN_HP,
    SCREEN_BURN_DAMAGE,
    SECOND_WIND_TRIGGER_HP,
    SHIELD_BASH_BONUS_DAMAGE,
    SYMBOL_NAMES,
    TANK_SPECS_BONUS_SHIELDS,
    TARGET_MODES,
    TARGET_TYPES,
    VENGEANCE_REFLECT_DAMAGE,
} from "./Constants.js";
import { get_card_definition } from "./CardData.js";

const PLAYER_TARGET_EFFECTS = new Set([
    EFFECT_IDS.BACK_IN_MY_DAY,
    EFFECT_IDS.BORING_STORY,
    EFFECT_IDS.LOADING_PLEASE_WAIT,
    EFFECT_IDS.PHOSPHOR_BURN,
    EFFECT_IDS.AGGRESSIVE_POSITIONING,
    EFFECT_IDS.MOCKING_BLOW,
    EFFECT_IDS.NERF_INCOMING,
    EFFECT_IDS.WAKE_OF_ASHES,
]);

export class RulesEngine {
    constructor(game_state, dice_handler) {
        if (typeof game_state !== "object" || game_state === null) {
            throw new TypeError("RulesEngine requires a GameState instance.");
        }
        if (typeof dice_handler !== "object" || dice_handler === null) {
            throw new TypeError("RulesEngine requires a DiceHandler instance.");
        }

        this.game_state = game_state;
        this.dice_handler = dice_handler;
        this.deck_handler = game_state.deck_handler;
    }

    get_card_from_hand(player, card_instance_id) {
        const card = player.hand.find((candidate) => candidate.instance_id === card_instance_id);
        if (card === undefined) {
            throw new Error(`${player.name} does not have ${card_instance_id} in hand.`);
        }

        return card;
    }

    get_available_symbol_conversions(player_id, card_instance_id) {
        const player = this.game_state.get_player_by_id(player_id);
        const card = this.get_card_from_hand(player, card_instance_id);
        const definition = get_card_definition(card.definition_id);

        if (definition.skill?.id !== 'can_do_everything') {
            return [];
        }

        const convertible_names = [
            SYMBOL_NAMES.ATTACK,
            SYMBOL_NAMES.DEFENSE,
            SYMBOL_NAMES.HEALING,
        ];
        const conversions = [];

        for (const source_name of convertible_names) {
            if (definition.symbols[source_name] === 0) {
                continue;
            }

            for (const destination_name of convertible_names) {
                if (source_name === destination_name) {
                    continue;
                }

                conversions.push({ from: source_name, to: destination_name });
            }
        }

        return conversions;
    }

    get_effective_symbols(player, definition, symbol_conversion) {
        const effective_symbols = {
            attack: definition.symbols.attack,
            defense: definition.symbols.defense,
            healing: definition.symbols.healing,
            draw: definition.symbols.draw,
            play_again: definition.symbols.play_again,
        };

        if (symbol_conversion === null) {
            return effective_symbols;
        }

        if (definition.skill?.id !== 'can_do_everything') {
            throw new Error("Can Do Everything only applies to the Judgment card carrying that skill.");
        }

        const valid_names = [SYMBOL_NAMES.ATTACK, SYMBOL_NAMES.DEFENSE, SYMBOL_NAMES.HEALING];
        if (!valid_names.includes(symbol_conversion.from) || !valid_names.includes(symbol_conversion.to)) {
            throw new Error("Can Do Everything only converts Attack, Defense, or Healing symbols.");
        }
        if (symbol_conversion.from === symbol_conversion.to) {
            throw new Error("A symbol conversion must change the symbol type.");
        }
        if (effective_symbols[symbol_conversion.from] < 1) {
            throw new Error(`${definition.name} has no ${symbol_conversion.from} symbol to convert.`);
        }

        effective_symbols[symbol_conversion.from] -= 1;
        effective_symbols[symbol_conversion.to] += 1;
        return effective_symbols;
    }

    get_legal_targets(player_id, card_instance_id, symbol_conversion) {
        const player = this.game_state.get_player_by_id(player_id);
        const card = this.get_card_from_hand(player, card_instance_id);
        const definition = get_card_definition(card.definition_id);
        const effective_symbols = this.get_effective_symbols(player, definition, symbol_conversion);

        if (definition.target_mode === TARGET_MODES.ALL_OPPONENTS && definition.effect_id !== EFFECT_IDS.WAKE_OF_ASHES) {
            return [];
        }

        const needs_player_target = PLAYER_TARGET_EFFECTS.has(definition.effect_id);
        const has_single_target_attack = effective_symbols.attack > 0;
        const requires_opponent = definition.target_mode === TARGET_MODES.OPPONENT || has_single_target_attack || needs_player_target;

        if (!requires_opponent) {
            return [];
        }

        if (has_single_target_attack && definition.target_mode !== TARGET_MODES.ALL_OPPONENTS && player.forced_attack_target_player_id !== null) {
            const forced_player = this.game_state.get_player_by_id(player.forced_attack_target_player_id);
            if (!forced_player.eliminated) {
                return [{
                    type: TARGET_TYPES.PLAYER,
                    player_id: forced_player.id,
                    label: `${forced_player.name} (forced target)`,
                }];
            }
        }

        const targets = [];
        let opponents = this.game_state.get_living_opponents(player.id);
        const living_players = this.game_state.get_living_players();
        if (living_players.length >= 5 && has_single_target_attack && definition.type !== CARD_TYPES.MIGHTY_POWER && definition.target_mode !== TARGET_MODES.ALL_OPPONENTS) {
            const seat = living_players.findIndex(candidate => candidate.id === player.id);
            const adjacent_ids = [
                living_players[(seat + living_players.length - 1) % living_players.length].id,
                living_players[(seat + 1) % living_players.length].id,
            ];
            opponents = opponents.filter(opponent => adjacent_ids.includes(opponent.id));
        }

        for (const opponent of opponents) {
            targets.push({
                type: TARGET_TYPES.PLAYER,
                player_id: opponent.id,
                label: opponent.name,
            });

            if (!needs_player_target && has_single_target_attack) {
                for (const summon of opponent.summons) {
                    targets.push({
                        type: TARGET_TYPES.SUMMON,
                        player_id: opponent.id,
                        summon_id: summon.id,
                        label: `${opponent.name}'s ${summon.name} (${summon.hp} HP)`,
                    });
                }
            }
        }

        return targets;
    }

    play_card(player_id, card_instance_id, target, symbol_conversion) {
        const player = this.game_state.get_player_by_id(player_id);
        if (this.game_state.phase !== PHASES.PLAY) {
            throw new Error("Cards can only be played during the Play phase.");
        }
        if (this.game_state.get_active_player().id !== player.id) {
            throw new Error(`${player.name} is not the active player.`);
        }
        if (this.game_state.get_current_decision() !== null) {
            throw new Error("Resolve the pending decision before playing another card.");
        }
        if (this.game_state.actions_remaining < 1) {
            throw new Error(`${player.name} has no action available.`);
        }

        const card = this.get_card_from_hand(player, card_instance_id);
        const definition = get_card_definition(card.definition_id);
        const effective_symbols = this.get_effective_symbols(player, definition, symbol_conversion);
        this.validate_target(player, card, target, symbol_conversion);

        const card_index = player.hand.findIndex((candidate) => candidate.instance_id === card.instance_id);
        player.hand.splice(card_index, 1);
        this.game_state.actions_remaining -= 1;
        player.cards_played_this_turn += 1;
        player.last_played_card_definition_id = definition.id;

        if (symbol_conversion !== null) {
            this.game_state.add_event(`${player.name} used Can Do Everything: ${symbol_conversion.from} became ${symbol_conversion.to}.`, "ability");
        }

        this.game_state.add_event(`${player.name} played ${definition.name}.`, "card");
        const hp_before_card = player.hp;
        this.trigger_phosphor_burn(player);

        const damaged_player_ids = this.resolve_base_symbols(player, card, definition, effective_symbols, target);
        this.resolve_special_effect(player, card, definition, target);
        if (!player.eliminated) this.resolve_card_skill(player, definition, target, hp_before_card);

        const card_persists_as_defense = effective_symbols.defense > 0;
        if (!card_persists_as_defense) {
            this.deck_handler.discard_card_instance(player, card);
        }

        if (definition.skill?.id === 'screen_burn_in' && damaged_player_ids.length > 0 && !player.eliminated) {
            this.enqueue_screen_burn_decision(player, damaged_player_ids);
        }

        this.check_game_over();
        this.refill_empty_active_hand();
    }

    refill_empty_active_hand() {
        if (this.game_state.phase !== PHASES.PLAY || this.game_state.actions_remaining < 1 || this.game_state.get_current_decision() !== null) return;
        const player = this.game_state.get_active_player();
        if (player.eliminated || player.hand.length > 0) return;
        const drawn = this.deck_handler.draw_cards(player, EMPTY_HAND_DRAW_COUNT);
        this.game_state.add_event(`${player.name} drew ${drawn.length} cards because a mandatory play remained with an empty hand.`, "draw");
    }

    validate_target(player, card, target, symbol_conversion) {
        const legal_targets = this.get_legal_targets(player.id, card.instance_id, symbol_conversion);
        const definition = get_card_definition(card.definition_id);
        const effective_symbols = this.get_effective_symbols(player, definition, symbol_conversion);
        const requires_target = definition.target_mode === TARGET_MODES.OPPONENT || definition.effect_id === EFFECT_IDS.WAKE_OF_ASHES ||
            (effective_symbols.attack > 0 && definition.target_mode !== TARGET_MODES.ALL_OPPONENTS);

        if (!requires_target) {
            if (target !== null) {
                throw new Error(`${definition.name} does not accept a target.`);
            }
            return;
        }

        if (target === null) {
            throw new Error(`${definition.name} requires a target.`);
        }

        const target_is_legal = legal_targets.some((legal_target) => {
            if (legal_target.type !== target.type || legal_target.player_id !== target.player_id) {
                return false;
            }
            if (legal_target.type === TARGET_TYPES.SUMMON) {
                return legal_target.summon_id === target.summon_id;
            }
            return true;
        });

        if (!target_is_legal) {
            throw new Error(`Illegal target for ${definition.name}.`);
        }
    }

    resolve_base_symbols(player, card, definition, effective_symbols, target) {
        const damaged_player_ids = [];

        if (effective_symbols.attack > 0) {
            const attack_result = this.resolve_attack(player, definition, effective_symbols.attack, target);
            damaged_player_ids.push(...attack_result.damaged_player_ids);
        }

        if (effective_symbols.defense > 0) {
            this.create_defense(player, card, definition, effective_symbols.defense);
        }

        if (effective_symbols.healing > 0) {
            this.heal_player(player.id, effective_symbols.healing, definition.name);
        }

        if (effective_symbols.draw > 0) {
            this.deck_handler.draw_cards(player, effective_symbols.draw);
            this.game_state.add_event(`${player.name} drew ${effective_symbols.draw} card(s).`, "draw");
        }

        if (effective_symbols.play_again > 0) {
            this.grant_play_again(player, effective_symbols.play_again);
        }

        return damaged_player_ids;
    }

    resolve_attack(player, definition, base_damage, target) {
        let attack_damage = base_damage;

        if (this.is_timed_effect_active(player.blessing_of_kings_activated_turn)) {
            attack_damage += BLESSING_OF_KINGS_ATTACK_BONUS;
        }

        if (definition.effect_id === EFFECT_IDS.SHIELD_BASH && player.defenses.length > 0) {
            attack_damage += SHIELD_BASH_BONUS_DAMAGE;
        }

        if (player.outgoing_attack_reductions.length > 0) {
            let reduction_total = 0;
            for (const reduction of player.outgoing_attack_reductions) {
                reduction_total += reduction.amount;
            }
            player.outgoing_attack_reductions = [];
            attack_damage = Math.max(MIN_DAMAGE_AFTER_REDUCTION, attack_damage - reduction_total);
            this.game_state.add_event(`${player.name}'s attack was reduced by ${reduction_total}.`, "status");
        }

        const damaged_player_ids = [];

        if (definition.target_mode === TARGET_MODES.ALL_OPPONENTS) {
            const opponents = this.game_state.get_living_opponents(player.id);
            for (const opponent of opponents) {
                this.apply_damage_to_player(opponent.id, attack_damage, player.id, {
                    is_attack: true,
                    is_dice_attack: false,
                    source_name: definition.name,
                });
                damaged_player_ids.push(opponent.id);
            }
        } else {
            if (target.type === TARGET_TYPES.PLAYER) {
                this.apply_damage_to_player(target.player_id, attack_damage, player.id, {
                    is_attack: true,
                    is_dice_attack: false,
                    source_name: definition.name,
                });
                damaged_player_ids.push(target.player_id);
            } else if (target.type === TARGET_TYPES.SUMMON) {
                this.apply_damage_to_summon(target.player_id, target.summon_id, attack_damage, player.id, definition.name);
            } else {
                throw new Error(`Unknown target type: ${target.type}`);
            }
        }

        this.consume_forced_attack_if_needed(player, definition);
        return { damaged_player_ids };
    }

    consume_forced_attack_if_needed(attacker, definition) {
        if (attacker.forced_attack_target_player_id === null) {
            return;
        }

        const forced_target = this.game_state.get_player_by_id(attacker.forced_attack_target_player_id);
        const attack_included_forced_target = definition.target_mode === TARGET_MODES.ALL_OPPONENTS || !forced_target.eliminated;
        if (!attack_included_forced_target) {
            return;
        }

        const reward_source_player_id = attacker.forced_attack_draw_reward_source_player_id;
        attacker.forced_attack_target_player_id = null;
        attacker.forced_attack_draw_reward_source_player_id = null;

        if (reward_source_player_id !== null) {
            const reward_source = this.game_state.get_player_by_id(reward_source_player_id);
            if (!reward_source.eliminated) {
                this.deck_handler.draw_cards(reward_source, AGGRESSIVE_POSITIONING_DRAW_COUNT);
                this.game_state.add_event(`${reward_source.name} drew ${AGGRESSIVE_POSITIONING_DRAW_COUNT} card from Aggressive Positioning.`, "draw");
            }
        }
    }

    create_defense(player, card, definition, base_shields) {
        let shield_count = base_shields;

        if (this.is_timed_effect_active(player.tank_specs_activated_turn)) {
            shield_count += TANK_SPECS_BONUS_SHIELDS;
        }
        if (this.is_timed_effect_active(player.blessing_of_kings_activated_turn)) {
            shield_count += BLESSING_OF_KINGS_SHIELD_BONUS;
        }

        player.defenses.push({
            card,
            effect_id: definition.effect_id,
            name: definition.name,
            current_shields: shield_count,
            max_shields: shield_count,
            played_turn_number: this.game_state.turn_number,
        });
        this.game_state.add_event(`${player.name} gained ${shield_count} shield(s) from ${definition.name}.`, "defense");
    }

    grant_play_again(player, play_again_count) {
        let skipped_count = 0;
        let granted_count = play_again_count;

        if (player.skip_next_play_again_count > 0) {
            skipped_count = Math.min(player.skip_next_play_again_count, granted_count);
            player.skip_next_play_again_count -= skipped_count;
            granted_count -= skipped_count;
        }

        if (skipped_count > 0) {
            this.game_state.add_event(`${player.name} lost ${skipped_count} Play Again action(s) to a card's disruption effect.`, "status");
        }

        if (granted_count > 0) {
            this.game_state.actions_remaining += granted_count;
            this.game_state.add_event(`${player.name} gained ${granted_count} Play Again action(s).`, "action");
        }
    }

    resolve_special_effect(player, card, definition, target) {
        switch (definition.effect_id) {
            case EFFECT_IDS.STANDARD:
            case EFFECT_IDS.CRT_SCREEN_FLICKER:
            case EFFECT_IDS.GRAYSCALE_BOMB:
            case EFFECT_IDS.MONOCHROME_SHIELD:
            case EFFECT_IDS.SCREEN_SAVER:
            case EFFECT_IDS.BLOCK_THIS:
            case EFFECT_IDS.FACE_TANK:
            case EFFECT_IDS.INSPIRING_PRESENCE:
            case EFFECT_IDS.SHIELD_BASH:
            case EFFECT_IDS.SHIELD_WALL:
            case EFFECT_IDS.STAND_YOUR_GROUND:
            case EFFECT_IDS.BUBBLE_HEARTH:
            case EFFECT_IDS.DIVINE_SHIELD:
            case EFFECT_IDS.DIVINE_STORM:
            case EFFECT_IDS.HAND_OF_PROTECTION:
                return;
            case EFFECT_IDS.DIVINE_INTERVENTION: {
                const sacrificed = player.defenses.splice(0);
                for (const defense of sacrificed) this.deck_handler.discard_card_instance(player, defense.card);
                this.game_state.add_event(`${player.name} sacrificed ${sacrificed.length} Defense cards to Divine Intervention.`, "defense");
                this.heal_player(player.id, player.max_hp, definition.name);
                return;
            }
            case EFFECT_IDS.WAKE_OF_ASHES: {
                const opponent = this.game_state.get_player_by_id(target.player_id);
                if (!opponent.eliminated) {
                    opponent.skip_next_play_again_count += 1;
                    this.game_state.add_event(`${opponent.name}'s next Play Again action is cancelled by Wake of Ashes.`, "status");
                }
                return;
            }
            case EFFECT_IDS.BACK_IN_MY_DAY:
                this.apply_outgoing_attack_reduction(target.player_id, BACK_IN_MY_DAY_ATTACK_REDUCTION, definition.name);
                return;
            case EFFECT_IDS.BORING_STORY:
                this.resolve_boring_story(player, target.player_id);
                return;
            case EFFECT_IDS.FLOPPY_DISK_OF_POWER:
                this.enqueue_forced_discards(player.id, FLOPPY_DISK_DISCARD_COUNT, definition.name);
                return;
            case EFFECT_IDS.LOADING_PLEASE_WAIT:
                this.game_state.get_player_by_id(target.player_id).skip_next_turn_after_draw = true;
                this.game_state.add_event(`${this.game_state.get_player_by_id(target.player_id).name} will lose their next turn after drawing.`, "status");
                return;
            case EFFECT_IDS.PHOSPHOR_BURN:
                this.apply_phosphor_burn(player.id, target.player_id);
                return;
            case EFFECT_IDS.THE_OLDEN_DAYS:
                this.resolve_the_olden_days(player.id);
                return;
            case EFFECT_IDS.AGGRESSIVE_POSITIONING:
                this.force_attack_target(target.player_id, player.id, player.id);
                return;
            case EFFECT_IDS.COOLDOWN_READY:
                this.enqueue_reclaim_defense(player);
                return;
            case EFFECT_IDS.IGNORE_PAIN:
                player.incoming_attack_reductions.push({ amount: IGNORE_PAIN_ATTACK_REDUCTION, source_name: definition.name });
                this.game_state.add_event(`${player.name}'s next incoming attack is reduced by ${IGNORE_PAIN_ATTACK_REDUCTION}.`, "status");
                return;
            case EFFECT_IDS.LOOKING_FOR_GROUP:
                this.resolve_looking_for_group(player.id);
                return;
            case EFFECT_IDS.MOCKING_BLOW:
                this.force_attack_target(target.player_id, player.id, null);
                return;
            case EFFECT_IDS.TANK_SPECS:
                player.tank_specs_activated_turn = this.game_state.turn_number;
                this.game_state.add_event(`${player.name}'s Defense cards gain 1 shield until their next turn.`, "status");
                return;
            case EFFECT_IDS.VENGEANCE:
                player.vengeance_activated_turn = this.game_state.turn_number;
                this.game_state.add_event(`${player.name} will reflect 1 damage from attacks until their next turn.`, "status");
                return;
            case EFFECT_IDS.ALL_PALADIN_RAID:
                this.summon_raid_paladins(player.id);
                return;
            case EFFECT_IDS.BLESSING_OF_KINGS:
                player.blessing_of_kings_activated_turn = this.game_state.turn_number;
                this.game_state.add_event(`${player.name} gained Blessing of Kings until their next turn.`, "status");
                return;
            case EFFECT_IDS.LAY_ON_HANDS:
                this.resolve_lay_on_hands(player.id);
                return;
            case EFFECT_IDS.LOVE_ME_OR_HATE_ME:
                this.enqueue_love_or_hate(player.id);
                return;
            case EFFECT_IDS.NERF_INCOMING:
                this.apply_nerf_incoming(player.id, target.player_id);
                return;
            default:
                throw new Error(`Unhandled effect id: ${definition.effect_id}`);
        }
    }

    resolve_boring_story(source_player, target_player_id) {
        const target_player = this.game_state.get_player_by_id(target_player_id);
        const roll = this.dice_handler.roll_d20();
        const succeeded = roll === 20 || (roll !== 1 && roll >= BORING_STORY_DC);
        this.game_state.add_event(`${target_player.name}: d20 ${roll} vs Boring Story DC ${BORING_STORY_DC}. Save ${succeeded ? 'succeeded' : 'failed'}.`, "dice");

        if (succeeded) {
            this.game_state.add_event(`${target_player.name} resisted Boring Story.`, "status");
            return;
        }

        this.enqueue_discard_decision(source_player.id, target_player.id, BORING_STORY_DISCARD_COUNT, "Boring Story");
    }

    resolve_the_olden_days(source_player_id) {
        const living_players = this.game_state.get_living_players();

        for (const player of living_players) {
            while (player.hand.length > 0) {
                const card = player.hand.pop();
                player.discard.push(card);
            }
        }

        for (const player of living_players) {
            const draw_count = player.id === source_player_id ? 5 : 3;
            this.deck_handler.draw_cards(player, draw_count);
        }

        this.game_state.add_event("The Olden Days replaced every living player's hand.", "card");
    }

    resolve_looking_for_group(source_player_id) {
        const source_player = this.game_state.get_player_by_id(source_player_id);
        const opponents = this.game_state.get_living_opponents(source_player_id);

        for (const opponent of opponents) {
            this.deck_handler.draw_cards(opponent, LOOKING_FOR_GROUP_OPPONENT_DRAW);
        }
        this.deck_handler.draw_cards(source_player, LOOKING_FOR_GROUP_SELF_DRAW);
        this.game_state.add_event(`${source_player.name} drew ${LOOKING_FOR_GROUP_SELF_DRAW} cards; each opponent drew ${LOOKING_FOR_GROUP_OPPONENT_DRAW}.`, "draw");
    }

    resolve_lay_on_hands(player_id) {
        const roll = this.dice_handler.roll_d6();
        this.game_state.add_event(`${this.game_state.get_player_by_id(player_id).name} rolled ${roll} on Lay on Hands.`, "dice");
        this.heal_player(player_id, roll, "Lay on Hands d6");
    }

    apply_outgoing_attack_reduction(target_player_id, amount, source_name) {
        const target = this.game_state.get_player_by_id(target_player_id);
        target.outgoing_attack_reductions.push({ amount, source_name });
        this.game_state.add_event(`${target.name}'s next attack is reduced by ${amount}.`, "status");
    }

    apply_nerf_incoming(source_player_id, target_player_id) {
        this.apply_outgoing_attack_reduction(target_player_id, NERF_INCOMING_ATTACK_REDUCTION, "Nerf Incoming");
        const target = this.game_state.get_player_by_id(target_player_id);
        target.start_turn_damage_effects.push({
            amount: NERF_INCOMING_START_TURN_DAMAGE,
            source_player_id,
            source_name: "Nerf Incoming",
        });
    }

    apply_phosphor_burn(source_player_id, target_player_id) {
        const target = this.game_state.get_player_by_id(target_player_id);
        if (!target.phosphor_burn_source_player_ids.includes(source_player_id)) {
            target.phosphor_burn_source_player_ids.push(source_player_id);
        }
        this.game_state.add_event(`${target.name} is affected by Phosphor Burn.`, "status");
    }

    trigger_phosphor_burn(player) {
        const active_sources = [...player.phosphor_burn_source_player_ids];
        for (const source_player_id of active_sources) {
            const source_player = this.game_state.get_player_by_id(source_player_id);
            if (source_player.eliminated) {
                continue;
            }
            this.apply_damage_to_player(player.id, 1, source_player.id, {
                is_attack: false,
                is_dice_attack: false,
                source_name: "Phosphor Burn",
            });
        }
    }

    force_attack_target(target_player_id, forced_target_player_id, draw_reward_source_player_id) {
        const target = this.game_state.get_player_by_id(target_player_id);
        const forced_target = this.game_state.get_player_by_id(forced_target_player_id);
        target.forced_attack_target_player_id = forced_target.id;
        target.forced_attack_draw_reward_source_player_id = draw_reward_source_player_id;
        this.game_state.add_event(`${target.name}'s next attack must target ${forced_target.name} if able.`, "status");
    }

    enqueue_forced_discards(source_player_id, discard_count, source_name) {
        const opponents = this.game_state.get_living_opponents(source_player_id);
        for (const opponent of opponents) {
            this.enqueue_discard_decision(source_player_id, opponent.id, discard_count, source_name);
        }
    }

    enqueue_discard_decision(source_player_id, target_player_id, requested_count, source_name) {
        const target = this.game_state.get_player_by_id(target_player_id);
        const has_stand_your_ground = target.defenses.some((defense) => defense.effect_id === EFFECT_IDS.STAND_YOUR_GROUND);
        if (has_stand_your_ground) {
            this.game_state.add_event(`${target.name} ignored forced discard because Stand Your Ground is active.`, "defense");
            return;
        }
        if (target.hand.length === 0) {
            this.game_state.add_event(`${target.name} has no cards to discard.`, "status");
            return;
        }

        const discard_count = Math.min(requested_count, target.hand.length);
        this.game_state.enqueue_decision({
            type: DECISION_TYPES.DISCARD_CARDS,
            source_player_id,
            player_id: target.id,
            count: discard_count,
            source_name,
        });
    }

    enqueue_reclaim_defense(player) {
        const defense_cards = player.discard.filter((card) => get_card_definition(card.definition_id).type === CARD_TYPES.DEFENSE);
        if (defense_cards.length === 0) {
            this.game_state.add_event(`${player.name} has no Defense card in the discard pile for Cooldown Ready.`, "status");
            return;
        }

        this.game_state.enqueue_decision({
            type: DECISION_TYPES.RECLAIM_DEFENSE,
            player_id: player.id,
            card_instance_ids: defense_cards.map((card) => card.instance_id),
            source_name: "Cooldown Ready!",
        });
    }

    enqueue_love_or_hate(source_player_id) {
        const opponents = this.game_state.get_living_opponents(source_player_id);
        const group_id = this.game_state.create_group_id("love_hate");
        this.game_state.love_hate_hate_counts.set(group_id, 0);

        for (const opponent of opponents) {
            this.game_state.enqueue_decision({
                type: DECISION_TYPES.LOVE_OR_HATE,
                player_id: opponent.id,
                source_player_id,
                group_id,
                source_name: "Love Me or Hate Me",
            });
        }

        if (opponents.length === 0) {
            this.game_state.love_hate_hate_counts.delete(group_id);
        }
    }

    enqueue_screen_burn_decision(source_player, damaged_player_ids) {
        const unique_ids = [...new Set(damaged_player_ids)].filter((player_id) => !this.game_state.get_player_by_id(player_id).eliminated);
        if (unique_ids.length === 0) {
            return;
        }

        this.game_state.enqueue_decision({
            type: DECISION_TYPES.SCREEN_BURN_TARGET,
            player_id: source_player.id,
            target_player_ids: unique_ids,
            source_name: "Screen Burn-In",
        });
    }

    summon_raid_paladins(player_id) {
        for (let summon_number = 0; summon_number < RAID_PALADIN_COUNT; summon_number += 1) {
            this.game_state.create_summon(player_id, "Raid Paladin", RAID_PALADIN_HP);
        }
        this.game_state.add_event(`${this.game_state.get_player_by_id(player_id).name} summoned ${RAID_PALADIN_COUNT} Raid Paladins.`, "summon");
    }

    resolve_decision(decision_id, acting_player_id, resolution) {
        const decision = this.game_state.get_current_decision();
        if (decision === null) {
            throw new Error("There is no pending decision.");
        }
        if (decision.id !== decision_id) {
            throw new Error(`Expected decision ${decision.id}, received ${decision_id}.`);
        }
        if (decision.player_id !== acting_player_id) {
            throw new Error(`${acting_player_id} cannot resolve a decision for ${decision.player_id}.`);
        }

        switch (decision.type) {
            case DECISION_TYPES.DISCARD_CARDS:
                this.resolve_discard_decision(decision, resolution);
                break;
            case DECISION_TYPES.RECLAIM_DEFENSE:
                this.resolve_reclaim_defense_decision(decision, resolution);
                break;
            case DECISION_TYPES.LOVE_OR_HATE:
                this.resolve_love_or_hate_decision(decision, resolution);
                break;
            case DECISION_TYPES.SCREEN_BURN_TARGET:
                this.resolve_screen_burn_decision(decision, resolution);
                break;
            case DECISION_TYPES.RAID_PALADIN_ACTION:
                this.resolve_raid_paladin_decision(decision, resolution);
                break;
            default:
                throw new Error(`Unhandled decision type: ${decision.type}`);
        }

        this.game_state.complete_current_decision(decision.id);
        this.finalize_decision_group_if_needed(decision);
        this.check_game_over();
        this.refill_empty_active_hand();
    }

    resolve_discard_decision(decision, resolution) {
        if (!Array.isArray(resolution.card_instance_ids)) {
            throw new Error("Discard decision requires card_instance_ids.");
        }
        if (resolution.card_instance_ids.length !== decision.count) {
            throw new Error(`Discard decision requires exactly ${decision.count} card(s).`);
        }

        const unique_ids = new Set(resolution.card_instance_ids);
        if (unique_ids.size !== resolution.card_instance_ids.length) {
            throw new Error("Discard decision contains duplicate card ids.");
        }

        const player = this.game_state.get_player_by_id(decision.player_id);
        for (const card_instance_id of resolution.card_instance_ids) {
            this.deck_handler.discard_card_from_hand(player, card_instance_id);
        }
        this.game_state.add_event(`${player.name} discarded ${decision.count} card(s) to ${decision.source_name}.`, "discard");
    }

    resolve_reclaim_defense_decision(decision, resolution) {
        if (typeof resolution.card_instance_id !== "string") {
            throw new Error("Reclaim Defense decision requires card_instance_id.");
        }
        if (!decision.card_instance_ids.includes(resolution.card_instance_id)) {
            throw new Error("Selected card is not an eligible Defense card.");
        }

        const player = this.game_state.get_player_by_id(decision.player_id);
        const card = this.deck_handler.move_discard_to_hand(player, resolution.card_instance_id);
        this.game_state.add_event(`${player.name} returned ${get_card_definition(card.definition_id).name} to hand.`, "card");
    }

    resolve_love_or_hate_decision(decision, resolution) {
        if (resolution.choice !== "love" && resolution.choice !== "hate") {
            throw new Error("Love Me or Hate Me requires a love or hate choice.");
        }

        const chooser = this.game_state.get_player_by_id(decision.player_id);
        const source = this.game_state.get_player_by_id(decision.source_player_id);

        if (resolution.choice === "love") {
            this.heal_player(source.id, LOVE_ME_OR_HATE_ME_HEALING, "Love Me or Hate Me");
            this.game_state.add_event(`${chooser.name} chose Love.`, "choice");
        } else {
            this.apply_damage_to_player(chooser.id, LOVE_ME_OR_HATE_ME_DAMAGE, source.id, {
                is_attack: false,
                is_dice_attack: false,
                source_name: "Love Me or Hate Me",
            });
            const current_count = this.game_state.love_hate_hate_counts.get(decision.group_id);
            if (current_count === undefined) {
                throw new Error(`Missing Love Me or Hate Me group: ${decision.group_id}`);
            }
            this.game_state.love_hate_hate_counts.set(decision.group_id, current_count + 1);
            this.game_state.add_event(`${chooser.name} chose Hate.`, "choice");
        }
    }

    resolve_screen_burn_decision(decision, resolution) {
        if (resolution.skip === true) {
            this.game_state.add_event(`${this.game_state.get_player_by_id(decision.player_id).name} skipped Screen Burn-In.`, "ability");
            return;
        }
        if (typeof resolution.target_player_id !== "string") {
            throw new Error("Screen Burn-In requires a target or skip=true.");
        }
        if (!decision.target_player_ids.includes(resolution.target_player_id)) {
            throw new Error("Screen Burn-In target was not damaged by the spell.");
        }

        this.apply_damage_to_player(resolution.target_player_id, SCREEN_BURN_DAMAGE, decision.player_id, {
            is_attack: false,
            is_dice_attack: false,
            source_name: "Screen Burn-In",
        });
    }

    resolve_raid_paladin_decision(decision, resolution) {
        const owner = this.game_state.get_player_by_id(decision.player_id);
        this.game_state.get_summon(owner.id, decision.summon_id);

        if (resolution.action === "heal") {
            this.heal_player(owner.id, RAID_PALADIN_HEALING, "Raid Paladin");
            return;
        }

        if (resolution.action !== "attack" || typeof resolution.target_player_id !== "string") {
            throw new Error("Raid Paladin decision requires heal or attack with a target_player_id.");
        }
        if (!decision.target_player_ids.includes(resolution.target_player_id) || this.game_state.get_player_by_id(resolution.target_player_id).eliminated) {
            throw new Error("Raid Paladin target is not legal.");
        }

        this.apply_damage_to_player(resolution.target_player_id, RAID_PALADIN_ATTACK_DAMAGE, owner.id, {
            is_attack: true,
            is_dice_attack: false,
            source_name: "Raid Paladin",
        });
    }

    finalize_decision_group_if_needed(completed_decision) {
        if (completed_decision.type !== DECISION_TYPES.LOVE_OR_HATE) {
            return;
        }

        const more_group_decisions = this.game_state.pending_decisions.some((decision) => decision.group_id === completed_decision.group_id);
        if (more_group_decisions) {
            return;
        }

        const hate_count = this.game_state.love_hate_hate_counts.get(completed_decision.group_id);
        if (hate_count === undefined) {
            throw new Error(`Missing Love Me or Hate Me group: ${completed_decision.group_id}`);
        }

        this.game_state.love_hate_hate_counts.delete(completed_decision.group_id);
        if (hate_count > 0) {
            const source = this.game_state.get_player_by_id(completed_decision.source_player_id);
            this.deck_handler.draw_cards(source, hate_count);
            this.game_state.add_event(`${source.name} drew ${hate_count} card(s) from Hate choices.`, "draw");
        }
    }

    on_start_turn(player_id) {
        const player = this.game_state.get_player_by_id(player_id);
        this.expire_effects_sourced_by_player(player.id);
        this.expire_self_timed_effects(player);

        player.cards_played_this_turn = 0;

        const start_turn_effects = [...player.start_turn_damage_effects];
        player.start_turn_damage_effects = [];
        for (const effect of start_turn_effects) {
            this.apply_damage_to_player(player.id, effect.amount, effect.source_player_id, {
                is_attack: false,
                is_dice_attack: false,
                source_name: effect.source_name,
            });
            if (player.eliminated) {
                break;
            }
        }

        if (!player.eliminated) {
            const opponents = this.game_state.get_living_opponents(player.id);
            const target_player_ids = opponents.map((opponent) => opponent.id);
            for (const summon of player.summons) {
                this.game_state.enqueue_decision({
                    type: DECISION_TYPES.RAID_PALADIN_ACTION,
                    player_id: player.id,
                    summon_id: summon.id,
                    target_player_ids,
                    source_name: "All Paladin Raid",
                });
            }
        }

        this.check_game_over();
    }

    on_end_turn(player_id) {
        const player = this.game_state.get_player_by_id(player_id);
        const expired_bubbles = player.defenses.filter((defense) =>
            defense.effect_id === EFFECT_IDS.BUBBLE_HEARTH &&
            defense.played_turn_number < this.game_state.turn_number
        );

        for (const defense of expired_bubbles) {
            const defense_index = player.defenses.findIndex((candidate) => candidate.card.instance_id === defense.card.instance_id);
            if (defense_index === -1) {
                throw new Error(`Bubble Hearth defense ${defense.card.instance_id} disappeared before expiry.`);
            }
            player.defenses.splice(defense_index, 1);
            player.discard.push(defense.card);
            player.hp = BUBBLE_HEARTH_END_HP;
            this.game_state.add_event(`${player.name}'s Bubble Hearth expired and set HP to ${BUBBLE_HEARTH_END_HP}.`, "defense");
        }

        this.check_game_over();
    }

    expire_effects_sourced_by_player(source_player_id) {
        for (const player of this.game_state.players) {
            player.phosphor_burn_source_player_ids = player.phosphor_burn_source_player_ids.filter(
                (candidate_id) => candidate_id !== source_player_id
            );
        }
    }

    expire_self_timed_effects(player) {
        if (player.developers_favorite_activated_turn !== null && player.developers_favorite_activated_turn < this.game_state.turn_number) {
            player.developers_favorite_activated_turn = null;
            this.game_state.add_event(`${player.name}'s Developer's Favorite protection expired.`, "status");
        }
        if (player.tank_specs_activated_turn !== null && player.tank_specs_activated_turn < this.game_state.turn_number) {
            player.tank_specs_activated_turn = null;
        }
        if (player.blessing_of_kings_activated_turn !== null && player.blessing_of_kings_activated_turn < this.game_state.turn_number) {
            player.blessing_of_kings_activated_turn = null;
        }
        if (player.vengeance_activated_turn !== null && player.vengeance_activated_turn < this.game_state.turn_number) {
            player.vengeance_activated_turn = null;
        }
    }

    is_timed_effect_active(activated_turn_number) {
        return activated_turn_number !== null && activated_turn_number <= this.game_state.turn_number;
    }

    resolve_card_skill(player, definition, target, hp_before_card) {
        switch (definition.skill?.id) {
            case 'monochrome_lecture':
                if (!this.game_state.get_player_by_id(target.player_id).eliminated) this.resolve_monochrome_lecture(player, target.player_id);
                break;
            case 'second_wind':
                if (hp_before_card <= SECOND_WIND_TRIGGER_HP) this.heal_player(player.id, 2, "Second Wind on Inspiring Presence");
                break;
            case 'developers_favorite':
                if (!player.developers_favorite_used) {
                    player.developers_favorite_activated_turn = this.game_state.turn_number;
                    this.game_state.add_event(`${player.name} armed Developer's Favorite until their next turn.`, "status");
                } else {
                    this.game_state.add_event(`${player.name}'s Developer's Favorite rescue was already spent this match.`, "status");
                }
                break;
        }
    }

    resolve_monochrome_lecture(player, target_player_id) {
        const target = this.validate_living_opponent(player.id, target_player_id);
        const roll = this.dice_handler.roll_d20();
        const succeeded = roll === 20 || (roll !== 1 && roll >= MONOCHROME_LECTURE_DC);

        this.game_state.add_event(`${target.name}: d20 ${roll} vs Monochrome Lecture DC ${MONOCHROME_LECTURE_DC}. Save ${succeeded ? 'succeeded' : 'failed'}.`, "dice");
        if (!succeeded) {
            target.skip_next_play_again_count += 1;
            this.game_state.add_event(`${target.name} will skip their next Play Again action.`, "status");
        }

        this.apply_damage_to_player(target.id, MONOCHROME_LECTURE_DAMAGE, player.id, {
            is_attack: false,
            is_dice_attack: false,
            source_name: "Monochrome Lecture",
        });
        this.check_game_over();
    }

    validate_living_opponent(source_player_id, target_player_id) {
        const target = this.game_state.get_player_by_id(target_player_id);
        if (target.id === source_player_id) {
            throw new Error("An opponent-targeting ability cannot target its source player.");
        }
        if (target.eliminated) {
            throw new Error(`${target.name} has already been eliminated.`);
        }
        return target;
    }

    apply_damage_to_player(target_player_id, amount, attacker_player_id, context) {
        const target = this.game_state.get_player_by_id(target_player_id);
        if (target.eliminated) {
            throw new Error(`${target.name} cannot take damage after elimination.`);
        }
        if (!Number.isInteger(amount) || amount < 1) {
            throw new RangeError(`Damage must be a positive integer; received ${amount}.`);
        }

        let remaining_damage = amount;
        if (context.is_attack && target.incoming_attack_reductions.length > 0) {
            let reduction_total = 0;
            for (const reduction of target.incoming_attack_reductions) {
                reduction_total += reduction.amount;
            }
            target.incoming_attack_reductions = [];
            remaining_damage = Math.max(MIN_DAMAGE_AFTER_REDUCTION, remaining_damage - reduction_total);
            this.game_state.add_event(`${target.name} reduced the incoming attack by ${reduction_total}.`, "defense");
        }

        const damage_after_reduction = remaining_damage;
        let damage_absorbed = 0;

        while (remaining_damage > 0 && target.defenses.length > 0) {
            const defense = target.defenses[0];

            if (defense.effect_id === EFFECT_IDS.BUBBLE_HEARTH) {
                damage_absorbed += remaining_damage;
                remaining_damage = 0;
                this.game_state.add_event(`${target.name}'s Bubble Hearth absorbed the attack.`, "defense");
                break;
            }

            const threshold_immunity = (
                defense.effect_id === EFFECT_IDS.SHIELD_WALL ||
                defense.effect_id === EFFECT_IDS.HAND_OF_PROTECTION
            ) && damage_after_reduction <= CHIP_DAMAGE_IMMUNITY_THRESHOLD;
            const dice_immunity = defense.effect_id === EFFECT_IDS.MONOCHROME_SHIELD && context.is_dice_attack;

            if (threshold_immunity || dice_immunity) {
                damage_absorbed += remaining_damage;
                remaining_damage = 0;
                this.game_state.add_event(`${defense.name} ignored ${damage_after_reduction} damage.`, "defense");
                break;
            }

            const absorbed_here = Math.min(defense.current_shields, remaining_damage);
            defense.current_shields -= absorbed_here;
            remaining_damage -= absorbed_here;
            damage_absorbed += absorbed_here;

            if (defense.current_shields === 0) {
                target.defenses.shift();
                this.handle_defense_break(target, defense, attacker_player_id);
            }
        }

        if (remaining_damage > 0) {
            target.hp -= remaining_damage;
            this.game_state.add_event(`${target.name} took ${remaining_damage} HP damage from ${context.source_name}.`, "damage");
            this.handle_survival_abilities(target);
        } else if (damage_absorbed > 0) {
            this.game_state.add_event(`${target.name}'s defenses absorbed ${damage_absorbed} damage from ${context.source_name}.`, "defense");
        }

        if (context.is_attack && this.is_timed_effect_active(target.vengeance_activated_turn) && attacker_player_id !== null) {
            const attacker = this.game_state.get_player_by_id(attacker_player_id);
            if (!attacker.eliminated) {
                this.apply_damage_to_player(attacker.id, VENGEANCE_REFLECT_DAMAGE, target.id, {
                    is_attack: false,
                    is_dice_attack: false,
                    source_name: "Vengeance",
                });
            }
        }

        this.check_game_over();
    }

    apply_damage_to_summon(owner_player_id, summon_id, amount, attacker_player_id, source_name) {
        const owner = this.game_state.get_player_by_id(owner_player_id);
        const summon = this.game_state.get_summon(owner.id, summon_id);
        if (!Number.isInteger(amount) || amount < 1) {
            throw new RangeError(`Summon damage must be a positive integer; received ${amount}.`);
        }

        summon.hp -= amount;
        this.game_state.add_event(`${summon.name} belonging to ${owner.name} took ${amount} damage from ${source_name}.`, "damage");
        if (summon.hp <= 0) {
            const summon_index = owner.summons.findIndex((candidate) => candidate.id === summon.id);
            owner.summons.splice(summon_index, 1);
            this.game_state.add_event(`${owner.name}'s ${summon.name} was defeated.`, "summon");
        }

        if (attacker_player_id !== null) {
            this.game_state.get_player_by_id(attacker_player_id);
        }
    }

    handle_defense_break(target, defense, attacker_player_id) {
        this.game_state.add_event(`${target.name}'s ${defense.name} broke.`, "defense");

        if (defense.effect_id === EFFECT_IDS.SCREEN_SAVER) {
            target.hand.push(defense.card);
            this.game_state.add_event(`${defense.name} returned to ${target.name}'s hand.`, "card");
            return;
        }

        target.discard.push(defense.card);

        if (defense.effect_id === EFFECT_IDS.CRT_SCREEN_FLICKER && attacker_player_id !== null) {
            const attacker = this.game_state.get_player_by_id(attacker_player_id);
            if (!attacker.eliminated) {
                this.apply_damage_to_player(attacker.id, CRT_SCREEN_FLICKER_DAMAGE, target.id, {
                    is_attack: false,
                    is_dice_attack: false,
                    source_name: "CRT Screen Flicker",
                });
            }
        } else if (defense.effect_id === EFFECT_IDS.BLOCK_THIS && attacker_player_id !== null) {
            const attacker = this.game_state.get_player_by_id(attacker_player_id);
            if (!attacker.eliminated) {
                this.apply_damage_to_player(attacker.id, BLOCK_THIS_DAMAGE, target.id, {
                    is_attack: false,
                    is_dice_attack: false,
                    source_name: "Block This!",
                });
            }
        } else if (defense.effect_id === EFFECT_IDS.FACE_TANK) {
            this.heal_player(target.id, FACE_TANK_HEALING, "Face Tank");
        } else if (defense.effect_id === EFFECT_IDS.DIVINE_SHIELD) {
            this.heal_player(target.id, DIVINE_SHIELD_HEALING, "Divine Shield");
        }
    }

    handle_survival_abilities(player) {
        if (player.hp <= 0 && player.developers_favorite_activated_turn !== null && !player.developers_favorite_used) {
            player.developers_favorite_used = true;
            player.developers_favorite_activated_turn = null;
            player.hp = DEVELOPERS_FAVORITE_HP;
            this.game_state.add_event(`${player.name} triggered Developer's Favorite and returned to ${DEVELOPERS_FAVORITE_HP} HP.`, "ability");
        }

        if (player.hp <= 0) {
            player.hp = 0;
            player.eliminated = true;
            this.game_state.add_event(`${player.name} was eliminated.`, "elimination");
        }
    }

    heal_player(player_id, amount, source_name) {
        const player = this.game_state.get_player_by_id(player_id);
        if (player.eliminated) {
            return;
        }
        if (!Number.isInteger(amount) || amount < 1) {
            throw new RangeError(`Healing must be a positive integer; received ${amount}.`);
        }

        const hp_before = player.hp;
        player.hp = Math.min(player.max_hp, player.hp + amount);
        const healed_amount = player.hp - hp_before;
        this.game_state.add_event(`${player.name} healed ${healed_amount} HP from ${source_name}.`, "healing");
    }

    check_game_over() {
        const living_players = this.game_state.get_living_players();
        if (living_players.length === 1 && this.game_state.players.length > 1) {
            this.game_state.winner_player_id = living_players[0].id;
            this.game_state.phase = PHASES.GAME_OVER;
            this.game_state.add_event(`${living_players[0].name} is the Last Pixel Standing.`, "victory");
        }
    }
}
