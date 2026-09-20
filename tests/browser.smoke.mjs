// Run against a local static server. PLAYWRIGHT_MODULE can point to a bundled installation.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = join(tmpdir(), "newtest-ui-verification");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const errors = [];
const action = (page, name) => page.locator(`[data-action="${name}"]`);

async function setup(viewport, touch = false) {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    context.setDefaultTimeout(7000);
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    // Test-only observability: the production bootstrap exports no global state.
    await page.route(/\/src\/GameBootstrap\.js(?:\?.*)?$/, async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: await response.text() + "\nwindow.testGame = { game_state, rules_engine, turn_handler, dice_handler, input_handler };" });
    });
    await page.goto(process.env.TEST_URL || "http://127.0.0.1:8765/");
    await action(page, "open-single-player").click();
    await page.locator("[data-single-name]").fill("UI Tester");
    await page.locator("[data-single-player-count]").selectOption("3");
    assert.match(await page.locator(".setup-summary").innerText(), /2 computer/);
    assert.equal(await page.locator("[data-single-name]").inputValue(), "UI Tester");
    const controls = await page.locator(".setup-form-grid input, .setup-form-grid select").evaluateAll(nodes => nodes.map(node => {
        const b = node.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width };
    }));
    assert.ok(controls[2].width <= 112, "player count stays compact");
    assert.ok(controls[1].right <= controls[2].x || controls[1].bottom <= controls[2].y, "selects never overlap");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "setup fits width");
    await page.screenshot({ path: join(output, `setup-${viewport.width}.png`), fullPage: true });
    await action(page, "back-to-main").click();
    await action(page, "open-local-multiplayer").click();
    await action(page, "start-local-multiplayer").click();
    await page.evaluate(() => {
        const values = [.95, .1];
        testGame.dice_handler.random_number_generator = () => values.shift() ?? .5;
    });
    await action(page, "roll-initiative").click();
    await action(page, "roll-initiative").click();
    await action(page, "reveal-turn").click();
    return { page, context };
}

async function boardFits(page) {
    const sizes = await page.evaluate(() => {
        const hand = document.querySelector(".hand-dock").getBoundingClientRect();
        return { height: innerHeight, width: innerWidth, bodyHeight: document.documentElement.scrollHeight, bodyWidth: document.documentElement.scrollWidth, bottom: hand.bottom, top: hand.top };
    });
    assert.ok(sizes.bodyWidth <= sizes.width, "no page horizontal overflow");
    assert.ok(sizes.bodyHeight <= sizes.height + 1, `board does not push hand below viewport: ${JSON.stringify(sizes)}`);
    assert.ok(sizes.bottom <= sizes.height + 1 && sizes.top >= 0, "hand bar is always on screen");
}

