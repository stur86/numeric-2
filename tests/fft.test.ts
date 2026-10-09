/** fft / ifft vs NumPy, for power-of-two and arbitrary lengths. */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose } from "./runner";
import { Vector, linalg } from "../index";

afterAll(() => killOracle());

type Cx = { re: number[]; im: number[] };
const SIZES = [1, 2, 3, 4, 5, 7, 8, 12, 16, 17, 31, 64, 100, 127, 128, 1000, 1024, 4096, 6007];

describe("fft vs NumPy", () => {
    for (const op of ["fft", "ifft"] as const) {
        for (const real of [false, true]) {
            for (const n of SIZES) {
                test(`${op} n=${n} ${real ? "real" : "complex"} input`, async () => {
                    const res = await oracle({ op, seed: n, n, real });
                    const x = res.inputs.x as unknown as Cx, e = res.expected as unknown as Cx;
                    const input = real ? new Vector(x.re) : new Vector(x.re, x.im);
                    const out = linalg[op](input);
                    // Errors grow like log(n) relative to the signal's overall size
                    const tol = 1e-12 * Math.max(1, Math.log2(n)) * (op === "fft" ? Math.sqrt(n) : 1);
                    assertClose(out.real as number[], e.re, tol, `${op} re `);
                    assertClose(out.imag as number[], e.im, tol, `${op} im `);
                });
            }
        }
    }
});

describe("fft round trips", () => {
    for (const n of [1, 6, 64, 97, 1000]) {
        test(`ifft(fft(x)) = x, n=${n}`, () => {
            const re = Array.from({ length: n }, (_, i) => Math.sin(i * 0.37) + 0.1 * i);
            const im = Array.from({ length: n }, (_, i) => Math.cos(i * 1.3));
            const back = linalg.ifft(linalg.fft(new Vector(re, im)));
            assertClose(back.real as number[], re, 1e-12 * n, "re ");
            assertClose(back.imag as number[], im, 1e-12 * n, "im ");
        });
    }

    test("raw arrays and output types", () => {
        const X = linalg.fft([1, 0, 0, 0]);
        expect(X).toBeInstanceOf(Vector);
        expect(X.is_complex).toBe(true);
        expect(X.real).toEqual([1, 1, 1, 1]);
        expect(X.imag).toEqual([0, 0, 0, 0]);
        expect(() => linalg.fft([])).toThrow();
    });
});
