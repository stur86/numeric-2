import { test, expect } from "bun:test";
import { dot, dotVV, dotMV, dotVM, dotMMsmall, dotMMbig } from "./dot";
import { identity, transpose } from "../utils";

// dotVV

test("dotVV basic", () => {
    expect(dotVV([1, 2, 3], [4, 5, 6])).toBe(32);
});

test("dotVV single element", () => {
    expect(dotVV([3], [4])).toBe(12);
});

test("dotVV two elements", () => {
    expect(dotVV([1, 2], [3, 4])).toBe(11);
});

test("dotVV orthogonal", () => {
    expect(dotVV([1, 0, 0], [0, 1, 0])).toBe(0);
});

// dotMV

test("dotMV 2x2", () => {
    const A = [[1, 2], [3, 4]];
    const x = [5, 6];
    expect(dotMV(A, x)).toEqual([17, 39]);
});

test("dotMV 3x3", () => {
    const A = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const x = [7, 8, 9];
    expect(dotMV(A, x)).toEqual([7, 8, 9]);
});

test("dotMV rectangular", () => {
    const A = [[1, 2, 3], [4, 5, 6]]; // 2x3
    const x = [1, 1, 1]; // 3x1
    expect(dotMV(A, x)).toEqual([6, 15]);
});

// dotVM

test("dotVM 2x2", () => {
    const x = [1, 2];
    const A = [[3, 4], [5, 6]];
    expect(dotVM(x, A)).toEqual([13, 16]);
});

test("dotVM matches transpose dotMV", () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const x = [7, 8];
    const result1 = dotVM(x, A);
    const result2 = dotMV(transpose(A), x);
    expect(result1).toEqual(result2);
});

// dotMM

test("dotMMsmall 2x2", () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    expect(dotMMsmall(A, B)).toEqual([[19, 22], [43, 50]]);
});

test("dotMMsmall identity", () => {
    const A = [[1, 2], [3, 4]];
    const I = identity(2);
    expect(dotMMsmall(A, I)).toEqual(A);
    expect(dotMMsmall(I, A)).toEqual(A);
});

test("dotMMsmall rectangular", () => {
    const A = [[1, 2, 3], [4, 5, 6]]; // 2x3
    const B = [[1, 2], [3, 4], [5, 6]]; // 3x2
    expect(dotMMsmall(A, B)).toEqual([[22, 28], [49, 64]]);
});

test("dotMMbig matches dotMMsmall", () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    expect(dotMMbig(A, B)).toEqual(dotMMsmall(A, B));
});

test("dotMMbig identity", () => {
    const A = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const I = identity(3);
    expect(dotMMbig(A, I)).toEqual(A);
});

// dot dispatcher

test("dot scalar * scalar", () => {
    expect(dot(3, 4)).toBe(12);
});

test("dot vector * vector", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
});

test("dot matrix * vector", () => {
    expect(dot([[1, 2], [3, 4]], [5, 6]).real).toEqual([17, 39]);
});

test("dot vector * matrix", () => {
    expect(dot([1, 2], [[3, 4], [5, 6]]).real).toEqual([13, 16]);
});

test("dot matrix * matrix", () => {
    expect(dot([[1, 2], [3, 4]], [[5, 6], [7, 8]]).real).toEqual([[19, 22], [43, 50]]);
});

test("dot scalar * vector", () => {
    expect(dot(3, [1, 2, 3]).real).toEqual([3, 6, 9]);
});

test("dot vector * scalar", () => {
    expect(dot([1, 2, 3], 3).real).toEqual([3, 6, 9]);
});

// Larger matrix to trigger dotMMbig path

test("dot large matrix uses big path", () => {
    const n = 12;
    const I = identity(n);
    const A: number[][] = [];
    for (let i = 0; i < n; i++) {
        const row = Array(n);
        for (let j = 0; j < n; j++) row[j] = i * n + j;
        A.push(row);
    }
    // A * I should equal A
    expect(dot(A, I).real).toEqual(A);
});