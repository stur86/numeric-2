/**
 * Server-side benchmark runner (Bun or Node).
 *
 *   bun run bench:bun                 # Bun, from source
 *   bun run bench:node                # Node, from a bundled build of this file
 *   ... -- --filter "linear" --quick  # subset / shorter samples
 *
 * Writes benchmarks/results/<runtime>.json.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import numeric from "numeric";
import { mathjs, numeric2, stdlib, VERSIONS } from "./libs";
import { runAll, DEFAULT_TIMING, QUICK_TIMING, LIBS, LIB_TITLE, type ResultFile, type Measurement, type LibName } from "./suites";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
};

const isBun = typeof (globalThis as any).Bun !== "undefined";
const runtime = isBun ? `Bun ${(globalThis as any).Bun.version}` : `Node ${process.versions.node}`;
const runtimeKey = isBun ? "bun" : "node";
const outDir = option("out") ?? join(process.cwd(), "benchmarks", "results");
const libs = option("libs")?.split(",") as LibName[] | undefined;

const fmt = (us: number) =>
    Number.isNaN(us) ? "—" : us < 1 ? `${(us * 1000).toFixed(0)} ns` : us < 1000 ? `${us.toFixed(2)} µs` : `${(us / 1000).toFixed(2)} ms`;

console.log(`Benchmarking on ${runtime} (${process.platform}/${process.arch})`);
console.log(`${"".padEnd(52)}${LIBS.map((l) => LIB_TITLE[l].padStart(13)).join("")}`);
const pending = new Map<string, Partial<Record<LibName, Measurement>>>();
const results = await runAll({ numeric, numeric2, mathjs, stdlib }, {
    ...(flag("quick") ? QUICK_TIMING : DEFAULT_TIMING),
    filter: option("filter"),
    libs,
    onResult: (m) => {
        const key = `${m.suite} / ${m.case} [${m.sizeLabel}]`;
        const row = pending.get(key) ?? {};
        row[m.lib] = m;
        pending.set(key, row);
    },
});
for (const [key, row] of pending) {
    const flags = LIBS.filter((l) => row[l]?.agrees === false).map((l) => LIB_TITLE[l]);
    console.log(key.slice(0, 51).padEnd(52) + LIBS.map((l) => (row[l] ? fmt(row[l]!.median) : "")
        .padStart(13)).join("") + (flags.length ? `   differs: ${flags.join(", ")}` : ""));
}

const file: ResultFile = {
    env: { runtime, platform: `${process.platform}/${process.arch}`, date: new Date().toISOString(), versions: VERSIONS },
    results,
};
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${runtimeKey}.json`);
writeFileSync(outPath, JSON.stringify(file, null, 1));
console.log(`\nWrote ${outPath}`);
