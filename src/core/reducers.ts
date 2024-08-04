export function _re_v_norm2squared(x: number[], n: number) {
  let i = n - 1,
    ans = x[i] * x[i];
  i--;
  for (; i >= 1; i -= 2) {
    ans += x[i] * x[i];
  }
  return ans;
}

export function _re_v_norm2(x: number[], n: number) {
  return Math.sqrt(_re_v_norm2squared(x, n));
}
