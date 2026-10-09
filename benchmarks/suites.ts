/**
 * Environment-agnostic benchmark suites comparing numeric-2 with numeric.js,
 * math.js and stdlib.
 *
 * The same code runs under Bun, Node and in the browser: the libraries are
 * passed in, timing uses `performance.now()`, and the runner yields between
 * measurements so a page stays responsive.
 *
 * Every case times each library's *public* API on identical seeded inputs.
 * Inputs are converted to each library's own types (numeric-2 Vector/Matrix,
 * numeric.js arrays or T, math.js DenseMatrix, stdlib Float64Array in
 * row-major order) outside the timed region. Producing a new output (and
 * wrapping it) is part of the timed call; for stdlib's in-place BLAS routines
 * that means allocating the output array.
 *
 * Outputs are compared against numeric-2's, which is cross-validated against
 * NumPy by the test suite.
 */

export type LibName = "numeric-2" | "numeric" | "mathjs" | "stdlib";
export const LIBS: LibName[] = ["numeric-2", "numeric", "mathjs", "stdlib"];
export const LIB_TITLE: Record<LibName, string> = {
    "numeric-2": "numeric-2", numeric: "numeric.js", mathjs: "math.js", stdlib: "stdlib",
};

/** stdlib routines used by the suite (each is a standalone @stdlib package). */
export type Stdlib = {
    ddot: Function; daxpy: Function; dscal: Function; dnrm2: Function; idamax: Function;
    dgemv: Function; dgemm: Function; dsum: Function; dsqrt: Function;
};

/** The libraries under test. Any may be missing (e.g. numeric.js blocked by CSP). */
export type Libs = { numeric?: any; numeric2?: any; mathjs?: any; stdlib?: Stdlib };

type Prepared = Partial<Record<LibName, any>>;

export type Case = {
    suite: string;
    name: string;
    /** Problem sizes to run, and how to describe them. */
    sizes: number[];
    sizeLabel: (n: number) => string;
    /** Build per-library inputs from seeded random data (only for libraries in `run`). */
    setup: (n: number, rng: () => number, libs: Libs) => Prepared;
    /** One call per library that supports the operation, on that library's prepared input. */
    run: Partial<Record<LibName, (input: any, lib: any) => any>>;
    /** Convert a library's output for comparison (untimed); defaults to toPlain. */
    plain?: Partial<Record<LibName, (out: any, n: number) => Plain>>;
    /** Compare outputs; null = not comparable. Defaults to `close`. */
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
    /** Whether the output matched numeric-2's (null if unchecked, or for numeric-2 itself). */
    agrees: boolean | null;
    error?: string;
};

