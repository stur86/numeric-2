/**
 * Cross-validation of the public element-wise API (maps, binary ops, reducers)
 * on vectors and matrices, real and complex, against NumPy.
 */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D, assertScalarClose } from "./runner";
import { Vector, Matrix, linalg } from "../index";

afterAll(() => killOracle());

const SEED = 42;
const SHAPES: [number, number][] = [[1, 1], [3, 5], [7, 13], [20, 4]];
const L = linalg as any;

type Cx1 = { re: number[]; im: number[] };
type Cx2 = { re: number[][]; im: number[][] };

const UNARY = ["sqrt", "abs", "exp", "log", "sin", "cos", "tan", "asin", "acos", "atan", "neg", "ceil", "floor"];

describe("public unary maps vs NumPy", () => {
    for (const op of UNARY) {
        test(`${op} vector`, async () => {
            const res = await oracle({ op, seed: SEED, n: 50 });
            const out = L[op](new Vector(res.inputs.x as number[]));
            expect(out).toBeInstanceOf(Vector);
            assertClose(out, res.expected as number[], 1e-12, `${op}: `);
        });

        for (const shape of SHAPES) {
            test(`${op} matrix ${shape.join("x")}`, async () => {
                const res = await oracle({ op, seed: SEED, shape });
                const out = L[op](new Matrix(res.inputs.x as number[][]));
                expect(out).toBeInstanceOf(Matrix);
                assertClose2D(out, res.expected as number[][], 1e-12, `${op}: `);
            });
        }
    }
});

const ARITH = ["add", "sub", "mul", "div", "mod", "pow", "atan2", "max", "min"];
const COMPARE = ["eq", "neq", "lt", "gt", "leq", "geq"];

describe("binary ops on matrices vs NumPy", () => {
    for (const op of [...ARITH, ...COMPARE]) {
        for (const variant of ["VV", "VS", "SV"] as const) {
            for (const shape of SHAPES) {
                test(`${op} ${variant} ${shape.join("x")}`, async () => {
                    const res = await oracle({ op, variant, seed: SEED, shape });
                    const { x, y } = res.inputs;
                    const mx = typeof x === "number" ? x : new Matrix(x as number[][]);
                    const my = typeof y === "number" ? y : new Matrix(y as number[][]);
                    const out = L[op](mx, my);
                    if (COMPARE.includes(op)) {
                        expect(out).toEqual(res.expected);
                    } else {
                        expect(out).toBeInstanceOf(Matrix);
                        assertClose2D(out, res.expected as number[][], 1e-12, `${op}: `);
                    }
                });
            }
        }
    }

    test("raw 2D arrays are treated as matrices", async () => {
        const res = await oracle({ op: "add", variant: "VV", seed: SEED, shape: [4, 6] });
        const out = linalg.add(res.inputs.x as number[][], res.inputs.y as number[][]);
        expect(out).toBeInstanceOf(Matrix);
        assertClose2D(out, res.expected as number[][], 1e-12, "add raw: ");
    });
});

// Public reducer name → oracle op
const REDUCERS: [string, string][] = [
    ["sum", "sum"], ["prod", "prod"], ["sup", "max"], ["inf", "min"],
    ["norm1", "norm1"], ["norm2", "norm2"], ["norm2squared", "norm2squared"], ["normInf", "normInf"],
];

describe("reducers vs NumPy", () => {
    for (const [fn, op] of REDUCERS) {
        test(`${fn} vector`, async () => {
            const res = await oracle({ op, seed: SEED, n: 30 });
            assertScalarClose(L[fn](res.inputs.x as number[]), res.expected as number, 1e-12, `${fn}: `);
        });

        for (const shape of SHAPES) {
            test(`${fn} matrix ${shape.join("x")}`, async () => {
                const res = await oracle({ op, seed: SEED, shape });
                assertScalarClose(L[fn](new Matrix(res.inputs.x as number[][])), res.expected as number, 1e-12, `${fn}: `);
            });
        }
    }
});

describe("complex matrices vs NumPy", () => {
    // VV only: complex scalars aren't public operands yet (VS/SV are covered by the kernel tests)
    for (const op of ["add", "sub", "mul", "div"]) {
        test(`${op} VV 6x5`, async () => {
            const res = await oracle({ op: `cx_${op}`, variant: "VV", seed: SEED, shape: [6, 5] });
            const x = res.inputs.x as unknown as Cx2, y = res.inputs.y as unknown as Cx2;
            const out = L[op](new Matrix(x.re, x.im), new Matrix(y.re, y.im)) as Matrix;
            const expected = res.expected as unknown as Cx2;
            expect(out).toBeInstanceOf(Matrix);
            assertClose2D(out.real as number[][], expected.re, 1e-12, `${op} re: `);
            assertClose2D(out.imag as number[][], expected.im, 1e-12, `${op} im: `);
        });
    }

    for (const realSide of ["x", "y"] as const) {
        test(`mul with real ${realSide} matrix`, async () => {
            const res = await oracle({ op: "cx_mul", variant: "VV", seed: SEED, shape: [6, 5], [`real_${realSide}`]: true });
            const x = res.inputs.x as unknown as Cx2, y = res.inputs.y as unknown as Cx2;
            const mx = realSide === "x" ? new Matrix(x.re) : new Matrix(x.re, x.im);
            const my = realSide === "y" ? new Matrix(y.re) : new Matrix(y.re, y.im);
            const out = linalg.mul(mx, my);
            const expected = res.expected as unknown as Cx2;
            assertClose2D(out.real as number[][], expected.re, 1e-12, "mixed re: ");
            assertClose2D(out.imag as number[][], expected.im, 1e-12, "mixed im: ");
        });
    }

    test("neg and conj", async () => {
        for (const op of ["neg", "conj"]) {
            const res = await oracle({ op: `cx_${op}`, seed: SEED, shape: [5, 7] });
            const x = res.inputs.x as unknown as Cx2;
            const out = L[op](new Matrix(x.re, x.im)) as Matrix;
            const expected = res.expected as unknown as Cx2;
            assertClose2D(out.real as number[][], expected.re, 1e-12, `${op} re: `);
            assertClose2D(out.imag as number[][], expected.im, 1e-12, `${op} im: `);
        }
    });

    test("abs returns a real matrix", async () => {
        const res = await oracle({ op: "cx_abs", seed: SEED, shape: [5, 7] });
        const x = res.inputs.x as unknown as Cx2;
        const out = linalg.abs(new Matrix(x.re, x.im));
        expect(out.is_complex).toBe(false);
        assertClose2D(out, (res.expected as unknown as Cx2).re, 1e-12, "abs: ");
    });

    test("abs of a complex vector is real", async () => {
        const res = await oracle({ op: "cx_abs", seed: SEED, n: 20 });
        const x = res.inputs.x as unknown as Cx1;
        const out = linalg.abs(new Vector(x.re, x.im));
        expect(out.is_complex).toBe(false);
        assertClose(out, (res.expected as unknown as Cx1).re, 1e-12, "abs: ");
    });

    for (const op of ["norm2", "norm2squared", "norm1", "normInf"]) {
        test(`${op} 6x5`, async () => {
            const res = await oracle({ op: `cx_${op}`, seed: SEED, shape: [6, 5] });
            const x = res.inputs.x as unknown as Cx2;
            assertScalarClose(L[op](new Matrix(x.re, x.im)), res.expected as number, 1e-12, `${op}: `);
        });
    }
});
