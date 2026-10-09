import { clone } from "../utils";
import { type MatrixLike, toRawMatrix, toRawCxMatrix, assertSquare, isComplexTensor } from "./wrap";
import { cxDet } from "./cxlinalg";
import type { Complex, Scalar } from "../complex";

/**
 * Determinant of a square matrix via Gaussian elimination with partial pivoting.
 *
 * @param x     A square matrix (real or complex).
 * @returns     The determinant: a number for real matrices, a Complex for complex ones.
 */
export function det(x: number[][]): number;
export function det(x: MatrixLike): Scalar;
export function det(x: MatrixLike): Scalar {
    if (isComplexTensor(x)) {
        const cx = toRawCxMatrix(x);
        assertSquare(cx[0], "det");
        const [re, im] = cxDet(cx);
        return { re, im } as Complex;
    }
    const rawX = toRawMatrix(x, "det");
    assertSquare(rawX, "det");
    const n = rawX.length;
    const A = clone(rawX) as number[][];
    let ret = 1;

    for (let j = 0; j < n; j++) {
        // Partial pivoting
        let maxVal = Math.abs(A[j][j]);
        let maxRow = j;
        for (let i = j + 1; i < n; i++) {
            const v = Math.abs(A[i][j]);
            if (v > maxVal) {
                maxVal = v;
                maxRow = i;
            }
        }

        if (maxRow !== j) {
            const tmp = A[j];
            A[j] = A[maxRow];
            A[maxRow] = tmp;
            ret *= -1;
        }

        const Aj = A[j];
        const pivot = Aj[j];

        if (pivot === 0) return 0;

        ret *= pivot;

        // Eliminate below
        for (let i = j + 1; i < n; i++) {
            const Ai = A[i];
            const factor = Ai[j] / pivot;
            // 2x unrolled
            let k = j + 1;
            const n1 = n - 1;
            for (; k < n1; k += 2) {
                Ai[k] -= factor * Aj[k];
                Ai[k + 1] -= factor * Aj[k + 1];
            }
            if (k === n1) {
                Ai[k] -= factor * Aj[k];
            }
        }
    }

    return ret;
}