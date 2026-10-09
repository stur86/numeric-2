/**
 * Linear programming (interior-point method), ported from numeric.js.
 *
 *   minimize    c·x
 *   subject to  A x ≤ b,  Aeq x = beq
 */

import Vector from "../vector";
import { identity, clone, transpose } from "../utils";
import { dotMV, dotVV, dotMMsmall, dotMMbig } from "../core/dot";
import { epsilon } from "../linalg/house";
import { solve } from "../linalg/lu";
import { type MatrixLike, type VectorLike, toRawMatrix, toRawVector } from "../linalg/wrap";

const dotMM = (A: number[][], B: number[][]) => (B.length < 10 ? dotMMsmall(A, B) : dotMMbig(A, B));

export type EchelonResult = {
    /** The row-reduced matrix. */
    A: number[][];
    /** The accumulated row operations (A_reduced = I · A_original). */
    I: number[][];
    /** Pivot column of each row. */
    P: number[];
};

/** Gauss-Jordan reduction of the rows of A, choosing the largest entry of each row as its pivot. */
export function echelonize(Ain: MatrixLike): EchelonResult {
    const A = clone(toRawMatrix(Ain, "echelonize")) as number[][];
    const m = A.length, n = A[0].length;
    const I = identity(m);
    const P: number[] = new Array(m);
    for (let i = 0; i < m; i++) {
        const Ai = A[i], Ii = I[i];
        let k = 0;
        for (let j = 1; j < n; j++) if (Math.abs(Ai[k]) < Math.abs(Ai[j])) k = j;
        P[i] = k;
        const piv = Ai[k];
        for (let l = 0; l < m; l++) Ii[l] /= piv;
        for (let l = 0; l < n; l++) Ai[l] /= piv;
        for (let j = 0; j < m; j++) {
            if (j === i) continue;
            const Z = A[j], a = Z[k];
            for (let l = n - 1; l >= 0; l--) Z[l] -= Ai[l] * a;
            const W = I[j];
            for (let l = m - 1; l >= 0; l--) W[l] -= Ii[l] * a;
        }
    }
    return { I, A, P };
}

type LPResult = { solution: number[] | null; message: string; iterations: number };

/** The interior-point iteration, starting from a strictly feasible x. */
function iterateLP(c: number[], A: number[][], b: number[], tol: number, maxit: number, x: number[], flag: boolean): LPResult {
    const m = c.length, n = b.length;
    const sub = (u: number[], v: number[]) => u.map((ui, i) => ui - v[i]);
    let z = sub(b, dotMV(A, x));
    const dotcc = dotVV(c, c);
    const A0: number[][] = new Array(n);
    const p = new Array(m);

    let count = 0;
    for (; count < maxit; ++count) {
        for (let i = n - 1; i >= 0; i--) A0[i] = A[i].map((v) => v / z[i]);
        const A1 = transpose(A0);
        for (let i = m - 1; i >= 0; i--) {
            let s = 0;
            const r = A1[i];
            for (let j = 0; j < r.length; j++) s += r[j];
            p[i] = s;
        }
        let alpha = 0.25 * Math.abs(dotcc / dotVV(c, p));
        const a1 = 100 * Math.sqrt(dotcc / dotVV(p, p));
        if (!Number.isFinite(alpha) || alpha > a1) alpha = a1;
        const g = c.map((ci, i) => ci + alpha * p[i]);
        const H = dotMM(A1, A0);
        for (let i = m - 1; i >= 0; i--) H[i][i] += 1;
        const d = solve(H, g.map((v) => v / alpha)).real as number[];
        const Ad = dotMV(A, d);
        let t = 1;
        for (let i = n - 1; i >= 0; i--) {
            const t0 = z[i] / Ad[i];
            if (t0 < 0) t = Math.min(t, -0.999 * t0);
        }
        const y = x.map((xi, i) => xi - d[i] * t);
        z = sub(b, dotMV(A, y));
        if (!z.every((v) => v > 0)) return { solution: x, message: "", iterations: count };
        x = y;
        if (alpha < tol) return { solution: y, message: "", iterations: count };
        let unbounded: boolean;
        if (flag) {
            const s = dotVV(c, g), Ag = dotMV(A, g);
            unbounded = true;
            for (let i = n - 1; i >= 0; i--) if (s * Ag[i] < 0) { unbounded = false; break; }
        } else {
            unbounded = x[m - 1] < 0;
        }
        if (unbounded) return { solution: y, message: "Unbounded", iterations: count };
    }
    return { solution: x, message: "maximum iteration count exceeded", iterations: count };
}

