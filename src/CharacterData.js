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
                description: "That opponent makes a DC 13 d20 save. On failure, cancel their next Play Again action. Deal 1 damage to them either way.",
            }),
            Object.freeze({
                id: "screen_burn_in",
                name: "Screen Burn-In",
                description: "After this card resolves, you may deal 1 extra damage to one surviving opponent it damaged. Choose that opponent or skip.",
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
                description: "Choose an opponent. Their next attack must target you if able. When they make that attack, draw 1 card.",
            }),
            Object.freeze({
                id: "second_wind",
                name: "Second Wind",
                description: "If you had 4 HP or less before playing this card, heal 2 extra HP (6 total).",
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
                description: "You may change 1 of this card's Attack symbols to 1 Defense or 1 Healing. Its Draw symbol stays the same. No other card is changed.",
            }),
            Object.freeze({
                id: "developers_favorite",
                name: "Developer's Favorite",
                description: "Until your next turn, the first hit that would reduce you to 0 HP sets you to 6 HP instead. This rescue can happen only once per match.",
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