export type EnvInfo = {
    runtime: string;
    platform: string;
    date: string;
    userAgent?: string;
    /** Library versions, where known. */
    versions?: Partial<Record<LibName, string>>;
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
const f64 = (x: number[]) => Float64Array.from(x);
const f64m = (A: number[][]) => Float64Array.from(A.flat());

// ── Result normalization and comparison ──

export type Plain = { re: any; im: any } | null;

const isCx = (z: any) => z !== null && typeof z === "object" && typeof z.re === "number" && typeof z.im === "number";

/** Split nested arrays that may contain complex objects ({re, im}) into re/im arrays. */
function splitParts(x: any): { re: any; im: any; complex: boolean } {
    if (typeof x === "number") return { re: x, im: 0, complex: false };
    if (isCx(x)) return { re: x.re, im: x.im, complex: true };
    const parts = Array.from(x as ArrayLike<any>, splitParts);
    return { re: parts.map((p) => p.re), im: parts.map((p) => p.im), complex: parts.some((p) => p.complex) };
}

/** Convert any library's output to {re, im} (im null if real). */
export function toPlain(x: any): Plain {
    if (x === undefined || x === null) return null;
    if (typeof x === "number") return { re: x, im: null };
    if (x instanceof Float64Array) return { re: Array.from(x), im: null };
    // numeric-2 Vector/Matrix
    if ("_re" in x && "_shape" in x) return { re: x._re, im: x._im };
    // math.js matrix
    if (x.isMatrix === true) return toPlain(x.valueOf());
    // Complex scalar (numeric-2 Complex or math.js Complex)
    if (isCx(x)) return { re: x.re, im: x.im };
    // numeric.js T
    if ("x" in x && !Array.isArray(x)) return { re: x.x, im: x.y ?? null };
    if (Array.isArray(x)) {
        const p = splitParts(x);
        return { re: p.re, im: p.complex ? p.im : null };
    }
    return null;
}

/** Reshape a flat row-major array into n columns. */
const reshape = (flat: ArrayLike<number>, cols: number): number[][] => {
    const out: number[][] = [];
    for (let i = 0; i < flat.length; i += cols) out.push(Array.from(flat).slice(i, i + cols));
    return out;
};

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

/** Compare eigenvalue sets, ignoring order: each value must have a distinct nearby match. */
function sameEigenvalues(a: Plain, b: Plain): boolean {
    if (a === null || b === null) return false;
    const pairs = (p: Plain) => {
        const re = p!.re as number[];
        const im = (p!.im ?? re.map(() => 0)) as number[];
        return re.map((r, i) => [r, im[i]]);
    };
    const pa = pairs(a), pb = pairs(b);
    if (pa.length !== pb.length) return false;
    const scale = Math.max(1, ...pa.map(([r, i]) => Math.hypot(r, i)));
    const used = new Array(pb.length).fill(false);
    for (const [r, i] of pa) {
        let best = -1, bestD = Infinity;
        pb.forEach(([u, v], k) => {
            const d = Math.hypot(r - u, i - v);
            if (!used[k] && d < bestD) { bestD = d; best = k; }
        });
        if (best < 0 || bestD > 1e-6 * scale) return false;
        used[best] = true;
    }
    return true;
}

// ── Cases ──

const vecLabel = (n: number) => `n=${n}`;
const matLabel = (n: number) => `${n}×${n}`;

/** Flatten a math.js column result ([[a], [b], ...]) to a vector. */
const flatPlain = (out: any): Plain => {
    const p = toPlain(out)!;
    return { re: (p.re as any[]).flat(), im: p.im === null ? null : (p.im as any[]).flat() };
};
/** A flat row-major Float64Array output, as an n×n matrix. */
const squarePlain = (out: Float64Array, n: number): Plain => ({ re: reshape(out, n), im: null });

export function buildCases(libs: Libs): Case[] {
    const N2 = libs.numeric2, MJ = libs.mathjs, SL = libs.stdlib;
    const V = (x: number[], y?: number[]) => new N2.Vector(x, y);
    const M = (x: number[][], y?: number[][]) => new N2.Matrix(x, y);
    const L = N2.linalg;
    const mj = (x: any) => (MJ ? MJ.matrix(x) : null);
    const mjCx = (re: any, im: any): any => {
        if (!MJ) return null;
        const zip = (a: any, b: any): any => (typeof a === "number" ? MJ.complex(a, b) : a.map((r: any, i: number) => zip(r, b[i])));
        return MJ.matrix(zip(re, im));
    };
    const VEC_SIZES = [16, 1024, 65536];
    const MAT_SIZES = [8, 64, 256];

    /** Inputs for a one-vector case. */
    const vec1 = (n: number, rng: () => number): Prepared => {
        const x = randVec(n, rng);
        return { "numeric-2": V(x), numeric: x, mathjs: mj(x), stdlib: f64(x) };
    };
    /** Inputs for a two-vector case. */
    const vec2 = (n: number, rng: () => number): Prepared => {
        const x = randVec(n, rng), y = randVec(n, rng);
        return { "numeric-2": [V(x), V(y)], numeric: [x, y], mathjs: [mj(x), mj(y)], stdlib: [f64(x), f64(y)] };
    };
    /** Inputs for a one-matrix case. */
    const mat1 = (A: number[][]): Prepared => ({ "numeric-2": M(A), numeric: A, mathjs: mj(A), stdlib: f64m(A) });

    return [
        // Element-wise on vectors
        {
            suite: "Element-wise (vectors)", name: "add x + y", sizes: VEC_SIZES, sizeLabel: vecLabel, setup: vec2,
            run: {
                "numeric-2": ([x, y]) => L.add(x, y),
                numeric: ([x, y], nm) => nm.add(x, y),
                mathjs: ([x, y], m) => m.add(x, y),
                stdlib: ([x, y], s) => { const out = new Float64Array(y); s.daxpy(x.length, 1.0, x, 1, out, 1); return out; },
            },
        },
        {
            suite: "Element-wise (vectors)", name: "scale x * 2.5", sizes: VEC_SIZES, sizeLabel: vecLabel, setup: vec1,
            run: {
                "numeric-2": (x) => L.mul(x, 2.5),
                numeric: (x, nm) => nm.mul(x, 2.5),
                mathjs: (x, m) => m.multiply(x, 2.5),
                stdlib: (x, s) => { const out = new Float64Array(x); s.dscal(x.length, 2.5, out, 1); return out; },
            },
        },
        {
            suite: "Element-wise (vectors)", name: "exp(x)", sizes: VEC_SIZES, sizeLabel: vecLabel, setup: vec1,
            run: {
                "numeric-2": (x) => L.exp(x),
                numeric: (x, nm) => nm.exp(x),
                mathjs: (x, m) => m.map(x, m.exp),
            },
        },
        {
            suite: "Element-wise (vectors)", name: "x < 0", sizes: VEC_SIZES, sizeLabel: vecLabel, setup: vec1,
            run: {
                "numeric-2": (x) => L.lt(x, 0),
                numeric: (x, nm) => nm.lt(x, 0),
                mathjs: (x, m) => m.smaller(x, 0),
            },
            check: (a, b) => JSON.stringify(a!.re) === JSON.stringify(b!.re),
        },

        // Element-wise on matrices
        {
            suite: "Element-wise (matrices)", name: "add A + B", sizes: MAT_SIZES, sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = randMat(n, n, rng), B = randMat(n, n, rng);
                return { "numeric-2": [M(A), M(B)], numeric: [A, B], mathjs: [mj(A), mj(B)], stdlib: [f64m(A), f64m(B)] };
            },
            run: {
                "numeric-2": ([A, B]) => L.add(A, B),
                numeric: ([A, B], nm) => nm.add(A, B),
                mathjs: ([A, B], m) => m.add(A, B),
                stdlib: ([A, B], s) => { const out = new Float64Array(B); s.daxpy(A.length, 1.0, A, 1, out, 1); return out; },
            },
            plain: { stdlib: squarePlain },
        },
        {
            suite: "Element-wise (matrices)", name: "sqrt(A)", sizes: MAT_SIZES, sizeLabel: matLabel,
            setup: (n, rng) => mat1(randMat(n, n, rng).map((r: number[]) => r.map(Math.abs))),
            run: {
                "numeric-2": (A) => L.sqrt(A),
                numeric: (A, nm) => nm.sqrt(A),
                mathjs: (A, m) => m.map(A, m.sqrt),
                stdlib: (A, s) => { const out = new Float64Array(A.length); s.dsqrt(A.length, A, 1, out, 1); return out; },
            },
            plain: { stdlib: squarePlain },
        },

        // Reductions
        {
            suite: "Reductions", name: "sum(x)", sizes: VEC_SIZES, sizeLabel: vecLabel, setup: vec1,
            run: {
                "numeric-2": (x) => L.sum(x),
                numeric: (x, nm) => nm.sum(x),
                mathjs: (x, m) => m.sum(x),
                stdlib: (x, s) => s.dsum(x.length, x, 1),
            },
        },
        {
            suite: "Reductions", name: "norm2(x)", sizes: VEC_SIZES, sizeLabel: vecLabel, setup: vec1,
            run: {
                "numeric-2": (x) => L.norm2(x),
                numeric: (x, nm) => nm.norm2(x),
                mathjs: (x, m) => m.norm(x),
                stdlib: (x, s) => s.dnrm2(x.length, x, 1),
            },
        },
        {
            suite: "Reductions", name: "normInf(x)", sizes: VEC_SIZES, sizeLabel: vecLabel, setup: vec1,
            run: {
                "numeric-2": (x) => L.normInf(x),
                numeric: (x, nm) => nm.norminf(x),
                mathjs: (x, m) => m.norm(x, Infinity),
                stdlib: (x, s) => Math.abs(x[s.idamax(x.length, x, 1)]),
            },
        },

        // Products
        {
            suite: "Products", name: "dot(x, y)", sizes: VEC_SIZES, sizeLabel: vecLabel, setup: vec2,
            run: {
                "numeric-2": ([x, y]) => L.dot(x, y),
                numeric: ([x, y], nm) => nm.dot(x, y),
                mathjs: ([x, y], m) => m.dot(x, y),
                stdlib: ([x, y], s) => s.ddot(x.length, x, 1, y, 1),
            },
        },
        {
            suite: "Products", name: "dot(A, x)", sizes: [64, 256, 1024], sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = randMat(n, n, rng), x = randVec(n, rng);
                return { "numeric-2": [M(A), V(x)], numeric: [A, x], mathjs: [mj(A), mj(x)], stdlib: [f64m(A), f64(x)] };
            },
            run: {
                "numeric-2": ([A, x]) => L.dot(A, x),
                numeric: ([A, x], nm) => nm.dot(A, x),
                mathjs: ([A, x], m) => m.multiply(A, x),
                stdlib: ([A, x], s) => {
                    const n = x.length, y = new Float64Array(n);
                    s.dgemv("row-major", "no-transpose", n, n, 1.0, A, n, x, 1, 0.0, y, 1);
                    return y;
                },
            },
        },
        {
            suite: "Products", name: "dot(A, B)", sizes: [8, 64, 200], sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = randMat(n, n, rng), B = randMat(n, n, rng);
                return { "numeric-2": [M(A), M(B)], numeric: [A, B], mathjs: [mj(A), mj(B)], stdlib: [f64m(A), f64m(B), n] };
            },
            run: {
                "numeric-2": ([A, B]) => L.dot(A, B),
                numeric: ([A, B], nm) => nm.dot(A, B),
                mathjs: ([A, B], m) => m.multiply(A, B),
                stdlib: ([A, B, n], s) => {
                    const C = new Float64Array(n * n);
                    s.dgemm("row-major", "no-transpose", "no-transpose", n, n, n, 1.0, A, n, B, n, 0.0, C, n);
                    return C;
                },
            },
            plain: { stdlib: squarePlain },
        },

        // Linear algebra (stdlib has no published general LU/solve/inverse/eig routines)
        {
            suite: "Linear algebra", name: "solve(A, b)", sizes: [8, 64, 200], sizeLabel: matLabel,
            setup: (n, rng) => {
                const A = wellConditioned(n, rng), b = randVec(n, rng);
                return { "numeric-2": [M(A), V(b)], numeric: [A, b], mathjs: [mj(A), mj(b)] };
            },
            run: {
                "numeric-2": ([A, b]) => L.solve(A, b),
                numeric: ([A, b], nm) => nm.solve(A, b),
                mathjs: ([A, b], m) => m.lusolve(A, b),
            },
            plain: { mathjs: flatPlain },
        },
        {
            suite: "Linear algebra", name: "LU(A)", sizes: [8, 64, 200], sizeLabel: matLabel,
            setup: (n, rng) => mat1(wellConditioned(n, rng)),
            run: {
                "numeric-2": (A) => L.LU(A),
                numeric: (A, nm) => nm.LU(A),
                mathjs: (A, m) => m.lup(A),
            },
            check: () => null, // packed layouts differ
        },
        {
            suite: "Linear algebra", name: "inv(A)", sizes: [8, 64, 200], sizeLabel: matLabel,
            setup: (n, rng) => mat1(wellConditioned(n, rng)),
            run: {
                "numeric-2": (A) => L.inv(A),
                numeric: (A, nm) => nm.inv(A),
                mathjs: (A, m) => m.inv(A),
            },
        },
        {
            suite: "Linear algebra", name: "det(A)", sizes: [8, 64, 200], sizeLabel: matLabel,
            // Scaled by 1/n so the determinant stays finite at larger sizes
            setup: (n, rng) => mat1(wellConditioned(n, rng).map((r: number[]) => r.map((v) => v / n))),
            run: {
                "numeric-2": (A) => L.det(A),
                numeric: (A, nm) => nm.det(A),
                mathjs: (A, m) => m.det(A),
            },
        },
        {
            suite: "Linear algebra", name: "eig(A)", sizes: [8, 24, 48], sizeLabel: matLabel,
            setup: (n, rng) => mat1(randMat(n, n, rng)),
            run: {
                "numeric-2": (A) => L.eig(A).lambda,
                numeric: (A, nm) => nm.eig(A).lambda,
                mathjs: (A, m) => m.eigs(A, { eigenvectors: false }).values,
            },
            check: sameEigenvalues,
        },

        {
            suite: "Linear algebra", name: "svd(A)", sizes: [8, 32, 100], sizeLabel: matLabel,
            setup: (n, rng) => mat1(randMat(n, n, rng)),
            run: {
                "numeric-2": (A) => L.svd(A).S,
                numeric: (A, nm) => nm.svd(A).S,
            },
            // Compare singular values in descending order
            plain: {
                numeric: (out) => ({ re: [...out].sort((a: number, b: number) => b - a), im: null }),
            },
        },

        // Signal processing
        {
            suite: "Signal processing", name: "fft(x)", sizes: [1000, 1024, 65536], sizeLabel: vecLabel,
            setup: (n, rng, l) => {
                const xr = randVec(n, rng), xi = randVec(n, rng);
                return {
                    "numeric-2": V(xr, xi),
                    numeric: l.numeric ? l.numeric.t(xr, xi) : null,
                    mathjs: MJ ? xr.map((r, i) => MJ.complex(r, xi[i])) : null,
                };
            },
            run: {
                "numeric-2": (x) => L.fft(x),
                numeric: (x) => x.fft(),
                mathjs: (x, m) => m.fft(x),
            },
        },

        // Complex
        {
            suite: "Complex", name: "mul x * y", sizes: VEC_SIZES, sizeLabel: vecLabel,
            setup: (n, rng, l) => {
                const xr = randVec(n, rng), xi = randVec(n, rng), yr = randVec(n, rng), yi = randVec(n, rng);
                return {
                    "numeric-2": [V(xr, xi), V(yr, yi)],
                    numeric: l.numeric ? [l.numeric.t(xr, xi), l.numeric.t(yr, yi)] : null,
                    mathjs: [mjCx(xr, xi), mjCx(yr, yi)],
                };
            },
            run: {
                "numeric-2": ([x, y]) => L.mul(x, y),
                numeric: ([x, y]) => x.mul(y),
                mathjs: ([x, y], m) => m.dotMultiply(x, y),
            },
        },
        {
            suite: "Complex", name: "dot(A, B)", sizes: [8, 32, 100], sizeLabel: matLabel,
            setup: (n, rng, l) => {
                const Ar = randMat(n, n, rng), Ai = randMat(n, n, rng), Br = randMat(n, n, rng), Bi = randMat(n, n, rng);
                return {
                    "numeric-2": [M(Ar, Ai), M(Br, Bi)],
                    numeric: l.numeric ? [l.numeric.t(Ar, Ai), l.numeric.t(Br, Bi)] : null,
                    mathjs: [mjCx(Ar, Ai), mjCx(Br, Bi)],
                };
            },
            run: {
                "numeric-2": ([A, B]) => L.dot(A, B),
                numeric: ([A, B]) => A.dot(B),
                mathjs: ([A, B], m) => m.multiply(A, B),
            },
        },
        {
            suite: "Complex", name: "inv(A)", sizes: [8, 32, 100], sizeLabel: matLabel,
            setup: (n, rng, l) => {
                const Ar = wellConditioned(n, rng), Ai = randMat(n, n, rng);
                return {
                    "numeric-2": M(Ar, Ai),
                    numeric: l.numeric ? l.numeric.t(Ar, Ai) : null,
                    mathjs: mjCx(Ar, Ai),
                };
            },
            run: {
                "numeric-2": (A) => L.inv(A),
                numeric: (A) => A.inv(),
                mathjs: (A, m) => m.inv(A),
            },
        },
    ];
}

