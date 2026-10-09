import type { TensorBase } from "../base";
import Vector from "../vector";
import Matrix from "../matrix";
import NumericCore from ".";

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

/** The imaginary part of a vector, or a zero array if it is real. */
function imagOrZeros(t: TensorBase): number[] {
    if (t.imag !== null) return t.imag as number[];
    return zeros(t.shape[0]);
}

/** The imaginary rows of a matrix, or zero rows if it is real. */
function imagRowsOrZeros(t: TensorBase): number[][] {
    if (t.imag !== null) return t.imag as number[][];
    const [m, n] = t.shape;
    const z: number[][] = Array(m);
    for (let i = m - 1; i >= 0; i--) z[i] = zeros(n);
    return z;
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

/** Determine the optype ("v" or "m") of a tensor, or throw. */
function optypeOf(t: unknown, name: string): string {
    if (t instanceof Vector) return "v";
    if (t instanceof Matrix) return "m";
    throw new Error(`Method ${name} not supported for ${t}`);
}

/**
 * Gather per-row results of a matrix operation into the final result:
 * - real maps/binops: number[][] (or boolean[][])
 * - complex maps/binops: [re rows, im rows]
 * - reducers: a single value, merged with ROW_COMBINERS
 */
function gatherRows(rows: any[], name: string, dtype: string): any {
    const m = rows.length;
    const first = rows[0];
    if (typeof first === "number" || typeof first === "boolean") {
        const combine = ROW_COMBINERS[name];
        if (combine === undefined) {
            throw new Error(`Reducer ${name} is not supported for matrices`);
        }
        let ans = first;
        for (let i = 1; i < m; i++) ans = combine(ans, rows[i]);
        return ans;
    }
    if (dtype === "cx") {
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

    constructor(op: TensorBase, name: string) {
        this.name = name;
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
        const kernel = resolveKernel(this.full_name, this.name, this.dtype);
        if (this.optype == "v") {
            return kernel(...this.args);
        }

        const re = this.op.real as number[][];
        const im = this.op.imag as number[][] | null;
        const [m, n] = this.op.shape;
        const rows = Array(m);
        if (this.dtype == "cx") {
            for (let i = m - 1; i >= 0; i--) rows[i] = kernel(re[i], im![i], n);
        } else {
            for (let i = m - 1; i >= 0; i--) rows[i] = kernel(re[i], n);
        }
        return gatherRows(rows, this.name, this.dtype);
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

    constructor(left: TensorBase | number, right: TensorBase | number, name: string) {
        this.name = name;
        this.left = left;
        this.right = right;

        // Determine variant (VV, VS, SV) and extract data
        const leftIsScalar = typeof left === 'number';
        const rightIsScalar = typeof right === 'number';

        if (leftIsScalar && rightIsScalar) {
            throw new Error(`Binary op ${name} requires at least one tensor operand`);
        }

        const tensor = (leftIsScalar ? right : left) as TensorBase;
        this.tensor = tensor;
        this.optype = optypeOf(tensor, name);
        this.dtype = tensor.is_complex ? "cx" : "re";

        if (!leftIsScalar && !rightIsScalar) {
            const other = (right as TensorBase);
            if (optypeOf(other, name) !== this.optype) {
                throw new Error(`Binary op ${name}: cannot combine a vector with a matrix`);
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
                    this.args.push(0); // imaginary part of scalar is 0
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
                    this.args.push(0); // imaginary part of scalar is 0
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

        const [m, n] = this.tensor.shape;
        const cx = this.dtype == "cx";
        // Per-operand row accessors: scalars are passed through unchanged
        const lre = typeof this.left === "number" ? null : this.left.real as number[][];
        const rre = typeof this.right === "number" ? null : this.right.real as number[][];
        const lim = cx && lre ? imagRowsOrZeros(this.left as TensorBase) : null;
        const rim = cx && rre ? imagRowsOrZeros(this.right as TensorBase) : null;
        const ls = this.left as number, rs = this.right as number;

        const rows = Array(m);
        for (let i = m - 1; i >= 0; i--) {
            if (cx) {
                rows[i] = kernel(
                    lre ? lre[i] : ls, lim ? lim[i] : 0,
                    rre ? rre[i] : rs, rim ? rim[i] : 0,
                    n,
                );
            } else {
                rows[i] = kernel(lre ? lre[i] : ls, rre ? rre[i] : rs, n);
            }
        }
        return gatherRows(rows, this.name, this.dtype);
    }
}
