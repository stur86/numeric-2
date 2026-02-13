import { VectorBinopMetaFunction } from "./binop";
import { test, expect } from "bun:test";

test("VectorBinopMetaFunction - arithmetic add", () => {
    const add = new VectorBinopMetaFunction({
        name: 'add',
        expression: 'x_i + y_i',
    });

    // Snapshot tests for generated source
    expect(add.compileSourceVV()).toMatchSnapshot();
    expect(add.compileSourceVS()).toMatchSnapshot();
    expect(add.compileSourceSV()).toMatchSnapshot();

    // Correctness tests
    const addVV = add.compile('VV');
    expect(addVV([1, 2, 3], [4, 5, 6], 3)).toEqual([5, 7, 9]);

    const addVS = add.compile('VS');
    expect(addVS([1, 2, 3], 10, 3)).toEqual([11, 12, 13]);

    const addSV = add.compile('SV');
    expect(addSV(10, [1, 2, 3], 3)).toEqual([11, 12, 13]);
});

test("VectorBinopMetaFunction - arithmetic sub", () => {
    const sub = new VectorBinopMetaFunction({
        name: 'sub',
        expression: 'x_i - y_i',
    });

    const subVV = sub.compile('VV');
    expect(subVV([5, 7, 9], [1, 2, 3], 3)).toEqual([4, 5, 6]);

    const subVS = sub.compile('VS');
    expect(subVS([10, 20, 30], 5, 3)).toEqual([5, 15, 25]);

    const subSV = sub.compile('SV');
    expect(subSV(10, [1, 2, 3], 3)).toEqual([9, 8, 7]);
});

test("VectorBinopMetaFunction - arithmetic mul", () => {
    const mul = new VectorBinopMetaFunction({
        name: 'mul',
        expression: 'x_i * y_i',
    });

    const mulVV = mul.compile('VV');
    expect(mulVV([2, 3, 4], [5, 6, 7], 3)).toEqual([10, 18, 28]);

    const mulVS = mul.compile('VS');
    expect(mulVS([1, 2, 3], 3, 3)).toEqual([3, 6, 9]);
});

test("VectorBinopMetaFunction - arithmetic div", () => {
    const div = new VectorBinopMetaFunction({
        name: 'div',
        expression: 'x_i / y_i',
    });

    const divVV = div.compile('VV');
    expect(divVV([10, 20, 30], [2, 4, 5], 3)).toEqual([5, 5, 6]);

    const divVS = div.compile('VS');
    expect(divVS([10, 20, 30], 10, 3)).toEqual([1, 2, 3]);

    // Division by zero
    const divByZero = div.compile('VV');
    expect(divByZero([1, 2], [0, 0], 2)).toEqual([Infinity, Infinity]);
});

test("VectorBinopMetaFunction - arithmetic mod", () => {
    const mod = new VectorBinopMetaFunction({
        name: 'mod',
        expression: 'x_i % y_i',
    });

    const modVV = mod.compile('VV');
    expect(modVV([10, 7, 15], [3, 4, 6], 3)).toEqual([1, 3, 3]);
});

test("VectorBinopMetaFunction - math pow", () => {
    const pow = new VectorBinopMetaFunction({
        name: 'pow',
        expression: 'Math.pow(x_i, y_i)',
    });

    expect(pow.compileSourceVV()).toMatchSnapshot();

    const powVV = pow.compile('VV');
    expect(powVV([2, 3, 4], [3, 2, 1], 3)).toEqual([8, 9, 4]);

    const powVS = pow.compile('VS');
    expect(powVS([2, 3, 4], 2, 3)).toEqual([4, 9, 16]);
});

test("VectorBinopMetaFunction - math atan2", () => {
    const atan2 = new VectorBinopMetaFunction({
        name: 'atan2',
        expression: 'Math.atan2(x_i, y_i)',
    });

    const atan2VV = atan2.compile('VV');
    const result = atan2VV([1, 0], [0, 1], 2);
    expect(result[0]).toBeCloseTo(Math.PI / 2);
    expect(result[1]).toBeCloseTo(0);
});

test("VectorBinopMetaFunction - math max/min", () => {
    const max = new VectorBinopMetaFunction({
        name: 'max',
        expression: 'Math.max(x_i, y_i)',
    });

    const maxVV = max.compile('VV');
    expect(maxVV([1, 5, 3], [4, 2, 6], 3)).toEqual([4, 5, 6]);

    const min = new VectorBinopMetaFunction({
        name: 'min',
        expression: 'Math.min(x_i, y_i)',
    });

    const minVV = min.compile('VV');
    expect(minVV([1, 5, 3], [4, 2, 6], 3)).toEqual([1, 2, 3]);
});

test("VectorBinopMetaFunction - comparison eq", () => {
    const eq = new VectorBinopMetaFunction({
        name: 'eq',
        expression: 'x_i === y_i',
        returnType: 'number',
    });

    expect(eq.compileSourceVV()).toMatchSnapshot();

    const eqVV = eq.compile('VV');
    expect(eqVV([1, 2, 3], [1, 5, 3], 3)).toEqual([true, false, true]);
});

test("VectorBinopMetaFunction - comparison lt/gt/leq/geq/neq", () => {
    const lt = new VectorBinopMetaFunction({ name: 'lt', expression: 'x_i < y_i' });
    const ltVV = lt.compile('VV');
    expect(ltVV([1, 5, 3], [2, 3, 3], 3)).toEqual([true, false, false]);

    const gt = new VectorBinopMetaFunction({ name: 'gt', expression: 'x_i > y_i' });
    const gtVV = gt.compile('VV');
    expect(gtVV([1, 5, 3], [2, 3, 3], 3)).toEqual([false, true, false]);

    const leq = new VectorBinopMetaFunction({ name: 'leq', expression: 'x_i <= y_i' });
    const leqVV = leq.compile('VV');
    expect(leqVV([1, 5, 3], [2, 3, 3], 3)).toEqual([true, false, true]);

    const geq = new VectorBinopMetaFunction({ name: 'geq', expression: 'x_i >= y_i' });
    const geqVV = geq.compile('VV');
    expect(geqVV([1, 5, 3], [2, 3, 3], 3)).toEqual([false, true, true]);

    const neq = new VectorBinopMetaFunction({ name: 'neq', expression: 'x_i !== y_i' });
    const neqVV = neq.compile('VV');
    expect(neqVV([1, 2, 3], [1, 5, 3], 3)).toEqual([false, true, false]);
});

test("VectorBinopMetaFunction - single element", () => {
    const add = new VectorBinopMetaFunction({ name: 'add', expression: 'x_i + y_i' });
    const addVV = add.compile('VV');
    expect(addVV([5], [3], 1)).toEqual([8]);
});

test("VectorBinopMetaFunction - negative values", () => {
    const mul = new VectorBinopMetaFunction({ name: 'mul', expression: 'x_i * y_i' });
    const mulVV = mul.compile('VV');
    expect(mulVV([-1, -2, 3], [4, -5, -6], 3)).toEqual([-4, 10, -18]);
});