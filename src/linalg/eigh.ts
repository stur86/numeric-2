/**
 * Symmetric (real) and Hermitian (complex) eigenvalue problems:
 *
 *   eigh(A, k?)                 A = E·diag(λ)·Eᴴ
 *   eighTridiagonal(d, e, k?)   the same for a real symmetric tridiagonal matrix
 *   eighGeneralized(H, S, k?)   H·E = S·E·diag(λ), S positive definite
 *
 * Method (as in LAPACK): Householder reduction to a real symmetric tridiagonal
 * T = Qᴴ·A·Q (complex Householder vectors for Hermitian input, chosen so that
 * T comes out real). All eigenpairs of T come from the implicit QL algorithm
 * with Wilkinson shifts; the lowest k only, from bisection on Sturm sequences
 * followed by inverse iteration (re-orthogonalized within clusters of close
 * eigenvalues), at O(n·k) cost instead of O(n²). Eigenvectors of A are Q·z.
 *
 * Eigenvalues come out in ascending order; eigenvectors are the columns of E,
 * orthonormal (Eᴴ·S·E = I for the generalized problem). As in NumPy, only the
 * lower triangle of A (and of H and S) is read.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import { type MatrixLike, type VectorLike, assertSquare, toRawVector } from "./wrap";
import { epsilon, negligible } from "./house";

export type EighResult = {
    /** Eigenvalues, ascending (always real). */
    lambda: Vector;
    /** Eigenvectors as columns (n×k); complex if the input was. */
    E: Matrix;
};

/**
 * Internal work arrays are Float64Arrays: one element representation, so the
 * hot loops stay monomorphic whichever routine produced the rows (with plain
 * arrays, JIT shape changes made some paths over ten times slower).
 */
type F64 = Float64Array;
type Rows = ArrayLike<number>[];

/** Smallest positive normal double. */
const SAFE_MIN = 2.2250738585072014e-308;

type Tridiagonal = {
    /** Diagonal of T (length n). */
    d: F64;
    /** Subdiagonal of T (length n − 1). */
    e: F64;
    /** Householder vectors (v[0] = 1) and factors τ (complex: re, im). */
    vRe: F64[];
    vIm: F64[] | null;
    tauRe: F64;
    tauIm: F64 | null;
};

// ── Householder tridiagonalization ──

/** Full copy of a real symmetric matrix from its lower triangle. */
function symmetricFromLower(A: Rows): F64[] {
    const n = A.length;
    const B: F64[] = Array(n);
    for (let i = 0; i < n; i++) {
        const row = new Float64Array(n);
        const Ai = A[i];
        for (let j = 0; j <= i; j++) row[j] = Ai[j];
        B[i] = row;
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) B[i][j] = B[j][i];
    return B;
}

/** Copy of the lower triangle (rows of length i + 1). */
function lowerCopy(A: Rows): F64[] {
    const n = A.length;
    const B: F64[] = Array(n);
    for (let i = 0; i < n; i++) {
        const row = new Float64Array(i + 1);
        const Ai = A[i];
        for (let j = 0; j <= i; j++) row[j] = Ai[j];
        B[i] = row;
    }
    return B;
}

/**
 * Real symmetric A → T = Qᵀ·A·Q, with Q = H₀·H₁·…·H_{n−2} and
 * H_j = I − τ_j·v·vᵀ acting on indices j+1…n−1. Works on the lower triangle
 * only (LAPACK's dsytd2): 4/3·n³ flops.
 */
function tridiagonalizeReal(A: Rows): Tridiagonal {
    const n = A.length;
    const B = lowerCopy(A);
    const d = new Float64Array(n);
    const len = Math.max(n - 1, 0);
    const e = new Float64Array(len);
    const vRe: F64[] = Array(len);
    const tauRe = new Float64Array(len);
    const p = new Float64Array(n);

    for (let j = 0; j < n - 1; j++) {
        const m = n - j - 1, o = j + 1;
        d[j] = B[j][j];
        // x = column j below the diagonal
        const alpha = B[o][j];
        let xnorm = 0;
        for (let i = 1; i < m; i++) xnorm = Math.hypot(xnorm, B[o + i][j]);
        const v = new Float64Array(m);
        v[0] = 1;
        if (xnorm === 0) {
            e[j] = alpha;
            tauRe[j] = 0;
            for (let i = 1; i < m; i++) v[i] = 0;
            vRe[j] = v;
            continue;
        }
        const beta = alpha >= 0 ? -Math.hypot(alpha, xnorm) : Math.hypot(alpha, xnorm);
        const tau = (beta - alpha) / beta;
        const scale = 1 / (alpha - beta);
        for (let i = 1; i < m; i++) v[i] = B[o + i][j] * scale;
        e[j] = beta;
        tauRe[j] = tau;
        vRe[j] = v;

        // Trailing block C = B[o:, o:] ← H·C·H:  p = τ·C·v,  w = p − ½τ(pᵀv)·v,  C −= v·wᵀ + w·vᵀ
        // (C·v from the lower triangle: each stored C_ik, k < i, contributes to p_i and p_k)
        for (let i = 0; i < m; i++) p[i] = 0;
        for (let i = 0; i < m; i++) {
            const Ci = B[o + i];
            const vi = v[i];
            let s = 0;
            for (let k = 0; k < i; k++) {
                const c = Ci[o + k];
                s += c * v[k];
                p[k] += c * vi;
            }
            p[i] += s + Ci[o + i] * vi;
        }
        let pv = 0;
        for (let i = 0; i < m; i++) {
            p[i] *= tau;
            pv += p[i] * v[i];
        }
        const c = -0.5 * tau * pv;
        for (let i = 0; i < m; i++) p[i] += c * v[i];
        for (let i = 0; i < m; i++) {
            const Ci = B[o + i];
            const vi = v[i], wi = p[i];
            for (let k = 0; k <= i; k++) Ci[o + k] -= vi * p[k] + wi * v[k];
        }
    }
    if (n > 0) d[n - 1] = B[n - 1][n - 1];
    return { d, e, vRe, vIm: null, tauRe, tauIm: null };
}

