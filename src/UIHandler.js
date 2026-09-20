/* =====================================================================
   UIHandler
   Owns: HTML rendering from current state.
   Stays out of: input events and gameplay mutations.
   ===================================================================== */

import {
    CHARACTER_ABILITY_IDS,
    CHARACTER_IDS,
    COMPLETED_CHARACTER_COUNT,
    DECISION_TYPES,
    MAX_PLAYERS,
    MIN_PLAYERS,
    PHASES,
    SYMBOL_GLYPHS,
} from "./Constants.js";
import { get_character_definition, get_character_list } from "./CharacterData.js";
import { get_card_definition } from "./CardData.js";

export class UIHandler {
    constructor(document_reference) {
        if (typeof document_reference !== "object" || document_reference === null) {
            throw new TypeError("UIHandler requires a document reference.");
        }

        this.document = document_reference;
        this.app_element = document_reference.getElementById("app");
        if (this.app_element === null) {
            throw new Error("Missing #app root element.");
        }
    }

    render(game_state, rules_engine, turn_handler, view_state) {
        if (game_state.phase === PHASES.SETUP) {
            this.render_setup(view_state);
            return;
        }
        if (game_state.phase === PHASES.HANDOFF) {
            this.render_handoff(game_state);
            return;
        }
        if (game_state.phase === PHASES.GAME_OVER) {
            this.render_game_over(game_state);
            return;
        }
        if (game_state.phase !== PHASES.PLAY) {
            throw new Error(`Unsupported UI phase: ${game_state.phase}`);
        }

        this.render_play_screen(game_state, rules_engine, turn_handler, view_state);
    }

    render_setup(view_state) {
        const characters = get_character_list();
        const character_options = characters.map((character) =>
            `<option value="${this.escape_html(character.id)}">${this.escape_html(character.name)} | ${this.escape_html(character.archetype)}</option>`
        ).join("");

        const rows = view_state.setup_players.map((setup_player, player_index) => {
            const options = character_options.replace(
                `value="${this.escape_html(setup_player.character_id)}"`,
                `value="${this.escape_html(setup_player.character_id)}" selected`
            );
            const remove_disabled = view_state.setup_players.length <= MIN_PLAYERS ? "disabled" : "";

            return `
                <div class="setup-player-row" data-setup-row="${player_index}">
                    <div class="player-number">PLAYER ${player_index + 1}</div>
                    <input
                        type="text"
                        maxlength="28"
                        value="${this.escape_html(setup_player.name)}"
                        data-setup-name="${player_index}"
                        aria-label="Player ${player_index + 1} name">
                    <select data-setup-character="${player_index}" aria-label="Player ${player_index + 1} character">
                        ${options}
                    </select>
                    <button type="button" data-action="remove-player" data-player-index="${player_index}" ${remove_disabled}>Remove</button>
                </div>
            `;
        }).join("");

        const duplicate_notice = view_state.setup_players.length > COMPLETED_CHARACTER_COUNT
            ? `<div class="notice">The repository currently has ${COMPLETED_CHARACTER_COUNT} completed decks. Duplicate characters are enabled for this ${view_state.setup_players.length}-player local test.</div>`
            : "";
        const setup_error = view_state.setup_error === null
            ? ""
            : `<div class="error-banner">${this.escape_html(view_state.setup_error)}</div>`;
        const add_disabled = view_state.setup_players.length >= MAX_PLAYERS ? "disabled" : "";

        this.app_element.innerHTML = `
            <main class="setup-shell panel">
                <div class="title-kicker">Mini Multiplayer Offline RPG</div>
                <h1>Dungeons &amp; Mayhem</h1>
                <p class="subtitle">Local pass-and-play build using the three completed Python's Quest character decks. Every character starts at 12 HP. Cards use Attack, Defense, Healing, Draw, and Play Again as the shared rules language.</p>
                ${setup_error}
                ${duplicate_notice}
                <div class="setup-grid">${rows}</div>
                <div class="setup-actions">
                    <button type="button" data-action="add-player" ${add_disabled}>Add Player</button>
                    <button type="button" class="primary-button" data-action="start-match">Start Match</button>
                </div>
                <p class="muted" style="margin-top: 14px; margin-bottom: 0;">Players: ${view_state.setup_players.length} / ${MAX_PLAYERS}. The first configured player takes the first turn.</p>
            </main>
        `;
    }

