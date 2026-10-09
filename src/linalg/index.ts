import { norm2, norm1, norm2squared, normInf } from "./norm";
import type { Operand, ArithResult, CompareResult } from "./arithmetic";
import type { DotOperand } from "./dot";
import { add, sub, mul, div, mod, pow, atan2, max, min, eq, neq, lt, gt, leq, geq } from "./arithmetic";
import { dot, dotVV, dotMV, dotVM, dotMMsmall, dotMMbig } from "./dot";

export { norm2, norm1, norm2squared, normInf };
export { add, sub, mul, div, mod, pow, atan2, max, min, eq, neq, lt, gt, leq, geq };
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
export type { Operand, ArithResult, CompareResult, DotOperand };
export type { TensorLike, TensorOf } from "./wrap";
export type { BoolOf } from "./elementwise";

import { sqrt, exp, log, sin, cos, tan, asin, acos, atan, neg, ceil, floor, round, conj, abs, isNaN, isFinite } from "./elementwise";
import { sum, prod, sup, inf, any, all } from "./reduce";

export { sqrt, exp, log, sin, cos, tan, asin, acos, atan, neg, ceil, floor, round, conj, abs, isNaN, isFinite };
export { sum, prod, sup, inf, any, all };
