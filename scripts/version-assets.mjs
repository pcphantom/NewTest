// Generate matching cache keys for the entire module graph and stylesheet.
// No bundler or dependencies are required for this static GitHub Pages site.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const module_names = readdirSync(new URL("src/", root)).filter(name => name.endsWith(".js")).sort();
const asset_paths = ["Styles.css", ...module_names.map(name => `src/${name}`)];
const hash = createHash("sha256");
for (const path of asset_paths) {
    hash.update(path + "\0");
    // Git may convert line endings between Windows and GitHub's checkout.
    hash.update(readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n"));
}
const version = hash.digest("hex").slice(0, 12);
const imports = Object.fromEntries(module_names.filter(name => name !== "Startup.js")
    .map(name => [`./src/${name}`, `./src/${name}?v=${version}`]));
const index_url = new URL("index.html", root);
const original = readFileSync(index_url, "utf8");
const updated = original
    .replace(/(<meta name="game-build" content=")[^"]*(">)/, `$1${version}$2`)
    .replace(/href="\.\/Styles\.css(?:\?v=[^"]*)?"/, `href="./Styles.css?v=${version}"`)
    .replace(/src="\.\/src\/Startup\.js(?:\?v=[^"]*)?"/, `src="./src/Startup.js?v=${version}"`)
    .replace(/<!-- versioned-modules:start -->[\s\S]*?<!-- versioned-modules:end -->/,
        `<!-- versioned-modules:start -->\n    <script type="importmap">${JSON.stringify({ imports }, null, 2)}</script>\n    <!-- versioned-modules:end -->`);
if (!updated.includes(`content="${version}"`) || !updated.includes(`GameBootstrap.js?v=${version}`)) {
    throw new Error("Missing asset-version markers in index.html.");
}
if (process.argv.includes("--check")) {
    if (original.replaceAll("\r\n", "\n") !== updated.replaceAll("\r\n", "\n")) {
        throw new Error("Asset versions are out of date. Run npm run build before publishing.");
    }
} else if (updated !== original) {
    writeFileSync(index_url, updated);
}
console.log(`Game build ${version}`);
