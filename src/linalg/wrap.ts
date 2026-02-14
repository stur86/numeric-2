/**
 * Type aliases and helpers for linalg functions that accept both
 * raw arrays and TensorBase objects (Vector, Matrix).
 *
 * Internal algorithms operate on raw number[] / number[][] for performance.
 * These helpers extract raw arrays from TensorBase inputs at the boundary.
 */

import Vector from "../vector";
import Matrix from "../matrix";

/** A Matrix instance or a raw 2D array. */
export type MatrixLike = Matrix | number[][];

/** A Vector instance or a raw 1D array. */
export type VectorLike = Vector | number[];

/** Extract the raw real matrix data from a MatrixLike input. */
export function toRawMatrix(x: MatrixLike): number[][] {
    if (x instanceof Matrix) return x.real as number[][];
    return x;
}

/** Extract the raw real vector data from a VectorLike input. */
export function toRawVector(x: VectorLike): number[] {
    if (x instanceof Vector) return x.real as number[];
    return x;
}
