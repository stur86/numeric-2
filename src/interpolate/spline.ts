/**
 * Cubic splines, ported from numeric.js.
 *
 * A spline is stored as piecewise cubic Hermite segments: on [x_i, x_{i+1}]
 * it runs from value yl_i with slope kl_i to value yr_{i+1} with slope
 * kr_{i+1}. Values and slopes may differ on either side of a knot, which is
 * what lets `diff()` represent derivatives exactly. Vector-valued splines
 * (curves through points in R^d) keep one set of arrays per component.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import { solve } from "../linalg/lu";
import { type VectorLike, type MatrixLike, toRawVector, toRawMatrix } from "../linalg/wrap";

/** Whether a spline is scalar-valued or vector-valued. */
export type SplineKind = "scalar" | "vector";

/** End conditions: natural (zero second derivative), periodic, or given end slopes. */
export type SplineBoundary =
    | "natural"
    | "periodic"
    | { left?: number | number[]; right?: number | number[] };

/** Per-component coefficients: c[component][knot]. */
type Coeffs = { yl: number[][]; yr: number[][]; kl: number[][]; kr: number[][] };

export class Spline<K extends SplineKind = SplineKind> {
    /** Knots, strictly increasing. */
    readonly x: number[];
    /** Number of components for a vector-valued spline, or null for a scalar one. */
    readonly dim: number | null;
    /** Periodic splines repeat outside [x_0, x_{n-1}] instead of extrapolating. */
    readonly periodic: boolean;
    private readonly c: Coeffs;

    /** @internal Use `spline()` to build a spline. */
    constructor(x: number[], coeffs: Coeffs, dim: number | null, periodic = false) {
        this.x = x;
        this.c = coeffs;
        this.dim = dim;
        this.periodic = periodic;
    }

    /** Map t into [x_0, x_{n-1}) for periodic splines. */
    private wrap(t: number): number {
        if (!this.periodic) return t;
        const x0 = this.x[0], L = this.x[this.x.length - 1] - x0;
        const u = (t - x0) % L;
        return x0 + (u < 0 ? u + L : u);
    }

    /** Index p of the segment [x_p, x_{p+1}] used for t (end segments extrapolate). */
    private segment(t: number): number {
        const x = this.x;
        let p = 0, q = x.length - 1;
        while (q - p > 1) {
            const mid = (p + q) >> 1;
            if (x[mid] <= t) p = mid;
            else q = mid;
        }
        return p;
    }

    /** Value of component `j` at t on segment p. */
    private evalAt(j: number, t: number, p: number): number {
        const x = this.x, { yl, yr, kl, kr } = this.c;
        const dx = x[p + 1] - x[p];
        const y0 = yl[j][p], y1 = yr[j][p + 1];
        const a = kl[j][p] * dx - (y1 - y0);
        const b = -kr[j][p + 1] * dx + (y1 - y0);
        const s = (t - x[p]) / dx;
        const st = s * (1 - s);
        return (1 - s) * y0 + s * y1 + a * st * (1 - s) + b * st * s;
    }

    /**
     * Evaluate the spline.
     * - scalar spline: at(t) → number, at([t...]) → Vector
     * - vector spline: at(t) → Vector (a point), at([t...]) → Matrix (one point per row)
     * Outside [x_0, x_{n-1}] the end segments are extrapolated, except for
     * periodic splines, which repeat (numeric.js extrapolates those too).
     */
    at(t: number): K extends "scalar" ? number : Vector;
    at(t: VectorLike): K extends "scalar" ? Vector : Matrix;
    at(t: number | VectorLike): any {
        const d = this.dim ?? 1;
        const point = (t0: number): number[] => {
            const tt = this.wrap(t0);
            const p = this.segment(tt);
            const out = new Array(d);
            for (let j = 0; j < d; j++) out[j] = this.evalAt(j, tt, p);
            return out;
        };
        if (typeof t === "number") {
            const v = point(t);
            return this.dim === null ? v[0] : new Vector(v);
        }
        const ts = toRawVector(t, "Spline.at");
        if (this.dim === null) return new Vector(ts.map((tt) => point(tt)[0]));
        return new Matrix(ts.map(point));
    }

