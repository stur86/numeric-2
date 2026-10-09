import { test, expect } from "bun:test";
import Vector from "../vector";
import Matrix from "../matrix";
import { add, mul, lt } from "./arithmetic";
import { sqrt, abs, neg, conj, isNaN, isFinite } from "./elementwise";
import { sum, prod, sup, inf, any, all } from "./reduce";
import { norm2 } from "./norm";

test("result types follow the inputs", () => {
    // These annotations are checked by tsc
    const v: Vector = sqrt([1, 4, 9]);
    const m: Matrix = sqrt([[1, 4], [9, 16]]);
    const vm: Matrix = add(1, new Matrix([[1, 2]]));
    const vv: Vector = mul(new Vector([1, 2]), 2);
    const bv: boolean[] = lt([1, 2], 2);
    const bm: boolean[][] = lt([[1, 2]], 2);
    const nm: boolean[][] = isNaN(new Matrix([[1, NaN]]));
    expect(v.real).toEqual([1, 2, 3]);
    expect(m.real).toEqual([[1, 2], [3, 4]]);
    expect(vm.real).toEqual([[2, 3]]);
    expect(vv.real).toEqual([2, 4]);
    expect(bv).toEqual([true, false]);
    expect(bm).toEqual([[true, false]]);
    expect(nm).toEqual([[false, true]]);
});

test("isNaN / isFinite", () => {
    expect(isNaN([1, NaN, Infinity])).toEqual([false, true, false]);
    expect(isFinite([[1, NaN], [Infinity, -2]])).toEqual([[true, false], [false, true]]);
});

test("reducers on vectors and matrices", () => {
    const M = [[1, -2, 3], [4, 5, -6]];
    expect(sum(M)).toBe(5);
    expect(prod(M)).toBe(720);
    expect(sup(M)).toBe(5);
    expect(inf(M)).toBe(-6);
    expect(sum([1, 2, 3])).toBe(6);
    expect(norm2([[3], [4]])).toBe(5);
});

test("any / all", () => {
    expect(any([0, 0, 1])).toBe(true);
    expect(any([0, 0, 0])).toBe(false);
    expect(all([1, 2, 3])).toBe(true);
    expect(all([1, 0, 3])).toBe(false);
    expect(any([[0, 0], [0, 1]])).toBe(true);
    expect(all([[1, 1], [0, 1]])).toBe(false);
    expect(any([1])).toBe(true);
    expect(all([0])).toBe(false);
});

test("conj of a real tensor is a copy", () => {
    const x = [1, -2, 3];
    const c = conj(x);
    expect(c.real).toEqual(x);
    expect(c.real).not.toBe(x);
    expect(c.is_complex).toBe(false);
});

test("real scalars with complex matrices", () => {
    const C = new Matrix([[1, 2], [3, 4]], [[1, -1], [0, 2]]);
    const out = mul(2, C);
    expect(out.real).toEqual([[2, 4], [6, 8]]);
    expect(out.imag).toEqual([[2, -2], [0, 4]]);
    const plus = add(C, 1);
    expect(plus.real).toEqual([[2, 3], [4, 5]]);
    expect(plus.imag).toEqual([[1, -1], [0, 2]]);
});

test("complex abs and neg", () => {
    const c = new Vector([3, 0], [4, -2]);
    expect(abs(c).real).toEqual([5, 2]);
    expect(abs(c).is_complex).toBe(false);
    expect(neg(c).imag).toEqual([-4, 2]);
});

test("errors", () => {
    expect(() => add(new Vector([1, 2]), new Matrix([[1, 2]]))).toThrow("cannot combine a vector with a matrix");
    expect(() => add([[1, 2], [3, 4]], [[1, 2, 3], [4, 5, 6]])).toThrow("shape mismatch (2x2 vs 2x3)");
    expect(() => sqrt(new Vector([1], [1]))).toThrow("sqrt is not supported for complex tensors");
    expect(() => sum(new Matrix([[1]], [[1]]))).toThrow("sum is not supported for complex tensors");
    expect(() => lt(new Vector([1], [1]), 1)).toThrow("lt is not supported for complex tensors");
});
