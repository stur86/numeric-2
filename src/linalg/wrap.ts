/**
 * Type aliases and helpers for linalg functions that accept both
 * raw arrays and TensorBase objects (Vector, Matrix).
 *
 * Internal algorithms operate on raw number[] / number[][] for performance.
 * These helpers extract raw arrays from TensorBase inputs at the boundary.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import type { CxMatrix } from "./cxmat";

/** A Matrix instance or a raw 2D array. */
export type MatrixLike = Matrix | number[][];

/** A Vector instance or a raw 1D array. */
export type VectorLike = Vector | number[];

/**
 * Extract the raw real matrix data from a MatrixLike input.
 * Throws if given a complex Matrix, rather than silently dropping its imaginary part.
 */
export function toRawMatrix(x: MatrixLike, fname: string = "This function"): number[][] {
    if (x instanceof Matrix) {
        if (x.is_complex) throw new Error(`${fname} does not support complex matrices`);
        return x.real as number[][];
    }
    return x;
}

/**
 * Extract the raw real vector data from a VectorLike input.
 * Throws if given a complex Vector, rather than silently dropping its imaginary part.
 */
export function toRawVector(x: VectorLike, fname: string = "This function"): number[] {
    if (x instanceof Vector) {
        if (x.is_complex) throw new Error(`${fname} does not support complex vectors`);
        return x.real as number[];
    }
    return x;
}

/** Extract raw real data from a scalar, VectorLike or MatrixLike input. */
export function toRaw(x: number | VectorLike | MatrixLike, fname: string = "This function"): number | number[] | number[][] {
    if (x instanceof Matrix) return toRawMatrix(x, fname);
    if (x instanceof Vector) return toRawVector(x, fname);
    return x;
}

/** Throw unless the raw matrix is square. */
export function assertSquare(A: number[][], fname: string): void {
    const n = A.length;
    for (let i = 0; i < n; i++) {
        if (A[i].length !== n) {
            throw new Error(`${fname} requires a square matrix, got ${n}x${A[i].length}`);
        }
    }
}

/** Extract a CxMatrix from a MatrixLike. For raw number[][], imag is null. */
export function toRawCxMatrix(x: MatrixLike): CxMatrix {
    if (x instanceof Matrix) {
        return [x.real as number[][], x.imag as number[][] | null];
    }
    return [x, null];
}

/** A Vector, Matrix, or a raw 1D/2D array. */
export type TensorLike = VectorLike | MatrixLike;

/** `Matrix` if T is matrix-like, otherwise `Vector`. */
export type TensorOf<T> = T extends MatrixLike ? Matrix : Vector;

/** Wrap a raw 1D/2D array in a Vector/Matrix; tensors pass through. */
export function toTensor(x: TensorLike): Vector | Matrix {
    if (x instanceof Vector || x instanceof Matrix) return x;
    if (Array.isArray(x[0])) return new Matrix(x as number[][]);
    return new Vector(x as number[]);
}

/**
 * Wrap a raw kernel result as a Vector or Matrix.
 * Complex results arrive as an [re, im] pair; `complex` says which form to expect.
 */
export function wrapTensor(raw: any, complex: boolean, matrix: boolean): Vector | Matrix {
    if (complex) {
        return matrix ? new Matrix(raw[0], raw[1]) : new Vector(raw[0], raw[1]);
    }
    return matrix ? new Matrix(raw) : new Vector(raw);
}
