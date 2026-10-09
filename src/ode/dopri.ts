/**
 * Dormand–Prince 5(4) ODE solver with dense output and event location,
 * ported from numeric.js.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import { type VectorLike, toRawVector } from "../linalg/wrap";

/** Right-hand side y' = f(x, y) of a scalar ODE. */
export type ScalarODE = (x: number, y: number) => number;
/** Right-hand side y' = f(x, y) of a system; y is a plain array. */
export type SystemODE = (x: number, y: number[]) => number[] | Vector;

/**
 * Event function: integration stops at the first point where any component
 * crosses from negative to zero or positive.
 */
export type ScalarEvent = (x: number, y: number) => number | number[];
export type SystemEvent = (x: number, y: number[]) => number | number[];

export type DopriOptions<E> = {
    /** Absolute error tolerance per step, infinity norm (default 1e-6). */
    tol?: number;
    /** Maximum number of steps, including rejected ones (default 1000). */
    maxit?: number;
    /** Stop at the first negative-to-positive crossing of this function. */
    event?: E;
};

// Dormand–Prince tableau
const C = [1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const A2 = 1 / 5;
const A3 = [3 / 40, 9 / 40];
const A4 = [44 / 45, -56 / 15, 32 / 9];
const A5 = [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729];
const A6 = [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656];
const B = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84];
/** Weights for the midpoint value used by the dense output. */
const BM = [
    0.5 * 6025192743 / 30085553152, 0, 0.5 * 51252292925 / 65400821598, 0.5 * -2691868925 / 45128329728,
    0.5 * 187940372067 / 1594534317056, 0.5 * -1776094331 / 19743644256, 0.5 * 11237099 / 235043384,
];
/** Error estimate weights (5th minus 4th order). */
const E = [-71 / 57600, 0, 71 / 16695, -71 / 1920, 17253 / 339200, -22 / 525, 1 / 40];

/** Solution of dopri(): accepted steps plus a dense (quartic Hermite) interpolant. */
export class DopriSolution<S extends "scalar" | "system" = "scalar" | "system"> {
    /** @internal */
    constructor(
        private readonly xs: number[],
        private readonly ys: number[][],
        private readonly fs: number[][],
        private readonly ymid: number[][],
        private readonly scalar: boolean,
        /** Steps taken, including rejected ones. */
        readonly iterations: number,
        /** "" on success, otherwise why the integration stopped early. */
        readonly message: string,
        /** For event-terminated runs: which event components triggered; otherwise null. */
        readonly events: boolean[] | null,
    ) {}

    /** The accepted points x_0 < x_1 < ... (the last is x1, or the event location). */
    get x(): Vector {
        return new Vector(this.xs.slice());
    }

    /** The solution at each accepted point: a Vector (scalar ODE) or a Matrix with one state per row. */
    get y(): S extends "scalar" ? Vector : Matrix {
        return (this.scalar ? new Vector(this.ys.map((r) => r[0])) : new Matrix(this.ys.map((r) => r.slice()))) as any;
    }

    /** Dense output on step j (between xs[j] and xs[j+1]). */
    private interpolate(t: number, j: number): number[] {
        const x0 = this.xs[j], x1 = this.xs[j + 1];
        const y0 = this.ys[j], y1 = this.ys[j + 1], yh = this.ymid[j];
        const f0 = this.fs[j], f1 = this.fs[j + 1];
        const h = x1 - x0, xh = x0 + 0.5 * h;
        const sq = (v: number) => v * v;
        const w0 = sq(t - x1) * (t - xh) / sq(x0 - x1) / (x0 - xh);
        const w1 = sq(t - x0) * sq(t - x1) / sq(x0 - xh) / sq(x1 - xh);
        const w2 = sq(t - x0) * (t - xh) / sq(x1 - x0) / (x1 - xh);
        const w3 = (t - x0) * sq(t - x1) * (t - xh) / sq(x0 - x1) / (x0 - xh);
        const w4 = (t - x1) * sq(t - x0) * (t - xh) / sq(x0 - x1) / (x1 - xh);
        const c0 = 1 / (x0 - xh) + 2 / (x0 - x1), c1 = 1 / (x1 - xh) + 2 / (x1 - x0);
        const out = new Array(y0.length);
        for (let i = 0; i < y0.length; i++) {
            const p = f0[i] - y0[i] * c0, q = f1[i] - y1[i] * c1;
            out[i] = y0[i] * w0 + yh[i] * w1 + y1[i] * w2 + p * w3 + q * w4;
        }
        return out;
    }

