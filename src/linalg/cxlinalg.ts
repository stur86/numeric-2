/**
 * Internal. Complex LU decomposition, LU solve, inverse and determinant.
 *
 * Mirrors lu.ts / inv.ts / det.ts on split [re, im] arrays. Pivoting picks the
 * entry with the largest squared modulus. Not exported from the public API.
 */

import { clone, rep } from "../utils";
import type { CxMatrix, CxVector } from "./cxmat";

export type CxLUPResult = {
    LUre: number[][];
    LUim: number[][];
    P: number[];
};

/** Clone the real part and the imaginary part (or zeros if null). */
function cloneParts(A: CxMatrix): [number[][], number[][]] {
    const re = clone(A[0]) as number[][];
    const im = A[1] !== null ? clone(A[1]) as number[][] : rep([re.length, re[0].length], 0) as number[][];
    return [re, im];
}

/** Index of the row i >= k with the largest |a[i][k]|^2. */
function pivotRow(re: number[][], im: number[][], k: number, n: number): number {
    let best = k;
    let bestVal = re[k][k] * re[k][k] + im[k][k] * im[k][k];
    for (let i = k + 1; i < n; i++) {
        const v = re[i][k] * re[i][k] + im[i][k] * im[i][k];
        if (v > bestVal) {
            bestVal = v;
            best = i;
        }
    }
    return best;
}

/** Complex LU decomposition with partial pivoting (packed L/U, as in LU()). */
export function cxLU(A: CxMatrix): CxLUPResult {
    const [re, im] = cloneParts(A);
    const n = re.length;
    const P = Array(n);

    for (let k = 0; k < n; k++) {
        const p = pivotRow(re, im, k, n);
        P[k] = p;
        if (p !== k) {
            let t = re[k]; re[k] = re[p]; re[p] = t;
            t = im[k]; im[k] = im[p]; im[p] = t;
        }

        const ar = re[k][k], ai = im[k][k];
        const d = ar * ar + ai * ai;
        if (d === 0) continue;

        const Rk = re[k], Ik = im[k];
        for (let i = k + 1; i < n; i++) {
            const Ri = re[i], Ii = im[i];
            // factor = a[i][k] / a[k][k]
            const fr = (Ri[k] * ar + Ii[k] * ai) / d;
            const fi = (Ii[k] * ar - Ri[k] * ai) / d;
            Ri[k] = fr;
            Ii[k] = fi;
            for (let j = k + 1; j < n; j++) {
                // a[i][j] -= factor * a[k][j]
                Ri[j] -= fr * Rk[j] - fi * Ik[j];
                Ii[j] -= fr * Ik[j] + fi * Rk[j];
            }
        }
    }

    return { LUre: re, LUim: im, P };
}

/** Solve A x = b from a complex LU factorization. Returns [re, im]. */
export function cxLUsolve(lup: CxLUPResult, b: CxVector): [number[], number[]] {
    const { LUre: re, LUim: im, P } = lup;
    const n = re.length;
    const xr = b[0].slice();
    const xi = b[1] !== null ? b[1].slice() : Array(n).fill(0);

    // Apply permutation
    for (let i = 0; i < n; i++) {
        const p = P[i];
        if (p !== i) {
            let t = xr[i]; xr[i] = xr[p]; xr[p] = t;
            t = xi[i]; xi[i] = xi[p]; xi[p] = t;
        }
    }

    // Forward substitution (unit lower triangular)
    for (let i = 1; i < n; i++) {
        const Ri = re[i], Ii = im[i];
        let sr = xr[i], si = xi[i];
        for (let j = 0; j < i; j++) {
            sr -= Ri[j] * xr[j] - Ii[j] * xi[j];
            si -= Ri[j] * xi[j] + Ii[j] * xr[j];
        }
        xr[i] = sr;
        xi[i] = si;
    }

    // Backward substitution
    for (let i = n - 1; i >= 0; i--) {
        const Ri = re[i], Ii = im[i];
        let sr = xr[i], si = xi[i];
        for (let j = i + 1; j < n; j++) {
            sr -= Ri[j] * xr[j] - Ii[j] * xi[j];
            si -= Ri[j] * xi[j] + Ii[j] * xr[j];
        }
        const ar = Ri[i], ai = Ii[i];
        const d = ar * ar + ai * ai;
        xr[i] = (sr * ar + si * ai) / d;
        xi[i] = (si * ar - sr * ai) / d;
    }

    return [xr, xi];
}

