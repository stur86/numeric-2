import { TensorBase } from "./base";

/**
 * A class representing a matrix, or 2D tensor
 *
 * @class Matrix
 *
 * @param re - The real part of the data of the matrix
 * @param im - The imaginary part of the data of the matrix, if any
 */
export default class Matrix extends TensorBase {
    declare _re: number[][];
    declare _im: number[][] | null;
    declare _shape: [number, number];

    /**
     * Create a matrix
     *
     * @param re     The real part of the data of the matrix (array of rows)
     * @param im     The imaginary part of the data of the matrix, if any (default: null)
     */
    constructor(re: number[][], im: number[][] | null = null) {
        const nrows = re.length;
        if (nrows === 0) {
            throw new Error("Matrix must have at least one row");
        }
        const ncols = re[0].length;
        if (ncols === 0) {
            throw new Error("Matrix must have at least one column");
        }
        for (let i = 1; i < nrows; i++) {
            if (re[i].length !== ncols) {
                throw new Error("All rows must have the same length");
            }
        }
        if (im !== null) {
            if (im.length !== nrows) {
                throw new Error("Real and imaginary parts must have the same number of rows");
            }
            for (let i = 0; i < nrows; i++) {
                if (im[i].length !== ncols) {
                    throw new Error("Real and imaginary parts must have the same shape");
                }
            }
        }

        super(re, im, [nrows, ncols]);
    }

    /** Get the number of rows */
    get nrows() {
        return this._shape[0];
    }

    /** Get the number of columns */
    get ncols() {
        return this._shape[1];
    }
}