/**
 * Hermitian A (re, im) → real tridiagonal T = Qᴴ·A·Q, with Q = H₀·H₁·…·H_{n−2},
 * H_j = I − τ_j·v·vᴴ (LAPACK's zlarfg/zhetd2: each reflector also makes the
 * subdiagonal entry real). Lower triangle only.
 */
function tridiagonalizeComplex(Are: Rows, Aim: Rows): Tridiagonal {
    const n = Are.length;
    const Br = lowerCopy(Are);
    const Bi = lowerCopy(Aim);
    for (let i = 0; i < n; i++) Bi[i][i] = 0;

    const d = new Float64Array(n);
    const len = Math.max(n - 1, 0);
    const e = new Float64Array(len);
    const vRe: F64[] = Array(len), vIm: F64[] = Array(len);
    const tauRe = new Float64Array(len), tauIm = new Float64Array(len);
    const pr = new Float64Array(n), pi = new Float64Array(n);

    for (let j = 0; j < n - 1; j++) {
        const m = n - j - 1, o = j + 1;
        d[j] = Br[j][j];
        // x = column j below the diagonal
        const ar = Br[o][j], ai = Bi[o][j];
        let xnorm = 0;
        for (let i = 1; i < m; i++) xnorm = Math.hypot(xnorm, Br[o + i][j], Bi[o + i][j]);
        const vr = new Float64Array(m), vi = new Float64Array(m);
        vr[0] = 1;
        vi[0] = 0;
        if (xnorm === 0 && ai === 0) {
            e[j] = ar;
            tauRe[j] = 0;
            tauIm[j] = 0;
            for (let i = 1; i < m; i++) vr[i] = vi[i] = 0;
            vRe[j] = vr;
            vIm[j] = vi;
            continue;
        }
        const norm = Math.hypot(ar, ai, xnorm);
        const beta = ar >= 0 ? -norm : norm;
        const tr = (beta - ar) / beta, ti = -ai / beta;
        // v[1:] = x[1:] / (α − β)
        const sr = ar - beta, si = ai;
        const sd = sr * sr + si * si;
        for (let i = 1; i < m; i++) {
            const xr = Br[o + i][j], xi = Bi[o + i][j];
            vr[i] = (xr * sr + xi * si) / sd;
            vi[i] = (xi * sr - xr * si) / sd;
        }
        e[j] = beta;
        tauRe[j] = tr;
        tauIm[j] = ti;
        vRe[j] = vr;
        vIm[j] = vi;

        // Trailing block C ← Hᴴ·C·H:  p = τ·C·v,  w = p − ½τ(pᴴv)·v,  C −= v·wᴴ + w·vᴴ
        // (C·v from the lower triangle: C_ik for k < i, and C_ki = conj(C_ik))
        for (let i = 0; i < m; i++) pr[i] = pi[i] = 0;
        for (let i = 0; i < m; i++) {
            const Cr = Br[o + i], Ci = Bi[o + i];
            const v_r = vr[i], v_i = vi[i];
            let s = 0, t = 0;
            for (let k = 0; k < i; k++) {
                const cr = Cr[o + k], ci = Ci[o + k];
                s += cr * vr[k] - ci * vi[k];
                t += cr * vi[k] + ci * vr[k];
                pr[k] += cr * v_r + ci * v_i;
                pi[k] += cr * v_i - ci * v_r;
            }
            const cd = Cr[o + i];
            pr[i] += s + cd * v_r;
            pi[i] += t + cd * v_i;
        }
        let phvR = 0, phvI = 0;
        for (let i = 0; i < m; i++) {
            const s = pr[i], t = pi[i];
            pr[i] = tr * s - ti * t;
            pi[i] = tr * t + ti * s;
            // conj(p_i)·v_i
            phvR += pr[i] * vr[i] + pi[i] * vi[i];
            phvI += pr[i] * vi[i] - pi[i] * vr[i];
        }
        const cR = -0.5 * (tr * phvR - ti * phvI), cI = -0.5 * (tr * phvI + ti * phvR);
        for (let i = 0; i < m; i++) {
            const r = pr[i], s = pi[i];
            pr[i] = r + cR * vr[i] - cI * vi[i];
            pi[i] = s + cR * vi[i] + cI * vr[i];
        }
        for (let i = 0; i < m; i++) {
            const Cr = Br[o + i], Ci = Bi[o + i];
            const v_r = vr[i], v_i = vi[i], w_r = pr[i], w_i = pi[i];
            for (let k = 0; k <= i; k++) {
                // v_i·conj(w_k) + w_i·conj(v_k)
                Cr[o + k] -= v_r * pr[k] + v_i * pi[k] + w_r * vr[k] + w_i * vi[k];
                Ci[o + k] -= v_i * pr[k] - v_r * pi[k] + w_i * vr[k] - w_r * vi[k];
            }
        }
    }
    if (n > 0) d[n - 1] = Br[n - 1][n - 1];
    return { d, e, vRe, vIm, tauRe, tauIm };
}

