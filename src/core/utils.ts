import type { TensorBase } from "../base";
import Vector from "../vector";
import Matrix from "../matrix";
import Tensor from "../tensor";
import NumericCore from ".";
import { type Complex, isComplex } from "../complex";

/*
 * Dispatchers from tensors to the kernels in NumericCore.
 *
 * Vectors (optype "v") call the `_{dtype}_v_{name}` kernel directly. Matrices
 * (optype "m") reuse the same vector kernel row by row: maps and binary ops
 * keep each row's output, while reducers combine the per-row results with
 * the matching entry in ROW_COMBINERS.
 */

type Combiner = (a: any, b: any) => any;

/** How to merge per-row reducer results into one result for the whole matrix. */
const ROW_COMBINERS: Record<string, Combiner> = {
    sum: (a, b) => a + b,
    norm1: (a, b) => a + b,
    norm2squared: (a, b) => a + b,
    norm2: (a, b) => Math.sqrt(a * a + b * b),
    prod: (a, b) => a * b,
    max: (a, b) => Math.max(a, b),
    normInf: (a, b) => Math.max(a, b),
    min: (a, b) => Math.min(a, b),
    any: (a, b) => a || b,
    all: (a, b) => a && b,
};

/** Same, for complex-valued reducers whose per-row results are [re, im] pairs. */
const CX_ROW_COMBINERS: Record<string, Combiner> = {
    sum: (a, b) => [a[0] + b[0], a[1] + b[1]],
    prod: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
};

/** The imaginary part of a vector, or a zero array if it is real. */
function imagOrZeros(t: TensorBase): number[] {
    if (t.imag !== null) return t.imag as number[];
    return zeros(t.shape[0]);
}

/**
 * The innermost rows of a matrix or N-D tensor's data, in order (row-major).
 * For a matrix this is the data itself.
 */
function rowsOf(data: any, ndim: number): number[][] {
    if (ndim <= 2) return data;
    const out: number[][] = [];
    for (const sub of data) for (const r of rowsOf(sub, ndim - 1)) out.push(r);
    return out;
}

/** Inverse of rowsOf: regroup consecutive rows into the given shape. */
function nestRows(rows: any[], shape: number[]): any {
    if (shape.length <= 2) return rows;
    const per = rows.length / shape[0];
    const out = new Array(shape[0]);
    for (let i = 0; i < shape[0]; i++) out[i] = nestRows(rows.slice(i * per, (i + 1) * per), shape.slice(1));
    return out;
}

/** The imaginary rows of a matrix or N-D tensor, or zero rows if it is real. */
function imagRowsOrZeros(t: TensorBase): number[][] {
    if (t.imag !== null) return rowsOf(t.imag, t.shape.length);
    const m = rowsOf(t.real, t.shape.length).length, n = t.shape[t.shape.length - 1];
    const z: number[][] = Array(m);
    for (let i = m - 1; i >= 0; i--) z[i] = zeros(n);
    return z;
}

/**
 * Turn gathered per-row results back into the tensor's shape. Reducer
 * results (scalars) pass through; for matrices the rows already are the shape.
 */
function reshapeRows(out: any, rows: any[], dtype: string, shape: number[]): any {
    if (shape.length <= 2) return out;
    const first = rows[0];
    if (typeof first === "number" || typeof first === "boolean" || (dtype === "cx" && typeof first[0] === "number")) return out;
    if (dtype === "cx" && Array.isArray(first[0])) return [nestRows(out[0], shape), nestRows(out[1], shape)];
    return nestRows(out, shape);
}

function zeros(n: number): number[] {
    const z = Array(n);
    for (let i = n - 1; i >= 0; i--) z[i] = 0;
    return z;
}

function resolveKernel(full_name: string, name: string, dtype: string): Function {
    const method = NumericCore[full_name as keyof typeof NumericCore];
    if (typeof method !== "function") {
        const kind = dtype === "cx" ? "complex" : "real";
        throw new Error(`Operation ${name} is not supported for ${kind} tensors`);
    }
    return method;
}

