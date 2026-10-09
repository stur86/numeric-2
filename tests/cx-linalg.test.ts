/**
 * Cross-validation of complex linear algebra (solve, LU, inv, det, dot) and
 * complex element-wise ops through the public API, against NumPy.
 */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D, assertComplexClose } from "./runner";
import { Vector, Matrix, linalg, complex } from "../index";

afterAll(() => killOracle());

const SEED = 7;
const L = linalg as any;

type Cx1 = { re: number[]; im: number[] };
type Cx2 = { re: number[][]; im: number[][] };
type CxS = { re: number; im: number };

const cxVec = (z: unknown) => { const c = z as Cx1; return new Vector(c.re, c.im); };
const cxMat = (z: unknown) => { const c = z as Cx2; return new Matrix(c.re, c.im); };
/** A real-valued input from the oracle (zero imaginary part), as a real tensor. */
const reVec = (z: unknown) => new Vector((z as Cx1).re);
const reMat = (z: unknown) => new Matrix((z as Cx2).re);

function expectCxVector(actual: Vector, expected: unknown, tol: number, label: string) {
    const e = expected as Cx1;
    expect(actual).toBeInstanceOf(Vector);
    assertClose(actual.real as number[], e.re, tol, `${label}re `);
    assertClose(actual.imag as number[], e.im, tol, `${label}im `);
}

function expectCxMatrix(actual: Matrix, expected: unknown, tol: number, label: string) {
    const e = expected as Cx2;
    expect(actual).toBeInstanceOf(Matrix);
    assertClose2D(actual.real as number[][], e.re, tol, `${label}re `);
    assertClose2D(actual.imag as number[][], e.im, tol, `${label}im `);
}

describe("complex linear algebra vs NumPy", () => {
    for (const n of [1, 3, 6, 15]) {
        test(`solve ${n}x${n}`, async () => {
            const res = await oracle({ op: "cx_solve", seed: SEED + n, n });
            expectCxVector(linalg.solve(cxMat(res.inputs.A), cxVec(res.inputs.b)), res.expected, 1e-9, "solve ");
        });

        test(`solve ${n}x${n}, real A, complex b`, async () => {
            const res = await oracle({ op: "cx_solve", seed: SEED + n, n, real_A: true });
            expectCxVector(linalg.solve(reMat(res.inputs.A), cxVec(res.inputs.b)), res.expected, 1e-9, "solve ");
        });

        test(`solve ${n}x${n}, complex A, real b`, async () => {
            const res = await oracle({ op: "cx_solve", seed: SEED + n, n, real_b: true });
            expectCxVector(linalg.solve(cxMat(res.inputs.A), reVec(res.inputs.b)), res.expected, 1e-9, "solve ");
        });

        test(`LU + LUsolve ${n}x${n}`, async () => {
            const res = await oracle({ op: "cx_solve", seed: SEED + n, n });
            const A = cxMat(res.inputs.A);
            const lup = linalg.LU(A);
            expect(lup.LU.is_complex).toBe(true);
            expectCxVector(linalg.LUsolve(lup, cxVec(res.inputs.b)), res.expected, 1e-9, "LUsolve ");
            // Input untouched
            assertClose2D(A.real as number[][], (res.inputs.A as unknown as Cx2).re, 0, "LU input ");
        });

        test(`inv ${n}x${n}`, async () => {
            const res = await oracle({ op: "cx_inv", seed: SEED + n, n });
            expectCxMatrix(linalg.inv(cxMat(res.inputs.A)), res.expected, 1e-9, "inv ");
        });

        test(`det ${n}x${n}`, async () => {
            const res = await oracle({ op: "cx_det", seed: SEED + n, n });
            assertComplexClose(linalg.det(cxMat(res.inputs.A)), res.expected as unknown as CxS, 1e-9, "det ");
        });
    }

    for (const [m, n, p] of [[3, 4, 2], [12, 11, 13]]) {
        for (const variant of ["MV", "VM", "MM"] as const) {
            for (const real of [null, "real_x", "real_y"] as const) {
                test(`dot ${variant} ${m}x${n}x${p} ${real ?? "both complex"}`, async () => {
                    const req: any = { op: "cx_dot", variant, seed: SEED, m, n, p };
                    if (real) req[real] = true;
                    const res = await oracle(req);
                    const isM = (side: "x" | "y") => variant === "MM" || (variant === "MV" ? side === "x" : side === "y");
                    const arg = (side: "x" | "y") => {
                        const z = res.inputs[side];
                        const isReal = real === `real_${side}`;
                        return isM(side) ? (isReal ? reMat(z) : cxMat(z)) : (isReal ? reVec(z) : cxVec(z));
                    };
                    const out = L.dot(arg("x"), arg("y"));
                    if (variant === "MM") expectCxMatrix(out, res.expected, 1e-12, "dot ");
                    else expectCxVector(out, res.expected, 1e-12, "dot ");
                });
            }
        }
    }

    test("dot VV complex", async () => {
        const res = await oracle({ op: "cx_dot_VV", seed: SEED, n: 25 });
        assertComplexClose(linalg.dot(cxVec(res.inputs.x), cxVec(res.inputs.y)), res.expected as unknown as CxS, 1e-12, "dot ");
    });
});

