/**
 * Seeded random number generation, modelled on NumPy's Generator API.
 *
 *     const rng = defaultRng(42);
 *     rng.uniform(-1, 1, 5);          // Vector
 *     rng.normal(0, 1, [3, 4]);       // Matrix
 *     rng.integers(0, 10, [2, 2, 2]); // TensorBase (3-D)
 *     rng.random([4], { bare: true }); // number[]
 *
 * The bit generator is xoshiro128** (Blackman & Vigna), seeded through
 * SplitMix32. It uses only 32-bit integer arithmetic, so it is fast in every
 * JavaScript engine. Sequences differ from NumPy's (which uses PCG64) for the
 * same seed.
 */

import Vector from "./vector";
import Matrix from "./matrix";
import { TensorBase, type NestedArray } from "./base";

/** A sample shape: a length, or a list of dimensions. */
export type Size = number | readonly number[];

/** Sampling options. */
export type SampleOptions = {
    /** Return plain (nested) arrays instead of Vector/Matrix/TensorBase (default false). */
    bare?: boolean;
};

/**
 * The type of a sample of the given size:
 * no size → number; n or [n] → Vector; [m, n] → Matrix; more dimensions →
 * TensorBase. With { bare: true }, the matching plain arrays instead.
 */
export type Sample<S, B> =
    S extends undefined ? number
    : S extends number | readonly [number] ? (B extends true ? number[] : Vector)
    : S extends readonly [number, number] ? (B extends true ? number[][] : Matrix)
    : S extends readonly [] ? number
    : (B extends true ? NestedArray<number> : TensorBase);

const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));

/** SplitMix32: expands a seed into well-mixed 32-bit words. */
function splitmix32(seed: number): () => number {
    let a = seed | 0;
    return () => {
        a = (a + 0x9e3779b9) | 0;
        let t = a ^ (a >>> 16);
        t = Math.imul(t, 0x21f0aaad);
        t ^= t >>> 15;
        t = Math.imul(t, 0x735a2d97);
        return (t ^ (t >>> 15)) >>> 0;
    };
}

/** A fresh seed from the platform's entropy source (or Math.random as a fallback). */
function entropySeed(): number {
    const c = (globalThis as any).crypto;
    if (c && typeof c.getRandomValues === "function") {
        const w = new Uint32Array(2);
        c.getRandomValues(w);
        return w[0] * 4294967296 + (w[1] & 0x1fffff);
    }
    return Math.floor(Math.random() * 9007199254740992);
}

/** Seeded random number generator (xoshiro128**). Create one with defaultRng(seed). */
export class RandomGenerator {
    private s0: number;
    private s1: number;
    private s2: number;
    private s3: number;
    /** Second value of the last polar-method pair, if unused. */
    private spare: number | null = null;
    /** The seed this generator was created with. */
    readonly seed: number;

    /**
     * @param seed  Any finite number (integers up to 2^53 are used in full);
     *              omitted → seeded from the platform's entropy source.
     */
    constructor(seed?: number) {
        if (seed !== undefined && !Number.isFinite(seed)) throw new Error("RandomGenerator: seed must be a finite number");
        this.seed = seed ?? entropySeed();
        // Mix both halves of the (up to 53-bit) seed into the 128-bit state
        const lo = this.seed >>> 0, hi = Math.floor(Math.abs(this.seed) / 4294967296) >>> 0;
        const sm = splitmix32(lo ^ Math.imul(hi, 0x85ebca6b) ^ (this.seed < 0 ? 0x5bd1e995 : 0));
        this.s0 = sm(); this.s1 = sm(); this.s2 = sm(); this.s3 = sm();
        if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 1; // the all-zero state is invalid
    }

    /** Next raw 32-bit output, as an unsigned integer. */
    nextUint32(): number {
        const s1 = this.s1;
        const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;
        const t = s1 << 9;
        this.s2 ^= this.s0;
        this.s3 ^= this.s1;
        this.s1 ^= this.s2;
        this.s0 ^= this.s3;
        this.s2 ^= t;
        this.s3 = rotl(this.s3, 11);
        return result;
    }

    /** A double uniform in [0, 1) with full 53-bit resolution. */
    private nextDouble(): number {
        return ((this.nextUint32() >>> 5) * 67108864 + (this.nextUint32() >>> 6)) / 9007199254740992;
    }

