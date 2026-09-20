import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("every browser module and stylesheet shares the current content version", () => {
    execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/version-assets.mjs', import.meta.url)), '--check']);
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const version = html.match(/name="game-build" content="([a-f0-9]+)"/)[1];
    const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
    for (const name of readdirSync(new URL('../src/', import.meta.url)).filter(n => n.endsWith('.js') && n !== 'Startup.js')) {
        assert.equal(map.imports[`./src/${name}`], `./src/${name}?v=${version}`);
    }
    assert.ok(html.includes(`Styles.css?v=${version}`));
    assert.ok(html.includes(`Startup.js?v=${version}`));
});
