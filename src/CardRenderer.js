/* =====================================================================
   CardRenderer
   Owns: card-shaped HTML, card backs and illustration-window presentation.
   Stays out of: gameplay mutation, targeting logic and turn flow.
   ===================================================================== */

import { CARD_TYPES, CHARACTER_IDS, SYMBOL_GLYPHS } from "./Constants.js";
import { get_card_definition } from "./CardData.js";
import { get_character_definition } from "./CharacterData.js";

export class CardRenderer {
    constructor() {
        this.character_theme_class = Object.freeze({
            [CHARACTER_IDS.GRANDPA]: "theme-grandpa",
            [CHARACTER_IDS.MALRIC]: "theme-malric",
            [CHARACTER_IDS.PATCHADIN]: "theme-patchadin",
        });
    }

    render_hand_card(card, enabled, card_index, card_count) {
        const definition = get_card_definition(card.definition_id);
        const theme_class = this.get_theme_class(definition.character_id);
        const type_class = this.get_type_class(definition.type);
        const spread_offset = card_index - ((card_count - 1) / 2);
        const rotation = Math.max(-3, Math.min(3, spread_offset));

        return `
            <button
                type="button"
                class="game-card hand-card ${theme_class} ${type_class}"
                style="--hand-rotation: ${rotation}deg; --hand-index: ${card_index};"
                data-action="inspect-card"
                data-card-definition-id="${this.escape_html(definition.id)}"
                data-card-instance-id="${this.escape_html(card.instance_id)}"
                aria-label="Read ${this.escape_html(definition.name)}${enabled ? ', then choose Play' : ''}">
                ${this.render_card_face(definition)}
            </button>
        `;
    }

    render_table_card_from_definition(definition_id, extra_class = "") {
        const definition = get_card_definition(definition_id);
        return `
            <button type="button" data-action="inspect-card" data-card-definition-id="${this.escape_html(definition_id)}" aria-label="Read ${this.escape_html(definition.name)}" class="game-card table-card ${this.get_theme_class(definition.character_id)} ${this.get_type_class(definition.type)} ${extra_class}">
                ${this.render_card_face(definition)}
            </button>
        `;
    }

    render_mini_card_from_definition(definition_id) {
        const definition = get_card_definition(definition_id);
        return `
            <button type="button" data-action="inspect-card" data-card-definition-id="${this.escape_html(definition_id)}" aria-label="Read ${this.escape_html(definition.name)}" class="mini-card ${this.get_theme_class(definition.character_id)} ${this.get_type_class(definition.type)}">
                <div class="mini-card-art">${this.render_art_motif(definition)}</div>
                <div class="mini-card-name">${this.escape_html(definition.name)}</div>
            </button>
        `;
    }

    render_card_back(character_id, card_count) {
        const theme_class = this.get_theme_class(character_id);
        return `
            <div class="card-stack card-stack-back ${theme_class}" aria-label="Draw pile with ${card_count} cards">
                <div class="card-back-emblem" aria-hidden="true">
                    <span></span><span></span><span></span><span></span>
                </div>
                <div class="pile-count">${card_count}</div>
            </div>
        `;
    }

    render_empty_discard() {
        return `
            <div class="card-stack empty-pile" aria-label="Empty discard pile">
                <div class="empty-pile-mark">DISCARD</div>
                <div class="pile-count">0</div>
            </div>
        `;
    }

    render_character_portrait(character_id, size_class = "") {
        const character = get_character_definition(character_id);
        const theme_class = this.get_theme_class(character_id);

        return `
            <div
                class="character-portrait ${theme_class} ${size_class}"
                role="img"
                aria-label="${this.escape_html(character.name)} portrait">
                <div class="portrait-head"></div>
                <div class="portrait-body"></div>
                <div class="portrait-accent"></div>
            </div>
        `;
    }

    render_card_face(definition) {
        return `
            <div class="card-frame">
                <div class="card-heading">
                    <span class="card-name">${this.escape_html(definition.name)}</span>
                    <span class="card-type-badge">${this.escape_html(definition.type)}</span>
                </div>
                <div class="card-art-window">
                    ${this.render_art_motif(definition)}
                </div>
                <div class="card-symbol-row">${this.render_symbols(definition.symbols)}</div>
                <div class="card-rule-box">${this.escape_html(definition.rules_text)}${definition.skill === null ? '' : `<div class="card-skill"><strong>${this.escape_html(definition.skill.name)}</strong> ${this.escape_html(definition.skill.description)}</div>`}</div>
                <div class="card-flavor-box">"${this.escape_html(definition.flavor_text)}"</div>
            </div>
        `;
    }

    render_art_motif(definition) {
        const motif_class = this.get_motif_class(definition.type);
        const variant = this.hash_identifier(definition.id) % 5;

        return `
            <div class="art-motif ${motif_class} motif-variant-${variant}" aria-hidden="true">
                <span class="art-pixel art-pixel-a"></span>
                <span class="art-pixel art-pixel-b"></span>
                <span class="art-pixel art-pixel-c"></span>
                <span class="art-pixel art-pixel-d"></span>
                <span class="art-pixel art-pixel-e"></span>
                <span class="art-horizon"></span>
            </div>
        `;
    }

    render_symbols(symbols) {
        const parts = [];
        for (const symbol_name of ["attack", "defense", "healing", "draw", "play_again"]) {
            if (symbols[symbol_name] > 0) {
                const label = `${symbols[symbol_name]} ${symbol_name.replaceAll('_', ' ')}`;
                parts.push(`<span class="card-symbol symbol-${symbol_name}" role="img" aria-label="${label}" title="${label}"><span class="symbol-glyph" aria-hidden="true">${SYMBOL_GLYPHS[symbol_name]}</span><strong class="symbol-value" aria-hidden="true">${symbols[symbol_name]}</strong></span>`);
            }
        }

        if (parts.length === 0) {
            return '<span class="card-symbol-text">TEXT EFFECT</span>';
        }

        return parts.join("");
    }

    get_theme_class(character_id) {
        const theme_class = this.character_theme_class[character_id];
        if (typeof theme_class !== "string") {
            throw new Error(`No card visual theme exists for character ${character_id}.`);
        }
        return theme_class;
    }

    get_type_class(card_type) {
        if (!Object.values(CARD_TYPES).includes(card_type)) {
            throw new Error(`Unknown card type: ${card_type}`);
        }

        return `type-${card_type.toLowerCase().replaceAll(" ", "-")}`;
    }

    get_motif_class(card_type) {
        if (card_type === CARD_TYPES.ATTACK) {
            return "motif-attack";
        }
        if (card_type === CARD_TYPES.DEFENSE) {
            return "motif-defense";
        }
        if (card_type === CARD_TYPES.HEALING) {
            return "motif-healing";
        }
        if (card_type === CARD_TYPES.DRAW) {
            return "motif-draw";
        }
        if (card_type === CARD_TYPES.MIGHTY_POWER) {
            return "motif-mighty";
        }
        return "motif-utility";
    }

    hash_identifier(identifier) {
        let hash = 0;
        for (let character_index = 0; character_index < identifier.length; character_index += 1) {
            hash = ((hash << 5) - hash) + identifier.charCodeAt(character_index);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    escape_html(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
}
