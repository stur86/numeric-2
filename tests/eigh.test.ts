/**
 * eigh / eighTridiagonal / eighGeneralized vs NumPy and SciPy.
 *
 * Eigenvalues are compared directly (ascending, lowest k). Eigenvectors are
 * only defined up to phase (and up to a basis within a degenerate eigenspace),
 * so they are checked through the residual ‖A·E − B·E·diag(λ)‖ and
 * Eᴴ·B·E = I (B = I, or S for the generalized problem).
 */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose } from "./runner";
import { linalg, Matrix, Vector } from "../index";

afterAll(() => killOracle());

type Parts = { re: number[][]; im: number[][] };
const fromParts = (p: Parts, cx: boolean) => (cx ? new Matrix(p.re, p.im) : p.re);
const toM = (A: Matrix | number[][]) => (A instanceof Matrix ? A : new Matrix(A));

/** max |A·E − B·E·diag(λ)| and max |Eᴴ·B·E − I|, relative to the scale of A. */
function checkVectors(A: Matrix | number[][], r: { lambda: Vector; E: Matrix }, B?: Matrix | number[][]) {
    const lam = r.lambda.real as number[];
    const E = r.E;
    const n = E.shape[0], k = lam.length;
    expect(E.shape).toEqual([n, k]);
    const AE = linalg.dot(toM(A), E) as Matrix;
    const BE = B === undefined ? E : (linalg.dot(toM(B), E) as Matrix);
    const G = linalg.dot(E.transjugate(), BE) as Matrix;
    const re = (M: Matrix) => M.real as number[][];
    const im = (M: Matrix, i: number, j: number) => (M.is_complex ? (M.imag as number[][])[i][j] : 0);
    const scale = Math.max(1, ...lam.map(Math.abs));
    let res = 0, orth = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < k; j++) {
            res = Math.max(res, Math.hypot(re(AE)[i][j] - lam[j] * re(BE)[i][j], im(AE, i, j) - lam[j] * im(BE, i, j)));
        }
    }
    for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) orth = Math.max(orth, Math.hypot(re(G)[i][j] - (i === j ? 1 : 0), im(G, i, j)));
    }
    expect(res / scale).toBeLessThan(1e-12 * n);
    expect(orth).toBeLessThan(1e-12 * n);
}

describe("eigh vs NumPy", () => {
    for (const cx of [false, true]) {
        for (const kind of ["random", "degenerate"]) {
            for (const n of [1, 2, 3, 10, 40, 100]) {
                for (const k of [undefined, 1, Math.ceil(n / 3)]) {
                    if (k !== undefined && k >= n) continue;
                    test(`${cx ? "Hermitian" : "symmetric"} ${kind} n=${n}${k ? ` k=${k}` : ""}`, async () => {
                        const res = await oracle({ op: "eigh", seed: 100 + n, n, complex: cx, kind, k });
                        const A = fromParts(res.inputs.A as unknown as Parts, cx);
                        const r = linalg.eigh(A, k);
                        assertClose(r.lambda, res.expected as number[], 1e-11, "lambda ");
                        expect(r.E.is_complex).toBe(cx);
                        checkVectors(A, r);
                    });
                }
            }
        }
    }

    test("reads only the lower triangle", async () => {
        const res = await oracle({ op: "eigh", seed: 5, n: 8, complex: true });
        const p = res.inputs.A as unknown as Parts;
        const junk = (M: number[][]) => M.map((row, i) => row.map((x, j) => (j > i ? 1e3 * (i + 2 * j) : x)));
        const r = linalg.eigh(new Matrix(junk(p.re), junk(p.im)));
        assertClose(r.lambda, res.expected as number[], 1e-11, "lambda ");
        checkVectors(new Matrix(p.re, p.im), r);
    });
});

describe("eigh edge cases", () => {
    test("identity, zero and diagonal matrices", () => {
        for (const A of [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 0], [0, 0]], [[3, 0, 0], [0, -1, 0], [0, 0, 2]]]) {
            for (const k of [undefined, 1, 2]) {
                if (k !== undefined && k >= A.length) continue;
                const r = linalg.eigh(A, k);
                const sorted = A.map((row, i) => row[i]).sort((a, b) => a - b).slice(0, k ?? A.length);
                assertClose(r.lambda, sorted, 1e-14);
                checkVectors(A, r);
            }
        }
    });

    test("two identical decoupled blocks (exactly repeated eigenvalues)", () => {
        const A = [[1, 0.5, 0, 0], [0.5, 2, 0, 0], [0, 0, 1, 0.5], [0, 0, 0.5, 2]];
        for (const k of [undefined, 2, 3]) checkVectors(A, linalg.eigh(A, k));
    });

    test("argument checks", () => {
        expect(() => linalg.eigh([[1, 2, 3], [4, 5, 6]])).toThrow();
        expect(() => linalg.eigh([[1, 0], [0, 1]], 0)).toThrow();
        expect(() => linalg.eigh([[1, 0], [0, 1]], 3)).toThrow();
        expect(() => linalg.eigh([[1, 0], [0, 1]], 1.5)).toThrow();
    });
});

