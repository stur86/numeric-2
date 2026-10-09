/**
 * Cross-validation tests for eigenvalue decomposition against NumPy.
 *
 * Eigenvalue decomposition results are not unique (eigenvectors can be
 * scaled/rotated), so we use property-based testing:
 * 1. Eigenvalues match NumPy's (sorted lexicographically)
 * 2. A * E ≈ E * diag(lambda) (reconstruction)
 * 3. trace(A) ≈ sum(lambda)
 * 4. det(A) ≈ prod(lambda) (for real det)
 */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertScalarClose } from "./runner";
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

describe("eig: eigenvalue comparison against NumPy", () => {
    for (const n of SIZES) {
        for (const seed of SEEDS) {
            test(`n=${n} seed=${seed}`, async () => {
                const resp = await oracle({ op: "eig", seed, n } as any);
                const A = resp.inputs.A as number[][];
                const expected = resp.expected as {
                    eigenvalues: { re: number[]; im: number[] };
                    trace: number;
                    det: number;
                };

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

describe("eig: A*E = E*diag(lambda) reconstruction", () => {
    for (const n of SIZES) {
        for (const seed of SEEDS) {
            test(`n=${n} seed=${seed}`, async () => {
                const resp = await oracle({ op: "eig", seed, n } as any);
                const A = resp.inputs.A as number[][];
                const result = eig(A);

                const E = toCx(result.E);
                const lambdaRe = result.lambda.real as number[];
                const lambdaIm = result.lambda.imag as number[] | null;
                const D = cxDiagMatrix(lambdaRe, lambdaIm);

                // A*E
                const AE = cxDotMM([A, null], E);
                // E*diag(lambda)
                const ED = cxDotMM(E, D);

                const err = maxRelError(AE, ED);
                const tol = n <= 5 ? 1e-8 : 1e-6;
                expect(err).toBeLessThan(tol);
            });
        }
    }
});

describe("eig: trace and determinant", () => {
    for (const n of SIZES) {
        for (const seed of SEEDS) {
            test(`trace n=${n} seed=${seed}`, async () => {
                const resp = await oracle({ op: "eig", seed, n } as any);
                const A = resp.inputs.A as number[][];
                const expected = resp.expected as { trace: number; det: number };
                const result = eig(A);
                const lambdaRe = result.lambda.real as number[];

                // trace(A) = sum(eigenvalues) (real part only since A is real)
                let traceSum = 0;
                for (let i = 0; i < n; i++) traceSum += lambdaRe[i];
                assertScalarClose(traceSum, expected.trace, 1e-8, "trace ");
            });

            test(`det n=${n} seed=${seed}`, async () => {
                const resp = await oracle({ op: "eig", seed, n } as any);
                const A = resp.inputs.A as number[][];
                const expected = resp.expected as { trace: number; det: number };
                const result = eig(A);
                const lambdaRe = result.lambda.real as number[];
                const lambdaIm = result.lambda.imag as number[] | null;

                // det(A) = prod(eigenvalues) (should be real since A is real)
                // Complex product: multiply all eigenvalues together
                let prodRe = 1, prodIm = 0;
                for (let i = 0; i < n; i++) {
                    const lr = lambdaRe[i];
                    const li = lambdaIm !== null ? lambdaIm[i] : 0;
                    const newRe = prodRe * lr - prodIm * li;
                    const newIm = prodRe * li + prodIm * lr;
                    prodRe = newRe;
                    prodIm = newIm;
                }
                // Imaginary part should be ~0 for real A
                expect(Math.abs(prodIm)).toBeLessThan(1e-6);
                assertScalarClose(prodRe, expected.det, 1e-6, "det ");
            });
        }
    }
});

describe("eig: edge cases", () => {
    test("identity matrix", () => {
        const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const result = eig(I);
        const lambdaRe = result.lambda.real as number[];
        const lambdaIm = result.lambda.imag as number[] | null;

        // All eigenvalues should be 1
        for (let i = 0; i < 3; i++) {
            expect(Math.abs(lambdaRe[i] - 1)).toBeLessThan(1e-10);
        }
        // Imaginary parts should be 0
        if (lambdaIm !== null) {
            for (let i = 0; i < 3; i++) {
                expect(Math.abs(lambdaIm[i])).toBeLessThan(1e-10);
            }
        }
    });

    test("diagonal matrix", () => {
        const D = [[3, 0, 0], [0, 1, 0], [0, 0, 2]];
        const result = eig(D);
        const lambdaRe = result.lambda.real as number[];
        const lambdaIm = result.lambda.imag as number[] | null;

        const sorted = sortEigenvalues(lambdaRe, lambdaIm);
        expect(Math.abs(sorted.re[0] - 1)).toBeLessThan(1e-10);
        expect(Math.abs(sorted.re[1] - 2)).toBeLessThan(1e-10);
        expect(Math.abs(sorted.re[2] - 3)).toBeLessThan(1e-10);
    });

    test("2x2 with complex eigenvalues", () => {
        // [[0, -1], [1, 0]] has eigenvalues ±i
        const A = [[0, -1], [1, 0]];
        const result = eig(A);
        const lambdaRe = result.lambda.real as number[];
        const lambdaIm = result.lambda.imag as number[] | null;

        const sorted = sortEigenvalues(lambdaRe, lambdaIm);
        // Eigenvalues should be 0±1i
        expect(Math.abs(sorted.re[0])).toBeLessThan(1e-10);
        expect(Math.abs(sorted.re[1])).toBeLessThan(1e-10);
        expect(Math.abs(Math.abs(sorted.im[0]) - 1)).toBeLessThan(1e-10);
        expect(Math.abs(Math.abs(sorted.im[1]) - 1)).toBeLessThan(1e-10);
        // Conjugate pair
        expect(Math.abs(sorted.im[0] + sorted.im[1])).toBeLessThan(1e-10);
    });

    test("symmetric matrix (all real eigenvalues)", () => {
        const A = [[2, 1, 0], [1, 3, 1], [0, 1, 2]];
        const result = eig(A);
        const lambdaRe = result.lambda.real as number[];
        const lambdaIm = result.lambda.imag as number[] | null;

        // All eigenvalues should be real
        if (lambdaIm !== null) {
            for (let i = 0; i < 3; i++) {
                expect(Math.abs(lambdaIm[i])).toBeLessThan(1e-10);
            }
        }

        // Verify A*E = E*diag(lambda)
        const E = toCx(result.E);
        const D = cxDiagMatrix(lambdaRe, lambdaIm);
        const AE = cxDotMM([A, null], E);
        const ED = cxDotMM(E, D);
        expect(maxRelError(AE, ED)).toBeLessThan(1e-10);
    });

    test("accepts Matrix input", () => {
        const A = new Matrix([[0, -1], [1, 0]]);
        const result = eig(A);

        // Should return Vector and Matrix instances
        expect(result.lambda).toBeInstanceOf(Vector);
        expect(result.E).toBeInstanceOf(Matrix);

        // Same eigenvalues as raw array input
        const lambdaRe = result.lambda.real as number[];
        const lambdaIm = result.lambda.imag as number[] | null;
        const sorted = sortEigenvalues(lambdaRe, lambdaIm);
        expect(Math.abs(sorted.re[0])).toBeLessThan(1e-10);
        expect(Math.abs(sorted.re[1])).toBeLessThan(1e-10);
    });
});
