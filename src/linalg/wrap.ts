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
