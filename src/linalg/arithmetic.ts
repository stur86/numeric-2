import { BinaryMethod } from "../core/utils";
import Vector from "../vector";
import type { VectorLike } from "./wrap";

/** An operand of an element-wise binary op: a vector (or raw array) or a scalar. */
export type Operand = VectorLike | number;

function asTensor(x: Operand): Vector | number {
    return Array.isArray(x) ? new Vector(x) : x;
}

/** Run an arithmetic kernel and wrap its result (real or complex) in a Vector. */
function arith(x: Operand, y: Operand, name: string): Vector {
    const method = new BinaryMethod(asTensor(x), asTensor(y), name);
    const result = method.invoke();
    if (method.dtype === "cx") {
        return new Vector(result[0], result[1]);
    }
    return new Vector(result);
}

/** Run a comparison kernel. Results stay as boolean[], since Vector holds numbers. */
function compare(x: Operand, y: Operand, name: string): boolean[] {
    return new BinaryMethod(asTensor(x), asTensor(y), name).invoke();
}

/**
 * Element-wise addition of two tensors, or a tensor and a scalar.
 *
 * @param x     A vector or scalar.
 * @param y     A vector or scalar.
 * @returns     The element-wise sum.
 */
export function add(x: Operand, y: Operand): Vector {
    return arith(x, y, "add");
}

/**
 * Element-wise subtraction of two tensors, or a tensor and a scalar.
 *
 * @param x     A vector or scalar.
 * @param y     A vector or scalar.
 * @returns     The element-wise difference.
 */
export function sub(x: Operand, y: Operand): Vector {
    return arith(x, y, "sub");
}

/**
 * Element-wise multiplication of two tensors, or a tensor and a scalar.
 *
 * @param x     A vector or scalar.
 * @param y     A vector or scalar.
 * @returns     The element-wise product.
 */
export function mul(x: Operand, y: Operand): Vector {
    return arith(x, y, "mul");
}

/**
 * Element-wise division of two tensors, or a tensor and a scalar.
 *
 * @param x     A vector or scalar.
 * @param y     A vector or scalar.
 * @returns     The element-wise quotient.
 */
export function div(x: Operand, y: Operand): Vector {
    return arith(x, y, "div");
}

/**
 * Element-wise modulo of two tensors, or a tensor and a scalar.
 *
 * @param x     A vector or scalar.
 * @param y     A vector or scalar.
 * @returns     The element-wise remainder.
 */
export function mod(x: Operand, y: Operand): Vector {
    return arith(x, y, "mod");
}

/**
 * Element-wise exponentiation of two tensors, or a tensor and a scalar.
 *
 * @param x     Base tensor or scalar.
 * @param y     Exponent tensor or scalar.
 * @returns     The element-wise power.
 */
export function pow(x: Operand, y: Operand): Vector {
    return arith(x, y, "pow");
}

/**
 * Element-wise atan2 of two tensors, or a tensor and a scalar.
 *
 * @param x     Y-coordinate tensor or scalar.
 * @param y     X-coordinate tensor or scalar.
 * @returns     The element-wise atan2.
 */
export function atan2(x: Operand, y: Operand): Vector {
    return arith(x, y, "atan2");
}

/**
 * Element-wise maximum of two tensors, or a tensor and a scalar.
 *
 * @param x     A vector or scalar.
 * @param y     A vector or scalar.
 * @returns     The element-wise maximum.
 */
export function max(x: Operand, y: Operand): Vector {
    return arith(x, y, "max");
}

/**
 * Element-wise minimum of two tensors, or a tensor and a scalar.
 *
 * @param x     A vector or scalar.
 * @param y     A vector or scalar.
 * @returns     The element-wise minimum.
 */
export function min(x: Operand, y: Operand): Vector {
    return arith(x, y, "min");
}

/**
 * Element-wise equality test.
 */
export function eq(x: Operand, y: Operand): boolean[] {
    return compare(x, y, "eq");
}

/**
 * Element-wise inequality test.
 */
export function neq(x: Operand, y: Operand): boolean[] {
    return compare(x, y, "neq");
}

/**
 * Element-wise less-than test.
 */
export function lt(x: Operand, y: Operand): boolean[] {
    return compare(x, y, "lt");
}

/**
 * Element-wise greater-than test.
 */
export function gt(x: Operand, y: Operand): boolean[] {
    return compare(x, y, "gt");
}

/**
 * Element-wise less-than-or-equal test.
 */
export function leq(x: Operand, y: Operand): boolean[] {
    return compare(x, y, "leq");
}

/**
 * Element-wise greater-than-or-equal test.
 */
export function geq(x: Operand, y: Operand): boolean[] {
    return compare(x, y, "geq");
}