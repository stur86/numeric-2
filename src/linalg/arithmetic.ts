import { BinaryMethod } from "../core/utils";
import type Vector from "../vector";
import type Matrix from "../matrix";
import { type TensorLike, type MatrixLike, toTensor, wrapTensor } from "./wrap";
import { type Complex, type Scalar, isComplex } from "../complex";

/** An operand of an element-wise binary op: a vector, matrix (or raw array) or a real/complex scalar. */
export type Operand = TensorLike | Scalar;

/** Result type of an arithmetic op: `Matrix` if either operand is a matrix, else `Vector`. */
export type ArithResult<X, Y> = X extends MatrixLike ? Matrix : Y extends MatrixLike ? Matrix : Vector;

/** Result type of a comparison: `boolean[][]` if either operand is a matrix, else `boolean[]`. */
export type CompareResult<X, Y> = X extends MatrixLike ? boolean[][] : Y extends MatrixLike ? boolean[][] : boolean[];

function asTensor(x: Operand): Vector | Matrix | number | Complex {
    return typeof x === "number" || isComplex(x) ? x : toTensor(x as TensorLike);
}

/** Run an arithmetic kernel and wrap its result (real or complex) in a Vector/Matrix. */
function arith(x: Operand, y: Operand, name: string): any {
    const method = new BinaryMethod(asTensor(x), asTensor(y), name);
    return wrapTensor(method.invoke(), method.dtype === "cx", method.optype === "m");
}

/** Run a comparison kernel. Results stay as boolean arrays, since tensors hold numbers. */
function compare(x: Operand, y: Operand, name: string): any {
    return new BinaryMethod(asTensor(x), asTensor(y), name).invoke();
}

/**
 * Element-wise addition of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise sum.
 */
export function add<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "add");
}

/**
 * Element-wise subtraction of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise difference.
 */
export function sub<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "sub");
}

/**
 * Element-wise multiplication of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise product.
 */
export function mul<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "mul");
}

/**
 * Element-wise division of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise quotient.
 */
export function div<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "div");
}

/**
 * Element-wise modulo of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise remainder.
 */
export function mod<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "mod");
}

/**
 * Element-wise exponentiation of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     Base tensor or scalar.
 * @param y     Exponent tensor or scalar.
 * @returns     The element-wise power.
 */
export function pow<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "pow");
}

/**
 * Element-wise atan2 of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     Y-coordinate tensor or scalar.
 * @param y     X-coordinate tensor or scalar.
 * @returns     The element-wise atan2.
 */
export function atan2<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "atan2");
}

/**
 * Element-wise maximum of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise maximum.
 */
export function max<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "max");
}

/**
 * Element-wise minimum of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise minimum.
 */
export function min<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return arith(x, y, "min");
}

/**
 * Element-wise equality test.
 */
export function eq<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return compare(x, y, "eq");
}

/**
 * Element-wise inequality test.
 */
export function neq<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return compare(x, y, "neq");
}

/**
 * Element-wise less-than test.
 */
export function lt<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return compare(x, y, "lt");
}

/**
 * Element-wise greater-than test.
 */
export function gt<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return compare(x, y, "gt");
}

/**
 * Element-wise less-than-or-equal test.
 */
export function leq<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return compare(x, y, "leq");
}

/**
 * Element-wise greater-than-or-equal test.
 */
export function geq<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return compare(x, y, "geq");
}