    /** The derivative, as a spline (piecewise quadratic, exactly represented). */
    diff(): Spline<K> {
        const x = this.x, { yl, yr, kl, kr } = this.c;
        const n = x.length;
        const pl: number[][] = [], pr: number[][] = [];
        for (let j = 0; j < kl.length; j++) {
            const l = new Array(n).fill(0), r = new Array(n).fill(0);
            for (let i = n - 2; i >= 0; i--) {
                const dx = x[i + 1] - x[i];
                const dy = yr[j][i + 1] - yl[j][i];
                l[i] = (6 * dy - 4 * dx * kl[j][i] - 2 * dx * kr[j][i + 1]) / (dx * dx);
                r[i + 1] = (-6 * dy + 2 * dx * kl[j][i] + 4 * dx * kr[j][i + 1]) / (dx * dx);
            }
            pl.push(l);
            pr.push(r);
        }
        return new Spline<K>(x, { yl: kl, yr: kr, kl: pl, kr: pr }, this.dim, this.periodic);
    }

    /**
     * Real roots within [x_0, x_{n-1}], in increasing order.
     * For a vector-valued spline, one list of roots per component.
     */
    roots(): K extends "scalar" ? number[] : number[][] {
        const all = this.c.yl.map((_, j) => this.componentRoots(j));
        return (this.dim === null ? all[0] : all) as any;
    }

    private componentRoots(jc: number): number[] {
        const x = this.x, ai = this.c.yl[jc], bi = this.c.yr[jc], ci = this.c.kl[jc], di = this.c.kr[jc];
        const n = x.length - 1;
        const out: number[] = [];
        const at = (t: number, j: number) => this.evalAt(jc, t, j);
        let z1 = 0, t1 = 0;
        for (let j = 0; j < n; j++) {
            // A sign change across a knot (left/right values may differ after diff())
            if (j > 0 && bi[j] * ai[j] < 0) out.push(x[j]);
            // Split the segment at the cubic's turning points, then bracket each sign change.
            // In local coordinates s ∈ [0, 1] (slopes m = k·dx) the derivative is
            // qa s² + qb s + qc. (numeric.js compared local turning points with
            // absolute x, missing pairs of roots inside one segment.)
            const dx = x[j + 1] - x[j];
            const y0 = ai[j], y1 = bi[j + 1], m0 = ci[j] * dx, m1 = di[j + 1] * dx;
            const qa = 6 * (y0 - y1) + 3 * (m0 + m1);
            const qb = -6 * (y0 - y1) - 4 * m0 - 2 * m1;
            const qc = m0;
            const crit: number[] = [];
            if (Math.abs(qa) <= 1e-14 * (Math.abs(qb) + Math.abs(qc))) {
                if (qb !== 0) crit.push(-qc / qb);
            } else {
                const disc = qb * qb - 4 * qa * qc;
                if (disc >= 0) {
                    // Numerically stable quadratic roots
                    const r = -0.5 * (qb + (qb >= 0 ? 1 : -1) * Math.sqrt(disc));
                    crit.push(r / qa);
                    if (r !== 0) crit.push(qc / r);
                }
            }
            const stops = [x[j]];
            for (const sc of crit.filter((v) => v > 0 && v < 1).sort((u, v) => u - v)) stops.push(x[j] + sc * dx);
            stops.push(x[j + 1]);
            let t0 = stops[0], z0 = at(t0, j);
            for (let k = 0; k < stops.length - 1; k++) {
                t1 = stops[k + 1];
                z1 = at(t1, j);
                if (z0 === 0) {
                    out.push(t0);
                    t0 = t1;
                    z0 = z1;
                    continue;
                }
                if (z1 === 0 || z0 * z1 > 0) {
                    t0 = t1;
                    z0 = z1;
                    continue;
                }
                // Illinois-style regula falsi
                let side = 0, tm = t0;
                for (;;) {
                    tm = (z0 * t1 - z1 * t0) / (z0 - z1);
                    if (tm <= t0 || tm >= t1) break;
                    const zm = at(tm, j);
                    if (zm * z1 > 0) {
                        t1 = tm;
                        z1 = zm;
                        if (side === -1) z0 *= 0.5;
                        side = -1;
                    } else if (zm * z0 > 0) {
                        t0 = tm;
                        z0 = zm;
                        if (side === 1) z1 *= 0.5;
                        side = 1;
                    } else break;
                }
                out.push(tm);
                t0 = stops[k + 1];
                z0 = at(t0, j);
            }
            if (z1 === 0) out.push(t1);
        }
        return out;
    }
}

