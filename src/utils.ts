/**
 * Utility functions for array construction and manipulation.
 */

/**
 * Returns the shape (dimensions) of a nested array.
 * Follows the first element at each level.
 *
 * @param x     A scalar, array, or nested array.
 * @returns     The shape as an array of integers.
 */
export function dim(x: any): number[] {
    if (typeof x === 'number' || typeof x === 'boolean') return [];
    if (!Array.isArray(x)) return [];
    const shape: number[] = [];
    let current: any = x;
    while (Array.isArray(current)) {
        shape.push(current.length);
        current = current[0];
    }
    return shape;
}

/**
 * Creates a new nested array of given shape filled with a value.
 *
 * @param shape     The shape of the array.
 * @param value     The value to fill with.
 * @returns         A nested array of the given shape.
 */
export function rep(shape: number[], value: number): any {
    if (shape.length === 0) return value;
    const n = shape[0];
    const rest = shape.slice(1);
    if (rest.length === 0) {
        const ret = Array(n);
        let i = n - 2;
        for (; i >= 0; i -= 2) {
            ret[i + 1] = value;
            ret[i] = value;
        }
        if (i === -1) {
            ret[0] = value;
        }
        return ret;
    }
    const ret = Array(n);
    for (let i = n - 1; i >= 0; i--) {
        ret[i] = rep(rest, value);
    }
    return ret;
}

/**
 * Returns an array of n evenly spaced values from a to b inclusive.
 *
 * @param a     Start value.
 * @param b     End value.
 * @param n     Number of points (default: round(b-a)+1).
 * @returns     Array of evenly spaced values.
 */
export function linspace(a: number, b: number, n?: number): number[] {
    if (n === undefined) n = Math.round(b - a) + 1;
    if (n < 2) return [a];
    const ret = Array(n);
    const nm1 = n - 1;
    for (let i = nm1; i >= 0; i--) {
        ret[i] = (i * b + (nm1 - i) * a) / nm1;
    }
    return ret;
}

/**
 * Creates a nested array of given shape filled with uniform random values in [0,1).
 *
 * @param shape     The shape of the array.
 * @returns         A nested array of random values.
 */
export function random(shape: number[]): any {
    if (shape.length === 0) return Math.random();
    const n = shape[0];
    const rest = shape.slice(1);
    if (rest.length === 0) {
        const ret = Array(n);
        const rnd = Math.random;
        let i = n - 1;
        for (; i >= 1; i -= 2) {
            ret[i] = rnd();
            ret[i - 1] = rnd();
        }
        if (i === 0) ret[0] = rnd();
        return ret;
    }
    const ret = Array(n);
    for (let i = n - 1; i >= 0; i--) {
        ret[i] = random(rest);
    }
    return ret;
}

/**
 * Creates the n×n identity matrix.
 *
 * @param n     The dimension.
 * @returns     The identity matrix as number[][].
 */
export function identity(n: number): number[][] {
    return diag(rep([n], 1) as number[]);
}

/**
 * Creates a diagonal matrix from a vector.
 *
 * @param d     The diagonal elements.
 * @returns     A square matrix with d on the diagonal.
 */
export function diag(d: number[]): number[][] {
    const n = d.length;
    const ret: number[][] = Array(n);
    for (let i = n - 1; i >= 0; i--) {
        const row = Array(n);
        let j = n - 2;
        for (; j >= 0; j -= 2) {
            row[j + 1] = 0;
            row[j] = 0;
        }
        if (j === -1) row[0] = 0;
        row[i] = d[i];
        ret[i] = row;
    }
    return ret;
}

/**
 * Extracts the main diagonal of a matrix.
 *
 * @param A     A matrix (number[][]).
 * @returns     The diagonal elements.
 */
export function getDiag(A: number[][]): number[] {
    const n = Math.min(A.length, A[0].length);
    const ret = Array(n);
    for (let i = n - 1; i >= 0; i--) {
        ret[i] = A[i][i];
    }
    return ret;
}

/**
 * Deep clone of a nested number array.
 *
 * @param x     A number, array, or nested array.
 * @returns     A deep copy.
 */
