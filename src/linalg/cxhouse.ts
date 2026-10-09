/**
 * Complex Householder reflection, upper Hessenberg reduction, and single-shift QR.
 * Operates on CxMatrix types. Ported/adapted for complex matrices.
 */

import { identity, clone, rep } from "../utils";
import {
    type CxMatrix, type CxVector, type CxScalar,
    cxVectorNorm2, cxDotVVconj, cxVectorScale, cxVectorSub,
    cxGetBlock, cxTensor, cxDotMV, cxDotVM, cxDotMM,
    cxGet, cxSet, cxIdentity, cxTransjugate,
    cxScalarMul, cxScalarSub, cxScalarAdd, cxScalarAbs, cxScalarDiv,
    cxGetCol, cxSetCol,
} from "./cxmat";
import { epsilon } from "./house";

/**
 * Complex Householder reflection.
 *
 * Given a complex vector x, returns a normalized vector v such that
 * (I - 2*v*v^H)*x = alpha * e_1, where alpha = -cxSign(x[0])*||x||.
 */
export function cxHouse(x: CxVector): CxVector {
    const n = x[0].length;
    const norm = cxVectorNorm2(x);

    if (norm === 0) {
        // Zero vector — return a unit vector (identity reflection)
        const re = Array(n);
        for (let i = n - 1; i >= 0; i--) re[i] = 0;
        re[0] = 1;
        return [re, null];
    }

    // cxSign(x[0]) = x[0] / |x[0]|, or 1 if x[0] = 0
    const x0re = x[0][0];
    const x0im = x[1] !== null ? x[1][0] : 0;
    const x0abs = Math.sqrt(x0re * x0re + x0im * x0im);

    let signRe: number, signIm: number;
    if (x0abs > 0) {
        signRe = x0re / x0abs;
        signIm = x0im / x0abs;
    } else {
        signRe = 1;
        signIm = 0;
    }

    // alpha = -cxSign(x[0]) * ||x||
    const alphaRe = -signRe * norm;
    const alphaIm = -signIm * norm;

    // v = x - alpha * e_1
    const vre = Array(n);
    const vim = Array(n);
    for (let i = n - 1; i >= 0; i--) {
        vre[i] = x[0][i];
        vim[i] = x[1] !== null ? x[1][i] : 0;
    }
    vre[0] -= alphaRe;
    vim[0] -= alphaIm;

    // Normalize v
    const v: CxVector = [vre, vim];
    const vnorm = cxVectorNorm2(v);
    if (vnorm === 0) {
        vre[0] = 1;
        vim[0] = 0;
        return [vre, vim];
    }
    for (let i = n - 1; i >= 0; i--) {
        vre[i] /= vnorm;
        vim[i] /= vnorm;
    }

    return [vre, vim];
}

export type CxHessenbergResult = {
    H: CxMatrix;
    Q: CxMatrix;
};

/**
 * Reduce a complex square matrix to upper Hessenberg form.
 * Uses complex Householder reflections.
 *
 * Returns {H, Q} where Q is unitary and Q * A * Q^H = H.
 */
