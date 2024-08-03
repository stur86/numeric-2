import { test, expect } from "bun:test";
import NumericCore from "./core";

test("CoreBasics", () => {
  expect(NumericCore.getElement("_something")).toBe(5);
  NumericCore.changeSomething(10);
  expect(NumericCore.getElement("_something")).toBe(10);
});
