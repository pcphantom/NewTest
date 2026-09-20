/* =====================================================================
   UIHandler
   Owns: screen and tabletop HTML rendering.
   Stays out of: gameplay mutation and browser input handling.
   ===================================================================== */

import {
    CHARACTER_ABILITY_IDS,
    CHARACTER_IDS,
    DECISION_TYPES,
    GAME_MODES,
    MAX_PLAYERS,
    MENU_SCREENS,
    MIN_PLAYERS,
    PHASES,
    PLAYER_TYPES,
    SYMBOL_GLYPHS,
} from "./Constants.js";
import { get_character_definition, get_character_list } from "./CharacterData.js";
import { get_card_definition } from "./CardData.js";

export class UIHandler {
    constructor(document_reference, card_renderer) {
        if (typeof document_reference !== "object" || document_reference === null) {
            throw new TypeError("UIHandler requires a document reference.");
        }
        if (typeof card_renderer !== "object" || card_renderer === null) {
            throw new TypeError("UIHandler requires a CardRenderer instance.");
        }

        this.document = document_reference;
        this.card_renderer = card_renderer;
        this.app_element = document_reference.getElementById("app");
        if (this.app_element === null) {
            throw new Error("Missing #app root element.");
        }
    }

    render(game_state, rules_engine, turn_handler, view_state) {
        if (game_state.phase === PHASES.SETUP) {
            this.render_menu(view_state);
            return;
        }
        if (game_state.phase === PHASES.INITIATIVE) {
            this.render_initiative(game_state);
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

        this.render_table(game_state, rules_engine, turn_handler, view_state);
    }

    render_menu(view_state) {
        if (view_state.menu_screen === MENU_SCREENS.MAIN) {
            this.render_main_menu();
            return;
        }
        if (view_state.menu_screen === MENU_SCREENS.SINGLE_PLAYER_SETUP) {
            this.render_single_player_setup(view_state);
            return;
        }
        if (view_state.menu_screen === MENU_SCREENS.LOCAL_MULTIPLAYER_SETUP) {
            this.render_local_multiplayer_setup(view_state);
            return;
        }
        if (view_state.menu_screen === MENU_SCREENS.HOW_TO_PLAY) {
            this.render_how_to_play();
            return;
        }

        throw new Error(`Unknown menu screen: ${view_state.menu_screen}`);
    }

    render_main_menu() {
        this.app_element.innerHTML = `
            <main class="title-screen">
                <section class="title-banner">
                    <div class="title-eyebrow">Mini Multiplayer Offline RPG</div>
                    <h1>Dungeons <span>&amp;</span> Mayhem</h1>
                    <p>Python's Quest for the Holy Kale</p>
                </section>

                <section class="menu-board">
                    <button type="button" class="menu-card single-player-menu" data-action="open-single-player">
                        <span class="menu-card-icon">1P</span>
                        <span class="menu-card-copy">
                            <strong>Single Player</strong>
                            <small>Play against computer-controlled opponents.</small>
                        </span>
                    </button>

                    <button type="button" class="menu-card local-menu" data-action="open-local-multiplayer">
                        <span class="menu-card-icon">2-6</span>
                        <span class="menu-card-copy">
                            <strong>Local Multiplayer</strong>
                            <small>Hotseat play on one device.</small>
                        </span>
                    </button>

                    <button type="button" class="menu-card rules-menu" data-action="open-how-to-play">
                        <span class="menu-card-icon">?</span>
                        <span class="menu-card-copy">
                            <strong>How to Play</strong>
                            <small>Objective, symbols, turns, dice and Defense.</small>
                        </span>
                    </button>
                </section>
            </main>
        `;
    }

    render_single_player_setup(view_state) {
        const characters = get_character_list();
        const options = characters.map((character) =>
            `<option value="${this.escape_html(character.id)}" ${character.id === view_state.single_player_character_id ? "selected" : ""}>${this.escape_html(character.name)} | ${this.escape_html(character.archetype)}</option>`
        ).join("");

        this.app_element.innerHTML = `
            <main class="setup-screen">
                <section class="setup-panel">
                    <button type="button" class="back-button" data-action="back-to-main">← Main Menu</button>
                    <div class="screen-kicker">Single Player</div>
                    <h1>Choose Your Character</h1>

                    ${this.render_setup_error(view_state.setup_error)}

                    <div class="character-select-preview">
                        ${this.render_character_selector_cards(view_state.single_player_character_id)}
                    </div>

                    <div class="setup-form-grid">
                        <label>
                            <span>Player Name</span>
                            <input type="text" maxlength="28" data-single-name value="${this.escape_html(view_state.single_player_name)}">
                        </label>
                        <label>
                            <span>Character</span>
                            <select data-single-character>${options}</select>
                        </label>
                        <label>
                            <span>Total Players</span>
                            <select data-single-player-count>
                                ${this.render_player_count_options(view_state.single_player_count)}
                            </select>
                        </label>
                    </div>

                    <div class="setup-summary">
                        You plus ${view_state.single_player_count - 1} computer opponent(s). Distinct completed decks are assigned before repeats.
                    </div>

                    <button type="button" class="primary-action" data-action="start-single-player">Roll Into Battle</button>
                </section>
            </main>
        `;
    }

    render_local_multiplayer_setup(view_state) {
        const rows = view_state.local_players.map((player, player_index) => {
            const character_options = get_character_list().map((character) =>
                `<option value="${this.escape_html(character.id)}" ${character.id === player.character_id ? "selected" : ""}>${this.escape_html(character.name)}</option>`
            ).join("");

            return `
                <div class="hotseat-player-row">
                    <div class="seat-number">P${player_index + 1}</div>
                    <input type="text" maxlength="28" data-local-name="${player_index}" value="${this.escape_html(player.name)}" aria-label="Player ${player_index + 1} name">
                    <select data-local-character="${player_index}" aria-label="Player ${player_index + 1} character">
                        ${character_options}
                    </select>
                </div>
            `;
        }).join("");

        this.app_element.innerHTML = `
            <main class="setup-screen">
                <section class="setup-panel wide-setup">
                    <button type="button" class="back-button" data-action="back-to-main">← Main Menu</button>
                    <div class="screen-kicker">Local Multiplayer</div>
                    <h1>Build the Table</h1>

                    ${this.render_setup_error(view_state.setup_error)}

                    <label class="player-count-control">
                        <span>Players</span>
                        <select data-local-player-count>
                            ${this.render_player_count_options(view_state.local_player_count)}
                        </select>
                    </label>

                    <div class="hotseat-player-list">${rows}</div>

                    <button type="button" class="primary-action" data-action="start-local-multiplayer">Roll Initiative</button>
                </section>
            </main>
        `;
    }

    render_how_to_play() {
        this.app_element.innerHTML = `
            <main class="rules-screen">
                <section class="rules-sheet">
                    <button type="button" class="back-button" data-action="back-to-main">← Main Menu</button>
                    <div class="screen-kicker">Table Reference</div>
                    <h1>How to Play</h1>

                    <div class="rules-columns">
                        <article>
                            <h2>Goal</h2>
                            <p>Reduce every opponent to 0 HP. The last living player is the Last Pixel Standing.</p>

                            <h2>Setup</h2>
                            <p>Choose a 28-card character deck, start at 12 HP, draw 3 cards, then roll a d20 for initiative. Highest roll goes first. Highest ties reroll.</p>

                            <h2>Your Turn</h2>
                            <ol>
                                <li>Draw 1 card.</li>
                                <li>Play 1 mandatory card.</li>
                                <li>Use every Play Again action you gain.</li>
                                <li>Resolve persistent and end-of-turn effects.</li>
                            </ol>
                        </article>

                        <article>
                            <h2>Core Symbols</h2>
                            <div class="symbol-guide">
                                <div><span>⚔️</span><strong>Attack</strong><small>1 damage each. Defense absorbs first.</small></div>
                                <div><span>🛡️</span><strong>Defense</strong><small>1 shield each. Defense cards stay in play.</small></div>
                                <div><span>❤️</span><strong>Healing</strong><small>Restore 1 HP each, up to 12.</small></div>
                                <div><span>🃏</span><strong>Draw</strong><small>Draw 1 card each.</small></div>
                                <div><span>⚡</span><strong>Play Again</strong><small>Gain 1 additional mandatory action.</small></div>
                            </div>

                            <h2>Dice</h2>
                            <p>d20 rolls handle initiative and saving throws. Natural 20 succeeds. Natural 1 fails. Some cards use other dice.</p>
                        </article>
                    </div>
                </section>
            </main>
        `;
    }

    render_initiative(game_state) {
        const next_player = game_state.get_next_initiative_player();
        const seats = game_state.players.map((player) => {
            const history = player.initiative_history.map((roll) => `<span class="roll-history-value">${roll}</span>`).join("");
            const active_class = next_player !== null && next_player.id === player.id ? "initiative-active" : "";
            return `
                <div class="initiative-seat ${active_class}">
                    ${this.card_renderer.render_character_portrait(player.character_id, "portrait-medium")}
                    <div class="initiative-seat-name">${this.escape_html(player.name)}</div>
                    <div class="initiative-character-name">${this.escape_html(get_character_definition(player.character_id).name)}</div>
                    <div class="initiative-die ${player.initiative_roll === null ? "" : "rolled"}">
                        <span>d20</span>
                        <strong>${player.initiative_roll === null ? "?" : player.initiative_roll}</strong>
                    </div>
                    <div class="initiative-history">${history}</div>
                </div>
            `;
        }).join("");

        let action = "";
        if (next_player !== null) {
            if (next_player.player_type === PLAYER_TYPES.HUMAN) {
                action = `
                    <button type="button" class="primary-action roll-button" data-action="roll-initiative" data-player-id="${this.escape_html(next_player.id)}">
                        ${this.escape_html(next_player.name)}: Roll d20
                    </button>
                `;
            } else {
                action = `<div class="computer-thinking">Computer is reaching for the d20...</div>`;
            }
        }

        this.app_element.innerHTML = `
            <main class="initiative-screen">
                <section class="initiative-tray">
                    <div class="screen-kicker">Initiative Round ${game_state.initiative_round}</div>
                    <h1>Roll for First Player</h1>
                    <p>Highest d20 result takes the first turn. Highest ties reroll.</p>
                    <div class="initiative-grid">${seats}</div>
                    <div class="initiative-action">${action}</div>
                </section>
            </main>
        `;
    }

    render_handoff(game_state) {
        const player = game_state.get_active_player();
        const character = get_character_definition(player.character_id);

        if (player.player_type === PLAYER_TYPES.COMPUTER) {
            this.app_element.innerHTML = `
                <main class="handoff-screen">
                    <section class="handoff-card">
                        ${this.card_renderer.render_character_portrait(player.character_id, "portrait-large")}
                        <div class="screen-kicker">Turn ${game_state.turn_number}</div>
                        <h1>${this.escape_html(player.name)}</h1>
                        <p>${this.escape_html(character.name)}</p>
                        <div class="computer-thinking">Computer turn in progress...</div>
                    </section>
                </main>
            `;
            return;
        }

        this.app_element.innerHTML = `
            <main class="handoff-screen">
                <section class="handoff-card">
                    ${this.card_renderer.render_character_portrait(player.character_id, "portrait-large")}
                    <div class="screen-kicker">Turn ${game_state.turn_number} | Round ${game_state.round_number}</div>
                    <h1>Pass to ${this.escape_html(player.name)}</h1>
                    <p>${this.escape_html(character.name)}</p>
                    <p class="muted">Your hand stays hidden until you reveal the table.</p>
                    <button type="button" class="primary-action" data-action="reveal-turn" data-player-id="${this.escape_html(player.id)}">Reveal My Hand</button>
                </section>
            </main>
        `;
    }

    render_table(game_state, rules_engine, turn_handler, view_state) {
        const active_player = game_state.get_active_player();
        const opponent_seats = game_state.players
            .filter((player) => player.id !== active_player.id)
            .map((player) => this.render_player_playmat(player, false))
            .join("");

        const hand = active_player.player_type === PLAYER_TYPES.HUMAN
            ? this.render_hand(active_player, game_state.actions_remaining > 0)
            : '<div class="hidden-computer-hand">Computer hand is hidden.</div>';

        const current_decision = game_state.get_current_decision();

        this.app_element.innerHTML = `
            <main class="table-screen">
                <header class="table-topbar">
                    <button type="button" class="table-menu-button" data-action="return-to-main">Menu</button>
                    <div class="turn-readout">
                        <strong>Turn ${game_state.turn_number}</strong>
                        <span>Round ${game_state.round_number}</span>
                        <span>Actions ${game_state.actions_remaining}</span>
                    </div>
                    <div class="mode-readout">${game_state.game_mode === GAME_MODES.SINGLE_PLAYER ? "Single Player" : "Local Multiplayer"}</div>
                </header>

                <section class="game-table">
                    <div class="wood-edge wood-edge-top"></div>

                    <div class="opponent-rail">
                        ${opponent_seats}
                    </div>

                    <div class="table-center">
                        <div class="center-dice-tray">
                            <div class="dice-tray-label">TABLE</div>
                            <div class="turn-orb">${game_state.actions_remaining}</div>
                            <div class="dice-tray-copy">${this.escape_html(active_player.name)} is active</div>
                        </div>
                        <div class="last-play-stage">
                            ${active_player.last_played_card_definition_id === null
                                ? '<div class="empty-last-play">Play area</div>'
                                : this.card_renderer.render_table_card_from_definition(active_player.last_played_card_definition_id, "current-play-card")}
                        </div>
                    </div>

                    <div class="active-playmat">
                        ${this.render_player_playmat(active_player, true)}
                    </div>

                    <div class="hand-dock">
                        <div class="hand-dock-label">
                            <span>YOUR HAND</span>
                            <span>${active_player.hand.length} CARDS</span>
                        </div>
                        <div class="hand-fan">${hand}</div>
                        <div class="table-action-bar">
                            ${this.render_active_ability_button(active_player)}
                            <button type="button" data-action="end-turn" data-player-id="${this.escape_html(active_player.id)}" ${turn_handler.can_end_turn() ? "" : "disabled"}>End Turn</button>
                        </div>
                    </div>

                    <aside class="combat-log-drawer">
                        <details>
                            <summary>Combat Log</summary>
                            <div class="combat-log-list">
                                ${[...game_state.event_log].reverse().slice(0, 20).map((event) =>
                                    `<div><span>T${event.turn_number}</span> ${this.escape_html(event.message)}</div>`
                                ).join("")}
                            </div>
                        </details>
                    </aside>
                </section>
            </main>
        `;

        if (current_decision !== null) {
            this.app_element.insertAdjacentHTML(
                "beforeend",
                this.render_decision_overlay(game_state, current_decision, view_state)
            );
            return;
        }

        if (view_state.interaction !== null) {
            this.app_element.insertAdjacentHTML(
                "beforeend",
                this.render_interaction_overlay(game_state, rules_engine, view_state.interaction)
            );
        }
    }

    render_player_playmat(player, is_active) {
        const character = get_character_definition(player.character_id);
        const discard_top = player.discard.length === 0
            ? this.card_renderer.render_empty_discard()
            : this.card_renderer.render_mini_card_from_definition(player.discard[player.discard.length - 1].definition_id);

        const defenses = player.defenses.length === 0
            ? '<div class="zone-empty">No active Defense</div>'
            : player.defenses.map((defense) => `
                <div class="defense-slot-card">
                    ${this.card_renderer.render_table_card_from_definition(defense.card.definition_id, "defense-table-card")}
                    <span class="shield-counter">🛡️ ${defense.current_shields}</span>
                </div>
            `).join("");

        const summons = player.summons.length === 0
            ? '<div class="zone-empty">No summons</div>'
            : player.summons.map((summon) =>
                `<div class="summon-token"><strong>${this.escape_html(summon.name)}</strong><span>${summon.hp}/${summon.max_hp} HP</span></div>`
            ).join("");

        const status_chips = this.render_status_chips(player);
        const active_class = is_active ? "active-seat" : "";
        const eliminated_class = player.eliminated ? "eliminated-seat" : "";

        return `
            <article class="player-playmat ${active_class} ${eliminated_class}">
                <div class="seat-header">
                    ${this.card_renderer.render_character_portrait(player.character_id, is_active ? "portrait-medium" : "portrait-small")}
                    <div class="seat-identity">
                        <strong>${this.escape_html(player.name)}</strong>
                        <span>${this.escape_html(character.name)}</span>
                    </div>
                    <div class="hp-die" aria-label="${player.hp} hit points">
                        <span>d12</span>
                        <strong>${player.hp}</strong>
                    </div>
                </div>

                <div class="seat-zones">
                    <div class="pile-zone">
                        <div class="zone-label">Deck</div>
                        ${this.card_renderer.render_card_back(player.character_id, player.deck.length)}
                    </div>
                    <div class="pile-zone">
                        <div class="zone-label">Discard</div>
                        <div class="discard-stack">${discard_top}<div class="discard-count">${player.discard.length}</div></div>
                    </div>
                    <div class="persistent-zone">
                        <div class="zone-label">Defense</div>
                        <div class="defense-row">${defenses}</div>
                    </div>
                    <div class="persistent-zone">
                        <div class="zone-label">Summons</div>
                        <div class="summon-row">${summons}</div>
                    </div>
                </div>

                <div class="status-row">${status_chips}</div>
            </article>
        `;
    }

    render_hand(player, enabled) {
        return player.hand.map((card, card_index) =>
            this.card_renderer.render_hand_card(card, enabled, card_index, player.hand.length)
        ).join("");
    }

    render_active_ability_button(player) {
        if (player.player_type !== PLAYER_TYPES.HUMAN) {
            return "";
        }

        if (player.character_id === CHARACTER_IDS.GRANDPA) {
            return `<button type="button" data-action="select-ability" data-ability-id="${CHARACTER_ABILITY_IDS.MONOCHROME_LECTURE}" ${player.monochrome_lecture_used_this_turn ? "disabled" : ""}>Monochrome Lecture</button>`;
        }

        if (player.character_id === CHARACTER_IDS.MALRIC) {
            const disabled = player.threat_generation_used_this_turn || player.cards_played_this_turn > 0;
            return `<button type="button" data-action="select-ability" data-ability-id="${CHARACTER_ABILITY_IDS.THREAT_GENERATION}" ${disabled ? "disabled" : ""}>Threat Generation</button>`;
        }

        return "";
    }

    render_status_chips(player) {
        const statuses = [];
        if (player.forced_attack_target_player_id !== null) statuses.push("TAUNTED");
        if (player.outgoing_attack_reductions.length > 0) statuses.push("ATTACK DOWN");
        if (player.incoming_attack_reductions.length > 0) statuses.push("GUARDED");
        if (player.skip_next_turn_after_draw) statuses.push("LOADING");
        if (player.skip_next_play_again_count > 0) statuses.push("PLAY AGAIN BLOCKED");
        if (player.phosphor_burn_source_player_ids.length > 0) statuses.push("PHOSPHOR BURN");
        if (player.tank_specs_activated_turn !== null) statuses.push("TANK SPECS");
        if (player.blessing_of_kings_activated_turn !== null) statuses.push("BLESSED");
        if (player.vengeance_activated_turn !== null) statuses.push("VENGEANCE");

        return statuses.map((status) => `<span class="status-chip">${status}</span>`).join("");
    }

    render_decision_overlay(game_state, decision, view_state) {
        const player = game_state.get_player_by_id(decision.player_id);

        if (player.player_type === PLAYER_TYPES.COMPUTER) {
            return `
                <div class="modal-overlay">
                    <div class="choice-modal">
                        <div class="computer-thinking">${this.escape_html(player.name)} is deciding...</div>
                    </div>
                </div>
            `;
        }

        if (decision.type === DECISION_TYPES.DISCARD_CARDS) {
            if (!view_state.private_decision_revealed) {
                return `
                    <div class="modal-overlay">
                        <div class="choice-modal">
                            <h2>Private Hand Choice</h2>
                            <p>Pass the device to ${this.escape_html(player.name)}.</p>
                            <button type="button" class="primary-action" data-action="reveal-private-decision" data-decision-id="${this.escape_html(decision.id)}">Reveal Hand</button>
                        </div>
                    </div>
                `;
            }

            const choices = player.hand.map((card) => {
                const definition = get_card_definition(card.definition_id);
                return `
                    <label class="discard-choice">
                        <input type="checkbox" data-discard-card="${this.escape_html(card.instance_id)}">
                        <span><strong>${this.escape_html(definition.name)}</strong><small>${this.escape_html(definition.rules_text)}</small></span>
                    </label>
                `;
            }).join("");

            return `
                <div class="modal-overlay">
                    <div class="choice-modal">
                        <h2>Discard ${decision.count}</h2>
                        ${view_state.decision_error === null ? "" : `<div class="form-error">${this.escape_html(view_state.decision_error)}</div>`}
                        <div class="discard-list">${choices}</div>
                        <button type="button" class="primary-action" data-action="resolve-discard" data-decision-id="${this.escape_html(decision.id)}" data-player-id="${this.escape_html(player.id)}" data-required-count="${decision.count}">Discard Selected</button>
                    </div>
                </div>
            `;
        }

        if (decision.type === DECISION_TYPES.RECLAIM_DEFENSE) {
            const choices = decision.card_instance_ids.map((card_instance_id) => {
                const card = player.discard.find((candidate) => candidate.instance_id === card_instance_id);
                if (card === undefined) throw new Error(`Missing Defense card ${card_instance_id}.`);
                return `<button type="button" class="choice-button" data-action="resolve-reclaim" data-decision-id="${decision.id}" data-player-id="${player.id}" data-card-instance-id="${card.instance_id}">${this.escape_html(get_card_definition(card.definition_id).name)}</button>`;
            }).join("");

            return this.render_choice_modal("Cooldown Ready!", "Return a Defense card to your hand.", choices);
        }

        if (decision.type === DECISION_TYPES.LOVE_OR_HATE) {
            return this.render_choice_modal(
                "Love Me or Hate Me",
                `${this.escape_html(player.name)} chooses.`,
                `
                    <button type="button" class="choice-button" data-action="resolve-love-hate" data-choice="love" data-decision-id="${decision.id}" data-player-id="${player.id}">Love: heal Patchadin 2</button>
                    <button type="button" class="choice-button danger-choice" data-action="resolve-love-hate" data-choice="hate" data-decision-id="${decision.id}" data-player-id="${player.id}">Hate: take 2 damage</button>
                `
            );
        }

        if (decision.type === DECISION_TYPES.SCREEN_BURN_TARGET) {
            const choices = decision.target_player_ids.map((target_id) => {
                const target = game_state.get_player_by_id(target_id);
                return `<button type="button" class="choice-button" data-action="resolve-screen-burn" data-decision-id="${decision.id}" data-player-id="${player.id}" data-target-player-id="${target.id}">${this.escape_html(target.name)}</button>`;
            }).join("") + `<button type="button" class="choice-button" data-action="skip-screen-burn" data-decision-id="${decision.id}" data-player-id="${player.id}">Skip</button>`;

            return this.render_choice_modal("Screen Burn-In", "Deal 1 extra damage to a damaged opponent.", choices);
        }

        if (decision.type === DECISION_TYPES.RAID_PALADIN_ACTION) {
            const attacks = decision.target_player_ids.map((target_id) => {
                const target = game_state.get_player_by_id(target_id);
                return `<button type="button" class="choice-button" data-action="resolve-raid" data-decision-id="${decision.id}" data-player-id="${player.id}" data-raid-action="attack" data-target-player-id="${target.id}">Attack ${this.escape_html(target.name)}</button>`;
            }).join("");
            return this.render_choice_modal(
                "Raid Paladin",
                "Choose this summon action.",
                `<button type="button" class="choice-button" data-action="resolve-raid" data-decision-id="${decision.id}" data-player-id="${player.id}" data-raid-action="heal">Heal 1</button>${attacks}`
            );
        }

        throw new Error(`No UI renderer for decision type: ${decision.type}`);
    }

    render_interaction_overlay(game_state, rules_engine, interaction) {
        if (interaction.type === "symbol_conversion") {
            const player = game_state.get_player_by_id(interaction.player_id);
            const card = rules_engine.get_card_from_hand(player, interaction.card_instance_id);
            const definition = get_card_definition(card.definition_id);
            const choices = interaction.options.map((option, option_index) =>
                `<button type="button" class="choice-button" data-action="choose-conversion" data-option-index="${option_index}">${SYMBOL_GLYPHS[option.from]} → ${SYMBOL_GLYPHS[option.to]}</button>`
            ).join("");

            return this.render_choice_modal(
                "Can Do Everything",
                `Convert one symbol on ${this.escape_html(definition.name)}.`,
                `<button type="button" class="choice-button" data-action="choose-no-conversion">Use printed symbols</button>${choices}<button type="button" class="choice-button" data-action="cancel-interaction">Cancel</button>`
            );
        }

        if (interaction.type === "card_target") {
            const choices = interaction.targets.map((target, target_index) =>
                `<button type="button" class="choice-button" data-action="choose-card-target" data-target-index="${target_index}">${this.escape_html(target.label)}</button>`
            ).join("");
            return this.render_choice_modal("Choose Target", "Select a legal table target.", `${choices}<button type="button" class="choice-button" data-action="cancel-interaction">Cancel</button>`);
        }

        if (interaction.type === "ability_target") {
            const choices = interaction.target_player_ids.map((target_id) => {
                const target = game_state.get_player_by_id(target_id);
                return `<button type="button" class="choice-button" data-action="choose-ability-target" data-target-player-id="${target.id}">${this.escape_html(target.name)}</button>`;
            }).join("");
            return this.render_choice_modal("Choose Opponent", "Select the ability target.", `${choices}<button type="button" class="choice-button" data-action="cancel-interaction">Cancel</button>`);
        }

        throw new Error(`No UI renderer for interaction type: ${interaction.type}`);
    }

    render_choice_modal(title, copy, choices) {
        return `
            <div class="modal-overlay">
                <div class="choice-modal">
                    <h2>${title}</h2>
                    <p>${copy}</p>
                    <div class="choice-grid">${choices}</div>
                </div>
            </div>
        `;
    }

    render_fatal_error(error) {
        const message = error instanceof Error
            ? `${error.name}: ${error.message}\n\n${error.stack}`
            : String(error);

        this.app_element.innerHTML = `
            <main class="fatal-screen">
                <section class="fatal-panel">
                    <div class="screen-kicker">Fatal Game Error</div>
                    <h1>Execution Stopped</h1>
                    <p>The game stopped at the failing state. No replacement state was invented.</p>
                    <pre>${this.escape_html(message)}</pre>
                    <button type="button" class="primary-action" data-action="reload-page">Reload</button>
                </section>
            </main>
        `;
    }

    render_game_over(game_state) {
        if (game_state.winner_player_id === null) {
            throw new Error("Game Over requires a winner.");
        }

        const winner = game_state.get_player_by_id(game_state.winner_player_id);
        const character = get_character_definition(winner.character_id);

        this.app_element.innerHTML = `
            <main class="victory-screen">
                <section class="victory-card">
                    ${this.card_renderer.render_character_portrait(winner.character_id, "portrait-large")}
                    <div class="screen-kicker">Last Pixel Standing</div>
                    <h1>${this.escape_html(winner.name)}</h1>
                    <p>${this.escape_html(character.name)} wins with ${winner.hp} HP.</p>
                    <button type="button" class="primary-action" data-action="new-match">Return to Main Menu</button>
                </section>
            </main>
        `;
    }

    render_character_selector_cards(selected_character_id) {
        return get_character_list().map((character) => `
            <button type="button" class="character-choice ${character.id === selected_character_id ? "selected" : ""}" data-action="select-single-character" data-character-id="${character.id}">
                ${this.card_renderer.render_character_portrait(character.id, "portrait-medium")}
                <strong>${this.escape_html(character.name)}</strong>
                <span>${this.escape_html(character.archetype)}</span>
            </button>
        `).join("");
    }

    render_player_count_options(selected_count) {
        const options = [];
        for (let player_count = MIN_PLAYERS; player_count <= MAX_PLAYERS; player_count += 1) {
            options.push(`<option value="${player_count}" ${player_count === selected_count ? "selected" : ""}>${player_count}</option>`);
        }
        return options.join("");
    }

    render_setup_error(error_message) {
        if (error_message === null) return "";
        return `<div class="form-error">${this.escape_html(error_message)}</div>`;
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
