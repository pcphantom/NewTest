/* =====================================================================
   DeckHandler
   Owns: deck construction, deck validation, shuffling, drawing, discarding.
   Stays out of: turn order, card effects, rendering.
   ===================================================================== */

import { DECK_SIZE } from "./Constants.js";
import { get_card_definitions_for_character, get_card_definition } from "./CardData.js";

export class DeckHandler {
    constructor(random_number_generator) {
        if (typeof random_number_generator !== "function") {
            throw new TypeError("DeckHandler requires a random number generator function.");
        }

        this.random_number_generator = random_number_generator;
        this.next_card_instance_number = 1;
    }

    build_character_deck(character_id) {
        const definitions = get_card_definitions_for_character(character_id);
        const deck = [];

        for (const definition of definitions) {
            for (let copy_number = 1; copy_number <= definition.copies; copy_number += 1) {
                deck.push({
                    instance_id: `card_${this.next_card_instance_number}`,
                    definition_id: definition.id,
                });
                this.next_card_instance_number += 1;
            }
        }

        if (deck.length !== DECK_SIZE) {
            throw new Error(`${character_id} produced ${deck.length} cards; expected ${DECK_SIZE}.`);
        }

        return this.shuffle_cards(deck);
    }

    shuffle_cards(cards) {
        const shuffled_cards = [...cards];

        for (let current_index = shuffled_cards.length - 1; current_index > 0; current_index -= 1) {
            const random_value = this.random_number_generator();
            if (random_value < 0 || random_value >= 1) {
                throw new RangeError(`Random number generator returned ${random_value}; expected 0 <= value < 1.`);
            }

            const swap_index = Math.floor(random_value * (current_index + 1));
            const current_card = shuffled_cards[current_index];
            shuffled_cards[current_index] = shuffled_cards[swap_index];
            shuffled_cards[swap_index] = current_card;
        }

        return shuffled_cards;
    }

    draw_cards(player, card_count) {
        if (!Number.isInteger(card_count) || card_count < 0) {
            throw new RangeError(`Invalid draw count: ${card_count}`);
        }

        const drawn_cards = [];

        for (let draw_number = 0; draw_number < card_count; draw_number += 1) {
            if (player.deck.length === 0) {
                throw new Error(`${player.name} cannot draw: draw pile is empty and the project rules do not define a reshuffle rule.`);
            }

            const card = player.deck.pop();
            player.hand.push(card);
            drawn_cards.push(card);
        }

        return drawn_cards;
    }

    discard_card_from_hand(player, card_instance_id) {
        const card_index = player.hand.findIndex((card) => card.instance_id === card_instance_id);
        if (card_index === -1) {
            throw new Error(`${player.name} does not have ${card_instance_id} in hand.`);
        }

        const removed_cards = player.hand.splice(card_index, 1);
        const card = removed_cards[0];
        player.discard.push(card);
        return card;
    }

    discard_card_instance(player, card) {
        player.discard.push(card);
    }

    move_discard_to_hand(player, card_instance_id) {
        const card_index = player.discard.findIndex((card) => card.instance_id === card_instance_id);
        if (card_index === -1) {
            throw new Error(`${card_instance_id} is not in ${player.name}'s discard pile.`);
        }

        const removed_cards = player.discard.splice(card_index, 1);
        const card = removed_cards[0];
        player.hand.push(card);
        return card;
    }

    get_card_name(card) {
        return get_card_definition(card.definition_id).name;
    }
}
