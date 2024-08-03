import { test, expect } from "bun:test";
import { TensorBase } from "./base";

test("TensorBase", () => {
  const data = [
    [1, 2],
    [3, 4],
    [5, 6],
  ];
  const shape = [3, 2];
  const tensor = new TensorBase(data, null, shape);

  expect(tensor.real).toEqual(data);
  expect(tensor.imag).toBe(null);
  expect(tensor.shape).toEqual(shape);
  expect(tensor.size).toBe(6);
  expect(tensor.is_complex).toBe(false);
});