describe("complex element-wise ops vs NumPy", () => {
    for (const op of ["exp", "log", "sqrt", "sin", "cos"]) {
        test(`${op} vector`, async () => {
            const res = await oracle({ op: `cx_${op}`, seed: SEED, n: 40 });
            expectCxVector(L[op](cxVec(res.inputs.x)), res.expected, 1e-12, `${op} `);
        });

        test(`${op} matrix`, async () => {
            const res = await oracle({ op: `cx_${op}`, seed: SEED, shape: [5, 8] });
            expectCxMatrix(L[op](cxMat(res.inputs.x)), res.expected, 1e-12, `${op} `);
        });
    }

    for (const op of ["sum", "prod"]) {
        test(`${op} vector`, async () => {
            const res = await oracle({ op: `cx_${op}`, seed: SEED, n: 12 });
            assertComplexClose(L[op](cxVec(res.inputs.x)), res.expected as unknown as CxS, 1e-12, `${op} `);
        });

        test(`${op} matrix`, async () => {
            const res = await oracle({ op: `cx_${op}`, seed: SEED, shape: [3, 4] });
            assertComplexClose(L[op](cxMat(res.inputs.x)), res.expected as unknown as CxS, 1e-12, `${op} `);
        });
    }

    // Complex scalar operands (VS / SV), on vectors and matrices
    for (const op of ["add", "sub", "mul", "div"]) {
        for (const variant of ["VS", "SV"] as const) {
            test(`${op} ${variant} with a complex scalar (vector)`, async () => {
                const res = await oracle({ op: `cx_${op}`, variant, seed: SEED, n: 30 });
                const s = res.inputs[variant === "VS" ? "y" : "x"] as unknown as CxS;
                const t = cxVec(res.inputs[variant === "VS" ? "x" : "y"]);
                const z = complex(s.re, s.im);
                const out = variant === "VS" ? L[op](t, z) : L[op](z, t);
                expectCxVector(out, res.expected, 1e-12, `${op} `);
            });

            test(`${op} ${variant} with a complex scalar (matrix)`, async () => {
                const res = await oracle({ op: `cx_${op}`, variant, seed: SEED, shape: [4, 6] });
                const s = res.inputs[variant === "VS" ? "y" : "x"] as unknown as CxS;
                const t = cxMat(res.inputs[variant === "VS" ? "x" : "y"]);
                const z = complex(s.re, s.im);
                const out = variant === "VS" ? L[op](t, z) : L[op](z, t);
                expectCxMatrix(out, res.expected, 1e-12, `${op} `);
            });
        }
    }

    for (const op of ["eq", "neq"]) {
        for (const variant of ["VV", "VS", "SV"] as const) {
            test(`${op} ${variant}`, async () => {
                const res = await oracle({ op: `cx_${op}`, variant, seed: SEED, n: 20 });
                const arg = (side: "x" | "y") => {
                    const z = res.inputs[side] as unknown as Cx1 | CxS;
                    return typeof z.re === "number" ? complex(z.re as number, z.im as number) : cxVec(z);
                };
                expect(L[op](arg("x"), arg("y"))).toEqual(res.expected);
            });
        }

        test(`${op} matrix`, async () => {
            const res = await oracle({ op: `cx_${op}`, variant: "VV", seed: SEED, shape: [4, 5] });
            expect(L[op](cxMat(res.inputs.x), cxMat(res.inputs.y))).toEqual(res.expected);
        });
    }
});