    /** A standard normal deviate (Marsaglia polar method). */
    private nextNormal(): number {
        if (this.spare !== null) {
            const v = this.spare;
            this.spare = null;
            return v;
        }
        let u: number, v: number, s: number;
        do {
            u = 2 * this.nextDouble() - 1;
            v = 2 * this.nextDouble() - 1;
            s = u * u + v * v;
        } while (s >= 1 || s === 0);
        const f = Math.sqrt((-2 * Math.log(s)) / s);
        this.spare = v * f;
        return u * f;
    }

    /** A uniform integer in [0, range), without modulo bias (range ≤ 2^53). */
    private nextBelow(range: number): number {
        if (range <= 4294967296) {
            // Rejection sampling on 32-bit outputs
            const limit = 4294967296 - (4294967296 % range);
            let x: number;
            do x = this.nextUint32(); while (x >= limit);
            return x % range;
        }
        const limit = 9007199254740992 - (9007199254740992 % range);
        let x: number;
        do x = (this.nextUint32() >>> 5) * 67108864 + (this.nextUint32() >>> 6); while (x >= limit);
        return x % range;
    }

    /** Fill a sample of the given size, wrapping it unless bare. */
    private sample(size: Size | undefined, draw: () => number, options: SampleOptions | undefined): any {
        if (size === undefined) return draw();
        const shape = typeof size === "number" ? [size] : [...size];
        if (shape.length === 0) return draw();
        for (const d of shape) {
            if (!(Number.isInteger(d) && d >= 0)) throw new Error(`RandomGenerator: invalid size [${shape.join(", ")}]`);
        }
        const build = (level: number): any => {
            const n = shape[level];
            const out = new Array(n);
            if (level === shape.length - 1) {
                for (let i = 0; i < n; i++) out[i] = draw();
            } else {
                for (let i = 0; i < n; i++) out[i] = build(level + 1);
            }
            return out;
        };
        const data = build(0);
        if (options?.bare) return data;
        if (shape.includes(0)) throw new Error("RandomGenerator: Vector/Matrix cannot be empty (use { bare: true } for empty samples)");
        if (shape.length === 1) return new Vector(data);
        if (shape.length === 2) return new Matrix(data);
        return new TensorBase(data, null, shape);
    }

    /** Uniform samples in [0, 1). */
    random<const S extends Size | undefined = undefined, const O extends SampleOptions = {}>(size?: S, options?: O): Sample<S, O["bare"]> {
        return this.sample(size, () => this.nextDouble(), options);
    }

    /** Uniform samples in [low, high). */
    uniform<const S extends Size | undefined = undefined, const O extends SampleOptions = {}>(low: number = 0, high: number = 1, size?: S, options?: O): Sample<S, O["bare"]> {
        if (!(high >= low)) throw new Error("uniform: high must be >= low");
        const w = high - low;
        return this.sample(size, () => low + w * this.nextDouble(), options);
    }

    /** Normal (Gaussian) samples with the given mean (loc) and standard deviation (scale). */
    normal<const S extends Size | undefined = undefined, const O extends SampleOptions = {}>(loc: number = 0, scale: number = 1, size?: S, options?: O): Sample<S, O["bare"]> {
        if (!(scale >= 0)) throw new Error("normal: scale must be >= 0");
        return this.sample(size, () => loc + scale * this.nextNormal(), options);
    }

    /** Standard normal samples (mean 0, standard deviation 1). */
    standardNormal<const S extends Size | undefined = undefined, const O extends SampleOptions = {}>(size?: S, options?: O): Sample<S, O["bare"]> {
        return this.sample(size, () => this.nextNormal(), options);
    }

    /**
     * Uniform integers in [low, high) (NumPy's convention). With one argument,
     * integers(high) samples [0, high).
     */
    integers<const S extends Size | undefined = undefined, const O extends SampleOptions = {}>(low: number, high?: number, size?: S, options?: O): Sample<S, O["bare"]> {
        if (high === undefined) {
            high = low;
            low = 0;
        }
        if (!Number.isInteger(low) || !Number.isInteger(high)) throw new Error("integers: low and high must be integers");
        const range = high - low;
        if (!(range >= 1)) throw new Error("integers: high must be > low");
        if (range > 9007199254740992) throw new Error("integers: range must be at most 2^53");
        const lo = low;
        return this.sample(size, () => lo + this.nextBelow(range), options);
    }
}

/**
 * A new seeded generator, like NumPy's default_rng.
 *
 * @param seed  Any finite number; omitted → seeded from the platform's entropy source.
 */
export function defaultRng(seed?: number): RandomGenerator {
    return new RandomGenerator(seed);
}
