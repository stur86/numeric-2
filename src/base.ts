export type NestedArray<T> = Array<T | NestedArray<T>>;

/**
 * A base class for a tensor
 * @class TensorBase
 *
 * @param re: NestedArray<number> - Real part of the data of the tensor
 * @param im: NestedArray<number> - Imaginary part of the data of the tensor, if any
 * @param shape: number[] - The shape of the tensor
 */
export class TensorBase {
  protected _re: NestedArray<number>;
  protected _im: NestedArray<number> | null = null;
  protected _shape: number[];

  /**
   * Create a tensor base class
   *
   * @param re      The real part of the data of the tensor
   * @param im      The imaginary part of the data of the tensor, if any (default: null)
   * @param shape   The shape of the tensor
   */
  constructor(
    re: NestedArray<number>,
    im: NestedArray<number> | null,
    shape: number[],
  ) {
    this._re = re;
    this._im = im;
    this._shape = shape;
  }

  get data() {
    return [this._re, this._im];
  }

  get real() {
    return this._re;
  }

  get imag() {
    return this._im;
  }

  get shape() {
    return this._shape;
  }

  get size() {
    return this._shape.reduce((a, b) => a * b, 1);
  }

  get is_complex() {
    return this._im !== null;
  }
}
