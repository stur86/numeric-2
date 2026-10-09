/** dopri vs analytic solutions and scipy's DOP853 (tol 1e-13). */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D } from "./runner";
import { ode, Vector, Matrix } from "../index";

afterAll(() => killOracle());

describe("dopri vs analytic solutions", () => {
    test("scalar exponential decay, dense output", () => {
        const s = ode.dopri(0, 3, 2, (x, y) => -1.5 * y, { tol: 1e-10 });
        expect(s.message).toBe("");
        const ts = Array.from({ length: 31 }, (_, i) => i * 0.1);
        assertClose(s.at(ts).real as number[], ts.map((t) => 2 * Math.exp(-1.5 * t)), 1e-8);
        expect(typeof s.at(1.234)).toBe("number");
        expect(s.x).toBeInstanceOf(Vector);
        expect(s.y).toBeInstanceOf(Vector);
        expect((s.x.real as number[]).at(-1)).toBeCloseTo(3, 12);
    });

    test("harmonic oscillator, system", () => {
        const s = ode.dopri(0, 20, [1, 0], (x, y) => [y[1], -y[0]], { tol: 1e-11, maxit: 5000 });
        expect(s.message).toBe("");
        const ts = [0.5, 3.3, 7.77, 12, 19.9];
        assertClose2D(s.at(ts).real as number[][], ts.map((t) => [Math.cos(t), -Math.sin(t)]), 1e-8);
        expect(s.at(2)).toBeInstanceOf(Vector);
        expect(s.y).toBeInstanceOf(Matrix);
    });

    test("time-dependent right-hand side", () => {
        // y' = cos(x), y(0) = 0 → y = sin(x)
        const s = ode.dopri(0, 6, 0, (x) => Math.cos(x), { tol: 1e-12 });
        for (const t of [1, 2.5, 5.9]) expect(s.at(t)).toBeCloseTo(Math.sin(t), 9);
    });
});

describe("dopri vs scipy DOP853", () => {
    for (const problem of ["lotka_volterra", "van_der_pol", "pendulum"] as const) {
        test(problem, async () => {
            const res = await oracle({ op: "ode", seed: 0, problem });
            const inp = res.inputs as any;
            const fs = {
                lotka_volterra: (t: number, y: number[]) => [1.5 * y[0] - y[0] * y[1], -3 * y[1] + y[0] * y[1]],
                van_der_pol: (t: number, y: number[]) => [y[1], (1 - y[0] ** 2) * y[1] - y[0]],
                pendulum: (t: number, y: number[]) => [y[1], -Math.sin(y[0])],
            };
            const s = ode.dopri(0, inp.x1, inp.y0, fs[problem], { tol: 1e-11, maxit: 20000 });
            expect(s.message).toBe("");
            assertClose2D(s.at(inp.ts as number[]).real as number[][], res.expected as number[][], 1e-7, `${problem} `);
        });
    }
});

describe("dopri events and limits", () => {
    test("stops at the event (falling ball hits the ground)", () => {
        const s = ode.dopri(0, 10, [10, 0], (t, y) => [y[1], -9.81], { event: (t, y) => -y[0] });
        expect(s.events).toEqual([true]);
        expect((s.x.real as number[]).at(-1)).toBeCloseTo(Math.sqrt(20 / 9.81), 12);
        expect((s.at(1).real as number[])[0]).toBeCloseTo(10 - 9.81 / 2, 10);
    });

    test("detects an event that lands exactly on zero", () => {
        // y = x hits y - 2 = 0 exactly at a step end
        const s = ode.dopri(0, 4, 0, () => 1, { event: (x, y) => y - 2 });
        expect(s.events).toEqual([true]);
        expect((s.x.real as number[]).at(-1)).toBeCloseTo(2, 12);
    });

    test("reports which of several events fired", () => {
        // y = x: the second event (y - 2) crosses first, the first (y - 5) never does
        const s = ode.dopri(0, 4, 0, () => 1, { event: (x, y) => [y - 5, y - 2] });
        expect(s.events).toEqual([false, true]);
        expect((s.x.real as number[]).at(-1)).toBeCloseTo(2, 12);
    });

    test("maxit and the step-size floor are reported", () => {
        expect(ode.dopri(0, 1, 1, (x, y) => -1e7 * y, { maxit: 30 }).message).toBe("maximum iteration count exceeded");
        // A right-hand side that turns into NaN can never meet the tolerance
        const s = ode.dopri(0, 1, 0, (x) => (x > 0.5 ? NaN : 1), { maxit: 100000 });
        expect(s.message).toBe("Step size became too small");
        expect((s.x.real as number[]).at(-1)).toBeLessThanOrEqual(0.5);
    });
});
