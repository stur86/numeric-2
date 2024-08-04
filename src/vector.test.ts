import { test, expect } from "bun:test";
import Vector from "./vector";

test("Vector", () => {
  const rdata = [1, 2, 3];
  const idata = [4, 5, 6];
  const vector = new Vector(rdata, idata);

  expect(vector.real).toEqual(rdata);
  expect(vector.imag).toEqual(idata);
  expect(vector.shape).toEqual([3]);
  expect(vector.size).toBe(3);
  expect(vector.length).toBe(3);

  // Test operations
  const v = new Vector([1.0, -2.0, 0.5]);

  expect(v.norm2Squared()).toBeCloseTo(5.25);
  expect(v.norm2()).toBeCloseTo(Math.sqrt(5.25));
  expect(v.norm1()).toBeCloseTo(3.5);
  expect(v.normInf()).toBeCloseTo(2.0);
});