    render_handoff(game_state) {
        const player = game_state.get_active_player();
        const character = get_character_definition(player.character_id);

        this.app_element.innerHTML = `
            <main class="handoff-screen panel ${this.escape_html(character.theme_class)}">
                <div class="title-kicker">Turn ${game_state.turn_number} | Round ${game_state.round_number}</div>
                <h1>Pass the device</h1>
                <p class="handoff-name">${this.escape_html(player.name)}</p>
                <p>${this.escape_html(character.name)}</p>
                <p class="muted">The hand remains hidden until the active player reveals the turn.</p>
                <button type="button" class="primary-button" data-action="reveal-turn" data-player-id="${this.escape_html(player.id)}">Reveal My Turn</button>
            </main>
        `;
    }

    render_game_over(game_state) {
        if (game_state.winner_player_id === null) {
            throw new Error("Game Over phase requires a winner_player_id.");
        }

        const winner = game_state.get_player_by_id(game_state.winner_player_id);
        const character = get_character_definition(winner.character_id);

        this.app_element.innerHTML = `
            <main class="game-over-screen panel ${this.escape_html(character.theme_class)}">
                <div class="title-kicker">Game Over</div>
                <h1>Last Pixel Standing</h1>
                <p class="handoff-name">${this.escape_html(winner.name)}</p>
                <p>${this.escape_html(character.name)} wins with ${winner.hp} HP.</p>
                <button type="button" class="primary-button" data-action="new-match">New Match</button>
            </main>
        `;
    }

    render_play_screen(game_state, rules_engine, turn_handler, view_state) {
        const active_player = game_state.get_active_player();
        const active_character = get_character_definition(active_player.character_id);
        const opponents = game_state.players.filter((player) => player.id !== active_player.id);
        const opponent_panels = opponents.map((player) => this.render_player_summary(player, false)).join("");
        const hand_cards = active_player.hand.map((card) => this.render_hand_card(card, game_state.actions_remaining > 0)).join("");
        const can_end_turn = turn_handler.can_end_turn();
        const active_abilities = this.render_active_ability_buttons(game_state, active_player);
        const event_entries = [...game_state.event_log].reverse().map((event) => `
            <div class="event-entry">
                <span class="event-turn">T${event.turn_number}</span> ${this.escape_html(event.message)}
            </div>
        `).join("");

        this.app_element.innerHTML = `
            <main class="game-shell">
                <header class="game-header panel">
                    <div>
                        <div class="title-kicker">Mini Multiplayer Offline RPG</div>
                        <h1 class="game-title-small">Dungeons &amp; Mayhem</h1>
                    </div>
                    <div class="turn-stats">
                        <span class="stat-chip">Turn ${game_state.turn_number}</span>
                        <span class="stat-chip">Round ${game_state.round_number}</span>
                        <span class="stat-chip">Actions ${game_state.actions_remaining}</span>
                        <span class="stat-chip">Deck ${active_player.deck.length}</span>
                        <span class="stat-chip">Discard ${active_player.discard.length}</span>
                    </div>
                </header>

                <div class="battle-grid">
                    <section class="main-column">
                        <div class="panel">
                            <div class="zone-label">Opponents</div>
                            <div class="opponents-grid">${opponent_panels}</div>
                        </div>

                        <div class="panel active-area">
                            <div class="character-card ${this.escape_html(active_character.theme_class)}">
                                <div class="player-heading">
                                    <div>
                                        <div class="title-kicker">Active Player</div>
                                        <h2>${this.escape_html(active_player.name)} | ${this.escape_html(active_character.name)}</h2>
                                        <div class="character-quote">"${this.escape_html(active_character.quote)}"</div>
                                    </div>
                                    <div class="hp-display">HP ${active_player.hp} / ${active_player.max_hp}</div>
                                </div>
                                <div class="zone-label">Signature Abilities</div>
                                <div class="ability-list">
                                    ${active_character.abilities.map((ability) => `
                                        <div class="ability-item"><strong>${this.escape_html(ability.name)}</strong><br>${this.escape_html(ability.description)}</div>
                                    `).join("")}
                                </div>
                                ${this.render_status_chips(active_player)}
                            </div>

                            <div>
                                <div class="zone-label">Active Defenses</div>
                                <div class="defense-row">${this.render_defenses(active_player)}</div>
                            </div>

                            <div>
                                <div class="zone-label">Summons</div>
                                <div class="summon-row">${this.render_summons(active_player)}</div>
                            </div>

                            <div>
                                <div class="zone-label">Hand | ${active_player.hand.length} cards</div>
                                <div class="hand-row">${hand_cards}</div>
                            </div>

                            <div class="turn-actions">
                                ${active_abilities}
                                <button type="button" data-action="end-turn" data-player-id="${this.escape_html(active_player.id)}" ${can_end_turn ? "" : "disabled"}>End Turn</button>
                            </div>
                        </div>
                    </section>

                    <aside class="sidebar panel">
                        <div class="zone-label">Combat Log</div>
                        <div class="event-log">${event_entries}</div>
                    </aside>
                </div>
            </main>
        `;

        const decision = game_state.get_current_decision();
        if (decision !== null) {
            this.app_element.insertAdjacentHTML("beforeend", this.render_decision_overlay(game_state, decision, view_state));
            return;
        }

        if (view_state.interaction !== null) {
            this.app_element.insertAdjacentHTML("beforeend", this.render_interaction_overlay(game_state, rules_engine, view_state.interaction));
        }
    }