/** Solve a tridiagonal system (sub a, diagonal b, super c) for several right-hand sides. */
function thomas(a: number[], b: number[], c: number[], rhs: number[][]): number[][] {
    const n = b.length;
    const cp = new Array(n), bp = new Array(n);
    bp[0] = b[0];
    for (let i = 1; i < n; i++) {
        cp[i - 1] = c[i - 1] / bp[i - 1];
        bp[i] = b[i] - a[i] * cp[i - 1];
    }
    return rhs.map((r) => {
        const y = new Array(n);
        y[0] = r[0] / bp[0];
        for (let i = 1; i < n; i++) y[i] = (r[i] - a[i] * y[i - 1]) / bp[i];
        for (let i = n - 2; i >= 0; i--) y[i] -= cp[i] * y[i + 1];
        return y;
    });
}

/**
 * Solve a cyclic tridiagonal system: tridiagonal (a, b, c) plus corner entries
 * alpha = A[0][n-1] and beta = A[n-1][0], via Sherman–Morrison (n >= 3).
 */
function cyclicThomas(a: number[], b: number[], c: number[], alpha: number, beta: number, rhs: number[][]): number[][] {
    const n = b.length;
    const gamma = -b[0];
    const bb = b.slice();
    bb[0] = b[0] - gamma;
    bb[n - 1] = b[n - 1] - (alpha * beta) / gamma;
    const u = new Array(n).fill(0);
    u[0] = gamma;
    u[n - 1] = beta;
    const [z, ...xs] = thomas(a, bb, c, [u, ...rhs]);
    return xs.map((x) => {
        const fact = (x[0] + (alpha * x[n - 1]) / gamma) / (1 + z[0] + (alpha * z[n - 1]) / gamma);
        return x.map((v, i) => v - fact * z[i]);
    });
}

/**
 * Build a cubic spline through the points (x_i, y_i).
 *
 * @param x         Knots, strictly increasing (at least 2).
 * @param y         Values: a vector for a scalar spline, or a matrix with one
 *                  point per row for a vector-valued (curve) spline.
 * @param boundary  "natural" (default; zero second derivative at both ends),
 *                  "periodic" (requires y_0 = y_{n-1}), or {left, right} end
 *                  slopes (either may be omitted for a natural end; vectors for
 *                  vector-valued splines).
 */
