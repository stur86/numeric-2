import { VectorMapMetaFunction } from "./map";
import { test, expect } from "bun:test";

test("VectorMapMetaFunction", () => {
    const sqrt_meta = new VectorMapMetaFunction({
        name: 'sqrt',
        dataArgs: ['x'],
        mapElement: 'Math.sqrt(x_i)'
    });

    expect(sqrt_meta.compileSource()).toMatchSnapshot();
    // Evaluate the function
    const sqrt = sqrt_meta.compile();
    expect(sqrt([4, 9], 2)).toEqual([2, 3]);

    // Try with two arguments
    const add_meta = new VectorMapMetaFunction({
        name: 'add',
        dataArgs: ['x', 'y'],
        mapElement: 'x_i + y_i'
    });

    expect(add_meta.compileSource()).toMatchSnapshot();
    const add = add_meta.compile();
    expect(add([1, 2], [3, 4], 2)).toEqual([4, 6]);
});