import { UnaryMethod } from "../core/utils";
import type { Complex, Scalar } from "../complex";
import { type TensorLike, toTensor } from "./wrap";

/*
 * Public reducers over all elements of a vector or matrix.
 * Names follow numeric.js: `sup`/`inf` are the max/min reducers, since
 * `max`/`min` are the element-wise binary ops.
 */

function reduce(x: TensorLike, name: string, label: string = name): any {
    return new UnaryMethod(toTensor(x), name, label).invoke();
}

/** Reduce, converting a complex kernel's [re, im] result to a Complex. */
function reduceScalar(x: TensorLike, name: string): Scalar {
    const r = reduce(x, name);
    return typeof r === "number" ? r : { re: r[0], im: r[1] } as Complex;
}

/** Sum of all elements. A Complex for complex tensors. */
export function sum(x: number[] | number[][]): number;
export function sum(x: TensorLike): Scalar;
export function sum(x: TensorLike): Scalar {
    return reduceScalar(x, "sum");
}

/** Product of all elements. A Complex for complex tensors. */
export function prod(x: number[] | number[][]): number;
export function prod(x: TensorLike): Scalar;
export function prod(x: TensorLike): Scalar {
    return reduceScalar(x, "prod");
}

/** Largest element (supremum). Real tensors only. */
export function sup(x: TensorLike): number {
    return reduce(x, "max", "sup");
}

/** Smallest element (infimum). Real tensors only. */
export function inf(x: TensorLike): number {
    return reduce(x, "min", "inf");
}

/** True if any element is truthy (non-zero). Real tensors only. */
export function any(x: TensorLike): boolean {
    return Boolean(reduce(x, "any"));
}

/** True if all elements are truthy (non-zero). Real tensors only. */
export function all(x: TensorLike): boolean {
    return Boolean(reduce(x, "all"));
}