export function cxToUpperHessenberg(A: CxMatrix): CxHessenbergResult {
    const m = A[0].length;

    // Deep clone A
    const Are = clone(A[0]) as number[][];
    const Aim = A[1] !== null ? clone(A[1]) as number[][] : rep([m, m], 0) as number[][];
    const H: CxMatrix = [Are, Aim];

    const Q: CxMatrix = cxIdentity(m);

    for (let j = 0; j < m - 2; j++) {
        // Extract column below diagonal: x = H[j+1:m, j]
        const len = m - j - 1;
        const xre = Array(len);
        const xim = Array(len);
        for (let i = 0; i < len; i++) {
            xre[i] = Are[j + 1 + i][j];
            xim[i] = Aim[j + 1 + i][j];
        }

        const xnorm = cxVectorNorm2([xre, xim]);
        if (xnorm === 0) continue;

        const v = cxHouse([xre, xim]);
        const vre = v[0], vim = v[1]!;

        // Apply H_v from left: H[j+1:m, j:m] -= 2 * v * (v^H * H[j+1:m, j:m])
        const B = cxGetBlock(H, j + 1, j, m, m);
        // w = v^H * B (conjugated vector-matrix product)
        const vconj: CxVector = [vre, vim.map(x => -x)];
        const w = cxDotVM(vconj, B);
        // C = v * w (outer product, not conjugated on w)
        // We need v * w^T not v * w^H here, since w already includes the conjugation
        const cols = B[0][0].length;
        for (let i = 0; i < len; i++) {
            const vri = vre[i], vii = vim[i];
            for (let k = 0; k < cols; k++) {
                const wk_re = w[0][k], wk_im = w[1] !== null ? w[1][k] : 0;
                const pre = vri * wk_re - vii * wk_im;
                const pim = vri * wk_im + vii * wk_re;
                Are[j + 1 + i][j + k] -= 2 * pre;
                Aim[j + 1 + i][j + k] -= 2 * pim;
            }
        }

        // Apply H_v from right: H[0:m, j+1:m] -= 2 * (H[0:m, j+1:m] * v) * v^H
        const B2 = cxGetBlock(H, 0, j + 1, m, m);
        const u = cxDotMV(B2, v); // u = B2 * v
        // Subtract 2 * u * v^H
        for (let i = 0; i < m; i++) {
            const uri = u[0][i], uii = u[1] !== null ? u[1][i] : 0;
            for (let k = 0; k < len; k++) {
                // u_i * conj(v_k) = (ur+ui*i)(vr-vi*i) = (ur*vr+ui*vi) + (ui*vr-ur*vi)i
                const pre = uri * vre[k] + uii * vim[k];
                const pim = uii * vre[k] - uri * vim[k];
                Are[i][j + 1 + k] -= 2 * pre;
                Aim[i][j + 1 + k] -= 2 * pim;
            }
        }

        // Accumulate Q: Q[j+1:m, :] -= 2 * v * (v^H * Q[j+1:m, :])
        const Qre = Q[0] as number[][];
        const Qim = Q[1] !== null ? Q[1] as number[][] : (() => {
            const z = rep([m, m], 0) as number[][];
            (Q as any)[1] = z;
            return z;
        })();
        // w2 = v^H * Q[j+1:m, :]
        const QB = cxGetBlock(Q, j + 1, 0, m, m);
        const w2 = cxDotVM(vconj, QB);
        for (let i = 0; i < len; i++) {
            const vri = vre[i], vii = vim[i];
            for (let k = 0; k < m; k++) {
                const wk_re = w2[0][k], wk_im = w2[1] !== null ? w2[1][k] : 0;
                const pre = vri * wk_re - vii * wk_im;
                const pim = vri * wk_im + vii * wk_re;
                Qre[j + 1 + i][k] -= 2 * pre;
                Qim[j + 1 + i][k] -= 2 * pim;
            }
        }
    }

    return { H, Q };
}

export type CxSchurResult = {
    T: CxMatrix;
    Q: CxMatrix;
};

/**
 * Wilkinson shift: eigenvalue of 2×2 bottom-right block closest to H[n-1][n-1].
 */
function wilkinsonShift(a: CxScalar, b: CxScalar, c: CxScalar, d: CxScalar): CxScalar {
    // Eigenvalues of [[a,b],[c,d]]:
    // λ = ((a+d) ± sqrt((a-d)^2 + 4bc)) / 2
    const sum = cxScalarAdd(a, d);
    const diff = cxScalarSub(a, d);
    const diff2 = cxScalarMul(diff, diff);
    const bc4 = cxScalarMul([4, 0], cxScalarMul(b, c));
    const disc = cxScalarAdd(diff2, bc4);

    // Complex sqrt of disc
    const r = cxScalarAbs(disc);
    let sqrtRe: number, sqrtIm: number;
    if (r === 0) {
        sqrtRe = 0;
        sqrtIm = 0;
    } else {
        sqrtRe = Math.sqrt((r + disc[0]) / 2);
        sqrtIm = disc[1] >= 0 ?
            Math.sqrt((r - disc[0]) / 2) :
            -Math.sqrt((r - disc[0]) / 2);
    }

    const lam1: CxScalar = [(sum[0] + sqrtRe) / 2, (sum[1] + sqrtIm) / 2];
    const lam2: CxScalar = [(sum[0] - sqrtRe) / 2, (sum[1] - sqrtIm) / 2];

    // Return the one closest to d
    const d1 = cxScalarAbs(cxScalarSub(lam1, d));
    const d2 = cxScalarAbs(cxScalarSub(lam2, d));
    return d1 <= d2 ? lam1 : lam2;
}

/**
 * Complex single-shift QR iteration on an upper Hessenberg matrix.
 *
 * Returns {T, Q} where T is upper triangular (Schur form) and Q is unitary.
 * T = Q * H * Q^H.
 */
