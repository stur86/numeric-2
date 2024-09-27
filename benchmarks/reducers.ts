import { BenchmarkSuite } from "./base";
import { _re_v_norm2, _re_v_normInf } from "../src/core/reducers.ts";
import numeric from "numeric";

const norm2_suite = new BenchmarkSuite(
  "Reducers: norm2",
  {
    numeric2: _re_v_norm2,
    numeric: numeric.norm2,
  },
  { iterations: 1000, warmup: 10 },
  (N: number) => {
    return [new Array(N).fill(1), N];
  },
);

const normInf_suite = new BenchmarkSuite(
  "Reducers: norminf",
  {
    numeric2: _re_v_normInf,
    numeric: numeric.norminfV
  },
  { iterations: 1000, warmup: 10},
  (N: number) => {
    return [new Array(N).fill(1), N];
  }
)

norm2_suite.run(2 << 20);

console.log("norm2:")
for (let k in norm2_suite.stats) {
  const stats = norm2_suite.stats[k];
  console.log(`\t${k}: ${stats.mean} +/- ${stats.stddev}`);
}

normInf_suite.run(2 << 20);

console.log("normInf:")
for (let k in normInf_suite.stats) {
  const stats = normInf_suite.stats[k];
  console.log(`\t${k}: ${stats.mean} +/- ${stats.stddev}`);
}
