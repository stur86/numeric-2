import { clone } from "../utils";

/**
 * Matrix inverse via Gauss-Jordan elimination with partial pivoting.
 *
 * @param x     A square matrix.
 * @returns     The inverse matrix.
 */
export function inv(x: number[][]): number[][] {
    const n = x.length;
    const A = clone(x) as number[][];

    // Create identity matrix
    const I: number[][] = Array(n);
    for (let i = 0; i < n; i++) {
        const row = Array(n);
        for (let k = 0; k < n; k++) row[k] = 0;
        row[i] = 1;
        I[i] = row;
    }

    for (let j = 0; j < n; j++) {
        // Find pivot
        let maxVal = Math.abs(A[j][j]);
        let maxRow = j;
        for (let i = j + 1; i < n; i++) {
            const v = Math.abs(A[i][j]);
            if (v > maxVal) {
                maxVal = v;
                maxRow = i;
            }
        }

        // Swap rows in both A and I
        if (maxRow !== j) {
            let tmp = A[j]; A[j] = A[maxRow]; A[maxRow] = tmp;
            tmp = I[j]; I[j] = I[maxRow]; I[maxRow] = tmp;
        }

        const Aj = A[j];
        const Ij = I[j];
        const pivot = Aj[j];

        if (pivot === 0) {
            throw new Error("Matrix is singular");
        }

        // Divide pivot row by pivot element
        for (let k = 0; k < n; k++) {
            Aj[k] /= pivot;
            Ij[k] /= pivot;
        }

        // Eliminate all other rows
        for (let i = 0; i < n; i++) {
            if (i === j) continue;
            const factor = A[i][j];
            if (factor === 0) continue;
            const Ai = A[i];
            const Ii = I[i];
            // 2x unrolled
            let k = n - 2;
            for (; k >= 0; k -= 2) {
                Ai[k + 1] -= factor * Aj[k + 1];
                Ai[k] -= factor * Aj[k];
                Ii[k + 1] -= factor * Ij[k + 1];
                Ii[k] -= factor * Ij[k];
            }
            if (k === -1) {
                Ai[0] -= factor * Aj[0];
                Ii[0] -= factor * Ij[0];
            }
        }
    }

    return I;
}