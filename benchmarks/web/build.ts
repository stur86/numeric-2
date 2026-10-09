/**
 * Build the benchmark page into benchmarks/web/dist/:
 *   bench.js      page logic + numeric-2 + shared suites (browser bundle)
 *   results.json  server results from benchmarks/results/*.json
 *   index.html    page.html wrapped in a document skeleton (for local serving)
 *
 *   bun run bench:web     # build
 *   bun run bench:serve   # serve dist/ on http://localhost:4321
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const here = import.meta.dir;
const dist = join(here, "dist");
const resultsDir = join(here, "..", "results");
mkdirSync(dist, { recursive: true });

const build = await Bun.build({
    entrypoints: [join(here, "app.ts")],
    target: "browser",
    format: "esm",
    minify: true,
});
if (!build.success) {
    for (const log of build.logs) console.error(log);
    process.exit(1);
}
await Bun.write(join(dist, "bench.js"), build.outputs[0]);

const runs = [];
for (const id of ["bun", "node"]) {
    const p = join(resultsDir, `${id}.json`);
    if (existsSync(p)) runs.push({ id, ...JSON.parse(readFileSync(p, "utf8")) });
    else console.warn(`No ${id} results (${p}); run bun run bench:${id} first.`);
}
writeFileSync(join(dist, "results.json"), JSON.stringify({ runs }));

// page.html is written without a skeleton (it is also published as-is)
const page = readFileSync(join(here, "page.html"), "utf8");
writeFileSync(join(dist, "index.html"),
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}\n</body>\n</html>\n`);

console.log(`Built ${dist} (${runs.length} server run(s))`);
