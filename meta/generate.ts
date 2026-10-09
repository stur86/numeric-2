import { VectorReducerMetaFunction } from "./reducer";
import type { VectorReducerMetaFunctionArgs } from "./reducer";
import { VectorMapMetaFunction } from "./map";
import type { VectorMapMetaFunctionArgs } from "./map";
import { VectorBinopMetaFunction } from "./binop";
import type { VectorBinopMetaFunctionArgs } from "./binop";
import { CxVectorMapMetaFunction } from "./cx.map";
import type { CxVectorMapMetaFunctionArgs } from "./cx.map";
import { CxVectorBinopMetaFunction } from "./cx.binop";
import type { CxVectorBinopMetaFunctionArgs } from "./cx.binop";
import { CxVectorReducerMetaFunction } from "./cx.reducer";
import type { CxVectorReducerMetaFunctionArgs } from "./cx.reducer";
import { CxVectorCxReducerMetaFunction } from "./cx.cxreducer";
import type { CxVectorCxReducerMetaFunctionArgs } from "./cx.cxreducer";


/**
 * Generate the code in the main source file
 */

// Get the target directory from the command line
const targetDir = Bun.argv[2];
if (targetDir === undefined) {
    console.error("Usage: bun run meta/generate.ts <targetDir>");
    process.exit(1);
}
console.log(`Generating functions in ${targetDir}`);
console.log("_____\n");

// Reducers
const reducerFile = targetDir + "reducers.ts";
console.log(`Generating reducers in ${reducerFile}:`);
const reducerArgs: VectorReducerMetaFunctionArgs[] = [
    // Unary vector reducers
    { name: '_re_v_norm2', reduceElement: 'x_i*x_i', reduceOperator: '+=', resultTransform: 'Math.sqrt(ans)' },
    { name: '_re_v_norm2squared', reduceElement: 'x_i*x_i', reduceOperator: '+=' },
    { name: '_re_v_norm1', reduceElement: 'Math.abs(x_i)', reduceOperator: '+=' },
    { name: '_re_v_normInf', reduceElement: 'Math.max(ans, Math.abs(x_i))', reduceOperator: '=', initElement: 'Math.abs(x_i)' },
    { name: '_re_v_sum', reduceElement: 'x_i', reduceOperator: '+=' },
    { name: '_re_v_prod', reduceElement: 'x_i', reduceOperator: '*=' },
    { name: '_re_v_max', reduceElement: 'Math.max(ans, x_i)', reduceOperator: '=', initElement: 'x_i' },
    { name: '_re_v_min', reduceElement: 'Math.min(ans, x_i)', reduceOperator: '=', initElement: 'x_i' },
];

let reducerSource = "";
for (const rArgs of reducerArgs) {
    const reducer = new VectorReducerMetaFunction(rArgs);
    console.log(`  ${reducer.name}`);
    reducerSource += reducer.compileSource() + '\n\n';
}
Bun.write(reducerFile, reducerSource);
console.log("_____\n");

// Maps
const mapFile = targetDir + "maps.ts";
console.log(`Generating maps in ${mapFile}:`);
const mapArgs: VectorMapMetaFunctionArgs[] = [
    // Element-wise unary operations
    { name: '_re_v_sqrt', mapElement: 'Math.sqrt(x_i)' },
    { name: '_re_v_abs', mapElement: 'Math.abs(x_i)' },
    { name: '_re_v_exp', mapElement: 'Math.exp(x_i)' },
    { name: '_re_v_log', mapElement: 'Math.log(x_i)' },
    { name: '_re_v_sin', mapElement: 'Math.sin(x_i)' },
    { name: '_re_v_cos', mapElement: 'Math.cos(x_i)' },
    { name: '_re_v_tan', mapElement: 'Math.tan(x_i)' },
    { name: '_re_v_asin', mapElement: 'Math.asin(x_i)' },
    { name: '_re_v_acos', mapElement: 'Math.acos(x_i)' },
    { name: '_re_v_atan', mapElement: 'Math.atan(x_i)' },
    { name: '_re_v_neg', mapElement: '-x_i' },
    { name: '_re_v_ceil', mapElement: 'Math.ceil(x_i)' },
    { name: '_re_v_floor', mapElement: 'Math.floor(x_i)' },
    { name: '_re_v_round', mapElement: 'Math.round(x_i)' },
    { name: '_re_v_isNaN', mapElement: 'Number.isNaN(x_i)', returnType: 'boolean' },
    { name: '_re_v_isFinite', mapElement: 'Number.isFinite(x_i)', returnType: 'boolean' },
    { name: '_re_v_clone', mapElement: 'x_i' },
    { name: '_re_v_conj', mapElement: 'x_i' },
];