export function clone(x: number[]): number[];
export function clone(x: number[][]): number[][];
export function clone(x: any): any {
    if (typeof x === 'number') return x;
    if (!Array.isArray(x)) return x;
    if (x.length === 0 || !Array.isArray(x[0])) return cloneRow(x);
    // Arrays of arrays get their own allocation site (see cloneRow)
    const n = x.length;
    const ret = Array(n);
    for (let i = n - 1; i >= 0; i--) {
        ret[i] = clone(x[i]);
    }
    return ret;
}

/**
 * Copy a flat array of numbers.
 *
 * Kept separate from clone()'s array-of-arrays allocation on purpose: V8
 * tracks element kinds per allocation site, and a site that also allocates
 * arrays of rows would hand out rows with generic (boxed) elements. Rows
 * allocated here stay as unboxed doubles, which makes the hot loops in
 * LU/inv/det several times faster on V8.
 */
function cloneRow(x: number[]): number[] {
    const n = x.length;
    const ret = Array(n);
    for (let i = n - 1; i >= 0; i--) {
        ret[i] = x[i];
    }
    return ret;
}

/**
 * Transposes a 2D matrix.
 *
 * @param x     A matrix (number[][]).
 * @returns     The transposed matrix.
 */
export function transpose(x: number[][]): number[][] {
    const m = x.length;
    const n = x[0].length;
    const ret: number[][] = Array(n);
    for (let j = 0; j < n; j++) ret[j] = Array(m);

    let i = m - 1;
    for (; i >= 1; i -= 2) {
        const A1 = x[i], A0 = x[i - 1];
        let j = n - 1;
        for (; j >= 1; j -= 2) {
            ret[j][i] = A1[j]; ret[j][i - 1] = A0[j];
            ret[j - 1][i] = A1[j - 1]; ret[j - 1][i - 1] = A0[j - 1];
        }
        if (j === 0) {
            ret[0][i] = A1[0]; ret[0][i - 1] = A0[0];
        }
    }
    if (i === 0) {
        const A0 = x[0];
        for (let j = n - 1; j >= 0; j--) {
            ret[j][0] = A0[j];
        }
    }
    return ret;
}

/**
 * Transposes and negates a 2D matrix (used for complex transjugate).
 *
 * @param x     A matrix (number[][]).
 * @returns     The negated transposed matrix.
 */
export function negtranspose(x: number[][]): number[][] {
    const m = x.length;
    const n = x[0].length;
    const ret: number[][] = Array(n);
    for (let j = 0; j < n; j++) ret[j] = Array(m);

    let i = m - 1;
    for (; i >= 1; i -= 2) {
        const A1 = x[i], A0 = x[i - 1];
        let j = n - 1;
        for (; j >= 1; j -= 2) {
            ret[j][i] = -A1[j]; ret[j][i - 1] = -A0[j];
            ret[j - 1][i] = -A1[j - 1]; ret[j - 1][i - 1] = -A0[j - 1];
        }
        if (j === 0) {
            ret[0][i] = -A1[0]; ret[0][i - 1] = -A0[0];
        }
    }
    if (i === 0) {
        const A0 = x[0];
        for (let j = n - 1; j >= 0; j--) {
            ret[j][0] = -A0[j];
        }
    }
    return ret;
}

/**
 * Deep equality test for nested arrays.
 *
 * @param x     First value.
 * @param y     Second value.
 * @returns     True if deeply equal.
 */
export function same(x: any, y: any): boolean {
    if (typeof x !== typeof y) return false;
    if (typeof x === 'number') return x === y;
    if (!Array.isArray(x) || !Array.isArray(y)) return false;
    if (x.length !== y.length) return false;
    for (let i = x.length - 1; i >= 0; i--) {
        if (!same(x[i], y[i])) return false;
    }
    return true;
}

/**
 * Extracts a submatrix from a 2D matrix.
 *
 * @param A      The source matrix.
 * @param r0     Start row (inclusive).
 * @param c0     Start column (inclusive).
 * @param r1     End row (exclusive).
 * @param c1     End column (exclusive).
 * @returns      The submatrix.
 */
export function getBlock(A: number[][], r0: number, c0: number, r1: number, c1: number): number[][] {
    const rows = r1 - r0;
    const cols = c1 - c0;
    const ret: number[][] = Array(rows);
    for (let i = rows - 1; i >= 0; i--) {
        const row = Array(cols);
        const srcRow = A[r0 + i];
        for (let j = cols - 1; j >= 0; j--) {
            row[j] = srcRow[c0 + j];
        }
        ret[i] = row;
    }
    return ret;
}

