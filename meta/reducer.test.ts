import { VectorReducerMetaFunction } from "./reducer";
import { test, expect } from "bun:test";

test("VectorReducerMetaFunction", () => {
    // Simple norm2 reducer
    const n2sq_meta = new VectorReducerMetaFunction('norm2squared', ['x'], 'x_i*x_i', '+=');
    // Evaluate the source code
    expect(n2sq_meta.compileSource()).toMatchSnapshot();
    // Evaluate the function
    const norm2squared = n2sq_meta.compile();
    expect(norm2squared([3, 4], 2)).toEqual(25);
    // Try a dot product
    const dot_meta = new VectorReducerMetaFunction('dot', ['x', 'y'], 'x_i*y_i', '+=');
    expect(dot_meta.compileSource()).toMatchSnapshot();
    const dot = dot_meta.compile();
    expect(dot([1, 2], [3, 4], 2)).toEqual(11);
    // And a maximum
    const max_meta = new VectorReducerMetaFunction('max', ['x'], '(ans > x_i? ans : x_i)', '=', 'x_i');
    expect(max_meta.compileSource()).toMatchSnapshot();
    const max = max_meta.compile();
    expect(max([1, 2, 5, 4], 4)).toEqual(5);

    // Now the composite
    const n2source = n2sq_meta.compositeSource('norm2', 'Math.sqrt($ANS)');
    expect(n2source).toMatchSnapshot();
    expect(n2source.split('\n')[1].trim()).toEqual('return Math.sqrt(norm2squared(x, n));');
});