import { UnaryMethod } from "../core/utils";
import Vector from "../vector";
import type { VectorLike } from "./wrap";

function asVector(x: VectorLike): Vector {
    return Array.isArray(x) ? new Vector(x) : x;
}


/**
 * Compute the 2-norm of a vector.
 * 
 * @param x     A vector.
 * @returns     The 2-norm of the vector.
 */
export function norm2(x: VectorLike): number {
    return new UnaryMethod(asVector(x), "norm2").invoke();
}

/**
 * Compute the squared 2-norm of a vector.
 * 
 * @param x     A vector.
 * @returns     The squared 2-norm of the vector.
 */
export function norm2squared(x: VectorLike): number {
    return new UnaryMethod(asVector(x), "norm2squared").invoke();
}

/**
 * Compute the 1-norm of a vector.
 * 
 * @param x     A vector.
 * @returns     The 1-norm of the vector.
 */
export function norm1(x: VectorLike): number {
    return new UnaryMethod(asVector(x), "norm1").invoke();
}

/**
 * Compute the infinity-norm of a vector (maximum absolute element).
 * 
 * @param x     A vector.
 * @returns     The infinity-norm of the vector.
 */
export function normInf(x: VectorLike): number {
    return new UnaryMethod(asVector(x), "normInf").invoke();
}