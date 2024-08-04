import { TensorBase } from "./base";
import {
  _re_v_norm2,
  _re_v_norm2squared,
  _re_v_normInf,
  _re_v_norm1,
} from "./core";

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

  // Core methods

  /**
   * Euclidean norm of the vector
   * 
   * @returns The 2-norm of the vector
   */
  norm2(): number {
    if (this.is_complex) {
        throw new Error("Complex vectors are not supported yet");
    }
    return _re_v_norm2(this._re, this.length);
  }

  /**
   * Squared Euclidean norm of the vector
   * 
   * @returns The squared 2-norm of the vector
   */
  norm2Squared(): number {
    if (this.is_complex) {
        throw new Error("Complex vectors are not supported yet");
    }
    return _re_v_norm2squared(this._re, this.length);
  }

  /**
   * Manhattan norm of the vector
   * 
   * @returns The 1-norm of the vector
   */
  norm1(): number {
    if (this.is_complex) {
        throw new Error("Complex vectors are not supported yet");
    }
    return _re_v_norm1(this._re, this.length);
  }

  /**
   * Infinity norm of the vector
   * 
   * @returns The infinity norm of the vector
   */
  normInf(): number {
    if (this.is_complex) {
        throw new Error("Complex vectors are not supported yet");
    }
    return _re_v_normInf(this._re, this.length);
  }
}
