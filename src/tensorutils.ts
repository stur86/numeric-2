/**
 * Public utility functions that accept either raw arrays or Vector/Matrix.
 *
 * Raw arrays in → raw arrays out (as in numeric.js); Vector/Matrix in →
 * Vector/Matrix out, including complex ones. Internal algorithms use the
 * raw-only versions in utils.ts directly.
 */

import Vector from "./vector";
import Matrix from "./matrix";
import * as raw from "./utils";

/** Deep copy. */
export function clone(x: number[]): number[];
export function clone(x: number[][]): number[][];
export function clone(x: Vector): Vector;
export function clone(x: Matrix): Matrix;
export function clone(x: any): any {
    if (x instanceof Vector || x instanceof Matrix) return x.clone();
    return raw.clone(x);
}

/** Transpose (no conjugation). */
export function transpose(x: number[][]): number[][];
export function transpose(x: Matrix): Matrix;
export function transpose(x: number[][] | Matrix): number[][] | Matrix {
    return x instanceof Matrix ? x.transpose() : raw.transpose(x);
}

/** Negated transpose, −Aᵀ. */
export function negtranspose(x: number[][]): number[][];
export function negtranspose(x: Matrix): Matrix;
export function negtranspose(x: number[][] | Matrix): number[][] | Matrix {
    if (!(x instanceof Matrix)) return raw.negtranspose(x);
    return new Matrix(raw.negtranspose(x.real as number[][]), x.imag === null ? null : raw.negtranspose(x.imag as number[][]));
}

/** Conjugate transpose (the transpose, for real input). */
export function transjugate(x: number[][]): number[][];
export function transjugate(x: Matrix): Matrix;
export function transjugate(x: number[][] | Matrix): number[][] | Matrix {
    return x instanceof Matrix ? x.transjugate() : raw.transpose(x);
}

/** Main diagonal. */
export function getDiag(A: number[][]): number[];
export function getDiag(A: Matrix): Vector;
export function getDiag(A: number[][] | Matrix): number[] | Vector {
    return A instanceof Matrix ? A.getDiag() : raw.getDiag(A);
}

/** Block of rows [r0, r1) and columns [c0, c1) (half-open, like Array.slice). */
export function getBlock(A: number[][], r0: number, c0: number, r1: number, c1: number): number[][];
export function getBlock(A: Matrix, r0: number, c0: number, r1?: number, c1?: number): Matrix;
export function getBlock(A: number[][] | Matrix, r0: number, c0: number, r1?: number, c1?: number): number[][] | Matrix {
    if (A instanceof Matrix) return A.getBlock(r0, c0, r1, c1);
    return raw.getBlock(A, r0, c0, r1 ?? A.length, c1 ?? A[0].length);
}

/** Elements [from, to) of a vector. */
export function getBlock1D(x: number[], from: number, to: number): number[];
export function getBlock1D(x: Vector, from: number, to?: number): Vector;
export function getBlock1D(x: number[] | Vector, from: number, to?: number): number[] | Vector {
    if (x instanceof Vector) return x.getBlock(from, to);
    return raw.getBlock1D(x, from, to ?? x.length);
}

/** Write B into A (in place) with its top-left corner at (r0, c0). Returns A. */
export function setBlock(A: number[][], r0: number, c0: number, B: number[][]): number[][];
export function setBlock(A: Matrix, r0: number, c0: number, B: Matrix | number[][]): Matrix;
export function setBlock(A: number[][] | Matrix, r0: number, c0: number, B: any): number[][] | Matrix {
    if (A instanceof Matrix) return A.setBlock(r0, c0, B);
    return raw.setBlock(A, r0, c0, B instanceof Matrix ? B.real as number[][] : B);
}

/** Submatrix of the given rows and columns, in the given order. */
export function getRange(A: number[][], rows: number[], cols: number[]): number[][];
export function getRange(A: Matrix, rows: number[], cols: number[]): Matrix;
export function getRange(A: number[][] | Matrix, rows: number[], cols: number[]): number[][] | Matrix {
    return A instanceof Matrix ? A.getRange(rows, cols) : raw.getRange(A, rows, cols);
}

/**
 * Assemble a matrix from a grid of blocks. Raw blocks give a raw result;
 * if any block is a Matrix, the result is a Matrix (complex if any block is).
 */
export function blockMatrix(blocks: number[][][][]): number[][];
export function blockMatrix(blocks: (Matrix | number[][])[][]): Matrix;
export function blockMatrix(blocks: (Matrix | number[][])[][]): number[][] | Matrix {
    if (blocks.some((br) => br.some((B) => B instanceof Matrix))) return Matrix.block(blocks);
    return raw.blockMatrix(blocks as number[][][][]);
}

/** Outer product x yᵀ (no conjugation). */
export function tensor(x: number[], y: number[]): number[][];
export function tensor(x: Vector, y: Vector | number[]): Matrix;
export function tensor(x: number[] | Vector, y: Vector | number[]): Matrix | number[][];
export function tensor(x: number[] | Vector, y: number[] | Vector): number[][] | Matrix {
    if (!(x instanceof Vector) && !(y instanceof Vector)) return raw.tensor(x, y);
    const a = x instanceof Vector ? x : new Vector(x), b = y instanceof Vector ? y : new Vector(y);
    const ar = a.real as number[], ai = a.imag as number[] | null, br = b.real as number[], bi = b.imag as number[] | null;
    if (ai === null && bi === null) return new Matrix(raw.tensor(ar, br));
    // (ar + i·ai) ⊗ (br + i·bi) = (ar⊗br − ai⊗bi) + i·(ar⊗bi + ai⊗br)
    const zr = new Array(ar.length).fill(0), zb = new Array(br.length).fill(0);
    const rr = raw.tensor(ar, br), ii = raw.tensor(ai ?? zr, bi ?? zb);
    const ri = raw.tensor(ar, bi ?? zb), ir = raw.tensor(ai ?? zr, br);
    return new Matrix(rr.map((row, i) => row.map((v, j) => v - ii[i][j])), ri.map((row, i) => row.map((v, j) => v + ir[i][j])));
}

/** Exact equality of shape and contents (real and imaginary parts). */
export function same(x: any, y: any): boolean {
    const isT = (t: unknown) => t instanceof Vector || t instanceof Matrix;
    if (isT(x) || isT(y)) {
        if (!isT(x) || !isT(y) || x.constructor !== y.constructor) return false;
        if (!raw.same(x.real, y.real)) return false;
        if (x.imag === null || y.imag === null) return x.imag === y.imag || raw.same(x.imag ?? raw.rep(x.shape, 0), y.imag ?? raw.rep(y.shape, 0));
        return raw.same(x.imag, y.imag);
    }
    return raw.same(x, y);
}
