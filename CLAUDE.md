The goal of this project is to convert the Numeric.js library to TypeScript; we want to adapt its patterns
to TypeScript's own modern features, and ditch the use of evals at runtime which prevent it to function in many modern interpreters as unsafe,
while preserving as much as possible its high performance (for single-threaded CPU JS).

Important: **we are aiming at functionality parity but not necessarily 1:1 API correspondence**. For example, we are not using the `numeric.T` class, in favour of `Vector` and `Matrix` classes.

The original numeric.js is at `../numeric` relative to this project. Its documentation is at https://ccc-js.github.io/numeric2/documentation.html

## Project Structure

- `index.ts` — Public entry point. Exports `Vector`, `Matrix`, `linalg`, and utility functions.
- `src/base.ts` — `TensorBase` class: base for all tensors, stores `_re`, `_im`, `_shape`.
- `src/vector.ts` — `Vector` class (1D tensor).
- `src/matrix.ts` — `Matrix` class (2D tensor).
- `src/utils.ts` — Array utilities: `dim`, `rep`, `linspace`, `random`, `identity`, `diag`, `getDiag`, `clone`, `transpose`, `negtranspose`, `same`, `tensor`, `getBlock`, `getBlock1D`.
- `src/core/` — Low-level generated functions and dispatch:
  - `reducers.ts` — Generated vector reducers (sum, prod, max, min, norms).
  - `maps.ts` — Generated unary element-wise ops (sqrt, abs, sin, cos, neg, ceil, floor, round, etc.).
  - `binops.ts` — Generated binary element-wise ops with VV/VS/SV variants (add, sub, mul, div, comparisons, etc.).
  - `extra.reducers.ts` — Hand-written boolean reducers (any, all).
  - `cx.maps.ts` — Generated complex unary ops (neg, conj, abs, clone). Return `[number[], number[]]`.
  - `cx.binops.ts` — Generated complex binary ops with VV/VS/SV variants (add, sub, mul, div). Return `[number[], number[]]`.
  - `cx.reducers.ts` — Generated complex reducers (norm2, norm2squared, norm1, normInf). Return `number`.
  - `core.ts` — `NumericCore` static class aggregating all core functions (real + complex).
  - `utils.ts` — `UnaryMethod` and `BinaryMethod` dispatchers that resolve tensor type/dtype to core functions.
  - `dot.ts` — Low-level dot product implementations (dotVV, dotMV, dotVM, dotMMsmall, dotMMbig).
- `src/linalg/` — Public linear algebra API:
  - `wrap.ts` — `MatrixLike`, `VectorLike` type aliases and `toRawMatrix`/`toRawVector` extraction helpers. Bridges the public API (accepts both `Matrix`/`Vector` and raw arrays) to internal algorithms (operate on raw arrays).
  - `norm.ts` — norm2, norm1, norm2squared, normInf.
  - `arithmetic.ts` — Element-wise binary ops (add, sub, mul, div, etc.) on vectors/scalars. Arithmetic returns `Vector` (complex if either operand is); comparisons return `boolean[]`.
  - `dot.ts` — `dot()` dispatcher + re-exports of low-level dot functions.
  - `lu.ts` — LU decomposition, LUsolve, solve.
  - `inv.ts` — Matrix inverse via Gauss-Jordan.
  - `det.ts` — Determinant via Gaussian elimination.
  - `house.ts` — Householder reflection (`house`), upper Hessenberg reduction (`toUpperHessenberg`, H = Q·A·Qᵀ), QR Francis iteration (`QRFrancis`), `epsilon`. Public versions wrap results in `Vector`/`Matrix`; the raw `houseRaw`/`toUpperHessenbergRaw`/`QRFrancisRaw` are used internally by `eig`.
  - `cxmat.ts` — **Internal.** Complex matrix/vector/scalar helpers (`CxMatrix`, `CxVector`, `CxScalar` types) for eigenvalue decomposition. Lightweight standalone functions operating on `[number[][], number[][] | null]` pairs with lazy imaginary allocation. Not exported from the public API.
  - `cxhouse.ts` — **Internal.** Complex Householder reflection (`cxHouse`), complex upper Hessenberg reduction (`cxToUpperHessenberg`), and complex single-shift QR iteration (`cxQR`). Used by the complex eigenvalue decomposition path.
  - `eig.ts` — Eigenvalue decomposition (`eig`). Accepts `MatrixLike` (real or complex), returns `{lambda: Vector, E: Matrix}` satisfying `A * E = E * diag(lambda)`. Real matrices use Householder → Francis QR → 2×2 block processing. Complex matrices use complex Householder → single-shift QR (no 2×2 blocks needed). Complex eigenvalues/eigenvectors use the `_im` field on Vector/Matrix.

