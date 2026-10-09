/**
 * Quadratic programming with the Goldfarb–Idnani dual active-set method.
 *
 *   minimize    ½ xᵀ D x − dᵀ x
 *   subject to  Aᵀ x ≥ b   (the first `meq` constraints as equalities)
 *
 * Ported from the Fortran routine qpgen2 of the R package quadprog
 * (B. A. Turlach), as numeric.js does via quadprog.js (A. Santini). The
 * numeric.js copy turned three of Fortran's "skip to the next iteration"
 * jumps into early loop exits and two `≤` tests into `<`; this port keeps
 * the original control flow.
 *
 * Internally 1-based like the Fortran original (index 0 is unused).
 */

import Vector from "../vector";
import { type MatrixLike, type VectorLike, toRawMatrix, toRawVector } from "../linalg/wrap";

/** Copy a 0-based vector into a 1-based one. */
const to1 = (v: number[]): number[] => [0, ...v];
/** Copy a 0-based matrix into a 1-based one. */
const to1m = (M: number[][]): number[][] => [[], ...M.map(to1)];

/** Cholesky factorization a = rᵀr (upper triangle of a); returns 0 or the failing column. */
function dpofa(a: number[][], n: number): number {
    for (let j = 1; j <= n; j++) {
        let s = 0;
        for (let k = 1; k < j; k++) {
            let t = a[k][j];
            for (let i = 1; i < k; i++) t -= a[i][j] * a[i][k];
            t /= a[k][k];
            a[k][j] = t;
            s += t * t;
        }
        s = a[j][j] - s;
        if (s <= 0) return j;
        a[j][j] = Math.sqrt(s);
    }
    return 0;
}

/** Solve a x = b using the factor from dpofa (b is overwritten). */
function dposl(a: number[][], n: number, b: number[]): void {
    for (let k = 1; k <= n; k++) {
        let t = 0;
        for (let i = 1; i < k; i++) t += a[i][k] * b[i];
        b[k] = (b[k] - t) / a[k][k];
    }
    for (let k = n; k >= 1; k--) {
        b[k] /= a[k][k];
        const t = -b[k];
        for (let i = 1; i < k; i++) b[i] += t * a[i][k];
    }
}

/** Invert the upper-triangular factor r in place. */
function dpori(a: number[][], n: number): void {
    for (let k = 1; k <= n; k++) {
        a[k][k] = 1 / a[k][k];
        const t = -a[k][k];
        for (let i = 1; i < k; i++) a[i][k] *= t;
        for (let j = k + 1; j <= n; j++) {
            const tj = a[k][j];
            a[k][j] = 0;
            for (let i = 1; i <= k; i++) a[i][j] += tj * a[i][k];
        }
    }
}

type QPGenOutput = { ierr: number; nact: number; iter: [number, number] };

/**
 * The qpgen2 routine. All arrays are 1-based and are modified in place:
 * dmat, dvec, amat, bvec are workspaces; sol, crval, iact receive the results.
 */
