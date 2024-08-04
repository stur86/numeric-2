import microtime from "microtime";

type BenchmarkOptions = {
  iterations?: number;
  warmup?: number;
};

type BenchmarkStats = {
  name: string;
  method: string;
  N: number; // Problem size
  iterations: number;
  mean: number;
  variance: number;
  stddev: number;
  max: number;
  min: number;
  median: number;
  percentile_25: number;
  percentile_75: number;
  last_result: any;
};

const _defaultOptions: Required<BenchmarkOptions> = {
  iterations: 100,
  warmup: 10,
};

export class BenchmarkSuite {
  name: string;
  methods: Record<string, Function>;
  argGenerator: (N: number) => any[];
  options: Required<BenchmarkOptions>;
  stats: Record<string, BenchmarkStats> | null = null;

  // Generated
  args: any[] | null = null;
  N: number | null = null;

  constructor(
    name: string,
    methods: Record<string, Function>,
    options: BenchmarkOptions = {},
    argGenerator: (N: number) => any[] = (N: number) => [],
  ) {
    this.name = name;
    this.methods = methods;
    this.argGenerator = argGenerator;
    this.options = { ..._defaultOptions, ...options };
  }

  run(N: number = 1000) {
    this.stats = {};
    this.N = N;
    this.args = this.argGenerator(N);
    for (const [name, method] of Object.entries(this.methods)) {
      this.stats[name] = this.runBenchmark(name, method);
    }
  }

  runBenchmark(name: string, method: Function): BenchmarkStats {
    const { iterations, warmup } = this.options;
    const times = [];
    if (this.args === null) {
      throw new Error("args not generated");
    }
    const args = this.args;
    // Run warmup iterations, not included in stats
    for (let i = 0; i < warmup; i++) {
      method(...args);
    }
    // Run benchmark iterations
    let res;
    for (let i = 0; i < iterations; i++) {
      const start = microtime.now();
      res = method(...args);
      const end = microtime.now();
      times.push(end - start);
    }
    return this.computeStats(name, times, this.N!, res);
  }

  computeStats(
    name: string,
    times: number[],
    N: number,
    last_result: any,
  ): BenchmarkStats {
    const iterations = times.length;
    const mean = times.reduce((a, b) => a + b, 0) / iterations;
    const variance =
      times.reduce((a, b) => a + (b - mean) ** 2, 0) / iterations;
    const stddev = Math.sqrt(variance);
    const max = Math.max(...times);
    const min = Math.min(...times);
    const sorted = times.sort((a, b) => a - b);
    const median = sorted[Math.floor(iterations / 2)];
    const percentile_25 = sorted[Math.floor(iterations * 0.25)];
    const percentile_75 = sorted[Math.floor(iterations * 0.75)];
    return {
      name: this.name,
      method: name,
      N: N,
      iterations,
      mean,
      variance,
      stddev,
      max,
      min,
      median,
      percentile_25,
      percentile_75,
      last_result,
    };
  }
}
