import Vector from "../vector";
import { norm2, norm2squared, norm1, normInf } from "./norm";
import { test, expect } from "bun:test";

test("norm2", () => {
    // On vector
    const x = new Vector([1, 2, 3, 4]);
    expect(norm2(x)).toBeCloseTo(5.477225575051661);
});

test("norm2squared", () => {
    // On vector
    const x = new Vector([3, 4]);
    expect(norm2squared(x)).toBe(25);
});

test("norm1", () => {
    // On vector
    const x = new Vector([1, 2, -3, 4]);
    expect(norm1(x)).toBe(10);
});

test("normInf", () => {
    // On vector
    const x = new Vector([1, 2, -3, -4]);
    expect(normInf(x)).toBe(4);
});