const KIND: Record<string, string> = { v: "vector", m: "matrix", t: "tensor" };

/** Determine the optype ("v", "m" or "t" for N-D) of a tensor, or throw. */
function optypeOf(t: unknown, name: string): string {
    if (t instanceof Vector) return "v";
    if (t instanceof Matrix) return "m";
    if (t instanceof Tensor) return "t";
    throw new Error(`Method ${name} not supported for ${t}`);
}

/**
 * Gather per-row results of a matrix operation into the final result:
 * - real maps/binops: number[][] (or boolean[][])
 * - complex maps/binops: [re rows, im rows] (complex comparisons: boolean[][])
 * - reducers: a single value (an [re, im] pair if complex-valued), merged
 *   with ROW_COMBINERS / CX_ROW_COMBINERS
 */
function gatherRows(rows: any[], name: string, dtype: string, label: string = name): any {
    const m = rows.length;
    const first = rows[0];
    const scalarRows = typeof first === "number" || typeof first === "boolean";
    const cxScalarRows = !scalarRows && dtype === "cx" && typeof first[0] === "number";
    if (scalarRows || cxScalarRows) {
        const combine = (cxScalarRows ? CX_ROW_COMBINERS : ROW_COMBINERS)[name];
        if (combine === undefined) {
            throw new Error(`Reducer ${label} is not supported for matrices`);
        }
        let ans = first;
        for (let i = 1; i < m; i++) ans = combine(ans, rows[i]);
        return ans;
    }
    // Complex maps/binops return [re, im] per row; complex comparisons return a plain boolean[]
    if (dtype === "cx" && Array.isArray(first[0])) {
        const re: number[][] = Array(m);
        const im: number[][] = Array(m);
        for (let i = m - 1; i >= 0; i--) {
            re[i] = rows[i][0];
            im[i] = rows[i][1];
        }
        return [re, im];
    }
    return rows;
}

export class UnaryMethod {
    dtype: string;
    optype: string;
    name: string;
    full_name: string;
    args: any[] = [];
    private op: TensorBase;
    /** Name used in error messages (defaults to the kernel name). */
    private label: string;

    constructor(op: TensorBase, name: string, label: string = name) {
        this.name = name;
        this.label = label;
        this.optype = optypeOf(op, name);
        this.op = op;
        this.dtype = op.is_complex ? "cx" : "re";
        // Matrices reuse the vector kernels row by row
        this.full_name = `_${this.dtype}_v_${name}`;

        // Build the method arguments
        if (this.optype == "v") {
            this.args.push(op.real);
            if (this.dtype == "cx") {
                this.args.push(op.imag);
            }
            this.args.push(op.shape[0]);
        }
    }

    get key(): keyof typeof NumericCore {
        return this.full_name as keyof typeof NumericCore;
    }

    invoke(): any {
        const kernel = resolveKernel(this.full_name, this.label, this.dtype);
        if (this.optype == "v") {
            return kernel(...this.args);
        }

        // Matrices and N-D tensors: run the vector kernel on each innermost row
        const shape = this.op.shape, nd = shape.length;
        const re = rowsOf(this.op.real, nd);
        const im = this.op.imag === null ? null : rowsOf(this.op.imag, nd);
        const m = re.length, n = shape[nd - 1];
        const rows = Array(m);
        if (this.dtype == "cx") {
            for (let i = m - 1; i >= 0; i--) rows[i] = kernel(re[i], im![i], n);
        } else {
            for (let i = m - 1; i >= 0; i--) rows[i] = kernel(re[i], n);
        }
        return reshapeRows(gatherRows(rows, this.name, this.dtype, this.label), rows, this.dtype, shape);
    }
}

export class BinaryMethod {
    dtype: string;
    optype: string;
    name: string;
    variant: string;
    full_name: string;
    args: any[] = [];
    private left: TensorBase | number;
    private right: TensorBase | number;
    private tensor: TensorBase;
    /** Imaginary part of the scalar operand, if any (0 for real scalars). */
    private scalarIm = 0;

