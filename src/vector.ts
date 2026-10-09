import { TensorBase } from "./base";
import { clone } from "./utils";
import { type Complex, type Scalar, isComplex } from "./complex";

/**
 * A class representing a vector, or 1D tensor
 *
 * @class Vector
 *
 * @param re: number[] - The real part of the data of the vector
 * @param im: number[] - The imaginary part of the data of the vector, if any
 *
 * The constructor wraps the given arrays without copying them (use `clone()`
 * for an independent copy).
 */
export default class Vector extends TensorBase {
  declare _re: number[];
  declare _im: number[] | null;
  declare _shape: [number];

  /**
   * Create a vector
   *
   * @param re     The real part of the data of the vector
   * @param im     The imaginary part of the data of the vector, if any (default: null)
   */
  constructor(re: number[], im: number[] | null = null) {
    if (re.length === 0) {
      throw new Error("Vector must have at least one element");
    }
    if (im !== null && re.length !== im.length) {
      throw new Error("Real and imaginary parts must have the same length");
    }

    super(re, im, [re.length]);
  }

  /** Get the length of the vector */
  get length() {
    return this.shape[0];
  }

  /** A vector of n zeros. */
  static zeros(n: number): Vector {
    return new Vector(new Array(n).fill(0));
  }

  /** An independent copy (real and imaginary parts). */
  clone(): Vector {
    return new Vector(clone(this._re), this._im === null ? null : clone(this._im));
  }

  /**
   * Make this vector complex in place (adds a zero imaginary part; no-op if it
   * is already complex). Returns this vector.
   */
  promoteToComplex(): this {
    if (this._im === null) this._im = new Array(this._re.length).fill(0);
    return this;
  }

  private checkIndex(i: number) {
    if (!(Number.isInteger(i) && i >= 0 && i < this._re.length)) {
      throw new Error(`Vector index ${i} out of range (length ${this._re.length})`);
    }
  }

  /** Element i: a number, or a Complex for a complex vector. */
  get(i: number): Scalar {
    this.checkIndex(i);
    return this._im === null ? this._re[i] : { re: this._re[i], im: this._im[i] } as Complex;
  }

  /**
   * Set element i (in place). Writing a complex value into a real vector
   * throws; call promoteToComplex() first. Returns this vector.
   */
  set(i: number, value: Scalar): this {
    this.checkIndex(i);
    if (isComplex(value)) {
      if (this._im === null) {
        if (value.im !== 0) throw new Error("Vector.set: cannot write a complex value into a real vector (call promoteToComplex() first)");
        this._re[i] = value.re;
      } else {
        this._re[i] = value.re;
        this._im[i] = value.im;
      }
    } else {
      this._re[i] = value;
      if (this._im !== null) this._im[i] = 0;
    }
    return this;
  }

  /** Elements from (inclusive) to `to` (exclusive), as a new vector. */
  getBlock(from: number, to: number = this._re.length): Vector {
    if (!(from >= 0 && to <= this._re.length && from < to)) {
      throw new Error(`Vector.getBlock: invalid range [${from}, ${to}) for length ${this._re.length}`);
    }
    return new Vector(this._re.slice(from, to), this._im === null ? null : this._im.slice(from, to));
  }

  /** Write v into this vector starting at `from` (in place). Returns this vector. */
  setBlock(from: number, v: Vector | number[]): this {
    const src = v instanceof Vector ? v : new Vector(v);
    if (!(from >= 0 && from + src.length <= this._re.length)) {
      throw new Error(`Vector.setBlock: a block of length ${src.length} at ${from} does not fit in length ${this._re.length}`);
    }
    if (src._im !== null && this._im === null) {
      throw new Error("Vector.setBlock: cannot write a complex block into a real vector (call promoteToComplex() first)");
    }
    for (let k = 0; k < src.length; k++) {
      this._re[from + k] = src._re[k];
      if (this._im !== null) this._im[from + k] = src._im === null ? 0 : src._im[k];
    }
    return this;
  }
}
