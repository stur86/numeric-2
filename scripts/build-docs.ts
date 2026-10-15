/**
 * Build the API reference (TypeDoc → build/docs), titled with the site
 * version, with a "Home" link back to the front page in the toolbar.
 *
 *   bun run docs:build
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, relative, sep } from "path";
import { siteVersion } from "./version";

const root = join(import.meta.dir, "..");
const out = join(root, "build", "docs");
const version = siteVersion();

const p = Bun.spawn(["bunx", "typedoc", "--name", `numeric-2 ${version}`, "--out", out], {
    cwd: root, stdout: "inherit", stderr: "inherit",
});
if ((await p.exited) !== 0) process.exit(1);

// typedoc.json's navigationLinks are written verbatim ("../"), which is the
// front page only from top-level pages: deepen it for pages in subfolders.
// (Each page has two copies: the toolbar and the mobile menu.)
const link = /<a href="\.\.\/"( class="tsd-nav-link")?>Home<\/a>/g;
function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith(".html")) {
            const depth = relative(out, path).split(sep).length - 1;
            if (depth === 0) continue;
            const html = readFileSync(path, "utf8");
            if (html.match(link) === null) throw new Error(`No Home link in ${path}`);
            writeFileSync(path, html.replace(link, (a) => a.replace('"../"', `"${"../".repeat(depth + 1)}"`)));
        }
    }
}
walk(out);
console.log(`API reference for numeric-2 ${version} in ${out}`);