/**
 * X ← Q·X for a real n×n X given as rows, with Q = H₀·H₁·…·H_{n−2}; returns
 * the real and imaginary parts (imaginary allocated for complex Q). With
 * `fromIdentity`, X is the identity and Q itself is formed (LAPACK's
 * dorgtr/zungtr: 4/3·n³ flops, since columns ≤ j are untouched by H_j).
 */
function applyQ(t: Tridiagonal, Qr: F64[], fromIdentity: boolean): [F64[], F64[] | null] {
    const n = t.d.length;
    const { vRe, vIm, tauRe, tauIm } = t;
    const cx = vIm !== null && tauIm !== null;
    const Qi: F64[] | null = cx ? Array(n) : null;
    if (Qi !== null) for (let i = 0; i < n; i++) Qi[i] = new Float64Array(n);
    const sr = new Float64Array(n), si = new Float64Array(n);
    // Q·X = H₀·(H₁·(…·(H_{n−2}·X)))
    for (let j = n - 2; j >= 0; j--) {
        const tr = tauRe[j], ti = cx ? tauIm![j] : 0;
        if (tr === 0 && ti === 0) continue;
        const o = j + 1, m = n - o;
        const c0 = fromIdentity ? o : 0;
        const vr = vRe[j], vi = cx ? vIm![j] : null;
        // s = τ·(vᴴ·X[o:, c0:]) (row vector), then X[o:, c0:] −= v·s
        for (let c = c0; c < n; c++) sr[c] = si[c] = 0;
        for (let i = 0; i < m; i++) {
            const qr = Qr[o + i];
            const a = vr[i];
            if (Qi === null) {
                for (let c = c0; c < n; c++) sr[c] += a * qr[c];
            } else {
                const qi = Qi[o + i], b = vi![i];
                // conj(v_i)·X[i][c]
                for (let c = c0; c < n; c++) {
                    sr[c] += a * qr[c] + b * qi[c];
                    si[c] += a * qi[c] - b * qr[c];
                }
            }
        }
        for (let c = c0; c < n; c++) {
            const a = sr[c], b = si[c];
            sr[c] = tr * a - ti * b;
            si[c] = tr * b + ti * a;
        }
        for (let i = 0; i < m; i++) {
            const qr = Qr[o + i];
            const a = vr[i];
            if (Qi === null) {
                for (let c = c0; c < n; c++) qr[c] -= a * sr[c];
            } else {
                const qi = Qi[o + i], b = vi![i];
                for (let c = c0; c < n; c++) {
                    qr[c] -= a * sr[c] - b * si[c];
                    qi[c] -= a * si[c] + b * sr[c];
                }
            }
        }
    }
    return [Qr, Qi];
}

/**
 * Eigenvectors of A from those of T: x = Q·z = H₀·(H₁·(…·(H_{n−2}·z))).
 * z holds the vectors as rows (real); returns the rows of x (re, im|null).
 */
function backTransform(t: Tridiagonal, Z: F64[]): [F64[], F64[] | null] {
    const n = t.d.length;
    const { vRe, vIm, tauRe, tauIm } = t;
    if (vIm === null || tauIm === null) {
        for (const z of Z) {
            for (let j = n - 2; j >= 0; j--) {
                const tau = tauRe[j];
                if (tau === 0) continue;
                const v = vRe[j], m = n - j - 1;
                let s = 0;
                for (let i = 0; i < m; i++) s += v[i] * z[j + 1 + i];
                s *= tau;
                for (let i = 0; i < m; i++) z[j + 1 + i] -= s * v[i];
            }
        }
        return [Z, null];
    }
    const Xi: F64[] = Array(Z.length);
    for (let r = 0; r < Z.length; r++) {
        const zr = Z[r];
        const zi = new Float64Array(n);
        for (let j = n - 2; j >= 0; j--) {
            const tr = tauRe[j], ti = tauIm[j];
            if (tr === 0 && ti === 0) continue;
            const vr = vRe[j], vi = vIm[j], m = n - j - 1;
            // s = τ·(vᴴ·z)
            let a = 0, b = 0;
            for (let i = 0; i < m; i++) {
                const xr = zr[j + 1 + i], xi = zi[j + 1 + i];
                a += vr[i] * xr + vi[i] * xi;
                b += vr[i] * xi - vi[i] * xr;
            }
            const sr = tr * a - ti * b, si = tr * b + ti * a;
            for (let i = 0; i < m; i++) {
                zr[j + 1 + i] -= sr * vr[i] - si * vi[i];
                zi[j + 1 + i] -= sr * vi[i] + si * vr[i];
            }
        }
        Xi[r] = zi;
    }
    return [Z, Xi];
}

// ── Tridiagonal eigensolvers ──

/** max |T_ij| summed by row (∞-norm) of the tridiagonal (d, e) on [s, t). */
function tridiagNorm(d: F64, e: F64, s: number, t: number): number {
    let norm = 0;
    for (let i = s; i < t; i++) {
        const r = Math.abs(d[i]) + (i > s ? Math.abs(e[i - 1]) : 0) + (i < t - 1 ? Math.abs(e[i]) : 0);
        if (r > norm) norm = r;
    }
    return norm;
}

