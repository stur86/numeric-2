/**
 * In-place element-wise operations: they overwrite their first argument and
 * return it, instead of allocating a result.
 *
 * The target may be a Vector, a Matrix, or a raw number[] / number[][]. Note
 * that tensors wrap their arrays without copying, so arrays a tensor was
 * built from are modified too (use clone() first if that matters).
 *
 * Writing complex values into a real target throws: promote it first with
 * promoteToComplex(). Ops without a complex kernel throw on complex targets.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import Tensor, { shapeOf } from "../tensor";
import NumericCore from "../core";
import { type Complex, isComplex } from "../complex";
import type { Operand } from "./arithmetic";

/** Anything an in-place op can write into. */
export type InPlaceTarget = Vector | Matrix | Tensor | number[] | number[][] | number[][][];

const kernel = (name: string): Function | undefined => {
    const k = NumericCore[name as keyof typeof NumericCore];
    return typeof k === "function" ? k : undefined;
};

/** Innermost rows (a vector is one row) and imaginary rows if complex, plus the shape. */
type Parts = { re: number[][]; im: number[][] | null; shape: number[] };

function rowsOf(data: any, ndim: number): number[][] {
    if (ndim === 1) return [data];
    if (ndim === 2) return data;
    const out: number[][] = [];
    for (const sub of data) for (const r of rowsOf(sub, ndim - 1)) out.push(r);
    return out;
}

function partsOf(x: unknown, fname: string, role: string): Parts {
    if (x instanceof Vector || x instanceof Matrix || x instanceof Tensor) {
        const nd = x.shape.length;
        return { re: rowsOf(x.real, nd), im: x.imag === null ? null : rowsOf(x.imag, nd), shape: x.shape };
    }
    if (Array.isArray(x) && x.length > 0) {
        let shape: number[];
        try {
            shape = shapeOf(x as any, fname);
        } catch {
            throw new Error(`${fname}: ${role} rows must all have the same length`);
        }
        return { re: rowsOf(x, shape.length), im: null, shape };
    }
    throw new Error(`${fname}: ${role} must be a Vector, Matrix, Tensor or non-empty array`);
}

const complexIntoReal = (fname: string) =>
    new Error(`${fname}: cannot write complex values into a real target (call promoteToComplex() first)`);
const zeros = (n: number) => new Array(n).fill(0);

/** Build an in-place binary op from the `_re_v_i${name}` / `_cx_v_i${name}` kernels. */
function inplaceBinary(name: string) {
    const fname = `i${name}`;
    const reVV = kernel(`_re_v_i${name}VV`)!, reVS = kernel(`_re_v_i${name}VS`)!;
    const cxVV = kernel(`_cx_v_i${name}VV`), cxVS = kernel(`_cx_v_i${name}VS`);

    return <T extends InPlaceTarget>(x: T, y: Operand): T => {
        // Fast path: real vector with a real scalar or real vector of the same length
        if (x instanceof Vector && x._im === null) {
            const n = x._re.length;
            if (typeof y === "number") { reVS(x._re, y, n); return x; }
            if (y instanceof Vector && y._im === null && y._re.length === n) { reVV(x._re, y._re, n); return x; }
        }

        const t = partsOf(x, fname, "target");
        const m = t.re.length, n = t.re[0].length;

        // Scalar operand
        if (typeof y === "number" || isComplex(y)) {
            const yr = typeof y === "number" ? y : (y as Complex).re;
            const yi = typeof y === "number" ? 0 : (y as Complex).im;
            if (t.im === null) {
                if (yi !== 0) throw complexIntoReal(fname);
                for (let i = 0; i < m; i++) reVS(t.re[i], yr, n);
            } else {
                if (!cxVS) throw new Error(`${fname} is not supported for complex tensors`);
                for (let i = 0; i < m; i++) cxVS(t.re[i], t.im[i], yr, yi, n);
            }
            return x;
        }

        // Tensor operand: same shape required
        const u = partsOf(y, fname, "operand");
        if (u.shape.length !== t.shape.length || u.shape.some((d, i) => d !== t.shape[i])) {
            throw new Error(`${fname}: shape mismatch (${t.shape.join("x")} vs ${u.shape.join("x")})`);
        }
        if (t.im === null) {
            if (u.im !== null) throw complexIntoReal(fname);
            for (let i = 0; i < m; i++) reVV(t.re[i], u.re[i], n);
        } else {
            if (!cxVV) throw new Error(`${fname} is not supported for complex tensors`);
            for (let i = 0; i < m; i++) cxVV(t.re[i], t.im[i], u.re[i], u.im === null ? zeros(n) : u.im[i], n);
        }
        return x;
    };
}

