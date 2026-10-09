/**
 * Cross-validation tests for complex eigenvalue decomposition against NumPy.
 *
 * Uses the same property-based approach as eig.test.ts:
 * 1. Eigenvalues match NumPy's (sorted lexicographically)
 * 2. A * E = E * diag(lambda) (reconstruction, fully complex)
 * 3. trace(A) = sum(lambda) (complex)
 * 4. det(A) = prod(lambda) (complex)
 */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle } from "./runner";
import { eig } from "../src/linalg/eig";
import Matrix from "../src/matrix";
import Vector from "../src/vector";
import { cxDotMM, type CxMatrix } from "../src/linalg/cxmat";

afterAll(() => killOracle());

/**
 * Sort complex eigenvalues lexicographically: by real part, then imaginary part.
 */
function sortEigenvalues(re: number[], im: number[] | null): { re: number[], im: number[] } {
    const n = re.length;
    const imArr = im ?? new Array(n).fill(0);
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => {
        const dr = re[a] - re[b];
        if (Math.abs(dr) > 1e-10) return dr;
        return imArr[a] - imArr[b];
    });
    return {
        re: indices.map(i => re[i]),
        im: indices.map(i => imArr[i]),
    };
}

/**
 * Build a complex diagonal matrix from eigenvalues.
 */
function cxDiagMatrix(re: number[], im: number[] | null): CxMatrix {
    const n = re.length;
    const dRe: number[][] = Array(n);
    const dIm: number[][] | null = im !== null ? Array(n) : null;
    for (let i = 0; i < n; i++) {
        dRe[i] = new Array(n).fill(0);
        dRe[i][i] = re[i];
        if (dIm !== null) {
            dIm[i] = new Array(n).fill(0);
            dIm[i][i] = im![i];
        }
    }
    return [dRe, dIm];
}

/**
 * Compute max element-wise relative error between two complex matrices.
 */
function maxRelError(A: CxMatrix, B: CxMatrix): number {
    const m = A[0].length;
    const n = A[0][0].length;
    let maxErr = 0;
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            const are = A[0][i][j];
            const aim = A[1] !== null ? A[1][i][j] : 0;
            const bre = B[0][i][j];
            const bim = B[1] !== null ? B[1][i][j] : 0;
            const diff = Math.sqrt((are - bre) ** 2 + (aim - bim) ** 2);
            const denom = Math.max(1, Math.sqrt(bre ** 2 + bim ** 2));
            maxErr = Math.max(maxErr, diff / denom);
        }
    }
    return maxErr;
}

/** Convert a Matrix to a CxMatrix tuple for internal test helpers. */
function toCx(m: Matrix): CxMatrix {
    return [m.real as number[][], m.imag as number[][] | null];
}

const SIZES = [2, 3, 4, 5, 8, 10];
const SEEDS = [42, 123, 7];

describe("cx_eig: eigenvalue comparison against NumPy", () => {
    for (const n of SIZES) {
        for (const seed of SEEDS) {
            test(`n=${n} seed=${seed}`, async () => {
                const resp = await oracle({ op: "cx_eig", seed, n } as any);
                const A_re = (resp.inputs.A as any).re as number[][];
                const A_im = (resp.inputs.A as any).im as number[][];
                const expected = resp.expected as {
                    eigenvalues: { re: number[]; im: number[] };
                    trace: { re: number; im: number };
                    det: { re: number; im: number };
                };

                const A = new Matrix(A_re, A_im);
                const result = eig(A);
                const lambdaRe = result.lambda.real as number[];
                const lambdaIm = result.lambda.imag as number[] | null;

                // Sort both sets of eigenvalues
                const ours = sortEigenvalues(lambdaRe, lambdaIm);
                const theirs = sortEigenvalues(expected.eigenvalues.re, expected.eigenvalues.im);

                // Compare eigenvalues
                const tol = n <= 5 ? 1e-8 : 1e-6;
                for (let i = 0; i < n; i++) {
                    const diffRe = Math.abs(ours.re[i] - theirs.re[i]);
                    const diffIm = Math.abs(ours.im[i] - theirs.im[i]);
                    const mag = Math.max(1, Math.sqrt(theirs.re[i] ** 2 + theirs.im[i] ** 2));
                    expect(diffRe / mag).toBeLessThan(tol);
                    expect(diffIm / mag).toBeLessThan(tol);
                }
            });
        }
    }
});

describe("cx_eig: A*E = E*diag(lambda) reconstruction", () => {
    for (const n of SIZES) {
        for (const seed of SEEDS) {
            test(`n=${n} seed=${seed}`, async () => {
                const resp = await oracle({ op: "cx_eig", seed, n } as any);
                const A_re = (resp.inputs.A as any).re as number[][];
                const A_im = (resp.inputs.A as any).im as number[][];

                const A = new Matrix(A_re, A_im);
                const result = eig(A);

                const E = toCx(result.E);
                const lambdaRe = result.lambda.real as number[];
                const lambdaIm = result.lambda.imag as number[] | null;
                const D = cxDiagMatrix(lambdaRe, lambdaIm);

                // A*E
                const AE = cxDotMM([A_re, A_im], E);
                // E*diag(lambda)
                const ED = cxDotMM(E, D);

                const err = maxRelError(AE, ED);
                const tol = n <= 5 ? 1e-8 : 1e-6;
                expect(err).toBeLessThan(tol);
            });
        }
    }
});

