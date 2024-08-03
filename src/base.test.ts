import { test, expect } from 'bun:test';
import { TensorBase } from './base';

test("TensorBase", () => {
    const data = [[1, 2], [3, 4], [5, 6]];
    const shape = [3, 2];
    const tensor = new TensorBase(data, shape);

    expect(tensor.data).toEqual(data);
    expect(tensor.shape).toEqual(shape);
    expect(tensor.size).toBe(6);
});