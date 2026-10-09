/**
 * Low-level dot product implementations.
 * Performance-oriented with 2x loop unrolling, following numeric.js patterns.
 */

/**
 * Dot product of two vectors (2x unrolled).
 */
export function dotVV(x: number[], y: number[]): number {
    const n = x.length;
    let ret = x[n - 1] * y[n - 1];
    let i = n - 2;
    for (; i >= 1; i -= 2) {
        ret += x[i] * y[i] + x[i - 1] * y[i - 1];
    }
    if (i === 0) ret += x[0] * y[0];
    return ret;
}

/**
 * Matrix-vector product. Returns A * x.
 */
export function dotMV(A: number[][], x: number[]): number[] {
    const m = A.length;
    const ret = Array(m);
    for (let i = m - 1; i >= 0; i--) {
        ret[i] = dotVV(A[i], x);
    }
    return ret;
}

/**
 * Row-vector times matrix. Returns x^T * A (as a row vector).
 */
export function dotVM(x: number[], A: number[][]): number[] {
    const p = x.length;
    const n = A[0].length;
    const ret = Array(n);

    for (let k = n - 1; k >= 0; k--) {
        let s = x[p - 1] * A[p - 1][k];
        let j = p - 2;
        for (; j >= 1; j -= 2) {
            s += x[j] * A[j][k] + x[j - 1] * A[j - 1][k];
        }
        if (j === 0) s += x[0] * A[0][k];
        ret[k] = s;
    }
    return ret;
}

/**
 * Matrix-matrix product for small matrices.
 * Direct three-nested-loop with 2x unrolling on inner dimension.
 */
export function dotMMsmall(A: number[][], B: number[][]): number[][] {
    const m = A.length;
    const n = B[0].length;
    const q = B.length;
    const ret: number[][] = Array(m);

    for (let i = m - 1; i >= 0; i--) {
        const row = Array(n);
        const Ai = A[i];
        for (let k = n - 1; k >= 0; k--) {
            let s = Ai[q - 1] * B[q - 1][k];
            let j = q - 2;
            for (; j >= 1; j -= 2) {
                s += Ai[j] * B[j][k] + Ai[j - 1] * B[j - 1][k];
            }
            if (j === 0) s += Ai[0] * B[0][k];
            row[k] = s;
        }
        ret[i] = row;
    }
    return ret;
}

/**
 * Extract column j of matrix A into pre-allocated array v.
 */
function _getCol(A: number[][], j: number, v: number[]): void {
    const m = A.length;
    let i = m - 1;
    for (; i >= 1; i -= 2) {
        v[i] = A[i][j];
        v[i - 1] = A[i - 1][j];
    }
    if (i === 0) v[0] = A[0][j];
}

/**
 * Matrix-matrix product for large matrices.
 * Uses column extraction for better cache locality.
 */
export function dotMMbig(A: number[][], B: number[][]): number[][] {
    const m = A.length;
    const n = B[0].length;
    const q = B.length;
    const ret: number[][] = Array(m);
    const col = Array(q);

    for (let i = m - 1; i >= 0; i--) {
        ret[i] = Array(n);
    }

    for (let k = n - 1; k >= 0; k--) {
        _getCol(B, k, col);
        for (let i = m - 1; i >= 0; i--) {
            ret[i][k] = dotVV(A[i], col);
        }
    }
    return ret;
}