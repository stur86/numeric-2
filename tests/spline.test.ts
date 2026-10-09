/** Cubic splines vs scipy.interpolate.CubicSpline (same end conditions). */
import { describe, test, expect, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertClose2D } from "./runner";
import { interpolate, Vector, Matrix } from "../index";

afterAll(() => killOracle());

const BCS = ["natural", "periodic", "clamped", "mixed"] as const;
const boundary = (bc: typeof BCS[number], left: any, right: any): interpolate.SplineBoundary =>
    bc === "natural" || bc === "periodic" ? bc : { left, right: right ?? undefined };

describe("scalar splines vs SciPy", () => {
    for (const bc of BCS) {
        for (const n of [2, 3, 4, 7, 20, 200]) {
            if (bc === "periodic" && n < 3) continue;
            test(`${bc}, ${n} knots`, async () => {
                const res = await oracle({ op: "spline", seed: n * 7, n, bc });
                const inp = res.inputs as any, e = res.expected as any;
                const s = interpolate.spline(inp.x, inp.y, boundary(bc, inp.left, inp.right));
                assertClose(s.at(inp.ts as number[]).real as number[], e.at, 1e-10, "at ");
                const d1 = s.diff();
                assertClose(d1.at(inp.ts as number[]).real as number[], e.diff, 1e-9, "diff ");
                assertClose(d1.diff().at(inp.ts as number[]).real as number[], e.diff2, 1e-8, "diff2 ");
                const roots = s.roots();
                expect(roots.length).toBe(e.roots.length);
                assertClose(roots, e.roots, 1e-9, "roots ");
            });
        }
    }
});

describe("vector-valued splines vs SciPy", () => {
    for (const bc of BCS) {
        test(`${bc}, 3-D curve`, async () => {
            const res = await oracle({ op: "spline", seed: 5, n: 12, bc, dim: 3 });
            const inp = res.inputs as any, e = res.expected as any;
            const s = interpolate.spline(inp.x, new Matrix(inp.y), boundary(bc, inp.left, inp.right));
            expect(s.dim).toBe(3);
            assertClose2D(s.at(inp.ts as number[]).real as number[][], e.at, 1e-10, "at ");
            assertClose2D(s.diff().at(inp.ts as number[]).real as number[][], e.diff, 1e-9, "diff ");
            const p = s.at(inp.ts[7]);
            expect(p).toBeInstanceOf(Vector);
            assertClose(p.real as number[], e.at[7], 1e-10, "point ");
            expect(s.roots().length).toBe(3);
        });
    }
});

describe("spline basics", () => {
    test("interpolates the data and reproduces lines exactly", () => {
        const s = interpolate.spline([0, 1, 3, 4], [1, 3, 7, 9]); // y = 2x + 1
        for (const t of [-1, 0, 0.5, 2, 3.7, 5]) expect(s.at(t)).toBeCloseTo(2 * t + 1, 12);
        expect(s.roots()).toEqual([]);
    });

    test("periodic splines repeat outside the knots", () => {
        const x = [0, 1, 2.5, 4], y = [1, -1, 0.5, 1];
        const s = interpolate.spline(x, y, "periodic");
        expect(s.periodic).toBe(true);
        for (const t of [0.3, 1.7, 3.2]) {
            expect(s.at(t + 4)).toBeCloseTo(s.at(t), 12);
            expect(s.at(t - 8)).toBeCloseTo(s.at(t), 12);
        }
    });

    test("finds two roots inside one segment (numeric.js misses them)", () => {
        // On [0, 1] this crosses zero twice: values 1 → 1 with slopes -6 and 6
        const s = interpolate.spline([0, 1], [1, 1], { left: -6, right: 6 });
        const r = s.roots();
        expect(r.length).toBe(2);
        for (const t of r) expect(Math.abs(s.at(t))).toBeLessThan(1e-12);
    });

    test("validates its input", () => {
        expect(() => interpolate.spline([0], [1])).toThrow("at least 2");
        expect(() => interpolate.spline([0, 2, 1], [1, 2, 3])).toThrow("strictly increasing");
        expect(() => interpolate.spline([0, 1], [1, 2, 3])).toThrow("values");
    });
});
