import { test, expect } from "bun:test";
import Vector from "./vector";
import Matrix from "./matrix";
import { complex } from "./complex";
import * as U from "./tensorutils";

const A = () => new Matrix([[1, 2, 3], [4, 5, 6]]);
const C = () => new Matrix([[1, 2], [3, 4]], [[0, -1], [2, 0]]);

test("clone gives an independent copy, real and complex", () => {
    const v = new Vector([1, 2], [3, 4]);
    const w = v.clone();
    w.set(0, 9);
    expect(v.get(0)).toEqual({ re: 1, im: 3 });
    const M = C(), N = M.clone();
    N.set(1, 1, complex(7, 7));
    expect(M.get(1, 1)).toEqual({ re: 4, im: 0 });
    expect(U.clone(M)).not.toBe(M);
    expect(U.clone([[1, 2]])).toEqual([[1, 2]]);
});

test("constructors wrap without copying", () => {
    const data = [1, 2, 3];
    new Vector(data).set(0, 5);
    expect(data[0]).toBe(5);
});

test("get/set, and complex values into real tensors throw", () => {
    const v = new Vector([1, 2]);
    expect(v.get(1)).toBe(2);
    expect(() => v.set(0, complex(1, 1))).toThrow("promoteToComplex");
    v.set(0, complex(4, 0)); // zero imaginary part is fine
    expect(v.get(0)).toBe(4);
    v.promoteToComplex().set(0, complex(1, 1));
    expect(v.is_complex).toBe(true);
    expect(v.get(0)).toEqual({ re: 1, im: 1 });
    expect(v.promoteToComplex()).toBe(v);
    expect(() => v.get(2)).toThrow("out of range");

    const M = A();
    expect(M.get(1, 2)).toBe(6);
    expect(() => M.set(0, 0, complex(0, 1))).toThrow("promoteToComplex");
    expect(() => M.setRow(0, new Vector([1, 1, 1], [0, 1, 0]))).toThrow("promoteToComplex");
    expect(() => M.get(2, 0)).toThrow("out of range");
});

test("rows, columns, blocks and ranges", () => {
    const M = A();
    expect(M.getRow(1).real).toEqual([4, 5, 6]);
    expect(M.getCol(2).real).toEqual([3, 6]);
    expect(M.getRows(1).real).toEqual([[4, 5, 6]]);
    expect(M.getBlock(0, 1, 2, 3).real).toEqual([[2, 3], [5, 6]]);
    expect(M.getRange([1, 0, 1], [2, 0]).real).toEqual([[6, 4], [3, 1], [6, 4]]);
    expect(M.getDiag().real).toEqual([1, 5]);

    M.setRow(0, [7, 8, 9]).setCol(0, [0, 0]).setBlock(1, 1, [[-1, -2]]);
    expect(M.real).toEqual([[0, 8, 9], [0, -1, -2]]);
    M.setRows(0, new Matrix([[1, 1, 1]]));
    expect(M.real).toEqual([[1, 1, 1], [0, -1, -2]]);
    expect(() => M.setBlock(1, 2, [[1, 2]])).toThrow("does not fit");

    const v = new Vector([1, 2, 3, 4], [0, 1, 0, 1]);
    expect(v.getBlock(1, 3).real).toEqual([2, 3]);
    expect(v.getBlock(1, 3).imag).toEqual([1, 0]);
    v.setBlock(2, [9, 9]);
    expect(v.real).toEqual([1, 2, 9, 9]);
    expect(v.imag).toEqual([0, 1, 0, 0]);
});

test("complex matrices keep their imaginary parts", () => {
    const M = C();
    expect(M.getRow(0).imag).toEqual([0, -1]);
    expect(M.getCol(0).imag).toEqual([0, 2]);
    expect(M.getDiag().imag).toEqual([0, 0]);
    expect(M.transpose().imag).toEqual([[0, 2], [-1, 0]]);
    expect(M.transjugate().imag).toEqual([[-0, -2], [1, -0]]);
    expect(M.transjugate().real).toEqual([[1, 3], [2, 4]]);
    // Writing a real block into a complex matrix zeroes the imaginary part there
    M.setBlock(0, 0, [[5]]);
    expect(M.get(0, 0)).toEqual({ re: 5, im: 0 });
});

test("construction helpers", () => {
    expect(Matrix.zeros(2, 3).real).toEqual([[0, 0, 0], [0, 0, 0]]);
    expect(Matrix.identity(2).real).toEqual([[1, 0], [0, 1]]);
    expect(Matrix.diag(new Vector([1, 2], [3, 4])).imag).toEqual([[3, 0], [0, 4]]);
    expect(Vector.zeros(3).real).toEqual([0, 0, 0]);
    const B = Matrix.block([[[[1]], new Matrix([[2, 3]], [[0, 1]])], [[[4]], [[5, 6]]]]);
    expect(B.real).toEqual([[1, 2, 3], [4, 5, 6]]);
    expect(B.imag).toEqual([[0, 0, 1], [0, 0, 0]]);
    expect(() => Matrix.block([[[[1]], [[2], [3]]]])).toThrow("rows");
});

test("utility functions accept raw arrays or tensors", () => {
    expect(U.transpose([[1, 2]])).toEqual([[1], [2]]);
    expect(U.transpose(A())).toBeInstanceOf(Matrix);
    expect(U.getDiag(C()).imag).toEqual([0, 0]);
    expect(U.getBlock([[1, 2], [3, 4]], 1, 0, 2, 2)).toEqual([[3, 4]]);
    expect(U.getBlock(A(), 1, 1).real).toEqual([[5, 6]]);
    expect(U.getBlock1D(new Vector([1, 2, 3]), 1).real).toEqual([2, 3]);
    expect(U.setBlock([[0, 0], [0, 0]], 1, 0, [[7, 8]])).toEqual([[0, 0], [7, 8]]);
    expect(U.getRange([[1, 2], [3, 4]], [1], [1, 0])).toEqual([[4, 3]]);
    expect(U.blockMatrix([[[[1]], [[2]]]])).toEqual([[1, 2]]);
    expect(U.blockMatrix([[A()], [[[0, 0, 0]]]]).real).toEqual([[1, 2, 3], [4, 5, 6], [0, 0, 0]]);
    expect(U.negtranspose(C()).imag).toEqual([[-0, -2], [1, -0]]);
    expect(U.transjugate([[1, 2]])).toEqual([[1], [2]]);
    // Complex outer product
    const T = U.tensor(new Vector([1, 0], [0, 1]), new Vector([1, 2], [1, 0]));
    expect(T.real).toEqual([[1, 2], [-1, 0]]);
    expect(T.imag).toEqual([[1, 0], [1, 2]]);
    expect(U.tensor([1, 2], [3])).toEqual([[3], [6]]);
    expect(U.same(new Vector([1, 2]), new Vector([1, 2]))).toBe(true);
    expect(U.same(new Vector([1, 2]), new Vector([1, 2], [0, 1]))).toBe(false);
    expect(U.same(new Vector([1, 2]), new Vector([1, 2], [0, 0]))).toBe(true);
    expect(U.same(new Vector([1]), new Matrix([[1]]))).toBe(false);
    expect(U.same([[1, 2]], [[1, 2]])).toBe(true);
});
