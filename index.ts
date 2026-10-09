import Vector from "./src/vector";
import Matrix from "./src/matrix";
import { complex, isComplex } from "./src/complex";
import type { Complex, Scalar } from "./src/complex";
import * as linalg from "./src/linalg";
import * as optimize from "./src/optimize";
import * as interpolate from "./src/interpolate";
import * as ode from "./src/ode";
import * as sparse from "./src/sparse";
import { SparseMatrix } from "./src/sparse";
import { dim, rep, linspace, random, identity, diag, getDiag, clone, transpose, negtranspose, same, tensor, getBlock, getBlock1D } from "./src/utils";

export {
    Vector,
    Matrix,
    linalg,
    optimize,
    interpolate,
    ode,
    sparse,
    SparseMatrix,
    complex, isComplex,
    dim, rep, linspace, random, identity, diag, getDiag, clone, transpose, negtranspose, same, tensor, getBlock, getBlock1D,
};

export type { Complex, Scalar };
