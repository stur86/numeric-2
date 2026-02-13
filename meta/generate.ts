import { VectorReducerMetaFunction } from "./reducer";
import type { VectorReducerMetaFunctionArgs } from "./reducer";
import { VectorMapMetaFunction } from "./map";
import type { VectorMapMetaFunctionArgs } from "./map";
import { VectorBinopMetaFunction } from "./binop";
import type { VectorBinopMetaFunctionArgs } from "./binop";


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
    { name: '_re_v_isNaN', mapElement: 'Number.isNaN(x_i)' },
    { name: '_re_v_isFinite', mapElement: 'Number.isFinite(x_i)' },
    { name: '_re_v_clone', mapElement: 'x_i' },
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