/**
 * All eigenpairs of the symmetric tridiagonal (d, e): implicit QL with
 * Wilkinson shifts (EISPACK tql2). The rotations act on the columns of X
 * (the identity, or Q to get the eigenvectors of A = Q·T·Qᵀ). Each sweep's
 * rotations are saved and then applied as one chain along the rows of X,
 * four rows at a time so the four dependency chains overlap: this streams
 * each row once per sweep instead of two rows per rotation. Returns the
 * eigenvalues (unsorted) and X, whose columns are the eigenvectors.
 */
function tridiagQL(d0: F64, e0: F64, maxiter: number, X0?: F64[]): { d: F64; X: F64[] } {
    const n = d0.length;
    const d = d0.slice();
    const e = new Float64Array(n);
    e.set(e0);
    const normT = tridiagNorm(d0, e0, 0, n);
    const X = X0 ?? identityRows(n);
    const cs = new Float64Array(n), sn = new Float64Array(n);
    // Columns lo..hi of every row of X ← the chain of saved rotations hi−1 … lo
    const applyChain = (rows: F64[], lo: number, hi: number) => {
        let k = 0;
        // Four rows at a time: independent dependency chains
        for (; k + 3 < n; k += 4) {
            const x0 = rows[k], x1 = rows[k + 1], x2 = rows[k + 2], x3 = rows[k + 3];
            let u0 = x0[hi], u1 = x1[hi], u2 = x2[hi], u3 = x3[hi];
            for (let i = hi - 1; i >= lo; i--) {
                const c = cs[i], s = sn[i];
                const a0 = x0[i], a1 = x1[i], a2 = x2[i], a3 = x3[i];
                x0[i + 1] = s * a0 + c * u0; u0 = c * a0 - s * u0;
                x1[i + 1] = s * a1 + c * u1; u1 = c * a1 - s * u1;
                x2[i + 1] = s * a2 + c * u2; u2 = c * a2 - s * u2;
                x3[i + 1] = s * a3 + c * u3; u3 = c * a3 - s * u3;
            }
            x0[lo] = u0; x1[lo] = u1; x2[lo] = u2; x3[lo] = u3;
        }
        for (; k < n; k++) {
            const x = rows[k];
            let up = x[hi];
            for (let i = hi - 1; i >= lo; i--) {
                const xi = x[i], c = cs[i], s = sn[i];
                x[i + 1] = s * xi + c * up;
                up = c * xi - s * up;
            }
            x[lo] = up;
        }
    };

    for (let l = 0; l < n; l++) {
        let iter = 0;
        for (;;) {
            let m = l;
            for (; m < n - 1; m++) {
                if (negligible(Math.abs(e[m]), Math.abs(d[m]) + Math.abs(d[m + 1]), normT)) break;
            }
            if (m === l) break;
            if (iter++ >= maxiter) throw new Error("eigh: no convergence");
            // Wilkinson shift from the leading 2×2 block
            let g = (d[l + 1] - d[l]) / (2 * e[l]);
            let r = Math.hypot(g, 1);
            g = d[m] - d[l] + e[l] / (g + (g >= 0 ? r : -r));
            let s = 1, c = 1, p = 0;
            let i = m - 1;
            for (; i >= l; i--) {
                const f = s * e[i];
                const b = c * e[i];
                r = Math.hypot(f, g);
                e[i + 1] = r;
                if (r === 0) {
                    // Underflow: deflate and restart
                    d[i + 1] -= p;
                    e[m] = 0;
                    break;
                }
                s = f / r;
                c = g / r;
                g = d[i + 1] - p;
                r = (d[i] - g) * s + 2 * c * b;
                p = s * r;
                d[i + 1] = g + p;
                g = c * r - b;
                cs[i] = c;
                sn[i] = s;
            }
            // Rotations i+1 … m−1 were completed (all of l … m−1 unless the sweep broke off)
            const lo = r === 0 && i >= l ? i + 1 : l;
            if (lo < m) applyChain(X, lo, m);
            if (r === 0 && i >= l) continue;
            d[l] -= p;
            e[l] = g;
            e[m] = 0;
        }
    }

    return { d, X };
}

function identityRows(n: number): F64[] {
    const X: F64[] = Array(n);
    for (let i = 0; i < n; i++) {
        const row = new Float64Array(n);
        row[i] = 1;
        X[i] = row;
    }
    return X;
}

/** Sort eigenvalues ascending and the matching columns of (Xr, Xi), into plain arrays. */
function sortColumns(d: F64, Xr: F64[], Xi: F64[] | null): { lambda: number[]; Er: number[][]; Ei: number[][] | null } {
    const order = Array.from(d, (_, i) => i).sort((a, b) => d[a] - d[b]);
    const permute = (rows: F64[]) => rows.map((x) => order.map((j) => x[j]));
    return { lambda: order.map((i) => d[i]), Er: permute(Xr), Ei: Xi === null ? null : permute(Xi) };
}

/** Number of eigenvalues of the tridiagonal (d, e) on [s, t) that are < x (Sturm count). */
function sturmCount(d: F64, e2: F64, s: number, t: number, x: number, pivmin: number): number {
    let count = 0;
    let q = d[s] - x;
    if (Math.abs(q) < pivmin) q = -pivmin;
    if (q < 0) count++;
    for (let i = s + 1; i < t; i++) {
        q = d[i] - x - e2[i - 1] / q;
        if (Math.abs(q) < pivmin) q = -pivmin;
        if (q < 0) count++;
    }
    return count;
}

