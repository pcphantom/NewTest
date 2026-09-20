import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../src/Startup.js", import.meta.url), "utf8");

function run_startup(protocol = "http:") {
    const status = { textContent: "", isConnected: true };
    const heading = { textContent: "" };
    const events = new Map();
    const script_events = new Map();
    const scripts = [];
    const window = {
        location: { protocol },
        addEventListener: (type, callback) => events.set(type, callback),
        removeEventListener: type => events.delete(type),
    };
    const document = {
        currentScript: { src: "https://example.test/NewTest/src/Startup.js?v=testbuild" },
        getElementById: id => id === "startup-status" ? status : heading,
        createElement: () => ({ addEventListener: (type, callback) => script_events.set(type, callback) }),
        head: { append: script => scripts.push(script) },
    };
    runInNewContext(source, { document, window, URL });
    return { status, heading, scripts, events, script_events };
}

test("direct-file startup explains how to play without attempting blocked modules", () => {
    const result = run_startup("file:");
    assert.match(result.heading.textContent, /web server/);
    assert.match(result.status.textContent, /opened index.html directly/);
    assert.equal(result.scripts.length, 0);
});

test("HTTP startup loads the module relative to the entry script, including Pages subpaths", () => {
    const result = run_startup();
    assert.equal(result.scripts.length, 1);
    assert.equal(result.scripts[0].type, "module");
    assert.equal(result.scripts[0].src, "https://example.test/NewTest/src/GameBootstrap.js?v=testbuild");
    assert.match(result.status.textContent, /Loading/);
    result.script_events.get("load")();
    assert.equal(result.events.size, 0);
});

test("missing modules and initialization errors leave a visible recovery message", () => {
    for (const event_source of ["script_events", "events"]) {
        const result = run_startup();
        result[event_source].get("error")();
        assert.match(result.heading.textContent, /could not start/);
        assert.match(result.status.textContent, /full project/);
        assert.equal(result.events.size, 0);
    }
});

test("startup errors cannot replace an already running game", () => {
    const result = run_startup();
    result.status.isConnected = false;
    result.script_events.get("error")();
    assert.equal(result.heading.textContent, "");
});

test("HTML contains useful instructions even when JavaScript cannot load", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    assert.match(html, /id="startup-status"/);
    assert.match(html, /python -m http.server 8765/);
    assert.match(html, /href="http:\/\/127.0.0.1:8765\/"/);
    assert.match(html, /<script defer src="\.\/src\/Startup.js\?v=[a-f0-9]+"><\/script>/);
});
