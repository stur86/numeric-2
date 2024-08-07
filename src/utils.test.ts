import Vector from "./vector";
import { test, expect } from "bun:test";
import { selectUnaryMethodName } from "./utils";

test("selectUnaryMethodName", () => {
    const v = new Vector([1, 2, 3]);
    expect(selectUnaryMethodName(v, "abs")).toBe("_re_v_abs");
    expect(selectUnaryMethodName(v, "exp")).toBe("_re_v_exp");
    // Try a complex vector
    const cv = new Vector([1, 2, 3], [4, 5, 6]);
    expect(selectUnaryMethodName(cv, "abs")).toBe("_cx_v_abs");
    // Now an unsupported type
    expect(() => selectUnaryMethodName("a" as any, "abs")).toThrow();
});