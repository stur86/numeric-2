/** convolve vs np.convolve (all modes; direct and FFT paths; real and complex). */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose } from "./runner";
import { linalg, Vector } from "../index";

afterAll(() => killOracle());

type Cx = { re: number[]; im: number[] };

describe("convolve vs NumPy", () => {
    // Small sizes take the direct path; (1000, 300) and (5000, 4000) take the FFT path
    const sizes: [number, number][] = [[1, 1], [1, 5], [5, 1], [4, 4], [7, 3], [3, 7], [10, 6], [6, 10], [64, 31], [1000, 300], [300, 1000], [5000, 4000]];
    for (const complex of [false, true]) {
        for (const [n, m] of sizes) {
            test(`${complex ? "complex" : "real"} n=${n} m=${m}`, async () => {
                const res = await oracle({ op: "convolve", seed: n * 7 + m, n, m, complex });
                const i = res.inputs as any, e = res.expected as any;
                const a = complex ? new Vector(i.a.re, i.a.im) : new Vector(i.a.re);
                const v = complex ? new Vector(i.v.re, i.v.im) : new Vector(i.v.re);
                for (const mode of ["full", "same", "valid"] as const) {
                    const out = linalg.convolve(a, v, mode);
                    const exp = e[mode] as Cx;
                    expect(out.is_complex).toBe(complex);
                    const tol = 1e-11 * Math.sqrt(Math.max(n, m));
                    assertClose(out.real as number[], exp.re, tol, `${mode} re `);
                    if (complex) assertClose(out.imag as number[], exp.im, tol, `${mode} im `);
                }
            });
        }
    }

    test("raw arrays, defaults and errors", () => {
        expect(linalg.convolve([1, 2, 3], [0, 1, 0.5]).real).toEqual([0, 1, 2.5, 4, 1.5]);
        expect(() => linalg.convolve([1], [1], "middle" as any)).toThrow("unknown mode");
    });
});
