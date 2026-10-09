import { test, expect } from "bun:test";
import { dim, rep, linspace, random, identity, diag, getDiag, clone, transpose, negtranspose, same, tensor } from "./utils";

// dim

test("dim scalar", () => {
    expect(dim(5)).toEqual([]);
    expect(dim(true)).toEqual([]);
});

test("dim 1D", () => {
    expect(dim([1, 2, 3])).toEqual([3]);
});

test("dim 2D", () => {
    expect(dim([[1, 2], [3, 4], [5, 6]])).toEqual([3, 2]);
});

test("dim 3D", () => {
    expect(dim([[[1, 2], [3, 4]], [[5, 6], [7, 8]]])).toEqual([2, 2, 2]);
});

// rep

test("rep 1D", () => {
    expect(rep([5], 0)).toEqual([0, 0, 0, 0, 0]);
    expect(rep([3], 7)).toEqual([7, 7, 7]);
    expect(rep([1], 42)).toEqual([42]);
});

test("rep 2D", () => {
    expect(rep([2, 3], 0)).toEqual([[0, 0, 0], [0, 0, 0]]);
    expect(rep([3, 3], 1)).toEqual([[1, 1, 1], [1, 1, 1], [1, 1, 1]]);
});

test("rep 2D rows are independent", () => {
    const r = rep([2, 2], 0);
    r[0][0] = 99;
    expect(r[1][0]).toBe(0);
});

// linspace

test("linspace basic", () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
});

test("linspace default n", () => {
    expect(linspace(0, 4)).toEqual([0, 1, 2, 3, 4]);
});

test("linspace single point", () => {
    expect(linspace(3, 3, 1)).toEqual([3]);
});

test("linspace two points", () => {
    expect(linspace(0, 1, 2)).toEqual([0, 1]);
});

// random

test("random 1D shape", () => {
    const r = random([5]) as number[];
    expect(r.length).toBe(5);
    for (const v of r) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
    }
});

test("random 2D shape", () => {
    const r = random([3, 4]) as number[][];
    expect(r.length).toBe(3);
    for (const row of r) {
        expect(row.length).toBe(4);
    }
});

// identity

test("identity 1", () => {
    expect(identity(1)).toEqual([[1]]);
});

test("identity 3", () => {
    expect(identity(3)).toEqual([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ]);
});

// diag / getDiag

test("diag", () => {
    expect(diag([1, 2, 3])).toEqual([
        [1, 0, 0],
        [0, 2, 0],
        [0, 0, 3],
    ]);
});

test("getDiag", () => {
    expect(getDiag([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toEqual([1, 5, 9]);
});

test("getDiag rectangular", () => {
    expect(getDiag([[1, 2, 3], [4, 5, 6]])).toEqual([1, 5]);
});

test("diag/getDiag roundtrip", () => {
    const d = [1, 2, 3, 4];
    expect(getDiag(diag(d))).toEqual(d);
});

// clone

test("clone 1D", () => {
    const a = [1, 2, 3];
    const b = clone(a);
    expect(b).toEqual(a);
    b[0] = 99;
    expect(a[0]).toBe(1);
});

test("clone 2D", () => {
    const a = [[1, 2], [3, 4]];
    const b = clone(a);
    expect(b).toEqual(a);
    b[0][0] = 99;
    expect(a[0][0]).toBe(1);
});

// transpose

test("transpose square", () => {
    expect(transpose([[1, 2], [3, 4]])).toEqual([[1, 3], [2, 4]]);
});

test("transpose rectangular", () => {
    expect(transpose([[1, 2, 3], [4, 5, 6]])).toEqual([
        [1, 4],
        [2, 5],
        [3, 6],
    ]);
});

test("transpose 1x1", () => {
    expect(transpose([[5]])).toEqual([[5]]);
});

test("transpose 3x3", () => {
    expect(transpose([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
    ])).toEqual([
        [1, 4, 7],
        [2, 5, 8],
        [3, 6, 9],
    ]);
});

test("transpose double roundtrip", () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    expect(transpose(transpose(A))).toEqual(A);
});

// negtranspose

test("negtranspose", () => {
    expect(negtranspose([[1, 2], [3, 4]])).toEqual([[-1, -3], [-2, -4]]);
});

// same

test("same arrays", () => {
    expect(same([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(same([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(same([1, 2], [1, 2, 3])).toBe(false);
});

test("same nested", () => {
    expect(same([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true);
    expect(same([[1, 2], [3, 4]], [[1, 2], [3, 5]])).toBe(false);
});

test("same scalars", () => {
    expect(same(5, 5)).toBe(true);
    expect(same(5, 6)).toBe(false);
});

// tensor (outer product)

test("tensor", () => {
    expect(tensor([1, 2, 3], [4, 5])).toEqual([
        [4, 5],
        [8, 10],
        [12, 15],
    ]);
});

test("tensor unit vectors", () => {
    expect(tensor([1, 0], [0, 1])).toEqual([
        [0, 1],
        [0, 0],
    ]);
});