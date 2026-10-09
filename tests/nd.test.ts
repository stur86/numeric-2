/** Element-wise ops, reductions and in-place ops on N-D tensors (3-D and 4-D) vs NumPy. */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle } from "./runner";
import { linalg, Tensor, Matrix, Vector } from "../index";

afterAll(() => killOracle());

const L = linalg as any;
const SHAPES = [[2, 3, 4], [3, 1, 5], [2, 2, 3, 2]];

/** Compare nested arrays element by element (relative tolerance). */
function close(a: any, b: any, tol: number, path = ""): void {
    if (Array.isArray(b)) {
        expect(Array.isArray(a)).toBe(true);
        expect(a.length).toBe(b.length);
        b.forEach((bi: any, i: number) => close(a[i], bi, tol, `${path}[${i}]`));
        return;
    }
    if (typeof b === "boolean") return void expect(a).toBe(b);
    if (Number.isNaN(b)) return void expect(Number.isNaN(a)).toBe(true);
    if (Math.abs(a - b) > tol * Math.max(1, Math.abs(b))) throw new Error(`${path}: ${a} vs ${b}`);
}

describe("N-D element-wise ops vs NumPy", () => {
    for (const shape of SHAPES) {
        const label = shape.join("×");
        test(`unary maps, ${label}`, async () => {
            for (const op of ["sqrt", "abs", "exp", "log", "sin", "cos", "neg", "floor"]) {
                const res = await oracle({ op, seed: 5, shape: shape as any });
                const out = L[op](new Tensor(res.inputs.x as any));
                expect(out).toBeInstanceOf(Tensor);
                expect(out.shape).toEqual(shape);
                close(out.real, res.expected, 1e-12, op);
                // Raw nested arrays become Tensors too
                expect(L[op](res.inputs.x)).toBeInstanceOf(Tensor);
            }
        });

        test(`binary ops, ${label}`, async () => {
            for (const op of ["add", "sub", "mul", "div", "pow", "max", "lt", "geq"]) {
                for (const variant of ["VV", "VS", "SV"]) {
                    const res = await oracle({ op, variant, seed: 6, shape: shape as any });
                    const { x, y } = res.inputs as any;
                    const T = (v: any) => (typeof v === "number" ? v : new Tensor(v));
                    const out = L[op](T(x), T(y));
                    close(out instanceof Tensor ? out.real : out, res.expected, 1e-12, `${op} ${variant}`);
                }
            }
        });

        test(`reductions and norms, ${label}`, async () => {
            for (const [fn, op] of [["sum", "sum"], ["prod", "prod"], ["sup", "max"], ["inf", "min"], ["norm2", "norm2"], ["norm1", "norm1"], ["normInf", "normInf"]]) {
                const res = await oracle({ op, seed: 7, shape: shape as any });
                close(L[fn](new Tensor(res.inputs.x as any)), res.expected, 1e-12, fn);
            }
        });

        test(`complex tensors, ${label}`, async () => {
            for (const op of ["add", "mul", "div"]) {
                const res = await oracle({ op: `cx_${op}`, variant: "VV", seed: 8, shape: shape as any });
                const { x, y } = res.inputs as any, e = res.expected as any;
                const out = L[op](new Tensor(x.re, x.im), new Tensor(y.re, y.im));
                close(out.real, e.re, 1e-12, `${op} re`);
                close(out.imag, e.im, 1e-12, `${op} im`);
            }
            const res = await oracle({ op: "cx_exp", seed: 9, shape: shape as any });
            const x = res.inputs.x as any, e = res.expected as any;
            const out = linalg.exp(new Tensor(x.re, x.im));
            close(out.real, e.re, 1e-12, "exp re");
            close(out.imag, e.im, 1e-12, "exp im");
            const s = linalg.sum(new Tensor(x.re, x.im)) as any;
            const flat = (a: any): number[] => (Array.isArray(a) ? a.flatMap(flat) : [a]);
            close(s.re, flat(x.re).reduce((p, q) => p + q, 0), 1e-12, "cx sum re");
        });
    }
});

describe("N-D semantics", () => {
    test("in-place ops on tensors and deep raw arrays", () => {
        const T = new Tensor([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
        expect(linalg.imul(T, 2)).toBe(T);
        expect(T.real).toEqual([[[2, 4], [6, 8]], [[10, 12], [14, 16]]]);
        linalg.isub(T, T.clone());
        expect(T.real).toEqual([[[0, 0], [0, 0]], [[0, 0], [0, 0]]]);
        const raw = [[[1, 4]], [[9, 16]]];
        linalg.isqrt(raw);
        expect(raw).toEqual([[[1, 2]], [[3, 4]]]);
        expect(() => linalg.iadd(T, new Tensor([[[1]]], [[[1]]]))).toThrow("shape mismatch");
        expect(() => linalg.iadd(T, new Tensor([[[1, 1], [1, 1]], [[1, 1], [1, 1]]], [[[1, 0], [0, 0]], [[0, 0], [0, 0]]]))).toThrow("promoteToComplex");
    });

    test("shape and kind mismatches", () => {
        const A = new Tensor([[[1, 2]], [[3, 4]]]);
        expect(() => linalg.add(A, new Tensor([[[1, 2, 3]], [[3, 4, 5]]]))).toThrow("shape mismatch");
        expect(() => linalg.add(A, new Matrix([[1, 2], [3, 4]]))).toThrow("cannot combine a tensor with a matrix");
        expect(() => new Tensor([[[1, 2]], [[3]]] as any)).toThrow("ragged");
    });

    test("Tensor element access", () => {
        const T = Tensor.zeros([2, 3, 4]);
        expect(T.ndim).toBe(3);
        T.set(1, 2, 3, 7);
        expect(T.get(1, 2, 3)).toBe(7);
        expect(() => T.set(0, 0, 0, { re: 1, im: 1 })).toThrow("promoteToComplex");
        T.promoteToComplex().set(0, 0, 0, { re: 1, im: 1 });
        expect(T.get(0, 0, 0)).toEqual({ re: 1, im: 1 });
        expect(() => T.get(2, 0, 0)).toThrow("out of range");
        const c = T.clone();
        c.set(1, 2, 3, 0);
        expect(T.get(1, 2, 3)).toEqual({ re: 7, im: 0 });
        // Vectors and matrices keep their classes
        expect(linalg.add(new Vector([1]), 1)).toBeInstanceOf(Vector);
    });
});