try {
    for (const [width, height, touch] of [[2560,1440,false],[1440,900,false],[390,844,true],[360,640,true],[844,390,true]]) {
        const {page, context} = await setup({width,height}, touch);
        const activate = locator => touch ? locator.tap() : locator.click();
        await boardFits(page);
        assert.deepEqual(await page.locator('[role="meter"]').evaluateAll(nodes => nodes.map(n => [n.getAttribute("aria-valuenow"), n.getAttribute("aria-valuemax")])), [["12","12"],["12","12"]]);
        assert.equal(await page.locator(".hp-die").count(), 0);
        assert.equal(await action(page, "select-ability").count(), 0);
        if (!touch) {
            await action(page, "toggle-hand").hover();
            assert.equal(await action(page, "toggle-hand").getAttribute("aria-expanded"), "true");
            await page.mouse.move(2, 2);
            assert.equal(await action(page, "toggle-hand").getAttribute("aria-expanded"), "false");
        }
        await activate(action(page, "toggle-hand"));
        if (!touch) await page.mouse.move(2,2);
        assert.equal(await action(page, "toggle-hand").getAttribute("aria-expanded"), "true");
        await boardFits(page);
        const cards = page.locator(".hand-card");
        const fanStyles = await cards.evaluateAll(nodes => nodes.map(node => {
            const style = getComputedStyle(node);
            return { opacity: style.opacity, overlap: style.marginLeft, background: style.backgroundColor };
        }));
        assert.ok(fanStyles.every(card => card.opacity === '1'), 'overlapping cards stay opaque');
        assert.ok(fanStyles.slice(1).every(card => card.overlap === (width <= 680 ? '-32px' : '-22px')), 'original fan overlap is retained');
        if (!touch) {
            await cards.first().hover();
            await page.waitForTimeout(150);
            const card = await cards.first().boundingBox();
            const fan = await page.locator('.hand-fan').boundingBox();
            assert.equal(await page.locator('#card-hover-preview').isVisible(), false, 'hand hover does not spawn a floating copy');
            assert.ok(card.width > 216 && card.width < 240, 'the original card scales proportionally');
            assert.ok(card.y >= fan.y && card.y >= 0, 'lifted card is not clipped at the top');
            assert.equal(await cards.first().evaluate(node => getComputedStyle(node).zIndex), '1000', 'hovered card is in front');
            await page.screenshot({path:join(output, `hover-${width}.png`)});
        }
        const before = await page.evaluate(() => JSON.stringify(testGame.game_state));
        if (touch) await cards.first().press('i');
        else await cards.first().click({button:'right'});
        assert.equal(await page.locator(".card-inspection").count(), 1);
        assert.equal(await page.locator('.card-inspection [data-action="select-card"]').count(), 0, 'inspection is not a second Play confirmation');
        assert.equal(await page.evaluate(() => JSON.stringify(testGame.game_state)), before, "inspection does not play card");
        await page.screenshot({path:join(output, `inspect-${width}.png`)});
        await activate(action(page, "close-inspection"));
        await activate(action(page, "toggle-hand"));
        assert.equal(await action(page, "toggle-hand").getAttribute("aria-expanded"), "false");
        await action(page, "open-game-menu").click();
        await action(page, "request-quit").click();
        assert.equal(await page.evaluate(() => JSON.stringify(testGame.game_state)), before, "menu and quit prompt preserve match");
        await action(page, "resume-game").click();
        assert.equal(await page.evaluate(() => JSON.stringify(testGame.game_state)), before, "resume preserves match");
        if (!touch) {
            await action(page, "toggle-fullscreen").click();
            assert.equal(await page.evaluate(() => document.fullscreenElement !== null), true);
            await action(page, "toggle-fullscreen").click();
            await page.waitForFunction(() => document.fullscreenElement === null);
        }
        await action(page, "show-skills").first().click();
        assert.ok((await page.locator(".skill-reference").innerText()).includes("Threat Generation"));
        await action(page, "close-inspection").click();
        await page.mouse.move(2,2);
        await page.screenshot({path:join(output, `board-${width}.png`)});
        // Exercise a real attack through click/tap -> target -> visible HP update.
        await page.evaluate(() => {
            const {game_state, input_handler} = testGame;
            const player = game_state.get_active_player();
            const index = player.deck.findIndex(card => card.definition_id === 'grandpa_8_bit_blast');
            if (index >= 0) player.hand.push(player.deck.splice(index, 1)[0]);
            input_handler.view_state.hand_pinned = true;
            input_handler.render();
        });
        await activate(page.locator('.hand-card[data-card-definition-id="grandpa_8_bit_blast"]').first());
        assert.equal(await page.locator('.card-inspection').count(), 0, 'playing bypasses inspection');
        assert.match(await page.locator('.choice-modal').innerText(), /Deal 2 damage/);
        // Menu also works during a pending choice, without losing that choice.
        await activate(page.locator('.modal-game-menu'));
        await activate(action(page, "resume-game"));
        assert.equal(await action(page, "choose-card-target").count(), 1);
        await activate(action(page, "choose-card-target"));
        assert.equal(await page.locator('[data-player-id="player_2"] [role="meter"]').getAttribute('aria-valuenow'), '10');
        await activate(action(page, "toggle-hand"));
        // Put a genuine public Defense in an opponent's zone; never reveal their hand.
        await page.evaluate(async () => {
            const {game_state, rules_engine, input_handler} = testGame;
            const player = game_state.players[1];
            const pile = [player.hand, player.deck].find(pile => pile.some(c => c.definition_id === 'malric_defensive_stance'));
            const card = pile.splice(pile.findIndex(c => c.definition_id === 'malric_defensive_stance'), 1)[0];
            const {get_card_definition} = await import('/src/CardData.js');
            rules_engine.create_defense(player, card, get_card_definition(card.definition_id), 3);
            input_handler.render();
        });
        const publicCard = page.locator('.opponent-rail [data-card-definition-id="malric_defensive_stance"]');
        if (!touch) {
            await publicCard.hover();
            assert.match(await page.locator('#card-hover-preview').innerText(), /Defensive Stance/);
        }
        await activate(publicCard);
        assert.equal(await page.locator('.card-inspection [data-action="select-card"]').count(), 0, "opponent card is reference-only");
        await activate(action(page, "close-inspection"));
        console.log(`PASS ${width}x${height}: setup, HP, hand, card reading, pause/resume, skills`);
        await context.close();
    }
    const {page, context} = await setup({width:1440, height:900});
    await page.evaluate(async () => {
        const C = await import('/src/Constants.js');
        const {turn_handler, dice_handler, game_state, input_handler} = testGame;
        input_handler.clear_automatic_timer();
        turn_handler.start_match(Array.from({length:6}, (_,i) => ({name:`Seat ${i+1}`, character_id:Object.values(C.CHARACTER_IDS)[i%3], player_type:C.PLAYER_TYPES.HUMAN})), C.GAME_MODES.LOCAL_MULTIPLAYER);
        const rolls = [.95,.1,.2,.3,.4,.5];
        dice_handler.random_number_generator = () => rolls.shift() ?? .1;
        while (game_state.phase === C.PHASES.INITIATIVE) turn_handler.roll_initiative(game_state.get_next_initiative_player().id);
        turn_handler.reveal_active_turn(game_state.get_active_player().id);
        input_handler.render();
    });
    await boardFits(page);
    assert.equal(await page.locator('[role="meter"]').count(), 6);
    assert.equal(await page.locator('.health-summary').count(), 6);
    await page.screenshot({path:join(output,'six-player.png')});
    await page.evaluate(() => {
        const player = testGame.game_state.get_active_player();
        player.hand.push(...player.deck.splice(0,16));
        testGame.input_handler.view_state.hand_pinned = true;
        testGame.input_handler.render();
    });
    const lastCard = page.locator('.hand-card').last();
    await lastCard.click({button:'right'});
    await action(page, "close-inspection").click();
    assert.ok(await page.locator('.hand-fan').evaluate(node => node.scrollLeft > 0), "reading a card preserves hand scroll position");
    await page.keyboard.press('Escape');
    await action(page, 'toggle-hand').focus();
    await page.keyboard.press('Enter');
    assert.equal(await action(page, 'toggle-hand').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await action(page, 'toggle-hand').getAttribute('aria-expanded'), 'false');
    await page.setViewportSize({width:390,height:844});
    await boardFits(page);
    assert.ok(await page.locator('.opponent-rail').evaluate(node => node.scrollWidth > node.clientWidth), "six-player seats are horizontally accessible on mobile");
    await page.locator('.opponent-rail').evaluate(node => node.scrollLeft = node.scrollWidth);
    await page.locator('.opponent-rail [data-action="show-skills"]').last().click();
    await action(page, 'close-inspection').click();
    assert.ok(await page.locator('.opponent-rail').evaluate(node => node.scrollLeft > 0), "seat position survives reference modal");
    await page.screenshot({path:join(output,'six-player-mobile.png')});
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(async () => {
        const C = await import('/src/Constants.js');
        const {turn_handler, dice_handler, game_state, input_handler} = testGame;
        input_handler.clear_automatic_timer();
        turn_handler.start_match([
            {name:'Patchadin', character_id:C.CHARACTER_IDS.PATCHADIN, player_type:C.PLAYER_TYPES.HUMAN},
            {name:'Grandpa', character_id:C.CHARACTER_IDS.GRANDPA, player_type:C.PLAYER_TYPES.HUMAN}
        ], C.GAME_MODES.LOCAL_MULTIPLAYER);
        const rolls=[.95,.1];
        dice_handler.random_number_generator = () => rolls.shift() ?? .5;
        while (game_state.phase === C.PHASES.INITIATIVE) turn_handler.roll_initiative(game_state.get_next_initiative_player().id);
        turn_handler.reveal_active_turn(game_state.get_active_player().id);
        const player = game_state.get_active_player();
        for (const id of ['patchadin_blatant_favoritism','patchadin_divine_intervention','patchadin_wake_of_ashes']) {
            if (player.hand.some(c => c.definition_id === id)) continue;
            player.hand.push(player.deck.splice(player.deck.findIndex(c => c.definition_id === id), 1)[0]);
        }
        input_handler.view_state.hand_pinned = true;
        input_handler.render();
    });
    await page.locator('.hand-card[data-card-definition-id="patchadin_blatant_favoritism"]').first().hover();
    assert.equal(await page.locator('#card-hover-preview').isVisible(), false);
    const v2Card = page.locator('.hand-card[data-card-definition-id="patchadin_blatant_favoritism"]').first();
    assert.equal(await v2Card.locator('.symbol-value').count(), 4);
    assert.match(await v2Card.innerText(), /Developer's Favorite/);
    const v2Preview = await v2Card.boundingBox();
    assert.ok(v2Preview.y >= 0 && v2Preview.y + v2Preview.height <= 901);
    await page.screenshot({path:join(output,'v2-blatant-hover.png')});
    await page.locator('.hand-card[data-card-definition-id="patchadin_blatant_favoritism"]').first().click({button:'right'});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:join(output,'v2-blatant-mobile.png')});
    await action(page,'close-inspection').click();
    await page.evaluate(async () => {
        const C = await import('/src/Constants.js');
        const {turn_handler, dice_handler, game_state, input_handler} = testGame;
        input_handler.clear_automatic_timer();
        turn_handler.start_match([
            {name:'Human', character_id:C.CHARACTER_IDS.GRANDPA, player_type:C.PLAYER_TYPES.HUMAN},
            {name:'CPU', character_id:C.CHARACTER_IDS.MALRIC, player_type:C.PLAYER_TYPES.COMPUTER}
        ], C.GAME_MODES.SINGLE_PLAYER);
        const rolls=[.1,.95];
        dice_handler.random_number_generator = () => rolls.shift() ?? .5;
        while (game_state.phase === C.PHASES.INITIATIVE) turn_handler.roll_initiative(game_state.get_next_initiative_player().id);
        input_handler.render();
    });
    assert.equal(await page.locator('.table-screen').count(), 1, 'single-player enters the board directly');
    assert.equal(await action(page, 'reveal-turn').count(), 0, 'no single-player privacy handoff');
    assert.equal(await page.locator('.active-playmat .seat-identity strong').innerText(), 'Human', 'the human seat stays fixed while CPU is active');
    await action(page, 'open-game-menu').click();
    const paused = await page.evaluate(() => JSON.stringify(testGame.game_state));
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => JSON.stringify(testGame.game_state)), paused, "CPU cannot continue under pause menu");
    await action(page, 'resume-game').click();
    await page.waitForFunction(() => testGame.game_state.get_active_player().name === 'Human');
    assert.equal(await action(page, 'reveal-turn').count(), 0);
    assert.equal(await action(page, 'toggle-hand').getAttribute('aria-expanded'), 'true', 'human hand opens automatically');
    assert.match(await page.locator('.last-play-caption').innerText(), /CPU played/, 'CPU play persists into the human turn');
    await action(page, 'open-game-menu').click();
    await action(page, 'request-quit').click();
    await action(page, 'confirm-quit').click();
    assert.equal(await action(page, 'open-single-player').count(), 1);
    console.log('PASS six players, long hand, keyboard, scroll preservation, paused CPU and explicit quit');
    await context.close();
    assert.deepEqual(errors, []);
    console.log(`Screenshots: ${output}`);
} finally {
    await browser.close();
}