    render_player_summary(player, is_active) {
        const character = get_character_definition(player.character_id);
        const eliminated_class = player.eliminated ? "eliminated" : "";
        const active_class = is_active ? "active-player" : "";

        return `
            <article class="player-panel ${this.escape_html(character.theme_class)} ${active_class} ${eliminated_class}">
                <div class="player-heading">
                    <div>
                        <h3>${this.escape_html(player.name)}</h3>
                        <div class="muted">${this.escape_html(character.name)}</div>
                    </div>
                    <div class="hp-display">HP ${player.hp} / ${player.max_hp}</div>
                </div>
                <div class="zone-label">State</div>
                <div class="muted">Hand ${player.hand.length} | Deck ${player.deck.length} | Discard ${player.discard.length}</div>
                <div class="zone-label">Defense</div>
                <div class="defense-row">${this.render_defenses(player)}</div>
                <div class="zone-label">Summons</div>
                <div class="summon-row">${this.render_summons(player)}</div>
                ${this.render_status_chips(player)}
            </article>
        `;
    }

    render_hand_card(card, action_available) {
        const definition = get_card_definition(card.definition_id);
        const type_class = definition.type.toLowerCase().replaceAll(" ", "-");
        const disabled = action_available ? "" : "disabled";

        return `
            <button
                type="button"
                class="card-button card-${this.escape_html(type_class)}"
                data-action="select-card"
                data-card-instance-id="${this.escape_html(card.instance_id)}"
                ${disabled}>
                <span class="card-type">${this.escape_html(definition.type)}</span>
                <span class="card-name">${this.escape_html(definition.name)}</span>
                <span class="card-symbols">${this.render_symbols(definition.symbols)}</span>
                <span class="card-rules">${this.escape_html(definition.rules_text)}</span>
                <span class="card-flavor">"${this.escape_html(definition.flavor_text)}"</span>
            </button>
        `;
    }

    render_symbols(symbols) {
        const parts = [];
        for (const symbol_name of ["attack", "defense", "healing", "draw", "play_again"]) {
            for (let symbol_number = 0; symbol_number < symbols[symbol_name]; symbol_number += 1) {
                parts.push(SYMBOL_GLYPHS[symbol_name]);
            }
        }
        if (parts.length === 0) {
            return `<span class="muted">TEXT</span>`;
        }
        return parts.join("");
    }

