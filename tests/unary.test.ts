import { describe, test, afterAll } from "bun:test";
import { oracle, killOracle, assertClose } from "./runner";
import { Vector, linalg } from "../index";

const SEED = 42;
const N = 100;

const UNARY_OPS = [
    "sqrt", "abs", "exp", "log", "sin", "cos", "tan",
    "asin", "acos", "atan", "neg", "ceil", "floor", "round",
] as const;

afterAll(() => killOracle());

describe("unary maps vs NumPy", () => {
    for (const op of UNARY_OPS) {
        test(op, async () => {
            const res = await oracle({ op, seed: SEED, n: N });
            const x = res.inputs.x as number[];
            const expected = res.expected as number[];

            // Use the core function directly via Vector + UnaryMethod
            const v = new Vector(x);
            const { UnaryMethod } = await import("../src/core/utils");
            const actual = new UnaryMethod(v, op).invoke() as number[];

            assertClose(actual, expected, 1e-10, `${op}: `);
        });
    }
});
