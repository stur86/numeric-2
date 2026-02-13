The goal of this project is to convert the Numeric.js library as faithfully as possible to TypeScript; we want to adapt its patterns
to TypeScript's own modern features, and ditch the use of evals at runtime which prevent it to function in many modern interpreters as unsafe,
while preserving as much as possible its high performance (for single-threaded CPU JS).

The original numeric.js is at `../numeric` relative to this project. Its documentation is at https://ccc-js.github.io/numeric2/documentation.html

## Project Structure

- `index.ts` — Public entry point. Exports `Vector`, `Matrix`, `linalg`, and utility functions.
- `src/base.ts` — `TensorBase` class: base for all tensors, stores `_re`, `_im`, `_shape`.
- `src/vector.ts` — `Vector` class (1D tensor).
- `src/matrix.ts` — `Matrix` class (2D tensor).
- `src/utils.ts` — Array utilities: `dim`, `rep`, `linspace`, `random`, `identity`, `diag`, `getDiag`, `clone`, `transpose`, `negtranspose`, `same`, `tensor`.
- `src/core/` — Low-level generated functions and dispatch:
  - `reducers.ts` — Generated vector reducers (sum, prod, max, min, norms).
  - `maps.ts` — Generated unary element-wise ops (sqrt, abs, sin, cos, neg, ceil, floor, round, etc.).
  - `binops.ts` — Generated binary element-wise ops with VV/VS/SV variants (add, sub, mul, div, comparisons, etc.).
  - `extra.reducers.ts` — Hand-written boolean reducers (any, all).
  - `core.ts` — `NumericCore` static class aggregating all core functions.
  - `utils.ts` — `UnaryMethod` and `BinaryMethod` dispatchers that resolve tensor type/dtype to core functions.
  - `dot.ts` — Low-level dot product implementations (dotVV, dotMV, dotVM, dotMMsmall, dotMMbig).
- `src/linalg/` — Public linear algebra API:
  - `norm.ts` — norm2, norm1, norm2squared, normInf.
  - `arithmetic.ts` — Element-wise binary ops (add, sub, mul, div, etc.) on tensors.
  - `dot.ts` — `dot()` dispatcher + re-exports of low-level dot functions.
  - `lu.ts` — LU decomposition, LUsolve, solve.
  - `inv.ts` — Matrix inverse via Gauss-Jordan.
  - `det.ts` — Determinant via Gaussian elimination.

## Meta-Generation System

Runtime `eval`/`new Function()` from the original is replaced by a build-time code generation system in `meta/`:

- `meta/generate.ts` — CLI script (`bun run meta/generate.ts src/core/`) that generates `reducers.ts`, `maps.ts`, `binops.ts`.
- `meta/reducer.ts` — `VectorReducerMetaFunction` class + template `v.reducer.template.tjs`.
- `meta/map.ts` — `VectorMapMetaFunction` class + template `v.map.template.tjs`.
- `meta/binop.ts` — `VectorBinopMetaFunction` class + template `v.binop.template.tjs`.

## Naming Conventions

Core functions follow the pattern `_{dtype}_{optype}_{name}[{variant}]`:
- `dtype`: `re` (real), `cx` (complex), `bool` (boolean)
- `optype`: `v` (vector), `m` (matrix — not yet implemented)
- `variant` (binops only): `VV`, `VS`, `SV`
- Example: `_re_v_addVV`, `_re_v_norm2`, `_bool_v_any`

## Performance Patterns

Following the original numeric.js:
- Backwards iteration (`for (i = n-1; i >= 0; i -= 1)`)
- 2x loop unrolling where beneficial (dot products, transpose, LU)
- Pre-allocated result arrays (`Array(n)`)
- Column extraction for large matrix multiply (dotMMbig)

## Testing

- Framework: `bun:test`
- Run: `bun test`
- Snapshot tests for generated code in `meta/__snapshots__/`
- Correctness tests alongside each module (`.test.ts` files)

## Building

- `npm run build` — Builds ESM, minified ESM, UMD, and minified UMD bundles into `dist/`
- `bun run meta/generate.ts src/core/` — Regenerate core functions from templates