/**
 * Complex matrix helpers for eigenvalue decomposition.
 *
 * Operates on [number[][], number[][] | null] pairs where null imaginary
 * means purely real. These are lightweight standalone functions, not a class.
 */

import { transpose, negtranspose, identity, rep } from "../utils";
import { dotVV, dotMV, dotVM, dotMMsmall, dotMMbig } from "../core/dot";
import { _re_v_norm2 } from "../core/reducers";
import { _cx_v_norm2 } from "../core/cx.reducers";

/** Complex matrix: [real_part, imag_part]. imag_part is null for purely real. */
export type CxMatrix = [number[][], number[][] | null];

/** Complex vector: [real_part, imag_part]. imag_part is null for purely real. */
export type CxVector = [number[], number[] | null];

/** Complex scalar: [real, imag]. */
export type CxScalar = [number, number];

// ── Lazy imaginary allocation ──

function ensureImagMatrix(A: CxMatrix): number[][] {
    if (A[1] === null) {
        const m = A[0].length;
        const n = A[0][0].length;
        A[1] = rep([m, n], 0) as number[][];
    }
    return A[1];
}

// ── Complex scalar operations ──

export function cxScalarNeg(a: CxScalar): CxScalar {
    return [-a[0], -a[1]];
}

export function cxScalarSub(a: CxScalar, b: CxScalar): CxScalar {
    return [a[0] - b[0], a[1] - b[1]];
}

export function cxScalarDiv(a: CxScalar, b: CxScalar): CxScalar {
    const d = b[0] * b[0] + b[1] * b[1];
    return [
        (a[0] * b[0] + a[1] * b[1]) / d,
        (a[1] * b[0] - a[0] * b[1]) / d,
    ];
}

// ── Matrix element access ──

export function cxGet(A: CxMatrix, i: number, j: number): CxScalar {
    return [A[0][i][j], A[1] !== null ? A[1][i][j] : 0];
}

export function cxSet(A: CxMatrix, i: number, j: number, v: CxScalar): void {
    A[0][i][j] = v[0];
    if (v[1] !== 0) {
        ensureImagMatrix(A)[i][j] = v[1];
    } else if (A[1] !== null) {
        A[1][i][j] = 0;
    }
}

// ── Row operations ──

export function cxGetRow(A: CxMatrix, k: number): CxVector {
    const re = A[0][k].slice();
    const im = A[1] !== null ? A[1][k].slice() : null;
    return [re, im];
}

export function cxSetRow(A: CxMatrix, k: number, v: CxVector): void {
    const n = v[0].length;
    for (let i = n - 1; i >= 0; i--) A[0][k][i] = v[0][i];
    if (v[1] !== null) {
        const aim = ensureImagMatrix(A);
        for (let i = n - 1; i >= 0; i--) aim[k][i] = v[1][i];
    } else if (A[1] !== null) {
        for (let i = n - 1; i >= 0; i--) A[1][k][i] = 0;
    }
}

export function cxGetRows(A: CxMatrix, i0: number, i1: number): CxMatrix {
    const count = i1 - i0 + 1;
    const re = Array(count);
    for (let i = 0; i < count; i++) re[i] = A[0][i0 + i].slice();
    let im: number[][] | null = null;
    if (A[1] !== null) {
        im = Array(count);
        for (let i = 0; i < count; i++) im[i] = A[1][i0 + i].slice();
    }
    return [re, im];
}

export function cxSetRows(A: CxMatrix, i0: number, i1: number, src: CxMatrix): void {
    const count = i1 - i0 + 1;
    const n = src[0][0].length;
    for (let i = 0; i < count; i++) {
        const row = src[0][i];
        for (let j = n - 1; j >= 0; j--) A[0][i0 + i][j] = row[j];
    }
    if (src[1] !== null) {
        const aim = ensureImagMatrix(A);
        for (let i = 0; i < count; i++) {
            const row = src[1][i];
            for (let j = n - 1; j >= 0; j--) aim[i0 + i][j] = row[j];
        }
    } else if (A[1] !== null) {
        for (let i = 0; i < count; i++) {
            for (let j = n - 1; j >= 0; j--) A[1][i0 + i][j] = 0;
        }
    }
}

// ── Vector slicing ──

