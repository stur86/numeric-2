import { describe, test, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D, assertScalarClose } from "./runner";
import { linalg } from "../index";

const SEED = 42;

afterAll(() => killOracle());

describe("dot products vs NumPy", () => {
    test("dotVV", async () => {
        const res = await oracle({ op: "dot", variant: "VV", seed: SEED, n: 50 });
        const x = res.inputs.x as number[];
        const y = res.inputs.y as number[];
        const expected = res.expected as number;

        const actual = linalg.dotVV(x, y);
        assertScalarClose(actual, expected, 1e-10, "dotVV: ");
    });

    test("dotMV", async () => {
        const res = await oracle({ op: "dot", variant: "MV", seed: SEED, m: 10, n: 8 });
        const A = res.inputs.A as number[][];
        const v = res.inputs.v as number[];
        const expected = res.expected as number[];

        const actual = linalg.dotMV(A, v);
        assertClose(actual, expected, 1e-10, "dotMV: ");
    });

    test("dotVM", async () => {
        const res = await oracle({ op: "dot", variant: "VM", seed: SEED, m: 8, n: 10 });
        const v = res.inputs.v as number[];
        const A = res.inputs.A as number[][];
        const expected = res.expected as number[];

        const actual = linalg.dotVM(v, A);
        assertClose(actual, expected, 1e-10, "dotVM: ");
    });

    test("dotMM small", async () => {
        const res = await oracle({ op: "dot", variant: "MM", seed: SEED, m: 4, n: 5, p: 3 });
        const A = res.inputs.A as number[][];
        const B = res.inputs.B as number[][];
        const expected = res.expected as number[][];

        const actual = linalg.dotMMsmall(A, B);
        assertClose2D(actual, expected, 1e-10, "dotMMsmall: ");
    });

    test("dotMM big", async () => {
        const res = await oracle({ op: "dot", variant: "MM", seed: SEED + 1, m: 20, n: 15, p: 18 });
        const A = res.inputs.A as number[][];
        const B = res.inputs.B as number[][];
        const expected = res.expected as number[][];

        const actual = linalg.dotMMbig(A, B);
        assertClose2D(actual, expected, 1e-10, "dotMMbig: ");
    });

    test("dot dispatcher MM", async () => {
        const res = await oracle({ op: "dot", variant: "MM", seed: SEED + 2, m: 12, n: 12, p: 12 });
        const A = res.inputs.A as number[][];
        const B = res.inputs.B as number[][];
        const expected = res.expected as number[][];

        const actual = linalg.dot(A, B) as number[][];
        assertClose2D(actual, expected, 1e-10, "dot MM: ");
    });
});