function qpgen2(
    dmat: number[][], dvec: number[], n: number, sol: number[], crval: number[],
    amat: number[][], bvec: number[], q: number, meq: number, iact: number[], factorized: boolean,
): QPGenOutput {
    const r = Math.min(n, q);
    const lwork = 2 * n + (r * (r + 5)) / 2 + 2 * q + 1;
    const work: number[] = new Array(lwork + 1).fill(0);

    let vsmall = 1.0e-60;
    do {
        vsmall += vsmall;
    } while (1 + 0.1 * vsmall <= 1 || 1 + 0.2 * vsmall <= 1);

    for (let i = 1; i <= n; i++) work[i] = dvec[i];
    for (let i = 1; i <= q; i++) iact[i] = 0;

    if (!factorized) {
        if (dpofa(dmat, n) !== 0) return { ierr: 2, nact: 0, iter: [0, 0] };
        dposl(dmat, n, dvec);
        dpori(dmat, n);
    } else {
        // dmat already holds R⁻¹: compute the unconstrained solution R⁻¹ R⁻ᵀ d
        for (let j = 1; j <= n; j++) {
            sol[j] = 0;
            for (let i = 1; i <= j; i++) sol[j] += dmat[i][j] * dvec[i];
        }
        for (let j = 1; j <= n; j++) {
            dvec[j] = 0;
            for (let i = j; i <= n; i++) dvec[j] += dmat[j][i] * sol[i];
        }
    }

    // Unconstrained minimum and its value
    crval[1] = 0;
    for (let j = 1; j <= n; j++) {
        sol[j] = dvec[j];
        crval[1] += work[j] * sol[j];
        work[j] = 0;
        for (let i = j + 1; i <= n; i++) dmat[i][j] = 0;
    }
    crval[1] = -crval[1] / 2;

    // Workspace layout
    const iwzv = n;
    const iwrv = iwzv + n;
    const iwuv = iwrv + r;
    const iwrm = iwuv + r + 1;
    const iwsv = iwrm + (r * (r + 1)) / 2;
    const iwnbv = iwsv + q;

    for (let i = 1; i <= q; i++) {
        let sum = 0;
        for (let j = 1; j <= n; j++) sum += amat[j][i] * amat[j][i];
        work[iwnbv + i] = Math.sqrt(sum);
    }

    let nact = 0;
    const iter: [number, number] = [0, 0];
    let it1 = 0, t1 = 0, nvl = 0, l = 0, l1 = 0;
    let temp: number, sum: number, gc: number, gs: number, nu: number, tt: number;

    /** Givens rotation zeroing b in (a, b): returns [c, s, rho] with rho = ±hypot(a, b). */
    const givens = (a: number, b: number): [number, number, number] => {
        const big = Math.max(Math.abs(a), Math.abs(b));
        const small = Math.min(Math.abs(a), Math.abs(b));
        const rho = (a >= 0 ? 1 : -1) * Math.abs(big * Math.sqrt(1 + (small * small) / (big * big)));
        return [a / rho, b / rho, rho];
    };

    // Label 50: find the most violated constraint
    outer: for (;;) {
        iter[0]++;
        l = iwsv;
        for (let i = 1; i <= q; i++) {
            l++;
            sum = -bvec[i];
            for (let j = 1; j <= n; j++) sum += amat[j][i] * sol[j];
            if (Math.abs(sum) < vsmall) sum = 0;
            if (i > meq) {
                work[l] = sum;
            } else {
                work[l] = -Math.abs(sum);
                if (sum > 0) {
                    for (let j = 1; j <= n; j++) amat[j][i] = -amat[j][i];
                    bvec[i] = -bvec[i];
                }
            }
        }
        for (let i = 1; i <= nact; i++) work[iwsv + iact[i]] = 0;

        nvl = 0;
        temp = 0;
        for (let i = 1; i <= q; i++) {
            if (work[iwsv + i] < temp * work[iwnbv + i]) {
                nvl = i;
                temp = work[iwsv + i] / work[iwnbv + i];
            }
        }
        if (nvl === 0) return { ierr: 0, nact, iter };

        // Label 55: step direction in primal (z) and dual (r) space
        for (;;) {
            for (let i = 1; i <= n; i++) {
                sum = 0;
                for (let j = 1; j <= n; j++) sum += dmat[j][i] * amat[j][nvl];
                work[i] = sum;
            }
            l1 = iwzv;
            for (let i = 1; i <= n; i++) work[l1 + i] = 0;
            for (let j = nact + 1; j <= n; j++) {
                for (let i = 1; i <= n; i++) work[l1 + i] += dmat[i][j] * work[j];
            }

            let t1inf = true;
            for (let i = nact; i >= 1; i--) {
                sum = work[i];
                l = iwrm + (i * (i + 3)) / 2;
                l1 = l - i;
                for (let j = i + 1; j <= nact; j++) {
                    sum -= work[l] * work[iwrv + j];
                    l += j;
                }
                sum /= work[l1];
                work[iwrv + i] = sum;
                if (iact[i] <= meq) continue;
                if (sum <= 0) continue;
                t1inf = false;
                it1 = i;
            }

            if (!t1inf) {
                t1 = work[iwuv + it1] / work[iwrv + it1];
                for (let i = 1; i <= nact; i++) {
                    if (iact[i] <= meq) continue;
                    if (work[iwrv + i] <= 0) continue;
                    temp = work[iwuv + i] / work[iwrv + i];
                    if (temp < t1) {
                        t1 = temp;
                        it1 = i;
                    }
                }
            }

            sum = 0;
            for (let i = iwzv + 1; i <= iwzv + n; i++) sum += work[i] * work[i];

            let dropConstraint = false;
            if (Math.abs(sum) <= vsmall) {
                // No step in primal space
                if (t1inf) return { ierr: 1, nact, iter };
                for (let i = 1; i <= nact; i++) work[iwuv + i] -= t1 * work[iwrv + i];
                work[iwuv + nact + 1] += t1;
                dropConstraint = true;
            } else {
                sum = 0;
                for (let i = 1; i <= n; i++) sum += work[iwzv + i] * amat[i][nvl];
                tt = -work[iwsv + nvl] / sum;
                let t2min = true;
                if (!t1inf && t1 < tt) {
                    tt = t1;
                    t2min = false;
                }
                for (let i = 1; i <= n; i++) {
                    sol[i] += tt * work[iwzv + i];
                    if (Math.abs(sol[i]) < vsmall) sol[i] = 0;
                }
                crval[1] += tt * sum * (tt / 2 + work[iwuv + nact + 1]);
                for (let i = 1; i <= nact; i++) work[iwuv + i] -= tt * work[iwrv + i];
                work[iwuv + nact + 1] += tt;

                if (t2min) {
                    // Full step: add constraint nvl to the active set
                    nact++;
                    iact[nact] = nvl;
                    l = iwrm + ((nact - 1) * nact) / 2 + 1;
                    for (let i = 1; i <= nact - 1; i++) {
                        work[l] = work[i];
                        l++;
                    }
                    if (nact === n) {
                        work[l] = work[n];
                    } else {
                        for (let i = n; i >= nact + 1; i--) {
                            if (work[i] === 0) continue;
                            [gc, gs, temp] = givens(work[i - 1], work[i]);
                            if (gc === 1) continue;
                            if (gc === 0) {
                                work[i - 1] = gs * temp;
                                for (let j = 1; j <= n; j++) {
                                    temp = dmat[j][i - 1];
                                    dmat[j][i - 1] = dmat[j][i];
                                    dmat[j][i] = temp;
                                }
                            } else {
                                work[i - 1] = temp;
                                nu = gs / (1 + gc);
                                for (let j = 1; j <= n; j++) {
                                    temp = gc * dmat[j][i - 1] + gs * dmat[j][i];
                                    dmat[j][i] = nu * (dmat[j][i - 1] + temp) - dmat[j][i];
                                    dmat[j][i - 1] = temp;
                                }
                            }
                        }
                        work[l] = work[nact];
                    }
                    continue outer;
                }

                // Partial step: re-evaluate constraint nvl, then drop a constraint
                sum = -bvec[nvl];
                for (let j = 1; j <= n; j++) sum += sol[j] * amat[j][nvl];
                if (nvl > meq) {
                    work[iwsv + nvl] = sum;
                } else {
                    work[iwsv + nvl] = -Math.abs(sum);
                    if (sum > 0) {
                        for (let j = 1; j <= n; j++) amat[j][nvl] = -amat[j][nvl];
                        bvec[nvl] = -bvec[nvl];
                    }
                }
                dropConstraint = true;
            }

            if (dropConstraint) {
                // Label 700: drop constraint it1 from the active set
                if (it1 !== nact) {
                    for (;;) {
                        // Label 797
                        l = iwrm + (it1 * (it1 + 1)) / 2 + 1;
                        l1 = l + it1;
                        if (work[l1] !== 0) {
                            [gc, gs, temp] = givens(work[l1 - 1], work[l1]);
                            if (gc !== 1) {
                                if (gc === 0) {
                                    for (let i = it1 + 1; i <= nact; i++) {
                                        temp = work[l1 - 1];
                                        work[l1 - 1] = work[l1];
                                        work[l1] = temp;
                                        l1 += i;
                                    }
                                    for (let i = 1; i <= n; i++) {
                                        temp = dmat[i][it1];
                                        dmat[i][it1] = dmat[i][it1 + 1];
                                        dmat[i][it1 + 1] = temp;
                                    }
                                } else {
                                    nu = gs / (1 + gc);
                                    for (let i = it1 + 1; i <= nact; i++) {
                                        temp = gc * work[l1 - 1] + gs * work[l1];
                                        work[l1] = nu * (work[l1 - 1] + temp) - work[l1];
                                        work[l1 - 1] = temp;
                                        l1 += i;
                                    }
                                    for (let i = 1; i <= n; i++) {
                                        temp = gc * dmat[i][it1] + gs * dmat[i][it1 + 1];
                                        dmat[i][it1 + 1] = nu * (dmat[i][it1] + temp) - dmat[i][it1 + 1];
                                        dmat[i][it1] = temp;
                                    }
                                }
                            }
                        }
                        // Label 798
                        l1 = l - it1;
                        for (let i = 1; i <= it1; i++) {
                            work[l1] = work[l];
                            l++;
                            l1++;
                        }
                        work[iwuv + it1] = work[iwuv + it1 + 1];
                        iact[it1] = iact[it1 + 1];
                        it1++;
                        if (it1 >= nact) break;
                    }
                }
                // Label 799
                work[iwuv + nact] = work[iwuv + nact + 1];
                work[iwuv + nact + 1] = 0;
                iact[nact] = 0;
                nact--;
                iter[1]++;
                // Back to label 55 with the same violated constraint
            }
        }
    }
}

