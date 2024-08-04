enum NCoreOpType {
  REAL = 0,
  COMPLEX = 1,
}

enum NCoreArgType {
  SCALAR = 0,
  VECTOR = 1,
  MATRIX = 2,
}

/**
 * This class hosts the core computation methods for most low-level numeric operations
 * on vectors and matrices.
 *
 * The operations will have multiple versions (Real, Complex, etc.) and will be
 * initialized to defaults and retrieved with appropriate methods.
 *
 * The core engine may be reinitialized to recompile all operations with new settings,
 * e.g. extended loop unrolling, using automated processes.
 */
export default class NumericCore {
  static OpType = NCoreOpType;
  static ArgType = NCoreArgType;

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