## Meta-Generation System

Runtime `eval`/`new Function()` from the original is replaced by a build-time code generation system in `meta/`.
**All new element-wise operations MUST be added via this system** — not as hand-written methods on Vector/Matrix classes.

### How it works (pipeline)

1. **Templates** (`meta/*.tjs`) define the loop structure with `$PLACEHOLDER` tokens.
2. **Meta classes** (`meta/*.ts`) read a template, accept expression args, do string substitution (`replaceAll`), and emit TypeScript source.
3. **`meta/generate.ts`** declares all operations as declarative arg objects, instantiates the meta classes, and writes the generated `.ts` files to `src/core/`.
4. **`src/core/core.ts`** (`NumericCore`) imports every generated function and re-exports it as a static property — this is the kernel registry.
5. **Dispatchers** (`src/core/utils.ts`: `UnaryMethod` / `BinaryMethod`) resolve a tensor's dtype + optype + name to a `NumericCore` static property at runtime and call it with the raw data arrays.

### Adding a new operation (recipe)

To add a new element-wise op (e.g. a real unary map `sinh`):

1. Add an entry to the args array in `meta/generate.ts`:
   ```ts
   { name: '_re_v_sinh', mapElement: 'Math.sinh(x_i)' }
   ```
2. Run `bun run meta/generate.ts src/core/` — this regenerates `src/core/maps.ts`.
3. Import and register the function in `src/core/core.ts`:
   ```ts
   static _re_v_sinh = _re_v_sinh;
   ```
4. The dispatchers will find it automatically by name convention.

For complex ops, use the `cx.*` counterparts (see below).

### Templates

Each template is a `.tjs` file with `$PLACEHOLDER` tokens that the meta class fills in.

**Real unary map** (`v.map.template.tjs`): `(x: number[], n) → number[]`
- Placeholders: `$NAME`, `$DATA_ARGS`, `$MAP_ELEMENT`
- Expression variables: `x_i` → replaced with `x[i]`

**Real binary op** (`v.binop.template.tjs`): `(x, y, n) → number[]` (or `boolean[]`)
- Placeholders: `$NAME`, `$ARGS`, `$EXPRESSION`, `$RETURN_TYPE`
- Expression variables: `x_i`, `y_i` → replaced with `x[i]`/`y[i]` (VV), `x[i]`/`y` (VS), `x`/`y[i]` (SV)
- The meta class generates all three variants (VV/VS/SV) automatically, prefixing `_re_v_{name}{variant}`.

**Real reducer** (`v.reducer.template.tjs`): `(x: number[], n) → number`
- Placeholders: `$NAME`, `$DATA_ARGS`, `$REDUCE_ELEMENT_INIT`, `$REDUCE_OPERATOR`, `$REDUCE_ELEMENT`, `$TRANSFORMED_RESULT`
- The init element defaults to the reduce element (evaluated at `i = n-1`). The loop runs from `n-2` down to 0.

**Complex unary map** (`cx.v.map.template.tjs`): `(x_re: number[], x_im: number[], n) → [number[], number[]]`
- Placeholders: `$NAME`, `$MAP_RE`, `$MAP_IM`
- Expression variables: `x_re_i`, `x_im_i` → replaced with `x_re[i]`, `x_im[i]`

**Complex binary op** (`cx.v.binop.template.tjs`): `(x_re, x_im, y_re, y_im, n) → [number[], number[]]`
- Placeholders: `$NAME`, `$ARGS`, `$EXPRESSION_RE`, `$EXPRESSION_IM`
- Expression variables: `x_re_i`, `x_im_i`, `y_re_i`, `y_im_i` → replaced per variant (VV: all `[i]`; VS: y as scalar; SV: x as scalar)
- The meta class generates all three variants, prefixing `_cx_v_{name}{variant}`.

