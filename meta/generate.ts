import { VectorReducerMetaFunction } from "./reducer";
import type { VectorReducerMetaFunctionArgs } from "./reducer";


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