    constructor(left: TensorBase | number | Complex, right: TensorBase | number | Complex, name: string) {
        this.name = name;

        // Complex scalars: split into a real part and scalarIm
        const leftIsScalar = typeof left === 'number' || isComplex(left);
        const rightIsScalar = typeof right === 'number' || isComplex(right);
        if (isComplex(left)) {
            this.scalarIm = left.im;
            left = left.re;
        }
        if (isComplex(right)) {
            this.scalarIm = right.im;
            right = right.re;
        }
        this.left = left;
        this.right = right;

        if (leftIsScalar && rightIsScalar) {
            throw new Error(`Binary op ${name} requires at least one tensor operand`);
        }

        const tensor = (leftIsScalar ? right : left) as TensorBase;
        this.tensor = tensor;
        this.optype = optypeOf(tensor, name);
        this.dtype = tensor.is_complex || this.scalarIm !== 0 ? "cx" : "re";

        if (!leftIsScalar && !rightIsScalar) {
            const other = (right as TensorBase);
            if (optypeOf(other, name) !== this.optype) {
                throw new Error(`Binary op ${name}: cannot combine a ${KIND[this.optype]} with a ${KIND[optypeOf(other, name)]}`);
            }
            const s1 = tensor.shape, s2 = other.shape;
            if (s1.length !== s2.length || s1.some((d, i) => d !== s2[i])) {
                const what = this.optype == "v" ? "length" : "shape";
                throw new Error(`Binary op ${name}: ${what} mismatch (${s1.join("x")} vs ${s2.join("x")})`);
            }
            // Mixed real/complex operands are computed in complex mode
            if (other.is_complex) this.dtype = "cx";
            this.variant = "VV";
        } else if (rightIsScalar) {
            this.variant = "VS";
        } else {
            this.variant = "SV";
        }

        // Matrices reuse the vector kernels row by row
        this.full_name = `_${this.dtype}_v_${name}${this.variant}`;

        // Build arguments
        if (this.optype == "v") {
            if (leftIsScalar) {
                this.args.push(left);
                if (this.dtype == "cx") {
                    this.args.push(this.scalarIm);
                }
            } else {
                this.args.push((left as TensorBase).real);
                if (this.dtype == "cx") {
                    this.args.push(imagOrZeros(left as TensorBase));
                }
            }
            if (rightIsScalar) {
                this.args.push(right);
                if (this.dtype == "cx") {
                    this.args.push(this.scalarIm);
                }
            } else {
                this.args.push((right as TensorBase).real);
                if (this.dtype == "cx") {
                    this.args.push(imagOrZeros(right as TensorBase));
                }
            }
            this.args.push(tensor.shape[0]);
        }
    }

    get key(): keyof typeof NumericCore {
        return this.full_name as keyof typeof NumericCore;
    }

    invoke(): any {
        const kernel = resolveKernel(this.full_name, this.name, this.dtype);
        if (this.optype == "v") {
            return kernel(...this.args);
        }

        // Matrices and N-D tensors: run the vector kernel on each innermost row
        const shape = this.tensor.shape, nd = shape.length;
        const n = shape[nd - 1];
        const cx = this.dtype == "cx";
        // Per-operand row accessors: scalars are passed through unchanged
        const lre = typeof this.left === "number" ? null : rowsOf(this.left.real, nd);
        const rre = typeof this.right === "number" ? null : rowsOf(this.right.real, nd);
        const m = (lre ?? rre)!.length;
        const lim = cx && lre ? imagRowsOrZeros(this.left as TensorBase) : null;
        const rim = cx && rre ? imagRowsOrZeros(this.right as TensorBase) : null;
        const ls = this.left as number, rs = this.right as number;

        const rows = Array(m);
        for (let i = m - 1; i >= 0; i--) {
            if (cx) {
                rows[i] = kernel(
                    lre ? lre[i] : ls, lim ? lim[i] : this.scalarIm,
                    rre ? rre[i] : rs, rim ? rim[i] : this.scalarIm,
                    n,
                );
            } else {
                rows[i] = kernel(lre ? lre[i] : ls, rre ? rre[i] : rs, n);
            }
        }
        return reshapeRows(gatherRows(rows, this.name, this.dtype), rows, this.dtype, shape);
    }
}

