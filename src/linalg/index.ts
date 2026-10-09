import { norm2, norm1, norm2squared, normInf } from "./norm";
import type { Operand, ArithResult, CompareResult, LogicalOperand, LogicalResult } from "./arithmetic";
import type { DotOperand } from "./dot";
import { add, sub, mul, div, mod, pow, atan2, max, min, eq, neq, lt, gt, leq, geq, and, or, band, bor, bxor, lshift, rshift, rrshift, trunc } from "./arithmetic";
import { dot, dotVV, dotMV, dotVM, dotMMsmall, dotMMbig } from "./dot";

export { norm2, norm1, norm2squared, normInf };
export { add, sub, mul, div, mod, pow, atan2, max, min, eq, neq, lt, gt, leq, geq, and, or, band, bor, bxor, lshift, rshift, rrshift, trunc };
export { dot, dotVV, dotMV, dotVM, dotMMsmall, dotMMbig };

import { LU, LUsolve, solve } from "./lu";
import type { LUPResult } from "./lu";
import { inv } from "./inv";
import { det } from "./det";

export { LU, LUsolve, solve, inv, det };
export type { LUPResult };

import { house, toUpperHessenberg, QRFrancis, epsilon } from "./house";
import type { HessenbergResult, QRFrancisResult } from "./house";
import { eig } from "./eig";
import type { EigResult } from "./eig";

export { house, toUpperHessenberg, QRFrancis, epsilon, eig };
export type { HessenbergResult, QRFrancisResult, EigResult };

export type { MatrixLike, VectorLike } from "./wrap";
export type { Operand, ArithResult, CompareResult, LogicalOperand, LogicalResult, DotOperand };
export type { TensorLike, TensorOf } from "./wrap";
export type { BoolOf } from "./elementwise";

import { sqrt, exp, log, sin, cos, tan, asin, acos, atan, neg, ceil, floor, round, conj, abs, isNaN, isFinite, reciprocal, not, bnot } from "./elementwise";
import { sum, prod, sup, inf, any, all } from "./reduce";

export { sqrt, exp, log, sin, cos, tan, asin, acos, atan, neg, ceil, floor, round, conj, abs, isNaN, isFinite, reciprocal, not, bnot };
export { sum, prod, sup, inf, any, all };

import { svd } from "./svd";
import type { SVDResult } from "./svd";

export { svd };
export type { SVDResult };

import { fft, ifft } from "./fft";

export { fft, ifft };

export {
    iadd, isub, imul, idiv, imod, ipow, iatan2, imax, imin, iband, ibor, ibxor, ilshift, irshift, irrshift, itrunc,
    isqrt, iabs, iexp, ilog, isin, icos, itan, iasin, iacos, iatan, ineg, iceil, ifloor, iround, iconj, ireciprocal, ibnot,
} from "./inplace";
export type { InPlaceTarget } from "./inplace";
