# numeric-2

[![Website](https://github.com/stur86/numeric-2/actions/workflows/pages.yml/badge.svg)](https://github.com/stur86/numeric-2/actions/workflows/pages.yml)

Numerical analysis for JavaScript and TypeScript, with no `eval`.

numeric-2 is a TypeScript rewrite of [numeric.js](https://github.com/sloisel/numeric): linear algebra, complex numbers, sparse matrices, FFT, optimization, ODE solvers, splines and more. numeric.js builds most of its functions with `new Function` while it loads, so it cannot run on pages whose Content Security Policy forbids `unsafe-eval`. numeric-2 generates the same kind of fast kernels when the library is built, so it needs no runtime code generation.

- **Website:** https://stur86.github.io/numeric-2/
- **API reference:** https://stur86.github.io/numeric-2/docs/
- **Benchmarks:** https://stur86.github.io/numeric-2/benchmarks/ (against numeric.js, math.js and stdlib, on Bun, Node and your browser)

## Example

The package is not published on npm; see [Using it](#using-it) for how to load it.

```ts
import { Matrix, linalg, defaultRng } from "numeric-2";

const A = new Matrix([[4, 1], [2, 3]]);
const x = linalg.solve(A, [1, 2]);
const { lambda } = linalg.eig(A);
const noise = defaultRng(42).normal(0, 1, [2, 3]);
const spectrum = linalg.fft([1, 0, -1, 0]);

console.log(String(x));        // [0.1, 0.6]
console.log(String(lambda));   // [5, 2]
console.log(String(noise));    // [[ 0.2675,   1.742,  0.5814],
                               //  [ -1.693,  0.8153, -0.4575]]
console.log(String(spectrum)); // [0+0i, 2+0i, 0+0i, 2+0i]
```

## What it covers

| Area | Main entry points |
|---|---|
| Vectors, matrices, N-D tensors | `Vector`, `Matrix`, `Tensor`; element access, blocks, `clone`, `promoteToComplex` |
| Element-wise maths | `linalg.add`, `mul`, `exp`, `sqrt`, comparisons, logical and bitwise ops, `sum`, norms; in-place `iadd`, `imul`, … |
| Linear algebra | `linalg.dot`, `solve`, `LU`, `inv`, `det`, `eig`, `svd` (real and complex) |
| Complex numbers | complex `Vector`/`Matrix`/`Tensor` data throughout; `complex(re, im)` scalars |
| Sparse matrices | `SparseMatrix`, `sparse.dot`, `sparse.lu`, `sparse.solve` |
| Signal processing | `linalg.fft`, `ifft` (any length), `convolve` |
| Optimization | `optimize.uncmin` (BFGS), `gradient`, `solveLP`, `solveQP` |
| ODEs | `ode.dopri` (Dormand–Prince, dense output, events) |
| Interpolation | `interpolate.spline` (natural, clamped, periodic; `at`, `diff`, `roots`) |
| Random numbers | `defaultRng(seed)`: `uniform`, `normal`, `integers` (NumPy-style) |
| Output | `prettyPrint`, and `toString()` on every tensor |

Functions accept either plain arrays or numeric-2's tensor classes and return tensors; return types follow the arguments (a product of two matrices is typed `Matrix`). The API covers numeric.js's functionality but is not a one-to-one copy of it, and it fixes several numeric.js bugs (for example in `solveQP`, numerical gradients, spline roots and sparse matrix shapes).

## Using it

The library is a single file with no runtime dependencies. The website hosts the current build:

```ts
// ES module (browsers, Node, Bun, Deno)
import { Matrix, linalg } from "https://stur86.github.io/numeric-2/dist/numeric-2.min.js";
```

```html
<!-- Script tag: defines a global `Numeric` -->
<script src="https://stur86.github.io/numeric-2/dist/numeric-2.umd.min.js"></script>
<script>
  const { linalg } = Numeric;
</script>
```

Or build it yourself (requires [Bun](https://bun.sh)):

```bash
git clone https://github.com/stur86/numeric-2
cd numeric-2
bun install
bun run build   # → dist/numeric-2.js, .min.js, .umd.js, .umd.min.js
```

## Development

```bash
bun install
cd tests && uv sync && cd ..   # Python environment (NumPy, SciPy) for cross-validation tests
bun test                       # unit tests and NumPy/SciPy cross-validation
bunx tsc --noEmit -p .         # type-check
```

The cross-validation tests start a Python "oracle" (`tests/oracle.py`, run with [uv](https://docs.astral.sh/uv/)) that generates random inputs and reference results with NumPy and SciPy.

Element-wise kernels are generated from templates rather than written by hand:

```bash
bun run meta/generate.ts src/core/   # regenerate src/core/*.ts from meta/*.tjs templates
```

Benchmarks and the website:

```bash
bun run bench:bun     # run the benchmark suite on Bun → benchmarks/results/bun.json
bun run bench:node    # … and on Node                 → benchmarks/results/node.json
bun run site:build    # API reference + bundles + benchmark report + front page → build/site
bun run site:serve    # preview build/site locally
```

The website is rebuilt and published to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

See [CLAUDE.md](CLAUDE.md) for a detailed tour of the code: project layout, the code-generation system, conventions and testing.

## License

MIT. Based on [numeric.js](https://github.com/sloisel/numeric) by Sébastien Loisel.
