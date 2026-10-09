/**
 * Eigenvalue decomposition of a square matrix (real or complex).
 * Ported from numeric.js: Householder → QR → eigenvector extraction.
 */

import { transpose } from "../utils";
import { dotMMsmall } from "../core/dot";
import Vector from "../vector";
import Matrix from "../matrix";
import { type MatrixLike, toRawMatrix, toRawCxMatrix } from "./wrap";
import { toUpperHessenbergRaw, QRFrancisRaw } from "./house";
import { cxToUpperHessenberg, cxQR } from "./cxhouse";
import {
    type CxMatrix,
    cxDotMM, cxTranspose, cxTransjugate,
    cxGetRows, cxSetRows, cxGetRow, cxSetRow,
    cxGet, cxSet, cxGetBlock1D,
    cxDotVV, cxVectorNorm2, cxVectorDivScalar,
    cxGetDiag, cxIdentity,
    cxScalarDiv, cxScalarSub, cxScalarNeg,
} from "./cxmat";

export type EigResult = {
    lambda: Vector;
    E: Matrix;
};

/**
 * Back-substitution for eigenvectors from a (quasi-)triangular Schur form.
 * Shared by both the real and complex eig paths.
 *
 * @param Q   Unitary transformation matrix (CxMatrix)
 * @param R   Upper triangular Schur form (CxMatrix)
 * @param n   Matrix dimension
 */
function eigBackSubstitute(Q: CxMatrix, R: CxMatrix, n: number): EigResult {
    const E: CxMatrix = cxIdentity(n);

    for (let jj = 0; jj < n; jj++) {
        if (jj > 0) {
            for (let kk = jj - 1; kk >= 0; kk--) {
                const Rk = cxGet(R, kk, kk);
                const Rj = cxGet(R, jj, jj);

                // Check if eigenvalues are distinct
                if (Rk[0] !== Rj[0] || Rk[1] !== Rj[1]) {
                    const xv = cxGetBlock1D(cxGetRow(R, kk), kk, jj - 1);
                    const yv = cxGetBlock1D(cxGetRow(E, jj), kk, jj - 1);
                    const Rkj = cxGet(R, kk, jj);
                    const xDotY = cxDotVV(xv, yv);
                    const num = cxScalarSub(cxScalarNeg(Rkj), xDotY);
                    const den = cxScalarSub(Rk, Rj);
                    cxSet(E, jj, kk, cxScalarDiv(num, den));
                } else {
                    cxSetRow(E, jj, cxGetRow(E, kk));
                    break;
                }
            }
        }
    }

    // Normalize rows of E
    for (let jj = 0; jj < n; jj++) {
        const row = cxGetRow(E, jj);
        const norm = cxVectorNorm2(row);
        if (norm > 0) {
            cxSetRow(E, jj, cxVectorDivScalar(row, norm));
        }
    }

    // Transpose E, then left-multiply by Q^H
    let Efinal: CxMatrix = cxTranspose(E);
    Efinal = cxDotMM(cxTransjugate(Q), Efinal);

    const lambdaCx = cxGetDiag(R);

    return {
        lambda: new Vector(lambdaCx[0], lambdaCx[1]),
        E: new Matrix(Efinal[0], Efinal[1]),
    };
}

/**
 * Real eigenvalue decomposition path.
 * Uses real Householder + Francis double-shift QR + 2×2 block processing.
 */
function eigReal(rawA: number[][], maxiter?: number): EigResult {
    const n = rawA.length;

    // Phase 1: Schur decomposition (real)
    const QH = toUpperHessenbergRaw(rawA);
    const QB = QRFrancisRaw(QH.H, maxiter);

    const H = dotMMsmall(QB.Q, dotMMsmall(QH.H, transpose(QB.Q)));
    const Q: CxMatrix = [dotMMsmall(QB.Q, QH.Q), null];

    const B = QB.B;
    const m = B.length;
    const sqrt = Math.sqrt;

    // Phase 2: Process 2×2 blocks to extract complex eigenvalue pairs
    for (let kk = 0; kk < m; kk++) {
        const i = B[kk][0];
        if (i === B[kk][1]) continue;

        const j = i + 1;
        const a = H[i][i];
        const b = H[i][j];
        const c = H[j][i];
        const d = H[j][j];

        if (b === 0 && c === 0) continue;

        const p1 = -a - d;
        const p2 = a * d - b * c;
        const disc = p1 * p1 - 4 * p2;

        let Q0: CxMatrix;

        if (disc >= 0) {
            let x: number;
            if (p1 < 0) x = -0.5 * (p1 - sqrt(disc));
            else x = -0.5 * (p1 + sqrt(disc));

            const n1 = (a - x) * (a - x) + b * b;
            const n2 = c * c + (d - x) * (d - x);
            let p: number, q: number;

            if (n1 > n2) {
                const sn1 = sqrt(n1);
                p = (a - x) / sn1;
                q = b / sn1;
            } else {
                const sn2 = sqrt(n2);
                p = c / sn2;
                q = (d - x) / sn2;
            }

            Q0 = [[[q, -p], [p, q]], null];
        } else {
            let x = -0.5 * p1;
            let y = 0.5 * sqrt(-disc);

            const n1 = (a - x) * (a - x) + b * b;
            const n2 = c * c + (d - x) * (d - x);
            let p: number, q: number;

            if (n1 > n2) {
                const sn1 = sqrt(n1 + y * y);
                p = (a - x) / sn1;
                q = b / sn1;
                x = 0;
                y /= sn1;
            } else {
                const sn2 = sqrt(n2 + y * y);
                p = c / sn2;
                q = (d - x) / sn2;
                x = y / sn2;
                y = 0;
            }

            Q0 = [
                [[q, -p], [p, q]],
                [[x, y], [y, -x]],
            ];
        }

        const Qrows = cxGetRows(Q, i, j);
        const newRows = cxDotMM(Q0, Qrows);
        cxSetRows(Q, i, j, newRows);
    }

    // Phase 3: Back-substitution
    const R = cxDotMM(cxDotMM(Q, [rawA, null]), cxTransjugate(Q));
    return eigBackSubstitute(Q, R, n);
}

/**
 * Complex eigenvalue decomposition path.
 * Uses complex Householder + single-shift QR (no 2×2 block processing needed).
 */
function eigComplex(A: CxMatrix, maxiter?: number): EigResult {
    const n = A[0].length;

    // Phase 1: Complex Schur decomposition
    const QH = cxToUpperHessenberg(A);
    const schur = cxQR(QH.H, maxiter);

    // Combine transformations: Q_total = schur.Q * QH.Q
    const Q = cxDotMM(schur.Q, QH.Q);

    // T is already upper triangular — use as R directly
    // (No Phase 2 needed: complex Schur form has no 2×2 blocks)
    return eigBackSubstitute(Q, schur.T, n);
}

/**
 * Eigenvalue decomposition of a square matrix (real or complex).
 *
 * Returns {lambda, E} where lambda contains eigenvalues (possibly complex)
 * and columns of E are the corresponding eigenvectors.
 *
 * A * E = E * diag(lambda)
 *
 * @param A        Square matrix (Matrix or number[][])
 * @param maxiter  Maximum QR iterations (default 10000)
 */
export function eig(A: MatrixLike, maxiter?: number): EigResult {
    if (A instanceof Matrix && A.is_complex) {
        return eigComplex(toRawCxMatrix(A), maxiter);
    }
    return eigReal(toRawMatrix(A), maxiter);
}