describe("eighTridiagonal vs SciPy", () => {
    for (const kind of ["random", "wilkinson", "split"]) {
        for (const n of [3, 21, 60]) {
            for (const k of [undefined, 2, Math.floor(n / 2)]) {
                test(`${kind} n=${n}${k ? ` k=${k}` : ""}`, async () => {
                    const res = await oracle({ op: "eigh_tridiagonal", seed: 7 + n, n, kind, k });
                    const d = res.inputs.d as number[], e = res.inputs.e as number[];
                    const r = linalg.eighTridiagonal(d, e, k);
                    assertClose(r.lambda, res.expected as number[], 1e-11, "lambda ");
                    const T = d.map((di, i) => d.map((_, j) => (i === j ? di : j === i + 1 ? e[i] : j === i - 1 ? e[j] : 0)));
                    checkVectors(T, r);
                });
            }
        }
    }

    test("Wilkinson W21+: nearly equal pairs get orthogonal vectors", async () => {
        // −W21+ puts the closest pair (gap ~1e-14) at the bottom of the spectrum
        const res = await oracle({ op: "eigh_tridiagonal", seed: 0, n: 21, kind: "wilkinson" });
        const d = (res.inputs.d as number[]).map((x) => -x), e = res.inputs.e as number[];
        const r = linalg.eighTridiagonal(d, e, 4);
        const expected = (res.expected as number[]).map((x) => -x).reverse().slice(0, 4);
        assertClose(r.lambda, expected, 1e-11, "lambda ");
        const T = d.map((di, i) => d.map((_, j) => (i === j ? di : j === i + 1 ? e[i] : j === i - 1 ? e[j] : 0)));
        checkVectors(T, r);
    });

    test("argument checks", () => {
        expect(() => linalg.eighTridiagonal([1, 2, 3], [1])).toThrow();
        expect(() => linalg.eighTridiagonal(new Vector([1, 2], [0, 1]), [1])).toThrow();
    });
});

describe("eighGeneralized vs SciPy", () => {
    for (const cx of [false, true]) {
        for (const n of [1, 4, 30, 80]) {
            for (const k of [undefined, 1, Math.ceil(n / 4)]) {
                if (k !== undefined && k >= n) continue;
                test(`${cx ? "Hermitian" : "symmetric"} n=${n}${k ? ` k=${k}` : ""}`, async () => {
                    const res = await oracle({ op: "eigh_generalized", seed: 300 + n, n, complex: cx, k });
                    const H = fromParts(res.inputs.A as unknown as Parts, cx), S = fromParts(res.inputs.S as unknown as Parts, cx);
                    const r = linalg.eighGeneralized(H, S, k);
                    assertClose(r.lambda, res.expected as number[], 1e-10, "lambda ");
                    checkVectors(H, r, S);
                });
            }
        }
    }

    test("real H with complex S", async () => {
        const res = await oracle({ op: "eigh_generalized", seed: 9, n: 6, complex: true });
        const S = fromParts(res.inputs.S as unknown as Parts, true);
        const H = (res.inputs.A as unknown as Parts).re;
        const r = linalg.eighGeneralized(H, S);
        expect(r.E.is_complex).toBe(true);
        checkVectors(H, r, S);
    });

    test("S = I matches eigh", async () => {
        const res = await oracle({ op: "eigh", seed: 3, n: 12 });
        const A = (res.inputs.A as unknown as Parts).re;
        const I = A.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
        assertClose(linalg.eighGeneralized(A, I).lambda, res.expected as number[], 1e-12);
    });

    test("rejects an S that is not positive definite", () => {
        expect(() => linalg.eighGeneralized([[1, 0], [0, 1]], [[1, 2], [2, 1]])).toThrow("not positive definite");
        expect(() => linalg.eighGeneralized([[1, 0], [0, 1]], [[1]])).toThrow();
    });
});
