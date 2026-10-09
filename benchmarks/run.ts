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
import * as numeric2 from "../index";
import { runAll, DEFAULT_TIMING, type ResultFile, type Measurement } from "./suites";

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

const timing = flag("quick") ? { sampleMs: 10, samples: 7 } : DEFAULT_TIMING;

const fmt = (us: number) =>
    Number.isNaN(us) ? "—" : us < 1 ? `${(us * 1000).toFixed(0)} ns` : us < 1000 ? `${us.toFixed(2)} µs` : `${(us / 1000).toFixed(2)} ms`;

console.log(`Benchmarking on ${runtime} (${process.platform}/${process.arch})`);
const pending: Record<string, Measurement> = {};
const results = await runAll({ numeric, numeric2 }, {
    ...timing,
    filter: option("filter"),
    onResult: (m) => {
        const key = `${m.suite} / ${m.case} [${m.sizeLabel}]`;
        if (m.lib === "numeric") {
            pending[key] = m;
            return;
        }
        const old = pending[key];
        const ratio = old && !Number.isNaN(old.median) ? old.median / m.median : NaN;
        const agree = m.agrees === null ? "" : m.agrees ? "" : "  MISMATCH";
        console.log(
            `${key.padEnd(60)} numeric ${fmt(old?.median ?? NaN).padStart(10)}   numeric-2 ${fmt(m.median).padStart(10)}` +
            `   ${Number.isNaN(ratio) ? "" : `${ratio.toFixed(2)}×`}${agree}`);
    },
});

const file: ResultFile = {
    env: { runtime, platform: `${process.platform}/${process.arch}`, date: new Date().toISOString() },
    results,
};
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${runtimeKey}.json`);
writeFileSync(outPath, JSON.stringify(file, null, 1));
console.log(`\nWrote ${outPath}`);
