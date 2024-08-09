import Vector from "./vector";
import { test, expect } from "bun:test";
import { UnaryMethod } from "./utils";

test("selectUnaryMethodName", () => {
    const v = new Vector([1, 2, 3]);
    const um = new UnaryMethod(v, "abs");
    expect(um.full_name).toBe("_re_v_abs");
    expect(um.name).toBe("abs");
    expect(um.dtype).toBe("re");
    expect(um.optype).toBe("v");
    expect(um.args).toEqual([v.real, 3]);
    // Try a complex vector
    const cv = new Vector([1, 2, 3], [4, 5, 6]);
    const cxum = new UnaryMethod(cv, "abs");
    expect(cxum.full_name).toBe("_cx_v_abs");
    expect(cxum.name).toBe("abs");
    expect(cxum.dtype).toBe("cx");
    expect(cxum.optype).toBe("v");
    // Now an unsupported type
    expect(() => (new UnaryMethod("a" as any, "abs"))).toThrow();
});