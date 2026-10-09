import { UnaryMethod, fastUnary } from "../core/utils";
import { type TensorLike, toTensor } from "./wrap";

const same = (raw: any) => raw;
const normOp = (name: string) => fastUnary<number>(name, same, same, (x) => new UnaryMethod(toTensor(x), name).invoke());

const OPS = {
    norm2: normOp("norm2"), norm2squared: normOp("norm2squared"), norm1: normOp("norm1"), normInf: normOp("normInf"),
};


/**
 * Compute the 2-norm of a vector or matrix.
 * 
 * @param x     A vector or matrix (norms are taken element-wise over all entries).
 * @returns     The 2-norm of the tensor.
 */
export function norm2(x: TensorLike): number {
    return OPS.norm2(x);
}

/**
 * Compute the squared 2-norm of a vector or matrix.
 * 
 * @param x     A vector or matrix (norms are taken element-wise over all entries).
 * @returns     The squared 2-norm of the tensor.
 */
export function norm2squared(x: TensorLike): number {
    return OPS.norm2squared(x);
}

/**
 * Compute the 1-norm of a vector or matrix.
 * 
 * @param x     A vector or matrix (norms are taken element-wise over all entries).
 * @returns     The 1-norm of the tensor.
 */
export function norm1(x: TensorLike): number {
    return OPS.norm1(x);
}

/**
 * Compute the infinity-norm of a vector or matrix (maximum absolute element).
 * 
 * @param x     A vector or matrix (norms are taken element-wise over all entries).
 * @returns     The infinity-norm of the tensor.
 */
export function normInf(x: TensorLike): number {
    return OPS.normInf(x);
}