import { norm2, norm1, norm2squared, normInf } from "./norm";
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