export type SolveQPOptions = {
    /** The first `meq` constraints are equalities (default 0). */
    meq?: number;
    /** If true, D is given as R⁻¹ where D = RᵀR (upper triangular R). */
    factorized?: boolean;
};

export type SolveQPResult = {
    /** The minimizer. */
    solution: Vector;
    /** The objective value ½ xᵀDx − dᵀx at the solution. */
    value: number;
    /** The minimizer without constraints, D⁻¹d. */
    unconstrainedSolution: Vector;
    /** [iterations, constraints dropped from the active set]. */
    iterations: [number, number];
    /** 0-based indices of the constraints active at the solution. */
    active: number[];
    /** "" on success, otherwise why no solution was found. */
    message: string;
};

/**
 * Solve a strictly convex quadratic program (Goldfarb–Idnani):
 *
 *     minimize ½ xᵀ D x − dᵀ x   subject to   Aᵀ x ≥ b
 *
 * D must be symmetric positive definite. Each *column* of A is one
 * constraint (n×q for n variables and q constraints); the first `meq`
 * constraints are equalities. This follows the conventions of R's quadprog
 * and numeric.js.
 *
 * @param D         n×n positive definite matrix.
 * @param d         Linear term (length n).
 * @param A         n×q constraint matrix.
 * @param b         Constraint bounds (length q; default zeros).
 * @param options   meq, factorized.
 */