**Complex reducer** (`cx.v.reducer.template.tjs`): `(x_re: number[], x_im: number[], n) → number`
- Placeholders: same as real reducer
- Expression variables: `x_re_i`, `x_im_i` → replaced with `x_re[i]`, `x_im[i]`

### Meta classes

| Class | File | Template | Args |
|-------|------|----------|------|
| `VectorMapMetaFunction` | `meta/map.ts` | `v.map.template.tjs` | `{ name, dataArgs?, mapElement }` |
| `VectorBinopMetaFunction` | `meta/binop.ts` | `v.binop.template.tjs` | `{ name, expression, returnType? }` |
| `VectorReducerMetaFunction` | `meta/reducer.ts` | `v.reducer.template.tjs` | `{ name, dataArgs?, reduceElement, reduceOperator?, initElement?, resultTransform? }` |
| `CxVectorMapMetaFunction` | `meta/cx.map.ts` | `cx.v.map.template.tjs` | `{ name, mapRe, mapIm }` |
| `CxVectorBinopMetaFunction` | `meta/cx.binop.ts` | `cx.v.binop.template.tjs` | `{ name, expressionRe, expressionIm }` |
| `CxVectorReducerMetaFunction` | `meta/cx.reducer.ts` | `cx.v.reducer.template.tjs` | `{ name, reduceElement, reduceOperator?, initElement?, resultTransform? }` |

### Generated output files

| Source | Output | Contents |
|--------|--------|----------|
| `generate.ts` reducers section | `src/core/reducers.ts` | `_re_v_norm2`, `_re_v_sum`, `_re_v_prod`, etc. |
| `generate.ts` maps section | `src/core/maps.ts` | `_re_v_sqrt`, `_re_v_neg`, `_re_v_clone`, etc. |
| `generate.ts` binops section | `src/core/binops.ts` | `_re_v_addVV/VS/SV`, `_re_v_eqVV/VS/SV`, etc. |
| `generate.ts` cx maps section | `src/core/cx.maps.ts` | `_cx_v_neg`, `_cx_v_conj`, `_cx_v_abs`, `_cx_v_clone` |
| `generate.ts` cx binops section | `src/core/cx.binops.ts` | `_cx_v_addVV/VS/SV`, `_cx_v_mulVV/VS/SV`, etc. |
| `generate.ts` cx reducers section | `src/core/cx.reducers.ts` | `_cx_v_norm2`, `_cx_v_norm2squared`, `_cx_v_norm1`, `_cx_v_normInf` |

Hand-written (not generated): `extra.reducers.ts` (`_bool_v_any`, `_bool_v_all`), `dot.ts`.

### Dispatchers (`src/core/utils.ts`)

`UnaryMethod` and `BinaryMethod` bridge the typed tensor world to the raw kernel functions:

1. Inspect the tensor to determine `dtype` (`re` or `cx`) and `optype` (`v`).
2. Build the full kernel name: `_${dtype}_${optype}_${name}` (unary) or `_${dtype}_${optype}_${name}${variant}` (binary, where variant is VV/VS/SV).
3. Look up the function on `NumericCore` by name.
4. Build the args array: for real ops, `(data, n)`; for complex ops, `(re, im, n)`. Binary ops push both operands' data (with imag=0 for scalar operands in complex mode).
5. Call and return the raw result.

Callers (e.g. `src/linalg/arithmetic.ts`) use the dispatchers, then wrap raw results back into Vector/Matrix.

## Naming Conventions

Core functions follow the pattern `_{dtype}_{optype}_{name}[{variant}]`:
- `dtype`: `re` (real), `cx` (complex), `bool` (boolean)
- `optype`: `v` (vector), `m` (matrix — not yet implemented)
- `variant` (binops only): `VV` (vector-vector), `VS` (vector-scalar), `SV` (scalar-vector)
- Example: `_re_v_addVV`, `_re_v_norm2`, `_bool_v_any`, `_cx_v_mulVV`, `_cx_v_norm2`

### Kernel signatures by dtype

**Real (`_re_v_`):**
- Map: `(x: number[], n: number) → number[]`
- Binop: `(x: number[], y: number[], n: number) → number[]` (VV), similar for VS/SV
- Reducer: `(x: number[], n: number) → number`

