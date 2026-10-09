import { test, expect } from "bun:test";
import Matrix from "./matrix";

test("Matrix construction", () => {
    const m = new Matrix([[1, 2], [3, 4]]);
    expect(m.shape).toEqual([2, 2]);
    expect(m.nrows).toBe(2);
    expect(m.ncols).toBe(2);
    expect(m.real).toEqual([[1, 2], [3, 4]]);
    expect(m.imag).toBeNull();
    expect(m.is_complex).toBe(false);
    expect(m.size).toBe(4);
});

test("Matrix rectangular", () => {
    const m = new Matrix([[1, 2, 3], [4, 5, 6]]);
    expect(m.shape).toEqual([2, 3]);
    expect(m.nrows).toBe(2);
    expect(m.ncols).toBe(3);
    expect(m.size).toBe(6);
});

test("Matrix complex", () => {
    const m = new Matrix([[1, 2], [3, 4]], [[5, 6], [7, 8]]);
    expect(m.is_complex).toBe(true);
    expect(m.imag).toEqual([[5, 6], [7, 8]]);
});

test("Matrix empty row throws", () => {
    expect(() => new Matrix([])).toThrow("at least one row");
});

test("Matrix empty column throws", () => {
    expect(() => new Matrix([[]])).toThrow("at least one column");
});

test("Matrix inconsistent rows throws", () => {
    expect(() => new Matrix([[1, 2], [3]])).toThrow("same length");
});

test("Matrix im shape mismatch throws", () => {
    expect(() => new Matrix([[1, 2]], [[1, 2], [3, 4]])).toThrow("same number of rows");
    expect(() => new Matrix([[1, 2]], [[1]])).toThrow("same shape");
});