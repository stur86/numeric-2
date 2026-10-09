/**
 * Singular value decomposition (Golub–Reinsch), ported from numeric.js.
 *
 * G. H. Golub and C. Reinsch, "Singular value decomposition and least squares
 * solutions", Numer. Math. 14, 403–420 (1970).
 */

import { clone, rep, transpose } from "../utils";
import Vector from "../vector";
import Matrix from "../matrix";
import { type MatrixLike, toRawMatrix } from "./wrap";
import { epsilon } from "./house";

export type SVDResult = {
    /** m×k matrix with orthonormal columns (k = min(m, n)). */
    U: Matrix;
    /** The k singular values, in descending order. */
    S: Vector;
    /** n×k matrix with orthonormal columns. */
    V: Matrix;
};

/** sqrt(a² + b²) without destructive overflow or underflow. */
function pythag(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    if (a > b) return a * Math.sqrt(1 + (b * b) / (a * a));
    if (b === 0) return a;
    return b * Math.sqrt(1 + (a * a) / (b * b));
}

/**
 * Thin SVD of a real m×n matrix with m >= n, on raw arrays.
 * Returns u (m×n), q (n singular values, unsorted) and v (n×n).
 */
function svdTall(A: number[][], itmax: number): { u: number[][]; q: number[]; v: number[][] } {
    let prec = epsilon;
    const tolerance = 1e-64 / prec;
    const u = clone(A) as number[][];
    const m = u.length;
    const n = u[0].length;

    const e: number[] = rep([n], 0);
    const q: number[] = rep([n], 0);
    const v = rep([n, n], 0) as number[][];

    let c = 0, f = 0, g = 0, h = 0, s = 0, x = 0, y = 0, z = 0;
    let i: number, j: number, k: number, l = 0;

    // Householder reduction to bidiagonal form
    for (i = 0; i < n; i++) {
        e[i] = g;
        s = 0;
        l = i + 1;
        for (j = i; j < m; j++) s += u[j][i] * u[j][i];
        if (s <= tolerance) {
            g = 0;
        } else {
            f = u[i][i];
            g = Math.sqrt(s);
            if (f >= 0) g = -g;
            h = f * g - s;
            u[i][i] = f - g;
            for (j = l; j < n; j++) {
                s = 0;
                for (k = i; k < m; k++) s += u[k][i] * u[k][j];
                f = s / h;
                for (k = i; k < m; k++) u[k][j] += f * u[k][i];
            }
        }
        q[i] = g;
        s = 0;
        const ui = u[i];
        for (j = l; j < n; j++) s += ui[j] * ui[j];
        if (s <= tolerance) {
            g = 0;
        } else {
            f = ui[i + 1];
            g = Math.sqrt(s);
            if (f >= 0) g = -g;
            h = f * g - s;
            ui[i + 1] = f - g;
            for (j = l; j < n; j++) e[j] = ui[j] / h;
            for (j = l; j < m; j++) {
                const uj = u[j];
                s = 0;
                for (k = l; k < n; k++) s += uj[k] * ui[k];
                for (k = l; k < n; k++) uj[k] += s * e[k];
            }
        }
        y = Math.abs(q[i]) + Math.abs(e[i]);
        if (y > x) x = y;
    }

    // Accumulation of right-hand transformations
    for (i = n - 1; i >= 0; i--) {
        const ui = u[i];
        if (g !== 0) {
            h = g * ui[i + 1];
            for (j = l; j < n; j++) v[j][i] = ui[j] / h;
            for (j = l; j < n; j++) {
                s = 0;
                for (k = l; k < n; k++) s += ui[k] * v[k][j];
                for (k = l; k < n; k++) v[k][j] += s * v[k][i];
            }
        }
        for (j = l; j < n; j++) {
            v[i][j] = 0;
            v[j][i] = 0;
        }
        v[i][i] = 1;
        g = e[i];
        l = i;
    }

    // Accumulation of left-hand transformations
    for (i = n - 1; i >= 0; i--) {
        l = i + 1;
        g = q[i];
        for (j = l; j < n; j++) u[i][j] = 0;
        if (g !== 0) {
            h = u[i][i] * g;
            for (j = l; j < n; j++) {
                s = 0;
                for (k = l; k < m; k++) s += u[k][i] * u[k][j];
                f = s / h;
                for (k = i; k < m; k++) u[k][j] += f * u[k][i];
            }
            for (j = i; j < m; j++) u[j][i] /= g;
        } else {
            for (j = i; j < m; j++) u[j][i] = 0;
        }
        u[i][i] += 1;
    }

    // Diagonalization of the bidiagonal form
    prec *= x;
    for (k = n - 1; k >= 0; k--) {
        for (let iteration = 0; iteration < itmax; iteration++) {
            // Test for splitting
            let converged = false;
            for (l = k; l >= 0; l--) {
                if (Math.abs(e[l]) <= prec) {
                    converged = true;
                    break;
                }
                if (Math.abs(q[l - 1]) <= prec) break;
            }
            if (!converged) {
                // Cancellation of e[l] if l > 0
                c = 0;
                s = 1;
                const l1 = l - 1;
                for (i = l; i < k + 1; i++) {
                    f = s * e[i];
                    e[i] = c * e[i];
                    if (Math.abs(f) <= prec) break;
                    g = q[i];
                    h = pythag(f, g);
                    q[i] = h;
                    c = g / h;
                    s = -f / h;
                    for (j = 0; j < m; j++) {
                        const uj = u[j];
                        y = uj[l1];
                        z = uj[i];
                        uj[l1] = y * c + z * s;
                        uj[i] = -y * s + z * c;
                    }
                }
            }
            // Test for convergence
            z = q[k];
            if (l === k) {
                if (z < 0) {
                    // Make the singular value non-negative
                    q[k] = -z;
                    for (j = 0; j < n; j++) v[j][k] = -v[j][k];
                }
                break;
            }
            if (iteration >= itmax - 1) {
                throw new Error("svd: no convergence");
            }
            // Shift from the bottom 2×2 minor
            x = q[l];
            y = q[k - 1];
            g = e[k - 1];
            h = e[k];
            f = ((y - z) * (y + z) + (g - h) * (g + h)) / (2 * h * y);
            g = pythag(f, 1);
            f = f < 0
                ? ((x - z) * (x + z) + h * (y / (f - g) - h)) / x
                : ((x - z) * (x + z) + h * (y / (f + g) - h)) / x;
            // Next QR transformation
            c = 1;
            s = 1;
            for (i = l + 1; i < k + 1; i++) {
                g = e[i];
                y = q[i];
                h = s * g;
                g = c * g;
                z = pythag(f, h);
                e[i - 1] = z;
                c = f / z;
                s = h / z;
                f = x * c + g * s;
                g = -x * s + g * c;
                h = y * s;
                y = y * c;
                for (j = 0; j < n; j++) {
                    const vj = v[j];
                    x = vj[i - 1];
                    z = vj[i];
                    vj[i - 1] = x * c + z * s;
                    vj[i] = -x * s + z * c;
                }
                z = pythag(f, h);
                q[i - 1] = z;
                c = f / z;
                s = h / z;
                f = c * g + s * y;
                x = -s * g + c * y;
                for (j = 0; j < m; j++) {
                    const uj = u[j];
                    y = uj[i - 1];
                    z = uj[i];
                    uj[i - 1] = y * c + z * s;
                    uj[i] = -y * s + z * c;
                }
            }
            e[l] = 0;
            e[k] = f;
            q[k] = x;
        }
    }

    // Flush values below the working precision to zero
    for (i = 0; i < n; i++) if (q[i] < prec) q[i] = 0;
    return { u, q, v };
}