let mapSource = "";
for (const mArgs of mapArgs) {
    const map = new VectorMapMetaFunction(mArgs);
    console.log(`  ${map.name}`);
    mapSource += map.compileSource() + '\n\n';
}
Bun.write(mapFile, mapSource);
console.log("_____\n");

// Binary operations
const binopFile = targetDir + "binops.ts";
console.log(`Generating binary ops in ${binopFile}:`);
const binopArgs: VectorBinopMetaFunctionArgs[] = [
    // Arithmetic
    { name: 'add', expression: 'x_i + y_i' },
    { name: 'sub', expression: 'x_i - y_i' },
    { name: 'mul', expression: 'x_i * y_i' },
    { name: 'div', expression: 'x_i / y_i' },
    { name: 'mod', expression: 'x_i % y_i' },
    // Math
    { name: 'pow', expression: 'Math.pow(x_i, y_i)' },
    { name: 'atan2', expression: 'Math.atan2(x_i, y_i)' },
    { name: 'max', expression: 'Math.max(x_i, y_i)' },
    { name: 'min', expression: 'Math.min(x_i, y_i)' },
    // Comparison
    { name: 'eq', expression: 'x_i === y_i' },
    { name: 'neq', expression: 'x_i !== y_i' },
    { name: 'lt', expression: 'x_i < y_i' },
    { name: 'gt', expression: 'x_i > y_i' },
    { name: 'leq', expression: 'x_i <= y_i' },
    { name: 'geq', expression: 'x_i >= y_i' },
];

let binopSource = "";
for (const bArgs of binopArgs) {
    const binop = new VectorBinopMetaFunction(bArgs);
    console.log(`  ${binop.name} (VV, VS, SV)`);
    binopSource += binop.compileAllSource() + '\n\n';
}
Bun.write(binopFile, binopSource);
console.log("_____\n");

// Complex maps
const cxMapFile = targetDir + "cx.maps.ts";
console.log(`Generating complex maps in ${cxMapFile}:`);
const cxMapArgs: CxVectorMapMetaFunctionArgs[] = [
    { name: '_cx_v_neg', mapRe: '-x_re_i', mapIm: '-x_im_i' },
    { name: '_cx_v_conj', mapRe: 'x_re_i', mapIm: '-x_im_i' },
    { name: '_cx_v_abs', mapRe: 'Math.sqrt(x_re_i*x_re_i+x_im_i*x_im_i)', mapIm: '0' },
    { name: '_cx_v_clone', mapRe: 'x_re_i', mapIm: 'x_im_i' },
    { name: '_cx_v_exp', mapPre: 'const e = Math.exp(x_re_i);', mapRe: 'e*Math.cos(x_im_i)', mapIm: 'e*Math.sin(x_im_i)' },
    { name: '_cx_v_log', mapRe: 'Math.log(Math.sqrt(x_re_i*x_re_i+x_im_i*x_im_i))', mapIm: 'Math.atan2(x_im_i, x_re_i)' },
    // Principal square root
    { name: '_cx_v_sqrt', mapPre: 'const r = Math.sqrt(x_re_i*x_re_i+x_im_i*x_im_i);', mapRe: 'Math.sqrt((r+x_re_i)/2)', mapIm: '(x_im_i < 0 ? -1 : 1)*Math.sqrt((r-x_re_i)/2)' },
    { name: '_cx_v_sin', mapRe: 'Math.sin(x_re_i)*Math.cosh(x_im_i)', mapIm: 'Math.cos(x_re_i)*Math.sinh(x_im_i)' },
    { name: '_cx_v_cos', mapRe: 'Math.cos(x_re_i)*Math.cosh(x_im_i)', mapIm: '-Math.sin(x_re_i)*Math.sinh(x_im_i)' },
];

