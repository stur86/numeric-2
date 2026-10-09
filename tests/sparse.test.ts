/** Sparse matrices vs scipy.sparse (operations) and scipy.sparse.linalg.spsolve (LU solves). */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D } from "./runner";
import { sparse, SparseMatrix, linalg, Vector, Matrix, transpose } from "../index";

afterAll(() => killOracle());

/** Canonical form: sorted rows within columns, no explicit zeros, consistent pointers. */
function expectCanonical(S: SparseMatrix) {
    expect(S.colPtr.length).toBe(S.ncols + 1);
    expect(S.colPtr[0]).toBe(0);
    for (let j = 0; j < S.ncols; j++) {
        for (let p = S.colPtr[j]; p < S.colPtr[j + 1]; p++) {
            expect(S.values[p]).not.toBe(0);
            expect(S.rowIdx[p]).toBeGreaterThanOrEqual(0);
            expect(S.rowIdx[p]).toBeLessThan(S.nrows);
            if (p > S.colPtr[j]) expect(S.rowIdx[p]).toBeGreaterThan(S.rowIdx[p - 1]);
        }
    }
}

const dense = (S: SparseMatrix) => S.toDense().real as number[][];

describe("sparse operations vs scipy.sparse", () => {
    const cases: [number, number, number][] = [[1, 1, 1], [5, 5, 0.4], [8, 3, 0.3], [3, 9, 0.3], [40, 40, 0.05], [100, 60, 0.02]];
    for (const [m, n, density] of cases) {
        test(`${m}×${n}, density ${density}`, async () => {
            const res = await oracle({ op: "sparse", seed: m * 31 + n, m, n, density });
            const inp = res.inputs as any, e = res.expected as any;
            const A = SparseMatrix.fromDense(inp.A), B = SparseMatrix.fromDense(inp.B), C = SparseMatrix.fromDense(inp.C);
            expect(A.nnz).toBe(e.nnzA);
            expect(A.shape).toEqual([m, n]);
            for (const S of [A, sparse.add(A, B), sparse.sub(A, B), sparse.mul(A, B), A.transpose(), sparse.dot(A, C)]) expectCanonical(S);

            assertClose2D(dense(sparse.add(A, B)), e.add, 1e-14, "add ");
            assertClose2D(dense(sparse.sub(A, B)), e.sub, 1e-14, "sub ");
            assertClose2D(dense(sparse.mul(A, B)), e.mul, 1e-14, "mul ");
            assertClose2D(dense(sparse.mul(A, 2.5)), e.scale, 1e-14, "scale ");
            assertClose2D(dense(sparse.div(A, 0.4)), e.scale, 1e-14, "div ");
            assertClose2D(dense(A.transpose()), e.T, 0, "T ");
            assertClose2D(dense(sparse.dot(A, C)), e.dotSS, 1e-12, "dot SS ");
            assertClose(sparse.dot(A, inp.x as number[]).real as number[], e.dotSV, 1e-12, "dot SV ");
            assertClose(sparse.dot(inp.y as number[], A).real as number[], e.dotVS, 1e-12, "dot VS ");
            assertClose2D(sparse.dot(A, inp.D as number[][]).real as number[][], e.dotSD, 1e-12, "dot SD ");
            assertClose2D(sparse.dot(transpose(inp.D), A.transpose()).real as number[][], transpose(e.dotSD), 1e-12, "dot DS ");
            assertClose2D(dense(sparse.getBlock(A, inp.rows, inp.cols)), e.block, 0, "block ");
            assertClose2D(dense(sparse.neg(A)), (inp.A as number[][]).map((r) => r.map((v) => -v)), 0, "neg ");
        });
    }
});

