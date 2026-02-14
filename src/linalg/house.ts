/**
 * Householder reflection, upper Hessenberg reduction, and QR Francis iteration.
 * All operate on real number[][] matrices. Ported from numeric.js.
 */

import { clone, identity, dim, getBlock, tensor, rep, diag } from "../utils";
import { dotVV, dotMV, dotVM, dotMMsmall } from "../core/dot";
import { _re_v_norm2 } from "../core/reducers";

/** IEEE 754 double-precision machine epsilon. */
export const epsilon = 2.220446049250313e-16;

/**
 * Compute a Householder reflection vector.
 *
 * Given a vector x, returns a unit vector v such that the Householder
 * matrix H = I - 2*v*v^T zeroes out all but the first element of x.
 */
export function house(x: number[]): number[] {
    const n = x.length;
    const v = Array(n);
    for (let i = n - 1; i >= 0; i--) v[i] = x[i];

    const s = x[0] >= 0 ? 1 : -1;
    const alpha = s * _re_v_norm2(x, n);
    v[0] += alpha;

    const foo = _re_v_norm2(v, n);
    if (foo === 0) {
        throw new Error("eig: internal error");
    }

    for (let i = n - 1; i >= 0; i--) v[i] /= foo;
    return v;
}

export type HessenbergResult = {
    H: number[][];
    Q: number[][];
};

/**
 * Reduce a real square matrix to upper Hessenberg form using Householder reflections.
 *
 * Returns {H, Q} where H = Q^T * A * Q is upper Hessenberg and Q is orthogonal.
 */
export function toUpperHessenberg(me: number[][]): HessenbergResult {
    const s = dim(me);
    if (s.length !== 2 || s[0] !== s[1]) {
        throw new Error("numeric: toUpperHessenberg() only works on square matrices");
    }
    const m = s[0] as number;
    let i: number, j: number, k: number;
    let x: number[], v: number[];
    const A = clone(me) as number[][];
    let B: number[][], C: number[][];
    let Ai: number[], Ci: number[];
    const Q = identity(m);
    let Qi: number[];

    for (j = 0; j < m - 2; j++) {
        x = Array(m - j - 1);
        for (i = j + 1; i < m; i++) {
            x[i - j - 1] = A[i][j];
        }
        if (_re_v_norm2(x, x.length) > 0) {
            v = house(x);

            // Apply H from left: A[j+1:m, j:m] -= 2 * v * (v^T * A[j+1:m, j:m])
            B = getBlock(A, j + 1, j, m, m);
            C = tensor(v, dotVM(v, B));
            for (i = j + 1; i < m; i++) {
                Ai = A[i];
                Ci = C[i - j - 1];
                for (k = j; k < m; k++) Ai[k] -= 2 * Ci[k - j];
            }

            // Apply H from right: A[0:m, j+1:m] -= 2 * (A[0:m, j+1:m] * v) * v^T
            B = getBlock(A, 0, j + 1, m, m);
            C = tensor(dotMV(B, v), v);
            for (i = 0; i < m; i++) {
                Ai = A[i];
                Ci = C[i];
                for (k = j + 1; k < m; k++) Ai[k] -= 2 * Ci[k - j - 1];
            }

            // Accumulate Q: Q[j+1:m, :] -= 2 * v * (v^T * Q[j+1:m, :])
            B = Array(m - j - 1);
            for (i = j + 1; i < m; i++) B[i - j - 1] = Q[i];
            C = tensor(v, dotVM(v, B));
            for (i = j + 1; i < m; i++) {
                Qi = Q[i];
                Ci = C[i - j - 1];
                for (k = 0; k < m; k++) Qi[k] -= 2 * Ci[k];
            }
        }
    }
    return { H: A, Q };
}

export type QRFrancisResult = {
    Q: number[][];
    B: number[][];
};

/**
 * QR algorithm with implicit Francis double shifts on an upper Hessenberg matrix.
 *
 * Returns {Q, B} where Q is orthogonal and B is an array of [start, end] pairs
 * identifying diagonal blocks (1×1 for real eigenvalues, 2×2 for complex pairs).
 */
