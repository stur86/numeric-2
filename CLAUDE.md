The goal of this project is to convert the Numeric.js library to TypeScript; we want to adapt its patterns
to TypeScript's own modern features, and ditch the use of evals at runtime which prevent it to function in many modern interpreters as unsafe,
while preserving as much as possible its high performance (for single-threaded CPU JS).

Important: **we are aiming at functionality parity but not necessarily 1:1 API correspondence**. For example, we are not using the `numeric.T` class, in favour of `Vector` and `Matrix` classes.

The original numeric.js is at `../numeric` relative to this project. Its documentation is at https://ccc-js.github.io/numeric2/documentation.html

## Project Structure

- `index.ts` — Public entry point. Exports `Vector`, `Matrix`, `SparseMatrix`, `linalg`, `sparse`, `optimize`, `interpolate`, `ode`, `complex`/`isComplex` (+ `Complex`/`Scalar` types), and utility functions.
- `src/complex.ts` — `Complex = {re, im}` scalar type, `Scalar = number | Complex`, `complex()`, `isComplex()`.
- `src/base.ts` — `TensorBase` class: base for all tensors, stores `_re`, `_im`, `_shape`.
- `src/vector.ts` — `Vector` class (1D tensor): `clone`, `promoteToComplex` (in place), `get`/`set`, `getBlock`/`setBlock`, `Vector.zeros`.
- `src/matrix.ts` — `Matrix` class (2D tensor): `clone`, `promoteToComplex`, `get`/`set`, `getRow`/`setRow`, `getCol`/`setCol`, `getRows`/`setRows`, `getBlock`/`setBlock`, `getRange`, `getDiag`, `transpose`, `transjugate`; statics `zeros`, `identity`, `diag`, `block`. All complex-aware.
- `src/random.ts` — Seeded random numbers, NumPy-style: `defaultRng(seed?)` → `RandomGenerator` with `random`, `uniform`, `normal`, `standardNormal`, `integers` (NumPy's [low, high) convention). `size`: none → number, `n`/`[n]` → `Vector`, `[m, n]` → `Matrix`, more dims → `TensorBase`; `{ bare: true }` returns plain nested arrays. Return types follow the arguments (`Sample<S, B>`). Bit generator: xoshiro128** seeded via SplitMix32 (32-bit arithmetic only); normals by Marsaglia's polar method; unbiased integers by rejection. Streams differ from NumPy's for the same seed. The old unseeded `random(shape)` in `utils.ts` (Math.random) remains for numeric.js compatibility.
- `src/tensor.ts` — `Tensor`: N-D tensor (any rank) as nested arrays; `ndim`, `get(...idx)`, `set(...idx, v)`, `clone`, `promoteToComplex`, `Tensor.zeros`; `shapeOf` validates rectangular nested arrays. Element-wise ops, reductions, norms and in-place ops work on any rank; raw arrays nested 3+ deep become `Tensor`s. Linear algebra still needs `Vector`/`Matrix`.
- `src/print.ts` — `prettyPrint(x, {precision, threshold, edgeItems})`: numeric.js's shortest-form number formatting (4 significant digits), column-aligned; complex as `a+bi`; long arrays summarized NumPy-style; `SparseMatrix` as header + entries; plain objects (e.g. eig results). Backs `toString()` on tensors and `SparseMatrix`; recognizes classes structurally to avoid import cycles.
- `src/tensorutils.ts` — Public utility functions (`clone`, `transpose`, `negtranspose`, `transjugate`, `getDiag`, `getBlock`, `getBlock1D`, `setBlock`, `getRange`, `blockMatrix`, `tensor`, `same`) that accept raw arrays (raw result) or `Vector`/`Matrix` (tensor result, complex-aware). `index.ts` exports these; internal code uses the raw versions in `src/utils.ts`.
- `src/utils.ts` — Raw array utilities (real `number[]`/`number[][]` only): `dim`, `rep`, `linspace`, `random`, `identity`, `diag`, `getDiag`, `clone`, `transpose`, `negtranspose`, `same`, `tensor`, `getBlock`, `getBlock1D`, `setBlock`, `getRange`, `blockMatrix`.
- `src/core/` — Low-level generated functions and dispatch:
  - `reducers.ts` — Generated vector reducers (sum, prod, max, min, norms).
  - `maps.ts` — Generated unary element-wise ops (sqrt, abs, sin, cos, neg, ceil, floor, round, etc.).
  - `binops.ts` — Generated binary element-wise ops with VV/VS/SV variants (add, sub, mul, div, comparisons, etc.).
  - `extra.reducers.ts` — Hand-written boolean reducers (any, all). Also registered in `NumericCore` as `_re_v_any`/`_re_v_all` (truthiness on real data).
  - `cx.maps.ts` — Generated complex unary ops (neg, conj, abs, clone, exp, log, sqrt, sin, cos). Return `[number[], number[]]`.
  - `cx.binops.ts` — Generated complex binary ops with VV/VS/SV variants (add, sub, mul, div → `[number[], number[]]`; eq, neq → `boolean[]`).
  - `cx.reducers.ts` — Generated complex reducers (norm2, norm2squared, norm1, normInf). Return `number`.
  - `cx.cxreducers.ts` — Generated complex-valued reducers (sum, prod). Return `[number, number]`.
  - `core.ts` — `NumericCore` static class aggregating all core functions (real + complex).
  - `utils.ts` — `UnaryMethod` and `BinaryMethod` dispatchers that resolve tensor type/dtype to core functions.
  - `dot.ts` — Low-level dot product implementations (dotVV, dotMV, dotVM, dotMMsmall, dotMMbig).
- `src/interpolate/` — Public interpolation API (`interpolate` namespace).
  - `spline.ts` — `spline(x, y, boundary)` → generic `Spline<"scalar" | "vector">` with `at`, `diff`, `roots`. Stored as piecewise cubic Hermite segments (separate left/right values and slopes per knot, so `diff()` is exact). Boundary: `"natural"` (default), `"periodic"`, or `{left, right}` end slopes. Slopes come from an O(n) tridiagonal (Thomas) solve; periodic uses Sherman–Morrison. Differences from numeric.js: periodic splines wrap outside the knots, and `roots()` correctly finds two roots inside one segment (numeric.js compared local-coordinate turning points with absolute x).
- `src/sparse/` — Sparse matrices (`sparse` namespace, plus `SparseMatrix` at top level).
  - `sparse.ts` — `SparseMatrix`: compressed column storage (`colPtr`, `rowIdx`, `values`, explicit shape). Canonical form everywhere: rows strictly increasing within a column, no explicit zeros. Constructors `fromDense`, `fromTriplets` (duplicates summed), `identity`, `diag`; `toDense`, `toTriplets`, `get`, `transpose`, `mapValues`.
  - `ops.ts` — `add`/`sub`/`mul` (sparse–sparse via generated `_re_s_*SS` kernels; `mul`/`div` by a scalar reuse the vector kernels on the values), `neg`, `dot` (sparse×sparse Gustavson, sparse×vector, vector×sparse, sparse×dense, dense×sparse), `getBlock`.
  - `lu.ts` — `lu(A, {threshold})` → `SparseLU {L, U, p, solve}` with P·A = L·U (left-looking Gilbert–Peierls with DFS reach, partial pivoting preferring the diagonal), and `solve(A, b)`.
- `src/ode/` — Public ODE API (`ode` namespace).
  - `dopri.ts` — `dopri(x0, x1, y0, f, {tol, maxit, event})`: Dormand–Prince 5(4), absolute tolerance on the infinity norm, dense output via `DopriSolution.at`. Scalar (`y0: number`, f on numbers) or system (`y0: VectorLike`, f on plain arrays). Events stop at the first negative → zero-or-positive crossing (numeric.js required > 0 and missed exact zeros). NaN error estimates reject the step; the "Step size became too small" message is actually reported (numeric.js set the wrong field).
- `src/optimize/` — Public optimization API (`optimize` namespace). Objective/gradient callbacks receive plain `number[]`.
  - `uncmin.ts` — `gradient` (central differences, adaptive step; retries counted per coordinate, unlike numeric.js which fails above ~20 variables) and `uncmin` (BFGS + backtracking line search, options object).
  - `lp.ts` — `solveLP(c, A, b, {Aeq, beq, tol, maxit})`: interior-point LP (minimize c·x s.t. Ax ≤ b, Aeq x = beq), and `echelonize`.
  - `qp.ts` — `solveQP(D, d, A, b, {meq, factorized})`: Goldfarb–Idnani (quadprog qpgen2), minimize ½xᵀDx − dᵀx s.t. Aᵀx ≥ b; columns of A are constraints. Kept 1-based internally like the Fortran. Fixes numeric.js's port, which mistranslated three skip-to-next-iteration loops (it returns infeasible/suboptimal points on some problems; see seeds 42/67/105 in `tests/optimize.test.ts`).
- `src/linalg/` — Public linear algebra API:
  - `wrap.ts` — `MatrixLike`, `VectorLike` type aliases and `toRawMatrix`/`toRawVector` extraction helpers. Bridges the public API (accepts both `Matrix`/`Vector` and raw arrays) to internal algorithms (operate on raw arrays).
  - `norm.ts` — norm2, norm1, norm2squared, normInf (element-wise over all entries; Frobenius for `norm2` of a matrix).
  - `elementwise.ts` — Public unary maps on vectors/matrices: sqrt, exp, log, trig, neg, ceil, floor, round, conj, abs (always real), isNaN/isFinite (boolean arrays).
  - `reduce.ts` — Public reducers over all elements: sum, prod, sup (max), inf (min), any, all. Named after numeric.js, where `max`/`min` are the element-wise binary ops.
  - `inplace.ts` — In-place element-wise ops (`iadd`, `isub`, `imul`, `idiv`, `imod`, `ipow`, `iatan2`, `imax`, `imin`, bitwise `iband`…`irrshift`, `itrunc`; unary `isqrt`, `iexp`, `ilog`, `isin`, `icos`, `ineg`, `iconj`, `ireciprocal`, …): overwrite and return the first argument (Vector, Matrix or raw array), using generated `_re_v_i*` / `_cx_v_i*` kernels. Complex into real throws (promote explicitly); ops without a complex kernel throw on complex targets.
  - `arithmetic.ts` — Element-wise binary ops (add, sub, mul, div, etc.) on vectors/scalars. Arithmetic returns `Vector` (complex if either operand is); comparisons return `boolean[]`.
  - `dot.ts` — `dot()` dispatcher + re-exports of low-level dot functions.
  - `lu.ts` — LU decomposition, LUsolve, solve.
  - `inv.ts` — Matrix inverse via Gauss-Jordan.
  - `det.ts` — Determinant via Gaussian elimination.
  - `house.ts` — Householder reflection (`house`), upper Hessenberg reduction (`toUpperHessenberg`, H = Q·A·Qᵀ), QR Francis iteration (`QRFrancis`), `epsilon`. Public versions wrap results in `Vector`/`Matrix`; the raw `houseRaw`/`toUpperHessenbergRaw`/`QRFrancisRaw` are used internally by `eig`.
  - `cxmat.ts` — **Internal.** Complex matrix/vector/scalar helpers (`CxMatrix`, `CxVector`, `CxScalar` types) for eigenvalue decomposition. Lightweight standalone functions operating on `[number[][], number[][] | null]` pairs with lazy imaginary allocation. Not exported from the public API.
  - `cxlinalg.ts` — **Internal.** Complex LU (`cxLU`), `cxLUsolve`, `cxInv`, `cxDet` on split re/im arrays; used by the public `LU`/`LUsolve`/`solve`/`inv`/`det` when an input is complex.
  - `cxhouse.ts` — **Internal.** Complex Householder reflection (`cxHouse`), complex upper Hessenberg reduction (`cxToUpperHessenberg`), and complex single-shift QR iteration (`cxQR`). Used by the complex eigenvalue decomposition path.
  - `convolve.ts` — `convolve(a, v, mode)`: np.convolve semantics (`full`/`same`/`valid`), direct sum for small inputs, FFT (padded to a power of two) otherwise; real in → real out.
  - `fft.ts` — `fft` / `ifft` (NumPy conventions: ifft scales by 1/n). Iterative in-place radix-2 for power-of-two lengths, Bluestein (chirp-z via radix-2) for any other length; twiddles and chirps are cached per length. Accepts real or complex `VectorLike`, always returns a complex `Vector`.
  - `svd.ts` — Singular value decomposition (`svd`), Golub–Reinsch ported from numeric.js. Returns the thin `{U, S, V}` with `A = U·diag(S)·Vᵀ`, singular values descending; unlike numeric.js it also handles matrices with fewer rows than columns (via the transpose). Real matrices only.
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

**Complex map** also accepts an optional `mapPre` statement run per element before `mapRe`/`mapIm` (placeholder `$MAP_PRE`), to share work such as `const e = Math.exp(x_re_i);`.

**Complex boolean binop** (`cx.v.binop.bool.template.tjs`): `(x_re, x_im, y_re, y_im, n) → boolean[]`
- Selected by passing `{ name, expression }` (instead of `expressionRe`/`expressionIm`) to `CxVectorBinopMetaFunction`.

**Complex-valued reducer** (`cx.v.cxreducer.template.tjs`): `(x_re: number[], x_im: number[], n) → [number, number]`
- Placeholders: `$NAME`, `$INIT_RE`, `$INIT_IM`, `$REDUCE_RE`, `$REDUCE_IM`
- Expression variables: `x_re_i`, `x_im_i`, and the accumulator `ans_re`, `ans_im` (both reduce expressions see the previous accumulator). Init defaults to the element at `i = n-1`.

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
| `CxVectorCxReducerMetaFunction` | `meta/cx.cxreducer.ts` | `cx.v.cxreducer.template.tjs` | `{ name, reduceRe, reduceIm, initRe?, initIm? }` |
| `InPlaceMapMetaFunction`, `InPlaceBinopMetaFunction`, `CxInPlaceMapMetaFunction`, `CxInPlaceBinopMetaFunction` | `meta/inplace.ts` | `v.imap`, `v.ibinop`, `cx.v.imap`, `cx.v.ibinop` templates | `(name, expression…)`; in-place variants (VV/VS only) reusing the regular ops' expressions, looked up by name in `generate.ts` |
| `SparseBinopMetaFunction` | `meta/sparse.binop.ts` | `s.binop.template.tjs` | `{ name, expression }` (x_i, y_i; merges two sorted CCS patterns, drops zeros — only ops with op(0,0)=0) |

### Generated output files

| Source | Output | Contents |
|--------|--------|----------|
| `generate.ts` reducers section | `src/core/reducers.ts` | `_re_v_norm2`, `_re_v_sum`, `_re_v_prod`, etc. |
| `generate.ts` maps section | `src/core/maps.ts` | `_re_v_sqrt`, `_re_v_neg`, `_re_v_clone`, etc. |
| `generate.ts` binops section | `src/core/binops.ts` | `_re_v_addVV/VS/SV`, `_re_v_eqVV/VS/SV`, etc. |
| `generate.ts` cx maps section | `src/core/cx.maps.ts` | `_cx_v_neg`, `_cx_v_conj`, `_cx_v_abs`, `_cx_v_clone` |
| `generate.ts` cx binops section | `src/core/cx.binops.ts` | `_cx_v_addVV/VS/SV`, `_cx_v_mulVV/VS/SV`, etc. |
| `generate.ts` cx reducers section | `src/core/cx.reducers.ts` | `_cx_v_norm2`, `_cx_v_norm2squared`, `_cx_v_norm1`, `_cx_v_normInf` |
| `generate.ts` cx-valued reducers section | `src/core/cx.cxreducers.ts` | `_cx_v_sum`, `_cx_v_prod` |
| `generate.ts` in-place section | `src/core/inplace.ts` | `_re_v_iaddVV/VS`, `_re_v_isqrt`, `_cx_v_imulVV/VS`, `_cx_v_iexp`, etc. |
| `generate.ts` sparse binops section | `src/core/sparse.binops.ts` | `_re_s_addSS`, `_re_s_subSS`, `_re_s_mulSS` |

Hand-written (not generated): `extra.reducers.ts` (`_bool_v_any`, `_bool_v_all`), `dot.ts`.

### Dispatchers (`src/core/utils.ts`)

`UnaryMethod` and `BinaryMethod` bridge the typed tensor world to the raw kernel functions:

1. Inspect the tensor to determine `dtype` (`re` or `cx`) and `optype` (`v` for Vector, `m` for Matrix, `t` for N-D Tensor). In binary ops, a complex operand on either side switches to `cx` (the real side gets zero imaginary parts).
2. Build the full kernel name: `_${dtype}_v_${name}` (unary) or `_${dtype}_v_${name}${variant}` (binary, where variant is VV/VS/SV). **Matrices reuse the vector kernels** — there are no `_m_` kernels.
3. Look up the function on `NumericCore` by name.
4. Build the args array: for real ops, `(data, n)`; for complex ops, `(re, im, n)`. Binary ops push both operands' data (with imag=0 for scalar operands in complex mode).
5. Call and return the raw result. For matrices and N-D tensors, the vector kernel runs once per innermost row (`rowsOf`), and N-D results are regrouped to the original shape (`nestRows`): maps/binops return the per-row arrays (`[reRows, imRows]` for complex), and reducers merge the per-row results with `ROW_COMBINERS` (a new reducer must get an entry there to work on matrices).
6. Unknown kernels raise `Operation <name> is not supported for real/complex tensors`; binary ops check that tensor operands have the same shape.

Callers (e.g. `src/linalg/arithmetic.ts`) use the dispatchers, then wrap raw results back into Vector/Matrix.

## Naming Conventions

Core functions follow the pattern `_{dtype}_{optype}_{name}[{variant}]`:
- `dtype`: `re` (real), `cx` (complex), `bool` (boolean)
- `optype`: `v` (vector). Matrices are dispatched row-wise onto `v` kernels (dispatcher optype `m`), so kernel names always use `v`.
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
- Reducer: `(x_re: number[], x_im: number[], n: number) → number`, or `→ [number, number]` for complex-valued reducers

## Performance Patterns

Following the original numeric.js:
- Backwards iteration (`for (i = n-1; i >= 0; i -= 1)`)
- 2x loop unrolling where beneficial (dot products, transpose, LU)
- Pre-allocated result arrays (`Array(n)`)
- Column extraction for large matrix multiply (dotMMbig)
- **V8 allocation sites:** never allocate both arrays-of-rows and rows of numbers at the same `Array(n)` line (e.g. one recursive helper). V8 tracks element kinds per allocation site, and rows from such a site get boxed (generic) elements, making numeric loops several times slower on Node (Bun is unaffected). See `cloneRow` in `src/utils.ts`.
- **Hot dispatch:** public element-wise ops use `fastUnary`/`fastBinary` (`src/core/utils.ts`), which resolve kernels once and call them directly for real inputs; keep new public element-wise functions on this path.

## Tensor conventions

- Constructors (`new Vector(re, im)`, `new Matrix(re, im)`) wrap the given arrays **without copying**, and `.real`/`.imag` expose the internal arrays. Use `clone()` for an independent copy.
- Block/slice ranges are half-open (`[r0, r1)`, like `Array.slice`); numeric.js used inclusive ends.
- Writing complex values into a real tensor (`set`, `setRow`, `setBlock`, in-place ops) **throws**; promotion is explicit via `promoteToComplex()`.
- In-place ops mutate their target (and therefore any array a tensor was built from). Benchmark cases with in-place ops must give each library its own input copy; the runner snapshots outputs (`structuredClone`) before timing.
- Logical ops (`and`, `or`, `not`) return booleans and accept boolean arrays (numeric.js's `and`/`or` returned an operand, like JS `&&`/`||`). Bitwise ops (`band`, `bor`, `bxor`, `bnot`, `lshift`, `rshift`, `rrshift`) follow JS 32-bit integer semantics.

## Public API Pattern

Linalg functions should accept both raw arrays (`number[]`, `number[][]`) and TensorBase objects (`Vector`, `Matrix`), and return `Vector`/`Matrix` instances. This mirrors how numeric.js's `T` class wraps complex data.

- **Input types**: `MatrixLike = Matrix | number[][]`, `VectorLike = Vector | number[]` (defined in `src/linalg/wrap.ts`).
- **Extraction**: `toRawMatrix(x)` / `toRawVector(x)` cheaply extract the raw `.real` data at the function boundary.
- **Internal algorithms** operate on raw `number[]` / `number[][]` for performance — no class overhead in hot loops.
- **Results** are wrapped in `Vector`/`Matrix` at the return boundary, using the `_im` field for complex results. Boolean results (comparisons) stay `boolean[]`.
- **Complex scalars** are `Complex = {re, im}` (`src/complex.ts`), accepted wherever a scalar operand is. A scalar result is a `Complex` if and only if an input was complex (even when its imaginary part is 0). Functions that can return a complex scalar are typed `Scalar` (`number | Complex`) for `Vector`/`Matrix` inputs, with overloads returning plain `number` for raw-array inputs. A `Complex` operand with `im === 0` is treated as a real scalar.
- **Real-only routines** (currently `house`, `toUpperHessenberg`, `QRFrancis`, the ordered comparisons, `sup`/`inf`/`any`/`all`, and maps without a `_cx_` kernel) must reject complex inputs (`toRawMatrix`/`toRawVector` throw on them) rather than silently dropping `_im`.
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
- `tests/pyproject.toml` — uv project config (numpy and scipy; scipy provides LP/QP references via `linprog` and SLSQP). Run `cd tests && uv sync` to install.
- Test files: `unary.test.ts`, `binary.test.ts`, `reducers.test.ts`, `dot.test.ts`, `linalg.test.ts`, `complex.test.ts`, `eig.test.ts`, `utilities.test.ts`, `complex-dispatch.test.ts`, `elementwise.test.ts` (public API on vectors and matrices), `cx-linalg.test.ts`, `fft.test.ts`, `sparse.test.ts` (vs scipy.sparse and spsolve; matrices sent as triplets), `logic.test.ts` (logical/bitwise/trunc/reciprocal vs NumPy), `random.test.ts` (bit generator vs a Python reference implementation; KS/chi-square distribution tests), `nd.test.ts` (3-D/4-D element-wise ops, reductions, complex, in-place vs NumPy), `convolve.test.ts` (vs np.convolve, all modes), `ode.test.ts` (vs analytic solutions and scipy DOP853 at 1e-13), `spline.test.ts` (vs scipy CubicSpline: values, derivatives, roots), `optimize.test.ts` (LP vs linprog, QP vs SLSQP, uncmin on known minimizers), `svd.test.ts` (singular values vs NumPy, plus reconstruction and orthonormality, since singular vectors are sign-ambiguous)
- `cx-linalg.test.ts` covers complex solve/LU/inv/det/dot and complex element-wise ops (incl. complex scalar operands).
- Element-wise oracle ops accept `"shape": [m, n]` instead of `"n"` to produce matrix inputs; `cx_*` binary ops accept `real_x`/`real_y` to make one operand purely real. Oracle exceptions come back as `{"error": ...}` and the runner raises them as test failures.

The oracle returns inputs and expected outputs so the TS side uses the oracle's inputs directly (no cross-language RNG matching needed). Note: JS `%` uses truncated division (`np.fmod`), not floored division (`np.mod`).

**Remember to always add new cross-validation tests after implementing new functionality.**

## Benchmarks (`benchmarks/`)

Compares numeric-2 with numeric.js 1.2.6, math.js and stdlib (standalone `@stdlib/blas-base-*` packages; stdlib has no published general LU/solve/inv/det/eig, so it only appears in BLAS-style cases). Report results as **relative speed** against a baseline library (e.g. "0.8× numeric.js"), never as a "speed-up".

- `suites.ts` — Environment-agnostic suite: `buildCases()` defines each case's per-library inputs and calls (public APIs only; each library gets its own input types, prepared outside the timed region). Outputs are compared against numeric-2's before timing. Timing uses `performance.now()` with calibrated batches (median + IQR) and a per-measurement time budget.
- `libs.ts` — Shared imports of numeric-2, math.js and the stdlib routines (numeric.js is loaded separately: npm on the server, jsDelivr in the browser).
- `run.ts` — CLI runner. `bun run bench:bun` / `bun run bench:node` (Node runs a bundled build) write `benchmarks/results/{bun,node}.json`. Flags: `--quick`, `--filter <text>`, `--libs a,b`, `--out <dir>`, `--merge` (update only the measured cases in the existing results file).
- `web/` — Benchmark page: `page.html` (markup/CSS, no document skeleton, so it can be published as an Artifact as-is), `app.ts` (page logic, bundled with numeric-2, math.js, stdlib and the suites), `build.ts` (`bun run bench:web` → `web/dist/` with `bench.js`, `results.json`, `index.html`), `serve.ts` (`bun run bench:serve`). The page reports when a CSP that forbids `eval` stops numeric.js from loading.
- **When adding a feature that other libraries also offer, add a case to `buildCases()` in `suites.ts`**, then re-run both runtimes and rebuild the page.

## Building

- `npm run build` — Builds ESM, minified ESM, UMD, and minified UMD bundles into `dist/`
- `bun run meta/generate.ts src/core/` — Regenerate core functions from templates