/**
 * SVD vs NumPy: singular values must match np.linalg.svd, and the factors
 * must reconstruct A with orthonormal columns. (Singular vectors are only
 * defined up to sign, so they are checked through these properties.)
 */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D } from "./runner";
import { linalg, transpose, identity } from "../index";

afterAll(() => killOracle());

const SEED = 11;

function check(A: number[][], expectedS: number[], label: string) {
    const { U, S, V } = linalg.svd(A);
    const m = A.length, n = A[0].length, k = Math.min(m, n);
    expect(U.shape).toEqual([m, k]);
    expect(S.shape).toEqual([k]);
    expect(V.shape).toEqual([n, k]);

    const s = S.real as number[];
    assertClose(s, expectedS, 1e-10, `${label} S: `);
    for (let i = 1; i < k; i++) expect(s[i]).toBeLessThanOrEqual(s[i - 1]);

    // A = U diag(S) Vᵀ
    const u = U.real as number[][], v = V.real as number[][];
    const US = u.map((row) => row.map((x, j) => x * s[j]));
    const scale = Math.max(1, s[0] ?? 0);
    assertClose2D(linalg.dotMMsmall(US, transpose(v)), A, 1e-11 * scale, `${label} reconstruction: `);

    // Orthonormal columns (only for nonzero singular values when rank-deficient)
    const nz = s.filter((x) => x > 1e-10 * scale).length;
    const cols = (M: number[][]) => M.map((row) => row.slice(0, nz));
    assertClose2D(linalg.dotMMsmall(transpose(cols(u)), cols(u)), identity(nz), 1e-11, `${label} UᵀU: `);
    assertClose2D(linalg.dotMMsmall(transpose(cols(v)), cols(v)), identity(nz), 1e-11, `${label} VᵀV: `);
}

describe("svd vs NumPy", () => {
    const shapes: [number, number][] = [[1, 1], [2, 2], [5, 5], [20, 20], [60, 60], [8, 3], [30, 7], [3, 8], [7, 30], [1, 6], [6, 1]];
    for (const [m, n] of shapes) {
        test(`${m}×${n}`, async () => {
            const res = await oracle({ op: "svd", seed: SEED + m * 100 + n, m, n });
            check(res.inputs.A as number[][], res.expected as number[], `${m}×${n}`);
        });
    }

    for (const [m, n, rank] of [[10, 10, 3], [12, 6, 2], [5, 9, 1]]) {
        test(`${m}×${n} of rank ${rank}`, async () => {
            const res = await oracle({ op: "svd", seed: SEED + m + n + rank, m, n, rank });
            check(res.inputs.A as number[][], res.expected as number[], `${m}×${n} rank ${rank}`);
        });
    }
});