/*
 * Fast paths for the common case: real Vector/Matrix operands (or raw real
 * arrays) and real scalars. Kernels are resolved once, when the op is built,
 * and called directly. Anything else (complex values, shape errors, missing
 * kernels) falls back to the general dispatcher via `slow`, so behaviour and
 * error messages are unchanged.
 */

const kernel = (name: string): Function | undefined => {
    const k = NumericCore[name as keyof typeof NumericCore];
    return typeof k === "function" ? k : undefined;
};

/** A real vector operand's data, or null if it is not one (complex, matrix, other). */
function realVectorData(x: unknown): number[] | null {
    if (x instanceof Vector) return x._im === null ? x._re : null;
    if (Array.isArray(x) && x.length > 0 && (typeof x[0] === "number" || typeof x[0] === "boolean")) return x as number[];
    return null;
}

/**
 * Build a unary op (map or reducer) with a real fast path.
 *
 * @param name    Kernel name (`_re_v_${name}`).
 * @param wrapV   Wraps a real vector result (e.g. into a Vector).
 * @param wrapM   Wraps a real matrix result: rows for maps, the combined value for reducers.
 * @param slow    General path for every other input.
 */
export function fastUnary<R>(
    name: string,
    wrapV: (raw: any) => R,
    wrapM: (raw: any) => R,
    slow: (x: any) => R,
): (x: any) => R {
    const k = kernel(`_re_v_${name}`);
    if (k === undefined) return slow;
    return (x: any): R => {
        const v = realVectorData(x);
        if (v !== null) return wrapV(k(v, v.length));
        if (x instanceof Matrix && x._im === null) {
            const re = x._re, m = re.length, n = x._shape[1];
            const rows = Array(m);
            for (let i = m - 1; i >= 0; i--) rows[i] = k(re[i], n);
            return wrapM(gatherRows(rows, name, "re"));
        }
        return slow(x);
    };
}

/**
 * Build a binary op with a real fast path for vector/vector, vector/scalar,
 * matrix/matrix and matrix/scalar operands (same shapes only).
 */
export function fastBinary<R>(
    name: string,
    wrapV: (raw: any) => R,
    wrapM: (raw: any) => R,
    slow: (x: any, y: any) => R,
): (x: any, y: any) => R {
    const VV = kernel(`_re_v_${name}VV`), VS = kernel(`_re_v_${name}VS`), SV = kernel(`_re_v_${name}SV`);
    if (VV === undefined || VS === undefined || SV === undefined) return slow;
    return (x: any, y: any): R => {
        // Vectors
        const xv = typeof x === "number" ? null : realVectorData(x);
        if (xv !== null) {
            if (typeof y === "number") return wrapV(VS(xv, y, xv.length));
            const yv = realVectorData(y);
            if (yv !== null && yv.length === xv.length) return wrapV(VV(xv, yv, xv.length));
            return slow(x, y);
        }
        if (typeof x === "number") {
            const yv = realVectorData(y);
            if (yv !== null) return wrapV(SV(x, yv, yv.length));
            if (y instanceof Matrix && y._im === null) {
                const B = y._re, m = B.length, n = y._shape[1];
                const rows = Array(m);
                for (let i = m - 1; i >= 0; i--) rows[i] = SV(x, B[i], n);
                return wrapM(rows);
            }
            return slow(x, y);
        }
        // Matrices
        if (x instanceof Matrix && x._im === null) {
            const A = x._re, m = A.length, n = x._shape[1];
            const rows = Array(m);
            if (typeof y === "number") {
                for (let i = m - 1; i >= 0; i--) rows[i] = VS(A[i], y, n);
                return wrapM(rows);
            }
            if (y instanceof Matrix && y._im === null && y._shape[0] === m && y._shape[1] === n) {
                const B = y._re;
                for (let i = m - 1; i >= 0; i--) rows[i] = VV(A[i], B[i], n);
                return wrapM(rows);
            }
        }
        return slow(x, y);
    };
}
