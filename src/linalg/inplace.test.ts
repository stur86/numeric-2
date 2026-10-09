import { test, expect, describe } from "bun:test";
import Vector from "../vector";
import Matrix from "../matrix";
import { complex } from "../complex";
import * as L from "./index";

const A = L as any;
const rnd = (n: number, lo = -2, hi = 2) => Array.from({ length: n }, (_, i) => lo + ((Math.sin(i * 12.9898 + n) * 43758.5453) % 1 + 1) % 1 * (hi - lo));
const vec = (n: number, cx: boolean, lo?: number, hi?: number) => new Vector(rnd(n, lo, hi), cx ? rnd(n + 7, lo, hi).slice(7) : null);
const mat = (m: number, n: number, cx: boolean, lo?: number, hi?: number) =>
    new Matrix(Array.from({ length: m }, (_, i) => rnd(n + i, lo, hi).slice(i)), cx ? Array.from({ length: m }, (_, i) => rnd(n + 30 + i, lo, hi).slice(30 + i)) : null);

/** Bit-for-bit equality of two tensors (NaN-aware). */
function expectSame(a: Vector | Matrix, b: Vector | Matrix) {
    expect(a.is_complex).toBe(b.is_complex);
    expect(Object.is(JSON.stringify(a.real), JSON.stringify(b.real))).toBe(true);
    if (a.is_complex) expect(JSON.stringify(a.imag)).toBe(JSON.stringify(b.imag));
}

const REAL_BIN = ["add", "sub", "mul", "div", "mod", "pow", "atan2", "max", "min", "trunc"];
const INT_BIN = ["band", "bor", "bxor", "lshift", "rshift", "rrshift"];
const CX_BIN = ["add", "sub", "mul", "div"];
const REAL_UN = ["sqrt", "abs", "exp", "log", "sin", "cos", "tan", "asin", "acos", "atan", "neg", "ceil", "floor", "round", "conj", "reciprocal", "bnot"];
const CX_UN = ["neg", "conj", "exp", "log", "sqrt", "sin", "cos", "reciprocal"];

describe("in-place ops match their allocating counterparts", () => {
    for (const shape of ["vector", "matrix"] as const) {
        const T = (cx: boolean, lo?: number, hi?: number) => (shape === "vector" ? vec(13, cx, lo, hi) : mat(4, 6, cx, lo, hi));
        test(`real binary ops, ${shape}`, () => {
            for (const op of [...REAL_BIN, ...INT_BIN]) {
                const int = INT_BIN.includes(op);
                const [lo, hi] = op === "pow" ? [0.1, 3] : int ? [0, 8] : [-2, 2];
                const x = T(false, lo, hi), y = T(false, lo, hi);
                const sx = int ? 3 : 1.7;
                const r1 = A[`i${op}`](x.clone(), y);
                expectSame(r1, A[op](x, y));
                expectSame(A[`i${op}`](x.clone(), sx), A[op](x, sx));
            }
        });
        test(`complex binary ops, ${shape}`, () => {
            for (const op of CX_BIN) {
                const x = T(true), y = T(true), yr = T(false);
                expectSame(A[`i${op}`](x.clone(), y), A[op](x, y));
                expectSame(A[`i${op}`](x.clone(), yr), A[op](x, yr));         // real operand into complex target
                expectSame(A[`i${op}`](x.clone(), complex(0.5, -1.5)), A[op](x, complex(0.5, -1.5)));
                expectSame(A[`i${op}`](x.clone(), 2.5), A[op](x, 2.5));
            }
        });
        test(`unary ops, ${shape}`, () => {
            for (const op of REAL_UN) {
                const x = op === "sqrt" || op === "log" ? T(false, 0.1, 3) : op === "asin" || op === "acos" ? T(false, -0.9, 0.9) : op === "bnot" ? T(false, 0, 100) : T(false);
                expectSame(A[`i${op}`](x.clone()), A[op](x));
            }
            for (const op of CX_UN) {
                const x = T(true);
                expectSame(A[`i${op}`](x.clone()), A[op](x));
            }
        });
    }
});

describe("in-place semantics", () => {
    test("returns the same object, and mutates raw arrays", () => {
        const v = new Vector([1, 2, 3]);
        expect(L.iadd(v, 1)).toBe(v);
        expect(v.real).toEqual([2, 3, 4]);
        const raw = [1, 2, 3];
        expect(L.imul(raw, [2, 2, 2])).toBe(raw);
        expect(raw).toEqual([2, 4, 6]);
        const rawM = [[1, 2], [3, 4]];
        L.ineg(rawM);
        expect(rawM).toEqual([[-1, -2], [-3, -4]]);
        const M = new Matrix([[1, 2], [3, 4]]);
        expect(L.isub(M, [[1, 1], [1, 1]])).toBe(M);
        expect(M.real).toEqual([[0, 1], [2, 3]]);
    });

    test("constructors wrap their arrays, so those change too (clone first to avoid it)", () => {
        const data = [1, 2, 3];
        L.iadd(new Vector(data), 10);
        expect(data).toEqual([11, 12, 13]);
        const kept = [1, 2, 3];
        L.iadd(new Vector(kept).clone(), 10);
        expect(kept).toEqual([1, 2, 3]);
    });

    test("complex into real throws; promotion is explicit", () => {
        const v = new Vector([1, 2]);
        expect(() => L.iadd(v, complex(0, 1))).toThrow("promoteToComplex");
        expect(() => L.imul(v, new Vector([1, 1], [0, 0]))).toThrow("promoteToComplex");
        expect(() => L.iadd(new Matrix([[1]]), new Matrix([[1]], [[1]]))).toThrow("promoteToComplex");
        L.iadd(v, complex(3, 0)); // zero imaginary part is a real scalar
        expect(v.real).toEqual([4, 5]);
        L.iadd(v.promoteToComplex(), complex(0, 1));
        expect(v.imag).toEqual([1, 1]);
    });

    test("ops without a complex kernel throw on complex targets", () => {
        const c = new Vector([1, 2], [1, 1]);
        expect(() => L.iabs(c)).toThrow("iabs is not supported for complex tensors");
        expect(() => L.imod(c, 2)).toThrow("not supported for complex");
        expect(() => L.iband(c, 1)).toThrow("not supported for complex");
    });

    test("shape checks", () => {
        expect(() => L.iadd(new Vector([1, 2]), [1, 2, 3])).toThrow("shape mismatch");
        expect(() => L.iadd(new Vector([1, 2]), new Matrix([[1, 2]]))).toThrow("shape mismatch");
        expect(() => L.iadd([[1, 2], [3]], 1)).toThrow("same length");
        expect(() => L.iadd([] as number[], 1)).toThrow("non-empty");
    });

    test("iconj is a no-op on real targets", () => {
        const v = new Vector([1, -2]);
        expect(L.iconj(v).real).toEqual([1, -2]);
    });
});
