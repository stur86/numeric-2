import { BenchmarkSuite } from "./base";
import { _re_v_norm2 } from "../src/core/reducers";
import numeric from "numeric";

const norm2_suite = new BenchmarkSuite(
  "Reducers: norm2",
  {
    numeric2: _re_v_norm2,
    numeric: numeric.norm2,
  },
  { iterations: 1000, warmup: 100 },
  (N: number) => {
    return [new Array(N).fill(1), N];
  },
);

norm2_suite.run(2 << 20);

console.log(norm2_suite.stats);