export function cxQR(H: CxMatrix, maxiter: number = 10000): CxSchurResult {
    // Deep clone H
    const m = H[0].length;
    const Hre = clone(H[0]) as number[][];
    const Him = H[1] !== null ? clone(H[1]) as number[][] : rep([m, m], 0) as number[][];
    const T: CxMatrix = [Hre, Him];
    const Q: CxMatrix = cxIdentity(m);
    const Qre = Q[0] as number[][];
    let Qim = Q[1] as number[][] | null;

    if (m <= 1) {
        return { T, Q };
    }

    for (let iter = 0; iter < maxiter; iter++) {
        // Check for deflation
        for (let j = 0; j < m - 1; j++) {
            const subRe = Hre[j + 1][j];
            const subIm = Him[j + 1][j];
            const subAbs = Math.sqrt(subRe * subRe + subIm * subIm);
            const diagAbs = Math.sqrt(Hre[j][j] ** 2 + Him[j][j] ** 2) +
                            Math.sqrt(Hre[j + 1][j + 1] ** 2 + Him[j + 1][j + 1] ** 2);
            if (subAbs < epsilon * diagAbs) {
                // Deflate: set subdiagonal to zero and recurse
                Hre[j + 1][j] = 0;
                Him[j + 1][j] = 0;

                const QH1 = cxQR(cxGetBlock(T, 0, 0, j + 1, j + 1), maxiter);
                const QH2 = cxQR(cxGetBlock(T, j + 1, j + 1, m, m), maxiter);

                // Transform off-diagonal block: T[0:j+1, j+1:m] = QH1.Q * T[0:j+1, j+1:m] * QH2.Q^H
                const offdiag = cxGetBlock(T, 0, j + 1, j + 1, m);
                const newOffdiag = cxDotMM(cxDotMM(QH1.Q, offdiag), cxTransjugate(QH2.Q));
                for (let r = 0; r <= j; r++)
                    for (let c = 0; c < m - j - 1; c++) {
                        Hre[r][j + 1 + c] = newOffdiag[0][r][c];
                        Him[r][j + 1 + c] = newOffdiag[1] !== null ? newOffdiag[1][r][c] : 0;
                    }

                // Copy Schur forms back into diagonal blocks
                for (let r = 0; r <= j; r++)
                    for (let c = 0; c <= j; c++) {
                        Hre[r][c] = QH1.T[0][r][c];
                        Him[r][c] = QH1.T[1] !== null ? QH1.T[1][r][c] : 0;
                    }
                for (let r = 0; r < m - j - 1; r++)
                    for (let c = 0; c < m - j - 1; c++) {
                        Hre[j + 1 + r][j + 1 + c] = QH2.T[0][r][c];
                        Him[j + 1 + r][j + 1 + c] = QH2.T[1] !== null ? QH2.T[1][r][c] : 0;
                    }

                // Accumulate Q: Q_rows[0:j+1] = QH1.Q * Q_rows[0:j+1]
                const B1 = cxGetBlock(Q, 0, 0, j + 1, m);
                const C1 = cxDotMM(QH1.Q, B1);
                for (let r = 0; r <= j; r++) {
                    for (let c = 0; c < m; c++) {
                        Qre[r][c] = C1[0][r][c];
                        if (C1[1] !== null) {
                            if (Qim === null) { Qim = rep([m, m], 0) as number[][]; (Q as any)[1] = Qim; }
                            Qim[r][c] = C1[1][r][c];
                        }
                    }
                }
                const B2 = cxGetBlock(Q, j + 1, 0, m, m);
                const C2 = cxDotMM(QH2.Q, B2);
                for (let r = 0; r < m - j - 1; r++) {
                    for (let c = 0; c < m; c++) {
                        Qre[j + 1 + r][c] = C2[0][r][c];
                        if (C2[1] !== null) {
                            if (Qim === null) { Qim = rep([m, m], 0) as number[][]; (Q as any)[1] = Qim; }
                            Qim[j + 1 + r][c] = C2[1][r][c];
                        }
                    }
                }

                return { T, Q };
            }
        }

        // Wilkinson shift from bottom-right 2×2
        const a = cxGet(T, m - 2, m - 2);
        const b = cxGet(T, m - 2, m - 1);
        const c = cxGet(T, m - 1, m - 2);
        const d = cxGet(T, m - 1, m - 1);
        const mu = wilkinsonShift(a, b, c, d);

        // Apply shifted QR step: chase bulge
        // First column of (H - mu*I)
        let x0re = Hre[0][0] - mu[0];
        let x0im = Him[0][0] - mu[1];
        let x1re = Hre[1][0];
        let x1im = Him[1][0];

        for (let k = 0; k < m - 1; k++) {
            // 2×2 Householder to zero out x1
            const xnorm = Math.sqrt(x0re * x0re + x0im * x0im + x1re * x1re + x1im * x1im);
            if (xnorm === 0) {
                // Advance to next position
                if (k + 2 < m) {
                    x0re = Hre[k + 1][k + 1] - mu[0];
                    x0im = Him[k + 1][k + 1] - mu[1];
                    x1re = Hre[k + 2][k + 1];
                    x1im = Him[k + 2][k + 1];
                }
                continue;
            }

            // Compute 2-element Householder vector v
            const x0abs = Math.sqrt(x0re * x0re + x0im * x0im);
            let sre: number, sim: number;
            if (x0abs > 0) {
                sre = x0re / x0abs;
                sim = x0im / x0abs;
            } else {
                sre = 1;
                sim = 0;
            }
            const alphaRe = -sre * xnorm;
            const alphaIm = -sim * xnorm;
            let v0re = x0re - alphaRe;
            let v0im = x0im - alphaIm;
            let v1re = x1re;
            let v1im = x1im;
            const vnorm = Math.sqrt(v0re * v0re + v0im * v0im + v1re * v1re + v1im * v1im);
            if (vnorm === 0) {
                if (k + 2 < m) {
                    x0re = Hre[k + 1][k + 1] - mu[0];
                    x0im = Him[k + 1][k + 1] - mu[1];
                    x1re = Hre[k + 2][k + 1];
                    x1im = Him[k + 2][k + 1];
                }
                continue;
            }
            v0re /= vnorm; v0im /= vnorm;
            v1re /= vnorm; v1im /= vnorm;

            // Apply from left: H[k:k+2, :] -= 2 * v * (v^H * H[k:k+2, :])
            for (let j = 0; j < m; j++) {
                // dot = conj(v0)*H[k,j] + conj(v1)*H[k+1,j]
                const h0r = Hre[k][j], h0i = Him[k][j];
                const h1r = Hre[k + 1][j], h1i = Him[k + 1][j];
                const dr = (v0re * h0r + v0im * h0i) + (v1re * h1r + v1im * h1i);
                const di = (v0re * h0i - v0im * h0r) + (v1re * h1i - v1im * h1r);
                // H[k,j] -= 2 * v0 * dot
                Hre[k][j] -= 2 * (v0re * dr - v0im * di);
                Him[k][j] -= 2 * (v0re * di + v0im * dr);
                // H[k+1,j] -= 2 * v1 * dot
                Hre[k + 1][j] -= 2 * (v1re * dr - v1im * di);
                Him[k + 1][j] -= 2 * (v1re * di + v1im * dr);
            }

            // Apply from right: H[:, k:k+2] -= 2 * (H[:, k:k+2] * v) * v^H
            for (let i = 0; i < m; i++) {
                // dot = H[i,k]*v0 + H[i,k+1]*v1
                const h0r = Hre[i][k], h0i = Him[i][k];
                const h1r = Hre[i][k + 1], h1i = Him[i][k + 1];
                const dr = (h0r * v0re - h0i * v0im) + (h1r * v1re - h1i * v1im);
                const di = (h0r * v0im + h0i * v0re) + (h1r * v1im + h1i * v1re);
                // H[i,k] -= 2 * dot * conj(v0)
                Hre[i][k] -= 2 * (dr * v0re + di * v0im);
                Him[i][k] -= 2 * (di * v0re - dr * v0im);
                // H[i,k+1] -= 2 * dot * conj(v1)
                Hre[i][k + 1] -= 2 * (dr * v1re + di * v1im);
                Him[i][k + 1] -= 2 * (di * v1re - dr * v1im);
            }

            // Accumulate Q: Q[k:k+2, :] -= 2 * v * (v^H * Q[k:k+2, :])
            if (Qim === null) { Qim = rep([m, m], 0) as number[][]; (Q as any)[1] = Qim; }
            for (let j = 0; j < m; j++) {
                const q0r = Qre[k][j], q0i = Qim[k][j];
                const q1r = Qre[k + 1][j], q1i = Qim[k + 1][j];
                const dr = (v0re * q0r + v0im * q0i) + (v1re * q1r + v1im * q1i);
                const di = (v0re * q0i - v0im * q0r) + (v1re * q1i - v1im * q1r);
                Qre[k][j] -= 2 * (v0re * dr - v0im * di);
                Qim[k][j] -= 2 * (v0re * di + v0im * dr);
                Qre[k + 1][j] -= 2 * (v1re * dr - v1im * di);
                Qim[k + 1][j] -= 2 * (v1re * di + v1im * dr);
            }

            // Set up next bulge chase element
            if (k + 2 < m) {
                x0re = Hre[k + 1][k];
                x0im = Him[k + 1][k];
                x1re = Hre[k + 2][k];
                x1im = Him[k + 2][k];
            }
        }
    }

    throw new Error("numeric: complex eigenvalue iteration does not converge -- increase maxiter?");
}