/** The r lowest eigenvalues of the unreduced block [s, t) by bisection, ascending. */
function bisectLowest(d: F64, e: F64, e2: F64, s: number, t: number, r: number, pivmin: number): number[] {
    const m = t - s;
    // Gershgorin interval
    let lo = Infinity, hi = -Infinity;
    for (let i = s; i < t; i++) {
        const rad = (i > s ? Math.abs(e[i - 1]) : 0) + (i < t - 1 ? Math.abs(e[i]) : 0);
        lo = Math.min(lo, d[i] - rad);
        hi = Math.max(hi, d[i] + rad);
    }
    const tnorm = Math.max(Math.abs(lo), Math.abs(hi));
    const fudge = 2 * m * epsilon * tnorm + 4 * pivmin;
    lo -= fudge;
    hi += fudge;

    const out: number[] = Array(r);
    let floor = lo;
    for (let idx = 0; idx < r; idx++) {
        let a = floor, b = hi;
        for (;;) {
            const tol = 2 * epsilon * Math.max(Math.abs(a), Math.abs(b)) + pivmin;
            if (b - a <= tol) break;
            const mid = 0.5 * (a + b);
            if (mid <= a || mid >= b) break;
            if (sturmCount(d, e2, s, t, mid, pivmin) > idx) b = mid;
            else a = mid;
        }
        out[idx] = 0.5 * (a + b);
        // The next eigenvalue is not below this one's bracket
        floor = a;
    }
    return out;
}

/** Deterministic uniform(−1, 1) start vectors for inverse iteration (xorshift32). */
function startVector(m: number, seed: number): F64 {
    let x = (seed * 2654435761 + 12345) >>> 0 || 1;
    const v = new Float64Array(m);
    for (let i = 0; i < m; i++) {
        x ^= x << 13; x >>>= 0;
        x ^= x >>> 17;
        x ^= x << 5; x >>>= 0;
        v[i] = (x / 4294967296) * 2 - 1;
    }
    return v;
}

/**
 * Eigenvectors of the unreduced block [s, t) for its eigenvalues `lams`
 * (ascending) by inverse iteration, as in LAPACK's dstein: LU of T − λI with
 * partial pivoting, vectors of close eigenvalues (gap ≤ 10⁻³‖T‖)
 * re-orthogonalized against each other.
 */
function inverseIteration(d: F64, e: F64, s: number, t: number, lams: number[]): F64[] {
    const m = t - s;
    if (m === 1) return lams.map(() => Float64Array.of(1));
    const normT = tridiagNorm(d, e, s, t);
    const ortol = 1e-3 * normT;
    const tiny = Math.max(epsilon * normT, SAFE_MIN);
    const dtpcrt = Math.sqrt(0.1 / m);
    const vecs: F64[] = [];

    const u0 = new Float64Array(m), u1 = new Float64Array(m), u2 = new Float64Array(m);
    const l = new Float64Array(m);
    const piv: boolean[] = Array(m);

    let cluster = 0;
    let prev = -Infinity;
    for (let jj = 0; jj < lams.length; jj++) {
        let lam = lams[jj];
        if (jj > 0) {
            if (lam - prev > ortol) cluster = jj;
            // Separate (numerically) equal eigenvalues so the factorizations differ
            const pertol = 10 * Math.abs(epsilon * lam) + tiny;
            if (lam - prev < pertol) lam = prev + pertol;
        }
        prev = lam;

        // LU with partial pivoting of the tridiagonal T − λI (rows i: u0 diag, u1, u2 super-diagonals)
        for (let i = 0; i < m; i++) {
            u0[i] = d[s + i] - lam;
            u1[i] = i < m - 1 ? e[s + i] : 0;
            u2[i] = 0;
        }
        for (let i = 0; i < m - 1; i++) {
            const sub = e[s + i];
            if (Math.abs(u0[i]) >= Math.abs(sub)) {
                piv[i] = false;
                const mult = u0[i] === 0 ? 0 : sub / u0[i];
                l[i] = mult;
                u0[i + 1] -= mult * u1[i];
            } else {
                piv[i] = true;
                const mult = u0[i] / sub;
                l[i] = mult;
                const a1 = u1[i], b1 = u0[i + 1], b2 = u1[i + 1];
                u0[i] = sub;
                u1[i] = b1;
                u2[i] = b2;
                u0[i + 1] = a1 - mult * b1;
                u1[i + 1] = -mult * b2;
            }
        }
        for (let i = 0; i < m; i++) if (Math.abs(u0[i]) < tiny) u0[i] = u0[i] < 0 ? -tiny : tiny;

        let x = startVector(m, jj + 1);
        let converged = 0;
        for (let it = 0; it < 5; it++) {
            // Scale the right-hand side so the solution cannot overflow
            let x1 = 0;
            for (let i = 0; i < m; i++) x1 += Math.abs(x[i]);
            const scl = (m * Math.max(normT, SAFE_MIN) * epsilon) / x1;
            for (let i = 0; i < m; i++) x[i] *= scl;
            // Solve (T − λI)·y = x
            for (let i = 0; i < m - 1; i++) {
                if (piv[i]) {
                    const tmp = x[i];
                    x[i] = x[i + 1];
                    x[i + 1] = tmp;
                }
                x[i + 1] -= l[i] * x[i];
            }
            x[m - 1] /= u0[m - 1];
            x[m - 2] = (x[m - 2] - u1[m - 2] * x[m - 1]) / u0[m - 2];
            for (let i = m - 3; i >= 0; i--) x[i] = (x[i] - u1[i] * x[i + 1] - u2[i] * x[i + 2]) / u0[i];

            // Re-orthogonalize within the cluster (twice is enough)
            for (let pass = 0; pass < 2; pass++) {
                for (let c = cluster; c < jj; c++) {
                    const w = vecs[c];
                    let dot = 0;
                    for (let i = 0; i < m; i++) dot += w[i] * x[i];
                    for (let i = 0; i < m; i++) x[i] -= dot * w[i];
                }
            }
            let nrmInf = 0, nrm2 = 0;
            for (let i = 0; i < m; i++) {
                nrmInf = Math.max(nrmInf, Math.abs(x[i]));
                nrm2 = Math.hypot(nrm2, x[i]);
            }
            if (nrm2 === 0 || !Number.isFinite(nrm2)) {
                x = startVector(m, 7919 * (jj + 1) + it);
                continue;
            }
            for (let i = 0; i < m; i++) x[i] /= nrm2;
            // Converged once the solve amplifies the (tiny) right-hand side to
            // ‖x‖∞ ≥ √(0.1/m); then two extra steps, as dstein does
            if (nrmInf >= dtpcrt) converged++;
            if (converged > 2) break;
        }
        vecs.push(x);
    }
    return vecs;
}

