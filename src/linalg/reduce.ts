import { UnaryMethod } from "../core/utils";
import { type TensorLike, toTensor } from "./wrap";

/*
 * Public reducers over all elements of a vector or matrix.
 * Names follow numeric.js: `sup`/`inf` are the max/min reducers, since
 * `max`/`min` are the element-wise binary ops.
 */

function reduce(x: TensorLike, name: string): any {
    return new UnaryMethod(toTensor(x), name).invoke();
}

/** Sum of all elements. */
export function sum(x: TensorLike): number {
    return reduce(x, "sum");
}

/** Product of all elements. */
export function prod(x: TensorLike): number {
    return reduce(x, "prod");
}

/** Largest element (supremum). */
export function sup(x: TensorLike): number {
    return reduce(x, "max");
}

/** Smallest element (infimum). */
export function inf(x: TensorLike): number {
    return reduce(x, "min");
}

/** True if any element is truthy (non-zero). */
export function any(x: TensorLike): boolean {
    return Boolean(reduce(x, "any"));
}

/** True if all elements are truthy (non-zero). */
export function all(x: TensorLike): boolean {
    return Boolean(reduce(x, "all"));
}