    /** @internal Point evaluation on raw arrays. */
    rawAt(t: number): number[] {
        const xs = this.xs;
        if (xs.length === 1) return this.ys[0].slice();
        let i = 0, j = xs.length - 1;
        while (j - i > 1) {
            const k = (i + j) >> 1;
            if (xs[k] <= t) i = k;
            else j = k;
        }
        return this.interpolate(t, i);
    }

    /**
     * Evaluate the solution between the accepted points (5th-order dense output).
     * - scalar ODE: at(t) → number, at([t...]) → Vector
     * - system: at(t) → Vector, at([t...]) → Matrix (one state per row)
     */
    at(t: number): S extends "scalar" ? number : Vector;
    at(t: VectorLike): S extends "scalar" ? Vector : Matrix;
    at(t: number | VectorLike): any {
        if (typeof t === "number") {
            const v = this.rawAt(t);
            return this.scalar ? v[0] : new Vector(v);
        }
        const ts = toRawVector(t, "DopriSolution.at");
        return this.scalar ? new Vector(ts.map((tt) => this.rawAt(tt)[0])) : new Matrix(ts.map((tt) => this.rawAt(tt)));
    }
}

const toArray = (v: number | number[] | Vector): number[] =>
    typeof v === "number" ? [v] : v instanceof Vector ? (v.real as number[]) : v;

/**
 * Components that cross from negative to zero-or-positive. (numeric.js
 * required e1 > 0, which misses events landing exactly on 0, e.g. at a step end.)
 */
function crossings(e0: number[], e1: number[]): boolean[] {
    return e0.map((a, k) => a < 0 && e1[k] >= 0);
}

/**
 * Integrate y' = f(x, y) from x0 to x1 with the Dormand–Prince 5(4) method
 * (adaptive steps, absolute tolerance on the infinity norm of the local error).
 *
 * y0 may be a number (scalar ODE; f receives and returns numbers) or a
 * vector (system; f receives a plain array). With an `event` function, the
 * integration stops at the first point where a component of event(x, y)
 * crosses from negative to positive, located by regula falsi on the dense output.
 *
 * @param x0        Start.
 * @param x1        End (x1 > x0).
 * @param y0        Initial value.
 * @param f         Right-hand side.
 * @param options   tol, maxit, event.
 */
