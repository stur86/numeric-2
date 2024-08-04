import { TensorBase } from "./base";

/**
 * A class representing a vector, or 1D tensor
 *
 * @class Vector
 *
 * @param re: number[] - The real part of the data of the vector
 * @param im: number[] - The imaginary part of the data of the vector, if any
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
}