/**
 * The k lowest eigenpairs of the tridiagonal (d, e): split into unreduced
 * blocks, bisection per block, then inverse iteration. Eigenvectors as rows.
 */
function tridiagLowest(d: F64, e0: F64, k: number): { lambda: number[]; Z: F64[] } {
    const n = d.length;
    const normT = tridiagNorm(d, e0, 0, n);
    const e = e0.slice();
    const blocks: [number, number][] = [];
    let start = 0;
    for (let i = 0; i < n - 1; i++) {
        if (negligible(Math.abs(e[i]), Math.abs(d[i]) + Math.abs(d[i + 1]), normT)) {
            e[i] = 0;
            blocks.push([start, i + 1]);
            start = i + 1;
        }
    }
    blocks.push([start, n]);
    const e2 = e.map((x) => x * x);
    let maxE2 = 0;
    for (const x of e2) maxE2 = Math.max(maxE2, x);
    const pivmin = SAFE_MIN * Math.max(1, maxE2);

    // Candidates: the k lowest of each block; keep the k lowest overall
    const cand: { lam: number; b: number }[] = [];
    blocks.forEach(([s, t], b) => {
        for (const lam of bisectLowest(d, e, e2, s, t, Math.min(k, t - s), pivmin)) cand.push({ lam, b });
    });
    cand.sort((x, y) => x.lam - y.lam);
    const chosen = cand.slice(0, k);

    const lambda: number[] = [];
    const Z: F64[] = [];
    blocks.forEach(([s, t], b) => {
        const lams = chosen.filter((c) => c.b === b).map((c) => c.lam);
        if (lams.length === 0) return;
        const vecs = inverseIteration(d, e, s, t, lams);
        lams.forEach((lam, i) => {
            const z = new Float64Array(n);
            for (let j = 0; j < t - s; j++) z[s + j] = vecs[i][j];
            lambda.push(lam);
            Z.push(z);
        });
    });
    const order = lambda.map((_, i) => i).sort((a, b) => lambda[a] - lambda[b]);
    return { lambda: order.map((i) => lambda[i]), Z: order.map((i) => Z[i]) };
}

// ── Public API ──

function checkK(k: number | undefined, n: number, fname: string): number {
    if (k === undefined) return n;
    if (!Number.isInteger(k) || k < 1 || k > n) throw new Error(`${fname}: k must be an integer in [1, ${n}], got ${k}`);
    return k;
}

/** Eigenvectors given as rows (re, im) → n×k arrays with the vectors as columns. */
function columns(re: Rows, im: Rows | null, n: number): [number[][], number[][] | null] {
    const k = re.length;
    const Er: number[][] = Array(n);
    const Ei: number[][] | null = im === null ? null : Array(n);
    for (let i = 0; i < n; i++) {
        const r = Array(k);
        for (let j = 0; j < k; j++) r[j] = re[j][i];
        Er[i] = r;
        if (Ei !== null) {
            const c = Array(k);
            for (let j = 0; j < k; j++) c[j] = im![j][i];
            Ei[i] = c;
        }
    }
    return [Er, Ei];
}

/** Raw parts of a real or complex MatrixLike. */
function parts(A: MatrixLike, fname: string): [number[][], number[][] | null] {
    const re = (A instanceof Matrix ? A.real : A) as number[][];
    const im = A instanceof Matrix && A.is_complex ? (A.imag as number[][]) : null;
    if (re.length === 0) throw new Error(`${fname} requires a non-empty matrix`);
    assertSquare(re, fname);
    return [re, im];
}

