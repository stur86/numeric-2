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
});
