/**
 * Integration tests for complex Vector dispatch through UnaryMethod/BinaryMethod.
 *
 * These tests verify that creating a complex Vector (with _im) and calling
 * linalg functions correctly routes through the dispatchers to _cx_v_* kernels,
 * compared against NumPy.
 */
import { describe, test, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertScalarClose } from "./runner";
import Vector from "../src/vector";
import { UnaryMethod, BinaryMethod } from "../src/core/utils";

afterAll(() => killOracle());

const SIZES = [1, 5, 50, 200];
const SEEDS = [42, 123, 7];

// ── Complex unary dispatch (UnaryMethod) ──

describe("complex UnaryMethod dispatch", () => {
    const ops = ["neg", "conj", "abs", "clone"];

    for (const op of ops) {
        for (const n of SIZES) {
            for (const seed of SEEDS) {
                test(`${op} n=${n} seed=${seed}`, async () => {
                    const resp = await oracle({ op: `cx_${op}`, seed, n });
                    const input = resp.inputs.x as { re: number[]; im: number[] };
                    const expected = resp.expected as { re: number[]; im: number[] };

                    const v = new Vector(input.re, input.im);
                    const method = new UnaryMethod(v, op);
                    const result = method.invoke() as [number[], number[]];

                    assertClose(result[0], expected.re, 1e-10, `${op} dispatch re `);
                    assertClose(result[1], expected.im, 1e-10, `${op} dispatch im `);
                });
            }
        }
    }
});

// ── Complex reducer dispatch (UnaryMethod) ──

describe("complex reducer dispatch", () => {
    const ops = ["norm2", "norm2squared", "norm1"];

    for (const op of ops) {
        for (const n of SIZES) {
            for (const seed of SEEDS) {
                test(`${op} n=${n} seed=${seed}`, async () => {
                    const resp = await oracle({ op: `cx_${op}`, seed, n });
                    const input = resp.inputs.x as { re: number[]; im: number[] };
                    const expected = resp.expected as number;

                    const v = new Vector(input.re, input.im);
                    const method = new UnaryMethod(v, op);
                    const result = method.invoke() as number;

                    assertScalarClose(result, expected, 1e-10, `${op} dispatch `);
                });
            }
        }
    }
});

// ── Complex binary dispatch (BinaryMethod) ──

describe("complex BinaryMethod dispatch", () => {
    const ops = ["add", "sub", "mul", "div"];

    for (const op of ops) {
        // VV: two complex vectors
        for (const n of SIZES) {
            for (const seed of SEEDS) {
                test(`${op} VV n=${n} seed=${seed}`, async () => {
                    const resp = await oracle({ op: `cx_${op}`, variant: "VV", seed, n });
                    const xIn = resp.inputs.x as { re: number[]; im: number[] };
                    const yIn = resp.inputs.y as { re: number[]; im: number[] };
                    const expected = resp.expected as { re: number[]; im: number[] };

                    const vx = new Vector(xIn.re, xIn.im);
                    const vy = new Vector(yIn.re, yIn.im);
                    const method = new BinaryMethod(vx, vy, op);
                    const result = method.invoke() as [number[], number[]];

                    assertClose(result[0], expected.re, 1e-10, `${op} VV dispatch re `);
                    assertClose(result[1], expected.im, 1e-10, `${op} VV dispatch im `);
                });
            }
        }
    }
});