/** Eigenpairs (rows) of the Hermitian matrix (re, im), lowest k. */
/** Lowest k eigenpairs of the Hermitian matrix (re, im); eigenvectors as columns. */
function eighRaw(re: Rows, im: Rows | null, k: number, maxiter: number): { lambda: number[]; Er: number[][]; Ei: number[][] | null } {
    const n = re.length;
    const t = im === null ? tridiagonalizeReal(re) : tridiagonalizeComplex(re, im);
    if (k >= n) {
        if (im === null) {
            // Real: rotate Q itself (forming Q, 4/3·n³, is cheaper than back-transforming n vectors, 2n³)
            const { d, X } = tridiagQL(t.d, t.e, maxiter, applyQ(t, identityRows(n), true)[0]);
            return sortColumns(d, X, null);
        }
        // Complex: rotate a real identity, then apply the complex Q once
        // (rotating complex Q would double the rotation work, the most expensive part)
        const { d, X } = tridiagQL(t.d, t.e, maxiter);
        const [Xr, Xi] = applyQ(t, X, false);
        return sortColumns(d, Xr, Xi);
    }
    const { lambda, Z } = tridiagLowest(t.d, t.e, k);
    const [Xr, Xi] = backTransform(t, Z);
    const [Er, Ei] = columns(Xr, Xi, n);
    return { lambda, Er, Ei };
}

/**
 * Eigenvalues and eigenvectors of a real symmetric or complex Hermitian matrix.
 *
 * Only the lower triangle of A is read (as in NumPy's eigh). With `k`, only
 * the k lowest eigenpairs are computed (bisection and inverse iteration on
 * the tridiagonal form), which is cheaper than the full decomposition.
 *
 * @param A        Real symmetric or complex Hermitian matrix (n×n).
 * @param k        Number of lowest eigenpairs to compute (default: all n).
 * @param maxiter  Maximum QL iterations per eigenvalue (default 30·n).
 * @returns        {lambda, E}: eigenvalues ascending, eigenvectors as the
 *                 orthonormal columns of E (n×k), so A·E = E·diag(lambda).
 */
export function eigh(A: MatrixLike, k?: number, maxiter?: number): EighResult {
    const [re, im] = parts(A, "eigh");
    const n = re.length;
    const kk = checkK(k, n, "eigh");
    const { lambda, Er, Ei } = eighRaw(re, im, kk, maxiter ?? 30 * n);
    return { lambda: new Vector(lambda), E: new Matrix(Er, Ei) };
}

/**
 * Eigenvalues and eigenvectors of a real symmetric tridiagonal matrix.
 *
 * @param d        Diagonal (length n).
 * @param e        Off-diagonal (length n − 1).
 * @param k        Number of lowest eigenpairs to compute (default: all n).
 * @param maxiter  Maximum QL iterations per eigenvalue (default 30·n).
 * @returns        {lambda, E}: eigenvalues ascending, eigenvectors as the
 *                 orthonormal columns of E (n×k).
 */
export function eighTridiagonal(d: VectorLike, e: VectorLike, k?: number, maxiter?: number): EighResult {
    const dd = toRawVector(d, "eighTridiagonal");
    const ee = toRawVector(e, "eighTridiagonal");
    const n = dd.length;
    if (n === 0) throw new Error("eighTridiagonal requires a non-empty diagonal");
    if (ee.length !== n - 1) throw new Error(`eighTridiagonal: e must have length ${n - 1}, got ${ee.length}`);
    const kk = checkK(k, n, "eighTridiagonal");
    const d64 = Float64Array.from(dd), e64 = Float64Array.from(ee);
    if (kk === n) {
        const { d: lam, X } = tridiagQL(d64, e64, maxiter ?? 30 * n);
        const { lambda, Er } = sortColumns(lam, X, null);
        return { lambda: new Vector(lambda), E: new Matrix(Er) };
    }
    const { lambda, Z } = tridiagLowest(d64, e64, kk);
    return { lambda: new Vector(lambda), E: new Matrix(columns(Z, null, n)[0]) };
}

/**
 * Cholesky factor of the Hermitian positive definite (re, im): S = L·Lᴴ,
 * L lower triangular with a real positive diagonal. Reads the lower triangle.
 */
function choleskyRaw(re: Rows, im: Rows | null, fname: string): [F64[], F64[] | null] {
    const n = re.length;
    const Lr: F64[] = Array(n);
    const Li: F64[] | null = im === null ? null : Array(n);
    for (let i = 0; i < n; i++) {
        Lr[i] = new Float64Array(n);
        if (Li !== null) Li[i] = new Float64Array(n);
    }
    for (let j = 0; j < n; j++) {
        const Lj = Lr[j], Lji = Li !== null ? Li[j] : null;
        let s = re[j][j];
        for (let k = 0; k < j; k++) s -= Lj[k] * Lj[k] + (Lji !== null ? Lji[k] * Lji[k] : 0);
        if (!(s > 0)) throw new Error(`${fname}: S is not positive definite`);
        const ljj = Math.sqrt(s);
        Lj[j] = ljj;
        for (let i = j + 1; i < n; i++) {
            const Li_r = Lr[i];
            let a = re[i][j];
            if (Li === null) {
                for (let k = 0; k < j; k++) a -= Li_r[k] * Lj[k];
                Li_r[j] = a / ljj;
            } else {
                const Li_i = Li[i];
                let b = im![i][j];
                // − Σ L[i][k]·conj(L[j][k])
                for (let k = 0; k < j; k++) {
                    a -= Li_r[k] * Lj[k] + Li_i[k] * Lji![k];
                    b -= Li_i[k] * Lj[k] - Li_r[k] * Lji![k];
                }
                Li_r[j] = a / ljj;
                Li_i[j] = b / ljj;
            }
        }
    }
    return [Lr, Li];
}

