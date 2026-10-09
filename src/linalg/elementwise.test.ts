import { test, expect } from "bun:test";
import Vector from "../vector";
import Matrix from "../matrix";
import { add, mul, lt } from "./arithmetic";
import { sqrt, abs, neg, conj, tan, isNaN, isFinite } from "./elementwise";
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
    expect(() => tan(new Vector([1], [1]))).toThrow("tan is not supported for complex tensors");
    expect(() => sup(new Matrix([[1]], [[1]]))).toThrow("sup is not supported for complex tensors");
    expect(() => lt(new Vector([1], [1]), 1)).toThrow("lt is not supported for complex tensors");
});

// Complex scalars

import { complex, isComplex, type Complex, type Scalar } from "../complex";
import { dot } from "./dot";
import { det } from "./det";
import { inv } from "./inv";

test("complex scalar API types", () => {
    // These annotations are checked by tsc
    const a: number = sum([1, 2, 3]);
    const b: Scalar = sum(new Vector([1, 2]));
    const c: number = dot([1, 2], [3, 4]);
    const d: Scalar = dot(new Vector([1, 2]), new Vector([3, 4]));
    const e: number = det([[1, 2], [3, 4]]);
    const f: Vector = mul(new Vector([1, 2]), complex(0, 1));
    const g: Matrix = dot(complex(0, 1), [[1, 2]]);
    expect(a).toBe(6);
    expect(b).toBe(3);
    expect(c).toBe(11);
    expect(d).toBe(11);
    expect(e).toBeCloseTo(-2, 12);
    expect(f.imag).toEqual([1, 2]);
    expect(g.imag).toEqual([[1, 2]]);
});

test("complex results are Complex even when the imaginary part is zero", () => {
    const s = sum(new Vector([1, 2], [1, -1]));
    expect(isComplex(s)).toBe(true);
    expect(s).toEqual({ re: 3, im: 0 });
});

test("a Complex scalar with zero imaginary part acts as a real scalar", () => {
    const out = mul(new Vector([1, 2]), complex(3));
    expect(out.is_complex).toBe(false);
    expect(out.real).toEqual([3, 6]);
});

test("complex scalar times complex scalar", () => {
    expect(dot(complex(1, 2), complex(3, 4))).toEqual({ re: -5, im: 10 });
    expect(dot(2, complex(3, 4))).toEqual({ re: 6, im: 8 });
});

test("complex singular matrices", () => {
    const S = new Matrix([[1, 2], [2, 4]], [[1, 2], [2, 4]]);
    expect(det(S)).toEqual({ re: 0, im: 0 });
    expect(() => inv(S)).toThrow("singular");
    const z = det(new Matrix([[0, 1], [1, 0]], [[1, 0], [0, 1]])) as Complex;
    // det [[i, 1], [1, i]] = i*i - 1 = -2
    expect(z.re).toBeCloseTo(-2, 12);
    expect(z.im).toBeCloseTo(0, 12);
});
