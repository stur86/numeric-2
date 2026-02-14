/**
 * Cross-validation tests for complex vector operations against NumPy.
 */
import { describe, test, afterAll } from "bun:test";
import { oracle, killOracle, assertClose, assertScalarClose } from "./runner";
import {
    _cx_v_neg, _cx_v_conj, _cx_v_abs, _cx_v_clone,
} from "../src/core/cx.maps";
import {
    _cx_v_addVV, _cx_v_addVS, _cx_v_addSV,
    _cx_v_subVV, _cx_v_subVS, _cx_v_subSV,
    _cx_v_mulVV, _cx_v_mulVS, _cx_v_mulSV,
    _cx_v_divVV, _cx_v_divVS, _cx_v_divSV,
} from "../src/core/cx.binops";
import {
    _cx_v_norm2, _cx_v_norm2squared, _cx_v_norm1,
} from "../src/core/cx.reducers";

afterAll(() => killOracle());

const SIZES = [1, 5, 50, 200];
const SEEDS = [42, 123, 7];

// ── Complex Unary Maps ──

describe("complex unary maps", () => {
    const ops: { name: string; tsOp: string; fn: (re: number[], im: number[], n: number) => [number[], number[]] }[] = [
        { name: "cx_neg", tsOp: "neg", fn: _cx_v_neg },
        { name: "cx_conj", tsOp: "conj", fn: _cx_v_conj },
        { name: "cx_abs", tsOp: "abs", fn: _cx_v_abs },
        { name: "cx_clone", tsOp: "clone", fn: _cx_v_clone },
    ];

    for (const { name, tsOp, fn } of ops) {
        for (const n of SIZES) {
            for (const seed of SEEDS) {
                test(`${tsOp} n=${n} seed=${seed}`, async () => {
                    const resp = await oracle({ op: name, seed, n });
                    const input = resp.inputs.x as { re: number[]; im: number[] };
                    const expected = resp.expected as { re: number[]; im: number[] };

                    const [resRe, resIm] = fn(input.re, input.im, n);
                    assertClose(resRe, expected.re, 1e-10, `${tsOp} re `);
                    assertClose(resIm, expected.im, 1e-10, `${tsOp} im `);
                });
            }
        }
    }
});

// ── Complex Binary Ops ──

describe("complex binary ops", () => {
    const ops: {
        name: string;
        tsOp: string;
        fnVV: (xr: number[], xi: number[], yr: number[], yi: number[], n: number) => [number[], number[]];
        fnVS: (xr: number[], xi: number[], yr: number, yi: number, n: number) => [number[], number[]];
        fnSV: (xr: number, xi: number, yr: number[], yi: number[], n: number) => [number[], number[]];
    }[] = [
        { name: "cx_add", tsOp: "add", fnVV: _cx_v_addVV, fnVS: _cx_v_addVS, fnSV: _cx_v_addSV },
        { name: "cx_sub", tsOp: "sub", fnVV: _cx_v_subVV, fnVS: _cx_v_subVS, fnSV: _cx_v_subSV },
        { name: "cx_mul", tsOp: "mul", fnVV: _cx_v_mulVV, fnVS: _cx_v_mulVS, fnSV: _cx_v_mulSV },
        { name: "cx_div", tsOp: "div", fnVV: _cx_v_divVV, fnVS: _cx_v_divVS, fnSV: _cx_v_divSV },
    ];

    for (const { name, tsOp, fnVV, fnVS, fnSV } of ops) {
        for (const variant of ["VV", "VS", "SV"] as const) {
            for (const n of SIZES) {
                for (const seed of SEEDS) {
                    test(`${tsOp} ${variant} n=${n} seed=${seed}`, async () => {
                        const resp = await oracle({ op: name, variant, seed, n });
                        const expected = resp.expected as { re: number[]; im: number[] };
                        let resRe: number[], resIm: number[];

                        if (variant === "VV") {
                            const x = resp.inputs.x as { re: number[]; im: number[] };
                            const y = resp.inputs.y as { re: number[]; im: number[] };
                            [resRe, resIm] = fnVV(x.re, x.im, y.re, y.im, n);
                        } else if (variant === "VS") {
                            const x = resp.inputs.x as { re: number[]; im: number[] };
                            const y = resp.inputs.y as { re: number; im: number };
                            [resRe, resIm] = fnVS(x.re, x.im, y.re, y.im, n);
                        } else {
                            const x = resp.inputs.x as { re: number; im: number };
                            const y = resp.inputs.y as { re: number[]; im: number[] };
                            [resRe, resIm] = fnSV(x.re, x.im, y.re, y.im, n);
                        }

                        assertClose(resRe, expected.re, 1e-10, `${tsOp} ${variant} re `);
                        assertClose(resIm, expected.im, 1e-10, `${tsOp} ${variant} im `);
                    });
                }
            }
        }
    }
});

// ── Complex Reducers ──

describe("complex reducers", () => {
    const ops: { name: string; tsOp: string; fn: (re: number[], im: number[], n: number) => number }[] = [
        { name: "cx_norm2", tsOp: "norm2", fn: _cx_v_norm2 },
        { name: "cx_norm2squared", tsOp: "norm2squared", fn: _cx_v_norm2squared },
        { name: "cx_norm1", tsOp: "norm1", fn: _cx_v_norm1 },
    ];

    for (const { name, tsOp, fn } of ops) {
        for (const n of SIZES) {
            for (const seed of SEEDS) {
                test(`${tsOp} n=${n} seed=${seed}`, async () => {
                    const resp = await oracle({ op: name, seed, n });
                    const input = resp.inputs.x as { re: number[]; im: number[] };
                    const expected = resp.expected as number;

                    const result = fn(input.re, input.im, n);
                    assertScalarClose(result, expected, 1e-10, `${tsOp} `);
                });
            }
        }
    }
});
