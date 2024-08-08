import Vector from "../vector";
import { norm2 } from "./norm";
import { test, expect } from "bun:test";

test("norm2", () => {
    // On vector
    const x = new Vector([1, 2, 3, 4]);
    expect(norm2(x)).toBeCloseTo(5.477225575051661);
});