/** Build an in-place unary op from the `_re_v_i${name}` / `_cx_v_i${name}` kernels. */
function inplaceUnary(name: string) {
    const fname = `i${name}`;
    const re = kernel(`_re_v_i${name}`)!, cx = kernel(`_cx_v_i${name}`);
    return <T extends InPlaceTarget>(x: T): T => {
        if (x instanceof Vector && x._im === null) {
            re(x._re, x._re.length);
            return x;
        }
        const t = partsOf(x, fname, "target");
        const n = t.re[0].length;
        if (t.im === null) {
            for (const row of t.re) re(row, n);
        } else {
            if (!cx) throw new Error(`${fname} is not supported for complex tensors`);
            for (let i = 0; i < t.re.length; i++) cx(t.re[i], t.im[i], n);
        }
        return x;
    };
}

// ── Binary: x ← x op y ──

/** x ← x + y (in place). Returns x. */
export const iadd = inplaceBinary("add");
/** x ← x − y (in place). Returns x. */
export const isub = inplaceBinary("sub");
/** x ← x · y, element-wise (in place). Returns x. */
export const imul = inplaceBinary("mul");
/** x ← x / y, element-wise (in place). Returns x. */
export const idiv = inplaceBinary("div");
/** x ← x % y (truncated remainder, in place; real only). Returns x. */
export const imod = inplaceBinary("mod");
/** x ← x^y (in place; real only). Returns x. */
export const ipow = inplaceBinary("pow");
/** x ← atan2(x, y) (in place; real only). Returns x. */
export const iatan2 = inplaceBinary("atan2");
/** x ← max(x, y) (in place; real only). Returns x. */
export const imax = inplaceBinary("max");
/** x ← min(x, y) (in place; real only). Returns x. */
export const imin = inplaceBinary("min");
/** x ← x & y (in place; real only). Returns x. */
export const iband = inplaceBinary("band");
/** x ← x | y (in place; real only). Returns x. */
export const ibor = inplaceBinary("bor");
/** x ← x ^ y (in place; real only). Returns x. */
export const ibxor = inplaceBinary("bxor");
/** x ← x << y (in place; real only). Returns x. */
export const ilshift = inplaceBinary("lshift");
/** x ← x >> y (in place; real only). Returns x. */
export const irshift = inplaceBinary("rshift");
/** x ← x >>> y (in place; real only). Returns x. */
export const irrshift = inplaceBinary("rrshift");
/** x ← round(x / y) · y (in place; real only). Returns x. */
export const itrunc = inplaceBinary("trunc");

// ── Unary: x ← f(x) ──

/** x ← √x (in place). Returns x. */
export const isqrt = inplaceUnary("sqrt");
/** x ← |x| (in place; real only — abs() of a complex tensor is real, so it cannot be in place). Returns x. */
export const iabs = inplaceUnary("abs");
/** x ← eˣ (in place). Returns x. */
export const iexp = inplaceUnary("exp");
/** x ← ln x (in place). Returns x. */
export const ilog = inplaceUnary("log");
/** x ← sin x (in place). Returns x. */
export const isin = inplaceUnary("sin");
/** x ← cos x (in place). Returns x. */
export const icos = inplaceUnary("cos");
/** x ← tan x (in place; real only). Returns x. */
export const itan = inplaceUnary("tan");
/** x ← asin x (in place; real only). Returns x. */
export const iasin = inplaceUnary("asin");
/** x ← acos x (in place; real only). Returns x. */
export const iacos = inplaceUnary("acos");
/** x ← atan x (in place; real only). Returns x. */
export const iatan = inplaceUnary("atan");
/** x ← −x (in place). Returns x. */
export const ineg = inplaceUnary("neg");
/** x ← ⌈x⌉ (in place; real only). Returns x. */
export const iceil = inplaceUnary("ceil");
/** x ← ⌊x⌋ (in place; real only). Returns x. */
export const ifloor = inplaceUnary("floor");
/** x ← round(x) (in place; real only). Returns x. */
export const iround = inplaceUnary("round");
/** x ← conj(x) (in place; no-op for real targets). Returns x. */
export const iconj = inplaceUnary("conj");
/** x ← 1/x (in place). Returns x. */
export const ireciprocal = inplaceUnary("reciprocal");
/** x ← ~x (in place; real only). Returns x. */
export const ibnot = inplaceUnary("bnot");