/** Solve L·X = B (L lower triangular) for the rows of X, complex-aware; B's rows are overwritten. */
function forwardSolveRows(Lr: F64[], Li: F64[] | null, Br: F64[], Bi: F64[] | null): void {
    const n = Lr.length;
    const cols = Br[0].length;
    for (let i = 0; i < n; i++) {
        const xr = Br[i], xi = Bi !== null ? Bi[i] : null;
        for (let k = 0; k < i; k++) {
            const lr = Lr[i][k], li = Li !== null ? Li[i][k] : 0;
            if (lr === 0 && li === 0) continue;
            const yr = Br[k], yi = Bi !== null ? Bi[k] : null;
            if (xi === null || yi === null) {
                for (let c = 0; c < cols; c++) xr[c] -= lr * yr[c];
            } else {
                for (let c = 0; c < cols; c++) {
                    xr[c] -= lr * yr[c] - li * yi[c];
                    xi[c] -= lr * yi[c] + li * yr[c];
                }
            }
        }
        const dinv = 1 / Lr[i][i];
        for (let c = 0; c < cols; c++) xr[c] *= dinv;
        if (xi !== null) for (let c = 0; c < cols; c++) xi[c] *= dinv;
    }
}

/**
 * Generalized Hermitian-definite eigenproblem H·x = λ·S·x, with H Hermitian
 * (real symmetric) and S Hermitian positive definite, e.g. a Hamiltonian in
 * a non-orthogonal basis with overlap matrix S.
 *
 * Reduced to a standard problem with the Cholesky factor S = L·Lᴴ:
 * C = L⁻¹·H·L⁻ᴴ, C·y = λ·y, x = L⁻ᴴ·y. Only the lower triangles of H and S
 * are read.
 *
 * @param H        Hermitian (real symmetric) matrix (n×n).
 * @param S        Hermitian (real symmetric) positive definite matrix (n×n).
 * @param k        Number of lowest eigenpairs to compute (default: all n).
 * @param maxiter  Maximum QL iterations per eigenvalue (default 30·n).
 * @returns        {lambda, E}: eigenvalues ascending, eigenvectors as the
 *                 columns of E (n×k), normalized so that Eᴴ·S·E = I.
 */
export function eighGeneralized(H: MatrixLike, S: MatrixLike, k?: number, maxiter?: number): EighResult {
    const [hr, hi] = parts(H, "eighGeneralized");
    const [sr, si] = parts(S, "eighGeneralized");
    const n = hr.length;
    if (sr.length !== n) throw new Error(`eighGeneralized: H is ${n}x${n} but S is ${sr.length}x${sr.length}`);
    const kk = checkK(k, n, "eighGeneralized");
    const complex = hi !== null || si !== null;

    const [Lr, Li] = choleskyRaw(sr, si, "eighGeneralized");
    // M = L⁻¹·H (full H from its lower triangle), then C = L⁻¹·Mᴴ = L⁻¹·H·L⁻ᴴ
    const Mr = symmetricFromLower(hr);
    let Mi: F64[] | null = null;
    if (complex) {
        Mi = Array(n);
        for (let i = 0; i < n; i++) {
            const row = new Float64Array(n);
            for (let j = 0; j < n; j++) row[j] = hi === null ? 0 : j < i ? hi[i][j] : j > i ? -hi[j][i] : 0;
            Mi[i] = row;
        }
    }
    forwardSolveRows(Lr, Li, Mr, Mi);
    const Cr: F64[] = Array(n);
    const Ci: F64[] | null = complex ? Array(n) : null;
    for (let i = 0; i < n; i++) {
        const r = new Float64Array(n);
        for (let j = 0; j < n; j++) r[j] = Mr[j][i];
        Cr[i] = r;
        if (Ci !== null) {
            const c = new Float64Array(n);
            for (let j = 0; j < n; j++) c[j] = -Mi![j][i];
            Ci[i] = c;
        }
    }
    forwardSolveRows(Lr, Li, Cr, Ci);

    const { lambda, Er: yr, Ei: yi } = eighRaw(Cr, Ci, kk, maxiter ?? 30 * n);

    // x = L⁻ᴴ·y: back substitution with Lᴴ, on the n×k matrix whose columns are the y's
    for (let i = n - 1; i >= 0; i--) {
        const xr = yr[i], xi = yi !== null ? yi[i] : null;
        for (let j = i + 1; j < n; j++) {
            // (Lᴴ)[i][j] = conj(L[j][i])
            const lr = Lr[j][i], li = Li !== null ? -Li[j][i] : 0;
            if (lr === 0 && li === 0) continue;
            const zr = yr[j], zi = yi !== null ? yi[j] : null;
            if (xi === null || zi === null) {
                for (let c = 0; c < kk; c++) xr[c] -= lr * zr[c];
            } else {
                for (let c = 0; c < kk; c++) {
                    xr[c] -= lr * zr[c] - li * zi[c];
                    xi[c] -= lr * zi[c] + li * zr[c];
                }
            }
        }
        const dinv = 1 / Lr[i][i];
        for (let c = 0; c < kk; c++) xr[c] *= dinv;
        if (xi !== null) for (let c = 0; c < kk; c++) xi[c] *= dinv;
    }
    return { lambda: new Vector(lambda), E: new Matrix(yr, yi) };
}
