import { describe, test, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D, assertScalarClose } from "./runner";
import { linalg } from "../index";

const SEED = 42;

afterAll(() => killOracle());

describe("linear algebra vs NumPy", () => {
    for (const n of [3, 5, 10, 20]) {
        test(`solve ${n}x${n}`, async () => {
            const res = await oracle({ op: "solve", seed: SEED + n, n });
            const A = res.inputs.A as number[][];
            const b = res.inputs.b as number[];
            const expected = res.expected as number[];

            const actual = linalg.solve(A, b);
            assertClose(actual, expected, 1e-8, `solve ${n}x${n}: `);
        });
    }

    for (const n of [3, 5, 10]) {
        test(`inv ${n}x${n}`, async () => {
            const res = await oracle({ op: "inv", seed: SEED + n, n });
            const A = res.inputs.A as number[][];
            const expected = res.expected as number[][];

            const actual = linalg.inv(A);
            assertClose2D(actual, expected, 1e-8, `inv ${n}x${n}: `);
        });
    }

    for (const n of [3, 5, 10]) {
        test(`det ${n}x${n}`, async () => {
            const res = await oracle({ op: "det", seed: SEED + n, n });
            const A = res.inputs.A as number[][];
            const expected = res.expected as number;

            const actual = linalg.det(A);
            assertScalarClose(actual, expected, 1e-8, `det ${n}x${n}: `);
        });
    }
});
