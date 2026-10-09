import { UnaryMethod } from "../core/utils";
import { type TensorLike, type TensorOf, type MatrixLike, toTensor, wrapTensor } from "./wrap";

/*
 * Public element-wise unary maps on vectors and matrices.
 * Each accepts a Vector/Matrix or raw array and returns a tensor of the same kind.
 * Ops without a complex kernel throw on complex input.
 */

/** Run a unary map kernel and wrap its result in a Vector/Matrix. */
function map(x: TensorLike, name: string): any {
    const method = new UnaryMethod(toTensor(x), name);
    return wrapTensor(method.invoke(), method.dtype === "cx", method.optype === "m");
}

/** Run a unary predicate kernel; results stay as boolean arrays. */
function predicate(x: TensorLike, name: string): any {
    return new UnaryMethod(toTensor(x), name).invoke();
}

/** `boolean[][]` for matrix-like T, otherwise `boolean[]`. */
export type BoolOf<T> = T extends MatrixLike ? boolean[][] : boolean[];

/** Element-wise square root. */
export function sqrt<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "sqrt");
}

/** Element-wise natural exponential. */
export function exp<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "exp");
}

/** Element-wise natural logarithm. */
export function log<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "log");
}

/** Element-wise sine. */
export function sin<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "sin");
}

/** Element-wise cosine. */
export function cos<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "cos");
}

/** Element-wise tangent. */
export function tan<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "tan");
}

/** Element-wise arcsine. */
export function asin<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "asin");
}

/** Element-wise arccosine. */
export function acos<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "acos");
}

/** Element-wise arctangent. */
export function atan<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "atan");
}

/** Element-wise negation. */
export function neg<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "neg");
}

/** Element-wise ceiling. */
export function ceil<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "ceil");
}

/** Element-wise floor. */
export function floor<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "floor");
}

/** Element-wise rounding to the nearest integer. */
export function round<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "round");
}

/** Element-wise complex conjugate (a copy, for real tensors). */
export function conj<T extends TensorLike>(x: T): TensorOf<T> {
    return map(x, "conj");
}

/**
 * Element-wise absolute value (modulus, for complex tensors).
 * Always returns a real tensor.
 */
export function abs<T extends TensorLike>(x: T): TensorOf<T> {
    const t = toTensor(x);
    const method = new UnaryMethod(t, "abs");
    const raw = method.invoke();
    // The complex kernel returns [|x|, zeros]: keep only the real part
    return wrapTensor(method.dtype === "cx" ? raw[0] : raw, false, method.optype === "m") as TensorOf<T>;
}

/** Element-wise test for NaN. */
export function isNaN<T extends TensorLike>(x: T): BoolOf<T> {
    return predicate(x, "isNaN");
}

/** Element-wise test for finite values. */
export function isFinite<T extends TensorLike>(x: T): BoolOf<T> {
    return predicate(x, "isFinite");
}