**Complex (`_cx_v_`):**
- Map: `(x_re: number[], x_im: number[], n: number) → [number[], number[]]`
- Binop VV: `(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number) → [number[], number[]]`
- Binop VS: `(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number) → [number[], number[]]`
- Binop SV: `(x_re: number, x_im: number, y_re: number[], y_im: number[], n: number) → [number[], number[]]`
- Reducer: `(x_re: number[], x_im: number[], n: number) → number`

## Performance Patterns

Following the original numeric.js:
- Backwards iteration (`for (i = n-1; i >= 0; i -= 1)`)
- 2x loop unrolling where beneficial (dot products, transpose, LU)
- Pre-allocated result arrays (`Array(n)`)
- Column extraction for large matrix multiply (dotMMbig)

## Public API Pattern

Linalg functions should accept both raw arrays (`number[]`, `number[][]`) and TensorBase objects (`Vector`, `Matrix`), and return `Vector`/`Matrix` instances. This mirrors how numeric.js's `T` class wraps complex data.

- **Input types**: `MatrixLike = Matrix | number[][]`, `VectorLike = Vector | number[]` (defined in `src/linalg/wrap.ts`).
- **Extraction**: `toRawMatrix(x)` / `toRawVector(x)` cheaply extract the raw `.real` data at the function boundary.
- **Internal algorithms** operate on raw `number[]` / `number[][]` for performance — no class overhead in hot loops.
- **Results** are wrapped in `Vector`/`Matrix` at the return boundary, using the `_im` field for complex results. Scalars stay `number`; boolean results (comparisons) stay `boolean[]`.
- **Real-only routines** must reject complex inputs (`toRawMatrix`/`toRawVector` throw on them) rather than silently dropping `_im`.
- **Internal reuse:** when one algorithm needs another's raw output (e.g. `eig` → `toUpperHessenberg`), keep an unexported or `*Raw` raw-array version and have the public function wrap it. The low-level `dotVV`/`dotMV`/`dotVM`/`dotMM*` kernels and the array utilities in `src/utils.ts` intentionally stay raw.
- **Internal types** like `CxMatrix`, `CxVector`, `CxScalar` from `cxmat.ts` are NOT exported from the public API.

Example pattern:
```ts
export function eig(A: MatrixLike, maxiter?: number): EigResult {
    const rawA = toRawMatrix(A);
    // ... internal algorithm on rawA (uses CxMatrix etc.) ...
    return {
        lambda: new Vector(lambdaRe, lambdaIm),
        E: new Matrix(Ere, Eim),
    };
}
```

**When adding new linalg functions, follow this pattern:** accept `MatrixLike`/`VectorLike`, extract raw arrays, compute internally, wrap results.

## Testing

- Framework: `bun:test`
- Run: `bun test`
- Snapshot tests for generated code in `meta/__snapshots__/`
- Correctness tests alongside each module (`.test.ts` files)

### NumPy Cross-Validation (`tests/`)

A cross-language validation framework that compares numeric-2 results against NumPy:

- `tests/oracle.py` — Python script that accepts NDJSON on stdin, generates seeded random data with NumPy, computes reference results, and outputs NDJSON responses with both inputs and expected outputs.
- `tests/runner.ts` — Bun helper that spawns `uv run python tests/oracle.py`, sends requests, and parses responses. Provides `oracle()`, `assertClose()`, `assertClose2D()`, `assertScalarClose()`.
- `tests/pyproject.toml` — uv project config (numpy dependency). Run `cd tests && uv sync` to install.
- Test files: `unary.test.ts`, `binary.test.ts`, `reducers.test.ts`, `dot.test.ts`, `linalg.test.ts`, `complex.test.ts`, `eig.test.ts`, `utilities.test.ts`, `complex-dispatch.test.ts`

The oracle returns inputs and expected outputs so the TS side uses the oracle's inputs directly (no cross-language RNG matching needed). Note: JS `%` uses truncated division (`np.fmod`), not floored division (`np.mod`).

**Remember to always add new cross-validation tests after implementing new functionality.**

## Building

- `npm run build` — Builds ESM, minified ESM, UMD, and minified UMD bundles into `dist/`
- `bun run meta/generate.ts src/core/` — Regenerate core functions from templates