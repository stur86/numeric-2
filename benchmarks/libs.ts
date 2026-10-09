/**
 * The comparison libraries, shared by the CLI runner and the browser page.
 * numeric.js is loaded separately (npm on the server, jsDelivr in the browser),
 * since it generates code with `new Function` at load time.
 */
import * as mathjs from "mathjs";
import ddot from "@stdlib/blas-base-ddot";
import daxpy from "@stdlib/blas-base-daxpy";
import dscal from "@stdlib/blas-base-dscal";
import dnrm2 from "@stdlib/blas-base-dnrm2";
import idamax from "@stdlib/blas-base-idamax";
import dgemv from "@stdlib/blas-base-dgemv";
import dgemm from "@stdlib/blas-base-dgemm";
import dsum from "@stdlib/blas-ext-base-dsum";
import dsqrt from "@stdlib/math-strided-special-dsqrt";
import * as numeric2 from "../index";
import type { Stdlib, LibName } from "./suites";

export { mathjs, numeric2 };

export const stdlib: Stdlib = { ddot, daxpy, dscal, dnrm2, idamax, dgemv, dgemm, dsum, dsqrt };

/** Versions of the comparison libraries (numeric.js is always 1.2.6). */
export const VERSIONS: Partial<Record<LibName, string>> = {
    numeric: "1.2.6",
    mathjs: mathjs.version,
    stdlib: "@stdlib/blas-base-* 0.4.1",
};
