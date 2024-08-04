// A template function for all sorts of 1-d reductions on real vectors
export function _re_v_template(x: number[], n: number): number {
  let i = n - 1,
    ans = x[i]; /* ANS_INIT */
  i--;
  /* ADDITIONAL_COUNTERS_INIT */
  for (; i >= 0; i -= 1) {
    /* MAIN_LOOP */
    /* ADDITIONAL_COUNTERS_UPDATE */
    ans += x[i]; /* ANS_UPDATE */
  }
  /* ADDITIONAL_UNROLL_CASES */
  return ans;
}

type _re_v_reducer_args = {
    accumulate_element: string,  // Should be of the form 'X*X' or such. X is in place of x[i] or appropriate counter value
    accumulate_op: string,       // Should be a unary operator, e.g. '+='
    unroll_level: number,        // The amount of loop unrolling desired
};
type _re_v_reducer = (x: number[], n: number) => number;
const _source_regex = /[^\{]*{(.*)}/s;

export function _re_v_reducer_compile(args: _re_v_reducer_args): _re_v_reducer {
  let source_code = _source_regex.exec(_re_v_template.toString())![1];
  console.log(source_code);
  // Replace initialization
  const el = args.accumulate_element;
  const init_value = el.replace('X', 'x[i]');
  source_code = source_code.replace("ans = x[i]", `ans = ${init_value}`);
  // Replace update
  const op = args.accumulate_op;
  const update_value = el.replace('X', 'x[i]');
  source_code = source_code.replace("ans += x[i]", `ans ${op} ${update_value}`);
  return Function('x', 'n', source_code) as _re_v_reducer;
}

export function _re_v_norm2squared(x: number[], n: number) {
  let i = n - 1,
    ans = x[i] * x[i];
  i--;
  for (; i >= 0; i -= 1) {
    ans += x[i] * x[i];
  }
  return ans;
}

export function _re_v_norm2(x: number[], n: number) {
  return Math.sqrt(_re_v_norm2squared(x, n));
}

const f = _re_v_reducer_compile({
    accumulate_element: '2*X',
    accumulate_op: '+=',
    unroll_level: 1,
    });

console.log(f.toString());
console.log(f([1, 2, 3, 4], 4));