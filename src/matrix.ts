import { TensorBase } from "./base";
import Vector from "./vector";
import { clone, transpose, negtranspose, getBlock, setBlock, getRange, blockMatrix, getDiag, identity, diag, rep } from "./utils";
import { type Complex, type Scalar, isComplex } from "./complex";

/**
 * A class representing a matrix, or 2D tensor
 *
 * @class Matrix
 *
 * @param re - The real part of the data of the matrix
 * @param im - The imaginary part of the data of the matrix, if any
 *
 * The constructor wraps the given arrays without copying them (use `clone()`
 * for an independent copy). Block ranges are half-open, like Array.slice.
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

    // ── Construction ──

    /** m×n matrix of zeros. */
    static zeros(m: number, n: number = m): Matrix {
        return new Matrix(rep([m, n], 0));
    }

    /** n×n identity matrix. */
    static identity(n: number): Matrix {
        return new Matrix(identity(n));
    }

    /** Square matrix with the given diagonal (real or complex). */
    static diag(d: Vector | number[]): Matrix {
        const v = d instanceof Vector ? d : new Vector(d);
        return new Matrix(diag(v._re), v._im === null ? null : diag(v._im));
    }

    /**
     * Assemble a matrix from a grid of blocks (Matrix or raw arrays). The
     * result is complex if any block is.
     */
    static block(blocks: (Matrix | number[][])[][]): Matrix {
        const ms = blocks.map((br) => br.map((B) => (B instanceof Matrix ? B : new Matrix(B))));
        const re = blockMatrix(ms.map((br) => br.map((B) => B._re)));
        if (!ms.some((br) => br.some((B) => B._im !== null))) return new Matrix(re);
        const im = blockMatrix(ms.map((br) => br.map((B) => B._im ?? rep([B.nrows, B.ncols], 0))));
        return new Matrix(re, im);
    }

    /** An independent copy (real and imaginary parts). */
    clone(): Matrix {
        return new Matrix(clone(this._re), this._im === null ? null : clone(this._im));
    }

    /**
     * Make this matrix complex in place (adds a zero imaginary part; no-op if
     * it is already complex). Returns this matrix.
     */
    promoteToComplex(): this {
        if (this._im === null) this._im = rep([this.nrows, this.ncols], 0);
        return this;
    }

    // ── Element access ──

    private checkRow(i: number) {
        if (!(Number.isInteger(i) && i >= 0 && i < this.nrows)) throw new Error(`Matrix row ${i} out of range (${this.nrows} rows)`);
    }

    private checkCol(j: number) {
        if (!(Number.isInteger(j) && j >= 0 && j < this.ncols)) throw new Error(`Matrix column ${j} out of range (${this.ncols} columns)`);
    }

    private requireComplex(other: TensorBase | null, what: string) {
        if (other !== null && other.is_complex && this._im === null) {
            throw new Error(`Matrix.${what}: cannot write complex values into a real matrix (call promoteToComplex() first)`);
        }
    }

    /** Entry (i, j): a number, or a Complex for a complex matrix. */
    get(i: number, j: number): Scalar {
        this.checkRow(i);
        this.checkCol(j);
        return this._im === null ? this._re[i][j] : { re: this._re[i][j], im: this._im[i][j] } as Complex;
    }

    /**
     * Set entry (i, j) in place. Writing a complex value into a real matrix
     * throws; call promoteToComplex() first. Returns this matrix.
     */
    set(i: number, j: number, value: Scalar): this {
        this.checkRow(i);
        this.checkCol(j);
        if (isComplex(value)) {
            if (this._im === null && value.im !== 0) {
                throw new Error("Matrix.set: cannot write a complex value into a real matrix (call promoteToComplex() first)");
            }
            this._re[i][j] = value.re;
            if (this._im !== null) this._im[i][j] = value.im;
        } else {
            this._re[i][j] = value;
            if (this._im !== null) this._im[i][j] = 0;
        }
        return this;
    }

    /** Row i, as a new vector. */
    getRow(i: number): Vector {
        this.checkRow(i);
        return new Vector(this._re[i].slice(), this._im === null ? null : this._im[i].slice());
    }

    /** Overwrite row i (in place). Returns this matrix. */
    setRow(i: number, v: Vector | number[]): this {
        this.checkRow(i);
        const src = v instanceof Vector ? v : new Vector(v);
        if (src.length !== this.ncols) throw new Error(`Matrix.setRow: row has length ${src.length}, expected ${this.ncols}`);
        this.requireComplex(src, "setRow");
        for (let j = 0; j < this.ncols; j++) {
            this._re[i][j] = src._re[j];
            if (this._im !== null) this._im[i][j] = src._im === null ? 0 : src._im[j];
        }
        return this;
    }

    /** Column j, as a new vector. */
    getCol(j: number): Vector {
        this.checkCol(j);
        return new Vector(this._re.map((r) => r[j]), this._im === null ? null : this._im.map((r) => r[j]));
    }

    /** Overwrite column j (in place). Returns this matrix. */
    setCol(j: number, v: Vector | number[]): this {
        this.checkCol(j);
        const src = v instanceof Vector ? v : new Vector(v);
        if (src.length !== this.nrows) throw new Error(`Matrix.setCol: column has length ${src.length}, expected ${this.nrows}`);
        this.requireComplex(src, "setCol");
        for (let i = 0; i < this.nrows; i++) {
            this._re[i][j] = src._re[i];
            if (this._im !== null) this._im[i][j] = src._im === null ? 0 : src._im[i];
        }
        return this;
    }

    /** Rows i0 (inclusive) to i1 (exclusive), as a new matrix. */
    getRows(i0: number, i1: number = this.nrows): Matrix {
        return this.getBlock(i0, 0, i1, this.ncols);
    }

    /** Overwrite the rows starting at i0 with the rows of M (in place). Returns this matrix. */
    setRows(i0: number, M: Matrix | number[][]): this {
        return this.setBlock(i0, 0, M);
    }

    /** The block of rows [r0, r1) and columns [c0, c1), as a new matrix. */
    getBlock(r0: number, c0: number, r1: number = this.nrows, c1: number = this.ncols): Matrix {
        if (!(r0 >= 0 && c0 >= 0 && r1 <= this.nrows && c1 <= this.ncols && r0 < r1 && c0 < c1)) {
            throw new Error(`Matrix.getBlock: invalid block [${r0}, ${r1}) × [${c0}, ${c1}) of a ${this.nrows}x${this.ncols} matrix`);
        }
        return new Matrix(getBlock(this._re, r0, c0, r1, c1), this._im === null ? null : getBlock(this._im, r0, c0, r1, c1));
    }

    /** Write B into this matrix with its top-left corner at (r0, c0), in place. Returns this matrix. */
    setBlock(r0: number, c0: number, B: Matrix | number[][]): this {
        const src = B instanceof Matrix ? B : new Matrix(B);
        this.requireComplex(src, "setBlock");
        setBlock(this._re, r0, c0, src._re);
        if (this._im !== null) setBlock(this._im, r0, c0, src._im ?? rep([src.nrows, src.ncols], 0));
        return this;
    }

    /** The submatrix of the given rows and columns, in the given order (indices may repeat). */
    getRange(rows: number[], cols: number[]): Matrix {
        return new Matrix(getRange(this._re, rows, cols), this._im === null ? null : getRange(this._im, rows, cols));
    }

    /** The main diagonal, as a new vector. */
    getDiag(): Vector {
        const re = getDiag(this._re);
        return new Vector(re, this._im === null ? null : getDiag(this._im));
    }

    // ── Transposes ──

    /** Transpose (no conjugation). */
    transpose(): Matrix {
        return new Matrix(transpose(this._re), this._im === null ? null : transpose(this._im));
    }

    /** Conjugate transpose (equal to transpose() for a real matrix). */
    transjugate(): Matrix {
        return new Matrix(transpose(this._re), this._im === null ? null : negtranspose(this._im));
    }
}