/** Complex matrix inverse via Gauss-Jordan elimination. Returns [re, im]. */
export function cxInv(A: CxMatrix): [number[][], number[][]] {
    const [re, im] = cloneParts(A);
    const n = re.length;
    const Ir = rep([n, n], 0) as number[][];
    const Ii = rep([n, n], 0) as number[][];
    for (let i = 0; i < n; i++) Ir[i][i] = 1;

    for (let j = 0; j < n; j++) {
        const p = pivotRow(re, im, j, n);
        if (p !== j) {
            let t = re[j]; re[j] = re[p]; re[p] = t;
            t = im[j]; im[j] = im[p]; im[p] = t;
            t = Ir[j]; Ir[j] = Ir[p]; Ir[p] = t;
            t = Ii[j]; Ii[j] = Ii[p]; Ii[p] = t;
        }

        const Rj = re[j], Mj = im[j], IRj = Ir[j], IIj = Ii[j];
        const pr = Rj[j], pi = Mj[j];
        const d = pr * pr + pi * pi;
        if (d === 0) {
            throw new Error("Matrix is singular");
        }
        // Divide pivot row by the pivot: multiply by conj(p) / |p|^2
        const qr = pr / d, qi = -pi / d;
        for (let k = 0; k < n; k++) {
            let r = Rj[k], m = Mj[k];
            Rj[k] = r * qr - m * qi;
            Mj[k] = r * qi + m * qr;
            r = IRj[k]; m = IIj[k];
            IRj[k] = r * qr - m * qi;
            IIj[k] = r * qi + m * qr;
        }

        // Eliminate column j from all other rows
        for (let i = 0; i < n; i++) {
            if (i === j) continue;
            const fr = re[i][j], fi = im[i][j];
            if (fr === 0 && fi === 0) continue;
            const Ri = re[i], Mi = im[i], IRi = Ir[i], IIi = Ii[i];
            for (let k = 0; k < n; k++) {
                Ri[k] -= fr * Rj[k] - fi * Mj[k];
                Mi[k] -= fr * Mj[k] + fi * Rj[k];
                IRi[k] -= fr * IRj[k] - fi * IIj[k];
                IIi[k] -= fr * IIj[k] + fi * IRj[k];
            }
        }
    }

    return [Ir, Ii];
}

/** Complex determinant via Gaussian elimination. Returns [re, im]. */
export function cxDet(A: CxMatrix): [number, number] {
    const [re, im] = cloneParts(A);
    const n = re.length;
    let dr = 1, di = 0;

    for (let j = 0; j < n; j++) {
        const p = pivotRow(re, im, j, n);
        if (p !== j) {
            let t = re[j]; re[j] = re[p]; re[p] = t;
            t = im[j]; im[j] = im[p]; im[p] = t;
            dr = -dr;
            di = -di;
        }

        const Rj = re[j], Mj = im[j];
        const pr = Rj[j], pi = Mj[j];
        const d = pr * pr + pi * pi;
        if (d === 0) return [0, 0];

        // det *= pivot
        const t = dr * pr - di * pi;
        di = dr * pi + di * pr;
        dr = t;

        for (let i = j + 1; i < n; i++) {
            const Ri = re[i], Mi = im[i];
            const fr = (Ri[j] * pr + Mi[j] * pi) / d;
            const fi = (Mi[j] * pr - Ri[j] * pi) / d;
            for (let k = j + 1; k < n; k++) {
                Ri[k] -= fr * Rj[k] - fi * Mj[k];
                Mi[k] -= fr * Mj[k] + fi * Rj[k];
            }
        }
    }

    return [dr, di];
}
