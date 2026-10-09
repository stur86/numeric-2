import { TensorBase, type NestedArray } from "./base";
import { type Complex, type Scalar, isComplex } from "./complex";

/** Shape of a rectangular nested array (throws if it is ragged or empty). */
export function shapeOf(x: NestedArray<number>, what = "Tensor"): number[] {
    const shape: number[] = [];
    let cur: any = x;
    while (Array.isArray(cur)) {
        if (cur.length === 0) throw new Error(`${what} cannot have an empty dimension`);
        shape.push(cur.length);
        cur = cur[0];
    }
    const check = (a: any, level: number) => {
        if (level === shape.length) {
            if (Array.isArray(a)) throw new Error(`${what}: ragged nested array`);
            return;
        }
        if (!Array.isArray(a) || a.length !== shape[level]) throw new Error(`${what}: ragged nested array`);
        for (const b of a) check(b, level + 1);
    };
    check(x, 0);
    return shape;
}

/** Deep copy of a nested array. */
function cloneNested(x: any): any {
    return Array.isArray(x) ? x.map(cloneNested) : x;
}

/** A nested array of zeros with the given shape. */
function zerosNested(shape: number[]): any {
    return shape.length === 1 ? new Array(shape[0]).fill(0) : Array.from({ length: shape[0] }, () => zerosNested(shape.slice(1)));
}

/**
 * An N-dimensional tensor (any number of dimensions), stored as nested arrays.
 *
 * Element-wise operations, reductions, norms and in-place ops work on
 * tensors of any rank; linear algebra (dot, solve, ...) needs Vector/Matrix.
 * The constructor wraps the given arrays without copying (use clone()).
 */
export default class Tensor extends TensorBase {
    /**
     * @param re    Real part, as a rectangular nested array.
     * @param im    Imaginary part with the same shape, if any (default null).
     */
    constructor(re: NestedArray<number>, im: NestedArray<number> | null = null) {
        const shape = shapeOf(re);
        if (im !== null) {
            const s2 = shapeOf(im);
            if (s2.length !== shape.length || s2.some((d, i) => d !== shape[i])) {
                throw new Error("Tensor: real and imaginary parts must have the same shape");
            }
        }
        super(re, im, shape);
    }

    /** Number of dimensions. */
    get ndim(): number {
        return this._shape.length;
    }

    /** A tensor of zeros with the given shape. */
    static zeros(shape: number[]): Tensor {
        return new Tensor(zerosNested(shape));
    }

    /** An independent copy (real and imaginary parts). */
    clone(): Tensor {
        return new Tensor(cloneNested(this._re), this._im === null ? null : cloneNested(this._im));
    }

    /** Make this tensor complex in place (zero imaginary part); returns this tensor. */
    promoteToComplex(): this {
        if (this._im === null) this._im = zerosNested(this._shape);
        return this;
    }

    /** Walk to the innermost array holding element `index`, checking bounds. */
    private locate(index: number[]): [any[], any[] | null, number] {
        if (index.length !== this._shape.length) throw new Error(`Tensor: expected ${this._shape.length} indices, got ${index.length}`);
        let re: any = this._re, im: any = this._im;
        for (let d = 0; d < index.length; d++) {
            const i = index[d];
            if (!(Number.isInteger(i) && i >= 0 && i < this._shape[d])) throw new Error(`Tensor: index ${i} out of range in dimension ${d}`);
            if (d === index.length - 1) return [re, im, i];
            re = re[i];
            im = im === null ? null : im[i];
        }
        throw new Error("unreachable");
    }

    /** Element at the given indices: a number, or a Complex for a complex tensor. */
    get(...index: number[]): Scalar {
        const [re, im, i] = this.locate(index);
        return im === null ? re[i] : { re: re[i], im: im[i] } as Complex;
    }

    /**
     * Set the element at the given indices (in place): tensor.set(i, j, k, value).
     * Writing a complex value into a real tensor throws (promoteToComplex() first).
     */
    set(...args: [...number[], Scalar]): this {
        const value = args[args.length - 1] as Scalar;
        const [re, im, i] = this.locate(args.slice(0, -1) as number[]);
        if (isComplex(value)) {
            if (im === null && value.im !== 0) throw new Error("Tensor.set: cannot write a complex value into a real tensor (call promoteToComplex() first)");
            re[i] = value.re;
            if (im !== null) im[i] = value.im;
        } else {
            re[i] = value;
            if (im !== null) im[i] = 0;
        }
        return this;
    }
}
