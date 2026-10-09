import { dotVV, dotMV, dotVM, dotMMsmall, dotMMbig } from "../core/dot";
import { dim } from "../utils";
import Vector from "../vector";
import Matrix from "../matrix";
import { type MatrixLike, type VectorLike, toRaw } from "./wrap";

/** Any operand accepted by dot(). */
export type DotOperand = number | VectorLike | MatrixLike;

/** Multiply every element of a raw vector by a scalar. */
function scaleV(x: number[], a: number): number[] {
    const n = x.length;
    const ret = Array(n);
    for (let i = n - 1; i >= 0; i--) ret[i] = x[i] * a;
    return ret;
}

/** Multiply every element of a raw matrix by a scalar. */
function scaleM(X: number[][], a: number): number[][] {
    const m = X.length;
    const ret: number[][] = Array(m);
    for (let i = m - 1; i >= 0; i--) ret[i] = scaleV(X[i], a);
    return ret;
}

/**
 * General dot product / matrix multiplication.
 *
 * Dispatches based on the dimensionality of the inputs:
 * - 1D × 1D → scalar (vector dot product)
 * - 2D × 1D → Vector (matrix-vector product)
 * - 1D × 2D → Vector (row-vector × matrix)
 * - 2D × 2D → Matrix (matrix multiplication)
 * - scalar × any / any × scalar → element-wise scaling
 *
 * Only real inputs are supported.
 *
 * @param x     A scalar, vector, or matrix.
 * @param y     A scalar, vector, or matrix.
 * @returns     The dot product result.
 */
export function dot(x: number, y: number): number;
export function dot(x: VectorLike, y: VectorLike): number;
export function dot(x: MatrixLike, y: VectorLike): Vector;
export function dot(x: VectorLike, y: MatrixLike): Vector;
export function dot(x: MatrixLike, y: MatrixLike): Matrix;
export function dot(x: number, y: VectorLike): Vector;
export function dot(x: VectorLike, y: number): Vector;
export function dot(x: number, y: MatrixLike): Matrix;
export function dot(x: MatrixLike, y: number): Matrix;
export function dot(a: DotOperand, b: DotOperand): number | Vector | Matrix;
export function dot(a: DotOperand, b: DotOperand): number | Vector | Matrix {
    const x: any = toRaw(a, "dot");
    const y: any = toRaw(b, "dot");
    const dx = dim(x);
    const dy = dim(y);
    if (dx.length > 0 && dy.length > 0 && dx[dx.length - 1] !== dy[0]) {
        throw new Error(`dot: shape mismatch, ${dx.join("x")} and ${dy.join("x")}`);
    }

    switch (dx.length * 1000 + dy.length) {
        case 2002: // matrix × matrix
            if ((y as number[][]).length < 10) {
                return new Matrix(dotMMsmall(x, y));
            }
            return new Matrix(dotMMbig(x, y));
        case 2001: // matrix × vector
            return new Vector(dotMV(x, y));
        case 1002: // vector × matrix
            return new Vector(dotVM(x, y));
        case 1001: // vector × vector
            return dotVV(x, y);
        case 1000: // vector × scalar
            return new Vector(scaleV(x, y));
        case 1: // scalar × vector
            return new Vector(scaleV(y, x));
        case 2000: // matrix × scalar
            return new Matrix(scaleM(x, y));
        case 2: // scalar × matrix
            return new Matrix(scaleM(y, x));
        case 0: // scalar × scalar
            return x * y;
        default:
            throw new Error(`Unsupported dot product dimensions: ${dx.length} × ${dy.length}`);
    }
}

export { dotVV, dotMV, dotVM, dotMMsmall, dotMMbig };