describe("cx_eig: trace and determinant", () => {
    for (const n of SIZES) {
        for (const seed of SEEDS) {
            test(`trace n=${n} seed=${seed}`, async () => {
                const resp = await oracle({ op: "cx_eig", seed, n } as any);
                const expected = resp.expected as {
                    trace: { re: number; im: number };
                    det: { re: number; im: number };
                };

                const A_re = (resp.inputs.A as any).re as number[][];
                const A_im = (resp.inputs.A as any).im as number[][];
                const A = new Matrix(A_re, A_im);
                const result = eig(A);
                const lambdaRe = result.lambda.real as number[];
                const lambdaIm = result.lambda.imag as number[] | null;

                // trace(A) = sum(eigenvalues) (complex)
                let traceRe = 0, traceIm = 0;
                for (let i = 0; i < n; i++) {
                    traceRe += lambdaRe[i];
                    traceIm += lambdaIm !== null ? lambdaIm[i] : 0;
                }
                const traceMag = Math.max(1, Math.sqrt(expected.trace.re ** 2 + expected.trace.im ** 2));
                expect(Math.abs(traceRe - expected.trace.re) / traceMag).toBeLessThan(1e-8);
                expect(Math.abs(traceIm - expected.trace.im) / traceMag).toBeLessThan(1e-8);
            });

            test(`det n=${n} seed=${seed}`, async () => {
                const resp = await oracle({ op: "cx_eig", seed, n } as any);
                const expected = resp.expected as {
                    trace: { re: number; im: number };
                    det: { re: number; im: number };
                };

                const A_re = (resp.inputs.A as any).re as number[][];
                const A_im = (resp.inputs.A as any).im as number[][];
                const A = new Matrix(A_re, A_im);
                const result = eig(A);
                const lambdaRe = result.lambda.real as number[];
                const lambdaIm = result.lambda.imag as number[] | null;

                // det(A) = prod(eigenvalues) (complex)
                let prodRe = 1, prodIm = 0;
                for (let i = 0; i < n; i++) {
                    const lr = lambdaRe[i];
                    const li = lambdaIm !== null ? lambdaIm[i] : 0;
                    const newRe = prodRe * lr - prodIm * li;
                    const newIm = prodRe * li + prodIm * lr;
                    prodRe = newRe;
                    prodIm = newIm;
                }
                const detMag = Math.max(1, Math.sqrt(expected.det.re ** 2 + expected.det.im ** 2));
                expect(Math.abs(prodRe - expected.det.re) / detMag).toBeLessThan(1e-6);
                expect(Math.abs(prodIm - expected.det.im) / detMag).toBeLessThan(1e-6);
            });
        }
    }
});

describe("cx_eig: edge cases", () => {
    test("complex diagonal matrix", () => {
        // diag(1+2i, 3-i, -1+0i)
        const re = [[1, 0, 0], [0, 3, 0], [0, 0, -1]];
        const im = [[2, 0, 0], [0, -1, 0], [0, 0, 0]];
        const A = new Matrix(re, im);
        const result = eig(A);
        const lambdaRe = result.lambda.real as number[];
        const lambdaIm = result.lambda.imag as number[] | null;

        const sorted = sortEigenvalues(lambdaRe, lambdaIm);
        // Eigenvalues sorted: -1+0i, 1+2i, 3-1i
        expect(Math.abs(sorted.re[0] - (-1))).toBeLessThan(1e-10);
        expect(Math.abs(sorted.im[0] - 0)).toBeLessThan(1e-10);
        expect(Math.abs(sorted.re[1] - 1)).toBeLessThan(1e-10);
        expect(Math.abs(sorted.im[1] - 2)).toBeLessThan(1e-10);
        expect(Math.abs(sorted.re[2] - 3)).toBeLessThan(1e-10);
        expect(Math.abs(sorted.im[2] - (-1))).toBeLessThan(1e-10);
    });

    test("Hermitian matrix has real eigenvalues", () => {
        // A = [[2, 1+i], [1-i, 3]]
        const re = [[2, 1], [1, 3]];
        const im = [[0, 1], [-1, 0]];
        const A = new Matrix(re, im);
        const result = eig(A);
        const lambdaIm = result.lambda.imag as number[] | null;

        // Hermitian matrices have all-real eigenvalues
        if (lambdaIm !== null) {
            for (let i = 0; i < 2; i++) {
                expect(Math.abs(lambdaIm[i])).toBeLessThan(1e-10);
            }
        }

        // Verify reconstruction
        const E = toCx(result.E);
        const lambdaRe = result.lambda.real as number[];
        const D = cxDiagMatrix(lambdaRe, lambdaIm);
        const AE = cxDotMM([re, im], E);
        const ED = cxDotMM(E, D);
        expect(maxRelError(AE, ED)).toBeLessThan(1e-10);
    });

    test("returns Vector and Matrix instances", () => {
        const re = [[1, 0], [0, 2]];
        const im = [[0, 1], [-1, 0]];
        const A = new Matrix(re, im);
        const result = eig(A);

        expect(result.lambda).toBeInstanceOf(Vector);
        expect(result.E).toBeInstanceOf(Matrix);
    });

    test("real matrix via complex path gives same eigenvalues as real path", () => {
        // Pass a real matrix through the complex path by giving it zero imaginary part
        const reData = [[2, 1, 0], [1, 3, 1], [0, 1, 2]];
        const imData = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

        const realResult = eig(reData);
        const cxResult = eig(new Matrix(reData, imData));

        const realSorted = sortEigenvalues(
            realResult.lambda.real as number[],
            realResult.lambda.imag as number[] | null
        );
        const cxSorted = sortEigenvalues(
            cxResult.lambda.real as number[],
            cxResult.lambda.imag as number[] | null
        );

        for (let i = 0; i < 3; i++) {
            expect(Math.abs(realSorted.re[i] - cxSorted.re[i])).toBeLessThan(1e-8);
            expect(Math.abs(realSorted.im[i] - cxSorted.im[i])).toBeLessThan(1e-8);
        }
    });
});
