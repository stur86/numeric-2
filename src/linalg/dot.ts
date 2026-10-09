import { dotVV, dotMV, dotVM, dotMMsmall, dotMMbig } from "../core/dot";
import { dim } from "../utils";
import { type MatrixLike, type VectorLike, toRaw } from "./wrap";

/**
 * General dot product / matrix multiplication.
 *
 * Dispatches based on the dimensionality of the inputs:
 * - 1D × 1D → scalar (vector dot product)
 * - 2D × 1D → 1D (matrix-vector product)
 * - 1D × 2D → 1D (row-vector × matrix)
 * - 2D × 2D → 2D (matrix multiplication)
 * - scalar × any / any × scalar → element-wise scaling
 *
 * @param x     A scalar, vector, or matrix (real only).
 * @param y     A scalar, vector, or matrix (real only).
 * @returns     The dot product result.
 */
export function dot(a: number | VectorLike | MatrixLike, b: number | VectorLike | MatrixLike): any {
    const x: any = toRaw(a, "dot");
    const y: any = toRaw(b, "dot");
    const dx = dim(x);
    const dy = dim(y);
    if (dx.length > 0 && dy.length > 0 && dx[dx.length - 1] !== dy[0]) {
        throw new Error(`dot: shape mismatch, ${dx.join("x")} and ${dy.join("x")}`);
    }

    switch (dx.length * 1000 + dy.length) {
        case 2002: // matrix × matrix
            if ((y as number[][]).length < 10) {
                return dotMMsmall(x, y);
            }
            return dotMMbig(x, y);
        case 2001: // matrix × vector
            return dotMV(x, y);
        case 1002: // vector × matrix
            return dotVM(x, y);
        case 1001: // vector × vector
            return dotVV(x, y);
        case 1000: { // vector × scalar
            const n = x.length;
            const ret = Array(n);
            for (let i = n - 1; i >= 0; i--) ret[i] = x[i] * y;
            return ret;
        }
        case 1: { // scalar × vector
            const n = y.length;
            const ret = Array(n);
            for (let i = n - 1; i >= 0; i--) ret[i] = x * y[i];
            return ret;
        }
        case 0: // scalar × scalar
            return x * y;
        default:
            throw new Error(`Unsupported dot product dimensions: ${dx.length} × ${dy.length}`);
    }
}

export { dotVV, dotMV, dotVM, dotMMsmall, dotMMbig };