export function QRFrancis(H: number[][], maxiter: number = 10000): QRFrancisResult {
    H = clone(H) as number[][];
    const s = dim(H);
    const m = s[0] as number;
    let x: number[], v: number[];
    let a: number, b: number, c: number, d: number, det: number, tr: number;
    let Hloc: number[][];
    const Q = identity(m);
    let Qi: number[], Hi: number[];
    let B: number[][], C: number[][];
    let Ci: number[];
    let i: number, j: number, k: number;

    if (m < 3) {
        return { Q, B: [[0, m - 1]] };
    }

    for (let iter = 0; iter < maxiter; iter++) {
        // Check for deflation
        for (j = 0; j < m - 1; j++) {
            if (Math.abs(H[j + 1][j]) < epsilon * (Math.abs(H[j][j]) + Math.abs(H[j + 1][j + 1]))) {
                const QH1 = QRFrancis(getBlock(H, 0, 0, j + 1, j + 1), maxiter);
                const QH2 = QRFrancis(getBlock(H, j + 1, j + 1, m, m), maxiter);

                B = Array(j + 1);
                for (i = 0; i <= j; i++) B[i] = Q[i];
                C = dotMMsmall(QH1.Q, B);
                for (i = 0; i <= j; i++) Q[i] = C[i];

                B = Array(m - j - 1);
                for (i = j + 1; i < m; i++) B[i - j - 1] = Q[i];
                C = dotMMsmall(QH2.Q, B);
                for (i = j + 1; i < m; i++) Q[i] = C[i - j - 1];

                return {
                    Q,
                    B: QH1.B.concat(QH2.B.map(([s, e]) => [s + j + 1, e + j + 1])),
                };
            }
        }

        // Compute shifts from bottom 2×2 block
        a = H[m - 2][m - 2];
        b = H[m - 2][m - 1];
        c = H[m - 1][m - 2];
        d = H[m - 1][m - 1];
        tr = a + d;
        det = a * d - b * c;

        // Compute shift polynomial applied to top-left 3×3
        Hloc = getBlock(H, 0, 0, 3, 3);
        if (tr * tr >= 4 * det) {
            const s1 = 0.5 * (tr + Math.sqrt(tr * tr - 4 * det));
            const s2 = 0.5 * (tr - Math.sqrt(tr * tr - 4 * det));
            // Hloc = Hloc^2 - (s1+s2)*Hloc + s1*s2*I
            const Hloc2 = dotMMsmall(Hloc, Hloc);
            const scale = s1 + s2;
            const prod = s1 * s2;
            for (i = 0; i < 3; i++)
                for (k = 0; k < 3; k++)
                    Hloc[i][k] = Hloc2[i][k] - scale * Hloc[i][k] + (i === k ? prod : 0);
        } else {
            // Hloc = Hloc^2 - tr*Hloc + det*I
            const Hloc2 = dotMMsmall(Hloc, Hloc);
            for (i = 0; i < 3; i++)
                for (k = 0; k < 3; k++)
                    Hloc[i][k] = Hloc2[i][k] - tr * Hloc[i][k] + (i === k ? det : 0);
        }

        // Initial bulge: Householder from first column of shift polynomial
        x = [Hloc[0][0], Hloc[1][0], Hloc[2][0]];
        v = house(x);

        // Apply from left to rows 0..2
        B = [H[0], H[1], H[2]];
        C = tensor(v, dotVM(v, B));
        for (i = 0; i < 3; i++) {
            Hi = H[i];
            Ci = C[i];
            for (k = 0; k < m; k++) Hi[k] -= 2 * Ci[k];
        }

        // Apply from right to cols 0..2
        B = getBlock(H, 0, 0, m, 3);
        C = tensor(dotMV(B, v), v);
        for (i = 0; i < m; i++) {
            Hi = H[i];
            Ci = C[i];
            for (k = 0; k < 3; k++) Hi[k] -= 2 * Ci[k];
        }

        // Accumulate Q
        B = [Q[0], Q[1], Q[2]];
        C = tensor(v, dotVM(v, B));
        for (i = 0; i < 3; i++) {
            Qi = Q[i];
            Ci = C[i];
            for (k = 0; k < m; k++) Qi[k] -= 2 * Ci[k];
        }

        // Chase bulge
        let J: number;
        for (j = 0; j < m - 2; j++) {
            // Check for deflation during chase
            for (k = j; k <= j + 1; k++) {
                if (Math.abs(H[k + 1][k]) < epsilon * (Math.abs(H[k][k]) + Math.abs(H[k + 1][k + 1]))) {
                    const QH1 = QRFrancis(getBlock(H, 0, 0, k + 1, k + 1), maxiter);
                    const QH2 = QRFrancis(getBlock(H, k + 1, k + 1, m, m), maxiter);

                    B = Array(k + 1);
                    for (i = 0; i <= k; i++) B[i] = Q[i];
                    C = dotMMsmall(QH1.Q, B);
                    for (i = 0; i <= k; i++) Q[i] = C[i];

                    B = Array(m - k - 1);
                    for (i = k + 1; i < m; i++) B[i - k - 1] = Q[i];
                    C = dotMMsmall(QH2.Q, B);
                    for (i = k + 1; i < m; i++) Q[i] = C[i - k - 1];

                    return {
                        Q,
                        B: QH1.B.concat(QH2.B.map(([s, e]) => [s + k + 1, e + k + 1])),
                    };
                }
            }

            // Householder for bulge chase step
            J = Math.min(m - 1, j + 3);
            x = Array(J - j);
            for (i = j + 1; i <= J; i++) x[i - j - 1] = H[i][j];
            v = house(x);

            // Apply from left
            B = getBlock(H, j + 1, j, J + 1, m);
            C = tensor(v, dotVM(v, B));
            for (i = j + 1; i <= J; i++) {
                Hi = H[i];
                Ci = C[i - j - 1];
                for (k = j; k < m; k++) Hi[k] -= 2 * Ci[k - j];
            }

            // Apply from right
            B = getBlock(H, 0, j + 1, m, J + 1);
            C = tensor(dotMV(B, v), v);
            for (i = 0; i < m; i++) {
                Hi = H[i];
                Ci = C[i];
                for (k = j + 1; k <= J; k++) Hi[k] -= 2 * Ci[k - j - 1];
            }

            // Accumulate Q
            B = Array(J - j);
            for (i = j + 1; i <= J; i++) B[i - j - 1] = Q[i];
            C = tensor(v, dotVM(v, B));
            for (i = j + 1; i <= J; i++) {
                Qi = Q[i];
                Ci = C[i - j - 1];
                for (k = 0; k < m; k++) Qi[k] -= 2 * Ci[k];
            }
        }
    }
    throw new Error("numeric: eigenvalue iteration does not converge -- increase maxiter?");
}
