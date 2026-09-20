import test from "node:test";
import assert from "node:assert/strict";

import {
    CARD_TYPES,
    EFFECT_IDS,
    TARGET_MODES,
} from "../src/Constants.js";
import { get_all_card_definitions } from "../src/CardData.js";

test("card ids are unique and all card data uses known enums", () => {
    const definitions = get_all_card_definitions();
    const ids = definitions.map((definition) => definition.id);
    assert.equal(new Set(ids).size, ids.length);

    const card_types = new Set(Object.values(CARD_TYPES));
    const effect_ids = new Set(Object.values(EFFECT_IDS));
    const target_modes = new Set(Object.values(TARGET_MODES));

    for (const definition of definitions) {
        assert.equal(card_types.has(definition.type), true, definition.id);
        assert.equal(effect_ids.has(definition.effect_id), true, definition.id);
        assert.equal(target_modes.has(definition.target_mode), true, definition.id);
        assert.equal(Number.isInteger(definition.copies), true, definition.id);
        assert.equal(definition.copies > 0, true, definition.id);
        assert.equal(definition.name.length > 0, true, definition.id);
        assert.equal(definition.rules_text.length > 0, true, definition.id);

        for (const symbol_count of Object.values(definition.symbols)) {
            assert.equal(Number.isInteger(symbol_count), true, definition.id);
            assert.equal(symbol_count >= 0, true, definition.id);
        }
    }
});

test("completed content contains 84 physical cards across three decks", () => {
    const physical_card_count = get_all_card_definitions().reduce(
        (total, definition) => total + definition.copies,
        0
    );
    assert.equal(physical_card_count, 84);
});
