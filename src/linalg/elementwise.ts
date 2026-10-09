import { UnaryMethod, fastUnary } from "../core/utils";
import Vector from "../vector";
import Matrix from "../matrix";
import { type TensorLike, type TensorOf, type MatrixLike, type NDArray, toTensor, wrapTensor } from "./wrap";
import type Tensor from "../tensor";
import type { NestedArray } from "../base";

/*
 * Public element-wise unary maps on vectors and matrices.
 * Each accepts a Vector/Matrix or raw array and returns a tensor of the same kind.
 * Ops without a complex kernel throw on complex input.
 */

/** Run a unary map kernel and wrap its result in a Vector/Matrix. */
function map(x: TensorLike, name: string): any {
    const method = new UnaryMethod(toTensor(x), name);
    return wrapTensor(method.invoke(), method.dtype === "cx", method.optype);
}

/** Run a unary predicate kernel; results stay as boolean arrays. */
function predicate(x: TensorLike, name: string): any {
    return new UnaryMethod(toTensor(x), name).invoke();
}

const toVector = (raw: number[]) => new Vector(raw);
const toMatrix = (raw: number[][]) => new Matrix(raw);
const same = (raw: any) => raw;
const mapOp = (name: string) => fastUnary<any>(name, toVector, toMatrix, (x) => map(x, name));
const predicateOp = (name: string) => fastUnary<any>(name, same, same, (x) => predicate(x, name));

const OPS = {
    sqrt: mapOp("sqrt"), exp: mapOp("exp"), log: mapOp("log"), sin: mapOp("sin"), cos: mapOp("cos"),
    tan: mapOp("tan"), asin: mapOp("asin"), acos: mapOp("acos"), atan: mapOp("atan"), neg: mapOp("neg"),
    ceil: mapOp("ceil"), floor: mapOp("floor"), round: mapOp("round"), conj: mapOp("conj"),
    isNaN: predicateOp("isNaN"), isFinite: predicateOp("isFinite"),
    reciprocal: mapOp("reciprocal"), bnot: mapOp("bnot"), not: predicateOp("not"),
    // Complex abs returns [|x|, zeros]: keep only the real part
    abs: fastUnary<any>("abs", toVector, toMatrix, (x) => {
        const method = new UnaryMethod(toTensor(x), "abs");
        const raw = method.invoke();
        return wrapTensor(method.dtype === "cx" ? raw[0] : raw, false, method.optype);
    }),
};

/** `boolean[][]` for matrix-like T, otherwise `boolean[]`. */
export type BoolOf<T> = T extends Tensor | NDArray ? NestedArray<boolean> : T extends MatrixLike ? boolean[][] : boolean[];

/** Element-wise square root. */
export function sqrt<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.sqrt(x);
}

/** Element-wise natural exponential. */
export function exp<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.exp(x);
}

/** Element-wise natural logarithm. */
export function log<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.log(x);
}

/** Element-wise sine. */
export function sin<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.sin(x);
}

/** Element-wise cosine. */
export function cos<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.cos(x);
}

/** Element-wise tangent. */
export function tan<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.tan(x);
}

/** Element-wise arcsine. */
export function asin<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.asin(x);
}

/** Element-wise arccosine. */
export function acos<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.acos(x);
}

/** Element-wise arctangent. */
export function atan<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.atan(x);
}

/** Element-wise negation. */
export function neg<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.neg(x);
}

/** Element-wise ceiling. */
export function ceil<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.ceil(x);
}

/** Element-wise floor. */
export function floor<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.floor(x);
}

/** Element-wise rounding to the nearest integer. */
export function round<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.round(x);
}

/** Element-wise complex conjugate (a copy, for real tensors). */
export function conj<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.conj(x);
}

/**
 * Element-wise absolute value (modulus, for complex tensors).
 * Always returns a real tensor.
 */
export function abs<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.abs(x);
}

/** Element-wise test for NaN. */
export function isNaN<T extends TensorLike>(x: T): BoolOf<T> {
    return OPS.isNaN(x);
}

/** Element-wise test for finite values. */
export function isFinite<T extends TensorLike>(x: T): BoolOf<T> {
    return OPS.isFinite(x);
}

/** Element-wise reciprocal 1/x (real or complex). */
export function reciprocal<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.reciprocal(x);
}

/** Element-wise bitwise NOT, ~x (operands converted to 32-bit integers). */
export function bnot<T extends TensorLike>(x: T): TensorOf<T> {
    return OPS.bnot(x);
}

/** Element-wise logical NOT, as booleans (accepts numbers or booleans). */
export function not<T extends TensorLike | boolean[] | boolean[][]>(x: T): T extends MatrixLike | boolean[][] ? boolean[][] : boolean[] {
    return OPS.not(x);
}
