/**
 * Arithmetic, products and block extraction for SparseMatrix.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import NumericCore from "../core";
import { SparseMatrix } from "./sparse";
import { type VectorLike, type MatrixLike, toRawVector, toRawMatrix } from "../linalg/wrap";

function sameShape(A: SparseMatrix, B: SparseMatrix, name: string) {
    if (A.nrows !== B.nrows || A.ncols !== B.ncols) {
        throw new Error(`sparse.${name}: shape mismatch (${A.nrows}x${A.ncols} vs ${B.nrows}x${B.ncols})`);
    }
}

function binopSS(kernel: Function, A: SparseMatrix, B: SparseMatrix, name: string): SparseMatrix {
    sameShape(A, B, name);
    const [p, i, v] = kernel(A.nrows, A.ncols, A.colPtr, A.rowIdx, A.values, B.colPtr, B.rowIdx, B.values);
    return new SparseMatrix(A.nrows, A.ncols, p, i, v);
}

/** Apply a real vector kernel `(values, scalar, n)` to the stored values. */
function scaleValues(A: SparseMatrix, kernel: Function, s: number): SparseMatrix {
    return SparseMatrix.fromParts(A.nrows, A.ncols, A.colPtr, A.rowIdx, kernel(A.values, s, A.nnz));
}

/** A + B (same shape). */
export function add(A: SparseMatrix, B: SparseMatrix): SparseMatrix {
    return binopSS(NumericCore._re_s_addSS, A, B, "add");
}

/** A − B (same shape). */
export function sub(A: SparseMatrix, B: SparseMatrix): SparseMatrix {
    return binopSS(NumericCore._re_s_subSS, A, B, "sub");
}

/** Element-wise product A ∘ B (same shape), or A scaled by a number. */
export function mul(A: SparseMatrix, B: SparseMatrix | number): SparseMatrix {
    if (typeof B === "number") return scaleValues(A, NumericCore._re_v_mulVS, B);
    return binopSS(NumericCore._re_s_mulSS, A, B, "mul");
}

/** A divided by a number. */
export function div(A: SparseMatrix, s: number): SparseMatrix {
    return scaleValues(A, NumericCore._re_v_divVS, s);
}

/** −A */
export function neg(A: SparseMatrix): SparseMatrix {
    return new SparseMatrix(A.nrows, A.ncols, A.colPtr.slice(), A.rowIdx.slice(), NumericCore._re_v_neg(A.values, A.nnz));
}

/** Sparse × sparse product (Gustavson's algorithm, column by column). */
function dotSS(A: SparseMatrix, B: SparseMatrix): SparseMatrix {
    if (A.ncols !== B.nrows) throw new Error(`sparse.dot: shape mismatch, ${A.nrows}x${A.ncols} and ${B.nrows}x${B.ncols}`);
    const m = A.nrows, n = B.ncols;
    const Ap = A.colPtr, Ai = A.rowIdx, Av = A.values, Bp = B.colPtr, Bi = B.rowIdx, Bv = B.values;
    const x: number[] = new Array(m).fill(0);
    const mark = new Int32Array(m).fill(-1);
    const pattern: number[] = new Array(m);
    const cp = new Array(n + 1), ci: number[] = [], cv: number[] = [];
    let nz = 0;
    cp[0] = 0;
    for (let j = 0; j < n; j++) {
        let cnt = 0;
        for (let p = Bp[j]; p < Bp[j + 1]; p++) {
            const k = Bi[p], b = Bv[p];
            for (let q = Ap[k]; q < Ap[k + 1]; q++) {
                const i = Ai[q];
                if (mark[i] !== j) {
                    mark[i] = j;
                    pattern[cnt++] = i;
                    x[i] = Av[q] * b;
                } else {
                    x[i] += Av[q] * b;
                }
            }
        }
        // Keep rows sorted (canonical form)
        const rows = pattern.slice(0, cnt).sort((a, b) => a - b);
        for (const i of rows) {
            if (x[i] !== 0) {
                ci[nz] = i;
                cv[nz] = x[i];
                nz++;
            }
        }
        cp[j + 1] = nz;
    }
    return new SparseMatrix(m, n, cp, ci, cv);
}

/** Sparse matrix × dense vector. */
function dotSV(A: SparseMatrix, x: number[]): number[] {
    if (A.ncols !== x.length) throw new Error(`sparse.dot: shape mismatch, ${A.nrows}x${A.ncols} and ${x.length}`);
    const y: number[] = new Array(A.nrows).fill(0);
    const Ap = A.colPtr, Ai = A.rowIdx, Av = A.values;
    for (let j = 0; j < A.ncols; j++) {
        const xj = x[j];
        if (xj === 0) continue;
        for (let p = Ap[j]; p < Ap[j + 1]; p++) y[Ai[p]] += Av[p] * xj;
    }
    return y;
}

