import { VectorReducerMetaFunction } from "./reducers";
import { test, expect } from "bun:test";

test("VectorReducerMetaFunction", () => {
    // Simple norm2 reducer
    const n2r = new VectorReducerMetaFunction('norm2', ['x'], 'x_i*x_i', '+=');
    // Evaluate the source code
    expect(n2r.compileSource()).toMatchSnapshot();
    // Evaluate the function
    const f = n2r.compile();
    expect(f([3, 4], 2)).toEqual(25);
    // Try a dot product
    const dot = new VectorReducerMetaFunction('dot', ['x', 'y'], 'x_i*y_i', '+=');
    expect(dot.compileSource()).toMatchSnapshot();
    const f2 = dot.compile();
    expect(f2([1, 2], [3, 4], 2)).toEqual(11);
    // And a maximum
    const max = new VectorReducerMetaFunction('max', ['x'], '(ans > x_i? ans : x_i)', '=', 'x_i');
    expect(max.compileSource()).toMatchSnapshot();
    const f3 = max.compile();
    expect(f3([1, 2, 5, 4], 4)).toEqual(5);
});