export function dopri(x0: number, x1: number, y0: number, f: ScalarODE, options?: DopriOptions<ScalarEvent>): DopriSolution<"scalar">;
export function dopri(x0: number, x1: number, y0: VectorLike, f: SystemODE, options?: DopriOptions<SystemEvent>): DopriSolution<"system">;
export function dopri(x0: number, x1: number, y0: number | VectorLike, f: Function, options: DopriOptions<Function> = {}): DopriSolution {
    const tol = options.tol ?? 1e-6;
    const maxit = options.maxit ?? 1000;
    const scalar = typeof y0 === "number";
    // Work on arrays throughout; wrap user callbacks accordingly
    const F = scalar
        ? (x: number, y: number[]) => [(f as ScalarODE)(x, y[0])]
        : (x: number, y: number[]) => toArray((f as SystemODE)(x, y));
    const event = options.event;
    const EV = event === undefined ? undefined
        : scalar ? (x: number, y: number[]) => toArray((event as ScalarEvent)(x, y[0]))
        : (x: number, y: number[]) => toArray((event as SystemEvent)(x, y));

    let y = scalar ? [y0 as number] : toRawVector(y0 as VectorLike, "dopri").slice();
    const n = y.length;
    const xs = [x0], ys = [y], fs = [F(x0, y)], ymid: number[][] = [];
    let h = (x1 - x0) / 10;
    let it = 0, i = 0;
    let message = "";
    let e0 = EV ? EV(x0, y) : null;

    // Stage buffers
    const tmp = new Array(n);
    const stage = (coef: number[], ks: number[][]) => {
        for (let r = 0; r < n; r++) {
            let s = y[r];
            for (let q = 0; q < coef.length; q++) s += h * coef[q] * ks[q][r];
            tmp[r] = s;
        }
        return tmp;
    };

    let x = x0;
    while (x < x1 && it < maxit) {
        ++it;
        if (x + h > x1) h = x1 - x;
        const k1 = fs[i];
        const k2 = F(x + C[0] * h, stage([A2], [k1]).slice());
        const k3 = F(x + C[1] * h, stage(A3, [k1, k2]).slice());
        const k4 = F(x + C[2] * h, stage(A4, [k1, k2, k3]).slice());
        const k5 = F(x + C[3] * h, stage(A5, [k1, k2, k3, k4]).slice());
        const k6 = F(x + C[4] * h, stage(A6, [k1, k2, k3, k4, k5]).slice());
        const y1 = new Array(n);
        for (let r = 0; r < n; r++) {
            y1[r] = y[r] + h * (B[0] * k1[r] + B[2] * k3[r] + B[3] * k4[r] + B[4] * k5[r] + B[5] * k6[r]);
        }
        const k7 = F(x + h, y1);
        let erinf = 0;
        for (let r = 0; r < n; r++) {
            const er = h * (E[0] * k1[r] + E[2] * k3[r] + E[3] * k4[r] + E[4] * k5[r] + E[5] * k6[r] + E[6] * k7[r]);
            erinf = Math.max(erinf, Math.abs(er));
        }
        if (!(erinf <= tol)) {
            // Reject the step (also when the error is NaN) and retry with a smaller one
            h = Number.isNaN(erinf) ? 0.1 * h : 0.2 * h * Math.pow(tol / erinf, 0.25);
            if (x + h === x) {
                message = "Step size became too small";
                break;
            }
            continue;
        }
        const ym = new Array(n);
        for (let r = 0; r < n; r++) {
            ym[r] = y[r] + h * (BM[0] * k1[r] + BM[2] * k3[r] + BM[3] * k4[r] + BM[4] * k5[r] + BM[5] * k6[r] + BM[6] * k7[r]);
        }
        ymid[i] = ym;
        ++i;
        xs[i] = x + h;
        ys[i] = y1;
        fs[i] = k7;

        if (EV) {
            // Look for a crossing in the first half of the step, then the second half
            let xl = x, xr = x + 0.5 * h;
            let e1 = EV(xr, ym);
            let ev = crossings(e0!, e1);
            if (!ev.some(Boolean)) {
                xl = xr;
                xr = x + h;
                e0 = e1;
                e1 = EV(xr, y1);
                ev = crossings(e0, e1);
            }
            if (ev.some(Boolean)) {
                const sol = new DopriSolution(xs, ys, fs, ymid, scalar, it, "", null);
                let side = 0, sl = 1, sr = 1, xi = xr, yi = y1;
                for (;;) {
                    // Earliest crossing among the triggering components (Illinois regula falsi)
                    xi = xr;
                    for (let k = 0; k < e0!.length; k++) {
                        if (e0![k] < 0 && e1[k] >= 0) {
                            xi = Math.min(xi, (sr * e1[k] * xl - sl * e0![k] * xr) / (sr * e1[k] - sl * e0![k]));
                        }
                    }
                    if (xi <= xl || xi >= xr) break;
                    yi = sol.rawAt(xi);
                    const ei = EV(xi, yi);
                    const en = crossings(e0!, ei);
                    if (en.some(Boolean)) {
                        xr = xi;
                        e1 = ei;
                        ev = en;
                        sr = 1;
                        sl = side === -1 ? sl * 0.5 : 1;
                        side = -1;
                    } else {
                        xl = xi;
                        e0 = ei;
                        sl = 1;
                        sr = side === 1 ? sr * 0.5 : 1;
                        side = 1;
                    }
                }
                // Truncate the last step at the event
                yi = sol.rawAt(xi);
                const ymidEvent = sol.rawAt(0.5 * (x + xi));
                xs[i] = xi;
                ys[i] = yi;
                fs[i] = F(xi, yi);
                ymid[i - 1] = ymidEvent;
                return new DopriSolution(xs, ys, fs, ymid, scalar, it, "", ev);
            }
            e0 = e1;
        }

        x += h;
        y = y1;
        h = Math.min(0.8 * h * Math.pow(tol / erinf, 0.25), 4 * h);
    }
    if (message === "" && x < x1) message = "maximum iteration count exceeded";
    return new DopriSolution(xs, ys, fs, ymid, scalar, it, message, null);
}