export function spline(x: VectorLike, y: VectorLike, boundary?: SplineBoundary): Spline<"scalar">;
export function spline(x: VectorLike, y: MatrixLike, boundary?: SplineBoundary): Spline<"vector">;
export function spline(x: VectorLike, y: VectorLike | MatrixLike, boundary: SplineBoundary = "natural"): Spline {
    const rx = toRawVector(x, "spline");
    const n = rx.length;
    if (n < 2) throw new Error("spline: need at least 2 points");
    for (let i = 1; i < n; i++) {
        if (!(rx[i] > rx[i - 1])) throw new Error("spline: x must be strictly increasing");
    }

    const isMatrix = y instanceof Matrix || (Array.isArray(y) && Array.isArray((y as unknown[])[0]));
    const rows: number[][] = isMatrix
        ? toRawMatrix(y as MatrixLike, "spline")
        : toRawVector(y as VectorLike, "spline").map((v) => [v]);
    if (rows.length !== n) throw new Error(`spline: ${n} knots but ${rows.length} values`);
    const d = rows[0].length;
    // Component-major values: Y[component][knot]
    const Y: number[][] = Array.from({ length: d }, (_, j) => rows.map((r) => r[j]));

    const dx = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) dx[i] = rx[i + 1] - rx[i];
    const dy = (j: number, i: number) => Y[j][i + 1] - Y[j][i];
    const slopeAt = (v: number | number[] | undefined, j: number): number | undefined =>
        v === undefined ? undefined : typeof v === "number" ? v : v[j];

    let K: number[][];
    if (boundary === "periodic") {
        // Unknowns k_0..k_{n-2}; k_{n-1} = k_0
        const m = n - 1;
        const rhs = Y.map((_, j) => {
            const r = new Array(m);
            r[0] = 3 * dy(j, n - 2) / (dx[n - 2] * dx[n - 2]) + 3 * dy(j, 0) / (dx[0] * dx[0]);
            for (let i = 1; i < m; i++) r[i] = 3 * dy(j, i - 1) / (dx[i - 1] * dx[i - 1]) + 3 * dy(j, i) / (dx[i] * dx[i]);
            return r;
        });
        const a = new Array(m).fill(0), b = new Array(m), c = new Array(m).fill(0);
        b[0] = 2 / dx[n - 2] + 2 / dx[0];
        for (let i = 1; i < m; i++) {
            a[i] = 1 / dx[i - 1];
            b[i] = 2 / dx[i - 1] + 2 / dx[i];
        }
        for (let i = 0; i < m - 1; i++) c[i] = 1 / dx[i];
        const alpha = 1 / dx[n - 2]; // row 0, column m-1
        const beta = 1 / dx[m - 1];  // row m-1, column 0
        let sol: number[][];
        if (m >= 3) {
            sol = cyclicThomas(a, b, c, alpha, beta, rhs);
        } else {
            // Tiny systems: corner and band entries overlap, so assemble densely
            const M = Array.from({ length: m }, () => new Array(m).fill(0));
            for (let i = 0; i < m; i++) {
                M[i][i] += b[i];
                if (i > 0) M[i][i - 1] += a[i];
                if (i < m - 1) M[i][i + 1] += c[i];
            }
            M[0][m - 1] += alpha;
            M[m - 1][0] += beta;
            sol = rhs.map((r) => solve(M, r).real as number[]);
        }
        K = sol.map((s) => [...s, s[0]]);
    } else {
        const left = boundary === "natural" ? undefined : boundary.left;
        const right = boundary === "natural" ? undefined : boundary.right;
        const a = new Array(n).fill(0), b = new Array(n), c = new Array(n).fill(0);
        for (let i = 1; i < n - 1; i++) {
            a[i] = 1 / dx[i - 1];
            b[i] = 2 / dx[i - 1] + 2 / dx[i];
            c[i] = 1 / dx[i];
        }
        if (left === undefined) {
            b[0] = 2 / dx[0];
            c[0] = 1 / dx[0];
        } else {
            b[0] = 1;
        }
        if (right === undefined) {
            a[n - 1] = 1 / dx[n - 2];
            b[n - 1] = 2 / dx[n - 2];
        } else {
            b[n - 1] = 1;
        }
        const rhs = Y.map((_, j) => {
            const r = new Array(n);
            const kl = slopeAt(left, j), kr = slopeAt(right, j);
            r[0] = kl ?? 3 * dy(j, 0) / (dx[0] * dx[0]);
            for (let i = 1; i < n - 1; i++) r[i] = 3 * dy(j, i - 1) / (dx[i - 1] * dx[i - 1]) + 3 * dy(j, i) / (dx[i] * dx[i]);
            r[n - 1] = kr ?? 3 * dy(j, n - 2) / (dx[n - 2] * dx[n - 2]);
            return r;
        });
        K = thomas(a, b, c, rhs);
    }

    return new Spline(rx.slice(), { yl: Y, yr: Y, kl: K, kr: K }, isMatrix ? d : null, boundary === "periodic");
}
