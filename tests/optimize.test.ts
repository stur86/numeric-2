/**
 * Optimization vs SciPy (linprog / SLSQP) and known minimizers.
 */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertScalarClose } from "./runner";
import { optimize, Vector } from "../index";

afterAll(() => killOracle());

const quad = (x: number[]) => x.reduce((s, v, i) => s + (i + 1) * (v - 1) ** 2, 0);

describe("gradient", () => {
    test("matches analytic gradients", () => {
        const f = (x: number[]) => Math.sin(x[0]) * Math.exp(x[1]) + x[0] * x[1] ** 2;
        const x = [0.7, -0.3];
        const g = optimize.gradient(f, x);
        expect(g).toBeInstanceOf(Vector);
        assertClose(g.real as number[], [Math.cos(0.7) * Math.exp(-0.3) + 0.09, Math.sin(0.7) * Math.exp(-0.3) + 2 * 0.7 * -0.3], 1e-7);
    });

    test("works in many dimensions (numeric.js fails above 20)", () => {
        const x = new Array(60).fill(0).map((_, i) => i / 60);
        const g = optimize.gradient(quad, x).real as number[];
        assertClose(g, x.map((v, i) => 2 * (i + 1) * (v - 1)), 1e-6);
    });

    test("throws when f(x) is NaN", () => {
        expect(() => optimize.gradient(() => NaN, [1])).toThrow("NaN");
    });
});

describe("uncmin", () => {
    test("Rosenbrock", () => {
        const rosen = (x: number[]) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2;
        const r = optimize.uncmin(rosen, [-1.2, 1]);
        assertClose(r.solution.real as number[], [1, 1], 1e-6);
        expect(r.f).toBeLessThan(1e-12);
        expect(r.message).toBe("Newton step smaller than tol");
    });

    for (const n of [5, 25, 50]) {
        test(`${n}-dimensional quadratic`, () => {
            const r = optimize.uncmin(quad, new Array(n).fill(0));
            assertClose(r.solution.real as number[], new Array(n).fill(1), 1e-6);
        });
    }

    test("analytic gradient and inverse-Hessian estimate", () => {
        const f = (x: number[]) => (x[0] - 3) ** 2 + 4 * (x[1] + 1) ** 2;
        const r = optimize.uncmin(f, new Vector([0, 0]), { gradient: (x) => [2 * (x[0] - 3), 8 * (x[1] + 1)] });
        assertClose(r.solution.real as number[], [3, -1], 1e-8);
        // The BFGS inverse Hessian approaches diag(1/2, 1/8)
        assertClose((r.invHessian.real as number[][]).flat(), [0.5, 0, 0, 0.125], 1e-3);
    });

    test("callback can stop the iteration", () => {
        let calls = 0;
        const r = optimize.uncmin(quad, [0, 0, 0], { callback: () => ++calls >= 2 });
        expect(r.message).toBe("Callback returned true");
        expect(calls).toBe(2);
    });

    test("throws when f(x0) is NaN", () => {
        expect(() => optimize.uncmin(() => NaN, [0])).toThrow("NaN");
    });
});

describe("solveLP vs scipy.optimize.linprog", () => {
    const cases: [number, number, number][] = [[2, 3, 0], [3, 6, 0], [5, 8, 0], [10, 20, 0], [4, 6, 1], [6, 10, 2], [12, 15, 3]];
    for (const [n, m, meq] of cases) {
        for (const seed of [1, 2, 3]) {
            test(`n=${n} m=${m} meq=${meq} seed=${seed}`, async () => {
                const res = await oracle({ op: "lp", seed: seed * 100 + n, n, m, meq });
                const inp = res.inputs as any, exp = res.expected as any;
                const opts = meq ? { Aeq: inp.Aeq, beq: inp.beq } : {};
                const r = optimize.solveLP(inp.c, inp.A, inp.b, opts);
                expect(r.message).toBe("");
                const x = r.solution!.real as number[];
                const fun = x.reduce((s, v, i) => s + v * inp.c[i], 0);
                assertScalarClose(fun, exp.fun, 1e-7, "objective ");
                assertClose(x, exp.x, 1e-5, "x ");
            });
        }
    }

    test("infeasible and unbounded problems", () => {
        const inf = optimize.solveLP([1], [[1], [-1]], [-1, -1]); // x <= -1 and x >= 1
        expect(inf.message).toBe("Infeasible");
        expect(inf.solution).toBeNull();
        const unb = optimize.solveLP([-1, 0], [[-1, 0], [0, 1], [0, -1]], [0, 1, 1]); // maximize x with x >= 0
        expect(unb.message).toBe("Unbounded");
    });
});

describe("solveQP vs scipy SLSQP", () => {
    // Seeds 42, 67 and 105 are problems where numeric.js's quadprog port returns an
    // infeasible (42) or suboptimal (67, 105) point.
    const seeds = [42, 67, 105, ...Array.from({ length: 27 }, (_, i) => i + 1)];
    for (const seed of seeds) {
        const n = 3 + (seed % 6), q = 2 + (seed % 9), meq = seed % 3 === 0 ? 1 : 0;
        test(`seed=${seed} n=${n} q=${q} meq=${meq}`, async () => {
            const res = await oracle({ op: "qp", seed, n, q, meq });
            const { D, d, A, b } = res.inputs as any, exp = res.expected as any;
            const r = optimize.solveQP(D, d, A, b, { meq });
            expect(r.message).toBe("");
            assertScalarClose(r.value, exp.fun, 1e-8, "objective ");
            assertClose(r.solution.real as number[], exp.x, 1e-6, "x ");
            // Feasibility
            const x = r.solution.real as number[];
            for (let j = 0; j < b.length; j++) {
                const ax = A.reduce((s: number, row: number[], i: number) => s + row[j] * x[i], 0);
                if (j < meq) expect(Math.abs(ax - b[j])).toBeLessThan(1e-9);
                else expect(ax - b[j]).toBeGreaterThan(-1e-9);
            }
        });
    }

    test("textbook example (R quadprog docs)", () => {
        const r = optimize.solveQP([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 5, 0], [[-4, 2, 0], [-3, 1, -2], [0, 0, 1]], [-8, 2, 0]);
        assertClose(r.solution.real as number[], [0.4761904761904762, 1.0476190476190477, 2.0952380952380953], 1e-12);
        assertClose(r.unconstrainedSolution.real as number[], [0, 5, 0], 1e-12);
        expect(r.active.sort()).toEqual([1, 2]);
    });

    test("reports a non positive definite D and inconsistent constraints", () => {
        expect(optimize.solveQP([[1, 0], [0, -1]], [0, 0], [[1], [0]], [0]).message).toContain("not positive definite");
        // x >= 1 and -x >= 0 (x <= 0) cannot both hold
        expect(optimize.solveQP([[1]], [0], [[1, -1]], [1, 0]).message).toContain("inconsistent");
    });
});
