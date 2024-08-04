export default class NumericCore {
  protected static _something = 5;

  static changeSomething(value: number) {
    NumericCore._something = value;
  }

  static getElement(name: string): number {
    return NumericCore[name as keyof typeof NumericCore] as number;
  }
}

function sum(x: number[]): number {
  let ans = 0;
  for (let i = 0; i < 10; i += 1 /*UNROLL_INCR*/) {
    ans += /*UNROLL_START*/ x[i] /*UNROLL_END*/;
  }
  /*UNROLL_CASES*/
  return ans;
}
