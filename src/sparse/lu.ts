/**
 * Sparse LU factorization with partial pivoting (left-looking, Gilbert–Peierls;
 * the same algorithm as numeric.js's ccsLUP and CSparse's cs_lu with natural
 * column order).
 *
 * Each column of L and U is found by a sparse triangular solve with the
 * columns of L computed so far; a depth-first search over L's graph gives the
 * solve's nonzero pattern, so the work is proportional to the flops.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import { SparseMatrix } from "./sparse";
import { type VectorLike, type MatrixLike, toRawVector, toRawMatrix } from "../linalg/wrap";

export type SparseLUOptions = {
    /**
     * Pivoting threshold in (0, 1]: the diagonal entry is kept as the pivot if
     * |a_kk| ≥ threshold · max |a_ik|. 1 (default) is classic partial pivoting;
     * smaller values preserve sparsity better.
     */
    threshold?: number;
};

export class SparseLU {
    /** @internal Use sparse.lu(). */
    constructor(
        /** Unit lower-triangular factor. */
        readonly L: SparseMatrix,
        /** Upper-triangular factor. */
        readonly U: SparseMatrix,
        /** Row permutation: row k of P·A is row p[k] of A, so P·A = L·U. */
        readonly p: number[],
        /** @internal Inverse permutation: pinv[p[k]] = k. */
        private readonly pinv: number[],
    ) {}

    /** Solve A x = b for a dense right-hand side b (a vector, or a matrix of columns). */
    solve(b: VectorLike): Vector;
    solve(B: MatrixLike): Matrix;
    solve(b: VectorLike | MatrixLike): Vector | Matrix {
        const n = this.p.length;
        const solveOne = (rhs: number[]): number[] => {
            if (rhs.length !== n) throw new Error(`SparseLU.solve: right-hand side has length ${rhs.length}, expected ${n}`);
            const x = new Array(n);
            for (let i = 0; i < n; i++) x[this.pinv[i]] = rhs[i];
            lsolve(this.L, x);
            usolve(this.U, x);
            return x;
        };
        if (b instanceof Matrix || (Array.isArray(b) && Array.isArray((b as unknown[])[0]))) {
            const B = toRawMatrix(b as MatrixLike, "SparseLU.solve");
            const cols = B[0].map((_, j) => solveOne(B.map((row) => row[j])));
            return new Matrix(Array.from({ length: n }, (_, i) => cols.map((c) => c[i])));
        }
        return new Vector(solveOne(toRawVector(b as VectorLike, "SparseLU.solve")));
    }
}

/** Solve L x = b in place (L unit lower triangular, diagonal stored first in each column). */
function lsolve(L: SparseMatrix, x: number[]): void {
    const Lp = L.colPtr, Li = L.rowIdx, Lv = L.values;
    for (let j = 0; j < L.ncols; j++) {
        const xj = x[j];
        if (xj === 0) continue;
        for (let p = Lp[j] + 1; p < Lp[j + 1]; p++) x[Li[p]] -= Lv[p] * xj;
    }
}

/** Solve U x = b in place (U upper triangular, diagonal stored last in each column). */
function usolve(U: SparseMatrix, x: number[]): void {
    const Up = U.colPtr, Ui = U.rowIdx, Uv = U.values;
    for (let j = U.ncols - 1; j >= 0; j--) {
        x[j] /= Uv[Up[j + 1] - 1];
        const xj = x[j];
        if (xj === 0) continue;
        for (let p = Up[j]; p < Up[j + 1] - 1; p++) x[Ui[p]] -= Uv[p] * xj;
    }
}

/**
 * LU factorization P·A = L·U of a square sparse matrix.
 *
 * @param A         Square SparseMatrix.
 * @param options   threshold (default 1: partial pivoting).
 */
