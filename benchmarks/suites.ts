/**
 * Environment-agnostic benchmark suites comparing numeric.js and numeric-2.
 *
 * The same code runs under Bun, Node and in the browser: the libraries are
 * passed in, timing uses `performance.now()`, and the runner yields between
 * measurements so a page stays responsive.
 *
 * Every case times each library's *public* API on identical seeded inputs.
 * Inputs are converted to each library's own types (e.g. Vector/Matrix for
 * numeric-2, T for numeric.js complex values) outside of the timed region;
 * wrapping the outputs is part of the timed call.
 */

export type LibName = "numeric" | "numeric-2";
export const LIBS: LibName[] = ["numeric", "numeric-2"];

/** The libraries under test. Either may be missing (e.g. numeric.js blocked by CSP). */
export type Libs = { numeric?: any; numeric2?: any };

type Prepared = Partial<Record<LibName, any>>;

export type Case = {
    suite: string;
    name: string;
    /** Problem sizes to run, and how to describe them. */
    sizes: number[];
    sizeLabel: (n: number) => string;
    /** Build per-library inputs from seeded random data. */
    setup: (n: number, rng: () => number, libs: Libs) => Prepared;
    /** One call per library, on that library's prepared input. */
    run: Record<LibName, (input: any, lib: any) => any>;
    /** Compare outputs (already converted with toPlain); null = not comparable. */
    check?: (a: Plain, b: Plain) => boolean | null;
};

export type Measurement = {
    suite: string;
    case: string;
    size: number;
    sizeLabel: string;
    lib: LibName;
    /** Time per call, in microseconds. */
    median: number;
    p25: number;
    p75: number;
    min: number;
    /** Calls per sample and number of samples. */
    batch: number;
    samples: number;
    /** Whether the result matched the other library (null if unchecked). */
    agrees: boolean | null;
    error?: string;
};

export type EnvInfo = {
    runtime: string;
    platform: string;
    date: string;
    userAgent?: string;
};

export type ResultFile = {
    env: EnvInfo;
    results: Measurement[];
};

// ── Seeded random data ──

export function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const randVec = (n: number, rng: () => number) => {
    const v = Array(n);
    for (let i = 0; i < n; i++) v[i] = rng() * 2 - 1;
    return v;
};
const randMat = (m: number, n: number, rng: () => number) => {
    const A = Array(m);
    for (let i = 0; i < m; i++) A[i] = randVec(n, rng);
    return A;
};
/** Diagonally dominant (well-conditioned) square matrix. */
const wellConditioned = (n: number, rng: () => number) => {
    const A = randMat(n, n, rng);
    for (let i = 0; i < n; i++) A[i][i] += n;
    return A;
};

// ── Result normalization and comparison ──

export type Plain = { re: any; im: any } | null;

/** Convert either library's output to {re, im} (im null if real). */
export function toPlain(x: any): Plain {
    if (x === undefined || x === null) return null;
    if (typeof x === "number") return { re: x, im: null };
    if (Array.isArray(x)) return { re: x, im: null };
    // numeric-2 Vector/Matrix
    if ("_re" in x) return { re: x._re, im: x._im };
    // numeric-2 Complex scalar
    if (typeof x.re === "number") return { re: x.re, im: x.im };
    // numeric.js T
    if ("x" in x) return { re: x.x, im: x.y ?? null };
    return null;
}

function maxAbsDiff(a: any, b: any): number {
    if (typeof a === "number" || typeof b === "number") {
        if (a === b) return 0; // also covers matching infinities
        return Math.abs((a ?? 0) - (b ?? 0));
    }
    if (a === null && b === null) return 0;
    if (a === null) return maxAbsDiff(b, zerosLike(b));
    if (b === null) return maxAbsDiff(a, zerosLike(a));
    if (a.length !== b.length) return Infinity;
    let d = 0;
    for (let i = 0; i < a.length; i++) d = Math.max(d, maxAbsDiff(a[i], b[i]));
    return d;
}

function zerosLike(a: any): any {
    return typeof a === "number" ? 0 : a.map(zerosLike);
}

function maxAbs(a: any): number {
    if (a === null) return 0;
    if (typeof a === "number") return Math.abs(a);
    let m = 0;
    for (let i = 0; i < a.length; i++) m = Math.max(m, maxAbs(a[i]));
    return m;
}

