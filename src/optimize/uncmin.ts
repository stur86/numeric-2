/**
 * Numerical gradients and unconstrained minimization (BFGS), ported from
 * numeric.js.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import { identity, clone } from "../utils";
import { epsilon } from "../linalg/house";
import { type VectorLike, type MatrixLike, toRawVector, toRawMatrix } from "../linalg/wrap";

/** A scalar function of a vector. It receives a plain array. */
export type ObjectiveFunction = (x: number[]) => number;
/** A gradient function; may return a plain array or a Vector. */
export type GradientFunction = (x: number[]) => number[] | Vector;

/** Central-difference gradient of f at x, on raw arrays. */
export function rawGradient(f: ObjectiveFunction, x: number[]): number[] {
    const n = x.length;
    const f0 = f(x);
    if (Number.isNaN(f0)) throw new Error("gradient: f(x) is NaN");
    const x0 = x.slice();
    const J = new Array(n);
    const eps = 1e-3, abs = Math.abs, max = Math.max, min = Math.min;
    for (let i = 0; i < n; i++) {
        let h = max(1e-6 * abs(f0), 1e-8);
        // Shrink h until the forward, backward and central estimates agree
        for (let it = 0; ; it++) {
            if (it >= 20) throw new Error(`gradient: no reliable estimate for component ${i}`);
            x0[i] = x[i] + h;
            const f1 = f(x0);
            x0[i] = x[i] - h;
            const f2 = f(x0);
            x0[i] = x[i];
            if (Number.isNaN(f1) || Number.isNaN(f2)) {
                h /= 16;
                continue;
            }
            const g = (f1 - f2) / (2 * h);
            J[i] = g;
            const d1 = (f1 - f0) / h, d2 = (f0 - f2) / h;
            const N = max(abs(g), abs(f0), abs(f1), abs(f2), abs(x[i] - h), abs(x[i]), abs(x[i] + h), 1e-8);
            const errest = min(max(abs(d1 - g), abs(d2 - g), abs(d1 - d2)) / N, h / N);
            if (errest > eps) h /= 16;
            else break;
        }
    }
    return J;
}

/**
 * Numerical gradient of f at x by central differences, with an adaptive step.
 *
 * @param f     Scalar function; receives a plain array.
 * @param x     The point.
 * @returns     ∇f(x).
 */
export function gradient(f: ObjectiveFunction, x: VectorLike): Vector {
    return new Vector(rawGradient(f, toRawVector(x, "gradient")));
}

export type UncminOptions = {
    /** Stop when the step (or line-search step) is smaller than this (default 1e-8). */
    tol?: number;
    /** Analytic gradient; defaults to the numerical gradient of f. */
    gradient?: GradientFunction;
    /** Maximum iterations, counting line-search halvings (default 1000). */
    maxit?: number;
    /** Called at each iteration; return true to stop. */
    callback?: (iteration: number, x: number[], f: number, g: number[], Hinv: number[][]) => boolean | void;
    /** Initial inverse-Hessian estimate (default: identity). */
    Hinv?: MatrixLike;
};

export type UncminResult = {
    solution: Vector;
    f: number;
    gradient: Vector;
    invHessian: Matrix;
    iterations: number;
    /** Why the iteration stopped. */
    message: string;
};

const allFinite = (v: number[]) => v.every(Number.isFinite);

/**
 * Minimize f without constraints, using BFGS with a backtracking line search.
 *
 * @param f         Scalar function; receives a plain array.
 * @param x0        Starting point.
 * @param options   tol, gradient, maxit, callback, Hinv.
 * @returns         {solution, f, gradient, invHessian, iterations, message}
 */
export function uncmin(f: ObjectiveFunction, x0: VectorLike, options: UncminOptions = {}): UncminResult {
    const tol = Math.max(options.tol ?? 1e-8, epsilon);
    const maxit = options.maxit ?? 1000;
    const grad: (x: number[]) => number[] = options.gradient
        ? (x) => { const g = options.gradient!(x); return g instanceof Vector ? g.real as number[] : g; }
        : (x) => rawGradient(f, x);

    let x = toRawVector(x0, "uncmin").slice();
    const n = x.length;
    let fx = f(x);
    if (Number.isNaN(fx)) throw new Error("uncmin: f(x0) is NaN");
    const H = options.Hinv !== undefined ? clone(toRawMatrix(options.Hinv, "uncmin")) as number[][] : identity(n);
    let g = grad(x);
    let it = 0;
    let message = "";
    const step = new Array(n), s = new Array(n), y = new Array(n), Hy = new Array(n);

    while (it < maxit) {
        if (options.callback && options.callback(it, x, fx, g, H)) { message = "Callback returned true"; break; }
        if (!allFinite(g)) { message = "Gradient has Infinity or NaN"; break; }

        // Search direction: -H g
        let nstep = 0, df0 = 0;
        for (let i = 0; i < n; i++) {
            const Hi = H[i];
            let v = 0;
            for (let j = 0; j < n; j++) v -= Hi[j] * g[j];
            step[i] = v;
            nstep += v * v;
            df0 += g[i] * v;
        }
        nstep = Math.sqrt(nstep);
        if (!Number.isFinite(nstep)) { message = "Search direction has Infinity or NaN"; break; }
        if (nstep < tol) { message = "Newton step smaller than tol"; break; }

        // Backtracking line search (Armijo condition)
        let t = 1, x1 = x, f1 = fx;
        while (it < maxit) {
            if (t * nstep < tol) break;
            x1 = new Array(n);
            for (let i = 0; i < n; i++) {
                s[i] = step[i] * t;
                x1[i] = x[i] + s[i];
            }
            f1 = f(x1);
            if (f1 - fx >= 0.1 * t * df0 || Number.isNaN(f1)) {
                t *= 0.5;
                ++it;
                continue;
            }
            break;
        }
        if (t * nstep < tol) { message = "Line search step size smaller than tol"; break; }
        if (it === maxit) { message = "maxit reached during line search"; break; }

        // BFGS update of the inverse Hessian
        const g1 = grad(x1);
        let ys = 0;
        for (let i = 0; i < n; i++) {
            y[i] = g1[i] - g[i];
            ys += y[i] * s[i];
        }
        let yHy = 0;
        for (let i = 0; i < n; i++) {
            const Hi = H[i];
            let v = 0;
            for (let j = 0; j < n; j++) v += Hi[j] * y[j];
            Hy[i] = v;
            yHy += y[i] * v;
        }
        const a = (ys + yHy) / (ys * ys);
        for (let i = 0; i < n; i++) {
            const Hi = H[i], si = s[i], Hyi = Hy[i];
            for (let j = 0; j < n; j++) {
                Hi[j] += a * si * s[j] - (Hyi * s[j] + si * Hy[j]) / ys;
            }
        }

        x = x1;
        fx = f1;
        g = g1;
        ++it;
    }
    return {
        solution: new Vector(x),
        f: fx,
        gradient: new Vector(g),
        invHessian: new Matrix(H),
        iterations: it,
        message,
    };
}
