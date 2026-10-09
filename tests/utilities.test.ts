/**
 * Cross-validation tests for utility functions against NumPy.
 */
import { describe, test, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D } from "./runner";
import { getBlock, getBlock1D } from "../src/utils";

afterAll(() => killOracle());

const SEEDS = [42, 123, 7, 999];

// ── getBlock (2D submatrix extraction) ──

describe("getBlock", () => {
    const cases = [
        { m: 8, n: 6, r0: 1, c0: 2, r1: 5, c1: 5 },
        { m: 10, n: 10, r0: 0, c0: 0, r1: 3, c1: 3 },
        { m: 5, n: 8, r0: 2, c0: 1, r1: 5, c1: 7 },
        { m: 6, n: 6, r0: 0, c0: 0, r1: 6, c1: 6 },  // full matrix
        { m: 10, n: 10, r0: 3, c0: 3, r1: 4, c1: 4 },  // single element
        { m: 20, n: 15, r0: 5, c0: 3, r1: 18, c1: 12 },  // large slice
    ];

    for (const { m, n, r0, c0, r1, c1 } of cases) {
        for (const seed of SEEDS) {
            test(`[${r0}:${r1}, ${c0}:${c1}] from ${m}x${n} seed=${seed}`, async () => {
                const resp = await oracle({
                    op: "getBlock", seed, m, n, r0, c0, r1, c1,
                } as any);
                const A = resp.inputs.A as number[][];
                const expected = resp.expected as number[][];

                const result = getBlock(A, r0, c0, r1, c1);
                assertClose2D(result, expected, 0, "getBlock ");
            });
        }
    }
});

// ── getBlock1D (1D slice extraction) ──

describe("getBlock1D", () => {
    const cases = [
        { n: 20, from: 3, to: 12 },
        { n: 50, from: 0, to: 50 },   // full vector
        { n: 100, from: 10, to: 11 },  // single element
        { n: 30, from: 0, to: 15 },
        { n: 200, from: 50, to: 150 },  // large slice
    ];

    for (const { n, from, to } of cases) {
        for (const seed of SEEDS) {
            test(`[${from}:${to}] from length ${n} seed=${seed}`, async () => {
                const resp = await oracle({
                    op: "getBlock1D", seed, n, from, to,
                } as any);
                const x = resp.inputs.x as number[];
                const expected = resp.expected as number[];

                const result = getBlock1D(x, from, to);
                assertClose(result, expected, 0, "getBlock1D ");
            });
        }
    }
});
