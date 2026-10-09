import { test, expect } from "bun:test";
import { prettyPrint } from "./print";
import Vector from "./vector";
import Matrix from "./matrix";
import Tensor from "./tensor";
import { SparseMatrix } from "./sparse";

test("numbers use the shortest 4-significant-digit form (as numeric.js)", () => {
    expect(prettyPrint(Math.PI)).toBe("3.142");
    expect(prettyPrint(-1e-7)).toBe("-1e-7");
    expect(prettyPrint(1e10)).toBe("1e10");
    expect(prettyPrint(2.5)).toBe("2.5");
    expect(prettyPrint(0)).toBe("0");
    expect(prettyPrint(NaN)).toBe("NaN");
    expect(prettyPrint(-Infinity)).toBe("-Infinity");
    expect(prettyPrint(Math.PI, { precision: 8 })).toBe("3.1415927");
    expect(prettyPrint(9.99999)).toBe("10");
});

test("arrays, matrices and tensors are aligned in columns", () => {
    expect(prettyPrint([1, 22, 333])).toBe("[  1,  22, 333]");
    expect(prettyPrint(new Matrix([[1, 2.5], [Math.PI, -1e-7]]))).toBe("[[    1,   2.5],\n [3.142, -1e-7]]");
    expect(String(new Tensor([[[1, 2]], [[3, 4]]]))).toBe("[[[1, 2]],\n\n [[3, 4]]]");
    expect(prettyPrint([[true, false]])).toBe("[[ true, false]]");
});

test("complex values", () => {
    expect(prettyPrint({ re: 1, im: -2 })).toBe("1-2i");
    expect(String(new Vector([1, 2], [0.5, -1]))).toBe("[1+0.5i,   2-1i]");
});

test("long arrays are summarized", () => {
    const s = prettyPrint(Array.from({ length: 100 }, (_, i) => i));
    // Column width comes from the entries actually shown
    expect(s).toBe("[ 0,  1,  2, ..., 97, 98, 99]");
    expect(prettyPrint(Array.from({ length: 10 }, (_, i) => i), { threshold: 4, edgeItems: 1 })).toBe("[0, ..., 9]");
});

test("sparse matrices and objects", () => {
    expect(String(SparseMatrix.fromDense([[4, 0], [0, 2.5]]))).toBe("SparseMatrix 2x2, 2 nonzeros\n  (0, 0)    4\n  (1, 1)  2.5");
    expect(prettyPrint(SparseMatrix.identity(2).mapValues(() => 0))).toBe("SparseMatrix 2x2, 0 nonzeros");
    expect(prettyPrint({ a: 1, b: [1, 2] })).toBe("{\n  a: 1,\n  b: [1, 2]\n}");
});
