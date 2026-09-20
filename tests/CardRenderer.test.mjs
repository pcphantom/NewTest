import test from "node:test";
import assert from "node:assert/strict";
import { CardRenderer } from "../src/CardRenderer.js";
import { get_card_definition, get_all_card_definitions } from "../src/CardData.js";

test("v2 card display uses one numbered icon per nonzero effect", () => {
    const renderer = new CardRenderer();
    const html = renderer.render_symbols({attack:3, defense:2, healing:0, draw:1, play_again:0});
    assert.equal((html.match(/class="card-symbol symbol-/g) ?? []).length, 3);
    assert.match(html, /aria-label="3 attack"/);
    assert.match(html, /class="symbol-value"[^>]*>3</);
});

test("hand cards keep the original fan and play directly only when playable", () => {
    const renderer = new CardRenderer();
    const card = { instance_id: "screen-saver", definition_id: "grandpa_screen_saver" };
    const playable = renderer.render_hand_card(card, true, 0, 4);
    assert.match(playable, /data-action="select-card"/);
    assert.match(playable, /aria-label="Play Screen Saver"/);
    assert.match(playable, /--hand-rotation: -3.1500000000000004deg/);
    assert.match(renderer.render_hand_card(card, true, 0, 20), /--hand-rotation: -8deg/);
    assert.match(renderer.render_hand_card(card, true, 19, 20), /--hand-rotation: 8deg/);
    const unavailable = renderer.render_hand_card(card, false, 0, 4);
    assert.match(unavailable, /data-action="inspect-card"/);
    assert.match(unavailable, /aria-label="Read Screen Saver"/);
    assert.doesNotMatch(unavailable, /\bdisabled\b/, "unavailable cards remain readable, without disabled-button transparency");
});

test("all cards retain flavor text and skill cards visibly explain their skills", () => {
    const renderer = new CardRenderer();
    for (const card of get_all_card_definitions()) {
        const html = renderer.render_card_face(card);
        assert.ok(html.includes(renderer.escape_html(card.flavor_text)));
        if (card.skill !== null) {
            assert.ok(html.includes(renderer.escape_html(card.skill.name)));
            assert.ok(html.includes(renderer.escape_html(card.skill.description)));
        }
    }
    assert.match(renderer.render_table_card_from_definition("patchadin_blatant_favoritism"), /data-action="inspect-card"/);
    assert.match(renderer.render_card_face(get_card_definition("patchadin_blatant_favoritism")), /ALL play Paladins/);
});
