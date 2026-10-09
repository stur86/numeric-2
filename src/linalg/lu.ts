import { clone } from "../utils";
import Vector from "../vector";
import Matrix from "../matrix";
import { type MatrixLike, type VectorLike, toRawMatrix, toRawVector, assertSquare } from "./wrap";

export type LUPResult = {
    /** L (strictly below the diagonal, implicit unit diagonal) and U packed together. */
    LU: Matrix;
    /** Pivot rows: row k was swapped with row P[k] at step k. */
    P: number[];
};

type RawLUPResult = {
    LU: number[][];
    P: number[];
};

/**
 * LU decomposition with partial pivoting.
 *
 * Returns {LU, P} where L and U are packed into a single matrix
 * (L below diagonal with implicit 1s on diagonal, U on/above diagonal),
 * and P is the pivot permutation array.
 *
 * @param A     A square matrix.
 * @param fast  If true, modifies A's data in-place. Default false (clones A).
 * @returns     {LU, P}
 */
export function LU(A: MatrixLike, fast: boolean = false): LUPResult {
    const { LU: a, P } = rawLU(A, fast);
    return { LU: new Matrix(a), P };
}

function rawLU(A: MatrixLike, fast: boolean): RawLUPResult {
    const rawA = toRawMatrix(A, "LU");
    assertSquare(rawA, "LU");
    const a = fast ? rawA : clone(rawA) as number[][];
    const n = a.length;
    const P = Array(n);

    for (let k = 0; k < n; k++) {
        // Partial pivoting: find row with max |a[i][k]| for i >= k
        let maxVal = Math.abs(a[k][k]);
        let maxRow = k;
        for (let i = k + 1; i < n; i++) {
            const v = Math.abs(a[i][k]);
            if (v > maxVal) {
                maxVal = v;
                maxRow = i;
            }
        }
        P[k] = maxRow;

        // Swap rows k and maxRow
        if (maxRow !== k) {
            const tmp = a[k];
            a[k] = a[maxRow];
            a[maxRow] = tmp;
        }

        const Akk = a[k][k];
        if (Akk === 0) continue;

        // Compute multipliers and update submatrix
        for (let i = k + 1; i < n; i++) {
            a[i][k] /= Akk;
            const Ai = a[i];
            const Ak = a[k];
            const factor = Ai[k];
            // 2x unrolled inner loop
            let j = k + 1;
            const n1 = n - 1;
            for (; j < n1; j += 2) {
                Ai[j] -= factor * Ak[j];
                Ai[j + 1] -= factor * Ak[j + 1];
            }
            if (j === n1) {
                Ai[j] -= factor * Ak[j];
            }
        }
    }

    return { LU: a, P };
}

/**
 * Solves Ax = b given an LU factorization from LU().
 *
 * @param lup   The {LU, P} result from LU().
 * @param b     The right-hand side vector.
 * @returns     The solution vector x.
 */
export function LUsolve(lup: LUPResult, b: VectorLike): Vector {
    return new Vector(rawLUsolve({ LU: lup.LU.real as number[][], P: lup.P }, b));
}

function rawLUsolve(lup: RawLUPResult, b: VectorLike): number[] {
    const { LU: a, P } = lup;
    const n = a.length;
    const rawB = toRawVector(b, "LUsolve");
    if (rawB.length !== n) {
        throw new Error(`LUsolve: right-hand side has length ${rawB.length}, expected ${n}`);
    }
    const x = rawB.slice();

    // Apply permutation
    for (let i = 0; i < n; i++) {
        const pi = P[i];
        if (pi !== i) {
            const tmp = x[i];
            x[i] = x[pi];
            x[pi] = tmp;
        }
    }

    // Forward substitution (L * y = Pb)
    for (let i = 1; i < n; i++) {
        const Ai = a[i];
        let s = x[i];
        for (let j = 0; j < i; j++) {
            s -= Ai[j] * x[j];
        }
        x[i] = s;
    }

    // Backward substitution (U * x = y)
    for (let i = n - 1; i >= 0; i--) {
        const Ai = a[i];
        let s = x[i];
        for (let j = i + 1; j < n; j++) {
            s -= Ai[j] * x[j];
        }
        x[i] = s / Ai[i];
    }

    return x;
}

/**
 * Solves the linear system Ax = b.
 *
 * @param A     A square matrix.
 * @param b     The right-hand side vector.
 * @returns     The solution vector x.
 */
export function solve(A: MatrixLike, b: VectorLike): Vector {
    return new Vector(rawLUsolve(rawLU(A, false), b));
}