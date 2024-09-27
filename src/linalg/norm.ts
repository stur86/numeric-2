import { UnaryMethod } from "../core/utils";
import type { TensorBase } from "../base";


/**
 * Compute the 2-norm of a tensor.
 * 
 * @param x     A tensor.
 * @returns     The 2-norm of the tensor.
 */
export function norm2(x: TensorBase): number {
    return new UnaryMethod(x, "norm2").invoke();
}

/**
 * Compute the squared 2-norm of a tensor.
 * 
 * @param x     A tensor.
 * @returns     The squared 2-norm of the tensor.
 */
export function norm2squared(x: TensorBase): number {
    return new UnaryMethod(x, "norm2squared").invoke();
}

/**
 * Compute the 1-norm of a tensor.
 * 
 * @param x     A tensor.
 * @returns     The 1-norm of the tensor.
 */
export function norm1(x: TensorBase): number {
    return new UnaryMethod(x, "norm1").invoke();
}

/**
 * Compute the infinity-norm of a tensor (maximum absolute element).
 * 
 * @param x     A tensor.
 * @returns     The infinity-norm of the tensor.
 */
export function normInf(x: TensorBase): number {
    return new UnaryMethod(x, "normInf").invoke();
}