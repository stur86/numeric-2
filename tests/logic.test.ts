/** Logical, bitwise, trunc and reciprocal ops vs NumPy, on vectors and matrices. */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D } from "./runner";
import { linalg, Vector, Matrix } from "../index";

afterAll(() => killOracle());

const L = linalg as any;
const BIN = ["band", "bor", "bxor"] as const;
const SHIFT = ["lshift", "rshift", "rrshift"] as const;

describe("element-wise logic vs NumPy", () => {
    for (const shape of [null, [7, 5]] as const) {
        const label = shape ? "matrix" : "vector";
        test(label, async () => {
            const res = await oracle(shape ? { op: "logic", seed: 3, shape: [7, 5] } : { op: "logic", seed: 3, n: 64 });
            const i = res.inputs as any, e = res.expected as any;
            const T = (v: any) => (shape ? new Matrix(v) : new Vector(v));
            const check = (out: any, exp: any, tol: number, name: string) => {
                const data = out instanceof Vector || out instanceof Matrix ? out.real : out;
                if (shape) assertClose2D(data, exp, tol, `${name} `);
                else assertClose(data, exp, tol, `${name} `);
            };
            for (const op of BIN) check(L[op](T(i.a), T(i.b)), e[op], 0, op);
            for (const op of SHIFT) check(L[op](T(i.a), T(i.k)), e[op], 0, op);
            check(linalg.bnot(T(i.a)), e.bnot, 0, "bnot");
            check(linalg.trunc(T(i.x), T(i.y)), e.trunc, 1e-12, "trunc");
            check(linalg.reciprocal(T(i.x)), e.reciprocal, 1e-14, "reciprocal");
            // Logical ops give booleans
            expect(linalg.and(T(i.p), T(i.q))).toEqual(e.and);
            expect(linalg.or(T(i.p), T(i.q))).toEqual(e.or);
            expect(linalg.not(T(i.p))).toEqual(e.not);
            // Complex reciprocal
            const z = shape ? new Matrix(i.z.re, i.z.im) : new Vector(i.z.re, i.z.im);
            const r = linalg.reciprocal(z as any) as Vector | Matrix;
            check(r.real, e.cx_reciprocal.re, 1e-13, "cx reciprocal re");
            check(r.imag, e.cx_reciprocal.im, 1e-13, "cx reciprocal im");
        });
    }

    test("scalars, raw arrays and boolean arrays", () => {
        expect(linalg.band([12, 10], 6).real).toEqual([4, 2]);
        expect(linalg.lshift(1, [0, 3, 4]).real).toEqual([1, 8, 16]);
        expect(linalg.trunc([1.26, -3.74], 0.5).real).toEqual([1.5, -3.5]);
        const x = [-2, -1, 0, 1, 2];
        // Combine comparison results directly
        expect(linalg.and(linalg.gt(x, -2), linalg.lt(x, 2))).toEqual([false, true, true, true, false]);
        expect(linalg.or([true, false], [false, false])).toEqual([true, false]);
        expect(linalg.not([0, 3])).toEqual([true, false]);
        expect(linalg.not([[true], [false]])).toEqual([[false], [true]]);
        expect(() => linalg.band(new Vector([1], [1]), 1)).toThrow("not supported for complex");
    });
});