/** Relative closeness of two plain results. */
export function close(a: Plain, b: Plain, tol = 1e-8): boolean {
    if (a === null || b === null) return false;
    const scale = Math.max(1, maxAbs(a.re), maxAbs(b.re), maxAbs(a.im), maxAbs(b.im));
    return maxAbsDiff(a.re, b.re) <= tol * scale && maxAbsDiff(a.im, b.im) <= tol * scale;
}

/** Compare eigenvalue sets, ignoring order. */
function sameEigenvalues(a: Plain, b: Plain): boolean {
    if (a === null || b === null) return false;
    const pairs = (p: Plain) => {
        const re = p!.re as number[];
        const im = (p!.im ?? re.map(() => 0)) as number[];
        return re.map((r, i) => [r, im[i]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    };
    const pa = pairs(a), pb = pairs(b);
    if (pa.length !== pb.length) return false;
    const scale = Math.max(1, ...pa.map(([r, i]) => Math.hypot(r, i)));
    return pa.every(([r, i], k) => Math.hypot(r - pb[k][0], i - pb[k][1]) <= 1e-6 * scale);
}

// ── Cases ──

const vecLabel = (n: number) => `n=${n}`;
const matLabel = (n: number) => `${n}×${n}`;

/** Same raw input for both libraries, with numeric-2 wrapping via `wrap`. */
function both(raw: any, wrap: (raw: any) => any): Prepared {
    return { numeric: raw, "numeric-2": wrap(raw) };
}

export function buildCases(libs: Libs): Case[] {
    const N2 = libs.numeric2;
    const V = (x: number[], y?: number[]) => new N2.Vector(x, y);
    const M = (x: number[][], y?: number[][]) => new N2.Matrix(x, y);
    const L = N2.linalg;
    const VEC_SIZES = [16, 1024, 65536];

    return [
        // Element-wise on vectors
        {
            suite: "Element-wise (vectors)", name: "add x + y", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng) => {
                const x = randVec(n, rng), y = randVec(n, rng);
                return { numeric: [x, y], "numeric-2": [V(x), V(y)] };
            },
            run: { numeric: ([x, y], nm) => nm.add(x, y), "numeric-2": ([x, y]) => L.add(x, y) },
        },
        {
            suite: "Element-wise (vectors)", name: "scale x * 2.5", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng) => both(randVec(n, rng), V),
            run: { numeric: (x, nm) => nm.mul(x, 2.5), "numeric-2": (x) => L.mul(x, 2.5) },
        },
        {
            suite: "Element-wise (vectors)", name: "exp(x)", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng) => both(randVec(n, rng), V),
            run: { numeric: (x, nm) => nm.exp(x), "numeric-2": (x) => L.exp(x) },
        },
        {
            suite: "Element-wise (vectors)", name: "x < 0", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng) => both(randVec(n, rng), V),
            run: { numeric: (x, nm) => nm.lt(x, 0), "numeric-2": (x) => L.lt(x, 0) },
            check: (a, b) => JSON.stringify(a!.re) === JSON.stringify(b!.re),
        },

        // Element-wise on matrices
        {
            suite: "Element-wise (matrices)", name: "add A + B", sizes: [8, 64, 256], sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = randMat(n, n, rng), B = randMat(n, n, rng);
                return { numeric: [A, B], "numeric-2": [M(A), M(B)] };
            },
            run: { numeric: ([A, B], nm) => nm.add(A, B), "numeric-2": ([A, B]) => L.add(A, B) },
        },
        {
            suite: "Element-wise (matrices)", name: "sqrt(A)", sizes: [8, 64, 256], sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = randMat(n, n, rng).map((r: number[]) => r.map(Math.abs));
                return both(A, M);
            },
            run: { numeric: (A, nm) => nm.sqrt(A), "numeric-2": (A) => L.sqrt(A) },
        },

        // Reductions
        {
            suite: "Reductions", name: "sum(x)", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng) => both(randVec(n, rng), V),
            run: { numeric: (x, nm) => nm.sum(x), "numeric-2": (x) => L.sum(x) },
        },
        {
            suite: "Reductions", name: "norm2(x)", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng) => both(randVec(n, rng), V),
            run: { numeric: (x, nm) => nm.norm2(x), "numeric-2": (x) => L.norm2(x) },
        },
        {
            suite: "Reductions", name: "normInf(x)", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng) => both(randVec(n, rng), V),
            run: { numeric: (x, nm) => nm.norminf(x), "numeric-2": (x) => L.normInf(x) },
        },

        // Products
        {
            suite: "Products", name: "dot(x, y)", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng) => {
                const x = randVec(n, rng), y = randVec(n, rng);
                return { numeric: [x, y], "numeric-2": [V(x), V(y)] };
            },
            run: { numeric: ([x, y], nm) => nm.dot(x, y), "numeric-2": ([x, y]) => L.dot(x, y) },
        },
        {
            suite: "Products", name: "dot(A, x)", sizes: [64, 256, 1024], sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = randMat(n, n, rng), x = randVec(n, rng);
                return { numeric: [A, x], "numeric-2": [M(A), V(x)] };
            },
            run: { numeric: ([A, x], nm) => nm.dot(A, x), "numeric-2": ([A, x]) => L.dot(A, x) },
        },
        {
            suite: "Products", name: "dot(A, B)", sizes: [8, 64, 200], sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = randMat(n, n, rng), B = randMat(n, n, rng);
                return { numeric: [A, B], "numeric-2": [M(A), M(B)] };
            },
            run: { numeric: ([A, B], nm) => nm.dot(A, B), "numeric-2": ([A, B]) => L.dot(A, B) },
        },

        // Linear algebra
        {
            suite: "Linear algebra", name: "solve(A, b)", sizes: [8, 64, 200], sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = wellConditioned(n, rng), b = randVec(n, rng);
                return { numeric: [A, b], "numeric-2": [M(A), V(b)] };
            },
            run: { numeric: ([A, b], nm) => nm.solve(A, b), "numeric-2": ([A, b]) => L.solve(A, b) },
        },
        {
            suite: "Linear algebra", name: "LU(A)", sizes: [8, 64, 200], sizeLabel: matLabel,
            setup: (n, rng) => both(wellConditioned(n, rng), M),
            run: { numeric: (A, nm) => nm.LU(A), "numeric-2": (A) => L.LU(A) },
            check: () => null, // packed layouts differ
        },
        {
            suite: "Linear algebra", name: "inv(A)", sizes: [8, 64, 200], sizeLabel: matLabel,
            setup: (n, rng) => both(wellConditioned(n, rng), M),
            run: { numeric: (A, nm) => nm.inv(A), "numeric-2": (A) => L.inv(A) },
        },
        {
            suite: "Linear algebra", name: "det(A)", sizes: [8, 64, 200], sizeLabel: matLabel,
            // Scaled by 1/n so the determinant stays finite at larger sizes
            setup: (n, rng) => both(wellConditioned(n, rng).map((r: number[]) => r.map((v) => v / n)), M),
            run: { numeric: (A, nm) => nm.det(A), "numeric-2": (A) => L.det(A) },
        },
        {
            suite: "Linear algebra", name: "eig(A)", sizes: [8, 24, 48], sizeLabel: matLabel,
            setup: (n, rng) => both(randMat(n, n, rng), M),
            run: { numeric: (A, nm) => nm.eig(A).lambda, "numeric-2": (A) => L.eig(A).lambda },
            check: sameEigenvalues,
        },

        // Complex
        {
            suite: "Complex", name: "mul x * y", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng, l) => {
                const xr = randVec(n, rng), xi = randVec(n, rng), yr = randVec(n, rng), yi = randVec(n, rng);
                return {
                    numeric: l.numeric ? [l.numeric.t(xr, xi), l.numeric.t(yr, yi)] : null,
                    "numeric-2": [V(xr, xi), V(yr, yi)],
                };
            },
            run: { numeric: ([x, y]) => x.mul(y), "numeric-2": ([x, y]) => L.mul(x, y) },
        },
        {
            suite: "Complex", name: "dot(A, B)", sizes: [8, 32, 100], sizeLabel: matLabel,
            setup: (n, rng, l) => {
                const Ar = randMat(n, n, rng), Ai = randMat(n, n, rng), Br = randMat(n, n, rng), Bi = randMat(n, n, rng);
                return {
                    numeric: l.numeric ? [l.numeric.t(Ar, Ai), l.numeric.t(Br, Bi)] : null,
                    "numeric-2": [M(Ar, Ai), M(Br, Bi)],
                };
            },
            run: { numeric: ([A, B]) => A.dot(B), "numeric-2": ([A, B]) => L.dot(A, B) },
        },
        {
            suite: "Complex", name: "inv(A)", sizes: [8, 32, 100], sizeLabel: matLabel,
            setup: (n, rng, l) => {
                const Ar = wellConditioned(n, rng), Ai = randMat(n, n, rng);
                return {
                    numeric: l.numeric ? l.numeric.t(Ar, Ai) : null,
                    "numeric-2": M(Ar, Ai),
                };
            },
            run: { numeric: (A) => A.inv(), "numeric-2": (A) => L.inv(A) },
        },
    ];
}

