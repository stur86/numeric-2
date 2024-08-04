import { VectorReducerMetaFunction } from "./reducer";
import { test, expect } from "bun:test";

test("VectorReducerMetaFunction", () => {
    // Simple norm2 reducer
    const n2sq_meta = new VectorReducerMetaFunction({
        name: 'norm2squared',
        dataArgs: ['x'],
        reduceElement: 'x_i*x_i',
        reduceOperator: '+=',
    });
    // Evaluate the source code
    expect(n2sq_meta.compileSource()).toMatchSnapshot();
    // Evaluate the function
    const norm2squared = n2sq_meta.compile();
    expect(norm2squared([3, 4], 2)).toEqual(25);
    // Try a dot product
    const dot_meta = new VectorReducerMetaFunction({
        name: 'dot',
        dataArgs: ['x', 'y'],
        reduceElement: 'x_i*y_i',
        reduceOperator: '+='
    });
    expect(dot_meta.compileSource()).toMatchSnapshot();
    const dot = dot_meta.compile();
    expect(dot([1, 2], [3, 4], 2)).toEqual(11);
    // And a maximum
    const max_meta = new VectorReducerMetaFunction({
        name: 'max',
        dataArgs: ['x'],
        reduceElement: 'Math.max(ans, x_i)',
        reduceOperator: '=',
        initElement: 'x_i'
    });
    expect(max_meta.compileSource()).toMatchSnapshot();
    const max = max_meta.compile();
    expect(max([1, 2, 5, 4], 4)).toEqual(5);
    // Try a composite
    const n2_meta = new VectorReducerMetaFunction({
        name: 'norm2',
        dataArgs: ['x'],
        reduceElement: 'x_i*x_i',
        reduceOperator: '+=',
        resultTransform: 'Math.sqrt(ans)'
    });
    expect(n2_meta.compileSource()).toMatchSnapshot();
    const norm2 = n2_meta.compile();
    expect(norm2([3, 4], 2)).toEqual(5);
});