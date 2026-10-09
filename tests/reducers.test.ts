import { describe, test, afterAll } from "bun:test";
import { oracle, killOracle, assertScalarClose } from "./runner";
import { Vector, linalg } from "../index";

const SEED = 42;
const N = 100;

const REDUCERS_VIA_CORE = ["sum", "prod", "max", "min"] as const;
const NORM_OPS = ["norm1", "norm2", "norm2squared", "normInf"] as const;

afterAll(() => killOracle());

describe("reducers vs NumPy", () => {
    for (const op of REDUCERS_VIA_CORE) {
        test(op, async () => {
            const res = await oracle({ op, seed: SEED, n: N });
            const x = res.inputs.x as number[];
            const expected = res.expected as number;

            const v = new Vector(x);
            const { UnaryMethod } = await import("../src/core/utils");
            const actual = new UnaryMethod(v, op).invoke() as number;

            // prod can have large magnitudes, use relative tolerance
            const tol = op === "prod" ? 1e-6 : 1e-10;
            assertScalarClose(actual, expected, tol, `${op}: `);
        });
    }

    for (const op of NORM_OPS) {
        test(op, async () => {
            const res = await oracle({ op, seed: SEED, n: N });
            const x = res.inputs.x as number[];
            const expected = res.expected as number;

            const v = new Vector(x);
            const actual = (linalg as any)[op](v) as number;

            assertScalarClose(actual, expected, 1e-10, `${op}: `);
        });
    }
});
