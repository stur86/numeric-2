/**
 * Type aliases and helpers for linalg functions that accept both
 * raw arrays and TensorBase objects (Vector, Matrix).
 *
 * Internal algorithms operate on raw number[] / number[][] for performance.
 * These helpers extract raw arrays from TensorBase inputs at the boundary.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import Tensor from "../tensor";
import type { CxMatrix, CxVector } from "./cxmat";

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

/** A raw nested array with three or more dimensions. */
export type NDArray = readonly (readonly (readonly unknown[])[])[];

/** A Tensor, or a raw nested array with three or more dimensions. */
export type NDLike = Tensor | number[][][] | NDArray;

/** A Vector, Matrix, Tensor, or a raw nested array of any depth. */
export type TensorLike = VectorLike | MatrixLike | NDLike;

/** `Tensor` for N-D input, `Matrix` for matrix-like, otherwise `Vector`. */
export type TensorOf<T> = T extends Tensor | NDArray ? Tensor : T extends MatrixLike ? Matrix : Vector;

/** Wrap a raw array in a Vector (1-D), Matrix (2-D) or Tensor (3+ D); tensors pass through. */
export function toTensor(x: TensorLike): Vector | Matrix | Tensor {
    if (x instanceof Vector || x instanceof Matrix || x instanceof Tensor) return x;
    const a = x as any[];
    if (Array.isArray(a[0])) return Array.isArray(a[0][0]) ? new Tensor(a as any) : new Matrix(a as number[][]);
    return new Vector(a as number[]);
}

/**
 * Wrap a raw kernel result as a Vector ("v"), Matrix ("m") or Tensor ("t").
 * Complex results arrive as an [re, im] pair; `complex` says which form to expect.
 */
export function wrapTensor(raw: any, complex: boolean, optype: string): Vector | Matrix | Tensor {
    const make = (re: any, im: any) =>
        optype === "t" ? new Tensor(re, im) : optype === "m" ? new Matrix(re, im) : new Vector(re, im);
    return complex ? make(raw[0], raw[1]) : make(raw, null);
}

/** True if x is a complex Vector/Matrix. Raw arrays are always real. */
export function isComplexTensor(x: unknown): boolean {
    return (x instanceof Vector || x instanceof Matrix) && x.is_complex;
}

/** Extract a CxVector from a VectorLike. For raw number[], imag is null. */
export function toRawCxVector(x: VectorLike): CxVector {
    if (x instanceof Vector) {
        return [x.real as number[], x.imag as number[] | null];
    }
    return [x, null];
}