// ── Timing ──

export type TimingOptions = {
    /** Target duration of one sample, in ms. */
    sampleMs: number;
    /** Number of samples per measurement. */
    samples: number;
    /** Rough time budget for one measurement, in ms; very slow calls get fewer samples (at least 3). */
    budgetMs?: number;
};

export const DEFAULT_TIMING: TimingOptions = { sampleMs: 25, samples: 15, budgetMs: 4000 };
export const QUICK_TIMING: TimingOptions = { sampleMs: 10, samples: 7, budgetMs: 1500 };

function quantile(sorted: number[], q: number): number {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Time fn(): calibrate a batch size so one batch takes ~sampleMs,
 * then record batches. Returns per-call times in microseconds.
 */
export function measure(fn: () => unknown, opts: TimingOptions) {
    // Warm up (and let the JIT settle): at least one call
    const warmEnd = performance.now() + Math.min(100, opts.sampleMs * 4);
    do fn(); while (performance.now() < warmEnd);

    // Calibrate
    let batch = 1, dt = 0;
    for (;;) {
        const t0 = performance.now();
        for (let i = 0; i < batch; i++) fn();
        dt = performance.now() - t0;
        if (dt >= opts.sampleMs || batch >= 1 << 24) break;
        batch = dt <= 0 ? batch * 8 : Math.max(batch * 2, Math.ceil(batch * opts.sampleMs / dt));
    }

    const budget = opts.budgetMs ?? Infinity;
    const samples = Math.max(3, Math.min(opts.samples, Math.floor(budget / Math.max(dt, 1e-3))));
    const times: number[] = [];
    for (let s = 0; s < samples; s++) {
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
    /** Only run these libraries (default: all available). */
    libs?: LibName[];
    /** Called after each measurement; may be async (e.g. to yield to the browser). */
    onResult?: (m: Measurement, done: number, total: number) => void | Promise<void>;
};

const libObject = (libs: Libs): Record<LibName, any> => ({
    "numeric-2": libs.numeric2, numeric: libs.numeric, mathjs: libs.mathjs, stdlib: libs.stdlib,
});

/** Run every case, size and library. Libraries without an implementation of a case are skipped. */
export async function runAll(libs: Libs, opts: RunOptions): Promise<Measurement[]> {
    const wanted = opts.libs ?? LIBS;
    const cases = buildCases(libs).filter(
        (c) => !opts.filter || `${c.suite} / ${c.name}`.toLowerCase().includes(opts.filter.toLowerCase()));
    const libsOf = (c: Case) => LIBS.filter((l) => wanted.includes(l) && c.run[l] !== undefined);
    const total = cases.reduce((n, c) => n + c.sizes.length * libsOf(c).length, 0);
    const libObj = libObject(libs);
    const out: Measurement[] = [];
    let done = 0;

    for (const c of cases) {
        const caseLibs = libsOf(c);
        for (const size of c.sizes) {
            const prepared = c.setup(size, mulberry32(1234 + size), libs);

            // One untimed call per library, to compare outputs with numeric-2's
            const outputs: Partial<Record<LibName, Plain>> = {};
            const errors: Partial<Record<LibName, string>> = {};
            for (const lib of caseLibs) {
                if (!libObj[lib] || prepared[lib] == null) {
                    errors[lib] = `${LIB_TITLE[lib]} is not available`;
                    continue;
                }
                try {
                    const raw = c.run[lib]!(prepared[lib], libObj[lib]);
                    outputs[lib] = (c.plain?.[lib] ?? toPlain)(raw, size);
                } catch (e) {
                    errors[lib] = String((e as Error)?.message ?? e);
                }
            }
            const reference = outputs["numeric-2"];

            for (const lib of caseLibs) {
                let agrees: boolean | null = null;
                if (lib !== "numeric-2" && reference !== undefined && outputs[lib] !== undefined) {
                    agrees = (c.check ?? close)(outputs[lib]!, reference);
                }
                const base = { suite: c.suite, case: c.name, size, sizeLabel: c.sizeLabel(size), lib, agrees };
                let m: Measurement;
                if (errors[lib] !== undefined) {
                    m = { ...base, median: NaN, p25: NaN, p75: NaN, min: NaN, batch: 0, samples: 0, error: errors[lib] };
                } else {
                    const input = prepared[lib], L = libObj[lib], run = c.run[lib]!;
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