let cxMapSource = "";
for (const mArgs of cxMapArgs) {
    const map = new CxVectorMapMetaFunction(mArgs);
    console.log(`  ${map.name}`);
    cxMapSource += map.compileSource() + '\n\n';
}
Bun.write(cxMapFile, cxMapSource);
console.log("_____\n");

// Complex binary operations
const cxBinopFile = targetDir + "cx.binops.ts";
console.log(`Generating complex binary ops in ${cxBinopFile}:`);
const cxBinopArgs: CxVectorBinopMetaFunctionArgs[] = [
    { name: 'add', expressionRe: 'x_re_i + y_re_i', expressionIm: 'x_im_i + y_im_i' },
    { name: 'sub', expressionRe: 'x_re_i - y_re_i', expressionIm: 'x_im_i - y_im_i' },
    { name: 'mul', expressionRe: 'x_re_i*y_re_i - x_im_i*y_im_i', expressionIm: 'x_re_i*y_im_i + x_im_i*y_re_i' },
    { name: 'div', expressionRe: '(x_re_i*y_re_i+x_im_i*y_im_i)/(y_re_i*y_re_i+y_im_i*y_im_i)', expressionIm: '(x_im_i*y_re_i-x_re_i*y_im_i)/(y_re_i*y_re_i+y_im_i*y_im_i)' },
    // Boolean-valued comparisons (complex numbers are unordered: only eq/neq)
    { name: 'eq', expression: 'x_re_i === y_re_i && x_im_i === y_im_i' },
    { name: 'neq', expression: 'x_re_i !== y_re_i || x_im_i !== y_im_i' },
];

let cxBinopSource = "";
for (const bArgs of cxBinopArgs) {
    const binop = new CxVectorBinopMetaFunction(bArgs);
    console.log(`  ${binop.name} (VV, VS, SV)`);
    cxBinopSource += binop.compileAllSource() + '\n\n';
}
Bun.write(cxBinopFile, cxBinopSource);
console.log("_____\n");

// Complex reducers
const cxReducerFile = targetDir + "cx.reducers.ts";
console.log(`Generating complex reducers in ${cxReducerFile}:`);
const cxReducerArgs: CxVectorReducerMetaFunctionArgs[] = [
    { name: '_cx_v_norm2', reduceElement: 'x_re_i*x_re_i+x_im_i*x_im_i', reduceOperator: '+=', resultTransform: 'Math.sqrt(ans)' },
    { name: '_cx_v_norm2squared', reduceElement: 'x_re_i*x_re_i+x_im_i*x_im_i', reduceOperator: '+=' },
    { name: '_cx_v_norm1', reduceElement: 'Math.sqrt(x_re_i*x_re_i+x_im_i*x_im_i)', reduceOperator: '+=' },
    { name: '_cx_v_normInf', reduceElement: 'Math.max(ans, Math.sqrt(x_re_i*x_re_i+x_im_i*x_im_i))', reduceOperator: '=', initElement: 'Math.sqrt(x_re_i*x_re_i+x_im_i*x_im_i)' },
];

let cxReducerSource = "";
for (const rArgs of cxReducerArgs) {
    const reducer = new CxVectorReducerMetaFunction(rArgs);
    console.log(`  ${reducer.name}`);
    cxReducerSource += reducer.compileSource() + '\n\n';
}
Bun.write(cxReducerFile, cxReducerSource);
console.log("_____\n");

// Complex reducers with a complex result
const cxCxReducerFile = targetDir + "cx.cxreducers.ts";
console.log(`Generating complex-valued reducers in ${cxCxReducerFile}:`);
const cxCxReducerArgs: CxVectorCxReducerMetaFunctionArgs[] = [
    { name: '_cx_v_sum', reduceRe: 'ans_re + x_re_i', reduceIm: 'ans_im + x_im_i' },
    { name: '_cx_v_prod', reduceRe: 'ans_re*x_re_i - ans_im*x_im_i', reduceIm: 'ans_re*x_im_i + ans_im*x_re_i' },
];

let cxCxReducerSource = "";
for (const rArgs of cxCxReducerArgs) {
    const reducer = new CxVectorCxReducerMetaFunction(rArgs);
    console.log(`  ${reducer.name}`);
    cxCxReducerSource += reducer.compileSource() + '\n\n';
}
Bun.write(cxCxReducerFile, cxCxReducerSource);
console.log("_____\n");
