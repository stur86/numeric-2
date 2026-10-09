import { BinaryMethod, fastBinary } from "../core/utils";
import Vector from "../vector";
import Matrix from "../matrix";
import Tensor from "../tensor";
import type { NestedArray } from "../base";
import { type TensorLike, type MatrixLike, type NDArray, toTensor, wrapTensor } from "./wrap";
import { type Complex, type Scalar, isComplex } from "../complex";

/** An operand of an element-wise binary op: a vector, matrix (or raw array) or a real/complex scalar. */
export type Operand = TensorLike | Scalar;

/** N-D operands (Tensor or raw arrays nested three or more deep). */
type ND = Tensor | NDArray;

/** Result type of an arithmetic op: `Tensor` if either operand is N-D, else `Matrix` if either is a matrix, else `Vector`. */
export type ArithResult<X, Y> =
    X extends ND ? Tensor : Y extends ND ? Tensor : X extends MatrixLike ? Matrix : Y extends MatrixLike ? Matrix : Vector;

/** Result type of a comparison: nested boolean arrays matching the operands' shape. */
export type CompareResult<X, Y> =
    X extends ND ? NestedArray<boolean> : Y extends ND ? NestedArray<boolean>
    : X extends MatrixLike ? boolean[][] : Y extends MatrixLike ? boolean[][] : boolean[];

function asTensor(x: Operand): Vector | Matrix | Tensor | number | Complex {
    return typeof x === "number" || isComplex(x) ? x : toTensor(x as TensorLike);
}

/** Run an arithmetic kernel and wrap its result (real or complex) in a Vector/Matrix. */
function arith(x: Operand, y: Operand, name: string): any {
    const method = new BinaryMethod(asTensor(x), asTensor(y), name);
    return wrapTensor(method.invoke(), method.dtype === "cx", method.optype);
}

/** Run a comparison kernel. Results stay as boolean arrays, since tensors hold numbers. */
function compare(x: Operand, y: Operand, name: string): any {
    return new BinaryMethod(asTensor(x), asTensor(y), name).invoke();
}

const toVector = (raw: number[]) => new Vector(raw);
const toMatrix = (raw: number[][]) => new Matrix(raw);
const same = (raw: any) => raw;

/** An arithmetic op: real fast path, general dispatcher otherwise. */
const arithOp = (name: string) => fastBinary<any>(name, toVector, toMatrix, (x, y) => arith(x, y, name));
/** A comparison op: real fast path, general dispatcher otherwise. */
const compareOp = (name: string) => fastBinary<any>(name, same, same, (x, y) => compare(x, y, name));

const OPS = {
    add: arithOp("add"), sub: arithOp("sub"), mul: arithOp("mul"), div: arithOp("div"),
    mod: arithOp("mod"), pow: arithOp("pow"), atan2: arithOp("atan2"), max: arithOp("max"), min: arithOp("min"),
    eq: compareOp("eq"), neq: compareOp("neq"), lt: compareOp("lt"), gt: compareOp("gt"),
    leq: compareOp("leq"), geq: compareOp("geq"),
    and: compareOp("and"), or: compareOp("or"),
    band: arithOp("band"), bor: arithOp("bor"), bxor: arithOp("bxor"),
    lshift: arithOp("lshift"), rshift: arithOp("rshift"), rrshift: arithOp("rrshift"),
    trunc: arithOp("trunc"),
};

/** Operand of a logical op: also accepts boolean arrays (e.g. comparison results). */
export type LogicalOperand = Operand | boolean | boolean[] | boolean[][];

/** Result type of a logical op: `boolean[][]` if either operand is a matrix, else `boolean[]`. */
export type LogicalResult<X, Y> =
    X extends ND ? NestedArray<boolean> : Y extends ND ? NestedArray<boolean>
    : X extends MatrixLike | boolean[][] ? boolean[][] : Y extends MatrixLike | boolean[][] ? boolean[][] : boolean[];

/**
 * Element-wise addition of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise sum.
 */
export function add<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.add(x, y);
}

/**
 * Element-wise subtraction of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise difference.
 */
export function sub<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.sub(x, y);
}

/**
 * Element-wise multiplication of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise product.
 */
export function mul<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.mul(x, y);
}

/**
 * Element-wise division of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise quotient.
 */
export function div<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.div(x, y);
}

/**
 * Element-wise modulo of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise remainder.
 */
export function mod<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.mod(x, y);
}

/**
 * Element-wise exponentiation of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     Base tensor or scalar.
 * @param y     Exponent tensor or scalar.
 * @returns     The element-wise power.
 */
export function pow<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.pow(x, y);
}

/**
 * Element-wise atan2 of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     Y-coordinate tensor or scalar.
 * @param y     X-coordinate tensor or scalar.
 * @returns     The element-wise atan2.
 */
export function atan2<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.atan2(x, y);
}

/**
 * Element-wise maximum of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise maximum.
 */
export function max<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.max(x, y);
}

/**
 * Element-wise minimum of two tensors of the same shape, or a tensor and a scalar.
 *
 * @param x     A vector, matrix or scalar.
 * @param y     A vector, matrix or scalar.
 * @returns     The element-wise minimum.
 */
export function min<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.min(x, y);
}

/**
 * Element-wise equality test.
 */
export function eq<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return OPS.eq(x, y);
}

/**
 * Element-wise inequality test.
 */
export function neq<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return OPS.neq(x, y);
}

/**
 * Element-wise less-than test.
 */
export function lt<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return OPS.lt(x, y);
}

/**
 * Element-wise greater-than test.
 */
export function gt<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return OPS.gt(x, y);
}

/**
 * Element-wise less-than-or-equal test.
 */
export function leq<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return OPS.leq(x, y);
}

/**
 * Element-wise greater-than-or-equal test.
 */
export function geq<X extends Operand, Y extends Operand>(x: X, y: Y): CompareResult<X, Y> {
    return OPS.geq(x, y);
}

/**
 * Element-wise logical AND, as booleans (numbers count as true when nonzero).
 * Unlike numeric.js, which returns one of the operands (JavaScript's &&),
 * the result is always boolean.
 */
export function and<X extends LogicalOperand, Y extends LogicalOperand>(x: X, y: Y): LogicalResult<X, Y> {
    return OPS.and(x, y);
}

/** Element-wise logical OR, as booleans (numbers count as true when nonzero). */
export function or<X extends LogicalOperand, Y extends LogicalOperand>(x: X, y: Y): LogicalResult<X, Y> {
    return OPS.or(x, y);
}

/** Element-wise bitwise AND (operands converted to 32-bit integers). */
export function band<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.band(x, y);
}

/** Element-wise bitwise OR (operands converted to 32-bit integers). */
export function bor<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.bor(x, y);
}

/** Element-wise bitwise XOR (operands converted to 32-bit integers). */
export function bxor<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.bxor(x, y);
}

/** Element-wise left shift, x << y. */
export function lshift<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.lshift(x, y);
}

/** Element-wise sign-propagating right shift, x >> y. */
export function rshift<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.rshift(x, y);
}

/** Element-wise zero-fill right shift, x >>> y. */
export function rrshift<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.rrshift(x, y);
}

/** Element-wise rounding of x to the nearest multiple of y: round(x / y) · y. */
export function trunc<X extends Operand, Y extends Operand>(x: X, y: Y): ArithResult<X, Y> {
    return OPS.trunc(x, y);
}