/** Extract elements a..b (inclusive) from a complex vector. */
export function cxGetBlock1D(v: CxVector, a: number, b: number): CxVector {
    const count = b - a + 1;
    const re = Array(count);
    for (let i = count - 1; i >= 0; i--) re[i] = v[0][a + i];
    let im: number[] | null = null;
    if (v[1] !== null) {
        im = Array(count);
        for (let i = count - 1; i >= 0; i--) im[i] = v[1][a + i];
    }
    return [re, im];
}

// ── Vector operations ──

/** Inner product of two complex vectors (unconjugated). */
export function cxDotVV(x: CxVector, y: CxVector): CxScalar {
    const xre = x[0], xim = x[1];
    const yre = y[0], yim = y[1];

    let rr = dotVV(xre, yre); // re*re
    let ri = 0;

    if (xim !== null && yim !== null) {
        // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
        rr -= dotVV(xim, yim);
        ri = dotVV(xre, yim) + dotVV(xim, yre);
    } else if (xim !== null) {
        // (a+bi)(c) = ac + bci
        ri = dotVV(xim, yre);
    } else if (yim !== null) {
        // (a)(c+di) = ac + adi
        ri = dotVV(xre, yim);
    }

    return [rr, ri];
}

/** Complex vector 2-norm: sqrt(sum(re[i]^2 + im[i]^2)). */
export function cxVectorNorm2(v: CxVector): number {
    const n = v[0].length;
    if (v[1] === null) {
        return _re_v_norm2(v[0], n);
    }
    return _cx_v_norm2(v[0], v[1], n);
}

/** Divide a complex vector by a real scalar. */
export function cxVectorDivScalar(v: CxVector, s: number): CxVector {
    const n = v[0].length;
    const re = Array(n);
    for (let i = n - 1; i >= 0; i--) re[i] = v[0][i] / s;
    let im: number[] | null = null;
    if (v[1] !== null) {
        im = Array(n);
        for (let i = n - 1; i >= 0; i--) im[i] = v[1][i] / s;
    }
    return [re, im];
}

// ── Matrix operations ──

/** Complex identity matrix of size n. */
export function cxIdentity(n: number): CxMatrix {
    return [identity(n), null];
}

/** Extract diagonal of a complex matrix as a CxVector. */
export function cxGetDiag(A: CxMatrix): CxVector {
    const n = Math.min(A[0].length, A[0][0].length);
    const re = Array(n);
    for (let i = n - 1; i >= 0; i--) re[i] = A[0][i][i];
    let im: number[] | null = null;
    if (A[1] !== null) {
        im = Array(n);
        for (let i = n - 1; i >= 0; i--) im[i] = A[1][i][i];
    }
    return [re, im];
}

/** Transpose of a complex matrix (no conjugation). */
export function cxTranspose(A: CxMatrix): CxMatrix {
    return [
        transpose(A[0]),
        A[1] !== null ? transpose(A[1]) : null,
    ];
}

/** Conjugate transpose (transjugate) of a complex matrix. */
export function cxTransjugate(A: CxMatrix): CxMatrix {
    return [
        transpose(A[0]),
        A[1] !== null ? negtranspose(A[1]) : null,
    ];
}

/** Choose dotMM implementation based on matrix size. */
function dotMM(A: number[][], B: number[][]): number[][] {
    const p = B.length;
    return p > 10 ? dotMMbig(A, B) : dotMMsmall(A, B);
}

/**
 * Complex matrix-matrix multiply.
 * (A_re + i*A_im)(B_re + i*B_im) = (A_re*B_re - A_im*B_im) + i*(A_re*B_im + A_im*B_re)
 */
export function cxDotMM(A: CxMatrix, B: CxMatrix): CxMatrix {
    const Are = A[0], Aim = A[1];
    const Bre = B[0], Bim = B[1];

    if (Aim === null && Bim === null) {
        return [dotMM(Are, Bre), null];
    }
    if (Aim === null) {
        // (Are)(Bre + i*Bim) = Are*Bre + i*Are*Bim
        return [dotMM(Are, Bre), dotMM(Are, Bim!)];
    }
    if (Bim === null) {
        // (Are + i*Aim)(Bre) = Are*Bre + i*Aim*Bre
        return [dotMM(Are, Bre), dotMM(Aim, Bre)];
    }
    // General case: 4 multiplies
    const rr = dotMM(Are, Bre);
    const ii = dotMM(Aim, Bim);
    const ri = dotMM(Are, Bim);
    const ir = dotMM(Aim, Bre);

    const m = rr.length;
    const n = rr[0].length;
    const resRe: number[][] = Array(m);
    const resIm: number[][] = Array(m);
    for (let i = m - 1; i >= 0; i--) {
        const rowRe = Array(n);
        const rowIm = Array(n);
        for (let j = n - 1; j >= 0; j--) {
            rowRe[j] = rr[i][j] - ii[i][j];
            rowIm[j] = ri[i][j] + ir[i][j];
        }
        resRe[i] = rowRe;
        resIm[i] = rowIm;
    }
    return [resRe, resIm];
}

