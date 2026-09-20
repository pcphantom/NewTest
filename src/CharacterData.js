/* =====================================================================
   CharacterData
   Owns: immutable character metadata and signature ability descriptions.
   Stays out of: character ability execution and mutable player state.
   ===================================================================== */

import { CHARACTER_IDS } from "./Constants.js";

export const CHARACTER_DEFINITIONS = Object.freeze({
    [CHARACTER_IDS.GRANDPA]: Object.freeze({
        id: CHARACTER_IDS.GRANDPA,
        name: "Grandpa the Grayscale",
        archetype: "Controller / Wizard",
        quote: "Back in my day, we didn't need COLOR to cast spells!",
        theme_class: "character-grandpa",
        abilities: Object.freeze([
            Object.freeze({
                id: "monochrome_lecture",
                name: "Monochrome Lecture",
                description: "Once per turn, target opponent makes a DC 13 save. Failure skips their next Play Again action. They take 1 damage either way.",
            }),
            Object.freeze({
                id: "screen_burn_in",
                name: "Screen Burn-In",
                description: "After a damaging Grandpa spell resolves, you may deal 1 additional damage to one opponent damaged by that spell.",
            }),
        ]),
    }),
    [CHARACTER_IDS.MALRIC]: Object.freeze({
        id: CHARACTER_IDS.MALRIC,
        name: "Malric the Meat Shield",
        archetype: "Tank / Sentinel",
        quote: "Looking for group? I'm the group.",
        theme_class: "character-malric",
        abilities: Object.freeze([
            Object.freeze({
                id: "threat_generation",
                name: "Threat Generation",
                description: "At the start of your turn, you may force target opponent to attack you with their next attack.",
            }),
            Object.freeze({
                id: "second_wind",
                name: "Second Wind",
                description: "Once per game, when reduced to 4 HP or less, immediately heal 6 HP and draw 2 cards.",
            }),
        ]),
    }),
    [CHARACTER_IDS.PATCHADIN]: Object.freeze({
        id: CHARACTER_IDS.PATCHADIN,
        name: "Patchadin the Overpowered",
        archetype: "Hybrid (Tank / DPS / Healer)",
        quote: "Patch 3.2.7: Buffed Paladins. Again.",
        theme_class: "character-patchadin",
        abilities: Object.freeze([
            Object.freeze({
                id: "can_do_everything",
                name: "Can Do Everything",
                description: "Once per turn, after you play a card, change one Attack, Defense, or Healing symbol on that card to one of the other two symbols.",
            }),
            Object.freeze({
                id: "developers_favorite",
                name: "Developer's Favorite",
                description: "The first time each game you would be reduced to 0 HP, set your HP to 6.",
            }),
        ]),
    }),
});

export function get_character_definition(character_id) {
    if (!Object.hasOwn(CHARACTER_DEFINITIONS, character_id)) {
        throw new Error(`Unknown character id: ${character_id}`);
    }

    return CHARACTER_DEFINITIONS[character_id];
}

export function get_character_list() {
    return Object.values(CHARACTER_DEFINITIONS);
}