    render_defenses(player) {
        if (player.defenses.length === 0) {
            return `<span class="muted">None</span>`;
        }

        return player.defenses.map((defense) => `
            <span class="defense-token">${this.escape_html(defense.name)} | ${defense.current_shields}/${defense.max_shields} 🛡️</span>
        `).join("");
    }

    render_summons(player) {
        if (player.summons.length === 0) {
            return `<span class="muted">None</span>`;
        }

        return player.summons.map((summon) => `
            <span class="summon-token">${this.escape_html(summon.name)} | ${summon.hp}/${summon.max_hp} HP</span>
        `).join("");
    }

    render_status_chips(player) {
        const statuses = [];

        if (player.forced_attack_target_player_id !== null) {
            statuses.push("Taunted");
        }
        if (player.outgoing_attack_reductions.length > 0) {
            statuses.push(`Attack reduction x${player.outgoing_attack_reductions.length}`);
        }
        if (player.incoming_attack_reductions.length > 0) {
            statuses.push(`Incoming reduction x${player.incoming_attack_reductions.length}`);
        }
        if (player.skip_next_turn_after_draw) {
            statuses.push("Next turn skipped after draw");
        }
        if (player.skip_next_play_again_count > 0) {
            statuses.push(`Skip Play Again x${player.skip_next_play_again_count}`);
        }
        if (player.phosphor_burn_source_player_ids.length > 0) {
            statuses.push("Phosphor Burn");
        }
        if (player.tank_specs_activated_turn !== null) {
            statuses.push("Tank Specs");
        }
        if (player.blessing_of_kings_activated_turn !== null) {
            statuses.push("Blessing of Kings");
        }
        if (player.vengeance_activated_turn !== null) {
            statuses.push("Vengeance");
        }

        if (statuses.length === 0) {
            return "";
        }

        return `<div class="zone-label">Statuses</div><div>${statuses.map((status) => `<span class="status-chip">${this.escape_html(status)}</span>`).join("")}</div>`;
    }

    render_active_ability_buttons(game_state, player) {
        if (game_state.get_current_decision() !== null) {
            return "";
        }

        if (player.character_id === CHARACTER_IDS.GRANDPA) {
            const disabled = player.monochrome_lecture_used_this_turn ? "disabled" : "";
            return `<button type="button" data-action="select-ability" data-ability-id="${CHARACTER_ABILITY_IDS.MONOCHROME_LECTURE}" ${disabled}>Monochrome Lecture</button>`;
        }

        if (player.character_id === CHARACTER_IDS.MALRIC) {
            const disabled = player.threat_generation_used_this_turn || player.cards_played_this_turn > 0 ? "disabled" : "";
            return `<button type="button" data-action="select-ability" data-ability-id="${CHARACTER_ABILITY_IDS.THREAT_GENERATION}" ${disabled}>Threat Generation</button>`;
        }

        return "";
    }