/** Inequality-only LP: phase 1 finds a strictly feasible point, phase 2 optimizes. */
function solveInequalityLP(c: number[], A: number[][], b: number[], tol: number, maxit: number): LPResult {
    const m = c.length, n = b.length;
    // Phase 1: minimize s subject to A x - s ≤ b, from a point where s is large enough
    const c0 = new Array(m).fill(0).concat([1]);
    const A0 = A.map((row) => row.concat([-1]));
    let maxNegB = 0;
    for (let i = 0; i < n; i++) maxNegB = Math.max(maxNegB, -b[i]);
    const y = new Array(m).fill(0).concat([maxNegB + 1]);
    const phase1 = iterateLP(c0, A0, b, tol, maxit, y, false);
    const x = phase1.solution!.slice(0, m);
    const slack = dotMV(A, x);
    let worst = Infinity;
    for (let i = 0; i < n; i++) worst = Math.min(worst, b[i] - slack[i]);
    if (worst < 0) return { solution: null, message: "Infeasible", iterations: phase1.iterations };
    const phase2 = iterateLP(c, A, b, tol, maxit - phase1.iterations, x, true);
    phase2.iterations += phase1.iterations;
    return phase2;
}

export type SolveLPOptions = {
    /** Equality constraints Aeq x = beq. */
    Aeq?: MatrixLike;
    beq?: VectorLike;
    /** Convergence tolerance (default: machine epsilon). */
    tol?: number;
    /** Maximum iterations (default 1000). */
    maxit?: number;
};

export type SolveLPResult = {
    /** The minimizer, or null if the problem is infeasible. */
    solution: Vector | null;
    /** "" on success, otherwise "Infeasible", "Unbounded" or "maximum iteration count exceeded". */
    message: string;
    iterations: number;
};

/**
 * Solve a linear program with an interior-point method:
 *
 *     minimize c·x   subject to   A x ≤ b,   Aeq x = beq
 *
 * Equality constraints are eliminated first (by row reduction of Aeq), then
 * the remaining inequality-constrained problem is solved in two phases.
 *
 * @param c         Cost vector.
 * @param A         Inequality constraint matrix (one row per constraint).
 * @param b         Inequality bounds.
 * @param options   Aeq/beq, tol, maxit.
 */
export function solveLP(c: VectorLike, A: MatrixLike, b: VectorLike, options: SolveLPOptions = {}): SolveLPResult {
    const tol = options.tol ?? epsilon;
    const maxit = options.maxit ?? 1000;
    const rc = toRawVector(c, "solveLP"), rA = toRawMatrix(A, "solveLP"), rb = toRawVector(b, "solveLP");
    if (rA.length !== rb.length) throw new Error(`solveLP: A has ${rA.length} rows but b has length ${rb.length}`);
    if (rA[0].length !== rc.length) throw new Error(`solveLP: A has ${rA[0].length} columns but c has length ${rc.length}`);

    const wrap = (r: LPResult): SolveLPResult => ({
        solution: r.solution === null ? null : new Vector(r.solution),
        message: r.message,
        iterations: r.iterations,
    });

    if (options.Aeq === undefined) return wrap(solveInequalityLP(rc, rA, rb, tol, maxit));
    if (options.beq === undefined) throw new Error("solveLP: Aeq given without beq");

    // Eliminate the equality constraints: solve for the pivot variables P in terms of the rest (Q)
    const Aeq = toRawMatrix(options.Aeq, "solveLP"), beq = toRawVector(options.beq, "solveLP");
    const nvar = Aeq[0].length;
    const B = echelonize(Aeq);
    const P = B.P;
    const isPivot = new Array(nvar).fill(false);
    for (const k of P) isPivot[k] = true;
    const Q: number[] = [];
    for (let i = nvar - 1; i >= 0; i--) if (!isPivot[i]) Q.push(i);

    const cols = (M: number[][], idx: number[]) => M.map((row) => idx.map((j) => row[j]));
    const Aeq2 = cols(Aeq, Q), A1 = cols(rA, P), A2 = cols(rA, Q);
    const A3 = dotMM(A1, B.I);
    const A3Aeq2 = dotMM(A3, Aeq2);
    const A4 = A2.map((row, i) => row.map((v, j) => v - A3Aeq2[i][j]));
    const A3beq = dotMV(A3, beq);
    const b4 = rb.map((v, i) => v - A3beq[i]);
    const c1 = P.map((k) => rc[k]), c2 = Q.map((k) => rc[k]);
    // c4 = c2 - c1 · (B.I · Aeq2)
    const BIAeq2 = dotMM(B.I, Aeq2);
    const c4 = c2.map((v, j) => {
        let s = 0;
        for (let i = 0; i < c1.length; i++) s += c1[i] * BIAeq2[i][j];
        return v - s;
    });
    const S = solveInequalityLP(c4, A4, b4, tol, maxit);
    if (S.solution === null) return wrap(S);
    const x2 = S.solution;
    const Aeq2x2 = dotMV(Aeq2, x2);
    const x1 = dotMV(B.I, beq.map((v, i) => v - Aeq2x2[i]));
    const x = new Array(rc.length);
    P.forEach((k, i) => { x[k] = x1[i]; });
    Q.forEach((k, i) => { x[k] = x2[i]; });
    return wrap({ solution: x, message: S.message, iterations: S.iterations });
}
