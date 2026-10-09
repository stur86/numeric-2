import { clone } from "../utils";
import Vector from "../vector";
import Matrix from "../matrix";
import {
    type MatrixLike, type VectorLike, toRawMatrix, toRawCxMatrix, toRawCxVector,
    assertSquare, isComplexTensor,
} from "./wrap";
import { cxLU, cxLUsolve } from "./cxlinalg";

export type LUPResult = {
    /** L (strictly below the diagonal, implicit unit diagonal) and U packed together. Complex if A was. */
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
 * @param A     A square matrix (real or complex).
 * @param fast  If true, modifies A's data in-place (real matrices only). Default false (clones A).
 * @returns     {LU, P}
 */
export function LU(A: MatrixLike, fast: boolean = false): LUPResult {
    if (isComplexTensor(A)) {
        const cA = toRawCxMatrix(A);
        assertSquare(cA[0], "LU");
        const { LUre, LUim, P } = cxLU(cA);
        return { LU: new Matrix(LUre, LUim), P };
    }
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
    const n = lup.LU.nrows;
    const cb = toRawCxVector(b);
    if (cb[0].length !== n) {
        throw new Error(`LUsolve: right-hand side has length ${cb[0].length}, expected ${n}`);
    }
    if (lup.LU.is_complex) {
        const [re, im] = cxLUsolve(
            { LUre: lup.LU.real as number[][], LUim: lup.LU.imag as number[][], P: lup.P }, cb);
        return new Vector(re, im);
    }
    return solveRealLU({ LU: lup.LU.real as number[][], P: lup.P }, cb);
}

/** Solve with a real LU; a complex b is solved as two real systems. */
function solveRealLU(lup: RawLUPResult, b: [number[], number[] | null]): Vector {
    const re = rawLUsolve(lup, b[0]);
    return b[1] === null ? new Vector(re) : new Vector(re, rawLUsolve(lup, b[1]));
}

function rawLUsolve(lup: RawLUPResult, b: number[]): number[] {
    const { LU: a, P } = lup;
    const n = a.length;
    const x = b.slice();

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
    if (isComplexTensor(A)) return LUsolve(LU(A), b);
    const lup = rawLU(A, false);
    const cb = toRawCxVector(b);
    if (cb[0].length !== lup.LU.length) {
        throw new Error(`solve: right-hand side has length ${cb[0].length}, expected ${lup.LU.length}`);
    }
    return solveRealLU(lup, cb);
}