import { dotVV, dotMV, dotVM, dotMMsmall, dotMMbig } from "../core/dot";
import { dim } from "../utils";
import Vector from "../vector";
import Matrix from "../matrix";
import { type Complex, type Scalar, isComplex } from "../complex";
import { type MatrixLike, type VectorLike, toRaw, isComplexTensor } from "./wrap";
import { cxDotVV, cxDotMV, cxDotVM, cxDotMM } from "./cxmat";
import { mul } from "./arithmetic";

/** Any operand accepted by dot(). */
export type DotOperand = Scalar | VectorLike | MatrixLike;

/** Split a tensor (or raw array) into [re, im | null]. */
function cxParts(x: VectorLike | MatrixLike): [any, any] {
    if (x instanceof Vector || x instanceof Matrix) return [x.real, x.imag];
    return [x, null];
}

/**
 * General dot product / matrix multiplication.
 *
 * Dispatches based on the dimensionality of the inputs:
 * - 1D × 1D → scalar (vector dot product, unconjugated)
 * - 2D × 1D → Vector (matrix-vector product)
 * - 1D × 2D → Vector (row-vector × matrix)
 * - 2D × 2D → Matrix (matrix multiplication)
 * - scalar × any / any × scalar → element-wise scaling
 *
 * Real and complex operands are both supported. A 1D × 1D product of
 * tensors is typed `Scalar`: it is a Complex if either operand is complex.
 *
 * @param x     A scalar, vector, or matrix.
 * @param y     A scalar, vector, or matrix.
 * @returns     The dot product result.
 */
export function dot(x: number, y: number): number;
export function dot(x: number[], y: number[]): number;
export function dot(x: Scalar, y: Scalar): Scalar;
export function dot(x: VectorLike, y: VectorLike): Scalar;
export function dot(x: MatrixLike, y: VectorLike): Vector;
export function dot(x: VectorLike, y: MatrixLike): Vector;
export function dot(x: MatrixLike, y: MatrixLike): Matrix;
export function dot(x: Scalar, y: VectorLike): Vector;
export function dot(x: VectorLike, y: Scalar): Vector;
export function dot(x: Scalar, y: MatrixLike): Matrix;
export function dot(x: MatrixLike, y: Scalar): Matrix;
export function dot(a: DotOperand, b: DotOperand): Scalar | Vector | Matrix;
export function dot(a: DotOperand, b: DotOperand): Scalar | Vector | Matrix {
    const aScalar = typeof a === "number" || isComplex(a);
    const bScalar = typeof b === "number" || isComplex(b);

    if (aScalar && bScalar) {
        if (typeof a === "number" && typeof b === "number") return a * b;
        const [ar, ai] = typeof a === "number" ? [a, 0] : [a.re, a.im];
        const [br, bi] = typeof b === "number" ? [b, 0] : [b.re, b.im];
        return { re: ar * br - ai * bi, im: ar * bi + ai * br } as Complex;
    }
    if (aScalar || bScalar) {
        // Scaling: delegate to element-wise multiplication
        return mul(a as any, b as any) as Vector | Matrix;
    }

    if (isComplexTensor(a) || isComplexTensor(b)) {
        return cxDot(a as VectorLike | MatrixLike, b as VectorLike | MatrixLike);
    }

    const x: any = toRaw(a as VectorLike | MatrixLike, "dot");
    const y: any = toRaw(b as VectorLike | MatrixLike, "dot");
    const dx = dim(x);
    const dy = dim(y);
    checkShapes(dx, dy);

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
        default:
            throw new Error(`Unsupported dot product dimensions: ${dx.length} × ${dy.length}`);
    }
}

function checkShapes(dx: number[], dy: number[]): void {
    if (dx[dx.length - 1] !== dy[0]) {
        throw new Error(`dot: shape mismatch, ${dx.join("x")} and ${dy.join("x")}`);
    }
}

/** Tensor × tensor product where at least one side is complex. */
function cxDot(a: VectorLike | MatrixLike, b: VectorLike | MatrixLike): Scalar | Vector | Matrix {
    const x = cxParts(a);
    const y = cxParts(b);
    const dx = dim(x[0]);
    const dy = dim(y[0]);
    checkShapes(dx, dy);

    switch (dx.length * 1000 + dy.length) {
        case 2002: {
            const [re, im] = cxDotMM(x, y);
            return new Matrix(re, im);
        }
        case 2001: {
            const [re, im] = cxDotMV(x, y);
            return new Vector(re, im);
        }
        case 1002: {
            const [re, im] = cxDotVM(x, y);
            return new Vector(re, im);
        }
        case 1001: {
            const [re, im] = cxDotVV(x, y);
            return { re, im } as Complex;
        }
        default:
            throw new Error(`Unsupported dot product dimensions: ${dx.length} × ${dy.length}`);
    }
}

export { dotVV, dotMV, dotVM, dotMMsmall, dotMMbig };