/** Dense row vector × sparse matrix. */
function dotVS(x: number[], A: SparseMatrix): number[] {
    if (A.nrows !== x.length) throw new Error(`sparse.dot: shape mismatch, ${x.length} and ${A.nrows}x${A.ncols}`);
    const y: number[] = new Array(A.ncols);
    const Ap = A.colPtr, Ai = A.rowIdx, Av = A.values;
    for (let j = 0; j < A.ncols; j++) {
        let s = 0;
        for (let p = Ap[j]; p < Ap[j + 1]; p++) s += Av[p] * x[Ai[p]];
        y[j] = s;
    }
    return y;
}

const isVectorLike = (x: unknown): x is VectorLike =>
    x instanceof Vector || (Array.isArray(x) && (x.length === 0 || typeof x[0] === "number"));

/**
 * Products involving a sparse matrix:
 * - sparse × sparse → SparseMatrix
 * - sparse × vector → Vector, vector × sparse → Vector
 * - sparse × dense matrix → Matrix, dense matrix × sparse → Matrix
 */
export function dot(A: SparseMatrix, B: SparseMatrix): SparseMatrix;
export function dot(A: SparseMatrix, x: VectorLike): Vector;
export function dot(x: VectorLike, A: SparseMatrix): Vector;
export function dot(A: SparseMatrix, B: MatrixLike): Matrix;
export function dot(B: MatrixLike, A: SparseMatrix): Matrix;
export function dot(a: SparseMatrix | VectorLike | MatrixLike, b: SparseMatrix | VectorLike | MatrixLike): SparseMatrix | Vector | Matrix {
    if (a instanceof SparseMatrix && b instanceof SparseMatrix) return dotSS(a, b);
    if (a instanceof SparseMatrix) {
        if (isVectorLike(b)) return new Vector(dotSV(a, toRawVector(b, "sparse.dot")));
        // Column by column of the dense right factor
        const B = toRawMatrix(b as MatrixLike, "sparse.dot");
        if (B.length !== a.ncols) throw new Error(`sparse.dot: shape mismatch, ${a.nrows}x${a.ncols} and ${B.length}x${B[0].length}`);
        const cols = B[0].map((_, j) => dotSV(a, B.map((row) => row[j])));
        return new Matrix(Array.from({ length: a.nrows }, (_, i) => cols.map((c) => c[i])));
    }
    if (b instanceof SparseMatrix) {
        if (isVectorLike(a)) return new Vector(dotVS(toRawVector(a, "sparse.dot"), b));
        const Arows = toRawMatrix(a as MatrixLike, "sparse.dot");
        return new Matrix(Arows.map((row) => dotVS(row, b)));
    }
    throw new Error("sparse.dot: at least one argument must be a SparseMatrix");
}

/**
 * Submatrix with the given rows and columns (in the given order; default: all).
 */
export function getBlock(A: SparseMatrix, rows?: VectorLike, cols?: VectorLike): SparseMatrix {
    const R = rows === undefined ? Array.from({ length: A.nrows }, (_, i) => i) : toRawVector(rows, "sparse.getBlock");
    const C = cols === undefined ? Array.from({ length: A.ncols }, (_, j) => j) : toRawVector(cols, "sparse.getBlock");
    // Map each original row to its positions in the block (rows may repeat)
    const where: number[][] = Array.from({ length: A.nrows }, () => []);
    R.forEach((r, k) => {
        if (!(r >= 0 && r < A.nrows)) throw new Error(`sparse.getBlock: row ${r} out of range`);
        where[r].push(k);
    });
    const cp = new Array(C.length + 1), ri: number[] = [], vv: number[] = [];
    let nz = 0;
    cp[0] = 0;
    for (let q = 0; q < C.length; q++) {
        const j = C[q];
        if (!(j >= 0 && j < A.ncols)) throw new Error(`sparse.getBlock: column ${j} out of range`);
        const entries: [number, number][] = [];
        for (let p = A.colPtr[j]; p < A.colPtr[j + 1]; p++) {
            for (const k of where[A.rowIdx[p]]) entries.push([k, A.values[p]]);
        }
        entries.sort((a, b) => a[0] - b[0]);
        for (const [k, v] of entries) {
            ri[nz] = k;
            vv[nz] = v;
            nz++;
        }
        cp[q + 1] = nz;
    }
    return new SparseMatrix(R.length, C.length, cp, ri, vv);
}
