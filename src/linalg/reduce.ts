import { UnaryMethod, fastUnary } from "../core/utils";
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

const same = (raw: any) => raw;
const scalarOp = (name: string) => fastUnary<any>(name, same, same, (x) => reduceScalar(x, name));
const realOp = (name: string, label: string) => fastUnary<any>(name, same, same, (x) => reduce(x, name, label));

const OPS = {
    sum: scalarOp("sum"), prod: scalarOp("prod"),
    sup: realOp("max", "sup"), inf: realOp("min", "inf"),
    any: realOp("any", "any"), all: realOp("all", "all"),
};

/** Sum of all elements. A Complex for complex tensors. */
export function sum(x: number[] | number[][]): number;
export function sum(x: TensorLike): Scalar;
export function sum(x: TensorLike): Scalar {
    return OPS.sum(x);
}

/** Product of all elements. A Complex for complex tensors. */
export function prod(x: number[] | number[][]): number;
export function prod(x: TensorLike): Scalar;
export function prod(x: TensorLike): Scalar {
    return OPS.prod(x);
}

/** Largest element (supremum). Real tensors only. */
export function sup(x: TensorLike): number {
    return OPS.sup(x);
}

/** Smallest element (infimum). Real tensors only. */
export function inf(x: TensorLike): number {
    return OPS.inf(x);
}

/** True if any element is truthy (non-zero). Real tensors only. */
export function any(x: TensorLike): boolean {
    return Boolean(OPS.any(x));
}

/** True if all elements are truthy (non-zero). Real tensors only. */
export function all(x: TensorLike): boolean {
    return Boolean(OPS.all(x));
}