describe("sparse LU vs spsolve", () => {
    const cases: [string, number][] = [["random", 5], ["random", 50], ["random", 300], ["permuted", 6], ["permuted", 40], ["permuted", 200], ["poisson", 16], ["poisson", 400], ["poisson", 2500]];
    for (const [kind, n] of cases) {
        test(`${kind} n=${n}`, async () => {
            const res = await oracle({ op: "sparse_solve", seed: n, n, kind: kind as any, density: 0.05 });
            const inp = res.inputs as any;
            const A = SparseMatrix.fromTriplets(inp.n, inp.n, inp.rows, inp.cols, inp.vals);
            const f = sparse.lu(A);
            expectCanonical(f.L);
            expectCanonical(f.U);
            // L unit lower triangular, U upper triangular
            for (let j = 0; j < n; j++) {
                expect(f.L.rowIdx[f.L.colPtr[j]]).toBe(j);
                expect(f.L.values[f.L.colPtr[j]]).toBe(1);
                for (let p = f.L.colPtr[j]; p < f.L.colPtr[j + 1]; p++) expect(f.L.rowIdx[p]).toBeGreaterThanOrEqual(j);
                for (let p = f.U.colPtr[j]; p < f.U.colPtr[j + 1]; p++) expect(f.U.rowIdx[p]).toBeLessThanOrEqual(j);
            }
            // P·A = L·U
            if (n <= 300) {
                const Ad = dense(A);
                const PA = f.p.map((r) => Ad[r]);
                assertClose2D(dense(sparse.dot(f.L, f.U)), PA, 1e-12, "PA=LU ");
            }
            assertClose(f.solve(inp.b).real as number[], res.expected as number[], 1e-9, "solve ");
            assertClose(sparse.solve(A, inp.b).real as number[], res.expected as number[], 1e-9, "sparse.solve ");
        });
    }

    test("diagonally dominant matrices keep the natural order", async () => {
        const res = await oracle({ op: "sparse_solve", seed: 3, n: 30, kind: "random", density: 0.1 });
        const inp = res.inputs as any;
        expect(sparse.lu(SparseMatrix.fromTriplets(30, 30, inp.rows, inp.cols, inp.vals)).p).toEqual(Array.from({ length: 30 }, (_, i) => i));
    });

    test("several right-hand sides", () => {
        const A = SparseMatrix.fromDense([[2, 1, 0], [1, 3, 1], [0, 1, 4]]);
        const B = [[1, 0], [0, 1], [2, 3]];
        const X = sparse.lu(A).solve(B);
        expect(X).toBeInstanceOf(Matrix);
        assertClose2D(X.real as number[][], linalg.dot(linalg.inv([[2, 1, 0], [1, 3, 1], [0, 1, 4]]), B).real as number[][], 1e-12);
    });

    test("singular matrices are reported", () => {
        expect(() => sparse.lu(SparseMatrix.fromDense([[1, 2], [2, 4]]))).toThrow("singular");
        expect(() => sparse.lu(SparseMatrix.fromTriplets(3, 3, [0, 1], [0, 1], [1, 1]))).toThrow("singular");
        expect(() => sparse.lu(SparseMatrix.fromDense([[1, 2, 3]]))).toThrow("square");
    });
});

describe("SparseMatrix construction", () => {
    test("fromTriplets sums duplicates and drops zeros", () => {
        const S = SparseMatrix.fromTriplets(3, 4, [0, 2, 0, 1, 1], [1, 3, 1, 0, 2], [1, 5, 2, 3, -0]);
        expectCanonical(S);
        expect(S.get(0, 1)).toBe(3);
        expect(S.get(2, 3)).toBe(5);
        expect(S.get(1, 2)).toBe(0);
        expect(S.nnz).toBe(3);
        const t = S.toTriplets();
        expect(SparseMatrix.fromTriplets(3, 4, t.rows, t.cols, t.vals).toDense().real).toEqual(S.toDense().real);
        expect(() => SparseMatrix.fromTriplets(2, 2, [2], [0], [1])).toThrow("outside");
    });

    test("identity, diag and shapes with empty rows/columns", () => {
        expect(SparseMatrix.identity(3).toDense().real).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
        expect(SparseMatrix.diag(new Vector([2, 0, 3])).nnz).toBe(2);
        // Trailing empty rows survive (numeric.js's ccsDim drops them)
        const S = SparseMatrix.fromDense([[1, 0], [0, 0], [0, 0]]);
        expect(S.shape).toEqual([3, 2]);
        expect(S.transpose().shape).toEqual([2, 3]);
        expect(SparseMatrix.fromDense([[1e-12, 1], [2, -1e-15]], 1e-9).nnz).toBe(2);
    });

    test("cancellation leaves no explicit zeros", () => {
        const A = SparseMatrix.fromDense([[1, 2], [0, 3]]);
        expect(sparse.sub(A, A).nnz).toBe(0);
        expect(sparse.dot(SparseMatrix.fromDense([[1, -1]]), SparseMatrix.fromDense([[1], [1]])).nnz).toBe(0);
    });

    test("shape mismatches", () => {
        const A = SparseMatrix.identity(2), B = SparseMatrix.identity(3);
        expect(() => sparse.add(A, B)).toThrow("shape mismatch");
        expect(() => sparse.dot(A, B)).toThrow("shape mismatch");
        expect(() => sparse.dot(A, [1, 2, 3])).toThrow("shape mismatch");
    });
});
