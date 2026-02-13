import { BinaryMethod } from "../core/utils";
import type { TensorBase } from "../base";

/**
 * Element-wise addition of two tensors, or a tensor and a scalar.
 *
 * @param x     A tensor or scalar.
 * @param y     A tensor or scalar.
 * @returns     The element-wise sum.
 */
export function add(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "add").invoke();
}

/**
 * Element-wise subtraction of two tensors, or a tensor and a scalar.
 *
 * @param x     A tensor or scalar.
 * @param y     A tensor or scalar.
 * @returns     The element-wise difference.
 */
export function sub(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "sub").invoke();
}

/**
 * Element-wise multiplication of two tensors, or a tensor and a scalar.
 *
 * @param x     A tensor or scalar.
 * @param y     A tensor or scalar.
 * @returns     The element-wise product.
 */
export function mul(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "mul").invoke();
}

/**
 * Element-wise division of two tensors, or a tensor and a scalar.
 *
 * @param x     A tensor or scalar.
 * @param y     A tensor or scalar.
 * @returns     The element-wise quotient.
 */
export function div(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "div").invoke();
}

/**
 * Element-wise modulo of two tensors, or a tensor and a scalar.
 *
 * @param x     A tensor or scalar.
 * @param y     A tensor or scalar.
 * @returns     The element-wise remainder.
 */
export function mod(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "mod").invoke();
}

/**
 * Element-wise exponentiation of two tensors, or a tensor and a scalar.
 *
 * @param x     Base tensor or scalar.
 * @param y     Exponent tensor or scalar.
 * @returns     The element-wise power.
 */
export function pow(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "pow").invoke();
}

/**
 * Element-wise atan2 of two tensors, or a tensor and a scalar.
 *
 * @param x     Y-coordinate tensor or scalar.
 * @param y     X-coordinate tensor or scalar.
 * @returns     The element-wise atan2.
 */
export function atan2(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "atan2").invoke();
}

/**
 * Element-wise maximum of two tensors, or a tensor and a scalar.
 *
 * @param x     A tensor or scalar.
 * @param y     A tensor or scalar.
 * @returns     The element-wise maximum.
 */
export function max(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "max").invoke();
}

/**
 * Element-wise minimum of two tensors, or a tensor and a scalar.
 *
 * @param x     A tensor or scalar.
 * @param y     A tensor or scalar.
 * @returns     The element-wise minimum.
 */
export function min(x: TensorBase | number, y: TensorBase | number): number[] {
    return new BinaryMethod(x, y, "min").invoke();
}

/**
 * Element-wise equality test.
 */
export function eq(x: TensorBase | number, y: TensorBase | number): boolean[] {
    return new BinaryMethod(x, y, "eq").invoke();
}

/**
 * Element-wise inequality test.
 */
export function neq(x: TensorBase | number, y: TensorBase | number): boolean[] {
    return new BinaryMethod(x, y, "neq").invoke();
}

/**
 * Element-wise less-than test.
 */
export function lt(x: TensorBase | number, y: TensorBase | number): boolean[] {
    return new BinaryMethod(x, y, "lt").invoke();
}

/**
 * Element-wise greater-than test.
 */
export function gt(x: TensorBase | number, y: TensorBase | number): boolean[] {
    return new BinaryMethod(x, y, "gt").invoke();
}

/**
 * Element-wise less-than-or-equal test.
 */
export function leq(x: TensorBase | number, y: TensorBase | number): boolean[] {
    return new BinaryMethod(x, y, "leq").invoke();
}

/**
 * Element-wise greater-than-or-equal test.
 */
export function geq(x: TensorBase | number, y: TensorBase | number): boolean[] {
    return new BinaryMethod(x, y, "geq").invoke();
}