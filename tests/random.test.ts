/** Seeded random generation: bit generator vs a Python reference, and distribution tests. */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle } from "./runner";
import { defaultRng, RandomGenerator, Vector, Matrix, Tensor } from "../index";

afterAll(() => killOracle());

describe("bit generator vs reference implementation", () => {
    for (const seed of [0, 1, 42, 123456789, 2 ** 40 + 17, -5, 2 ** 53 - 1]) {
        test(`seed ${seed}`, async () => {
            const res = await oracle({ op: "xoshiro", seed });
            const e = res.expected as any;
            const rng = defaultRng(seed);
            expect(Array.from({ length: 20 }, () => rng.nextUint32())).toEqual(e.raw);
            // Doubles continue the same stream
            expect(rng.random(20, { bare: true })).toEqual(e.doubles);
        });
    }
});

/** Kolmogorov–Smirnov statistic of a sample against a CDF. */
function ks(sample: number[], cdf: (x: number) => number): number {
    const s = [...sample].sort((a, b) => a - b), n = s.length;
    let d = 0;
    s.forEach((x, i) => { const F = cdf(x); d = Math.max(d, F - i / n, (i + 1) / n - F); });
    return d;
}
// Normal CDF via the error function (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7)
function normCdf(x: number): number {
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return 0.5 * (1 + Math.sign(x) * y);
}
const N = 20000, KS_CRIT = 1.63 / Math.sqrt(N); // 1% significance; seeds are fixed, so tests are deterministic

describe("distributions", () => {
    test("random() and uniform() are uniform", () => {
        const rng = defaultRng(1);
        const u = rng.random(N, { bare: true });
        expect(u.every((x) => x >= 0 && x < 1)).toBe(true);
        expect(ks(u, (x) => Math.min(1, Math.max(0, x)))).toBeLessThan(KS_CRIT);
        const w = rng.uniform(-3, 5, N, { bare: true });
        expect(w.every((x) => x >= -3 && x < 5)).toBe(true);
        expect(ks(w, (x) => Math.min(1, Math.max(0, (x + 3) / 8)))).toBeLessThan(KS_CRIT);
    });

    test("normal() has the right distribution, mean and spread", () => {
        const rng = defaultRng(2);
        const z = rng.standardNormal(N, { bare: true });
        expect(ks(z, normCdf)).toBeLessThan(KS_CRIT);
        const x = rng.normal(10, 3, N, { bare: true });
        const mean = x.reduce((a, b) => a + b, 0) / N;
        const sd = Math.sqrt(x.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1));
        expect(Math.abs(mean - 10)).toBeLessThan(4 * 3 / Math.sqrt(N));
        expect(Math.abs(sd - 3)).toBeLessThan(0.1);
        expect(ks(x, (v) => normCdf((v - 10) / 3))).toBeLessThan(KS_CRIT);
    });

    test("integers() covers [low, high) evenly", () => {
        const rng = defaultRng(3);
        const k = rng.integers(-3, 4, N, { bare: true });
        expect(k.every((v) => Number.isInteger(v) && v >= -3 && v < 4)).toBe(true);
        const counts = new Array(7).fill(0);
        for (const v of k) counts[v + 3]++;
        const chi2 = counts.reduce((s, c) => s + (c - N / 7) ** 2 / (N / 7), 0);
        expect(chi2).toBeLessThan(16.81); // chi-square, 6 dof, 1%
        expect(rng.integers(5, undefined, 100, { bare: true }).every((v) => v >= 0 && v < 5)).toBe(true);
        // Ranges beyond 2^32
        const big = rng.integers(0, 2 ** 40, 1000, { bare: true });
        expect(big.every((v) => Number.isInteger(v) && v >= 0 && v < 2 ** 40)).toBe(true);
        expect(Math.max(...big)).toBeGreaterThan(2 ** 39);
    });
});

describe("API", () => {
    test("output types follow the size", () => {
        const rng = defaultRng(4);
        expect(typeof rng.random()).toBe("number");
        expect(typeof rng.normal(0, 1, [])).toBe("number");
        expect(rng.uniform(0, 1, 3)).toBeInstanceOf(Vector);
        expect(rng.uniform(0, 1, [3])).toBeInstanceOf(Vector);
        const M = rng.normal(0, 1, [2, 5]);
        expect(M).toBeInstanceOf(Matrix);
        expect(M.shape).toEqual([2, 5]);
        const T = rng.standardNormal([2, 3, 4]);
        expect(T).toBeInstanceOf(Tensor);
        expect(T.shape).toEqual([2, 3, 4]);
        const raw = rng.integers(0, 3, [2, 2], { bare: true });
        expect(Array.isArray(raw) && Array.isArray(raw[0])).toBe(true);
        expect(rng.random([0], { bare: true })).toEqual([]);
    });

    test("bare and wrapped samples carry the same numbers", () => {
        expect(defaultRng(9).normal(1, 2, [3, 3]).real).toEqual(defaultRng(9).normal(1, 2, [3, 3], { bare: true }));
    });

    test("same seed, same stream; different seeds differ", () => {
        expect(defaultRng(10).random(5, { bare: true })).toEqual(new RandomGenerator(10).random(5, { bare: true }));
        expect(defaultRng(10).random(5, { bare: true })).not.toEqual(defaultRng(11).random(5, { bare: true }));
        const a = defaultRng(), b = defaultRng();
        expect(a.seed).not.toBe(b.seed);
        expect(defaultRng(a.seed).random(4, { bare: true })).toEqual(a.random(4, { bare: true }));
    });

    test("argument checks", () => {
        const rng = defaultRng(0);
        expect(() => rng.uniform(1, 0)).toThrow("high");
        expect(() => rng.normal(0, -1)).toThrow("scale");
        expect(() => rng.integers(3, 3)).toThrow("high must be > low");
        expect(() => rng.integers(0.5, 3)).toThrow("integers");
        expect(() => rng.random([2, -1])).toThrow("invalid size");
        expect(() => rng.random([0])).toThrow("cannot be empty");
        expect(() => defaultRng(NaN)).toThrow("finite");
    });
});
