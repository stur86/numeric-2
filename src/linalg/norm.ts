import { UnaryMethod } from "../core/utils";
import { type TensorLike, toTensor } from "./wrap";


/**
 * Compute the 2-norm of a vector or matrix.
 * 
 * @param x     A vector or matrix (norms are taken element-wise over all entries).
 * @returns     The 2-norm of the tensor.
 */
export function norm2(x: TensorLike): number {
    return new UnaryMethod(toTensor(x), "norm2").invoke();
}

/**
 * Compute the squared 2-norm of a vector or matrix.
 * 
 * @param x     A vector or matrix (norms are taken element-wise over all entries).
 * @returns     The squared 2-norm of the tensor.
 */
export function norm2squared(x: TensorLike): number {
    return new UnaryMethod(toTensor(x), "norm2squared").invoke();
}

/**
 * Compute the 1-norm of a vector or matrix.
 * 
 * @param x     A vector or matrix (norms are taken element-wise over all entries).
 * @returns     The 1-norm of the tensor.
 */
export function norm1(x: TensorLike): number {
    return new UnaryMethod(toTensor(x), "norm1").invoke();
}

/**
 * Compute the infinity-norm of a vector or matrix (maximum absolute element).
 * 
 * @param x     A vector or matrix (norms are taken element-wise over all entries).
 * @returns     The infinity-norm of the tensor.
 */
export function normInf(x: TensorLike): number {
    return new UnaryMethod(toTensor(x), "normInf").invoke();
}