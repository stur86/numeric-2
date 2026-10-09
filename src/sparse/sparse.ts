/**
 * Sparse matrices in compressed column storage (CCS / CSC).
 *
 * Canonical form: within each column, row indices are strictly increasing and
 * no explicit zeros are stored. Every constructor and operation preserves it.
 */

import Vector from "../vector";
import Matrix from "../matrix";
import { type MatrixLike, type VectorLike, toRawMatrix, toRawVector } from "../linalg/wrap";

export class SparseMatrix {
    /** @internal Use the static constructors (fromDense, fromTriplets, ...). */
    constructor(
        /** Number of rows. */
        readonly nrows: number,
        /** Number of columns. */
        readonly ncols: number,
        /** Column pointers (length ncols + 1): column j occupies [colPtr[j], colPtr[j+1]). */
        readonly colPtr: number[],
        /** Row index of each stored entry. */
        readonly rowIdx: number[],
        /** Value of each stored entry. */
        readonly values: number[],
    ) {}

    /** [rows, columns] */
    get shape(): [number, number] {
        return [this.nrows, this.ncols];
    }

    /** Number of stored (nonzero) entries. */
    get nnz(): number {
        return this.colPtr[this.ncols];
    }

    /**
     * Build from a dense matrix, keeping entries with |a_ij| > tol (default: nonzeros).
     */
    static fromDense(A: MatrixLike, tol: number = 0): SparseMatrix {
        const raw = toRawMatrix(A, "SparseMatrix.fromDense");
        const m = raw.length, n = raw[0].length;
        const colPtr = new Array(n + 1), rowIdx: number[] = [], values: number[] = [];
        let nz = 0;
        colPtr[0] = 0;
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < m; i++) {
                const v = raw[i][j];
                if (Math.abs(v) > tol) {
                    rowIdx[nz] = i;
                    values[nz] = v;
                    nz++;
                }
            }
            colPtr[j + 1] = nz;
        }
        return new SparseMatrix(m, n, colPtr, rowIdx, values);
    }

    /**
     * Build from coordinate (triplet) form: entry k is (rows[k], cols[k]) = vals[k].
     * Duplicate coordinates are summed; resulting zeros are dropped.
     */
    static fromTriplets(nrows: number, ncols: number, rows: VectorLike, cols: VectorLike, vals: VectorLike): SparseMatrix {
        const r = toRawVector(rows, "SparseMatrix.fromTriplets");
        const c = toRawVector(cols, "SparseMatrix.fromTriplets");
        const v = toRawVector(vals, "SparseMatrix.fromTriplets");
        if (r.length !== c.length || r.length !== v.length) throw new Error("SparseMatrix.fromTriplets: rows, cols and vals must have the same length");
        // Bucket by column, then sort each column by row and merge duplicates
        const counts = new Array(ncols + 1).fill(0);
        for (let k = 0; k < c.length; k++) {
            if (!(r[k] >= 0 && r[k] < nrows && c[k] >= 0 && c[k] < ncols) || !Number.isInteger(r[k]) || !Number.isInteger(c[k])) {
                throw new Error(`SparseMatrix.fromTriplets: entry ${k} at (${r[k]}, ${c[k]}) is outside ${nrows}×${ncols}`);
            }
            counts[c[k] + 1]++;
        }
        for (let j = 0; j < ncols; j++) counts[j + 1] += counts[j];
        const next = counts.slice(0, ncols);
        const order = new Array(c.length);
        for (let k = 0; k < c.length; k++) order[next[c[k]]++] = k;

        const colPtr = new Array(ncols + 1), rowIdx: number[] = [], values: number[] = [];
        let nz = 0;
        colPtr[0] = 0;
        for (let j = 0; j < ncols; j++) {
            const ks = order.slice(counts[j], counts[j + 1]).sort((a: number, b: number) => r[a] - r[b]);
            let p = 0;
            while (p < ks.length) {
                const row = r[ks[p]];
                let s = 0;
                while (p < ks.length && r[ks[p]] === row) s += v[ks[p++]];
                if (s !== 0) {
                    rowIdx[nz] = row;
                    values[nz] = s;
                    nz++;
                }
            }
            colPtr[j + 1] = nz;
        }
        return new SparseMatrix(nrows, ncols, colPtr, rowIdx, values);
    }

    /** n×n identity. */
    static identity(n: number): SparseMatrix {
        return SparseMatrix.diag(new Array(n).fill(1));
    }

    /** Square matrix with d on the diagonal. */
    static diag(d: VectorLike): SparseMatrix {
        const v = toRawVector(d, "SparseMatrix.diag");
        const n = v.length, idx = Array.from({ length: n }, (_, i) => i);
        return SparseMatrix.fromTriplets(n, n, idx, idx, v);
    }

    /** Dense copy. */
    toDense(): Matrix {
        const out: number[][] = [];
        for (let i = 0; i < this.nrows; i++) out.push(new Array(this.ncols).fill(0));
        for (let j = 0; j < this.ncols; j++) {
            for (let p = this.colPtr[j]; p < this.colPtr[j + 1]; p++) out[this.rowIdx[p]][j] = this.values[p];
        }
        return new Matrix(out);
    }

    /** Coordinate form: {rows, cols, vals}, ordered by column then row. */
    toTriplets(): { rows: number[]; cols: number[]; vals: number[] } {
        const cols: number[] = new Array(this.nnz);
        for (let j = 0; j < this.ncols; j++) {
            for (let p = this.colPtr[j]; p < this.colPtr[j + 1]; p++) cols[p] = j;
        }
        return { rows: this.rowIdx.slice(), cols, vals: this.values.slice() };
    }

    /** Entry (i, j), 0 if not stored. */
    get(i: number, j: number): number {
        let lo = this.colPtr[j], hi = this.colPtr[j + 1] - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1, r = this.rowIdx[mid];
            if (r === i) return this.values[mid];
            if (r < i) lo = mid + 1;
            else hi = mid - 1;
        }
        return 0;
    }

    /** Transpose (also the conversion between CCS and compressed row storage). */
    transpose(): SparseMatrix {
        const m = this.nrows, n = this.ncols, nz = this.nnz;
        const counts = new Array(m + 1).fill(0);
        for (let p = 0; p < nz; p++) counts[this.rowIdx[p] + 1]++;
        for (let i = 0; i < m; i++) counts[i + 1] += counts[i];
        const next = counts.slice(0, m);
        const rowIdx = new Array(nz), values = new Array(nz);
        // Visiting columns in order keeps the new row indices (old columns) sorted
        for (let j = 0; j < n; j++) {
            for (let p = this.colPtr[j]; p < this.colPtr[j + 1]; p++) {
                const q = next[this.rowIdx[p]]++;
                rowIdx[q] = j;
                values[q] = this.values[p];
            }
        }
        return new SparseMatrix(n, m, counts, rowIdx, values);
    }

    /** A copy with each stored value mapped by f (f(0) should be 0; resulting zeros are dropped). */
    mapValues(f: (v: number) => number): SparseMatrix {
        return SparseMatrix.fromParts(this.nrows, this.ncols, this.colPtr, this.rowIdx, this.values.map(f));
    }

    /** @internal Build from CCS parts, dropping explicit zeros. */
    static fromParts(m: number, n: number, colPtr: number[], rowIdx: number[], values: number[]): SparseMatrix {
        let hasZero = false;
        for (let p = 0; p < values.length; p++) if (values[p] === 0) { hasZero = true; break; }
        if (!hasZero) return new SparseMatrix(m, n, colPtr.slice(), rowIdx.slice(), values);
        const cp = new Array(n + 1), ri: number[] = [], vv: number[] = [];
        let nz = 0;
        cp[0] = 0;
        for (let j = 0; j < n; j++) {
            for (let p = colPtr[j]; p < colPtr[j + 1]; p++) {
                if (values[p] !== 0) {
                    ri[nz] = rowIdx[p];
                    vv[nz] = values[p];
                    nz++;
                }
            }
            cp[j + 1] = nz;
        }
        return new SparseMatrix(m, n, cp, ri, vv);
    }
}