    render_decision_overlay(game_state, decision, view_state) {
        const player = game_state.get_player_by_id(decision.player_id);

        if (decision.type === DECISION_TYPES.DISCARD_CARDS) {
            if (!view_state.private_decision_revealed) {
                return `
                    <div class="overlay">
                        <div class="modal">
                            <div class="title-kicker">Private decision</div>
                            <h2>Pass the device to ${this.escape_html(player.name)}</h2>
                            <p>${this.escape_html(decision.source_name)} requires ${decision.count} discard(s).</p>
                            <button type="button" class="primary-button" data-action="reveal-private-decision" data-decision-id="${this.escape_html(decision.id)}">Reveal My Hand</button>
                        </div>
                    </div>
                `;
            }

            const card_choices = player.hand.map((card) => {
                const definition = get_card_definition(card.definition_id);
                return `
                    <label class="discard-choice">
                        <input type="checkbox" data-discard-card="${this.escape_html(card.instance_id)}">
                        <span><strong>${this.escape_html(definition.name)}</strong><br><span class="muted">${this.escape_html(definition.rules_text)}</span></span>
                    </label>
                `;
            }).join("");

            return `
                <div class="overlay">
                    <div class="modal">
                        <div class="title-kicker">${this.escape_html(player.name)}</div>
                        <h2>Choose ${decision.count} card(s) to discard</h2>
                        ${view_state.decision_error === null ? "" : `<div class="error-banner">${this.escape_html(view_state.decision_error)}</div>`}
                        ${card_choices}
                        <div class="modal-actions">
                            <button type="button" class="primary-button" data-action="resolve-discard" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}" data-required-count="${decision.count}">Discard Selected</button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (decision.type === DECISION_TYPES.RECLAIM_DEFENSE) {
            const choices = decision.card_instance_ids.map((card_instance_id) => {
                const card = player.discard.find((candidate) => candidate.instance_id === card_instance_id);
                if (card === undefined) {
                    throw new Error(`Eligible Defense card ${card_instance_id} is missing from discard.`);
                }
                const definition = get_card_definition(card.definition_id);
                return `<button type="button" class="choice-button" data-action="resolve-reclaim" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}" data-card-instance-id="${this.escape_html(card.instance_id)}"><strong>${this.escape_html(definition.name)}</strong><br>${this.escape_html(definition.rules_text)}</button>`;
            }).join("");

            return `
                <div class="overlay">
                    <div class="modal">
                        <h2>Cooldown Ready!</h2>
                        <p>Choose a Defense card to return to ${this.escape_html(player.name)}'s hand.</p>
                        <div class="choice-grid">${choices}</div>
                    </div>
                </div>
            `;
        }

        if (decision.type === DECISION_TYPES.LOVE_OR_HATE) {
            const source = game_state.get_player_by_id(decision.source_player_id);
            return `
                <div class="overlay">
                    <div class="modal">
                        <div class="title-kicker">${this.escape_html(player.name)} chooses</div>
                        <h2>Love Me or Hate Me</h2>
                        <p>${this.escape_html(source.name)} played Love Me or Hate Me.</p>
                        <div class="choice-grid">
                            <button type="button" class="choice-button" data-action="resolve-love-hate" data-choice="love" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}"><strong>Love</strong><br>Heal ${this.escape_html(source.name)} for 2 HP.</button>
                            <button type="button" class="choice-button danger-button" data-action="resolve-love-hate" data-choice="hate" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}"><strong>Hate</strong><br>Take 2 damage. ${this.escape_html(source.name)} draws later.</button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (decision.type === DECISION_TYPES.SCREEN_BURN_TARGET) {
            const choices = decision.target_player_ids.map((target_player_id) => {
                const target_player = game_state.get_player_by_id(target_player_id);
                return `<button type="button" class="choice-button" data-action="resolve-screen-burn" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}" data-target-player-id="${this.escape_html(target_player.id)}">${this.escape_html(target_player.name)}<br>Deal 1 damage</button>`;
            }).join("");

            return `
                <div class="overlay">
                    <div class="modal">
                        <h2>Screen Burn-In</h2>
                        <p>You may deal 1 additional damage to one opponent damaged by the spell.</p>
                        <div class="choice-grid">${choices}</div>
                        <div class="modal-actions" style="margin-top: 10px;">
                            <button type="button" data-action="skip-screen-burn" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}">Skip</button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (decision.type === DECISION_TYPES.RAID_PALADIN_ACTION) {
            const attack_choices = decision.target_player_ids.map((target_player_id) => {
                const target_player = game_state.get_player_by_id(target_player_id);
                return `<button type="button" class="choice-button danger-button" data-action="resolve-raid" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}" data-raid-action="attack" data-target-player-id="${this.escape_html(target_player.id)}">Attack ${this.escape_html(target_player.name)}<br>Deal 1 damage</button>`;
            }).join("");

            return `
                <div class="overlay">
                    <div class="modal">
                        <h2>Raid Paladin</h2>
                        <p>Choose this summon's start-of-turn action.</p>
                        <div class="choice-grid">
                            <button type="button" class="choice-button" data-action="resolve-raid" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}" data-raid-action="heal"><strong>Heal</strong><br>Restore 1 HP.</button>
                            ${attack_choices}
                        </div>
                    </div>
                </div>
            `;
        }

        throw new Error(`No UI renderer for decision type: ${decision.type}`);
    }

    render_interaction_overlay(game_state, rules_engine, interaction) {
        if (interaction.type === "symbol_conversion") {
            const player = game_state.get_player_by_id(interaction.player_id);
            const card = rules_engine.get_card_from_hand(player, interaction.card_instance_id);
            const definition = get_card_definition(card.definition_id);
            const choices = interaction.options.map((conversion, option_index) => `
                <button type="button" class="choice-button" data-action="choose-conversion" data-card-instance-id="${this.escape_html(card.instance_id)}" data-option-index="${option_index}">
                    ${this.escape_html(conversion.from)} to ${this.escape_html(conversion.to)}
                </button>
            `).join("");

            return `
                <div class="overlay">
                    <div class="modal">
                        <h2>Can Do Everything</h2>
                        <p>${this.escape_html(definition.name)} may convert one Attack, Defense, or Healing symbol this turn.</p>
                        <div class="choice-grid">
                            <button type="button" class="choice-button" data-action="choose-no-conversion" data-card-instance-id="${this.escape_html(card.instance_id)}">Use card as printed</button>
                            ${choices}
                        </div>
                        <div class="modal-actions" style="margin-top: 10px;"><button type="button" data-action="cancel-interaction">Cancel</button></div>
                    </div>
                </div>
            `;
        }

        if (interaction.type === "card_target") {
            const player = game_state.get_player_by_id(interaction.player_id);
            const card = rules_engine.get_card_from_hand(player, interaction.card_instance_id);
            const definition = get_card_definition(card.definition_id);
            const choices = interaction.targets.map((target, target_index) => `
                <button type="button" class="choice-button" data-action="choose-card-target" data-target-index="${target_index}">${this.escape_html(target.label)}</button>
            `).join("");

            return `
                <div class="overlay">
                    <div class="modal">
                        <h2>Target for ${this.escape_html(definition.name)}</h2>
                        <div class="choice-grid">${choices}</div>
                        <div class="modal-actions" style="margin-top: 10px;"><button type="button" data-action="cancel-interaction">Cancel</button></div>
                    </div>
                </div>
            `;
        }

        if (interaction.type === "ability_target") {
            const choices = interaction.target_player_ids.map((target_player_id) => {
                const target_player = game_state.get_player_by_id(target_player_id);
                return `<button type="button" class="choice-button" data-action="choose-ability-target" data-target-player-id="${this.escape_html(target_player.id)}">${this.escape_html(target_player.name)}</button>`;
            }).join("");

            return `
                <div class="overlay">
                    <div class="modal">
                        <h2>Choose an opponent</h2>
                        <div class="choice-grid">${choices}</div>
                        <div class="modal-actions" style="margin-top: 10px;"><button type="button" data-action="cancel-interaction">Cancel</button></div>
                    </div>
                </div>
            `;
        }

        throw new Error(`No UI renderer for interaction type: ${interaction.type}`);
    }

    render_fatal_error(error) {
        const message = error instanceof Error ? `${error.name}: ${error.message}\n\n${error.stack}` : String(error);
        this.app_element.innerHTML = `
            <main class="fatal-screen panel">
                <div class="title-kicker">Fatal game error</div>
                <h1>Execution stopped</h1>
                <p>The game failed at the point of the error. No fallback state was substituted.</p>
                <pre class="fatal-message">${this.escape_html(message)}</pre>
                <button type="button" data-action="reload-page">Reload</button>
            </main>
        `;
    }

    escape_html(value) {
        const text = String(value);
        return text
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
}
