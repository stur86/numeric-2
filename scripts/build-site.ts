/**
 * Build the project website into build/site:
 *
 *   build/site/index.html     front page (site/)
 *   build/site/docs/          API reference (TypeDoc → build/docs)
 *   build/site/benchmarks/    benchmark report (benchmarks/web/dist, from benchmarks/results/*.json)
 *   build/site/dist/          library bundles (dist/)
 *
 *   bun run site:build                    # build every part, then assemble
 *   bun run site:build -- --assemble-only # only assemble parts that were built already (CI)
 *
 * Benchmarks are not re-run here: the report uses the saved results
 * (run bench:bun / bench:node first to refresh them).
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dir, "..");
const out = join(root, "build", "site");
const assembleOnly = process.argv.includes("--assemble-only");

async function run(cmd: string[], label: string) {
    console.log(`→ ${label}`);
    const p = Bun.spawn(cmd, { cwd: root, stdout: "inherit", stderr: "inherit" });
    if ((await p.exited) !== 0) throw new Error(`${label} failed`);
}

if (!assembleOnly) {
    await run(["bunx", "typedoc"], "API reference (TypeDoc)");
    await run(["bun", "run", "build"], "library bundles");
    await run(["bun", "run", "bench:web"], "benchmark report");
}

const parts: [string, string][] = [
    [join(root, "build", "docs"), "docs"],
    [join(root, "benchmarks", "web", "dist"), "benchmarks"],
    [join(root, "dist"), "dist"],
];
for (const [src] of parts) {
    if (!existsSync(src)) throw new Error(`Missing ${src}: build it first (or run without --assemble-only)`);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "site"), out, { recursive: true });
for (const [src, dest] of parts) cpSync(src, join(out, dest), { recursive: true });
// Serve files as-is on GitHub Pages (no Jekyll processing of _-prefixed paths)
writeFileSync(join(out, ".nojekyll"), "");
console.log(`Site assembled in ${out}`);
