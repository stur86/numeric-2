import { test, expect } from "bun:test";
import { LU, LUsolve, solve } from "./lu";
import { inv } from "./inv";
import { det } from "./det";
import { dot } from "./dot";
import { identity } from "../utils";

// Helper to compare matrices/vectors with tolerance
function expectClose(a: any, b: any, tol: number = 1e-10) {
    if (typeof a === 'number') {
        expect(a).toBeCloseTo(b, 10);
        return;
    }
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
        if (Array.isArray(a[i])) {
            expectClose(a[i], b[i], tol);
        } else {
            expect(Math.abs(a[i] - b[i])).toBeLessThan(tol);
        }
    }
}

// solve

test("solve 2x2", () => {
    const A = [[2, 1], [1, 3]];
    const b = [5, 10];
    const x = solve(A, b);
    expectClose(dot(A, x), b);
});

test("solve 3x3", () => {
    const A = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]];
    const b = [8, -11, -3];
    const x = solve(A, b);
    expectClose(dot(A, x), b);
});

test("solve identity", () => {
    const b = [1, 2, 3];
    const x = solve(identity(3), b);
    expectClose(x, b);
});

test("solve 1x1", () => {
    const x = solve([[5]], [10]);
    expectClose(x, [2]);
});

// LU / LUsolve

test("LU and LUsolve", () => {
    const A = [[1, 2, 3], [4, 5, 6], [7, 8, 10]];
    const lup = LU(A);
    const b = [1, 0, 0];
    const x = LUsolve(lup, b);
    expectClose(dot(A, x), b);
});

test("LU does not modify input by default", () => {
    const A = [[1, 2], [3, 4]];
    const orig = [[1, 2], [3, 4]];
    LU(A);
    expect(A).toEqual(orig);
});

test("LU fast modifies input", () => {
    const A = [[1, 2], [3, 4]];
    LU(A, true);
    // A is now modified
    expect(A).not.toEqual([[1, 2], [3, 4]]);
});

// inv

test("inv 2x2", () => {
    const A = [[4, 7], [2, 6]];
    const Ainv = inv(A);
    expectClose(dot(A, Ainv), identity(2));
});

test("inv 3x3", () => {
    const A = [[1, 2, 3], [0, 1, 4], [5, 6, 0]];
    const Ainv = inv(A);
    expectClose(dot(A, Ainv), identity(3));
});

test("inv identity", () => {
    const I = identity(3);
    expectClose(inv(I), I);
});

test("inv 1x1", () => {
    expect(inv([[4]])).toEqual([[0.25]]);
});

test("inv singular throws", () => {
    expect(() => inv([[1, 2], [2, 4]])).toThrow("singular");
});

test("inv roundtrip", () => {
    const A = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]];
    const Ainv = inv(A);
    expectClose(inv(Ainv), A);
});

// det

test("det identity", () => {
    expect(det(identity(3))).toBeCloseTo(1);
    expect(det(identity(5))).toBeCloseTo(1);
});

test("det 1x1", () => {
    expect(det([[7]])).toBe(7);
});

test("det 2x2", () => {
    expect(det([[1, 2], [3, 4]])).toBeCloseTo(-2);
});

test("det 3x3", () => {
    expect(det([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]])).toBeCloseTo(-1);
});

test("det singular", () => {
    expect(det([[1, 2], [2, 4]])).toBe(0);
});

test("det diagonal", () => {
    expect(det([[2, 0, 0], [0, 3, 0], [0, 0, 4]])).toBeCloseTo(24);
});

test("det swap sign", () => {
    // Swapping two rows negates the determinant
    const A = [[1, 2], [3, 4]];
    const B = [[3, 4], [1, 2]];
    expect(det(A)).toBeCloseTo(-det(B));
});

// Combined: solve + inv consistency

test("solve matches inv * b", () => {
    const A = [[2, 1], [5, 3]];
    const b = [4, 7];
    const x1 = solve(A, b);
    const x2 = dot(inv(A), b);
    expectClose(x1, x2);
});

// Larger system

test("solve 5x5", () => {
    const A = [
        [2, 1, 0, 0, 0],
        [1, 3, 1, 0, 0],
        [0, 1, 4, 1, 0],
        [0, 0, 1, 5, 1],
        [0, 0, 0, 1, 6],
    ];
    const b = [1, 2, 3, 4, 5];
    const x = solve(A, b);
    expectClose(dot(A, x), b);
});