import { expect, test } from "bun:test";
import { version } from "../index";
import pkg from "../package.json";

test("version matches package.json", () => {
    expect(version).toBe(pkg.version);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
});
