import { test, expect } from "bun:test";
import Vector from "../vector";
import { add, sub, mul, div, mod, pow, atan2, max, min, eq, neq, lt, gt, leq, geq } from "./arithmetic";

// Arithmetic operations - VV

test("add VV", () => {
    const a = new Vector([1, 2, 3]);
    const b = new Vector([4, 5, 6]);
    expect(add(a, b)).toEqual([5, 7, 9]);
});

test("sub VV", () => {
    const a = new Vector([10, 20, 30]);
    const b = new Vector([1, 2, 3]);
    expect(sub(a, b)).toEqual([9, 18, 27]);
});

test("mul VV", () => {
    const a = new Vector([2, 3, 4]);
    const b = new Vector([5, 6, 7]);
    expect(mul(a, b)).toEqual([10, 18, 28]);
});

test("div VV", () => {
    const a = new Vector([10, 20, 30]);
    const b = new Vector([2, 4, 5]);
    expect(div(a, b)).toEqual([5, 5, 6]);
});

test("mod VV", () => {
    const a = new Vector([10, 7, 15]);
    const b = new Vector([3, 4, 6]);
    expect(mod(a, b)).toEqual([1, 3, 3]);
});

// Arithmetic operations - VS

test("add VS", () => {
    const a = new Vector([1, 2, 3]);
    expect(add(a, 10)).toEqual([11, 12, 13]);
});

test("sub VS", () => {
    const a = new Vector([10, 20, 30]);
    expect(sub(a, 5)).toEqual([5, 15, 25]);
});

test("mul VS", () => {
    const a = new Vector([1, 2, 3]);
    expect(mul(a, 3)).toEqual([3, 6, 9]);
});

test("div VS", () => {
    const a = new Vector([10, 20, 30]);
    expect(div(a, 10)).toEqual([1, 2, 3]);
});

// Arithmetic operations - SV

test("add SV", () => {
    const b = new Vector([1, 2, 3]);
    expect(add(10, b)).toEqual([11, 12, 13]);
});

test("sub SV", () => {
    const b = new Vector([1, 2, 3]);
    expect(sub(10, b)).toEqual([9, 8, 7]);
});

test("mul SV", () => {
    const b = new Vector([1, 2, 3]);
    expect(mul(3, b)).toEqual([3, 6, 9]);
});

test("div SV", () => {
    const b = new Vector([2, 4, 5]);
    expect(div(100, b)).toEqual([50, 25, 20]);
});

// Math operations

test("pow VV", () => {
    const a = new Vector([2, 3, 4]);
    const b = new Vector([3, 2, 1]);
    expect(pow(a, b)).toEqual([8, 9, 4]);
});

test("pow VS", () => {
    const a = new Vector([2, 3, 4]);
    expect(pow(a, 2)).toEqual([4, 9, 16]);
});

test("atan2 VV", () => {
    const y = new Vector([1, 0]);
    const x = new Vector([0, 1]);
    const result = atan2(y, x);
    expect(result[0]).toBeCloseTo(Math.PI / 2);
    expect(result[1]).toBeCloseTo(0);
});

test("max VV", () => {
    const a = new Vector([1, 5, 3]);
    const b = new Vector([4, 2, 6]);
    expect(max(a, b)).toEqual([4, 5, 6]);
});

test("min VV", () => {
    const a = new Vector([1, 5, 3]);
    const b = new Vector([4, 2, 6]);
    expect(min(a, b)).toEqual([1, 2, 3]);
});

// Comparison operations

test("eq VV", () => {
    const a = new Vector([1, 2, 3]);
    const b = new Vector([1, 5, 3]);
    expect(eq(a, b)).toEqual([true, false, true]);
});

test("neq VV", () => {
    const a = new Vector([1, 2, 3]);
    const b = new Vector([1, 5, 3]);
    expect(neq(a, b)).toEqual([false, true, false]);
});

test("lt VV", () => {
    const a = new Vector([1, 5, 3]);
    const b = new Vector([2, 3, 3]);
    expect(lt(a, b)).toEqual([true, false, false]);
});

test("gt VV", () => {
    const a = new Vector([1, 5, 3]);
    const b = new Vector([2, 3, 3]);
    expect(gt(a, b)).toEqual([false, true, false]);
});

test("leq VV", () => {
    const a = new Vector([1, 5, 3]);
    const b = new Vector([2, 3, 3]);
    expect(leq(a, b)).toEqual([true, false, true]);
});

test("geq VV", () => {
    const a = new Vector([1, 5, 3]);
    const b = new Vector([2, 3, 3]);
    expect(geq(a, b)).toEqual([false, true, true]);
});

// Comparison with scalars

test("eq VS", () => {
    const a = new Vector([1, 2, 3, 2]);
    expect(eq(a, 2)).toEqual([false, true, false, true]);
});

test("lt VS", () => {
    const a = new Vector([1, 5, 3]);
    expect(lt(a, 3)).toEqual([true, false, false]);
});

test("gt SV", () => {
    const b = new Vector([1, 5, 3]);
    expect(gt(5, b)).toEqual([true, false, true]);
});

// Edge cases

test("div by zero", () => {
    const a = new Vector([1, 2]);
    const b = new Vector([0, 0]);
    expect(div(a, b)).toEqual([Infinity, Infinity]);
});

test("single element vectors", () => {
    const a = new Vector([5]);
    const b = new Vector([3]);
    expect(add(a, b)).toEqual([8]);
    expect(sub(a, b)).toEqual([2]);
    expect(mul(a, b)).toEqual([15]);
});

test("negative values", () => {
    const a = new Vector([-1, -2, 3]);
    const b = new Vector([4, -5, -6]);
    expect(mul(a, b)).toEqual([-4, 10, -18]);
});

test("two scalar operands throws", () => {
    expect(() => add(1, 2)).toThrow();
});