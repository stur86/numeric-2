import { VectorReducerMetaFunction } from "./reducers";


/**
 * Generate the code in the main source file
 */

// Get the target directory from the command line
const targetDir = Bun.argv[2];
console.log(`Generating functions in ${targetDir}`);
console.log("_____\n");

// Reducers
const reducerFile = targetDir + "/reducers.gen.ts";
console.log(`Generating reducers in ${reducerFile}:`);
const reducers = [
    new VectorReducerMetaFunction('_re_v_norm2squared', ['x'], 'x_i*x_i', '+='),
    new VectorReducerMetaFunction('_re_v_norm1', ['x'], 'Math.abs(x_i)', '+='),
    new VectorReducerMetaFunction('_re_v_sum', ['x'], 'x_i', '+='),
    new VectorReducerMetaFunction('_re_v_prod', ['x'], 'x_i', '*='),
    new VectorReducerMetaFunction('_re_v_max', ['x'], 'Math.max(ans, x_i)', '=', 'x_i'),
    new VectorReducerMetaFunction('_re_v_min', ['x'], 'Math.min(ans, x_i)', '=', 'x_i'),
]

let reducerSource = "";
for (const reducer of reducers) {
    console.log(`  ${reducer.name}`);
    reducerSource += reducer.compileSource() + '\n\n';
}
Bun.write(reducerFile, reducerSource);
console.log("_____\n");