/** Reorder singular values (descending) and the matching columns of U and V. */
function sortDescending(u: number[][], q: number[], v: number[][]) {
    const order = q.map((_, i) => i).sort((a, b) => q[b] - q[a]);
    const permuteColumns = (M: number[][]) => M.map((row) => order.map((j) => row[j]));
    return { U: permuteColumns(u), S: order.map((j) => q[j]), V: permuteColumns(v) };
}

/**
 * Singular value decomposition of a real matrix: A = U · diag(S) · Vᵀ.
 *
 * Returns the thin decomposition: for an m×n matrix with k = min(m, n),
 * U is m×k, S has k singular values in descending order, and V is n×k.
 * Unlike numeric.js, matrices with fewer rows than columns are supported.
 *
 * @param A         A real matrix.
 * @param maxiter   Maximum QR iterations per singular value (default 50).
 * @returns         {U, S, V}
 */
export function svd(A: MatrixLike, maxiter: number = 50): SVDResult {
    const raw = toRawMatrix(A, "svd");
    const m = raw.length, n = raw[0].length;
    for (let i = 1; i < m; i++) {
        if (raw[i].length !== n) throw new Error("svd: all rows must have the same length");
    }

    let r: { U: number[][]; S: number[]; V: number[][] };
    if (m >= n) {
        const { u, q, v } = svdTall(raw, maxiter);
        r = sortDescending(u, q, v);
    } else {
        // Aᵀ = U' S V'ᵀ  ⇒  A = V' S U'ᵀ
        const { u, q, v } = svdTall(transpose(raw), maxiter);
        const t = sortDescending(u, q, v);
        r = { U: t.V, S: t.S, V: t.U };
    }
    return { U: new Matrix(r.U), S: new Vector(r.S), V: new Matrix(r.V) };
}