export function solveQP(D: MatrixLike, d: VectorLike, A: MatrixLike, b?: VectorLike, options: SolveQPOptions = {}): SolveQPResult {
    const rD = toRawMatrix(D, "solveQP"), rd = toRawVector(d, "solveQP"), rA = toRawMatrix(A, "solveQP");
    const n = rD.length;
    const q = rA[0].length;
    const rb = b === undefined ? new Array(q).fill(0) : toRawVector(b, "solveQP");
    const meq = options.meq ?? 0;
    if (rd.length !== n) throw new Error(`solveQP: d has length ${rd.length}, expected ${n}`);
    if (rA.length !== n) throw new Error(`solveQP: A has ${rA.length} rows, expected ${n} (one column per constraint)`);
    if (rb.length !== q) throw new Error(`solveQP: b has length ${rb.length}, expected ${q}`);

    const dmat = to1m(rD), dvec = to1(rd), amat = to1m(rA), bvec = to1(rb);
    const sol: number[] = new Array(n + 1).fill(0);
    const crval: number[] = [0, 0];
    const iact: number[] = new Array(q + 1).fill(0);

    const out = qpgen2(dmat, dvec, n, sol, crval, amat, bvec, q, meq, iact, options.factorized ?? false);

    let message = "";
    if (out.ierr === 1) message = "constraints are inconsistent, no solution!";
    if (out.ierr === 2) message = "matrix D in quadratic function is not positive definite!";
    return {
        solution: new Vector(sol.slice(1)),
        value: crval[1],
        unconstrainedSolution: new Vector(dvec.slice(1)),
        iterations: out.iter,
        active: iact.slice(1, out.nact + 1).map((i) => i - 1),
        message,
    };
}
