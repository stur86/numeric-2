import { test, expect } from 'bun:test';
import Vector from './vector';

test("Vector", () => {
    const data = [1, 2, 3];
    const vector = new Vector(data);

    expect(vector.data).toEqual(data);
    expect(vector.shape).toEqual([3]);
    expect(vector.size).toBe(3);
    expect(vector.length).toBe(3);
});