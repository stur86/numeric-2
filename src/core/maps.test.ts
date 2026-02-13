import { test, expect } from "bun:test";
import {
    _re_v_neg,
    _re_v_ceil,
    _re_v_floor,
    _re_v_round,
    _re_v_isNaN,
    _re_v_isFinite,
    _re_v_clone,
    _re_v_sqrt,
    _re_v_abs,
} from "./maps";

test("neg", () => {
    expect(_re_v_neg([1, -2, 3, 0], 4)).toEqual([-1, 2, -3, -0]);
});

test("ceil", () => {
    expect(_re_v_ceil([1.2, 2.8, -1.5, 3.0], 4)).toEqual([2, 3, -1, 3]);
});

test("floor", () => {
    expect(_re_v_floor([1.2, 2.8, -1.5, 3.0], 4)).toEqual([1, 2, -2, 3]);
});

test("round", () => {
    expect(_re_v_round([1.2, 2.8, -1.5, 2.5], 4)).toEqual([1, 3, -1, 3]);
});

test("isNaN", () => {
    expect(_re_v_isNaN([1, NaN, 3, NaN], 4)).toEqual([false, true, false, true]);
});

test("isFinite", () => {
    expect(_re_v_isFinite([1, Infinity, 3, -Infinity], 4)).toEqual([true, false, true, false]);
    expect(_re_v_isFinite([NaN, 0], 2)).toEqual([false, true]);
});

test("clone", () => {
    const original = [1, 2, 3];
    const cloned = _re_v_clone(original, 3);
    expect(cloned).toEqual([1, 2, 3]);
    // Verify it's a new array
    cloned[0] = 99;
    expect(original[0]).toBe(1);
});

test("sqrt", () => {
    expect(_re_v_sqrt([4, 9, 16], 3)).toEqual([2, 3, 4]);
});

test("abs", () => {
    expect(_re_v_abs([-1, 2, -3, 0], 4)).toEqual([1, 2, 3, 0]);
});