export function lu(A: SparseMatrix, options: SparseLUOptions = {}): SparseLU {
    const n = A.ncols;
    if (A.nrows !== n) throw new Error(`sparse.lu: matrix must be square, got ${A.nrows}x${A.ncols}`);
    const tol = options.threshold ?? 1;
    const Ap = A.colPtr, Ai = A.rowIdx, Av = A.values;

    // L and U grow column by column; L's row indices stay in A's row numbering until the end
    const Lp = new Array(n + 1), Li: number[] = [], Lv: number[] = [];
    const Up = new Array(n + 1), Ui: number[] = [], Uv: number[] = [];
    const pinv = new Int32Array(n).fill(-1);

    const x = new Float64Array(n);           // dense work column
    const mark = new Int32Array(n).fill(-1); // DFS marks, stamped with the column number
    const reach = new Int32Array(n);         // nonzero pattern of x, in topological order (top..n-1)
    const stack = new Int32Array(n);
    const pstack = new Int32Array(n);
    let lnz = 0, unz = 0;

    for (let k = 0; k < n; k++) {
        Lp[k] = lnz;
        Up[k] = unz;

        // Pattern of x = L \ A(:, k): rows reachable from A(:, k)'s rows in the graph of L
        let top = n;
        for (let p = Ap[k]; p < Ap[k + 1]; p++) {
            const start = Ai[p];
            if (mark[start] === k) continue;
            // Iterative DFS from `start`
            let head = 0;
            stack[0] = start;
            while (head >= 0) {
                const j = stack[head];
                const J = pinv[j]; // column of L that row j pivots, or -1
                if (mark[j] !== k) {
                    mark[j] = k;
                    pstack[head] = J < 0 ? 0 : Lp[J] + 1; // skip L's unit diagonal
                }
                let done = true;
                const pend = J < 0 ? 0 : Lp[J + 1];
                for (let q = pstack[head]; q < pend; q++) {
                    const i = Li[q];
                    if (mark[i] === k) continue;
                    pstack[head] = q + 1;
                    stack[++head] = i;
                    done = false;
                    break;
                }
                if (done) {
                    head--;
                    reach[--top] = j;
                }
            }
        }

        // Numeric sparse triangular solve
        for (let q = top; q < n; q++) x[reach[q]] = 0;
        for (let p = Ap[k]; p < Ap[k + 1]; p++) x[Ai[p]] = Av[p];
        for (let q = top; q < n; q++) {
            const j = reach[q], J = pinv[j];
            if (J < 0) continue;
            const xj = x[j];
            for (let p = Lp[J] + 1; p < Lp[J + 1]; p++) x[Li[p]] -= Lv[p] * xj;
        }

        // Choose the pivot among rows not yet pivoted; others go to U
        let ipiv = -1, amax = -1;
        for (let q = top; q < n; q++) {
            const i = reach[q];
            if (pinv[i] < 0) {
                const a = Math.abs(x[i]);
                if (a > amax) { amax = a; ipiv = i; }
            } else if (x[i] !== 0) {
                // Exact cancellations are not stored (canonical form)
                Ui[unz] = pinv[i];
                Uv[unz] = x[i];
                unz++;
            }
        }
        if (ipiv === -1 || amax === 0) throw new Error(`sparse.lu: matrix is singular (column ${k})`);
        // Prefer the diagonal when it is large enough (keeps sparsity, P = I for diagonally dominant A)
        if (pinv[k] < 0 && mark[k] === k && Math.abs(x[k]) >= amax * tol) ipiv = k;

        const pivot = x[ipiv];
        Ui[unz] = k;
        Uv[unz] = pivot;
        unz++;
        pinv[ipiv] = k;
        Li[lnz] = ipiv;
        Lv[lnz] = 1;
        lnz++;
        for (let q = top; q < n; q++) {
            const i = reach[q];
            if (pinv[i] < 0 && x[i] !== 0) {
                Li[lnz] = i;
                Lv[lnz] = x[i] / pivot;
                lnz++;
            }
            x[i] = 0;
        }
    }
    Lp[n] = lnz;
    Up[n] = unz;

    // Renumber L's rows by pivot order, then sort every column (canonical form):
    // L's unit diagonal comes first, U's diagonal last
    for (let p = 0; p < lnz; p++) Li[p] = pinv[Li[p]];
    sortColumns(Lp, Li, Lv);
    sortColumns(Up, Ui, Uv);

    const p = new Array(n);
    for (let i = 0; i < n; i++) p[pinv[i]] = i;
    return new SparseLU(new SparseMatrix(n, n, Lp, Li, Lv), new SparseMatrix(n, n, Up, Ui, Uv), p, Array.from(pinv));
}

/** Sort entries by row within each column (in place). */
function sortColumns(cp: number[], ri: number[], vv: number[]): void {
    for (let j = 0; j + 1 < cp.length; j++) {
        const a = cp[j], b = cp[j + 1];
        let sorted = true;
        for (let q = a + 1; q < b; q++) if (ri[q - 1] > ri[q]) { sorted = false; break; }
        if (sorted) continue;
        const idx = Array.from({ length: b - a }, (_, t) => a + t).sort((u, w) => ri[u] - ri[w]);
        const r = idx.map((t) => ri[t]), v = idx.map((t) => vv[t]);
        for (let t = 0; t < r.length; t++) {
            ri[a + t] = r[t];
            vv[a + t] = v[t];
        }
    }
}

/**
 * Solve A x = b for a sparse square A and a dense right-hand side.
 * For several right-hand sides with the same A, factor once with lu() and reuse it.
 */
export function solve(A: SparseMatrix, b: VectorLike): Vector;
export function solve(A: SparseMatrix, B: MatrixLike): Matrix;
export function solve(A: SparseMatrix, b: VectorLike | MatrixLike): Vector | Matrix {
    return lu(A).solve(b as any);
}