/**
 * Extracts a slice from a 1D array.
 *
 * @param x      The source array.
 * @param from   Start index (inclusive).
 * @param to     End index (exclusive).
 * @returns      The slice.
 */
export function getBlock1D(x: number[], from: number, to: number): number[] {
    const n = to - from;
    const ret = Array(n);
    for (let i = n - 1; i >= 0; i--) {
        ret[i] = x[from + i];
    }
    return ret;
}

/**
 * Computes the outer product (tensor product) of two vectors.
 *
 * @param x     First vector.
 * @param y     Second vector.
 * @returns     The outer product matrix.
 */
export function tensor(x: number[], y: number[]): number[][] {
    const m = x.length;
    const n = y.length;
    const ret: number[][] = Array(m);
    for (let i = m - 1; i >= 0; i--) {
        const row = Array(n);
        const xi = x[i];
        for (let j = n - 1; j >= 0; j--) {
            row[j] = xi * y[j];
        }
        ret[i] = row;
    }
    return ret;
}
/**
 * Writes B into A (in place) with its top-left corner at (r0, c0).
 *
 * @param A     The matrix to modify.
 * @param r0    Starting row.
 * @param c0    Starting column.
 * @param B     The block to write.
 * @returns     A.
 */
export function setBlock(A: number[][], r0: number, c0: number, B: number[][]): number[][] {
    const m = B.length, n = m > 0 ? B[0].length : 0;
    if (r0 < 0 || c0 < 0 || r0 + m > A.length || (m > 0 && c0 + n > A[0].length)) {
        throw new Error(`setBlock: a ${m}x${n} block at (${r0}, ${c0}) does not fit in ${A.length}x${A[0]?.length ?? 0}`);
    }
    for (let i = 0; i < m; i++) {
        const dst = A[r0 + i], src = B[i];
        for (let j = 0; j < n; j++) dst[c0 + j] = src[j];
    }
    return A;
}

/**
 * Submatrix of the given rows and columns, in the given order (indices may repeat).
 *
 * @param A     A matrix.
 * @param rows  Row indices.
 * @param cols  Column indices.
 * @returns     A[rows][:, cols] as a new matrix.
 */
export function getRange(A: number[][], rows: number[], cols: number[]): number[][] {
    const m = A.length, n = m > 0 ? A[0].length : 0;
    for (const r of rows) if (!(r >= 0 && r < m)) throw new Error(`getRange: row ${r} out of range`);
    for (const c of cols) if (!(c >= 0 && c < n)) throw new Error(`getRange: column ${c} out of range`);
    const ret: number[][] = Array(rows.length);
    for (let i = rows.length - 1; i >= 0; i--) {
        const src = A[rows[i]];
        const row = Array(cols.length);
        for (let j = cols.length - 1; j >= 0; j--) row[j] = src[cols[j]];
        ret[i] = row;
    }
    return ret;
}

/**
 * Assembles a matrix from a grid of blocks: blocks[I][J] is a matrix, all
 * blocks in grid row I have the same number of rows, and all blocks in grid
 * column J the same number of columns.
 *
 * @param blocks    The grid of blocks.
 * @returns         The assembled matrix.
 */
export function blockMatrix(blocks: number[][][][]): number[][] {
    const rowsOf = blocks.map((br, I) => {
        const h = br[0].length;
        br.forEach((B, J) => {
            if (B.length !== h) throw new Error(`blockMatrix: block (${I}, ${J}) has ${B.length} rows, expected ${h}`);
        });
        return h;
    });
    const colsOf = blocks[0].map((B) => B[0].length);
    blocks.forEach((br, I) => {
        if (br.length !== colsOf.length) throw new Error(`blockMatrix: grid row ${I} has ${br.length} blocks, expected ${colsOf.length}`);
        br.forEach((B, J) => {
            if (B[0].length !== colsOf[J]) throw new Error(`blockMatrix: block (${I}, ${J}) has ${B[0].length} columns, expected ${colsOf[J]}`);
        });
    });
    const out: number[][] = [];
    blocks.forEach((br, I) => {
        for (let i = 0; i < rowsOf[I]; i++) {
            const row: number[] = [];
            for (const B of br) for (const v of B[i]) row.push(v);
            out.push(row);
        }
    });
    return out;
}