// ── Timing ──

export type TimingOptions = {
    /** Target duration of one sample, in ms. */
    sampleMs: number;
    /** Number of samples per measurement. */
    samples: number;
};

export const DEFAULT_TIMING: TimingOptions = { sampleMs: 25, samples: 15 };

function quantile(sorted: number[], q: number): number {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Time fn(input): calibrate a batch size so one batch takes ~sampleMs,
 * then record `samples` batches. Returns per-call times in microseconds.
 */
export function measure(fn: () => unknown, opts: TimingOptions) {
    // Warm up (and let the JIT settle)
    const warmEnd = performance.now() + Math.min(100, opts.sampleMs * 4);
    let warmCalls = 0;
    while (performance.now() < warmEnd || warmCalls < 3) {
        fn();
        warmCalls++;
    }

    // Calibrate
    let batch = 1;
    for (;;) {
        const t0 = performance.now();
        for (let i = 0; i < batch; i++) fn();
        const dt = performance.now() - t0;
        if (dt >= opts.sampleMs || batch >= 1 << 24) break;
        batch = dt <= 0 ? batch * 8 : Math.max(batch * 2, Math.ceil(batch * opts.sampleMs / dt));
    }

    const times: number[] = [];
    for (let s = 0; s < opts.samples; s++) {
        const t0 = performance.now();
        for (let i = 0; i < batch; i++) fn();
        times.push(((performance.now() - t0) * 1000) / batch);
    }
    times.sort((a, b) => a - b);
    return {
        median: quantile(times, 0.5),
        p25: quantile(times, 0.25),
        p75: quantile(times, 0.75),
        min: times[0],
        batch,
        samples: times.length,
    };
}

export type RunOptions = TimingOptions & {
    /** Only run cases whose "suite / name" contains this string. */
    filter?: string;
    /** Called after each measurement; may be async (e.g. to yield to the browser). */
    onResult?: (m: Measurement, done: number, total: number) => void | Promise<void>;
};

/** Run every case, size and available library. */
export async function runAll(libs: Libs, opts: RunOptions): Promise<Measurement[]> {
    const cases = buildCases(libs).filter(
        (c) => !opts.filter || `${c.suite} / ${c.name}`.toLowerCase().includes(opts.filter.toLowerCase()));
    const total = cases.reduce((n, c) => n + c.sizes.length * LIBS.length, 0);
    const out: Measurement[] = [];
    let done = 0;

    for (const c of cases) {
        for (const size of c.sizes) {
            const prepared = c.setup(size, mulberry32(1234 + size), libs);
            const libObj: Record<LibName, any> = { numeric: libs.numeric, "numeric-2": libs.numeric2 };

            // One untimed call per library, to compare outputs
            const outputs: Partial<Record<LibName, Plain>> = {};
            const errors: Partial<Record<LibName, string>> = {};
            for (const lib of LIBS) {
                if (!libObj[lib] || prepared[lib] == null) {
                    errors[lib] = `${lib} is not available`;
                    continue;
                }
                try {
                    outputs[lib] = toPlain(c.run[lib](prepared[lib], libObj[lib]));
                } catch (e) {
                    errors[lib] = String(e);
                }
            }
            let agrees: boolean | null = null;
            if (outputs.numeric !== undefined && outputs["numeric-2"] !== undefined) {
                agrees = (c.check ?? close)(outputs.numeric, outputs["numeric-2"]);
            }

            for (const lib of LIBS) {
                const base = { suite: c.suite, case: c.name, size, sizeLabel: c.sizeLabel(size), lib, agrees };
                let m: Measurement;
                if (errors[lib] !== undefined) {
                    m = { ...base, median: NaN, p25: NaN, p75: NaN, min: NaN, batch: 0, samples: 0, error: errors[lib] };
                } else {
                    const input = prepared[lib], L = libObj[lib], run = c.run[lib];
                    m = { ...base, ...measure(() => run(input, L), opts) };
                }
                out.push(m);
                done++;
                await opts.onResult?.(m, done, total);
            }
        }
    }
    return out;
}