// ── Additional scalar operations ──

export function cxScalarAdd(a: CxScalar, b: CxScalar): CxScalar {
    return [a[0] + b[0], a[1] + b[1]];
}

export function cxScalarMul(a: CxScalar, b: CxScalar): CxScalar {
    return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

export function cxScalarAbs(a: CxScalar): number {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}

// ── Additional vector operations ──

/** Hermitian inner product: sum(conj(x_i) * y_i). */
export function cxDotVVconj(x: CxVector, y: CxVector): CxScalar {
    const xre = x[0], xim = x[1];
    const yre = y[0], yim = y[1];

    // conj(x) * y = (a-bi)(c+di) = (ac+bd) + (ad-bc)i
    let rr = dotVV(xre, yre);
    let ri = 0;

    if (xim !== null && yim !== null) {
        rr += dotVV(xim, yim);
        ri = dotVV(xre, yim) - dotVV(xim, yre);
    } else if (xim !== null) {
        ri = -dotVV(xim, yre);
    } else if (yim !== null) {
        ri = dotVV(xre, yim);
    }

    return [rr, ri];
}

/** Complex vector subtraction. */
export function cxVectorSub(x: CxVector, y: CxVector): CxVector {
    const n = x[0].length;
    const re = Array(n);
    for (let i = n - 1; i >= 0; i--) re[i] = x[0][i] - y[0][i];

    if (x[1] === null && y[1] === null) return [re, null];

    const im = Array(n);
    const xi = x[1], yi = y[1];
    if (xi !== null && yi !== null) {
        for (let i = n - 1; i >= 0; i--) im[i] = xi[i] - yi[i];
    } else if (xi !== null) {
        for (let i = n - 1; i >= 0; i--) im[i] = xi[i];
    } else {
        for (let i = n - 1; i >= 0; i--) im[i] = -yi![i];
    }
    return [re, im];
}

/** Scale a complex vector by a complex scalar. */
export function cxVectorScale(v: CxVector, s: CxScalar): CxVector {
    const n = v[0].length;
    const re = Array(n);
    const im = Array(n);
    const sr = s[0], si = s[1];
    const vr = v[0], vi = v[1];

    if (vi === null) {
        for (let i = n - 1; i >= 0; i--) {
            re[i] = vr[i] * sr;
            im[i] = vr[i] * si;
        }
    } else {
        for (let i = n - 1; i >= 0; i--) {
            re[i] = vr[i] * sr - vi[i] * si;
            im[i] = vr[i] * si + vi[i] * sr;
        }
    }
    return [re, im];
}

// ── Column operations ──

export function cxGetCol(A: CxMatrix, j: number): CxVector {
    const m = A[0].length;
    const re = Array(m);
    for (let i = m - 1; i >= 0; i--) re[i] = A[0][i][j];
    let im: number[] | null = null;
    if (A[1] !== null) {
        im = Array(m);
        for (let i = m - 1; i >= 0; i--) im[i] = A[1][i][j];
    }
    return [re, im];
}

export function cxSetCol(A: CxMatrix, j: number, v: CxVector): void {
    const m = v[0].length;
    for (let i = m - 1; i >= 0; i--) A[0][i][j] = v[0][i];
    if (v[1] !== null) {
        const aim = ensureImagMatrix(A);
        for (let i = m - 1; i >= 0; i--) aim[i][j] = v[1][i];
    } else if (A[1] !== null) {
        for (let i = m - 1; i >= 0; i--) A[1][i][j] = 0;
    }
}

// ── Submatrix extraction ──

/** Extract submatrix (r0,c0 inclusive; r1,c1 exclusive). */
export function cxGetBlock(A: CxMatrix, r0: number, c0: number, r1: number, c1: number): CxMatrix {
    const rows = r1 - r0;
    const cols = c1 - c0;
    const re: number[][] = Array(rows);
    for (let i = rows - 1; i >= 0; i--) {
        const row = Array(cols);
        const srcRow = A[0][r0 + i];
        for (let j = cols - 1; j >= 0; j--) row[j] = srcRow[c0 + j];
        re[i] = row;
    }
    let im: number[][] | null = null;
    if (A[1] !== null) {
        im = Array(rows);
        for (let i = rows - 1; i >= 0; i--) {
            const row = Array(cols);
            const srcRow = A[1][i + r0];
            for (let j = cols - 1; j >= 0; j--) row[j] = srcRow[c0 + j];
            im[i] = row;
        }
    }
    return [re, im];
}

// ── Complex outer product ──

/** Complex outer product: v * w^H (m×n matrix from m-vector and n-vector). */
export function cxTensor(v: CxVector, w: CxVector): CxMatrix {
    const m = v[0].length;
    const n = w[0].length;
    const vr = v[0], vi = v[1];
    const wr = w[0], wi = w[1];
    const re: number[][] = Array(m);
    const im: number[][] = Array(m);

    for (let i = m - 1; i >= 0; i--) {
        const rowRe = Array(n);
        const rowIm = Array(n);
        const vri = vr[i];
        const vii = vi !== null ? vi[i] : 0;
        // v_i * conj(w_j) = (vr+vi*i)(wr-wi*i) = (vr*wr+vi*wi) + (vi*wr-vr*wi)i
        for (let j = n - 1; j >= 0; j--) {
            const wrj = wr[j];
            const wij = wi !== null ? wi[j] : 0;
            rowRe[j] = vri * wrj + vii * wij;
            rowIm[j] = vii * wrj - vri * wij;
        }
        re[i] = rowRe;
        im[i] = rowIm;
    }
    return [re, im];
}

// ── Complex matrix-vector and vector-matrix products ──

/** Complex matrix-vector product: A * v → CxVector. */
export function cxDotMV(A: CxMatrix, v: CxVector): CxVector {
    const m = A[0].length;
    const Are = A[0], Aim = A[1];
    const vre = v[0], vim = v[1];
    const re = Array(m);
    const im = Array(m);

    if (Aim === null && vim === null) {
        for (let i = m - 1; i >= 0; i--) re[i] = dotVV(Are[i], vre);
        return [re, null];
    }
    for (let i = m - 1; i >= 0; i--) {
        // (Are_i + i*Aim_i) · (vre + i*vim)
        let rr = dotVV(Are[i], vre);
        let ri = 0;
        if (Aim !== null && vim !== null) {
            rr -= dotVV(Aim[i], vim);
            ri = dotVV(Are[i], vim) + dotVV(Aim[i], vre);
        } else if (Aim !== null) {
            ri = dotVV(Aim[i], vre);
        } else {
            rr -= 0;
            ri = dotVV(Are[i], vim!);
        }
        re[i] = rr;
        im[i] = ri;
    }
    return [re, im];
}

/** Complex vector-matrix product: v^T * A → CxVector (no conjugation). */
export function cxDotVM(v: CxVector, A: CxMatrix): CxVector {
    const n = A[0][0].length;
    const p = v[0].length;
    const Are = A[0], Aim = A[1];
    const vre = v[0], vim = v[1];
    const re = Array(n);
    const im = Array(n);

    if (Aim === null && vim === null) {
        // Pure real: use optimized dotVM
        return [dotVM(vre, Are), null];
    }

    // Build column-wise dot products
    for (let k = n - 1; k >= 0; k--) {
        let rr = 0, ri = 0;
        for (let j = p - 1; j >= 0; j--) {
            const arj = Are[j][k];
            const aij = Aim !== null ? Aim[j][k] : 0;
            const vrj = vre[j];
            const vij = vim !== null ? vim[j] : 0;
            // (vrj + vij*i)(arj + aij*i) = (vrj*arj - vij*aij) + (vrj*aij + vij*arj)i
            rr += vrj * arj - vij * aij;
            ri += vrj * aij + vij * arj;
        }
        re[k] = rr;
        im[k] = ri;
    }
    return [re, im];
}

