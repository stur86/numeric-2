import { test, expect } from "bun:test";
import { TensorBase } from "../base";

/** Raw real data of a tensor (asserting it is real); other values pass through. */
function unwrap(x: any): any {
    if (x instanceof TensorBase) {
        expect(x.imag).toBeNull();
        return x.real;
    }
    return x;
}
import { LU, LUsolve, solve } from "./lu";
import { inv } from "./inv";
import { det } from "./det";
import { dot } from "./dot";
import { identity } from "../utils";

// Helper to compare matrices/vectors with tolerance
function expectClose(a: any, b: any, tol: number = 1e-10) {
    a = unwrap(a);
    b = unwrap(b);
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
    expect(inv([[4]]).real).toEqual([[0.25]]);
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
// Input validation

import Matrix from "../matrix";
import Vector from "../vector";
import { add, eq } from "./arithmetic";
import { normInf } from "./norm";

test("Matrix inputs give the same results as raw arrays", () => {
    const raw = [[1, 2], [3, 4]];
    const M = new Matrix(raw);
    expect(det(M)).toBeCloseTo(-2, 12);
    expectClose(solve(M, new Vector([5, 6])), solve(raw, [5, 6]));
    expect(inv(M).real).toEqual(inv(raw).real);
    expect(dot(M, M).real).toEqual(dot(raw, raw).real);
});

test("real-only routines reject complex inputs", () => {
    const C = new Matrix([[1, 2], [3, 4]], [[0, 1], [1, 0]]);
    expect(() => det(C)).toThrow("complex");
    expect(() => inv(C)).toThrow("complex");
    expect(() => LU(C)).toThrow("complex");
    expect(() => solve(C, [1, 1])).toThrow("complex");
    expect(() => solve([[1, 0], [0, 1]], new Vector([1, 1], [1, 1]))).toThrow("complex");
    expect(() => dot(C, [1, 1])).toThrow("complex");
});

test("non-square matrices are rejected", () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    expect(() => det(A)).toThrow("square");
    expect(() => inv(A)).toThrow("square");
    expect(() => LU(A)).toThrow("square");
});

test("shape mismatches are rejected", () => {
    expect(() => solve([[1, 0], [0, 1]], [1, 2, 3])).toThrow("length");
    expect(() => dot([1, 2, 3], [1, 2])).toThrow("shape mismatch");
    expect(() => dot([[1, 2], [3, 4]], [1, 2, 3])).toThrow("shape mismatch");
    expect(() => dot([[1, 2, 3]], [[1, 2], [3, 4]])).toThrow("shape mismatch");
    expect(() => add(new Vector([1, 2, 3]), new Vector([1, 2]))).toThrow("length mismatch");
});

test("unsupported complex ops give a clear error", () => {
    const c = new Vector([1, 2], [1, -1]);
    expect(() => eq(c, c)).toThrow("eq is not supported for complex tensors");
    expect(normInf(c)).toBeCloseTo(Math.sqrt(5), 12);
});

test("real + complex vectors are added in complex mode", () => {
    const r = new Vector([1, 2]);
    const c = new Vector([1, 2], [3, 4]);
    for (const sum of [add(r, c), add(c, r)]) {
        expect(sum).toBeInstanceOf(Vector);
        expect(sum.real).toEqual([2, 4]);
        expect(sum.imag).toEqual([3, 4]);
    }
});

// Return types: public routines return Vector/Matrix

import { dotMMsmall } from "../core/dot";
import { transpose } from "../utils";
import { norm2 } from "./norm";
import { house, toUpperHessenberg, QRFrancis } from "./house";

test("public routines return Vector/Matrix", () => {
    const A = [[4, 7], [2, 6]];
    expect(solve(A, [1, 2])).toBeInstanceOf(Vector);
    expect(inv(A)).toBeInstanceOf(Matrix);
    expect(LU(A).LU).toBeInstanceOf(Matrix);
    expect(LUsolve(LU(A), [1, 2])).toBeInstanceOf(Vector);
    expect(dot(A, A)).toBeInstanceOf(Matrix);
    expect(dot(A, [1, 2])).toBeInstanceOf(Vector);
    expect(dot([1, 2], A)).toBeInstanceOf(Vector);
    expect(typeof dot([1, 2], [3, 4])).toBe("number");
    expect(add([1, 2], 1)).toBeInstanceOf(Vector);
});

test("dot scales matrices by scalars", () => {
    expect(dot(2, [[1, 2], [3, 4]]).real).toEqual([[2, 4], [6, 8]]);
    expect(dot(new Matrix([[1, 2], [3, 4]]), 3).real).toEqual([[3, 6], [9, 12]]);
});

test("arithmetic and norms accept raw arrays", () => {
    expect(add([1, 2, 3], [4, 5, 6]).real).toEqual([5, 7, 9]);
    expect(add(1, [1, 2]).real).toEqual([2, 3]);
    expect(eq([1, 2], [1, 3])).toEqual([true, false]);
    expect(norm2([3, 4])).toBe(5);
    expect(normInf([-7, 2])).toBe(7);
});

test("house returns a unit Householder vector", () => {
    const x = [3, 1, 2];
    const v = house(new Vector(x));
    expect(v).toBeInstanceOf(Vector);
    expect(norm2(v)).toBeCloseTo(1, 12);
    // (I - 2 v v^T) x has zeros below the first entry
    const vr = v.real as number[];
    const vx = dot(vr, x);
    const Hx = x.map((xi, i) => xi - 2 * vr[i] * vx);
    expectClose(Hx.slice(1), [0, 0]);
});

test("toUpperHessenberg and QRFrancis wrap their results", () => {
    const A = [[4, 1, 2, 3], [1, 3, 0, 1], [2, 0, 5, 2], [3, 1, 2, 6]];
    const { H, Q } = toUpperHessenberg(new Matrix(A));
    expect(H).toBeInstanceOf(Matrix);
    expect(Q).toBeInstanceOf(Matrix);
    const Hr = H.real as number[][];
    const Qr = Q.real as number[][];
    // H is upper Hessenberg and H = Q A Q^T
    for (let i = 2; i < 4; i++) for (let j = 0; j < i - 1; j++) expect(Math.abs(Hr[i][j])).toBeLessThan(1e-12);
    expectClose(dotMMsmall(dotMMsmall(Qr, A), transpose(Qr)), Hr);

    const qr = QRFrancis(H);
    expect(qr.Q).toBeInstanceOf(Matrix);
    const covered = qr.B.reduce((n, [s, e]) => n + e - s + 1, 0);
    expect(covered).toBe(4);
});
