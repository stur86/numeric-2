import { describe, test, afterAll } from "bun:test";
import { oracle, killOracle, assertClose } from "./runner";
import { Vector, linalg } from "../index";

const SEED = 42;
const N = 100;

const BINARY_OPS = ["add", "sub", "mul", "div", "mod", "pow"] as const;
const VARIANTS = ["VV", "VS", "SV"] as const;

afterAll(() => killOracle());

describe("binary ops vs NumPy", () => {
    for (const op of BINARY_OPS) {
        for (const variant of VARIANTS) {
            test(`${op} ${variant}`, async () => {
                const res = await oracle({ op, variant, seed: SEED, n: N });
                const expected = res.expected as number[];

                let actual: number[];
                const { x, y } = res.inputs;

                if (variant === "VV") {
                    actual = (linalg as any)[op](new Vector(x as number[]), new Vector(y as number[]));
                } else if (variant === "VS") {
                    actual = (linalg as any)[op](new Vector(x as number[]), y as number);
                } else {
                    // SV
                    actual = (linalg as any)[op](x as number, new Vector(y as number[]));
                }

                // Use looser tolerance for mod/pow which can amplify errors
                const tol = (op === "mod" || op === "pow") ? 1e-8 : 1e-10;
                assertClose(actual, expected, tol, `${op} ${variant}: `);
            });
        }
    }
});
